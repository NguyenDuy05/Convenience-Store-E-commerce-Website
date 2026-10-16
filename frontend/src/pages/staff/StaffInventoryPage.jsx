import PagePlaceholder from '../../components/common/PagePlaceholder';

export default function StaffInventoryPage() {
  return (
    <PagePlaceholder
      title="Kho hàng"
      ucs={["UC-19.1 View Inventory","UC-19.2 Receive Stock","UC-19.3 Adjust Inventory","UC-19.4 Stocktake","UC-19.5 View Low Stock Products","UC-19.6 View Expired Products","UC-19.7 Manage Damaged Products"]}
    />
  );
}
