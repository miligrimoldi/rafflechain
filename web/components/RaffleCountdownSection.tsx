"use client";

import { useEffect, useState } from "react";
import { getReadContract, OnChainRaffle } from "@/lib/contract";
import RaffleCountdown from "./RaffleCountdown";

export default function RaffleCountdownSection({
                                                   raffleIdOnChain,
                                               }: {
    raffleIdOnChain: number;
}) {
    const [raffle, setRaffle] = useState<OnChainRaffle | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getReadContract().getRaffle(raffleIdOnChain);

                if (!cancelled) {
                    setRaffle(data as OnChainRaffle);
                }
            } catch (e) {
                console.error(e);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [raffleIdOnChain]);

    if (!raffle) return null;

    return (
        <RaffleCountdown
            endTime={raffle.endTime}
            status={Number(raffle.status)}
            ticketsSold={raffle.ticketsSold}
            maxTickets={raffle.maxTickets}
        />
    );
}