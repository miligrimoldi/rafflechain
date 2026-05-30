// TODO(blockchain): Reemplazar por BuyTicketsForm cuando se integre el contrato.
// El form enviará:
//   await raffleChainContract.buyTickets(raffleIdOnChain, quantity, {
//     value: ticketPrice * BigInt(quantity),   // ETH a enviar
//   })
// Requiere MetaMask conectado y que la rifa esté ACTIVE y no haya terminado por tiempo.

export default function BuyTicketsPlaceholder({
  raffleIdOnChain,
}: {
  raffleIdOnChain: number;
}) {
  return (
    <div className="panel panel-placeholder">
      <span className="badge badge-pending mb-3">🔗 Pendiente · integración blockchain</span>
      <p className="form-section-title mb-2" style={{ color: "var(--gold)" }}>
        Comprar tickets
      </p>
      <p className="text-xs text-muted leading-relaxed">
        Llamará a{" "}
        <code className="font-mono text-xs px-1.5 py-0.5 rounded-md border border-[var(--border)] bg-black/30" style={{ color: "var(--cyan)" }}>
          buyTickets({raffleIdOnChain}, quantity)
        </code>{" "}
        en el contrato. Requiere firma de MetaMask y envío de ETH por{" "}
        <code className="font-mono text-xs px-1.5 py-0.5 rounded-md border border-[var(--border)] bg-black/30" style={{ color: "var(--cyan)" }}>
          ticketPrice × quantity
        </code>
        .
      </p>
    </div>
  );
}
