"use client";

import { useEffect, useState } from "react";
import { getReadContract } from "@/lib/contract";

type BadgeState = {
  label: string;
  className: string;
};

function getBadge(status: number, endTime: bigint, ticketsSold: bigint, maxTickets: bigint): BadgeState {
  const ended = Date.now() / 1000 >= Number(endTime) || ticketsSold === maxTickets;

  if (status === 3) return { label: "Cancelada", className: "badge badge-cancelled" };
  if (status === 2) return { label: "Ganador", className: "badge badge-winner" };
  if (status === 1) return { label: "Sorteando", className: "badge badge-drawing" };
  if (ended) return { label: "Terminada", className: "badge badge-ended" };
  return { label: "Activa", className: "badge badge-active" };
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

  return <span className={badge.className}>{badge.label}</span>;
}
