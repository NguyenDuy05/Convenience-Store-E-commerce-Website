import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Gate, T, Card, Row, Notice, Button, QueryState, Empty } from '../../components/ui';
import { useResource, useRefreshAll } from '../../hooks/data';
import { post, API_URL, errorText } from '../../services/api';
import { money, dateTime, safePaymentUrl } from '../../utils/domain';
import { PageIntro, StatusBadge } from '../../components/commerce';
import { BrandScene } from '../onboarding/WelcomeFlow';

function PaymentContent() {
  const { orderId } = useLocalSearchParams();
  const id = typeof orderId === 'string' && /^[a-f\d]{24}$/i.test(orderId) ? orderId : null;
  const order = useResource(
    `/orders/my/${id}`,
    {},
    {
      enabled: !!id,
      refetchInterval: (query) => (query.state.data?.status === 'pending_payment' ? 5000 : false),
    },
  );
  const refresh = useRefreshAll();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const lock = useRef(false);
  const { refetch } = order;
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && id) {
        refetch();
        refresh();
      }
    });
    return () => listener.remove();
  }, [id, refetch, refresh]);
  const pay = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const nativeReturn =
        Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient';
      const result = await post('/payments/online', {
        orderId: id,
        method: 'vnpay',
        ...(nativeReturn ? { returnTo: 'mobile' } : {}),
      });
      const url = safePaymentUrl(result.paymentUrl, API_URL, __DEV__);
      if (Platform.OS === 'web') {
        await WebBrowser.openBrowserAsync(url);
        setNotice('After payment, return here and check the status.');
      } else {
        const browser = nativeReturn
          ? await WebBrowser.openAuthSessionAsync(url, 'quickstore://payment-result')
          : await WebBrowser.openBrowserAsync(url);
        setNotice(
          browser.type === 'cancel' || browser.type === 'dismiss'
            ? 'Browser closed. Your payment status is being checked; closing the browser does not cancel your order.'
            : 'Checking the payment with the store.',
        );
      }
      await order.refetch();
      refresh();
    } catch (e) {
      setError(errorText(e));
      await order.refetch();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const o = order.data;
  if (!id)
    return (
      <Screen>
        <Empty
          title="Select an order to check payment"
          message="Payment results are verified using your signed-in account."
          action="View orders"
          onPress={() => router.replace('/orders')}
        />
      </Screen>
    );
  return (
    <Screen onRefresh={order.refetch} refreshing={order.isRefetching}>
      <QueryState query={order}>
        {o ? (
          <>
            {o.paymentStatus === 'paid' ? <BrandScene compact step={3} /> : null}
            <PageIntro
              eyebrow="PAYMENT"
              icon={o.paymentStatus === 'paid' ? 'checkmark-circle-outline' : 'card-outline'}
              title={
                o.paymentStatus === 'paid'
                  ? 'Payment confirmed.'
                  : o.paymentStatus === 'refunded'
                    ? 'Back in your wallet.'
                    : o.status === 'pending_payment'
                      ? 'Let’s make it yours.'
                      : 'Check your order.'
              }
            />
            <Card>
              <T heading>{o.orderCode}</T>
              <Row between>
                <T>Payment</T>
                <StatusBadge status={o.paymentStatus} />
              </Row>
              <Row between>
                <T>Order</T>
                <StatusBadge status={o.status} />
              </Row>
              <Row between>
                <T>Total</T>
                <T>{money(o.totalAmount)}</T>
              </Row>
              <Row between>
                <T>Wallet used</T>
                <T>{money(o.walletAmount)}</T>
              </Row>
              <Row between>
                <T>VNPay amount</T>
                <T>{money(o.payableAmount)}</T>
              </Row>
              {o.expiresAt ? (
                <T muted>Payment deadline: {dateTime(o.expiresAt)} (Vietnam time)</T>
              ) : null}
            </Card>
            {o.status === 'pending_payment' && o.paymentStatus !== 'paid' ? (
              <Button title="Continue with VNPay" icon="card-outline" onPress={pay} busy={busy} />
            ) : null}
            {o.paymentStatus === 'paid' && o.status !== 'completed' ? (
              <Notice success>
                We have received your payment. Wait for “Ready for pickup” before visiting the
                store.
              </Notice>
            ) : null}
            {['failed', 'cancelled'].includes(o.status) ? (
              <Notice>
                This order is closed. Any refund is shown in your wallet; contact support if you
                need help.
              </Notice>
            ) : null}
            <Notice>{notice}</Notice>
            <Notice error>{error}</Notice>
            <Button
              title="Check payment status"
              secondary
              busy={order.isFetching}
              onPress={() => order.refetch()}
            />
            <Button
              title="Track this order"
              secondary
              onPress={() => router.replace(`/order/${id}`)}
            />
            <Button title="My orders" secondary onPress={() => router.replace('/orders')} />
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
export default function PaymentScreen() {
  return (
    <Gate>
      <PaymentContent />
    </Gate>
  );
}
