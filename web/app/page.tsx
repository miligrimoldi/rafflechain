import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RaffleCard from "@/components/RaffleCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const raffles = await prisma.raffleMetadata.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Explorar rifas</h1>
            <p className="text-gray-500 text-sm mt-1">Rifas transparentes en blockchain</p>
          </div>
          <Link
            href="/create"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Nueva rifa
          </Link>
        </div>

        {/* List */}
        {raffles.length === 0 ? (
          <div className="text-center py-28">
            <p className="text-2xl mb-2">🎟️</p>
            <p className="text-gray-500 font-medium">No hay rifas todavía.</p>
            <p className="text-gray-400 text-sm mt-1">
              Creá la primera usando el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {raffles.map((raffle) => (
              <RaffleCard key={raffle.id} raffle={raffle} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
