import TransactionManager from '../../components/transaction/TransactionManager';

// UC-35 Admin xem giao dịch
export default function AdminTransactionsPage() {
  return (
    <TransactionManager
      homePath="/admin"
      homeLabel="Admin"
      subtitle="Search payment transactions (read-only)."
    />
  );
}
