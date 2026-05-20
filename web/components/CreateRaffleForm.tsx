"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "./FormField";

// TODO(blockchain): Agregar estos campos al form cuando se integre el contrato.
// Se pasarán como argumentos a createRaffle(ticketPrice, maxTickets, endTime):
//   ticketPrice: string;   → en wei  (ej. parseEther("0.01"))
//   maxTickets:  string;   → cantidad máxima de tickets
//   endTime:     string;   → fecha/hora de cierre → convertir a timestamp Unix
type FormState = {
  // TEMPORAL: desaparecerá cuando se integre el contrato.
  // El ID lo emitirá el evento RaffleCreated al confirmar la tx de createRaffle().
  raffleIdOnChain: string;
  title: string;
  description: string;
  imageUrl: string;
  organizerName: string;
  conditions: string;
  deliveryInfo: string;
};

const EMPTY: FormState = {
  raffleIdOnChain: "",
  title: "",
  description: "",
  imageUrl: "",
  organizerName: "",
  conditions: "",
  deliveryInfo: "",
};

export default function CreateRaffleForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const id = parseInt(form.raffleIdOnChain, 10);
    if (isNaN(id)) {
      setError("El ID on-chain debe ser un número entero.");
      setLoading(false);
      return;
    }

    // TODO(blockchain): Reemplazar el bloque try de abajo por este flujo cuando
    // se integre MetaMask + Wagmi/Viem:
    //
    //   1. Llamar al contrato con los datos on-chain:
    //      const tx = await raffleChainContract.createRaffle(
    //        parseEther(form.ticketPrice),                              // wei
    //        BigInt(form.maxTickets),
    //        BigInt(Math.floor(new Date(form.endTime).getTime() / 1000)) // Unix ts
    //      );
    //
    //   2. Esperar confirmación (MetaMask firma → transacción minada):
    //      const receipt = await tx.wait();
    //
    //   3. Leer raffleId del evento RaffleCreated emitido por el contrato:
    //      const log = receipt.logs.find(l => l.fragment?.name === "RaffleCreated");
    //      const raffleIdOnChain = Number(log?.args?.raffleId);
    //
    //   4. Solo después de confirmar el ID, guardar la metadata off-chain:
    //      POST /api/raffles { raffleIdOnChain, title, description, ... }
    //
    // El campo raffleIdOnChain del form (temporal) ya no será necesario.
    try {
      const res = await fetch("/api/raffles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleIdOnChain: id,
          title: form.title,
          description: form.description,
          organizerName: form.organizerName,
          imageUrl: form.imageUrl || undefined,
          conditions: form.conditions || undefined,
          deliveryInfo: form.deliveryInfo || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear la rifa.");
        return;
      }

      router.push(`/raffles/${data.raffleIdOnChain}`);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* TEMPORAL: Este campo desaparecerá cuando se integre el contrato.
          En el flujo real el raffleId lo emite el evento RaffleCreated
          al confirmar la tx de createRaffle(). */}
      <FormField
        label="ID on-chain (temporal)"
        name="raffleIdOnChain"
        type="number"
        required
        placeholder="0"
        value={form.raffleIdOnChain}
        onChange={handleChange}
      />
      <p className="-mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
        ⚠️ Campo temporal. En la versión integrada, este ID lo generará automáticamente
        el contrato al ejecutar <code className="font-mono">createRaffle()</code>.
      </p>

      <FormField
        label="Título"
        name="title"
        required
        placeholder="ej. Rifa de la bici"
        value={form.title}
        onChange={handleChange}
      />
      <FormField
        label="Descripción"
        name="description"
        required
        textarea
        placeholder="Describí el premio y las condiciones generales."
        value={form.description}
        onChange={handleChange}
      />
      <FormField
        label="Organizador"
        name="organizerName"
        required
        placeholder="Nombre del organizador"
        value={form.organizerName}
        onChange={handleChange}
      />
      <FormField
        label="Imagen (URL, opcional)"
        name="imageUrl"
        type="url"
        placeholder="https://..."
        value={form.imageUrl}
        onChange={handleChange}
      />
      <FormField
        label="Condiciones (opcional)"
        name="conditions"
        textarea
        placeholder="Requisitos de participación, restricciones, etc."
        value={form.conditions}
        onChange={handleChange}
      />
      <FormField
        label="Entrega del premio (opcional)"
        name="deliveryInfo"
        textarea
        placeholder="¿Cómo y dónde se entrega el premio?"
        value={form.deliveryInfo}
        onChange={handleChange}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creando..." : "Crear rifa"}
      </button>
    </form>
  );
}
