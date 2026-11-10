import TransactionManager from '../../components/transaction/TransactionManager';

// UC-35 Manage Transactions (Admin): UC-35.1 View Transactions, UC-35.2 View Transaction Details
export default function AdminTransactionsPage() {
  return (
    <TransactionManager
      homePath="/admin"
      homeLabel="Admin"
      subtitle="Search payment transactions (read-only)."
    />
  );
}
