import confetti from "canvas-confetti";
import toast from "react-hot-toast";

export function celebrateWinner(message: string) {
    toast.success(message, {
        duration: 6500,
    });

    confetti({
        particleCount: 180,
        spread: 120,
        origin: { y: 0.6 },
    });

    window.setTimeout(() => {
        confetti({
            particleCount: 90,
            spread: 80,
            origin: { x: 0.2, y: 0.65 },
        });

        confetti({
            particleCount: 90,
            spread: 80,
            origin: { x: 0.8, y: 0.65 },
        });
    }, 350);
}