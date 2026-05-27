"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, getWriteContract, OnChainRaffle } from "@/lib/contract";

const VRF_TIMEOUT_SECS = 3600;      // 1 hora (machea contrato VRF_TIMEOUT)
const CANCEL_TIMEOUT_SECS = 86400;  // 24hrs (machea contrato CANCEL_TIMEOUT)

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
  const nowSecs = Math.floor(Date.now() / 1000);
  const vrfTs = Number(raffle.vrfRequestTimestamp);

  const status = Number(raffle.status);

  const canRequestWinner =
    status === 0 && ended && raffle.ticketsSold > 0n;

  const canRetryWinner =
    status === 1 && vrfTs > 0 && nowSecs >= vrfTs + VRF_TIMEOUT_SECS;

  const canCancelEmpty =
    status === 0 && ended && raffle.ticketsSold === 0n;

  const canCancelStuck =
    status === 1 && vrfTs > 0 && nowSecs >= vrfTs + CANCEL_TIMEOUT_SECS;

  const canWithdraw =
    isOrganizer && status === 2 && !raffle.fundsWithdrawn;

  const canClaimPrize =
    isWinner && status === 2 && !raffle.prizeClaimed;

  if (
    !canRequestWinner &&
    !canRetryWinner &&
    !canCancelEmpty &&
    !canCancelStuck &&
    !canWithdraw &&
    !canClaimPrize
  ) return null;

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
    const tx = await getWriteContract(signer!).requestWinner(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doRetryWinner() {
    const tx = await getWriteContract(signer!).retryWinnerRequest(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doCancelEmpty() {
    const tx = await getWriteContract(signer!).cancelEmptyRaffle(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doCancelStuck() {
    const tx = await getWriteContract(signer!).cancelStuckRaffle(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doWithdraw() {
    const tx = await getWriteContract(signer!).withdrawFunds(raffleIdOnChain);
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async function doClaimPrize() {
    const tx = await getWriteContract(signer!).claimPrize(raffleIdOnChain);
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
        {canRetryWinner && (
          <ActionButton
            label="Reintentar sorteo (VRF sin respuesta)"
            loading={loadingAction === "retryWinner"}
            onClick={() => runAction("retryWinner", doRetryWinner)}
          />
        )}
        {canCancelEmpty && (
          <ActionButton
            label="Cancelar rifa (sin tickets vendidos)"
            loading={loadingAction === "cancelEmpty"}
            onClick={() => runAction("cancelEmpty", doCancelEmpty)}
            variant="danger"
          />
        )}
        {canCancelStuck && (
          <ActionButton
            label="Cancelar rifa (VRF sin respuesta por 24h)"
            loading={loadingAction === "cancelStuck"}
            onClick={() => runAction("cancelStuck", doCancelStuck)}
            variant="danger"
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
  variant = "default",
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  const base =
    "w-full text-left rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const styles =
    variant === "danger"
      ? `${base} bg-red-50 border border-red-200 text-red-700 hover:bg-red-100`
      : `${base} bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100`;

  return (
    <button onClick={onClick} disabled={loading} className={styles}>
      {loading ? "Procesando…" : label}
    </button>
  );
}
