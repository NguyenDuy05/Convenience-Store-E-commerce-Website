import TransactionManager from '../../components/transaction/TransactionManager';

// UC-35 Manage Transactions (Admin): UC-35.1 View Transactions, UC-35.2 View Transaction Details
export default function AdminTransactionsPage() {
  return (
    <TransactionManager
      homePath="/admin"
      homeLabel="Quản trị"
      subtitle="Tra cứu các giao dịch thanh toán (chỉ xem, không thể chỉnh sửa)."
    />
  );
}
