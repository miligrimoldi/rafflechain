import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RaffleCard from "@/components/RaffleCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const raffles = await prisma.raffleMetadata.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page-main">
      <div className="page-container">
        <section className="hero">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Sepolia · VRF · 100% on-chain
          </div>
          <h1 className="hero-title">
            Tu número.
            <span className="hero-title-accent">Tu suerte. Verificable.</span>
          </h1>
          <p className="hero-sub">
            Rifas con tickets en ETH, sorteos con Chainlink y reglas que nadie puede
            cambiar a escondidas. Elegí, comprá y seguí todo desde la wallet.
          </p>
          <div className="hero-actions">
            <Link href="/create" className="btn btn-primary btn-glow-ring">
              Crear rifa
            </Link>
            <a href="#rifas" className="btn btn-secondary">
              Ver rifas activas
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <p className="hero-stat-value">{raffles.length}</p>
              <p className="hero-stat-label">Rifas publicadas</p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-value">ETH</p>
              <p className="hero-stat-label">Tickets on-chain</p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-value">VRF</p>
              <p className="hero-stat-label">Sorteo auditable</p>
            </div>
          </div>
        </section>

        <section id="rifas">
          {raffles.length === 0 ? (
            <div className="empty-state card max-w-lg mx-auto">
              <p className="empty-state-icon">🎟️</p>
              <p className="empty-state-title">El escenario está vacío</p>
              <p className="text-muted text-sm mt-3 leading-relaxed max-w-xs mx-auto">
                Todavía no hay rifas. Encendé las luces creando la primera.
              </p>
              <Link href="/create" className="btn btn-primary btn-glow-ring mt-8 inline-flex">
                Encender la primera rifa
              </Link>
            </div>
          ) : (
            <>
              <h2 className="section-label">Rifas en vivo</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
                {raffles.map((raffle: (typeof raffles)[0]) => (
                  <RaffleCard key={raffle.id} raffle={raffle} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
