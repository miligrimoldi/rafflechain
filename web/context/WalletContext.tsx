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

type WalletState = {
  address: string | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
};

const DISCONNECTED: WalletState = { address: null, signer: null, chainId: null };

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(DISCONNECTED);

  const { address, signer, chainId } = wallet;
  const isConnected = address !== null;
  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;

  const updateSigner = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      setWallet(DISCONNECTED);
      return;
    }
    const network = await provider.getNetwork();
    setWallet({
      chainId: Number(network.chainId),
      address: await accounts[0].getAddress(),
      signer: accounts[0],
    });
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    updateSigner();

    const handleAccountsChanged = (accounts: unknown) => {
      if ((accounts as string[]).length === 0) {
        setWallet(DISCONNECTED);
      } else {
        updateSigner();
      }
    };
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
    setWallet(DISCONNECTED);
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
