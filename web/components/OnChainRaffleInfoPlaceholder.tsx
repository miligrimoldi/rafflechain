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
    <div className="panel-accent panel-placeholder">
      <span className="badge badge-pending mb-3">🔗 Pendiente · integración blockchain</span>
      <p className="form-section-title mb-3" style={{ color: "var(--gold)" }}>
        Datos on-chain · rifa #{raffleIdOnChain}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ label, fn }) => (
          <div
            key={label}
            className="rounded-xl p-3 border border-[var(--border)] bg-black/20"
          >
            <p className="text-xs text-dim mb-0.5">{label}</p>
            <p className="text-xs font-mono" style={{ color: "var(--cyan)" }}>→ {fn}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
