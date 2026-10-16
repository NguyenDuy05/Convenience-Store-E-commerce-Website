import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="container">
      <h2>Không tìm thấy trang</h2>
      <Link to="/">Về trang chủ</Link>
    </main>
  );
}
