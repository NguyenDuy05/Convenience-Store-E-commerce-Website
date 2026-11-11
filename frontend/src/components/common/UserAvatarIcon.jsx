// Avatar mặc định: vòng tròn viền + hình người đặc (đầu tròn, thân bán nguyệt), màu theo currentColor.
export default function UserAvatarIcon({ size = 32, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="24" cy="18" r="6.6" fill="currentColor" />
      <path d="M11.4 36.2C13.2 30.4 18.1 27 24 27s10.8 3.4 12.6 9.2Q31.4 40.6 24 40.6T11.4 36.2Z" fill="currentColor" />
    </svg>
  );
}
