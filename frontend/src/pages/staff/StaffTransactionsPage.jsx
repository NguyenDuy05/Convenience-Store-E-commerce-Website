import TransactionManager from '../../components/transaction/TransactionManager';

// UC-23 Manage Transactions (Staff): UC-23.1 View, UC-23.2 Search, UC-23.3 View Details (chỉ đọc)
export default function StaffTransactionsPage() {
  return (
    <TransactionManager
      homePath="/staff"
      homeLabel="Staff"
      subtitle="Search store transactions for payment reconciliation (read-only; sensitive information is masked)."
    />
  );
}
