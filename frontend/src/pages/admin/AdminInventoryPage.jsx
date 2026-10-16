import PagePlaceholder from '../../components/common/PagePlaceholder';

export default function AdminInventoryPage() {
  return (
    <PagePlaceholder
      title="Kho hàng"
      ucs={["UC-34.1 View Inventory","UC-34.2 Adjust Inventory","UC-34.3 Stocktake","UC-34.4 View Low Stock Products","UC-34.5 View Out of Stock Products","UC-34.6 View Inventory History"]}
    />
  );
}
