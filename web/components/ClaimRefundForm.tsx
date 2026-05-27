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
    <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
        Rifa cancelada — reembolso disponible
      </h2>
      <p className="text-sm text-red-700 mb-4">
        Si compraste un ticket, podés reclamar tu{" "}
        <span className="font-medium">{ethers.formatEther(raffle.ticketPrice)} ETH</span>{" "}
        de vuelta.
      </p>

      {!isConnected ? (
        <button
          onClick={connect}
          className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Conectar wallet para reclamar
        </button>
      ) : isWrongNetwork ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg">
          Cambiá a la red Sepolia para continuar.
        </p>
      ) : (
        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de ticket{" "}
              <span className="text-gray-400 font-normal">(1 – {String(raffle.maxTickets)})</span>
            </label>
            <input
              type="number"
              min={1}
              max={Number(raffle.maxTickets)}
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="ej. 7"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-100 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {txHash && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              ¡Reembolso procesado!{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver en Etherscan
              </a>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Procesando…" : "Reclamar reembolso"}
          </button>
        </form>
      )}
    </div>
  );
}
