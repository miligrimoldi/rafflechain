"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, getWriteContract, OnChainRaffle } from "@/lib/contract";
import { ethers } from "ethers";

type Props = { raffleIdOnChain: number };

export default function ClaimRefundForm({ raffleIdOnChain }: Props) {
  const { signer, isConnected, isWrongNetwork, connect } = useWallet();
  const [raffle, setRaffle] = useState<OnChainRaffle | null>(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getReadContract().getRaffle(raffleIdOnChain);
        if (!cancelled) setRaffle(data as OnChainRaffle);
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain]);

  if (!raffle || Number(raffle.status) !== 3) return null;

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!signer || !raffle) return;
    setError(null);
    setLoading(true);
    setTxHash(null);

    const num = parseInt(ticketNumber, 10);
    if (isNaN(num) || num < 1 || num > Number(raffle.maxTickets)) {
      setError(`Número de ticket inválido. Ingresá un número entre 1 y ${raffle.maxTickets}.`);
      setLoading(false);
      return;
    }

    try {
      const contract = getWriteContract(signer);

      const owner: string = await getReadContract().getTicketOwner(raffleIdOnChain, num);
      if (owner === ethers.ZeroAddress) {
        setError("Ese número de ticket no fue vendido.");
        setLoading(false);
        return;
      }

      const tx = await contract.claimRefund(raffleIdOnChain, num);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setTicketNumber("");
    } catch (e: unknown) {
      const msg =
        (e as { reason?: string; message?: string }).reason ??
        (e as { message?: string }).message ??
        "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel-danger">
      <h2 className="panel-title panel-title-danger mb-1">
        Rifa cancelada — reembolso disponible
      </h2>
      <p className="text-sm text-muted mb-4 leading-relaxed">
        Si compraste un ticket, podés reclamar tu{" "}
        <span className="font-bold">{ethers.formatEther(raffle.ticketPrice)} ETH</span> de vuelta.
      </p>

      {!isConnected ? (
        <button onClick={connect} className="btn btn-danger btn-full">
          Conectar wallet para reclamar
        </button>
      ) : isWrongNetwork ? (
        <p className="alert-warning">Cambiá a la red Sepolia para continuar.</p>
      ) : (
        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="form-label" style={{ color: "var(--text-muted)" }}>
              Número de ticket{" "}
              <span className="text-slate-400 font-normal">(1 – {String(raffle.maxTickets)})</span>
            </label>
            <input
              type="number"
              min={1}
              max={Number(raffle.maxTickets)}
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
              className="input-field focus:ring-red-200 focus:border-red-400"
              placeholder="ej. 7"
            />
          </div>

          {error && <p className="alert-error">{error}</p>}

          {txHash && (
            <p className="alert-success">
              ¡Reembolso procesado!{" "}
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

          <button type="submit" disabled={loading} className="btn btn-danger btn-full">
            {loading ? "Procesando…" : "Reclamar reembolso"}
          </button>
        </form>
      )}
    </div>
  );
}
