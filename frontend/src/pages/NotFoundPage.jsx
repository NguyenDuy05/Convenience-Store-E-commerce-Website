import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="container">
      <h2>Page not found</h2>
      <Link to="/">Back to home</Link>
    </main>
  );
}
