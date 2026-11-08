import { useLocation } from 'react-router-dom';

// Trang sản phẩm dùng chung cho Admin (/admin/products) và Staff (/staff/products).
// Staff được xem / thêm / sửa / xóa; đổi giá và bật/tắt bán chỉ dành cho Admin.
export default function useProductBase() {
  const { pathname } = useLocation();
  const isStaff = pathname.startsWith('/staff');
  return { isStaff, base: isStaff ? '/staff/products' : '/admin/products' };
}
