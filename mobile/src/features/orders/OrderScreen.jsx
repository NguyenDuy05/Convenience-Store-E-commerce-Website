import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Gate,
  T,
  Row,
  Card,
  Button,
  Field,
  Notice,
  QueryState,
  StoreCard,
} from '../../components/ui';
import { OrderTimeline, StatusBadge, PageIntro } from '../../components/commerce';
import { useResource, useRefreshAll } from '../../hooks/data';
import { post, errorText } from '../../services/api';
import { money, label, dateTime } from '../../utils/domain';
function OrderContent() {
  const { id } = useLocalSearchParams();
  const order = useResource(
    `/orders/my/${id}`,
    {},
    {
      refetchInterval: (query) =>
        ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'].includes(
          query.state.data?.status,
        )
          ? 10000
          : false,
    },
  );
  const refresh = useRefreshAll();
  const [cancelling, setCancelling] = useState(false),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const cancel = async () => {
    if (busy) return;
    if (reason.trim().length < 3)
      return setError('Enter a cancellation reason with at least 3 characters.');
    setBusy(true);
    setError('');
    try {
      await post(`/orders/my/${id}/cancel`, { reason });
      setCancelling(false);
      await order.refetch();
      refresh();
    } catch (e) {
      setError(errorText(e));
      order.refetch();
    } finally {
      setBusy(false);
    }
  };
  const o = order.data;
  return (
    <Screen onRefresh={order.refetch} refreshing={order.isRefetching}>
      <QueryState query={order}>
        {o ? (
          <>
            <PageIntro eyebrow="YOUR PICKUP" title={o.orderCode} icon="bag-check-outline" />
            <StatusBadge status={o.status} />
            {o.status === 'ready_for_pickup' ? (
              <Notice success>
                Your bag is ready! Show this order code to the staff at the store.
              </Notice>
            ) : null}
            <OrderTimeline order={o} />
            <StoreCard
              store={o.store}
              notice={
                o.preparationStartsAt && new Date(o.preparationStartsAt) > new Date()
                  ? `Preparation starts ${dateTime(o.preparationStartsAt)} (Vietnam time).`
                  : ''
              }
            />
            <Card>
              <T heading>Order details</T>
              {o.items.map((item, i) => (
                <Row key={i} between>
                  <T style={{ flex: 1 }}>
                    {item.quantity} × {item.name}
                  </T>
                  <T>{money(item.lineTotal)}</T>
                </Row>
              ))}
              <Row between>
                <T>Subtotal</T>
                <T>{money(o.subtotal)}</T>
              </Row>
              {o.promotionDiscount > 0 ? (
                <Row between>
                  <T>Promotions</T>
                  <T>−{money(o.promotionDiscount)}</T>
                </Row>
              ) : null}
              {o.discountCode ? (
                <Row between>
                  <T>{o.discountCode.code}</T>
                  <T>−{money(o.discountCode.amount)}</T>
                </Row>
              ) : null}
              <Row between>
                <T heading>Total</T>
                <T heading>{money(o.totalAmount)}</T>
              </Row>
              <T muted>
                {label(o.paymentStatus)} · {o.paymentMethod?.toUpperCase()}
              </T>
              <T muted>
                Wallet {money(o.walletAmount)} · VNPay {money(o.payableAmount)}
              </T>
              {o.customerNote ? <T>Note: {o.customerNote}</T> : null}
              {o.refund ? (
                <Notice success>Refunded to wallet: {money(o.refund.amount)}</Notice>
              ) : null}
              {o.pointsEarned > 0 ? <T>{o.pointsEarned} points earned</T> : null}
            </Card>
            {o.status === 'pending_payment' ? (
              <Button
                title="Finish payment"
                onPress={() =>
                  router.push({ pathname: '/payment-result', params: { orderId: id } })
                }
              />
            ) : null}
            {o.canCancel ? (
              cancelling ? (
                <Card>
                  <T heading>Cancel this order?</T>
                  <T>
                    Paid amounts will return to your wallet for future purchases. Staff preparation
                    may prevent cancellation.
                  </T>
                  <Field
                    label="Cancellation reason"
                    value={reason}
                    onChangeText={setReason}
                    maxLength={500}
                  />
                  <Button title="Confirm cancellation" danger busy={busy} onPress={cancel} />
                  <Button
                    title="Keep order"
                    secondary
                    disabled={busy}
                    onPress={() => setCancelling(false)}
                  />
                </Card>
              ) : (
                <Button title="Cancel order" secondary danger onPress={() => setCancelling(true)} />
              )
            ) : null}
            {o.status === 'completed' ? (
              <Button
                title="Review your purchases"
                secondary
                onPress={() => router.push('/reviews')}
              />
            ) : null}
            <Button
              title="Get help with this order"
              secondary
              onPress={() => router.push({ pathname: '/support', params: { orderId: id } })}
            />
            <Notice error>{error}</Notice>
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
export default function OrderScreen() {
  return (
    <Gate>
      <OrderContent />
    </Gate>
  );
}
