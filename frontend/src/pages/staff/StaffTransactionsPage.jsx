import TransactionManager from '../../components/transaction/TransactionManager';

// UC-23 Manage Transactions (Staff): UC-23.1 View, UC-23.2 Search, UC-23.3 View Details (chỉ đọc)
export default function StaffTransactionsPage() {
  return (
    <TransactionManager
      homePath="/staff"
      homeLabel="Nhân viên"
      subtitle="Xem và tìm kiếm giao dịch của cửa hàng để đối soát thanh toán (chỉ xem; thông tin nhạy cảm được che)."
    />
  );
}
