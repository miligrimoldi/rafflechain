"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
    endTime: bigint | number;
    status: number;
    ticketsSold: bigint | number;
    maxTickets: bigint | number;
    createdAt?: Date | string | number;
};

type TimeLeft = {
    totalSeconds: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
};

function getTimeLeft(endTimeSeconds: number): TimeLeft {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const totalSeconds = Math.max(0, endTimeSeconds - nowSeconds);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { totalSeconds, days, hours, minutes, seconds };
}

function pad(value: number) {
    return String(value).padStart(2, "0");
}

export default function RaffleCountdown({
                                            endTime,
                                            status,
                                            ticketsSold,
                                            maxTickets,
                                        }: Props) {
    const endTimeSeconds = Number(endTime);
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(endTimeSeconds));

    useEffect(() => {
        const interval = window.setInterval(() => {
            setTimeLeft(getTimeLeft(endTimeSeconds));
        }, 1000);

        return () => window.clearInterval(interval);
    }, [endTimeSeconds]);

    const isSoldOut = BigInt(ticketsSold) === BigInt(maxTickets);
    const isActive = status === 0 && timeLeft.totalSeconds > 0 && !isSoldOut;

    const label = useMemo(() => {
        if (status === 3) return "Rifa cancelada";
        if (status === 2) return "Ganador seleccionado";
        if (status === 1) return "Sorteo en proceso";
        if (isSoldOut) return "Tickets agotados";
        if (timeLeft.totalSeconds === 0) return "La rifa terminó";
        return "Tiempo restante";
    }, [status, isSoldOut, timeLeft.totalSeconds]);

    const DEMO_WINDOW_SECONDS = 48 * 60 * 60;

    const urgencyProgress = Math.min(
        100,
        Math.max(0, 100 - (timeLeft.totalSeconds / DEMO_WINDOW_SECONDS) * 100)
    );

    return (
        <div className="countdown-card">
            <div className="countdown-glow" />

            <div className="relative z-10">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <p className="countdown-eyebrow">Cuenta regresiva</p>
                        <h2 className="countdown-title">{label}</h2>
                    </div>

                    <div className={isActive ? "countdown-live-dot" : "countdown-live-dot countdown-live-dot-off"} />
                </div>

                <div className="countdown-grid">
                    <TimeBox label="Días" value={timeLeft.days} />
                    <TimeBox label="Horas" value={pad(timeLeft.hours)} />
                    <TimeBox label="Min" value={pad(timeLeft.minutes)} />
                    <TimeBox label="Seg" value={pad(timeLeft.seconds)} />
                </div>

                <div className="countdown-progress-wrap">
                    <div
                        className="countdown-progress-bar"
                        style={{ width: `${urgencyProgress}%` }}
                    />
                </div>

                <p className="countdown-progress-label">
                    {timeLeft.totalSeconds > 0
                        ? "Tiempo restante para participar"
                        : "El tiempo de participación terminó"}
                </p>

                {isActive && (
                    <p className="countdown-footer">
                        Todavía estás a tiempo de elegir tu número.
                    </p>
                )}
            </div>
        </div>
    );
}

function TimeBox({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="countdown-box">
            <span className="countdown-number">{value}</span>
            <span className="countdown-label">{label}</span>
        </div>
    );
}