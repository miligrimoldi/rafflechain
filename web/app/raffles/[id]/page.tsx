import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditRaffleMetadataForm from "@/components/EditRaffleMetadataForm";
import OnChainRaffleInfo from "@/components/OnChainRaffleInfo";
import TicketGrid from "@/components/TicketGrid";
import OrganizerActions from "@/components/OrganizerActions";
import ClaimRefundForm from "@/components/ClaimRefundForm";
import RaffleCountdownSection from "@/components/RaffleCountdownSection";

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
    <main className="page-main">
      <div className="page-container-narrow">
        <Link href="/" className="btn-link inline-flex items-center gap-1">
          ← Volver al inicio
        </Link>

        <article className="card-elevated mt-8 animate-[fade-in-up_0.55s_ease-out_both]">
          {raffle.imageUrl && (
            <div className="detail-image-wrap">
              <img src={raffle.imageUrl} alt={raffle.title} />
              <div className="detail-image-overlay" />
            </div>
          )}

          <div className="p-6 sm:p-9">
            <span className="badge-id mb-5 inline-block">
              #{raffle.raffleIdOnChain} on-chain
            </span>

              <h1 className="detail-hero-title mb-3">{raffle.title}</h1>

              <p className="detail-meta mb-6">
                  Organizado por <strong>{raffle.organizerName}</strong>
              </p>

              <RaffleCountdownSection raffleIdOnChain={raffle.raffleIdOnChain} />

              <Section title="Descripción" content={raffle.description} />
            {raffle.conditions && (
              <Section title="Condiciones" content={raffle.conditions} />
            )}
            {raffle.deliveryInfo && (
              <Section title="Entrega del premio" content={raffle.deliveryInfo} />
            )}

            <p className="text-xs text-dim mt-10 pt-6 border-t border-[var(--border)]">
              Creado el{" "}
              {raffle.createdAt.toLocaleDateString("es-AR", { dateStyle: "long" })}
            </p>

            <OnChainRaffleInfo raffleIdOnChain={raffle.raffleIdOnChain} />
            <TicketGrid raffleIdOnChain={raffle.raffleIdOnChain} />
            <ClaimRefundForm raffleIdOnChain={raffle.raffleIdOnChain} />
            <OrganizerActions raffleIdOnChain={raffle.raffleIdOnChain} />

            <EditRaffleMetadataForm raffle={raffle} />
          </div>
        </article>
      </div>
    </main>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="detail-section mb-7">
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
}
