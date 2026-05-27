import MyRafflesList from "@/components/MyRafflesList";
import Link from "next/link";

export const metadata = { title: "Mis rifas · RaffleChain" };

export default function MyRafflesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mis rifas</h1>
          <Link
            href="/create"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            + Nueva rifa
          </Link>
        </div>
        <MyRafflesList />
      </div>
    </main>
  );
}
