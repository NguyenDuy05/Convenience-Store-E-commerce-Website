import { useLocation } from 'react-router-dom';

// Logic trang sản phẩm dùng chung admin / staff (staff không đổi giá, không bật / tắt bán)
export default function useProductBase() {
  const { pathname } = useLocation();
  const isStaff = pathname.startsWith('/staff');
  return { isStaff, base: isStaff ? '/staff/products' : '/admin/products' };
}
