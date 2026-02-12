import { formatMoney } from "../../utils/formatters";

interface SettlementCardProps {
  message: string;
  amount: number;
  currency: string;
  settling: boolean;
  onSettle: () => void;
}

export function SettlementCard({ message, amount, currency, settling, onSettle }: SettlementCardProps) {
  return (
    <section className="card settlement-card">
      <h2>Settlement</h2>
      <p className="settlement-message">{message}</p>
      <strong className="settlement-amount">{formatMoney(amount, currency)}</strong>
      <button type="button" onClick={onSettle} disabled={settling}>
        {settling ? "Settling..." : "Settle + notify both users"}
      </button>
    </section>
  );
}
