import MyTicketsList from "@/components/MyTicketsList";

export const metadata = { title: "Mis tickets · RaffleChain" };

export default function MyTicketsPage() {
    return (
        <main className="page-main">
            <div className="page-container-narrow">
                <div className="page-header">
                    <p className="page-eyebrow">Tu participación</p>
                    <h1>Mis tickets</h1>
                    <p>Todos los tickets que compraste y su resultado on-chain.</p>
                </div>

                <MyTicketsList />
            </div>
        </main>
    );
}