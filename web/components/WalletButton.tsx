"use client";

import { useWallet } from "@/context/WalletContext";
import { switchToSepolia } from "@/lib/contract";

export default function WalletButton() {
  const { address, isConnected, isWrongNetwork, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <button onClick={connect} className="btn btn-primary btn-sm btn-glow-ring">
        Conectar
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <button onClick={switchToSepolia} className="btn btn-warning btn-sm">
        Cambiar a Sepolia
      </button>
    );
  }

  const short = `${address!.slice(0, 6)}…${address!.slice(-4)}`;
  return (
    <div className="flex items-center gap-2">
      <span className="wallet-chip">{short}</span>
      <button
        onClick={disconnect}
        className="text-xs font-semibold text-dim hover:text-muted px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
      >
        Salir
      </button>
    </div>
  );
}
