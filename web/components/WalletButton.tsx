"use client";

import { useWallet } from "@/context/WalletContext";
import { switchToSepolia } from "@/lib/contract";

export default function WalletButton() {
  const { address, isConnected, isWrongNetwork, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Conectar wallet
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={switchToSepolia}
        className="text-sm bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
      >
        Red incorrecta · Cambiar a Sepolia
      </button>
    );
  }

  const short = `${address!.slice(0, 6)}…${address!.slice(-4)}`;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
        {short}
      </span>
      <button
        onClick={disconnect}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Desconectar
      </button>
    </div>
  );
}
