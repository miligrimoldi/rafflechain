"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ethers } from "ethers";
import { SEPOLIA_CHAIN_ID, switchToSepolia } from "@/lib/contract";

type WalletContextValue = {
  address: string | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  isConnected: boolean;
  isWrongNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue>({
  address: null,
  signer: null,
  chainId: null,
  isConnected: false,
  isWrongNetwork: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isConnected = address !== null;
  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;

  const updateSigner = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      setAddress(null);
      setSigner(null);
      return;
    }
    const network = await provider.getNetwork();
    setChainId(Number(network.chainId));
    const s = await provider.getSigner();
    setAddress(await s.getAddress());
    setSigner(s);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    updateSigner();

    const handleAccountsChanged = () => updateSigner();
    const handleChainChanged = () => updateSigner();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [updateSigner]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Instalá MetaMask para continuar.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await switchToSepolia();
    await updateSigner();
  }, [updateSigner]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setChainId(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, signer, chainId, isConnected, isWrongNetwork, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
