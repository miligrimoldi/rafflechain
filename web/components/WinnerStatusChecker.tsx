"use client";

import { useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { getReadContract } from "@/lib/contract";
import { celebrateWinner } from "@/lib/celebration";

export default function WinnerStatusChecker({
                                                raffleIdOnChain,
                                            }: {
    raffleIdOnChain: number;
}) {
    const { address } = useWallet();

    useEffect(() => {
        if (!address) return;

        const normalizedAddress = address.toLowerCase();
        let cancelled = false;

        async function checkWinner() {
            try {
                const raffle = await getReadContract().getRaffle(raffleIdOnChain);

                if (cancelled) return;

                const status = Number(raffle.status);
                const winner = String(raffle.winner).toLowerCase();

                if (status !== 2 || winner !== normalizedAddress) return;

                const key = `rafflechain-winner-seen-${raffleIdOnChain}-${normalizedAddress}`;

                if (window.localStorage.getItem(key)) return;
                window.localStorage.setItem(key, "true");

                celebrateWinner(
                    `🎉 ¡Ganaste esta rifa con el ticket #${String(raffle.winningTicketNumber)}!`
                );
            } catch (e) {
                console.error(e);
            }
        }

        checkWinner();

        return () => {
            cancelled = true;
        };
    }, [address, raffleIdOnChain]);

    return null;
}