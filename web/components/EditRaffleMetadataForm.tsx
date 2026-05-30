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
      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setOpen(true)}
            className="btn-link"
          >
            Editar metadata →
          </button>
          {canDelete && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm font-semibold transition-colors"
              style={{ color: "var(--danger)" }}
            >
              Eliminar publicación
            </button>
          )}
          {canDelete && confirmDelete && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-600">¿Estás segura?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="btn btn-danger btn-sm"
              >
                {loading ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-3 alert-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border)]">
      <h2 className="detail-hero-title text-xl mb-4">Editar metadata</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        <FormField label="Título" name="title" required value={form.title} onChange={handleChange} />
        <FormField label="Descripción" name="description" required textarea value={form.description} onChange={handleChange} />
        <FormField label="Organizador" name="organizerName" required value={form.organizerName} onChange={handleChange} />
        <FormField label="Imagen (URL)" name="imageUrl" type="url" value={form.imageUrl} onChange={handleChange} />
        <FormField label="Condiciones" name="conditions" textarea value={form.conditions} onChange={handleChange} />
        <FormField label="Entrega del premio" name="deliveryInfo" textarea value={form.deliveryInfo} onChange={handleChange} />

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" onClick={handleCancel} className="btn btn-ghost">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
