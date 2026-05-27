import { ethers } from "ethers";
import { RAFFLECHAIN_ABI } from "./abi";

export const SEPOLIA_CHAIN_ID = 11155111;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RAFFLE_CHAIN_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

export const STATUS_LABELS: Record<number, string> = {
  0: "Activa",
  1: "Esperando aleatoriedad",
  2: "Ganador seleccionado",
  3: "Cancelada",
};

export type OnChainRaffle = {
  id: bigint;
  organizer: string;
  ticketPrice: bigint;
  maxTickets: bigint;
  endTime: bigint;
  ticketsSold: bigint;
  amountCollected: bigint;
  winningTicketNumber: bigint;
  winner: string;
  randomNumber: bigint;
  status: number;
  fundsWithdrawn: boolean;
  prizeClaimed: boolean;
  vrfRequestTimestamp: bigint;
};

export function getReadContract(): ethers.Contract {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, RAFFLECHAIN_ABI, provider);
}

export function getWriteContract(signer: ethers.Signer): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, RAFFLECHAIN_ABI, signer);
}

export async function switchToSepolia(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask no instalado");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
    });
  } catch (err: unknown) {
    // 4902 = chain not added yet
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
            chainName: "Sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}
