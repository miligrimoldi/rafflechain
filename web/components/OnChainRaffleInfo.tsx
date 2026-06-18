"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getReadContract, OnChainRaffle, STATUS_LABELS } from "@/lib/contract";
import { formatUsdc } from "@/lib/usdc";

type Props = { raffleIdOnChain: number };

export default function OnChainRaffleInfo({ raffleIdOnChain }: Props) {
  const [raffle, setRaffle] = useState<OnChainRaffle | null>(null);
  const [ended, setEnded] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const contract = getReadContract();
        const [data, isEnded] = await Promise.all([
          contract.getRaffle(raffleIdOnChain),
          contract.isRaffleEnded(raffleIdOnChain),
        ]);
        if (cancelled) return;
        setRaffle(data as OnChainRaffle);
        setEnded(isEnded as boolean);
      } catch (e) {
        if (cancelled) return;
        setError("No se pudo cargar la información on-chain.");
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain]);

  if (error) {
    return <div className="alert-error mt-6">{error}</div>;
  }

  if (!raffle) {
    return (
      <div className="panel-accent flex items-center justify-center min-h-[8rem]">
        <p className="text-sm text-indigo-400 font-medium animate-pulse">
          Cargando datos on-chain…
        </p>
      </div>
    );
  }

  const endDate = new Date(Number(raffle.endTime) * 1000);
  const statusLabel = STATUS_LABELS[raffle.status] ?? "Desconocido";
  const ticketsSold = Number(raffle.ticketsSold);
  const maxTickets = Number(raffle.maxTickets);
    const ticketPrice = formatUsdc(raffle.ticketPrice);
    const amountCollected = formatUsdc(raffle.amountCollected);
  const isZeroWinner = raffle.winner === ethers.ZeroAddress;

  return (
    <div className="panel-accent">
      <h2 className="panel-title panel-title-accent">Datos on-chain</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Row label="Estado" value={statusLabel} />
        <Row label="Terminó" value={ended ? "Sí" : "No"} />
          <Row label="Precio del ticket" value={`${ticketPrice} USDC`} />
        <Row label="Tickets vendidos" value={`${ticketsSold} / ${maxTickets}`} />
          <Row label="Recaudado" value={`${amountCollected} USDC`} />
        <Row
          label="Cierre"
          value={endDate.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
        />
        {Number(raffle.status) === 2 && (
          <>
            <Row label="Ticket ganador" value={String(raffle.winningTicketNumber)} />
            {!isZeroWinner && (
              <Row
                label="Ganador"
                value={`${raffle.winner.slice(0, 6)}…${raffle.winner.slice(-4)}`}
              />
            )}
          </>
        )}
      </dl>
      {Number(raffle.status) === 3 && (
        <p className="mt-4 alert-warning">
          Esta rifa fue cancelada. Los compradores de tickets pueden reclamar su reembolso abajo.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-dim">{label}</dt>
      <dd className="font-semibold text-[var(--text)]">{value}</dd>
    </>
  );
}
