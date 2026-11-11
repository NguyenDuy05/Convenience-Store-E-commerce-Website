import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text as RNText, TextInput as RNTextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, TONES } from '../theme';
import { formatCurrency } from '../utils/format';
import { imageUri } from '../config';
import CartIcon from './CartIcon';

// Chữ dùng font của thiết kế: Inter cho nội dung, Plus Jakarta Sans cho tiêu đề / giá (đậm 800-900)
const familyFor = (w) => {
  const k = String(w || '400');
  if (k === '800' || k === '900') return fonts.display;
  if (k === '700' || k === 'bold') return fonts.bold;
  if (k === '600') return fonts.semi;
  if (k === '500') return fonts.medium;
  return fonts.regular;
};
export function Text({ style, ...p }) {
  const { fontWeight, ...rest } = StyleSheet.flatten(style) || {};
  return <RNText {...p} style={[rest, { fontFamily: rest.fontFamily || familyFor(fontWeight) }]} />;
}
export function TextInput({ style, ...p }) {
  const { fontWeight, ...rest } = StyleSheet.flatten(style) || {};
  return <RNTextInput {...p} style={[rest, { fontFamily: rest.fontFamily || familyFor(fontWeight) }]} />;
}

// name="cart": icon giỏ hàng riêng của app (SVG), còn lại dùng Ionicons
export const Icon = ({ name, size = 20, color = colors.text, style }) => (name === 'cart'
  ? <CartIcon size={size} color={color} style={style} />
  : <Ionicons name={name} size={size} color={color} style={style} />);

// Khung màn hình có cuộn + kéo để tải lại
export function Screen({ children, onRefresh, refreshing = false, scroll = true, padded = true, edges = ['bottom'], footer, style }) {
  const body = scroll
    ? <ScrollView contentContainerStyle={[padded && { padding: 16, gap: 14 }, { paddingBottom: 28 }, style]} keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>{children}</ScrollView>
    : <View style={[{ flex: 1 }, padded && { padding: 16 }, style]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {body}
      {footer}
    </SafeAreaView>
  );
}

export const Card = ({ children, style, onPress }) => (onPress
  ? <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }, style]}>{children}</Pressable>
  : <View style={[s.card, style]}>{children}</View>);

export const H = ({ children, style, ...p }) => <Text style={[s.h, style]} {...p}>{children}</Text>;

// Tiêu đề khu vực: chấm màu + tiêu đề + liên kết bên phải (theo thiết kế "Danh mục nổi bật", "Kho Voucher Độc Quyền"…)
export function SectionTitle({ title, icon, action, onAction, dot = true }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {icon ? <Icon name={icon} size={20} color={colors.primary} /> : dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
        <Text style={s.section} numberOfLines={1}>{title}</Text>
      </View>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{action}</Text></Pressable> : null}
    </View>
  );
}
export const T = ({ children, style, ...p }) => <Text style={[s.t, style]} {...p}>{children}</Text>;
export const Muted = ({ children, style, ...p }) => <Text style={[s.t, { color: colors.textVariant, fontSize: 13 }, style]} {...p}>{children}</Text>;

export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, style, small }) {
  const dis = disabled || loading;
  const bg = { primary: colors.primary, danger: colors.error, soft: colors.surfaceContainer, accent: colors.secondaryContainer, white: '#fff' }[variant] || 'transparent';
  const fg = { primary: '#fff', danger: '#fff', soft: colors.primary, accent: colors.onSecondaryContainer, white: colors.primary }[variant] || colors.primary;
  return (
    <Pressable onPress={dis ? undefined : onPress} style={({ pressed }) => [s.btn, small && { paddingVertical: 8, paddingHorizontal: 14 }, { backgroundColor: bg },
      variant === 'primary' && s.btnShadow, variant === 'ghost' && { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }, dis && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon && <Icon name={icon} size={18} color={fg} />}<Text style={[s.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text></>}
    </Pressable>
  );
}

export function Field({ label, error, style, ...p }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.outline} {...p} onFocus={(e) => { setFocus(true); p.onFocus?.(e); }} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
        style={[s.input, focus && { borderColor: colors.primary, backgroundColor: '#fff' }, !!error && { borderColor: colors.error }, p.multiline && { minHeight: 90, textAlignVertical: 'top' }, style]} />
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', icon }) {
  const [bg, fg] = TONES[tone] || TONES.neutral;
  return <View style={[s.badge, { backgroundColor: bg }]}>{icon && <Icon name={icon} size={13} color={fg} />}<Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text></View>;
}

export function Banner({ tone = 'info', icon = 'information-circle-outline', title, text, children }) {
  const [bg, fg] = TONES[tone] || TONES.info;
  return (
    <View style={[s.banner, { backgroundColor: bg }]}>
      <Icon name={icon} size={22} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>{title ? <Text style={{ color: fg, fontWeight: '700' }}>{title}</Text> : null}{text ? <Text style={{ color: fg, fontSize: 13 }}>{text}</Text> : null}{children}</View>
    </View>
  );
}

export const Loading = ({ text }) => (
  <View style={s.center}><ActivityIndicator size="large" color={colors.primary} />{text ? <Muted style={{ marginTop: 10 }}>{text}</Muted> : null}</View>
);

export function Empty({ icon = 'file-tray-outline', title, text, action }) {
  return (
    <View style={s.center}>
      <View style={s.emptyIcon}><Icon name={icon} size={34} color={colors.primary} /></View>
      <Text style={[s.h, { textAlign: 'center' }]}>{title}</Text>
      {text ? <Muted style={{ textAlign: 'center', marginTop: 4 }}>{text}</Muted> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export const ErrorView = ({ message, onRetry }) => (
  <Empty icon="cloud-offline-outline" title="Chưa tải được dữ liệu" text={message} action={onRetry ? <Button title="Thử lại" icon="refresh" onPress={onRetry} /> : null} />
);

export function Stars({ value = 0, size = 16, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name = value >= n ? 'star' : value >= n - 0.5 ? 'star-half' : 'star-outline';
        const el = <Ionicons name={name} size={size} color={colors.star} />;
        return onChange ? <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>{el}</Pressable> : <View key={n}>{el}</View>;
      })}
    </View>
  );
}

export function Stepper({ value, max = 99, onChange, disabled }) {
  const b = (name, on, off, filled) => (
    <Pressable disabled={disabled || off} onPress={on} hitSlop={4} style={[s.stepBtn, filled && { backgroundColor: colors.primary }, (disabled || off) && { opacity: 0.4 }]}>
      <Icon name={name} size={16} color={filled ? '#fff' : colors.text} />
    </Pressable>
  );
  return (
    <View style={s.stepper}>
      {b('remove', () => onChange(value - 1), value <= 1)}
      <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700', color: colors.text }}>{value}</Text>
      {b('add', () => onChange(value + 1), value >= max, true)}
    </View>
  );
}

export const Thumb = ({ uri, size = 56, radiusSize = radius.md }) => (
  <View style={{ width: size, height: size, borderRadius: radiusSize, backgroundColor: colors.surfaceLow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {uri ? <Image source={{ uri: imageUri(uri) }} style={{ width: size, height: size }} resizeMode="contain" /> : <Icon name="basket-outline" size={size * 0.45} color={colors.primary} />}
  </View>
);

// onAdd: nút "+" thêm nhanh vào giỏ; favorite/onFavorite: trái tim yêu thích
export function ProductCard({ product, onPress, price, onAdd, adding, favorite, onFavorite }) {
  const inStock = Number(product.stockQuantity) > 0;
  const final = price != null && price < product.price;
  const pct = final ? Math.round((1 - price / product.price) * 100) : 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pCard, pressed && { opacity: 0.85 }]}>
      <View style={s.pMedia}>
        {product.images?.[0] ? <Image source={{ uri: imageUri(product.images[0]) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Icon name="basket-outline" size={40} color={colors.primary} />}
        {!inStock && <View style={[s.pOut, { backgroundColor: colors.inverseSurface }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Hết hàng</Text></View>}
        {inStock && pct > 0 && <View style={s.pOut}><Text style={{ color: colors.onTertiaryFixed, fontSize: 11, fontWeight: '800' }}>-{pct}%</Text></View>}
        {onFavorite && (
          <Pressable onPress={onFavorite} hitSlop={8} style={s.pFav} accessibilityLabel={favorite ? 'Bỏ yêu thích' : 'Yêu thích'}>
            <Icon name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.error : colors.textVariant} />
          </Pressable>
        )}
      </View>
      <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, gap: 3 }}>
        <Text style={{ color: colors.outline, fontSize: 11 }} numberOfLines={1}>{product.categoryId?.name || 'Sản phẩm'}{product.unit ? ` · ${product.unit}` : ''}</Text>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, minHeight: 36 }} numberOfLines={2}>{product.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 15 }}>{formatCurrency(final ? price : product.price)}</Text>
            {final && <Text style={{ color: colors.outline, fontSize: 11, textDecorationLine: 'line-through' }}>{formatCurrency(product.price)}</Text>}
          </View>
          {onAdd && inStock && (
            <Pressable onPress={onAdd} disabled={adding} hitSlop={6} style={[s.pAdd, adding && { opacity: 0.5 }]} accessibilityLabel={`Thêm ${product.name} vào giỏ`}>
              {adding ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="add" size={20} color={colors.primary} />}
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// Thông báo nổi ngắn ở đáy màn hình
export const Toast = ({ toast }) => (toast ? (
  <View pointerEvents="none" style={[s.toast, { backgroundColor: toast.ok ? colors.text : colors.error }]}>
    <Icon name={toast.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color="#fff" />
    <Text style={{ color: '#fff', fontWeight: '600', flex: 1 }} numberOfLines={2}>{toast.text}</Text>
  </View>
) : null);

// Bảng dạng "khung xương" khi đang tải
export function SkeletonGrid({ count = 6 }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '47.5%', borderRadius: radius.lg, backgroundColor: '#fff', overflow: 'hidden' }}>
          <View style={{ height: 110, backgroundColor: colors.surfaceContainer }} />
          <View style={{ padding: 10, gap: 6 }}>
            <View style={{ height: 10, width: '50%', borderRadius: 4, backgroundColor: colors.surfaceContainer }} />
            <View style={{ height: 14, width: '90%', borderRadius: 4, backgroundColor: colors.surfaceContainer }} />
            <View style={{ height: 14, width: '40%', borderRadius: 4, backgroundColor: colors.surfaceContainer }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export const Row = ({ label, value, bold, valueStyle }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
    <Text style={{ color: colors.textVariant, fontSize: 14 }}>{label}</Text>
    <Text style={[{ color: colors.text, fontSize: 14, flexShrink: 1, textAlign: 'right' }, bold && { fontWeight: '800', fontSize: 16 }, valueStyle]}>{value}</Text>
  </View>
);

export const Chip = ({ label, active, onPress, count }) => (
  <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary, ...s.btnShadow }]}>
    <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}{count != null ? ` (${count})` : ''}</Text>
  </Pressable>
);

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.border }} />;

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadow },
  h: { fontSize: 17, fontWeight: '800', color: colors.text },
  section: { fontSize: 19, fontWeight: '800', color: colors.text },
  t: { fontSize: 14, color: colors.text },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: radius.pill },
  btnShadow: { shadowColor: '#0058bc', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnText: { fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textVariant },
  input: { borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceLow },
  err: { color: colors.error, fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  banner: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, minHeight: 260 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainer },
  pCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow },
  pMedia: { height: 132, margin: 8, marginBottom: 0, borderRadius: radius.md, backgroundColor: colors.surfaceLow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pOut: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.tertiaryFixed, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pFav: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' },
  pAdd: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 14, borderRadius: radius.md, ...shadow },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
});
