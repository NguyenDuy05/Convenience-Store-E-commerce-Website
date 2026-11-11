import TransactionManager from '../../components/transaction/TransactionManager';

// UC-23 Staff xem giao dịch (tiền thu hôm nay)
export default function StaffTransactionsPage() {
  return (
    <TransactionManager
      homePath="/staff"
      homeLabel="Staff"
      subtitle="Search store transactions for payment reconciliation (read-only; sensitive information is masked)."
    />
  );
}
