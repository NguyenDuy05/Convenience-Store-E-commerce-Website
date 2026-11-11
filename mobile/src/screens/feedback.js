import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { voucherValue } from './shop';
import { Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import NeedLogin from '../components/NeedLogin';
import { useLoad } from '../components/hooks';
import { Badge, Banner, Button, Card, Chip, Empty, ErrorView, Field, H, Icon, Loading, Muted, Screen, SectionTitle, Stars, T, Text, Thumb } from '../components/ui';
import { colors, radius, shadow, shadowLg } from '../theme';
import { errMsg, formatDate, formatDateTime, formatNumber } from '../utils/format';

const RATING_LABELS = ['Rất tệ', 'Chưa hài lòng', 'Tạm ổn', 'Rất tốt', 'Tuyệt vời'];
const PRODUCT_TAGS = { good: ['Ngon, đúng vị', 'Đúng mô tả', 'Giá hợp lý', 'Bao bì nguyên vẹn', 'Còn hạn dùng xa'], bad: ['Chưa ngon', 'Không đúng mô tả', 'Bao bì móp méo', 'Gần hết hạn'] };
const STORE_TAGS = ['⚡ Chuẩn bị nhanh', '😊 Nhân viên thân thiện', '📦 Đóng gói cẩn thận', '🧊 Đồ uống mát lạnh', '🧼 Cửa hàng sạch sẽ'];
const stripEmoji = (t) => t.replace(/^[^\p{L}]+/u, '').trim();

function BigStars({ value, onChange, size = 34 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => { onChange(n); Haptics.selectionAsync().catch(() => {}); }} hitSlop={4} accessibilityLabel={`${n} sao`}>
          <Icon name={value >= n ? 'star' : 'star-outline'} size={size} color={value >= n ? colors.star : colors.outlineVariant} />
        </Pressable>
      ))}
    </View>
  );
}
const TagPill = ({ label, on, onPress }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: on ? colors.primary : colors.surfaceContainer }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#fff' : colors.text }}>{label}</Text>
  </Pressable>
);
const toggle = (list, t) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);
const buildComment = (tags, note) => [tags.map(stripEmoji).join(', '), note.trim()].filter(Boolean).join('. ').slice(0, 1000);

// Màn hình cảm ơn sau khi gửi đánh giá: số điểm & hạng thật, gợi ý voucher (thiết kế "Tuyệt vời! Bạn nhận được…")
function ThanksModal({ data, onClose, navigation }) {
  if (!data) return null;
  const { mem, voucher, productCount, storeRated } = data;
  const tierStart = mem?.tier?.minPoints || 0;
  const progress = mem?.nextTier ? Math.min(100, Math.max(0, ((mem.lifetimePoints - tierStart) / Math.max(1, mem.nextTier.minPoints - tierStart)) * 100)) : 100;
  const go = (fn) => { onClose(); fn(); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(23,36,58,.45)', justifyContent: 'center', padding: 16 }}>
        <ScrollView contentContainerStyle={{ backgroundColor: '#fff', borderRadius: radius.xl, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
              <Icon name="checkmark-circle-outline" size={16} color={colors.secondary} /><Text style={{ fontSize: 12, fontWeight: '800', color: colors.secondary }}>ĐÃ GỬI ĐÁNH GIÁ</Text>
            </View>
            <Pressable onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceLow, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={20} /></Pressable>
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Image source={require('../../assets/mascot.png')} style={{ width: 130, height: 130, borderRadius: 65, borderWidth: 5, borderColor: '#fff' }} />
            <View style={{ marginTop: -18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.tertiary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill }}>
              <Icon name="trophy-outline" size={14} color="#fff" /><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>CẢM ƠN BẠN ĐÃ CHIA SẺ ⭐</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Tuyệt vời!</Text>
            <Text style={{ color: colors.textVariant, textAlign: 'center' }}>Ý kiến của bạn giúp Quick chọn hàng ngon hơn và giúp khách khác mua sắm dễ hơn.</Text>
          </View>
          <View style={{ backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name="star-outline" size={17} color={colors.secondary} /></View><Text style={{ flex: 1, color: colors.text }}>Đánh giá {productCount} sản phẩm</Text><Icon name="checkmark" size={18} color={colors.secondary} /></View>
            {storeRated ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name="storefront-outline" size={17} color={colors.primary} /></View><Text style={{ flex: 1, color: colors.text }}>Đánh giá trải nghiệm cửa hàng</Text><Icon name="checkmark" size={18} color={colors.secondary} /></View> : null}
          </View>
          {mem ? (
            <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: radius.md, padding: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="wallet-outline" size={20} color={colors.primary} /><Text style={{ fontWeight: '700', color: colors.text }}>Điểm Quick Club</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{formatNumber(mem.points)} điểm</Text><Muted style={{ fontSize: 12 }}>~ {formatNumber(mem.points * 100)}₫</Muted></View>
              </View>
              <Text style={{ fontSize: 12, color: colors.text }}>Hạng {mem.tier?.name || '—'}{mem.nextTier ? <Text style={{ color: colors.primary, fontWeight: '700' }}>{`  →  ${mem.nextTier.name}`}</Text> : null}</Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: '#fff', overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: 8, backgroundColor: colors.secondary }} /></View>
              <Muted style={{ fontSize: 12 }}>{mem.nextTier ? `Còn ${formatNumber(mem.pointsToNextTier)} điểm nữa để lên hạng ${mem.nextTier.name}.` : 'Bạn đang ở hạng cao nhất.'} Mỗi 10.000₫ khi nhận hàng = 1 điểm.</Muted>
            </View>
          ) : null}
          {voucher ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.tertiaryFixed, alignItems: 'center', justifyContent: 'center' }}><Icon name="gift-outline" size={24} color={colors.onTertiaryFixed} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.tertiary }}>ƯU ĐÃI CHO ĐƠN KẾ TIẾP</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{voucher.code}</Text>
                <Muted numberOfLines={1} style={{ fontSize: 12 }}>{voucher.description || voucherValue(voucher)} · HSD {formatDate(voucher.endDate)}</Muted>
              </View>
            </View>
          ) : null}
          <Button title="Tiếp tục mua sắm" icon="arrow-forward" onPress={() => go(() => navigation.popTo('Tabs', { screen: 'Home' }))} style={{ paddingVertical: 15 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Xem điểm" variant="soft" style={{ flex: 1 }} onPress={() => go(() => navigation.navigate('Membership'))} />
            <Button title="Đơn hàng" variant="soft" style={{ flex: 1 }} onPress={() => go(() => navigation.navigate('Orders'))} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Đánh giá đơn hàng (thiết kế "Đánh Giá Đơn Hàng"): gom theo đơn đã nhận, chấm sao từng món + trải nghiệm tại quầy
export function MyReviewsScreen({ navigation }) {
  const { user } = useAuth();
  const d = useLoad(async () => {
    if (!user) return null;
    const [eligible, mine, stores, prods] = await Promise.all([
      A.reviews.eligible(), A.reviews.mine(), A.stores.list().catch(() => ({ data: [] })), A.products.list({ limit: 100 }).catch(() => ({ data: { items: [] } })),
    ]);
    return { eligible: eligible.data, reviews: mine.data, store: (stores.data || [])[0] || null, images: new Map((prods.data.items || []).map((p) => [String(p._id), p.images?.[0]])) };
  }, [user?.id], { reloadOnFocus: true });
  const [orderIdx, setOrderIdx] = useState(0);
  const [drafts, setDrafts] = useState({});        // productKey -> { rating, tags }
  const [storeRating, setStoreRating] = useState(0);
  const [storeTags, setStoreTags] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [thanks, setThanks] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  if (!user) return <NeedLogin title="Đăng nhập để đánh giá" text="Đánh giá sản phẩm sau khi bạn đã nhận hàng tại cửa hàng." />;
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const { eligible, reviews, store, images } = d.data;

  // Gom món chờ đánh giá theo đơn
  const orders = [];
  eligible.forEach((it) => {
    let o = orders.find((x) => x.orderId === it.orderId);
    if (!o) { o = { orderId: it.orderId, orderCode: it.orderCode, pickedUpAt: it.pickedUpAt, items: [] }; orders.push(o); }
    o.items.push(it);
  });
  const order = orders[Math.min(orderIdx, orders.length - 1)];
  const keyOf = (it) => `${it.orderId}:${it.productId}`;
  const draftOf = (it) => drafts[keyOf(it)] || { rating: 5, tags: [] };
  const setDraft = (it, ch) => setDrafts((c) => ({ ...c, [keyOf(it)]: { ...draftOf(it), ...ch } }));

  const submit = async () => {
    if (!order || busy) return;
    setBusy(true); setMsg(null);
    let ok = 0; const errors = [];
    for (const it of order.items) {
      const dr = draftOf(it);
      try { await A.reviews.add({ targetType: 'product', orderId: it.orderId, productId: it.productId, rating: dr.rating, comment: buildComment(dr.tags, note) }); ok += 1; }
      catch (e) { errors.push(`${it.productName}: ${errMsg(e)}`); }
    }
    let storeRated = false;
    if (storeRating && store) {
      try { await A.reviews.add({ targetType: 'store', storeId: store._id, rating: storeRating, comment: buildComment(storeTags, '') }); storeRated = true; } catch { /* bỏ qua */ }
    }
    setBusy(false);
    if (!ok) { setMsg({ ok: false, text: errors.join('\n') || 'Không gửi được đánh giá.' }); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const [mem, vouchers] = await Promise.all([A.membership.me().then((r) => r.data).catch(() => null), A.discountCodes.available().then((r) => r.data.items || []).catch(() => [])]);
    setThanks({ mem, voucher: vouchers[0], productCount: ok, storeRated });
    setDrafts({}); setStoreRating(0); setStoreTags([]); setNote(''); setOrderIdx(0);
    if (errors.length) setMsg({ ok: false, text: errors.join('\n') });
    d.refresh();
  };

  const run = async (fn, okText) => { setBusy(true); setMsg(null); try { await fn(); setMsg({ ok: true, text: okText }); await d.refresh(); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); } finally { setBusy(false); } };
  const remove = (r) => Alert.alert('Xóa đánh giá', 'Bạn chắc chắn muốn xóa đánh giá này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => run(() => A.reviews.remove(r._id), 'Đã xóa đánh giá.') }]);
  const shown = reviews.filter((r) => filter === 'all' || r.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen onRefresh={d.refresh} refreshing={d.refreshing} style={{ paddingBottom: order ? 110 : 28 }}>
        {msg ? <Banner tone={msg.ok ? 'success' : 'error'} icon={msg.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={msg.text} /> : null}
        {order ? (
          <>
            {orders.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {orders.map((o, i) => <Chip key={o.orderId} label={`${o.orderCode} (${o.items.length})`} active={o === order} onPress={() => setOrderIdx(i)} />)}
              </ScrollView>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceLow, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}><Icon name="checkmark-circle" size={18} color={colors.primary} /><Text style={{ fontWeight: '600', color: colors.text }} numberOfLines={1}>Đơn hàng #{order.orderCode}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceHighest, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}><Icon name="storefront" size={12} color={colors.secondary} /><Text style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>Đã nhận {formatDate(order.pickedUpAt)}</Text></View>
            </View>
            <View style={{ backgroundColor: colors.primaryContainer, borderRadius: radius.xl, padding: 18, flexDirection: 'row', gap: 12, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -20, bottom: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.12)' }} />
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24 }}>🎁</Text></View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Chia sẻ trải nghiệm</Text>
                  <View style={{ backgroundColor: colors.tertiaryFixed, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}><Text style={{ fontSize: 10, fontWeight: '800', color: colors.onTertiaryFixed }}>QUICK CLUB</Text></View>
                </View>
                <Text style={{ color: '#eaf1ff', fontSize: 13 }}>Đánh giá của bạn được hiển thị kèm nhãn <Text style={{ color: colors.tertiaryFixed, fontWeight: '700' }}>Đã mua hàng</Text> và giúp cửa hàng phục vụ tốt hơn mỗi ngày.</Text>
              </View>
            </View>

            {store ? (
              <View style={{ backgroundColor: '#fff', borderRadius: radius.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border, ...shadow }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Image source={require('../../assets/mascot.png')} style={{ width: 52, height: 52, borderRadius: 26 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }} numberOfLines={1}>{store.name}</Text>
                    <Muted style={{ fontSize: 12 }} numberOfLines={1}>{store.address}</Muted>
                    <Text style={{ fontSize: 11, color: colors.secondary, fontWeight: '600' }}>Nhận tại quầy • {formatDate(order.pickedUpAt)}</Text>
                  </View>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name="storefront" size={18} color={colors.primary} /></View>
                </View>
                <View style={{ alignItems: 'center', gap: 6, backgroundColor: colors.surfaceLow, borderRadius: radius.lg, paddingVertical: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.textVariant }}>TRẢI NGHIỆM NHẬN HÀNG TẠI QUẦY</Text>
                  <BigStars value={storeRating} onChange={setStoreRating} />
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{storeRating ? `${RATING_LABELS[storeRating - 1]} (${storeRating}/5)` : 'Chạm để chấm sao (không bắt buộc)'}</Text>
                </View>
                {storeRating ? (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontWeight: '600', color: colors.text, fontSize: 13 }}>Điểm bạn ưng ý nhất:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{STORE_TAGS.map((t) => <TagPill key={t} label={t} on={storeTags.includes(t)} onPress={() => setStoreTags((c) => toggle(c, t))} />)}</View>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 }}>Chất lượng sản phẩm ({order.items.length} món)</Text>
            </View>
            {order.items.map((it) => {
              const dr = draftOf(it);
              const tags = dr.rating >= 4 ? PRODUCT_TAGS.good : PRODUCT_TAGS.bad;
              return (
                <View key={keyOf(it)} style={{ backgroundColor: '#fff', borderRadius: radius.xl, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadow }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Thumb uri={images.get(String(it.productId))} size={64} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }} numberOfLines={1}>{it.productName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <BigStars size={22} value={dr.rating} onChange={(rating) => setDraft(it, { rating, tags: [] })} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textVariant }}>{dr.rating}/5</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{tags.map((t) => <TagPill key={t} label={t} on={dr.tags.includes(t)} onPress={() => setDraft(it, { tags: toggle(dr.tags, t) })} />)}</View>
                </View>
              );
            })}

            <View style={{ backgroundColor: '#fff', borderRadius: radius.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadow }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Cảm nhận thực tế của bạn</Text>
                <Muted style={{ fontSize: 12 }}>{note.length}/500</Muted>
              </View>
              <Field value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Hương vị, chất lượng, giá cả… (không bắt buộc)" />
            </View>
          </>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
            <Image source={require('../../assets/mascot.png')} style={{ width: 96, height: 96, borderRadius: 48 }} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Bạn đã đánh giá hết rồi!</Text>
            <Muted style={{ textAlign: 'center' }}>Sau khi nhận hàng tại cửa hàng, các món trong đơn sẽ xuất hiện ở đây để bạn đánh giá.</Muted>
          </Card>
        )}

        <SectionTitle title={`Đánh giá của bạn (${reviews.length})`} />
        <View style={{ flexDirection: 'row', gap: 8 }}>{[['all', 'Tất cả'], ['visible', 'Đã đăng'], ['hidden', 'Bị ẩn']].map(([k, l]) => <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />)}</View>
        {shown.length === 0 ? <Muted>Các đánh giá bạn gửi sẽ hiện ở đây.</Muted> : shown.map((r) => {
          const isEdit = editing?.id === r._id;
          return (
            <Card key={r._id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <T style={{ fontWeight: '800', flex: 1 }}>{r.productId?.name || r.storeId?.name || 'Cửa hàng'}</T>
                <Badge label={r.status === 'hidden' ? 'Bị ẩn' : 'Đã đăng'} tone={r.status === 'hidden' ? 'error' : 'success'} />
              </View>
              {isEdit ? (
                <>
                  <BigStars size={26} value={editing.rating} onChange={(rating) => setEditing((e) => ({ ...e, rating }))} />
                  <Field value={editing.comment} onChangeText={(comment) => setEditing((e) => ({ ...e, comment }))} multiline maxLength={1000} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button small title="Lưu" loading={busy} onPress={() => run(async () => { await A.reviews.update(r._id, { rating: editing.rating, comment: editing.comment.trim() }); setEditing(null); }, 'Đã cập nhật đánh giá.')} />
                    <Button small variant="ghost" title="Hủy" onPress={() => setEditing(null)} />
                  </View>
                </>
              ) : (
                <>
                  <Stars value={r.rating} size={16} />
                  <T>{r.comment || 'Không có bình luận.'}</T>
                  <Muted>{r.orderId?.orderCode ? `Đơn ${r.orderId.orderCode} · ` : ''}{formatDate(r.updatedAt)}</Muted>
                  {r.status === 'hidden' ? <Muted style={{ color: colors.error }}>Đánh giá này đang bị ẩn khỏi công khai và không thể chỉnh sửa.</Muted> : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button small variant="soft" icon="create-outline" title="Sửa" onPress={() => setEditing({ id: r._id, rating: r.rating, comment: r.comment || '' })} />
                      <Button small variant="ghost" icon="trash-outline" title="Xóa" onPress={() => remove(r)} />
                    </View>)}
                </>)}
            </Card>);
        })}
      </Screen>
      {order ? (
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(249,249,255,.97)', ...shadowLg }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 4 }}>
            <Button title={`Gửi đánh giá (${order.items.length} món)`} icon="arrow-forward" loading={busy} onPress={submit} style={{ paddingVertical: 15 }} />
            <Text style={{ textAlign: 'center', fontSize: 11, color: colors.textVariant }}>Cảm ơn bạn đã tin chọn Quick Convenience! ❤️</Text>
          </View>
        </SafeAreaView>
      ) : null}
      <ThanksModal data={thanks} onClose={() => setThanks(null)} navigation={navigation} />
    </View>
  );
}

const STATUS = { open: ['Đang mở', 'warn'], in_progress: ['Đang xử lý', 'info'], resolved: ['Đã giải quyết', 'success'] };
const TYPE = { support: 'Hỗ trợ', complaint: 'Khiếu nại' };
const StatusBadge = ({ status }) => <Badge label={STATUS[status]?.[0] || status} tone={STATUS[status]?.[1] || 'neutral'} />;

export function SupportScreen({ navigation, route }) {
  const { user } = useAuth();
  const orderId = route.params?.orderId;
  const [form, setForm] = useState({ type: orderId ? 'complaint' : 'support', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const [status, setStatus] = useState('');
  const d = useLoad(async () => (user ? (await A.support.mine({ status: status || undefined, page: 1, limit: 30 })).data : null), [user?.id, status], { reloadOnFocus: true });
  if (!user) return <NeedLogin title="Đăng nhập để được hỗ trợ" text="Gửi câu hỏi hoặc khiếu nại và theo dõi phản hồi từ cửa hàng." />;
  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setMsg({ ok: false, text: 'Vui lòng nhập tiêu đề và nội dung.' }); return; }
    setSending(true); setMsg(null);
    try {
      await A.support.submit({ ...form, subject: form.subject.trim(), message: form.message.trim(), ...(orderId ? { orderId } : {}) });
      setForm({ type: 'support', subject: '', message: '' }); setMsg({ ok: true, text: 'Đã gửi yêu cầu. Bạn có thể theo dõi phản hồi bên dưới.' }); navigation.setParams({ orderId: undefined, orderCode: undefined }); d.reload();
    } catch (e) { setMsg({ ok: false, text: errMsg(e) }); } finally { setSending(false); }
  };
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <H>Gửi yêu cầu hỗ trợ</H>
        {orderId ? <Banner tone="info" icon="receipt-outline" text={`Yêu cầu sẽ gắn với đơn ${route.params?.orderCode || ''}`} /> : null}
        {msg ? <Banner tone={msg.ok ? 'success' : 'error'} icon={msg.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={msg.text} /> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>{Object.entries(TYPE).map(([k, l]) => <Chip key={k} label={l} active={form.type === k} onPress={() => setForm((f) => ({ ...f, type: k }))} />)}</View>
        <Field label="Tiêu đề" value={form.subject} onChangeText={(subject) => setForm((f) => ({ ...f, subject }))} maxLength={200} placeholder="Bạn cần giúp gì?" />
        <Field label="Nội dung" value={form.message} onChangeText={(message) => setForm((f) => ({ ...f, message }))} multiline maxLength={5000} placeholder="Mô tả chi tiết vấn đề…" />
        <Muted>{form.message.length}/5000 ký tự</Muted>
        <Button title="Gửi yêu cầu" loading={sending} onPress={submit} />
      </Card>
      <H>Yêu cầu của tôi</H>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{[['', 'Tất cả'], ...Object.entries(STATUS).map(([k, v]) => [k, v[0]])].map(([k, l]) => <Chip key={k} label={l} active={status === k} onPress={() => setStatus(k)} />)}</View>
      {d.loading && !d.data ? <Loading /> : d.error ? <ErrorView message={d.error} onRetry={d.reload} /> : d.data?.items?.length === 0 ? <Empty icon="chatbubbles-outline" title="Chưa có yêu cầu" text="Các yêu cầu bạn gửi sẽ hiện ở đây." /> :
        d.data.items.map((it) => (
          <Card key={it._id} onPress={() => navigation.navigate('SupportDetail', { id: it._id })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><T style={{ fontWeight: '700', flex: 1 }}>{it.subject}</T><StatusBadge status={it.status} /></View>
            <Muted>{TYPE[it.type]} · {formatDateTime(it.createdAt)}</Muted>
          </Card>))}
    </Screen>
  );
}

export function SupportDetailScreen({ navigation, route }) {
  const d = useLoad(() => A.support.get(route.params.id).then((r) => r.data), [route.params.id], { reloadOnFocus: true });
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const s = d.data;
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><H style={{ flex: 1 }}>{s.subject}</H><StatusBadge status={s.status} /></View>
        <Muted>{TYPE[s.type]} · Gửi lúc {formatDateTime(s.createdAt)}</Muted>
        {s.order ? <Pressable onPress={() => navigation.navigate('OrderDetail', { id: s.order._id })} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="receipt-outline" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700' }}>Đơn {s.order.orderCode}</Text></Pressable> : null}
        <T>{s.message}</T>
      </Card>
      <H>Phản hồi từ cửa hàng</H>
      {(s.responses || []).length === 0 ? <Card><Muted>Chưa có phản hồi. Đội ngũ cửa hàng sẽ xem xét yêu cầu của bạn.</Muted></Card> : s.responses.map((r) => (
        <Card key={r._id}><T style={{ fontWeight: '700' }}>{r.responder || 'Nhân viên cửa hàng'}</T><Muted>{formatDateTime(r.createdAt)}</Muted><T>{r.message}</T></Card>))}
      {s.resolvedAt ? <Banner tone="success" icon="checkmark-circle-outline" text={`Đã giải quyết lúc ${formatDateTime(s.resolvedAt)}`} /> : null}
    </Screen>
  );
}
