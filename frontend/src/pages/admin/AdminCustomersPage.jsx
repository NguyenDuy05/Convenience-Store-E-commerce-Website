import PagePlaceholder from '../../components/common/PagePlaceholder';

export default function AdminCustomersPage() {
  return (
    <PagePlaceholder
      title="Khách hàng"
      ucs={["UC-29.1 View Customers","UC-29.2 Search Customers","UC-29.3 View Customer Details","UC-29.4 Update Customer","UC-29.5 Unlock Customer Account","UC-29.6 Delete Customer Account"]}
    />
  );
}
