import Link from "next/link";
import type { RaffleMetadata } from "@prisma/client";

// TODO(blockchain): Extender las props para recibir también datos on-chain.
// La card deberá combinar metadata off-chain (Prisma) con datos del contrato:
//   - ticketPrice  → getRaffle(id).ticketPrice  → mostrar en ETH (formatEther)
//   - ticketsSold  → getTicketsSold(id)          → ej. "3 / 10 tickets"
//   - status       → getRaffle(id).status        → ACTIVE | WAITING_RANDOMNESS | WINNER_SELECTED
//   - winner       → getRaffle(id).winner        → address ganadora (si hubo sorteo)
// Estos datos se mostrarán como chips/badges en el footer de la card.
export default function RaffleCard({ raffle }: { raffle: RaffleMetadata }) {
  return (
    <Link
      href={`/raffles/${raffle.raffleIdOnChain}`}
      className="group block bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden"
    >
      {raffle.imageUrl && (
        <img
          src={raffle.imageUrl}
          alt={raffle.title}
          className="w-full h-44 object-cover"
        />
      )}
      <div className="p-5">
        <span className="inline-block text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded mb-2">
          #{raffle.raffleIdOnChain}
        </span>
        <h2 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug mb-1">
          {raffle.title}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{raffle.description}</p>
        <p className="text-xs text-gray-400">por {raffle.organizerName}</p>
      </div>
    </Link>
  );
}
