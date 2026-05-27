"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, getWriteContract, OnChainRaffle } from "@/lib/contract";

type Props = { raffleIdOnChain: number };

export default function OrganizerActions({ raffleIdOnChain }: Props) {
  const { address, signer, isConnected, isWrongNetwork } = useWallet();
  const [raffle, setRaffle] = useState<OnChainRaffle | null>(null);
  const [ended, setEnded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain, refreshKey]);

  if (!raffle || !isConnected || isWrongNetwork || !address) return null;

  const normalizedAddress = address.toLowerCase();
  const isOrganizer = raffle.organizer.toLowerCase() === normalizedAddress;
  const isWinner = raffle.winner.toLowerCase() === normalizedAddress;

  const canRequestWinner =
    isOrganizer &&
    raffle.status === 0 &&
    ended &&
    raffle.ticketsSold > 0n;

  const canWithdraw =
    isOrganizer && raffle.status === 2 && !raffle.fundsWithdrawn;

  const canClaimPrize =
    isWinner && raffle.status === 2 && !raffle.prizeClaimed;

  if (!canRequestWinner && !canWithdraw && !canClaimPrize) return null;

  async function runAction(name: string, fn: () => Promise<string>) {
    setError(null);
    setTxHash(null);
    setLoadingAction(name);
    try {
      const hash = await fn();
      setTxHash(hash);
      setRefreshKey((k) => k + 1);
    } catch (e: unknown) {
      const msg =
        (e as { reason?: string; message?: string }).reason ??
        (e as { message?: string }).message ??
        "Error desconocido";
      setError(msg);
    } finally {
      setLoadingAction(null);
    }
  }

  async function doRequestWinner() {
    const contract = getWriteContract(signer!);
    const tx = await contract.requestWinner(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doWithdraw() {
    const contract = getWriteContract(signer!);
    const tx = await contract.withdrawFunds(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doClaimPrize() {
    const contract = getWriteContract(signer!);
    const tx = await contract.claimPrize(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Acciones
      </h2>

      <div className="space-y-2">
        {canRequestWinner && (
          <ActionButton
            label="Sortear ganador (Chainlink VRF)"
            loading={loadingAction === "requestWinner"}
            onClick={() => runAction("requestWinner", doRequestWinner)}
          />
        )}
        {canWithdraw && (
          <ActionButton
            label="Retirar fondos"
            loading={loadingAction === "withdrawFunds"}
            onClick={() => runAction("withdrawFunds", doWithdraw)}
          />
        )}
        {canClaimPrize && (
          <ActionButton
            label="Reclamar premio"
            loading={loadingAction === "claimPrize"}
            onClick={() => runAction("claimPrize", doClaimPrize)}
          />
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      {txHash && (
        <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          Transacción confirmada.{" "}
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
    </div>
  );
}

function ActionButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? "Procesando…" : label}
    </button>
  );
}
