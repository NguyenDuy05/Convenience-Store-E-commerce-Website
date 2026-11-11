export const CART_PATHS = {
  lines: 'M1.5 1.6H3.4q.7 0 .85.7L7.9 16.3q.25.95 1.2.95H21.6M7.7 6.4H22.2M22.2 3.4q.65.35.5 1.25L20.9 13.9q-.2.9-1.15.9H8.6',
  wheels: [[10.1, 20.6], [19.4, 20.6]],
};

// Icon giỏ hàng (SVG)
export default function CartIcon({ size = 20, strokeWidth = 1.7, className = '', title }) {
  return (
    <svg
      className={`cart-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
      {title && <title>{title}</title>}
      <path d={CART_PATHS.lines} />
      {CART_PATHS.wheels.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1.45" />)}
    </svg>
  );
}
