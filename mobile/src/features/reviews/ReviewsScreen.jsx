import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Gate,
  T,
  Row,
  Card,
  Field,
  Button,
  Chip,
  Notice,
  QueryState,
  Empty,
} from '../../components/ui';
import { useResource, usePages, useRefreshAll } from '../../hooks/data';
import { post, put, remove, errorText } from '../../services/api';
import { dateTime } from '../../utils/domain';
import { colors } from '../../theme/tokens';
import { PageIntro } from '../../components/commerce';
function Stars({ value, onChange }) {
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="radio"
          accessibilityLabel={`${star} stars`}
          accessibilityState={{ selected: value === star }}
          onPress={() => onChange(star)}
          style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <T style={{ color: star <= value ? colors.blueText : colors.muted, fontSize: 30 }}>
            {star <= value ? '★' : '☆'}
          </T>
        </Pressable>
      ))}
    </Row>
  );
}
function ReviewCard({ review, children }) {
  return (
    <Card>
      <T style={{ fontWeight: '700' }}>
        {review.productId?.name ||
          review.storeId?.name ||
          review.customerId?.fullName ||
          'Customer review'}
      </T>
      <T style={{ color: colors.blueText }}>
        {'★'.repeat(review.rating)} · {dateTime(review.createdAt)}
      </T>
      <T>{review.comment || 'No written comment.'}</T>
      {children}
    </Card>
  );
}
function PublicReviews({ productId }) {
  const list = usePages(productId ? `/reviews/product/${productId}` : '/reviews/store');
  return (
    <Screen onRefresh={list.refetch} refreshing={list.isRefetching}>
      <PageIntro
        eyebrow="COMMUNITY"
        title={productId ? 'From the community.' : 'Your local store, reviewed.'}
        icon="star-outline"
      />
      <QueryState query={list}>
        {list.items.length ? (
          list.items.map((r) => <ReviewCard key={r._id} review={r} />)
        ) : (
          <Empty title="No reviews yet" />
        )}
      </QueryState>
      {list.hasNextPage ? (
        <Button
          title="More reviews"
          secondary
          busy={list.isFetchingNextPage}
          onPress={() => list.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
function MyReviews() {
  const mine = useResource('/reviews/mine'),
    eligible = useResource('/reviews/mine/eligible'),
    stores = useResource('/stores');
  const refresh = useRefreshAll();
  const [form, setForm] = useState(null),
    [deleting, setDeleting] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (form._id)
        await put(`/reviews/${form._id}`, { rating: form.rating, comment: form.comment });
      else
        await post('/reviews', {
          targetType: form.targetType,
          productId: form.productId,
          orderId: form.orderId,
          storeId: form.storeId,
          rating: form.rating,
          comment: form.comment,
        });
      setForm(null);
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      onRefresh={() => {
        mine.refetch();
        eligible.refetch();
      }}
      refreshing={mine.isRefetching}
    >
      <PageIntro
        eyebrow="YOUR REVIEWS"
        title="Tell us how it went."
        description="Your thoughts help make every pickup better."
        icon="star-outline"
      />
      {form ? (
        <Card>
          <T heading>{form.title || 'Edit review'}</T>
          <Stars value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
          <Field
            label="Your review"
            multiline
            value={form.comment}
            maxLength={1000}
            onChangeText={(comment) => setForm((f) => ({ ...f, comment }))}
          />
          <Button title="Save review" busy={busy} onPress={save} />
          <Button title="Cancel editing" secondary disabled={busy} onPress={() => setForm(null)} />
        </Card>
      ) : (
        <>
          <T heading>Ready to review</T>
          <QueryState query={eligible}>
            {eligible.data?.length ? (
              eligible.data.map((e, i) => (
                <Card key={i}>
                  <T>{e.productName}</T>
                  <T muted>{e.orderCode}</T>
                  <Button
                    title="Review product"
                    secondary
                    onPress={() =>
                      setForm({
                        ...e,
                        targetType: 'product',
                        title: e.productName,
                        rating: 5,
                        comment: '',
                      })
                    }
                  />
                </Card>
              ))
            ) : (
              <T muted>Products become eligible after you pick up your order.</T>
            )}
          </QueryState>
          {stores.data?.[0] ? (
            <Button
              title="Review the store"
              secondary
              onPress={() =>
                setForm({
                  targetType: 'store',
                  storeId: stores.data[0]._id,
                  title: stores.data[0].name,
                  rating: 5,
                  comment: '',
                })
              }
            />
          ) : null}
        </>
      )}
      <Notice error>{error}</Notice>
      <T heading>Your reviews</T>
      <QueryState query={mine}>
        {mine.data?.length ? (
          mine.data.map((r) => (
            <ReviewCard key={r._id} review={r}>
              {r.status === 'visible' ? (
                <>
                  <Row>
                    <Button
                      title="Edit"
                      secondary
                      disabled={busy}
                      onPress={() => setForm({ ...r, title: r.productId?.name || r.storeId?.name })}
                    />
                    <Button
                      title="Delete"
                      secondary
                      danger
                      disabled={busy}
                      onPress={() => setDeleting(r._id)}
                    />
                  </Row>
                  {deleting === r._id ? (
                    <>
                      <T>Delete this review?</T>
                      <Row>
                        <Button
                          title="Confirm delete"
                          danger
                          busy={busy}
                          onPress={async () => {
                            setBusy(true);
                            try {
                              await remove(`/reviews/${r._id}`);
                              setDeleting(null);
                              if (form?._id === r._id) setForm(null);
                              refresh();
                            } catch (e) {
                              setError(errorText(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        />
                        <Button title="Keep" secondary onPress={() => setDeleting(null)} />
                      </Row>
                    </>
                  ) : null}
                </>
              ) : (
                <Notice>This review is hidden by moderation and cannot be edited.</Notice>
              )}
            </ReviewCard>
          ))
        ) : (
          <Empty title="No reviews written yet" />
        )}
      </QueryState>
    </Screen>
  );
}
export default function ReviewsScreen() {
  const { productId } = useLocalSearchParams();
  const [tab, setTab] = useState('mine');
  if (productId) return <PublicReviews productId={productId} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.sky }}>
      <Row style={{ padding: 16 }}>
        <Chip title="My reviews" selected={tab === 'mine'} onPress={() => setTab('mine')} />
        <Chip title="Store reviews" selected={tab === 'store'} onPress={() => setTab('store')} />
      </Row>
      {tab === 'mine' ? (
        <Gate>
          <MyReviews />
        </Gate>
      ) : (
        <PublicReviews />
      )}
    </View>
  );
}
