import { memo, useCallback } from 'react';
import type { Transaction } from '../types';
import TransactionCard from './TransactionCard';

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onEdit: (transaction: Transaction) => void;
  onRepeat?: (transaction: Transaction) => void;
}

function TransactionList({ transactions, onDelete, onEdit, onRepeat }: Props) {
  const handleDelete = useCallback((id: number) => () => onDelete(id), [onDelete]);
  const handleEdit = useCallback((transaction: Transaction) => () => onEdit(transaction), [onEdit]);
  const handleRepeat = useCallback(
    (transaction: Transaction) => (onRepeat ? () => onRepeat(transaction) : undefined),
    [onRepeat]
  );

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onDelete={handleDelete(transaction.id)}
          onEdit={handleEdit(transaction)}
          onRepeat={handleRepeat(transaction)}
        />
      ))}
    </div>
  );
}

export default memo(TransactionList);
