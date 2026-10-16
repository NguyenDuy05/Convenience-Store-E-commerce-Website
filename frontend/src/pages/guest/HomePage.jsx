import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <section>
      <h1>Convenience Store</h1>
      <p>Đặt hàng online, ra cửa hàng lấy. Không cần xếp hàng.</p>
      <Link to="/products" className="btn">Xem sản phẩm</Link>
    </section>
  );
}
