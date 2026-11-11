import { Outlet } from 'react-router-dom';
import StorefrontShell from '../components/layout/StorefrontShell';
// Layout các trang công khai (dùng khung cửa hàng)
export default function PublicLayout() {
  return <StorefrontShell><Outlet /></StorefrontShell>;
}
