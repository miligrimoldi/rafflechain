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
    <div className="panel panel-placeholder">
      <span className="badge badge-pending mb-3">🔗 Pendiente · integración blockchain</span>
      <p className="form-section-title mb-3" style={{ color: "var(--gold)" }}>
        Acciones del organizador / ganador
      </p>
      <ul className="space-y-2">
        {ACTIONS.map(({ label, fn, note, temporary }) => (
          <li
            key={fn}
            className="rounded-xl p-3 border border-[var(--border)] bg-black/20 transition-all hover:border-[rgb(34,211,238,0.3)]"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs font-semibold text-[var(--text)]">{label}</p>
              {temporary && (
                <span className="badge badge-drawing">temporal</span>
              )}
            </div>
            <p className="text-xs font-mono" style={{ color: "var(--cyan)" }}>
              {fn.replace("raffleId", String(raffleIdOnChain))}
            </p>
            <p className="text-xs text-dim mt-0.5">{note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
