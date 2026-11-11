import { useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { FlatList, Image, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import { useLoad, useDebounced } from '../components/hooks';
import { Badge, Banner, Button, Card, Chip, Empty, ErrorView, H, Icon, Loading, Muted, ProductCard, Screen, SectionTitle, SkeletonGrid, Stars, Stepper, T, Text, TextInput, Toast } from '../components/ui';
import { BrandRow } from '../components/Brand';
import { useQuickAdd } from '../components/cartActions';
import { useOrderChanges } from '../components/OrderWatcher';
import { productSnapshot, useFavorites, useRecentlyViewed, useSearchHistory } from '../utils/storage';
import { storeStatus } from '../utils/store';
import { colors, radius, shadow, shadowLg } from '../theme';
import { errMsg, formatCurrency, formatDate } from '../utils/format';
import { estimatePromo } from '../utils/promoPrice';
import { imageUri } from '../config';

const MEAL = { main: 'Món no', light: 'Ăn nhẹ', snack: 'Ăn vặt', beverage: 'Đồ uống' };

// Lưới 2 cột: có nút "+" thêm nhanh và trái tim yêu thích
function ProductGrid({ items, promos, nav, header, footer, onEnd, refreshing, onRefresh, empty, quick, fav }) {
  const data = items.length % 2 ? [...items, { _spacer: true, _id: 'spacer' }] : items;
  return (
    <FlatList data={data} numColumns={2} keyExtractor={(p) => p._id} columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }} ListHeaderComponent={header} ListFooterComponent={footer} ListEmptyComponent={empty}
      onEndReached={onEnd} onEndReachedThreshold={0.4} refreshing={refreshing} onRefresh={onRefresh} keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => item._spacer ? <View style={{ flex: 1 }} /> : (
        <ProductCard product={item} price={promos ? estimatePromo(item, promos).price : undefined} onPress={() => nav.navigate('ProductDetail', { id: item._id })}
          onAdd={quick ? () => quick.add(item) : undefined} adding={quick?.busyId === item._id}
          favorite={fav?.has(item._id)} onFavorite={fav ? () => fav.toggle(productSnapshot(item)) : undefined} />)} />
  );
}

const ACTIVE_ORDER_TEXT = {
  ready_for_pickup: { tone: 'success', icon: 'storefront', title: 'Đơn đã sẵn sàng, mời bạn đến nhận' },
  pending_payment: { tone: 'warn', icon: 'card', title: 'Đơn đang chờ thanh toán' },
  preparing: { tone: 'info', icon: 'cube', title: 'Cửa hàng đang chuẩn bị đơn' },
  confirmed: { tone: 'info', icon: 'checkmark-done', title: 'Cửa hàng đã xác nhận đơn' },
};
const ACTIVE_ORDER_PRIORITY = ['ready_for_pickup', 'pending_payment', 'preparing', 'confirmed'];

// Màu nền pastel cho từng danh mục (khớp ảnh minh họa danh mục)
export const CAT_TINT = {
  snack: ['#FFF3C4', '#6f5d0e'], 'mi-lau-ly': ['#FFE3DC', '#bf360c'], 'banh-ngot': ['#FCE4EC', '#ad1457'], 'nuoc-uong': ['#DDF2FF', '#0277bd'],
  sua: ['#E8EAF6', '#3949ab'], 'com-nam-com-hop': ['#E8F5E9', '#2e7d32'], 'xuc-xich-do-an-nhanh': ['#FFEBE0', '#c62828'],
};
const tintOf = (c) => CAT_TINT[c?.slug] || [colors.surfaceContainer, colors.primary];

function QuickAction({ icon, label, onPress, badge }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 6 }, pressed && { opacity: 0.6 }]}>
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
        <Icon name={icon} size={22} color={colors.primary} />
        {badge ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge}</Text></View> : null}
      </View>
      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// Ô danh mục dạng bento: ảnh sản phẩm tiêu biểu trên nền pastel
function CategoryTile({ c, count, image, big, onPress }) {
  const [bg, fg] = tintOf(c);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, backgroundColor: bg, borderRadius: radius.lg, padding: 14, gap: 6, minHeight: big ? 190 : 176, overflow: 'hidden' }, pressed && { opacity: 0.85 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill }}><Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{big ? '⭐ Nổi bật • ' : ''}{count} món</Text></View>
        {big ? <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-forward" size={18} color={colors.text} /></View>
          : c.imageUrl ? <Image source={{ uri: imageUri(c.imageUrl) }} style={{ width: 26, height: 26, borderRadius: 8 }} /> : null}
      </View>
      <Text style={{ fontSize: big ? 24 : 17, lineHeight: big ? 28 : 21, fontWeight: '800', color: colors.text, maxWidth: big ? '55%' : '100%' }} numberOfLines={2}>{c.name}</Text>
      {big ? <Text style={{ fontSize: 13, color: colors.textVariant, maxWidth: '55%' }} numberOfLines={2}>{c.description || 'Chọn món yêu thích, đặt trước và nhận ngay tại quầy.'}</Text> : null}
      {big ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 'auto', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Khám phá ngay ›</Text>
        </View>) : null}
      <View style={big ? { position: 'absolute', right: 10, bottom: 10, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
        : { marginTop: 'auto', height: 92, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {image ? <Image source={{ uri: imageUri(image) }} style={{ width: big ? 130 : '100%', height: big ? 130 : 92 }} resizeMode="contain" />
          : c.imageUrl ? <Image source={{ uri: imageUri(c.imageUrl) }} style={{ width: 80, height: 80 }} /> : <Icon name="grid-outline" size={36} color={fg} />}
      </View>
    </Pressable>
  );
}

export function HomeScreen({ navigation }) {
  const { user, cartCount } = useAuth();
  const [q, setQ] = useState('');
  const quick = useQuickAdd();
  const fav = useFavorites(user?.id);
  const recent = useRecentlyViewed(user?.id);
  const d = useLoad(async () => {
    const [prods, cats, stores, promos, rev, mine, vouchers] = await Promise.all([
      A.products.list({ limit: 100 }), A.categories.list(), A.stores.list(), A.promotions.list(), A.reviews.ofStore({ limit: 3 }).catch(() => ({ data: { items: [] } })),
      user ? A.orders.list({ limit: 20 }).catch(() => ({ data: { items: [] } })) : { data: { items: [] } },
      user ? A.discountCodes.available().catch(() => ({ data: { items: [] } })) : { data: { items: [] } },
    ]);
    const active = (mine.data.items || []).filter((o) => ACTIVE_ORDER_PRIORITY.includes(o.status))
      .sort((x, y) => ACTIVE_ORDER_PRIORITY.indexOf(x.status) - ACTIVE_ORDER_PRIORITY.indexOf(y.status));
    return { products: prods.data.items || [], categories: cats.data || [], store: (stores.data || [])[0] || null, promos: promos.data.items || [], reviews: rev.data.items || [], active, vouchers: vouchers.data.items || [] };
  }, [user?.id], { reloadOnFocus: true });
  useOrderChanges(() => d.refresh());
  const search = () => navigation.navigate('Products', { search: q.trim() });
  if (d.loading && !d.data) return <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}><SkeletonGrid /></SafeAreaView>;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const { products, categories, store, promos, reviews, active, vouchers } = d.data;
  const st = storeStatus(store);
  const top = active[0];
  const openOrder = (o) => navigation.navigate(o.status === 'pending_payment' && o.paymentMethod !== 'cash' ? 'PayOrder' : 'OrderDetail', { id: o._id });
  // Thống kê theo danh mục: số món + ảnh sản phẩm tiêu biểu
  const byCat = new Map();
  products.forEach((p) => { const k = p.categoryId?._id; if (!k) return; const v = byCat.get(k) || { count: 0, image: null }; v.count += 1; if (!v.image && p.images?.[0]) v.image = p.images[0]; byCat.set(k, v); });
  const cats = categories.filter((c) => byCat.get(c._id)?.count).sort((a, b) => byCat.get(b._id).count - byCat.get(a._id).count);
  const [first, ...rest] = cats;
  const pairs = []; for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));
  const featured = products.filter((p) => p.images?.length).slice(0, 6);
  const openCat = (c) => navigation.navigate('Products', { categoryId: c._id });
  const voucher = vouchers[0];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen onRefresh={d.refresh} refreshing={d.refreshing} edges={[]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><BrandRow subtitle={user ? `XIN CHÀO, ${user.fullName.toUpperCase()}` : 'ĐẶT TRƯỚC • NHẬN TẠI QUẦY'} size={42} /></View>
          <Pressable onPress={() => navigation.navigate(user ? 'MemberCard' : 'Login')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Thẻ thành viên">
            <Icon name="qr-code-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Cart')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Giỏ hàng">
            <Icon name="cart" size={21} color={colors.primary} />
            {user && cartCount > 0 ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bg }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{cartCount}</Text></View> : null}
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 16, gap: 8, borderWidth: 1, borderColor: colors.border }}>
          <Icon name="search" color={colors.primary} />
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search" placeholder="Tìm snack, nước uống, mì ly…" placeholderTextColor={colors.outline} style={{ flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text }} />
          {q ? <Pressable onPress={() => setQ('')}><Icon name="close-circle" color={colors.outline} /></Pressable> : null}
        </View>

        {top ? (
          <Pressable onPress={() => openOrder(top)}>
            <Banner tone={ACTIVE_ORDER_TEXT[top.status].tone} icon={ACTIVE_ORDER_TEXT[top.status].icon} title={ACTIVE_ORDER_TEXT[top.status].title}
              text={`Mã đơn ${top.orderCode} · ${formatCurrency(top.totalAmount)}${active.length > 1 ? ` · và ${active.length - 1} đơn khác đang xử lý` : ''}`}>
              <Text style={{ fontWeight: '800', color: colors.text, marginTop: 2 }}>{top.status === 'pending_payment' && top.paymentMethod !== 'cash' ? 'Thanh toán ngay ›' : 'Xem mã nhận hàng ›'}</Text>
            </Banner>
          </Pressable>
        ) : null}

        {store && (
          <Pressable onPress={() => navigation.navigate('StoreInfo')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.secondaryContainer, borderRadius: radius.lg, padding: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' }}><Icon name="storefront" size={22} color={colors.secondary} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: colors.onSecondaryContainer }} numberOfLines={1}>{store.name}</Text>
                {st ? <View style={{ backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.open ? colors.secondary : colors.error }}>{st.open ? 'Đang mở' : 'Đóng cửa'}</Text></View> : null}
              </View>
              <Text style={{ fontSize: 12, color: colors.onSecondaryContainer }} numberOfLines={2}>Đặt trước, ghé quầy nhận ngay • {st ? st.text : store.address}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.onSecondaryContainer} />
          </Pressable>
        )}

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <QuickAction icon="qr-code-outline" label="Thẻ QR" onPress={() => navigation.navigate(user ? 'MemberCard' : 'Login')} />
          <QuickAction icon="ticket-outline" label="Voucher" badge={vouchers.length || null} onPress={() => navigation.navigate('Deals')} />
          <QuickAction icon="receipt-outline" label="Đơn hàng" badge={active.length || null} onPress={() => navigation.navigate(user ? 'Orders' : 'Login')} />
          <QuickAction icon="heart-outline" label="Yêu thích" onPress={() => navigation.navigate('Favorites')} />
        </View>

        {first ? (
          <View style={{ gap: 12 }}>
            <SectionTitle title="Danh mục nổi bật" action="Xem tất cả" onAction={() => navigation.navigate('Products', {})} />
            <CategoryTile c={first} big count={byCat.get(first._id).count} image={byCat.get(first._id).image} onPress={() => openCat(first)} />
            {pairs.map((pair) => (
              <View key={pair[0]._id} style={{ flexDirection: 'row', gap: 12 }}>
                {pair.map((c) => <CategoryTile key={c._id} c={c} count={byCat.get(c._id).count} image={byCat.get(c._id).image} onPress={() => openCat(c)} />)}
                {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        ) : null}

        {promos.length > 0 && (
          <Pressable onPress={() => navigation.navigate('Deals')} style={{ backgroundColor: colors.inverseSurface, borderRadius: radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.tertiaryFixed, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.onTertiaryFixed }}>🔥 ĐANG DIỄN RA • {promos.length} CHƯƠNG TRÌNH</Text></View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }} numberOfLines={2}>{promos[0].name}</Text>
              <Text style={{ color: '#c9d6f2', fontSize: 13 }} numberOfLines={2}>{promos[0].description || 'Giảm giá tự động khi đặt hàng.'}</Text>
            </View>
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{promos[0].type === 'percent' ? `-${promos[0].value}%` : `-${Math.round(promos[0].value / 1000)}K`}</Text>
            </View>
          </Pressable>
        )}

        {recent.items.length > 0 && (
          <View style={{ gap: 10 }}>
            <SectionTitle title="Đã xem gần đây" action="Xem tất cả" onAction={() => navigation.navigate('Favorites')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {recent.items.map((p) => (
                <View key={p._id} style={{ width: 156 }}>
                  <ProductCard product={p} price={estimatePromo(p, promos).price} onPress={() => navigation.navigate('ProductDetail', { id: p._id })} onAdd={() => quick.add(p)} adding={quick.busyId === p._id} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <SectionTitle title="Bạn đang cần gì lúc này?" action="Xem tất cả" onAction={() => navigation.navigate('Products', {})} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {featured.map((p) => (
              <View key={p._id} style={{ width: '47.5%' }}>
                <ProductCard product={p} price={estimatePromo(p, promos).price} onPress={() => navigation.navigate('ProductDetail', { id: p._id })}
                  onAdd={() => quick.add(p)} adding={quick.busyId === p._id} favorite={fav.has(p._id)} onFavorite={() => fav.toggle(productSnapshot(p))} />
              </View>
            ))}
          </View>
        </View>

        {voucher ? (
          <Pressable onPress={() => navigation.navigate('Deals')} style={{ backgroundColor: colors.primaryContainer, borderRadius: radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.onSecondaryContainer }}>VOUCHER CỦA BẠN</Text></View>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{voucher.type === 'percent' ? `Giảm ${voucher.value}%` : `Giảm ${formatCurrency(voucher.value)}`}</Text>
              <Text style={{ color: '#eaf1ff', fontSize: 13 }} numberOfLines={2}>{voucher.description || (voucher.minOrderAmount ? `Cho đơn từ ${formatCurrency(voucher.minOrderAmount)}` : 'Áp dụng ở bước đặt hàng')}</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}><Text style={{ color: '#fff', fontWeight: '700' }}>Mã: <Text style={{ color: colors.secondaryContainer, fontWeight: '800' }}>{voucher.code}</Text></Text></View>
            </View>
            <Image source={require('../../assets/mascot.png')} style={{ width: 92, height: 92, borderRadius: 46 }} />
          </Pressable>
        ) : null}

        {reviews.length > 0 && (
          <View style={{ gap: 10 }}>
            <SectionTitle title="Khách nói gì về cửa hàng" action="Xem thêm" onAction={() => navigation.navigate('StoreInfo')} />
            {reviews.map((r) => (
              <Card key={r._id}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: '700' }}>{r.customerId?.fullName || 'Khách hàng'}</T><Stars value={r.rating} size={14} /></View>{r.comment ? <Muted>{r.comment}</Muted> : null}</Card>
            ))}
          </View>
        )}
      </Screen>
      <Toast toast={quick.toast} />
    </SafeAreaView>
  );
}

const SORTS = [['featured', 'Gợi ý'], ['price-asc', 'Giá tăng'], ['price-desc', 'Giá giảm'], ['name', 'Tên A-Z']];

export function ProductsScreen({ navigation, route }) {
  const [q, setQ] = useState(route.params?.search || '');
  const [categoryId, setCategoryId] = useState(route.params?.categoryId || '');
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('featured');
  const search = useDebounced(q.trim(), 350);
  const { user } = useAuth();
  const quick = useQuickAdd();
  const fav = useFavorites(user?.id);
  const history = useSearchHistory(user?.id);
  const remember = () => { const v = q.trim(); if (v.length >= 2) history.push(v); };

  // Nhận tham số mới khi bấm từ Trang chủ
  useEffect(() => {
    if (route.params?.search !== undefined) setQ(route.params.search || '');
    if (route.params?.categoryId !== undefined) setCategoryId(route.params.categoryId || '');
  }, [route.params?.search, route.params?.categoryId]);

  const cats = useLoad(() => A.categories.list().then((r) => r.data || []), []);
  const promos = useLoad(() => A.promotions.list().then((r) => r.data.items || []), []);
  const d = useLoad(() => A.products.list({ q: search || undefined, limit: 100 }).then((r) => r.data.items || []), [search], { reloadOnFocus: true });

  const items = useMemo(() => {
    let r = (d.data || []).filter((p) => (!categoryId || p.categoryId?._id === categoryId) && (!inStock || Number(p.stockQuantity) > 0));
    if (sort === 'price-asc') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') r = [...r].sort((a, b) => b.price - a.price);
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return r;
  }, [d.data, categoryId, inStock, sort]);

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Danh Mục Sản Phẩm</Text>
          <Text style={{ fontSize: 12, color: colors.textVariant }}>Đặt trước • nhận ngay tại quầy</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Cart')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="cart" size={21} color={colors.primary} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 16, gap: 8, borderWidth: 1, borderColor: colors.border }}>
        <Icon name="search" color={colors.primary} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={remember} returnKeyType="search" placeholder="Tìm snack, nước uống, mì ly…" placeholderTextColor={colors.outline} style={{ flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text }} />
        {q ? <Pressable onPress={() => setQ('')}><Icon name="close-circle" color={colors.outline} /></Pressable> : null}
      </View>
      {!q && history.items.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="time-outline" size={16} color={colors.outline} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
            {history.items.map((h) => <Chip key={h} label={h} onPress={() => setQ(h)} />)}
          </ScrollView>
          <Pressable onPress={history.clear} hitSlop={8}><Text style={{ color: colors.outline, fontSize: 12 }}>Xóa</Text></Pressable>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        <Pressable onPress={() => setCategoryId('')} style={{ alignItems: 'center', gap: 4, width: 70 }}>
          <View style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: !categoryId ? colors.primary : colors.surfaceContainer }}>
            <Icon name="apps" size={24} color={!categoryId ? '#fff' : colors.primary} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: !categoryId ? '700' : '500', color: !categoryId ? colors.primary : colors.text }}>Tất cả</Text>
        </Pressable>
        {(cats.data || []).map((c) => {
          const on = categoryId === c._id;
          return (
            <Pressable key={c._id} onPress={() => setCategoryId(c._id)} style={{ alignItems: 'center', gap: 4, width: 70 }}>
              <View style={{ width: 58, height: 58, borderRadius: 18, overflow: 'hidden', borderWidth: 2.5, borderColor: on ? colors.primary : 'transparent', backgroundColor: (CAT_TINT[c.slug] || [colors.surfaceContainer])[0], alignItems: 'center', justifyContent: 'center' }}>
                {c.imageUrl ? <Image source={{ uri: imageUri(c.imageUrl) }} style={{ width: 54, height: 54 }} /> : <Icon name="grid-outline" size={22} color={colors.primary} />}
              </View>
              <Text style={{ fontSize: 11, textAlign: 'center', fontWeight: on ? '700' : '500', color: on ? colors.primary : colors.text }} numberOfLines={2}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="✅ Còn hàng" active={inStock} onPress={() => setInStock(!inStock)} />
        {SORTS.map(([k, l]) => <Chip key={k} label={l} active={sort === k} onPress={() => setSort(k)} />)}
      </ScrollView>
      <Muted>{d.loading ? 'Đang tải…' : `${items.length} sản phẩm`}</Muted>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {d.error && !d.data ? <ErrorView message={d.error} onRetry={d.reload} /> : (
        <ProductGrid items={items} promos={promos.data || []} nav={{ navigate: (n, p) => { remember(); navigation.navigate(n, p); } }} header={header} refreshing={d.refreshing} onRefresh={d.refresh}
          quick={quick} fav={fav}
          empty={d.loading ? <SkeletonGrid count={4} /> : <Empty icon="search-outline" title="Không tìm thấy sản phẩm" text="Thử đổi từ khóa hoặc bỏ bớt bộ lọc." action={<Button title="Xóa bộ lọc" variant="soft" onPress={() => { setQ(''); setCategoryId(''); setInStock(false); setSort('featured'); }} />} />} />
      )}
      <Toast toast={quick.toast} />
    </SafeAreaView>
  );
}

function Reviews({ productId, ratingAvg, ratingCount }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async (p) => {
    setLoading(true);
    try { const { data } = await A.reviews.ofProduct(productId, { page: p, limit: 5 }); setItems((c) => (p === 1 ? data.items : [...c, ...data.items])); setPage(data.page); setPages(data.pages || 1); setError(''); }
    catch { setError('Không tải được đánh giá.'); } finally { setLoading(false); }
  };
  useEffect(() => { setItems([]); load(1); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>Đánh giá gần đây</Text><View style={{ backgroundColor: colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.onSecondaryContainer }}>Đã mua hàng</Text></View></View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 30, fontWeight: '900', color: colors.text }}>{ratingCount ? ratingAvg.toFixed(1) : '—'}</Text>
        <View><Stars value={ratingAvg} size={18} /><Muted>{ratingCount ? `${ratingCount} đánh giá` : 'Chưa có đánh giá'}</Muted></View>
      </View>
      <Muted>Chỉ khách đã nhận đơn có sản phẩm này mới được đánh giá.</Muted>
      {error ? <Muted style={{ color: colors.error }}>{error}</Muted> : null}
      {items.map((r) => (
        <View key={r._id} style={{ gap: 4, backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: '700' }}>{r.customerId?.fullName || 'Khách hàng'}</T><Stars value={r.rating} size={14} /></View>
          <Muted>{formatDate(r.createdAt)}{r.orderId ? ' · Đã mua hàng' : ''}</Muted>
          {r.comment ? <T>{r.comment}</T> : null}
        </View>
      ))}
      {loading ? <Muted>Đang tải…</Muted> : null}
      {!loading && page < pages ? <Button title="Xem thêm đánh giá" variant="soft" small onPress={() => load(page + 1)} /> : null}
    </Card>
  );
}

export function ProductDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const d = useLoad(async () => {
    const p = (await A.products.get(id)).data;
    const catId = p.categoryId?._id || p.categoryId;
    const [promos, stores, rel] = await Promise.all([
      A.promotions.list().then((r) => r.data.items || []).catch(() => []), A.stores.list().then((r) => r.data?.[0] || null).catch(() => null),
      catId ? A.products.list({ categoryId: catId, limit: 5 }).then((r) => (r.data.items || []).filter((x) => x._id !== p._id).slice(0, 4)).catch(() => []) : [],
    ]);
    return { p, promos, store: stores, related: rel };
  }, [id], { reloadOnFocus: true });
  const { user, setCartCount } = useAuth();
  const fav = useFavorites(user?.id);
  const recent = useRecentlyViewed(user?.id);
  const quick = useQuickAdd();
  const { width } = useWindowDimensions();
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);
  const product = d.data?.p;
  useEffect(() => { if (product) recent.push(productSnapshot(product)); }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const { p, promos, store, related } = d.data;
  const promo = estimatePromo(p, promos);
  const discounted = promo.price < p.price;
  const unitPrice = discounted ? promo.price : p.price;
  const pct = discounted ? Math.round((1 - promo.price / p.price) * 100) : 0;
  const stock = p.stockQuantity || 0;
  const low = stock > 0 && stock <= (p.lowStockThreshold ?? 0);
  const liked = fav.has(p._id);
  const images = p.images?.length ? p.images : [null];
  const st = storeStatus(store);
  const show = (t) => { setToast(t); setTimeout(() => setToast(null), 2200); };

  const add = async (buyNow) => {
    if (!user) { navigation.navigate('Login'); return; }
    if (busy) return;
    setBusy(buyNow ? 'buy' : 'add');
    try {
      const r = await A.cart.add({ productId: p._id, quantity: qty }); setCartCount(r.data.itemCount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (buyNow) navigation.navigate('Checkout');
      else { show({ ok: true, text: `Đã thêm ${qty} ${p.unit} vào giỏ` }); setQty(1); }
    } catch (e) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); show({ ok: false, text: errMsg(e, 'Không thêm được vào giỏ hàng.') }); }
    finally { setBusy(''); }
  };
  const share = () => Share.share({ message: `${p.name} - ${formatCurrency(unitPrice)} tại Quick Convenience. Đặt trước trên app, nhận ngay tại quầy!` }).catch(() => {});
  const roundBtn = { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} refreshControl={undefined}>
        {/* Ảnh sản phẩm */}
        <View style={{ backgroundColor: colors.surfaceLow, padding: 16, paddingTop: 8 }}>
          <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#fff', ...shadow }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}>
              {images.map((u, i) => (
                <View key={i} style={{ width: width - 32, aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center' }}>
                  {u ? <Image source={{ uri: imageUri(u) }} style={{ width: '88%', height: '88%' }} resizeMode="contain" /> : <Icon name="basket-outline" size={80} color={colors.primary} />}
                </View>
              ))}
            </ScrollView>
            <View pointerEvents="box-none" style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              {stock <= 0 ? <View style={{ backgroundColor: colors.inverseSurface, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>TẠM HẾT HÀNG</Text></View>
                : discounted ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tertiaryFixed, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill }}><Icon name="flame" size={13} color={colors.onTertiaryFixed} /><Text style={{ color: colors.onTertiaryFixed, fontSize: 11, fontWeight: '800' }}>ĐANG GIẢM GIÁ</Text></View>
                  : (p.ratingCount || 0) >= 3 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tertiaryFixed, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill }}><Icon name="star" size={12} color={colors.onTertiaryFixed} /><Text style={{ color: colors.onTertiaryFixed, fontSize: 11, fontWeight: '800' }}>ĐƯỢC YÊU THÍCH</Text></View> : <View />}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={share} style={roundBtn} accessibilityLabel="Chia sẻ sản phẩm"><Icon name="share-social-outline" size={19} color={colors.text} /></Pressable>
                <Pressable onPress={() => { fav.toggle(productSnapshot(p)); Haptics.selectionAsync().catch(() => {}); }} style={roundBtn} accessibilityLabel={liked ? 'Bỏ yêu thích' : 'Yêu thích'}>
                  <Icon name={liked ? 'heart' : 'heart-outline'} size={20} color={colors.error} />
                </Pressable>
              </View>
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill }}>
              <Icon name="storefront" size={13} color={colors.onSecondaryContainer} /><Text style={{ color: colors.onSecondaryContainer, fontSize: 11, fontWeight: '800' }}>Nhận tại quầy</Text>
            </View>
            {images.length > 1 ? <View pointerEvents="none" style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(36,49,71,.75)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{slide + 1} / {images.length}</Text></View> : null}
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* Tên, đánh giá, giá */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Quick Fresh • {p.categoryId?.name || 'Sản phẩm'}{MEAL[p.mealType] ? ` • ${MEAL[p.mealType]}` : ''}</Text>
            </View>
            <Text style={{ fontSize: 21, lineHeight: 28, fontWeight: '800', color: colors.text }}>{p.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="star" size={16} color={colors.star} />
              <Text style={{ fontWeight: '800', color: colors.text }}>{p.ratingCount ? p.ratingAvg.toFixed(1) : '—'}</Text>
              <Text style={{ color: colors.outlineVariant }}>•</Text>
              <Text style={{ color: colors.textVariant, fontSize: 13, textDecorationLine: 'underline' }}>{p.ratingCount ? `${p.ratingCount} đánh giá` : 'Chưa có đánh giá'}</Text>
              <Text style={{ color: colors.outlineVariant }}>•</Text>
              <Text style={{ color: stock <= 0 ? colors.error : low ? colors.tertiary : colors.secondary, fontSize: 13, fontWeight: '600' }}>{stock <= 0 ? 'Tạm hết hàng' : low ? `Chỉ còn ${stock} ${p.unit}` : `Còn ${stock} ${p.unit}`}</Text>
            </View>
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{formatCurrency(unitPrice)}</Text>
                {discounted ? <Text style={{ color: colors.outline, textDecorationLine: 'line-through' }}>{formatCurrency(p.price)}</Text> : <Text style={{ color: colors.textVariant }}>/ {p.unit}</Text>}
              </View>
              {discounted ? <View style={{ backgroundColor: colors.errorContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}><Text style={{ color: colors.onErrorContainer, fontSize: 11, fontWeight: '800' }}>-{pct}% GIẢM</Text></View> : null}
            </View>
            {discounted ? <Muted style={{ fontSize: 12 }}>{promo.applied.map((a) => `${a.name} (${a.label})`).join(' • ')}. Giảm tự động khi đặt hàng.</Muted> : null}
          </View>

          {/* Cửa hàng nhận hàng */}
          <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: 14, gap: 10 }}>
            <Pressable onPress={() => navigation.navigate('StoreInfo')} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name="storefront" size={19} color={colors.onSecondaryContainer} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{store ? store.name : 'Nhận tại cửa hàng'}{st ? ` • ${st.open ? 'Đang mở' : 'Đóng cửa'}` : ''}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondary }} />
                  <Text style={{ color: colors.secondary, fontSize: 12, flex: 1 }}>Chuẩn bị sẵn tại quầy • Đọc mã đơn khi nhận</Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textVariant} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['shield-checkmark-outline', '100% Chính hãng'], ['calendar-outline', 'Hạn dùng rõ ràng']].map(([ic, t]) => (
                <View key={t} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: radius.md, padding: 8 }}>
                  <Icon name={ic} size={16} color={colors.primary} /><Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Số lượng */}
          {stock > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 14 }}>
              <View><Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>Số lượng</Text><Muted style={{ fontSize: 12 }}>Tối đa {Math.min(stock, 99)} {p.unit}</Muted></View>
              <Stepper value={qty} max={Math.min(stock, 99)} onChange={setQty} disabled={!!busy} />
            </View>
          ) : null}

          {/* Mô tả */}
          <View style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadow }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="information-circle-outline" size={20} color={colors.primary} /><Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>Mô tả & thông tin</Text></View>
            <Text style={{ color: colors.textVariant, lineHeight: 21 }}>{p.description || 'Sản phẩm này chưa có mô tả.'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[['Đơn vị', p.unit], ['Danh mục', p.categoryId?.name], ['Mã SKU', p.sku], p.barcode ? ['Mã vạch', p.barcode] : null].filter((x) => x && x[1]).map(([k, v]) => (
                <View key={k} style={{ width: '48.5%', backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.outline, letterSpacing: 0.4 }}>{k.toUpperCase()}</Text>
                  <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <Reviews productId={p._id} ratingAvg={p.ratingAvg || 0} ratingCount={p.ratingCount || 0} />

          {related.length > 0 && (
            <View style={{ gap: 10 }}>
              <SectionTitle title="Sản phẩm cùng danh mục" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {related.map((r) => <View key={r._id} style={{ width: '47.5%' }}><ProductCard product={r} price={estimatePromo(r, promos).price} onPress={() => navigation.push('ProductDetail', { id: r._id })}
                  onAdd={() => quick.add(r)} adding={quick.busyId === r._id} favorite={fav.has(r._id)} onFavorite={() => fav.toggle(productSnapshot(r))} /></View>)}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Thanh dưới cố định */}
      <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,.97)', ...shadowLg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => navigation.navigate(user ? 'Support' : 'Login')} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Hỗ trợ">
            <Icon name="chatbubbles-outline" size={22} color={colors.text} />
          </Pressable>
          {stock > 0 ? (
            <>
              <Button title={user ? `Thêm vào giỏ • ${formatCurrency(unitPrice * qty)}` : 'Đăng nhập để mua'} icon="cart" loading={busy === 'add'} onPress={() => add(false)} style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 13 }} />
              {user ? <Button title="Mua ngay" variant="accent" loading={busy === 'buy'} onPress={() => add(true)} style={{ paddingHorizontal: 16, paddingVertical: 13 }} /> : null}
            </>
          ) : <Button title="Tạm hết hàng" disabled style={{ flex: 1 }} />}
        </View>
      </SafeAreaView>
      <Toast toast={toast || quick.toast} />
    </View>
  );
}

export function PromotionsScreen({ navigation }) {
  const d = useLoad(() => A.promotions.list().then((r) => r.data.items || []), []);
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const scopeText = (p) => (p.scope === 'all' ? 'Toàn cửa hàng' : p.scope === 'category' ? 'Theo danh mục' : 'Sản phẩm chọn lọc');
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      {d.data.length === 0 ? <Empty icon="pricetags-outline" title="Chưa có khuyến mãi" text="Hiện chưa có chương trình khuyến mãi nào đang chạy." action={<Button title="Xem sản phẩm" onPress={() => navigation.popTo('Tabs', { screen: 'Products' })} />} /> :
        d.data.map((p) => (
          <Card key={p._id}>
            <Badge icon="pricetag" tone="warn" label={p.type === 'percent' ? `Giảm ${p.value}%` : `Giảm ${formatCurrency(p.value)}`} />
            <H>{p.name}</H>
            {p.description ? <T style={{ color: colors.textVariant }}>{p.description}</T> : null}
            <Muted>{scopeText(p)}{p.maxDiscount > 0 ? ` · Tối đa ${formatCurrency(p.maxDiscount)}/sản phẩm` : ''}</Muted>
            <Muted>Hiệu lực: {formatDate(p.startDate)} - {formatDate(p.endDate)}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
