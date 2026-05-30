import Link from "next/link";
import type { prisma } from "@/lib/prisma";
type RaffleMetadata = Awaited<ReturnType<typeof prisma.raffleMetadata.findUnique>> & object;
import RaffleStatusBadge from "./RaffleStatusBadge";

export default function RaffleCard({ raffle }: { raffle: RaffleMetadata }) {
  return (
    <Link href={`/raffles/${raffle.raffleIdOnChain}`} className="ticket-card group">
      <div className="ticket-card-shine" />
      {raffle.imageUrl ? (
        <div className="relative overflow-hidden">
          <img
            src={raffle.imageUrl}
            alt={raffle.title}
            className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent opacity-80" />
        </div>
      ) : (
        <div className="ticket-card-no-image">🎟️</div>
      )}
      <div className="ticket-card-divider" />
      <div className="ticket-card-body">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="badge-id">#{raffle.raffleIdOnChain}</span>
          <RaffleStatusBadge raffleIdOnChain={raffle.raffleIdOnChain} />
        </div>
        <h2 className="ticket-card-title mb-2">{raffle.title}</h2>
        <p className="text-sm text-muted line-clamp-2 mb-3 leading-relaxed">
          {raffle.description}
        </p>
        <p className="text-xs text-dim">
          por <span className="text-muted font-semibold">{raffle.organizerName}</span>
        </p>
      </div>
    </Link>
  );
}
