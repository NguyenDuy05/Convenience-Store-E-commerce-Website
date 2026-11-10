import React, { useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  T,
  Card,
  Row,
  Button,
  Quantity,
  ProductImage,
  Notice,
  QueryState,
} from '../../components/ui';
import { useResource, useCartAction, useCart } from '../../hooks/data';
import { useSession } from '../../context/Session';
import { money, quantityLimit, estimatePrice } from '../../utils/domain';
import { errorText } from '../../services/api';
import { productPhotos } from '../../utils/catalogImages';
import { colors } from '../../theme/tokens';
import { IconButton, Entrance } from '../../components/commerce';
export default function ProductScreen() {
  const { id } = useLocalSearchParams();
  const product = useResource(`/products/${id}`),
    promos = useResource('/promotions', { limit: 100 });
  const reviews = useResource(`/reviews/product/${id}`, { limit: 5 });
  const { user } = useSession();
  const add = useCartAction();
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);
  const dimensions = useWindowDimensions();
  const width = Math.min(dimensions.width, 760);
  const p = product.data;
  const max = quantityLimit(p?.stockQuantity);
  const selected = Math.min(quantity, Math.max(1, max));
  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <QueryState query={product}>
          {p ? (
            <>
              <Row between>
                <T muted style={{ flex: 1 }}>
                  {p.categoryId?.name || 'Your everyday essentials'}
                </T>
                <IconButton
                  icon="bag-handle-outline"
                  label="Your bag"
                  count={cart.data?.itemCount || 0}
                  onPress={() => router.push('/cart')}
                />
              </Row>
              <Entrance>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setPhoto(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))
                  }
                >
                  {(productPhotos(p).length ? productPhotos(p) : [null]).map((uri, i) => (
                    <ProductImage
                      key={i}
                      uri={uri}
                      name={p.name}
                      style={{
                        width: width - 32,
                        height: Math.min(width - 32, 320),
                        backgroundColor: colors.white,
                      }}
                    />
                  ))}
                </ScrollView>
              </Entrance>
              {productPhotos(p).length > 1 ? (
                <Row style={{ justifyContent: 'center', gap: 6 }}>
                  {productPhotos(p).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i === photo ? 22 : 6,
                        height: 6,
                        borderRadius: 6,
                        backgroundColor: i === photo ? colors.blue : colors.line,
                      }}
                    />
                  ))}
                </Row>
              ) : null}
              <T muted>
                {p.categoryId?.name} · {p.unit}
              </T>
              <T title>{p.name}</T>
              <Row>
                <T title style={{ color: colors.blueText }}>
                  {money(estimatePrice(p, promos.data?.items))}
                </T>
                {estimatePrice(p, promos.data?.items) < p.price ? (
                  <T muted style={{ textDecorationLine: 'line-through' }}>
                    {money(p.price)}
                  </T>
                ) : null}
              </Row>
              <T muted>Offers are estimates. Your final discount is confirmed at checkout.</T>
              <Notice>
                {max ? `${p.stockQuantity} available · Pickup in store` : 'Currently sold out'}
              </Notice>
              <T heading>A little more detail</T>
              <T>{p.description || 'Everyday essentials, ready for your next store pickup.'}</T>
              <Card>
                <T heading>Customer reviews</T>
                <T>
                  {p.ratingCount
                    ? `${Number(p.ratingAvg).toFixed(1)} / 5 · ${p.ratingCount} reviews`
                    : 'No ratings yet'}
                </T>
                <QueryState query={reviews}>
                  {reviews.data?.items.map((r) => (
                    <View key={r._id}>
                      <T style={{ fontWeight: '600' }}>
                        {r.customerId?.fullName || 'Customer'} · {'★'.repeat(r.rating)}
                      </T>
                      <T muted>{r.comment}</T>
                    </View>
                  ))}
                </QueryState>
                <Button
                  title="All product reviews"
                  secondary
                  onPress={() => router.push({ pathname: '/reviews', params: { productId: id } })}
                />
              </Card>
            </>
          ) : null}
        </QueryState>
      </ScrollView>
      {p ? (
        <View
          style={{
            backgroundColor: colors.white,
            padding: 12,
            gap: 10,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Row between style={width < 360 ? { flexWrap: 'wrap' } : undefined}>
            <Quantity
              value={selected}
              max={max}
              disabled={add.isPending || !max}
              onChange={setQuantity}
            />
            <Button
              title={add.isSuccess ? 'Added to bag' : 'Add to bag'}
              icon="bag-add-outline"
              style={{ flex: 1 }}
              busy={add.isPending}
              disabled={!max}
              onPress={() =>
                user
                  ? add.mutate({ id, quantity: selected })
                  : router.push({ pathname: '/login', params: { next: `/product/${id}` } })
              }
            />
          </Row>
          {add.isError ? <Notice error>{errorText(add.error)}</Notice> : null}
        </View>
      ) : null}
    </Screen>
  );
}
