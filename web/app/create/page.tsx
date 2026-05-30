import Link from "next/link";
import CreateRaffleForm from "@/components/CreateRaffleForm";

export default function CreatePage() {
  return (
    <main className="page-main">
      <div className="page-container-narrow">
        <Link href="/" className="btn-link inline-flex items-center gap-1">
          ← Volver al inicio
        </Link>

        <div className="page-header mt-8">
          <p className="page-eyebrow">Organizador</p>
          <h1>Lanzá tu rifa</h1>
          <p>
            Primero el contrato en Sepolia, después la metadata visible. El sorteo no
            depende de nosotros — vive en la blockchain.
          </p>
        </div>

        <div className="card p-6 sm:p-9 animate-[fade-in-up_0.55s_ease-out_both]">
          <CreateRaffleForm />
        </div>
      </div>
    </main>
  );
}
