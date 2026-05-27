"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, STATUS_LABELS, OnChainRaffle } from "@/lib/contract";

type MetadataRecord = {
  raffleIdOnChain: number;
  title: string;
};

type RaffleItem = {
  raffleIdOnChain: number;
  onChain: OnChainRaffle;
  title: string;
};

export default function MyRafflesList() {
  const { address, isConnected, connect } = useWallet();
  const [items, setItems] = useState<RaffleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/raffles?organizer=${address}`);
        if (!res.ok) throw new Error("Error al obtener rifas");
        const metadata: MetadataRecord[] = await res.json();

        if (metadata.length === 0) {
          if (!cancelled) { setItems([]); setLoading(false); }
          return;
        }

        const contract = getReadContract();
        const results: RaffleItem[] = await Promise.all(
          metadata.map(async (m) => {
            const onChain = await contract.getRaffle(m.raffleIdOnChain);
            return {
              raffleIdOnChain: m.raffleIdOnChain,
              onChain: onChain as OnChainRaffle,
              title: m.title,
            };
          })
        );

        if (!cancelled) setItems(results);
      } catch (e) {
        if (!cancelled) setError("No se pudieron cargar tus rifas.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [address]);

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Conectá tu wallet para ver tus rifas.</p>
        <button
          onClick={connect}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Conectar wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400 animate-pulse">Cargando tus rifas…</div>;
  }

  if (error) {
    return <div className="text-center py-16 text-red-600">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🎟️</p>
        <p className="text-gray-500">No creaste ninguna rifa todavía.</p>
        <p className="text-sm mt-1">Usá el botón "+ Nueva rifa" para empezar.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const ended = Date.now() / 1000 >= Number(item.onChain.endTime);
        const status = Number(item.onChain.status);
        const statusLabel =
          status === 0 && ended
            ? "Terminada"
            : STATUS_LABELS[status] ?? "Desconocido";
        const endDate = new Date(Number(item.onChain.endTime) * 1000).toLocaleDateString("es-AR", {
          dateStyle: "medium",
        });

        return (
          <li key={item.raffleIdOnChain}>
            <Link
              href={`/raffles/${item.raffleIdOnChain}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div>
                <p className="text-xs font-mono text-gray-400 mb-0.5">#{item.raffleIdOnChain}</p>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {Number(item.onChain.ticketsSold)} / {Number(item.onChain.maxTickets)} tickets
                  · cierra {endDate}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    status === 3
                      ? "bg-gray-100 text-gray-500"
                      : status === 2
                      ? "bg-green-100 text-green-700"
                      : ended
                      ? "bg-amber-100 text-amber-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {statusLabel}
                </span>
                <span className="text-xs text-gray-400">
                  {ethers.formatEther(item.onChain.ticketPrice)} ETH / ticket
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
