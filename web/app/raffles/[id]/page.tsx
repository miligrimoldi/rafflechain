import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditRaffleMetadataForm from "@/components/EditRaffleMetadataForm";
import OnChainRaffleInfoPlaceholder from "@/components/OnChainRaffleInfoPlaceholder";
import BuyTicketsPlaceholder from "@/components/BuyTicketsPlaceholder";
import OrganizerActionsPlaceholder from "@/components/OrganizerActionsPlaceholder";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function RaffleDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const raffleIdOnChain = parseInt(rawId, 10);

  if (isNaN(raffleIdOnChain)) notFound();

  const raffle = await prisma.raffleMetadata.findUnique({
    where: { raffleIdOnChain },
  });

  if (!raffle) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Volver al inicio
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 mt-4 overflow-hidden">
          {/* Image */}
          {raffle.imageUrl && (
            <img
              src={raffle.imageUrl}
              alt={raffle.title}
              className="w-full h-56 object-cover"
            />
          )}

          <div className="p-8">
            {/* ID badge */}
            <span className="inline-block text-xs font-mono text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded mb-3">
              ID on-chain #{raffle.raffleIdOnChain}
            </span>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">{raffle.title}</h1>
            <p className="text-sm text-gray-500 mb-6">
              Organizado por{" "}
              <span className="font-medium text-gray-700">{raffle.organizerName}</span>
            </p>

            <Section title="Descripción" content={raffle.description} />
            {raffle.conditions && (
              <Section title="Condiciones" content={raffle.conditions} />
            )}
            {raffle.deliveryInfo && (
              <Section title="Entrega del premio" content={raffle.deliveryInfo} />
            )}

            <p className="text-xs text-gray-400 mt-6">
              Creado el{" "}
              {raffle.createdAt.toLocaleDateString("es-AR", { dateStyle: "long" })}
            </p>

            {/* TODO(blockchain): Reemplazar estos placeholders cuando se integre el contrato.
                Leer datos on-chain en paralelo con la metadata:
                  const onChainData = await raffleChainContract.getRaffle(raffleIdOnChain)
                  const ticketsSold = await raffleChainContract.getTicketsSold(raffleIdOnChain)
                Mostrar: ticketPrice, maxTickets, ticketsSold, amountCollected, status, winner. */}
            <OnChainRaffleInfoPlaceholder raffleIdOnChain={raffle.raffleIdOnChain} />

            {/* TODO(blockchain): Habilitar solo cuando status === ACTIVE y la rifa no terminó. */}
            <BuyTicketsPlaceholder raffleIdOnChain={raffle.raffleIdOnChain} />

            {/* TODO(blockchain): Mostrar solo al organizador (wallet === raffle.organizer)
                o al ganador (wallet === raffle.winner) según la acción. */}
            <OrganizerActionsPlaceholder raffleIdOnChain={raffle.raffleIdOnChain} />

            <EditRaffleMetadataForm raffle={raffle} />
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
        {title}
      </h2>
      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{content}</p>
    </div>
  );
}
