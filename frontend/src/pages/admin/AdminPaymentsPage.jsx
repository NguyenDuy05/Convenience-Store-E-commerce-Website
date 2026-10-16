import PagePlaceholder from '../../components/common/PagePlaceholder';

export default function AdminPaymentsPage() {
  return (
    <PagePlaceholder
      title="Thanh toán"
      ucs={["UC-41.1 View Payment Transactions","UC-41.2 View Failed Payments","UC-41.3 View Pending Payments","UC-41.4 Handle Payment Error"]}
    />
  );
}
