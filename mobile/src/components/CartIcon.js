import Svg, { Path, Circle } from 'react-native-svg';

// Icon giỏ hàng dùng chung toàn app (cùng nét vẽ với web: frontend/src/components/common/CartIcon.jsx).
const LINES = 'M1.5 1.6H3.4q.7 0 .85.7L7.9 16.3q.25.95 1.2.95H21.6M7.7 6.4H22.2M22.2 3.4q.65.35.5 1.25L20.9 13.9q-.2.9-1.15.9H8.6';
const WHEELS = [[10.1, 20.6], [19.4, 20.6]];

export default function CartIcon({ size = 20, color = '#000', strokeWidth = 1.8, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <Path d={LINES} />
      {WHEELS.map(([cx, cy]) => <Circle key={cx} cx={cx} cy={cy} r={1.45} />)}
    </Svg>
  );
}
