// TODO(blockchain): Reemplazar por OrganizerActions cuando se integre el contrato.
// Cada acción debe verificar primero que el usuario conectado sea el organizador o el ganador
// antes de habilitarla. Leer msg.sender === getRaffle(id).organizer o .winner.

const ACTIONS = [
  {
    label: "Sortear ganador (testing local)",
    fn: "drawWinnerForTesting(raffleId, fakeRandom)",
    note: "Solo mientras no haya Chainlink VRF. Requiere que la rifa haya terminado.",
    temporary: true,
  },
  {
    label: "Solicitar ganador (producción)",
    fn: "requestWinner(raffleId)",
    note: "Reemplaza a drawWinnerForTesting. Llama al coordinador Chainlink VRF.",
    temporary: false,
  },
  {
    label: "Retirar fondos",
    fn: "withdrawFunds(raffleId)",
    note: "Solo el organizador. Disponible después de que se seleccione el ganador.",
    temporary: false,
  },
  {
    label: "Reclamar premio",
    fn: "claimPrize(raffleId)",
    note: "Solo la wallet ganadora. Registra on-chain que el premio fue reclamado.",
    temporary: false,
  },
] as const;

export default function OrganizerActionsPlaceholder({
  raffleIdOnChain,
}: {
  raffleIdOnChain: number;
}) {
  return (
    <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-5 mt-4">
      <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-3">
        🔗 Pendiente · integración blockchain
      </span>
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
        Acciones del organizador / ganador
      </p>
      <ul className="space-y-2">
        {ACTIONS.map(({ label, fn, note, temporary }) => (
          <li
            key={fn}
            className="bg-white rounded-lg p-3 border border-amber-200"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs font-medium text-gray-700">{label}</p>
              {temporary && (
                <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-medium">
                  temporal
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-indigo-600">
              {fn.replace("raffleId", String(raffleIdOnChain))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
