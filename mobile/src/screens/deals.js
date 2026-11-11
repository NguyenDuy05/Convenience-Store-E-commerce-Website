import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import { useLoad } from '../components/hooks';
import { useQuickAdd } from '../components/cartActions';
import { Banner, Button, Chip, ErrorView, Icon, Loading, Muted, SectionTitle, Text, TextInput, Toast } from '../components/ui';
import { BrandRow } from '../components/Brand';
import { colors, radius, shadow } from '../theme';
import { errMsg, formatCurrency, formatDate, formatNumber } from '../utils/format';
import { estimatePromo } from '../utils/promoPrice';
import { imageUri } from '../config';
import { voucherValue } from './shop';

const CIRCLE_TONES = [[colors.surfaceContainer, colors.primary], [colors.okBg, colors.secondary], [colors.tertiaryFixed, colors.tertiary], [colors.errBg, colors.error]];
const short = (c) => (c.type === 'percent' ? `${c.value}%` : c.value >= 1000 ? `${Math.round(c.value / 1000)}K` : formatCurrency(c.value));

// Ưu đãi: nhập mã, Quick Club, deal đang giảm giá, kho voucher, chương trình khuyến mãi (thiết kế "Quick Khuyến Mãi & Ưu Đãi")
export function DealsScreen({ navigation, route }) {
  const inTab = route.name === 'Deals';
  const { user } = useAuth();
  const quick = useQuickAdd();
  const [filter, setFilter] = useState('all');
  const [code, setCode] = useState('');
  const [check, setCheck] = useState(null);
  const d = useLoad(async () => {
    const [promos, prods, vouchers, mem] = await Promise.all([
      A.promotions.list().then((r) => r.data.items || []).catch(() => []),
      A.products.list({ limit: 100 }).then((r) => r.data.items || []).catch(() => []),
      user ? A.discountCodes.available().then((r) => r.data.items || []).catch(() => []) : [],
      user ? A.membership.me().then((r) => r.data).catch(() => null) : null,
    ]);
    return { promos, prods, vouchers, mem };
  }, [user?.id], { reloadOnFocus: true });

  const deals = useMemo(() => {
    if (!d.data) return [];
    return d.data.prods.filter((p) => p.stockQuantity > 0).map((p) => ({ p, ...estimatePromo(p, d.data.promos) }))
      .filter((x) => x.price < x.p.price).sort((a, b) => (b.p.price - b.price) / b.p.price - (a.p.price - a.price) / a.p.price).slice(0, 6);
  }, [d.data]);

  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const { promos, vouchers, mem } = d.data;
  const hero = promos[0];

  const applyCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (!user) { navigation.navigate('Login'); return; }
    setCheck({ loading: true });
    try {
      const r = await A.discountCodes.validate({ code: c });
      setCheck({ ok: true, text: `Mã ${r.data.code} hợp lệ: ${voucherValue(r.data)}${r.data.minOrderAmount ? `, đơn từ ${formatCurrency(r.data.minOrderAmount)}` : ''}. Nhập mã ở bước đặt hàng để dùng.` });
    } catch (e) { setCheck({ ok: false, text: errMsg(e, 'Mã không hợp lệ.') }); }
  };

  const body = (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      {inTab ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandRow subtitle="KHUYẾN MÃI & ƯU ĐÃI" size={40} />
          <Pressable onPress={() => navigation.navigate(user ? 'MemberCard' : 'Login')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="qr-code-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingLeft: 14, padding: 4 }}>
        <Icon name="ticket-outline" size={20} color={colors.primary} />
        <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Nhập mã khuyến mãi" placeholderTextColor={colors.outline} style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 8 }} onSubmitEditing={applyCode} />
        <Button title="Kiểm tra" small onPress={applyCode} loading={check?.loading} />
      </View>
      {check && !check.loading ? <Banner tone={check.ok ? 'success' : 'error'} icon={check.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={check.text} /> : null}

      {mem ? (
        <Pressable onPress={() => navigation.navigate('Membership')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tertiaryFixed, alignItems: 'center', justifyContent: 'center' }}><Icon name="star" size={22} color={colors.tertiary} /></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>Quick Club</Text>
              {mem.tier ? <View style={{ backgroundColor: colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.onSecondaryContainer }}>{mem.tier.name}</Text></View> : null}
            </View>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{formatNumber(mem.points)} điểm <Text style={{ color: colors.textVariant, fontWeight: '400', fontSize: 12 }}>(~{formatCurrency(mem.points * 100)} khả dụng)</Text></Text>
          </View>
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Dùng điểm</Text><Icon name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </Pressable>
      ) : !user ? (
        <Banner tone="info" icon="person-circle-outline" title="Đăng nhập để xem voucher và điểm thưởng" text="Thành viên tích 1 điểm cho mỗi 10.000₫ và dùng điểm trừ thẳng vào đơn.">
          <Pressable onPress={() => navigation.navigate('Login')}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>Đăng nhập ›</Text></Pressable>
        </Banner>
      ) : null}

      <View style={{ backgroundColor: colors.primaryContainer, borderRadius: radius.lg, padding: 18, overflow: 'hidden', ...shadow }}>
        <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,.12)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tertiaryFixed, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
              <Icon name="flash" size={12} color={colors.onTertiaryFixed} /><Text style={{ fontSize: 11, fontWeight: '800', color: colors.onTertiaryFixed }}>{hero ? 'ĐANG DIỄN RA' : 'ƯU ĐÃI THÀNH VIÊN'}</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '900' }}>{hero ? (hero.type === 'percent' ? `GIẢM ${hero.value}%` : `GIẢM ${formatCurrency(hero.value)}`) : 'TÍCH ĐIỂM'}</Text>
            <Text style={{ color: '#eaf1ff', fontSize: 13 }} numberOfLines={3}>{hero ? `${hero.name}. Áp dụng tự động khi đặt hàng, đến ${formatDate(hero.endDate)}.` : 'Mỗi 10.000₫ = 1 điểm. Dùng điểm trừ thẳng vào đơn, tối đa 50% giá trị.'}</Text>
            <Pressable onPress={() => navigation.navigate('Products', {})} style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Săn deal ngay</Text><Icon name="arrow-forward" size={15} color={colors.primary} />
            </Pressable>
          </View>
          <Image source={require('../../assets/mascot.png')} style={{ width: 96, height: 96, borderRadius: 48 }} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[['all', 'Tất cả'], ['deals', '⚡ Đang giảm giá'], ['vouchers', '🎫 Mã giảm giá'], ['promos', '🎉 Chương trình']].map(([k, l]) => <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />)}
      </ScrollView>

      {(filter === 'all' || filter === 'deals') && (
        <View style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border, ...shadow }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.errBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="flame" size={20} color={colors.error} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', fontSize: 17, color: colors.text }}>Đang giảm giá</Text><Muted>Giá đã trừ khuyến mãi tự động</Muted></View>
          </View>
          {deals.length === 0 ? <Muted>Hiện chưa có sản phẩm đang giảm giá.</Muted> : deals.map(({ p, price }) => {
            const pct = Math.round((1 - price / p.price) * 100);
            return (
              <Pressable key={p._id} onPress={() => navigation.navigate('ProductDetail', { id: p._id })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 10 }}>
                <View style={{ width: 76, height: 76, borderRadius: radius.md, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  {p.images?.[0] ? <Image source={{ uri: imageUri(p.images[0]) }} style={{ width: 76, height: 76 }} resizeMode="contain" /> : <Icon name="basket-outline" size={30} color={colors.primary} />}
                  <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: colors.tertiaryFixed, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill }}><Text style={{ fontSize: 10, fontWeight: '800', color: colors.onTertiaryFixed }}>-{pct}%</Text></View>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{p.name}</Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 17 }}>{formatCurrency(price)} <Text style={{ color: colors.outline, fontSize: 12, fontWeight: '400', textDecorationLine: 'line-through' }}>{formatCurrency(p.price)}</Text></Text>
                  <Muted style={{ fontSize: 12 }}>Còn {p.stockQuantity} {p.unit}</Muted>
                </View>
                <Button title="Lấy deal" small loading={quick.busyId === p._id} onPress={() => quick.add(p)} />
              </Pressable>
            );
          })}
        </View>
      )}

      {(filter === 'all' || filter === 'vouchers') && (
        <View style={{ gap: 10 }}>
          <SectionTitle icon="ticket-outline" title={`Kho voucher (${vouchers.length})`} />
          {!user ? <Muted>Đăng nhập để xem các mã giảm giá dành cho bạn.</Muted> : vouchers.length === 0 ? <Muted>Hiện chưa có mã giảm giá nào bạn dùng được.</Muted> : vouchers.map((c, i) => {
            const [bg, fg] = CIRCLE_TONES[i % CIRCLE_TONES.length];
            return (
              <View key={c._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadow }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: fg, letterSpacing: 0.5 }}>VOUCHER</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: fg }}>{short(c)}</Text>
                  {c.minOrderAmount ? <Text style={{ fontSize: 9, color: fg }}>Đơn từ {Math.round(c.minOrderAmount / 1000)}K</Text> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '800', color: colors.text, letterSpacing: 0.5 }}>{c.code}</Text>
                  <Muted numberOfLines={2} style={{ fontSize: 12 }}>{c.description || voucherValue(c)}</Muted>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="time-outline" size={13} color={colors.error} /><Text style={{ fontSize: 12, color: colors.error }}>HSD {formatDate(c.endDate)}{c.remainingUses > 1 ? ` · còn ${c.remainingUses} lượt` : ''}</Text></View>
                </View>
                <Button title="Dùng" small onPress={() => navigation.popTo('Tabs', { screen: 'Cart' })} />
              </View>
            );
          })}
        </View>
      )}

      {(filter === 'all' || filter === 'promos') && (
        <View style={{ gap: 10 }}>
          <SectionTitle icon="sparkles-outline" title="Ưu đãi tuyển chọn" />
          {promos.length === 0 ? <Muted>Hiện chưa có chương trình khuyến mãi nào.</Muted> : promos.map((p, i) => (
            <View key={p._id} style={{ backgroundColor: i % 2 ? colors.okBg : colors.surfaceContainer, borderRadius: radius.lg, padding: 16, gap: 6 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.tertiaryFixed, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.onTertiaryFixed }}>{p.type === 'percent' ? `Giảm ${p.value}%` : `Giảm ${formatCurrency(p.value)}`}</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{p.name}</Text>
              {p.description ? <Text style={{ color: colors.textVariant }}>{p.description}</Text> : null}
              <Muted style={{ fontSize: 12 }}>{p.scope === 'all' ? 'Toàn cửa hàng' : p.scope === 'category' ? 'Theo danh mục' : 'Sản phẩm chọn lọc'}{p.maxDiscount > 0 ? ` · tối đa ${formatCurrency(p.maxDiscount)}/sản phẩm` : ''} · đến {formatDate(p.endDate)}</Muted>
              <Pressable onPress={() => navigation.navigate('Products', {})}><Text style={{ color: colors.primary, fontWeight: '700' }}>Khám phá ngay ›</Text></Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={inTab ? ['top'] : []}>
      {body}
      <Toast toast={quick.toast} />
    </SafeAreaView>
  );
}
