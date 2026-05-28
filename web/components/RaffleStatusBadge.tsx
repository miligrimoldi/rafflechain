"use client";

import { useEffect, useState } from "react";
import { getReadContract } from "@/lib/contract";

type BadgeState = {
  label: string;
  className: string;
};

function getBadge(status: number, endTime: bigint, ticketsSold: bigint, maxTickets: bigint): BadgeState {
  const ended = Date.now() / 1000 >= Number(endTime) || ticketsSold === maxTickets;

  if (status === 3) return { label: "Cancelada",              className: "bg-gray-100 text-gray-500" };
  if (status === 2) return { label: "Ganador seleccionado",   className: "bg-green-100 text-green-700" };
  if (status === 1) return { label: "Sorteando…",             className: "bg-yellow-100 text-yellow-700" };
  if (ended)        return { label: "Terminada",              className: "bg-amber-100 text-amber-700" };
  return              { label: "Activa",                      className: "bg-indigo-100 text-indigo-700" };
}

export default function RaffleStatusBadge({ raffleIdOnChain }: { raffleIdOnChain: number }) {
  const [badge, setBadge] = useState<BadgeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const raffle = await getReadContract().getRaffle(raffleIdOnChain);
        if (cancelled) return;
        setBadge(getBadge(
          Number(raffle.status),
          raffle.endTime as bigint,
          raffle.ticketsSold as bigint,
          raffle.maxTickets as bigint,
        ));
      } catch {
        // si falla no mostramos nada
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain]);

  if (!badge) return null;

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
      {badge.label}
    </span>
  );
}
