import { formatMoney } from "../../utils/formatters";

interface SettlementCardProps {
  message: string;
  amount: number;
  currency: string;
}

export function SettlementCard({ message, amount, currency }: SettlementCardProps) {
  return (
    <section className="card settlement-card">
      <h2>Settlement</h2>
      <p className="settlement-message">{message}</p>
      <strong className="settlement-amount">{formatMoney(amount, currency)}</strong>
    </section>
  );
}
