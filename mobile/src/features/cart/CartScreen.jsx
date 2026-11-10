import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  Screen,
  Gate,
  T,
  Row,
  Card,
  Button,
  ProductImage,
  Quantity,
  Empty,
  QueryState,
  Notice,
  AnimatedValue,
} from '../../components/ui';
import { IconButton } from '../../components/commerce';
import { useCart, useCartAction } from '../../hooks/data';
import { useSession } from '../../context/Session';
import { money, quantityLimit } from '../../utils/domain';
import { productPhotos } from '../../utils/catalogImages';
import { errorText, post } from '../../services/api';
import { colors } from '../../theme/tokens';

function CartContent() {
  const cart = useCart(),
    action = useCartAction(),
    { user } = useSession();
  const preview = useQuery({
    queryKey: [user.id, '/orders/preview', ''],
    queryFn: () => post('/orders/preview', {}),
    enabled: !!cart.data?.items.length,
    staleTime: 0,
  });
  const ready = preview.data && !preview.isFetching && !preview.isError;
  const discounts = ready
    ? (preview.data.appliedPromotions || []).reduce((sum, p) => sum + p.amount, 0)
    : 0;
  return (
    <Screen
      top
      onRefresh={() => {
        cart.refetch();
        if (cart.data?.items.length) preview.refetch();
      }}
      refreshing={cart.isRefetching}
      footer={
        cart.data?.items.length ? (
          <>
            <Row between>
              <T muted>{ready ? 'Pickup total' : 'Subtotal before offers'}</T>
              <T heading>{money(ready ? preview.data.totalAmount : cart.data.subtotal)}</T>
            </Row>
            <Button
              title="Review pickup order"
              icon="arrow-forward"
              disabled={action.isPending || !!cart.data.issues?.length || cart.isError}
              onPress={() => router.push('/checkout')}
            />
          </>
        ) : null
      }
    >
      <Row between>
        <T title>Your bag</T>
        <T muted>{cart.data?.itemCount || 0} items</T>
      </Row>
      <QueryState query={cart}>
        {cart.data?.items.length ? (
          <>
            {cart.data.items.map((item) => (
              <Swipeable
                key={item.productId}
                overshootRight={false}
                renderRightActions={() => (
                  <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                    <Button
                      title="Remove"
                      danger
                      compact
                      disabled={action.isPending}
                      onPress={() => action.mutate({ id: item.productId, action: 'remove' })}
                    />
                  </View>
                )}
              >
                <Card style={{ padding: 12, gap: 8 }}>
                  <Row style={{ alignItems: 'flex-start', gap: 10 }}>
                    <ProductImage
                      uri={productPhotos(item)[0]}
                      name={item.name}
                      style={{ width: 64, height: 80, backgroundColor: colors.white }}
                    />
                    <View style={{ flex: 1, gap: 6 }}>
                      <T
                        numberOfLines={2}
                        style={{ fontWeight: '700', fontSize: 14, lineHeight: 20 }}
                      >
                        {item.name}
                      </T>
                      <T muted style={{ fontSize: 12 }}>
                        {money(item.unitPrice)} / {item.unit}
                      </T>
                      <T style={{ color: colors.blueText, fontWeight: '700' }}>
                        {money(item.lineTotal)}
                      </T>
                      <Row between style={{ gap: 4 }}>
                        <Quantity
                          value={item.quantity}
                          max={quantityLimit(item.stockQuantity)}
                          disabled={action.isPending}
                          onChange={(quantity) =>
                            action.mutate({ id: item.productId, quantity, action: 'update' })
                          }
                        />
                        <IconButton
                          icon="trash-outline"
                          label={`Remove ${item.name}`}
                          disabled={action.isPending}
                          onPress={() => action.mutate({ id: item.productId, action: 'remove' })}
                        />
                      </Row>
                    </View>
                  </Row>
                  {item.issue ? (
                    <Notice error>
                      {typeof item.issue === 'string'
                        ? item.issue.replaceAll('_', ' ')
                        : item.issue.message || 'This item needs updating.'}
                    </Notice>
                  ) : null}
                </Card>
              </Swipeable>
            ))}
            <Card>
              <T heading>Order summary</T>
              <Row between>
                <T muted>Subtotal</T>
                <T>{money(cart.data.subtotal)}</T>
              </Row>
              {discounts > 0 ? (
                <Row between>
                  <T muted>Product offers</T>
                  <T style={{ color: colors.success }}>−{money(discounts)}</T>
                </Row>
              ) : null}
              {ready ? (
                <Row between>
                  <T style={{ fontWeight: '700' }}>Total</T>
                  <AnimatedValue value={preview.data.totalAmount}>
                    <T heading>{money(preview.data.totalAmount)}</T>
                  </AnimatedValue>
                </Row>
              ) : (
                <T muted>
                  {preview.isFetching
                    ? 'Updating offers…'
                    : 'Offers will be confirmed at checkout.'}
                </T>
              )}
              <T muted style={{ fontSize: 12 }}>
                Apply a voucher and use wallet credit at checkout. In-store pickup.
              </T>
            </Card>
            <Button
              title="Keep shopping"
              secondary
              compact
              icon="add"
              onPress={() => router.push('/explore')}
            />
            {cart.data.issues?.length ? (
              <Notice error>Update or remove unavailable items before checkout.</Notice>
            ) : null}
          </>
        ) : (
          <Empty
            title="Your bag is waiting"
            message="Find everyday favorites and pick them up at QUICK."
            action="Explore products"
            onPress={() => router.push('/explore')}
          />
        )}
      </QueryState>
      {action.isError ? <Notice error>{errorText(action.error)}</Notice> : null}
    </Screen>
  );
}
export default function CartScreen() {
  return (
    <Gate>
      <CartContent />
    </Gate>
  );
}
