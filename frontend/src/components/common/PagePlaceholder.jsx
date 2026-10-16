// Khung tạm cho trang chưa làm. Thay bằng giao diện thật khi triển khai.
export default function PagePlaceholder({ title, ucs = [] }) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="muted">Trang đang được xây dựng.</p>
      {ucs.length > 0 && (
        <>
          <p>Use case cần làm:</p>
          <ul>
            {ucs.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}
