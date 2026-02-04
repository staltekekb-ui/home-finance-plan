import type { Transaction } from '../types';
import TransactionCard from './TransactionCard';

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onEdit: (transaction: Transaction) => void;
  onRepeat?: (transaction: Transaction) => void;
}

export default function TransactionList({ transactions, onDelete, onEdit, onRepeat }: Props) {
  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onDelete={() => onDelete(transaction.id)}
          onEdit={() => onEdit(transaction)}
          onRepeat={onRepeat ? () => onRepeat(transaction) : undefined}
        />
      ))}
    </div>
  );
}
