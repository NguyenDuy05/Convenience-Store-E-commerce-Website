import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Màn hình chờ khi mở app (thiết kế "Quick Picks, Happy Days"). Dùng font hệ thống vì lúc này font tùy chỉnh chưa tải xong.
export default function SplashView({ progressText = 'Đang chuẩn bị cửa hàng…' }) {
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(bar, { toValue: 1, duration: 1400, useNativeDriver: false }).start(); }, [bar]);
  const width = bar.interpolate({ inputRange: [0, 1], outputRange: ['8%', '92%'] });
  return (
    <View style={s.wrap}>
      <View style={s.pill}><View style={s.dot} /><Text style={s.pillText}>NHẬN TẠI CỬA HÀNG</Text></View>
      <View style={s.ring}><Image source={require('../../assets/mascot.png')} style={s.mascot} /></View>
      <View style={s.fresh}><Ionicons name="flash" size={14} color={colors.onSecondaryContainer} /><Text style={s.freshText}>LUÔN TƯƠI MỚI</Text></View>
      <Text style={s.brand}>Quick<Text style={{ color: colors.secondaryDim }}>.</Text></Text>
      <Text style={s.slogan}>“Quick Picks, Happy Days.”</Text>
      <Text style={s.sub}>Đặt online • Nhận tại quầy • Tích điểm mỗi đơn</Text>
      <View style={s.track}><Animated.View style={[s.fill, { width }]} /></View>
      <Text style={s.progress}>{progressText}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginBottom: 36 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  pillText: { color: colors.secondary, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  ring: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#fff', padding: 10, shadowColor: '#3882f6', shadowOpacity: 0.15, shadowRadius: 24, elevation: 6 },
  mascot: { width: 200, height: 200, borderRadius: 100 },
  fresh: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -16, backgroundColor: colors.secondaryContainer, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  freshText: { color: colors.onSecondaryContainer, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  brand: { marginTop: 18, fontSize: 44, fontWeight: '900', color: colors.primary },
  slogan: { fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { marginTop: 6, color: colors.textVariant, fontSize: 13 },
  track: { marginTop: 40, width: '80%', height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primaryContainer },
  progress: { marginTop: 8, color: colors.textVariant, fontSize: 12, fontWeight: '600' },
});
