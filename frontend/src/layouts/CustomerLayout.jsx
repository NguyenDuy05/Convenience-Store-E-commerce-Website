import { Outlet } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { customerNav } from '../routes/navConfig';

export default function CustomerLayout() {
  return (
    <>
      <NavBar links={[{ to: '/products', label: 'Sản phẩm' }, ...customerNav]} />
      <main className="container"><Outlet /></main>
    </>
  );
}
