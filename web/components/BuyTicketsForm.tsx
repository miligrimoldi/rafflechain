"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { getReadContract, getWriteContract, OnChainRaffle } from "@/lib/contract";
import { getUsdcContract, formatUsdc } from "@/lib/usdc";

type Props = { raffleIdOnChain: number };

export default function BuyTicketsForm({ raffleIdOnChain }: Props) {
  const { signer, isConnected, isWrongNetwork, connect } = useWallet();
  const [raffle, setRaffle] = useState<OnChainRaffle | null>(null);
  const [ended, setEnded] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [raffleIdOnChain, txHash]);

  if (!raffle) return null;

  const isActive = Number(raffle.status) === 0 && !ended;
  if (!isActive) return null;

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!signer || !raffle) return;
    setError(null);
    setLoading(true);
    setTxHash(null);

    const num = parseInt(ticketNumber, 10);
    if (isNaN(num) || num < 1 || num > Number(raffle.maxTickets)) {
      setError(`Número de ticket inválido. Elegí entre 1 y ${raffle.maxTickets}.`);
      setLoading(false);
      return;
    }

    try {
      const contract = getWriteContract(signer);
      const owner: string = await contract.getTicketOwner(raffleIdOnChain, num);
      if (owner !== ethers.ZeroAddress) {
        setError("Ese ticket ya fue vendido. Elegí otro número.");
        setLoading(false);
        return;
      }
        const buyerAddress = await signer.getAddress();
        const usdc = getUsdcContract(signer);
        const raffleChainAddress = process.env.NEXT_PUBLIC_RAFFLE_CHAIN_ADDRESS!;

        const allowance: bigint = await usdc.allowance(buyerAddress, raffleChainAddress);

        if (allowance < raffle.ticketPrice) {
            const approveTx = await usdc.approve(raffleChainAddress, raffle.ticketPrice);
            await approveTx.wait();
        }

        const tx = await contract.buyTicket(raffleIdOnChain, num);
        const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setTicketNumber("");
    } catch (e: unknown) {
      const msg = (e as { reason?: string; message?: string }).reason
        ?? (e as { message?: string }).message
        ?? "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Comprar ticket</h2>

      {!isConnected ? (
        <button onClick={connect} className="btn btn-primary btn-full btn-glow-ring">
          Conectar wallet para comprar
        </button>
      ) : isWrongNetwork ? (
        <p className="alert-warning">Cambiá a la red Sepolia para continuar.</p>
      ) : (
        <form onSubmit={handleBuy} className="space-y-4">
          <div>
            <label className="form-label">
              Número de ticket{" "}
              <span className="text-slate-400 font-normal">
                (1 – {String(raffle.maxTickets)})
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={Number(raffle.maxTickets)}
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
              className="input-field"
              placeholder="ej. 42"
            />
          </div>

          <p className="text-sm text-slate-500">
            Precio:{" "}
            <span className="font-bold text-accent">
             {formatUsdc(raffle.ticketPrice)} USDC
            </span>
          </p>

          {error && <p className="alert-error">{error}</p>}

          {txHash && (
            <p className="alert-success">
              ¡Ticket comprado!{" "}
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

          <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-glow-ring">
            {loading ? "Comprando…" : "Comprar ticket"}
          </button>
        </form>
      )}
    </div>
  );
}
