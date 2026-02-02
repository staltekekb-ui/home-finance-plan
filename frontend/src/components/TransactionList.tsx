import type { Transaction } from '../types';
import TransactionCard from './TransactionCard';

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
}

export default function TransactionList({ transactions, onDelete }: Props) {
  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onDelete={() => onDelete(transaction.id)}
        />
      ))}
    </div>
  );
}
