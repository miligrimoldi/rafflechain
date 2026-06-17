"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, getWriteContract, OnChainRaffle } from "@/lib/contract";
import { getUsdcContract, formatUsdc } from "@/lib/usdc";

type TicketStatus = "available" | "mine" | "taken" | "winner";

export default function TicketGrid({ raffleIdOnChain }: { raffleIdOnChain: number }) {
  const { address, signer, isConnected, isWrongNetwork, connect } = useWallet();
  const [raffle, setRaffle] = useState<OnChainRaffle | null>(null);
  const [ticketOwners, setTicketOwners] = useState<Record<number, string>>({});
  const [loadingRaffle, setLoadingRaffle] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getReadContract().getRaffle(raffleIdOnChain);
        if (!cancelled) {
          setRaffle(data as OnChainRaffle);
          setLoadingRaffle(false);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain, refreshKey]);

  useEffect(() => {
    if (!raffle) return;
    let cancelled = false;
    setLoadingTickets(true);
    async function load() {
      try {
        const contract = getReadContract();
        const maxTickets = Number(raffle!.maxTickets);
        const results = await Promise.all(
          Array.from({ length: maxTickets }, (_, i) => i + 1).map(async (n) => {
            const owner: string = await contract.getTicketOwner(raffleIdOnChain, n);
            return [n, owner] as [number, string];
          })
        );
        if (!cancelled) {
          const map: Record<number, string> = {};
          for (const [n, owner] of results) {
            if (owner !== ethers.ZeroAddress) map[n] = owner.toLowerCase();
          }
          setTicketOwners(map);
          setLoadingTickets(false);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain, raffle, refreshKey]);

  if (loadingRaffle || !raffle) {
    return (
      <div className="panel mt-6">
        <h2 className="panel-title">Tickets</h2>
        <p className="text-sm text-dim animate-pulse">Cargando…</p>
      </div>
    );
  }

  const maxTickets = Number(raffle.maxTickets);
  const raffleStatus = Number(raffle.status);
  const winningTicketNumber = Number(raffle.winningTicketNumber);
  const isActive = raffleStatus === 0;
  const normalizedAddress = address?.toLowerCase();

  const soldCount = Object.keys(ticketOwners).length;
  const myCount = normalizedAddress
    ? Object.values(ticketOwners).filter((o) => o === normalizedAddress).length
    : 0;
  const myOdds = myCount > 0 ? ((myCount / maxTickets) * 100).toFixed(1) : null;

  function getStatus(n: number): TicketStatus {
    if (raffleStatus === 2 && n === winningTicketNumber) return "winner";
    const owner = ticketOwners[n];
    if (!owner) return "available";
    if (normalizedAddress && owner === normalizedAddress) return "mine";
    return "taken";
  }

  function cellClass(n: number): string {
    const status = getStatus(n);
    const isSelected = selected === n;
    const base =
      "flex items-center justify-center rounded text-xs font-mono font-semibold transition-all duration-150 select-none";

    if (status === "winner")
      return `${base} bg-amber-400 text-amber-900 shadow-lg shadow-amber-400/40 scale-110 relative z-10`;
    if (status === "mine")
      return `${base} bg-indigo-500 text-white`;
    if (status === "taken")
      return `${base} bg-white/5 text-white/20 cursor-default`;
    if (isSelected)
      return `${base} bg-accent text-white shadow-md shadow-accent/40 scale-105 cursor-pointer`;
    return `${base} border border-white/10 text-white/40 hover:border-accent hover:text-accent cursor-pointer`;
  }

  async function handleBuy() {
    if (!signer || selected === null || !raffle) return;
    setBuying(true);
    setError(null);
    try {
      const buyerAddress = await signer.getAddress();
      const raffleChainAddress = process.env.NEXT_PUBLIC_RAFFLE_CHAIN_ADDRESS!;
      const usdc = getUsdcContract(signer);
      const allowance: bigint = await usdc.allowance(buyerAddress, raffleChainAddress);
      if (allowance < raffle.ticketPrice) {
        const approveTx = await usdc.approve(raffleChainAddress, raffle.ticketPrice);
        await approveTx.wait();
      }
      const tx = await getWriteContract(signer).buyTicket(raffleIdOnChain, selected);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setSelected(null);
      refresh();
    } catch (e: unknown) {
      const msg =
        (e as { reason?: string; message?: string }).reason ??
        (e as { message?: string }).message ??
        "Error desconocido";
      setError(msg);
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="panel mt-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="panel-title mb-0">Tickets</h2>
        <div className="text-right text-xs text-dim space-y-0.5">
          <p>
            <span className="font-semibold text-[var(--text)]">{soldCount}</span> / {maxTickets} vendidos
          </p>
          {myCount > 0 && (
            <p className="text-indigo-400 font-semibold">
              {myCount} mío{myCount > 1 ? "s" : ""} · {myOdds}% de chances
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 text-xs text-dim">
        <LegendItem color="border border-white/10" label="Disponible" />
        <LegendItem color="bg-white/5" label="Vendido" />
        {normalizedAddress && <LegendItem color="bg-indigo-500" label="Mío" />}
        {raffleStatus === 2 && <LegendItem color="bg-amber-400" label="Ganador" />}
      </div>

      {loadingTickets ? (
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(2.5rem, 1fr))" }}
        >
          {Array.from({ length: maxTickets }, (_, i) => (
            <div key={i} className="skeleton rounded" style={{ aspectRatio: "1" }} />
          ))}
        </div>
      ) : (
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(2.5rem, 1fr))" }}
        >
          {Array.from({ length: maxTickets }, (_, i) => i + 1).map((n) => {
            const status = getStatus(n);
            const clickable =
              isActive && status === "available" && isConnected && !isWrongNetwork;
            return (
              <button
                key={n}
                onClick={() => clickable && setSelected(selected === n ? null : n)}
                disabled={!clickable && status !== "available"}
                className={cellClass(n)}
                style={{ aspectRatio: "1" }}
                title={
                  status === "winner"
                    ? "¡Ticket ganador!"
                    : status === "mine"
                    ? "Tuyo"
                    : status === "taken"
                    ? "Vendido"
                    : `Comprar ticket #${n}`
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      )}

      {isActive && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          {!isConnected ? (
            <button onClick={connect} className="btn btn-primary btn-full btn-glow-ring">
              Conectar wallet para comprar
            </button>
          ) : isWrongNetwork ? (
            <p className="alert-warning">Cambiá a la red Sepolia para continuar.</p>
          ) : selected !== null ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text)]">
                Ticket{" "}
                <span className="font-bold text-accent">#{selected}</span> —{" "}
                <span className="font-bold text-accent">
                  {formatUsdc(raffle.ticketPrice)} USDC
                </span>
              </p>
              {error && <p className="alert-error">{error}</p>}
              {txHash && (
                <p className="alert-success">
                  ¡Comprado!{" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2"
                  >
                    Ver en Etherscan
                  </a>
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="btn btn-primary btn-glow-ring flex-1"
                >
                  {buying ? "Comprando…" : `Comprar #${selected}`}
                </button>
                <button
                  onClick={() => { setSelected(null); setError(null); }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-dim text-center py-1">
              Tocá un ticket disponible para comprarlo
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded ${color}`} />
      {label}
    </span>
  );
}
