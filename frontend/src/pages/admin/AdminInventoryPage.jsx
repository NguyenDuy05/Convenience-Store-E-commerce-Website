import InventoryManager from '../../components/inventory/InventoryManager';

// UC-34.1–34.6: View, Adjust, Stocktake, Low Stock, Out of Stock, History
export default function AdminInventoryPage() {
  return <InventoryManager role="admin" />;
}
