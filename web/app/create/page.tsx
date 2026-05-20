import Link from "next/link";
import CreateRaffleForm from "@/components/CreateRaffleForm";

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Volver al inicio
        </Link>

        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nueva rifa</h1>
          <p className="text-gray-500 text-sm mt-1">
            El ID on-chain debe coincidir con el que generó el contrato. La lógica del
            sorteo vive en la blockchain — acá solo guardás la metadata visible.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <CreateRaffleForm />
        </div>
      </div>
    </main>
  );
}
