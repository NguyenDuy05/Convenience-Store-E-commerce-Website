import InventoryManager from '../../components/inventory/InventoryManager';

// UC-19.1–19.7: View / Check Stock, Receive, Adjust, Stocktake, Low Stock, Expired, Damaged
export default function StaffInventoryPage() {
  return <InventoryManager role="staff" />;
}
