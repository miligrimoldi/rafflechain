import MyRafflesList from "@/components/MyRafflesList";
import Link from "next/link";

export const metadata = { title: "Mis rifas · RaffleChain" };

export default function MyRafflesPage() {
  return (
    <main className="page-main">
      <div className="page-container-narrow">
        <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="page-eyebrow">Tu panel</p>
            <h1>Mis rifas</h1>
            <p>Control total de lo que publicaste y su estado en cadena.</p>
          </div>
          <Link href="/create" className="btn btn-primary btn-glow-ring shrink-0 self-start sm:self-auto">
            + Nueva rifa
          </Link>
        </div>
        <MyRafflesList />
      </div>
    </main>
  );
}
