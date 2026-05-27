"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { getWriteContract } from "@/lib/contract";
import FormField from "./FormField";

type FormState = {
  ticketPrice: string;
  maxTickets: string;
  endTime: string;
  title: string;
  description: string;
  imageUrl: string;
  organizerName: string;
  conditions: string;
  deliveryInfo: string;
};

const EMPTY: FormState = {
  ticketPrice: "",
  maxTickets: "",
  endTime: "",
  title: "",
  description: "",
  imageUrl: "",
  organizerName: "",
  conditions: "",
  deliveryInfo: "",
};

export default function CreateRaffleForm() {
  const router = useRouter();
  const { signer, isConnected, isWrongNetwork, connect } = useWallet();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

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

    const ticketPriceWei = (() => {
      try { return ethers.parseEther(form.ticketPrice); } catch { return null; }
    })();
    if (ticketPriceWei === null || ticketPriceWei <= 0n) {
      setError("Precio de ticket inválido. Ingresá un valor en ETH, ej. 0.01");
      return;
    }

    const maxTickets = parseInt(form.maxTickets, 10);
    if (isNaN(maxTickets) || maxTickets < 1) {
      setError("Cantidad máxima de tickets inválida.");
      return;
    }

    const endTimestamp = Math.floor(new Date(form.endTime).getTime() / 1000);
    if (isNaN(endTimestamp) || endTimestamp <= Math.floor(Date.now() / 1000)) {
      setError("La fecha de cierre debe ser en el futuro.");
      return;
    }

    setLoading(true);
    try {
      // 1. Llamar al contrato
      setStatus("Confirmá la transacción en MetaMask…");
      const contract = getWriteContract(signer);
      const tx = await contract.createRaffle(
        ticketPriceWei,
        BigInt(maxTickets),
        BigInt(endTimestamp)
      );

      // 2. Esperar confirmación
      setStatus("Esperando confirmación en la blockchain…");
      const receipt = await tx.wait();

      // 3. Extraer raffleId del evento RaffleCreated
      let raffleIdOnChain: number | null = null;
      for (const log of receipt.logs) {
        if (
          log instanceof ethers.EventLog &&
          log.fragment.name === "RaffleCreated"
        ) {
          raffleIdOnChain = Number(log.args[0]);
          break;
        }
      }
      if (raffleIdOnChain === null) {
        throw new Error("No se encontró el evento RaffleCreated en el recibo.");
      }

      // 4. Guardar metadata off-chain
      setStatus("Guardando metadata…");
      const res = await fetch("/api/raffles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleIdOnChain,
          title: form.title,
          description: form.description,
          organizerName: form.organizerName,
          imageUrl: form.imageUrl || undefined,
          conditions: form.conditions || undefined,
          deliveryInfo: form.deliveryInfo || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar metadata.");

      router.push(`/raffles/${raffleIdOnChain}`);
    } catch (e: unknown) {
      const msg =
        (e as { reason?: string; message?: string }).reason ??
        (e as { message?: string }).message ??
        "Error desconocido";
      setError(msg);
      setStatus(null);
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
      {status && !error && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg text-sm">
          {status}
        </div>
      )}

      <div className="border-b border-gray-100 pb-5 space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Datos on-chain
        </p>
        <FormField
          label="Precio del ticket (ETH)"
          name="ticketPrice"
          required
          placeholder="ej. 0.01"
          value={form.ticketPrice}
          onChange={handleChange}
        />
        <FormField
          label="Máximo de tickets"
          name="maxTickets"
          type="number"
          required
          placeholder="ej. 100"
          value={form.maxTickets}
          onChange={handleChange}
        />
        <FormField
          label="Fecha y hora de cierre"
          name="endTime"
          type="datetime-local"
          required
          value={form.endTime}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Metadata (off-chain)
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {!isConnected
          ? "Conectar wallet"
          : loading
          ? "Procesando…"
          : "Crear rifa en blockchain"}
      </button>
    </form>
  );
}
