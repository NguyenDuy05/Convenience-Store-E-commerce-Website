import { Outlet } from 'react-router-dom';
import StorefrontShell from '../components/layout/StorefrontShell';
// Layout các trang của khách (dùng khung cửa hàng)
export default function CustomerLayout() {
  return <StorefrontShell><Outlet /></StorefrontShell>;
}
