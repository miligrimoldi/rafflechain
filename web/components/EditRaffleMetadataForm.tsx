"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RaffleMetadata } from "@prisma/client";
import { useWallet } from "@/context/WalletContext";
import { getReadContract } from "@/lib/contract";
import FormField from "./FormField";

const DELETABLE_STATUSES = [2, 3]; // WINNER_SELECTED, CANCELLED

type EditState = {
  title: string;
  description: string;
  imageUrl: string;
  organizerName: string;
  conditions: string;
  deliveryInfo: string;
};

export default function EditRaffleMetadataForm({ raffle }: { raffle: RaffleMetadata }) {
  const router = useRouter();
  const { address, signer, isConnected, isWrongNetwork, connect } = useWallet();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkOrganizer() {
      if (!address) { setIsOrganizer(false); setCanDelete(false); return; }
      try {
        const contract = getReadContract();
        const onChainRaffle = await contract.getRaffle(raffle.raffleIdOnChain);
        if (cancelled) return;
        const isOrg = (onChainRaffle.organizer as string).toLowerCase() === address.toLowerCase();
        setIsOrganizer(isOrg);
        setCanDelete(isOrg && DELETABLE_STATUSES.includes(Number(onChainRaffle.status)));
      } catch {
        if (!cancelled) { setIsOrganizer(false); setCanDelete(false); }
      }
    }
    checkOrganizer();
    return () => { cancelled = true; };
  }, [address, raffle.raffleIdOnChain]);

  const [form, setForm] = useState<EditState>({
    title: raffle.title,
    description: raffle.description,
    imageUrl: raffle.imageUrl ?? "",
    organizerName: raffle.organizerName,
    conditions: raffle.conditions ?? "",
    deliveryInfo: raffle.deliveryInfo ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCancel() {
    setOpen(false);
    setError(null);
    setForm({
      title: raffle.title,
      description: raffle.description,
      imageUrl: raffle.imageUrl ?? "",
      organizerName: raffle.organizerName,
      conditions: raffle.conditions ?? "",
      deliveryInfo: raffle.deliveryInfo ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConnected) {
      await connect();
      return;
    }
    if (isWrongNetwork) {
      setError("Cambiá a la red Sepolia antes de continuar.");
      return;
    }
    if (!signer) {
      setError("Wallet no conectada.");
      return;
    }

    setLoading(true);
    try {
      const timestamp = Date.now();
      const message = `Edit RaffleChain metadata #${raffle.raffleIdOnChain}\nTimestamp: ${timestamp}`;
      const signature = await signer.signMessage(message);

      const res = await fetch(`/api/raffles/${raffle.raffleIdOnChain}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          timestamp,
          title: form.title,
          description: form.description,
          organizerName: form.organizerName,
          imageUrl: form.imageUrl || null,
          conditions: form.conditions || null,
          deliveryInfo: form.deliveryInfo || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al guardar.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { reason?: string; message?: string }).reason
        ?? (err as { message?: string }).message
        ?? "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!signer) return;
    setError(null);
    setLoading(true);
    try {
      const timestamp = Date.now();
      const message = `Delete RaffleChain metadata #${raffle.raffleIdOnChain}\nTimestamp: ${timestamp}`;
      const signature = await signer.signMessage(message);

      const res = await fetch(`/api/raffles/${raffle.raffleIdOnChain}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, timestamp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al eliminar.");
        setConfirmDelete(false);
        return;
      }

      router.push("/");
    } catch (err: unknown) {
      const msg = (err as { reason?: string; message?: string }).reason
        ?? (err as { message?: string }).message
        ?? "Error desconocido";
      setError(msg);
      setConfirmDelete(false);
    } finally {
      setLoading(false);
    }
  }

  if (!isOrganizer) return null;

  if (!open) {
    return (
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Editar metadata →
          </button>
          {canDelete && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Eliminar publicación
            </button>
          )}
          {canDelete && confirmDelete && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">¿Estás segura?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Editar metadata</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <FormField label="Título" name="title" required value={form.title} onChange={handleChange} />
        <FormField label="Descripción" name="description" required textarea value={form.description} onChange={handleChange} />
        <FormField label="Organizador" name="organizerName" required value={form.organizerName} onChange={handleChange} />
        <FormField label="Imagen (URL)" name="imageUrl" type="url" value={form.imageUrl} onChange={handleChange} />
        <FormField label="Condiciones" name="conditions" textarea value={form.conditions} onChange={handleChange} />
        <FormField label="Entrega del premio" name="deliveryInfo" textarea value={form.deliveryInfo} onChange={handleChange} />

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
