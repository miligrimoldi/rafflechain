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
    <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-5 mt-4">
      <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-3">
        🔗 Pendiente · integración blockchain
      </span>
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
        Comprar tickets
      </p>
      <p className="text-xs text-gray-600 leading-relaxed">
        Llamará a{" "}
        <code className="font-mono text-indigo-600 bg-white px-1 py-0.5 rounded border border-indigo-100">
          buyTickets({raffleIdOnChain}, quantity)
        </code>{" "}
        en el contrato. Requiere firma de MetaMask y envío de ETH por{" "}
        <code className="font-mono text-indigo-600 bg-white px-1 py-0.5 rounded border border-indigo-100">
          ticketPrice × quantity
        </code>
        .
      </p>
    </div>
  );
}
