"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getReadContract, OnChainRaffle, STATUS_LABELS } from "@/lib/contract";

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
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 animate-pulse">
        Cargando datos on-chain…
      </div>
    );
  }

  const endDate = new Date(Number(raffle.endTime) * 1000);
  const statusLabel = STATUS_LABELS[raffle.status] ?? "Desconocido";
  const ticketsSold = Number(raffle.ticketsSold);
  const maxTickets = Number(raffle.maxTickets);
  const ticketPrice = ethers.formatEther(raffle.ticketPrice);
  const amountCollected = ethers.formatEther(raffle.amountCollected);
  const isZeroWinner = raffle.winner === ethers.ZeroAddress;

  return (
    <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-4">
        Datos on-chain
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Row label="Estado" value={statusLabel} />
        <Row label="Terminó" value={ended ? "Sí" : "No"} />
        <Row label="Precio del ticket" value={`${ticketPrice} ETH`} />
        <Row label="Tickets vendidos" value={`${ticketsSold} / ${maxTickets}`} />
        <Row label="Recaudado" value={`${amountCollected} ETH`} />
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
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          Esta rifa fue cancelada. Los compradores de tickets pueden reclamar su reembolso abajo.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </>
  );
}
