"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RaffleMetadata } from "@prisma/client";
import FormField from "./FormField";

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // reset to server values on cancel
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
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/raffles/${raffle.raffleIdOnChain}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      router.refresh(); // re-fetch server component data
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Editar metadata →
        </button>
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

        <FormField
          label="Título"
          name="title"
          required
          value={form.title}
          onChange={handleChange}
        />
        <FormField
          label="Descripción"
          name="description"
          required
          textarea
          value={form.description}
          onChange={handleChange}
        />
        <FormField
          label="Organizador"
          name="organizerName"
          required
          value={form.organizerName}
          onChange={handleChange}
        />
        <FormField
          label="Imagen (URL)"
          name="imageUrl"
          type="url"
          value={form.imageUrl}
          onChange={handleChange}
        />
        <FormField
          label="Condiciones"
          name="conditions"
          textarea
          value={form.conditions}
          onChange={handleChange}
        />
        <FormField
          label="Entrega del premio"
          name="deliveryInfo"
          textarea
          value={form.deliveryInfo}
          onChange={handleChange}
        />

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
