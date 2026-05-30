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

function statusBadgeClass(status: number, ended: boolean): string {
  if (status === 3) return "badge badge-cancelled";
  if (status === 2) return "badge badge-winner";
  if (ended) return "badge badge-ended";
  return "badge badge-active";
}

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
      <div className="empty-state card">
        <p className="empty-state-icon">🔗</p>
        <p className="empty-state-title">Conectá tu wallet</p>
        <p className="text-muted text-sm mt-2 mb-6">Para ver las rifas que organizaste.</p>
        <button onClick={connect} className="btn btn-primary btn-glow-ring">
          Conectar wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[5.75rem]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="alert-error text-center">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-state card">
        <p className="empty-state-icon">🎟️</p>
        <p className="empty-state-title">Sin rifas todavía</p>
        <p className="text-muted text-sm mt-2">
          Creá la primera y aparecerá acá con su estado on-chain.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 stagger-children">
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
            <Link href={`/raffles/${item.raffleIdOnChain}`} className="list-row-card">
              <div className="min-w-0">
                <span className="badge-id mb-2 inline-block">#{item.raffleIdOnChain}</span>
                <p className="list-row-title truncate">{item.title}</p>
                <p className="list-row-meta">
                  {Number(item.onChain.ticketsSold)} / {Number(item.onChain.maxTickets)} tickets
                  · cierra {endDate}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={statusBadgeClass(status, ended)}>{statusLabel}</span>
                <span className="text-xs font-mono text-dim">
                  {ethers.formatEther(item.onChain.ticketPrice)} ETH
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
