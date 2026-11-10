// Khung tạm cho trang chưa làm. Thay bằng giao diện thật khi triển khai.
export default function PagePlaceholder({ title, ucs = [] }) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="muted">This page is under construction.</p>
      {ucs.length > 0 && (
        <>
          <p>Pending features:</p>
          <ul>
            {ucs.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}
