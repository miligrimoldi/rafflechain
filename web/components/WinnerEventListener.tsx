"use client";

import { useEffect } from "react";
import { ethers } from "ethers";
import { RAFFLECHAIN_ABI } from "@/lib/abi";
import { useWallet } from "@/context/WalletContext";
import { celebrateWinner } from "@/lib/celebration";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RAFFLE_CHAIN_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

export default function WinnerEventListener() {
    const { address } = useWallet();

    useEffect(() => {
        if (!address) return;

        const normalizedAddress = address.toLowerCase();
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, RAFFLECHAIN_ABI, provider);

        function handleWinnerSelected(
            raffleId: bigint,
            winner: string,
            winningTicketNumber: bigint
        ) {
            if (winner.toLowerCase() !== normalizedAddress) return;

            const key = `rafflechain-winner-seen-${raffleId.toString()}-${normalizedAddress}`;

            if (window.localStorage.getItem(key)) return;
            window.localStorage.setItem(key, "true");

            celebrateWinner(
                `🎉 ¡Ganaste la rifa #${raffleId.toString()} con el ticket #${winningTicketNumber.toString()}!`
            );
        }

        contract.on("WinnerSelected", handleWinnerSelected);

        return () => {
            contract.off("WinnerSelected", handleWinnerSelected);
        };
    }, [address]);

    return null;
}