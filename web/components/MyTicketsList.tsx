"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, OnChainRaffle } from "@/lib/contract";
import { formatUsdc } from "@/lib/usdc";

type MetadataRecord = {
    raffleIdOnChain: number;
    title: string;
};

type TicketItem = {
    raffleIdOnChain: number;
    title: string;
    ticketNumber: number;
    onChain: OnChainRaffle;
};

function getTicketStatus(item: TicketItem): { label: string; className: string } {
    const status = Number(item.onChain.status);
    const ended = Date.now() / 1000 >= Number(item.onChain.endTime);

    if (status === 3) {
        return { label: "Reembolso disponible", className: "badge badge-cancelled" };
    }

    if (status === 2) {
        const won = Number(item.onChain.winningTicketNumber) === item.ticketNumber;
        return won
            ? { label: "Ganaste", className: "badge badge-winner" }
            : { label: "No ganador", className: "badge badge-ended" };
    }

    if (status === 1) {
        return { label: "Sorteando", className: "badge badge-drawing" };
    }

    if (ended) {
        return { label: "Terminada", className: "badge badge-ended" };
    }

    return { label: "Activa", className: "badge badge-active" };
}

export default function MyTicketsList() {
    const { address, isConnected, connect } = useWallet();
    const [items, setItems] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!address) return;

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch("/api/raffles");
                if (!res.ok) throw new Error("Error al obtener rifas");

                const metadata: MetadataRecord[] = await res.json();
                const contract = getReadContract();
                if (!address) return;

                const normalizedAddress = address.toLowerCase();

                const found: TicketItem[] = [];

                for (const m of metadata) {
                    const onChain = (await contract.getRaffle(m.raffleIdOnChain)) as OnChainRaffle;
                    const maxTickets = Number(onChain.maxTickets);

                    for (let ticketNumber = 1; ticketNumber <= maxTickets; ticketNumber++) {
                        const owner: string = await contract.getTicketOwner(
                            m.raffleIdOnChain,
                            ticketNumber
                        );

                        if (owner !== ethers.ZeroAddress && owner.toLowerCase() === normalizedAddress) {
                            found.push({
                                raffleIdOnChain: m.raffleIdOnChain,
                                title: m.title,
                                ticketNumber,
                                onChain,
                            });
                        }
                    }
                }

                if (!cancelled) setItems(found);
            } catch (e) {
                console.error(e);
                if (!cancelled) setError("No se pudieron cargar tus tickets.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [address]);

    if (!isConnected) {
        return (
            <div className="empty-state card">
                <p className="empty-state-icon">🎟️</p>
                <p className="empty-state-title">Conectá tu wallet</p>
                <p className="text-muted text-sm mt-2 mb-6">
                    Para ver los tickets que compraste.
                </p>
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
                <p className="empty-state-title">Todavía no compraste tickets</p>
                <p className="text-muted text-sm mt-2">
                    Cuando participes en una rifa, tus tickets aparecerán acá.
                </p>
            </div>
        );
    }

    return (
        <ul className="space-y-3 stagger-children">
            {items.map((item) => {
                const badge = getTicketStatus(item);
                const endDate = new Date(Number(item.onChain.endTime) * 1000).toLocaleDateString(
                    "es-AR",
                    { dateStyle: "medium" }
                );

                return (
                    <li key={`${item.raffleIdOnChain}-${item.ticketNumber}`}>
                        <Link href={`/raffles/${item.raffleIdOnChain}`} className="list-row-card">
                            <div className="min-w-0">
                <span className="badge-id mb-2 inline-block">
                  Rifa #{item.raffleIdOnChain} · Ticket #{item.ticketNumber}
                </span>

                                <p className="list-row-title truncate">{item.title}</p>

                                <p className="list-row-meta">
                                    Precio {formatUsdc(item.onChain.ticketPrice)} USDC · cierra {endDate}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className={badge.className}>{badge.label}</span>

                                {Number(item.onChain.status) === 2 && (
                                    <span className="text-xs font-mono text-dim">
                    Ganador: #{String(item.onChain.winningTicketNumber)}
                  </span>
                                )}
                            </div>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}