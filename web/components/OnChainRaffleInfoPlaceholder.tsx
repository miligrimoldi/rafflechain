// TODO(blockchain): Reemplazar este componente por OnChainRaffleInfo cuando se integre
// el contrato. Leerá los datos con:
//   const raffle = await raffleChainContract.getRaffle(raffleIdOnChain)
//   const ticketsSold = await raffleChainContract.getTicketsSold(raffleIdOnChain)

const FIELDS = [
  { label: "Precio del ticket", fn: "getRaffle(id).ticketPrice" },
  { label: "Tickets vendidos",  fn: "getTicketsSold(id)" },
  { label: "Máximo de tickets", fn: "getRaffle(id).maxTickets" },
  { label: "Estado",            fn: "getRaffle(id).status" },
  { label: "Fondos recaudados", fn: "getRaffle(id).amountCollected" },
  { label: "Ganador",           fn: "getRaffle(id).winner" },
] as const;

export default function OnChainRaffleInfoPlaceholder({
  raffleIdOnChain,
}: {
  raffleIdOnChain: number;
}) {
  return (
    <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-5 mt-6">
      <PendingBadge />
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
        Datos on-chain · rifa #{raffleIdOnChain}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ label, fn }) => (
          <div
            key={label}
            className="bg-white rounded-lg p-3 border border-amber-200"
          >
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-xs font-mono text-amber-600">→ {fn}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingBadge() {
  return (
    <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-3">
      🔗 Pendiente · integración blockchain
    </span>
  );
}
