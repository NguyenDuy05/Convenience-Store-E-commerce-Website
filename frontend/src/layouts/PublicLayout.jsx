import { Outlet } from 'react-router-dom';
import StorefrontShell from '../components/layout/StorefrontShell';
export default function PublicLayout() {
  return <StorefrontShell><Outlet /></StorefrontShell>;
}
