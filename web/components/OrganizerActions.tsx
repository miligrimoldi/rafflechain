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
    <div className="panel">
      <h2 className="panel-title">Acciones</h2>

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

      {error && <p className="mt-3 alert-error">{error}</p>}
      {txHash && (
        <p className="mt-3 alert-success">
          Transacción confirmada.{" "}
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
  const styles =
    variant === "danger"
      ? "action-btn action-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
      : "action-btn action-btn-default disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button onClick={onClick} disabled={loading} className={styles}>
      {loading ? "Procesando…" : label}
    </button>
  );
}
