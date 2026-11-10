import React, { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import {
  Screen,
  Gate,
  T,
  Row,
  Card,
  Field,
  Button,
  Notice,
  QueryState,
  StoreCard,
  Empty,
} from '../../components/ui';
import { useResource, useRefreshAll } from '../../hooks/data';
import { useSession } from '../../context/Session';
import { useQuery } from '@tanstack/react-query';
import { post, errorText } from '../../services/api';
import { secure } from '../../services/storage';
import { money, ambiguousCheckout } from '../../utils/domain';
import { Progress } from '../../components/Progress';
import { PageIntro, StatusBadge } from '../../components/commerce';

function CheckoutContent() {
  const { user } = useSession();
  const refresh = useRefreshAll();
  const profile = useResource('/profile');
  const [code, setCode] = useState(''),
    [appliedCode, setAppliedCode] = useState(''),
    [note, setNote] = useState(''),
    [pending, setPending] = useState(null),
    [restoring, setRestoring] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  const storageKey = `quick.checkout.${user.id}`;
  const preview = useQuery({
    queryKey: [user.id, '/orders/preview', appliedCode],
    queryFn: () => post('/orders/preview', { discountCode: appliedCode || undefined }),
    staleTime: 0,
  });
  const { refetch: refetchPreview } = preview;
  useFocusEffect(
    useCallback(() => {
      if (!pending) refetchPreview();
    }, [pending, refetchPreview]),
  );
  useEffect(() => {
    let active = true;
    secure
      .get(storageKey)
      .then((value) => {
        if (active && value) setPending(JSON.parse(value));
      })
      .catch(() => {
        if (active)
          setError('Unable to restore your checkout. Reopen this screen before confirming.');
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);
  const confirm = async () => {
    if (lock.current || restoring) return;
    lock.current = true;
    setBusy(true);
    setError('');
    let attempt = pending;
    try {
      if (!attempt) {
        const summary = preview.data;
        if (!summary?.canCheckout || preview.isFetching)
          throw new Error('Refresh and review your order before confirming.');
        attempt = {
          key: Crypto.randomUUID(),
          payload: {
            paymentMethod: 'vnpay',
            discountCode: appliedCode || undefined,
            customerNote: note.trim(),
            expectedTotal: summary.totalAmount,
            expectedWalletAmount: Math.min(summary.walletBalance || 0, summary.totalAmount),
          },
        };
        // Persist BEFORE the POST. An interrupted request must retain its key and exact body.
        await secure.set(storageKey, JSON.stringify(attempt));
        setPending(attempt);
      }
      const result = await post('/orders', attempt.payload, {
        headers: { 'Idempotency-Key': attempt.key },
      });
      await secure.remove(storageKey);
      setPending(null);
      refresh();
      router.replace({ pathname: '/payment-result', params: { orderId: result.order._id } });
    } catch (e) {
      setError(errorText(e));
      if (e.response && !ambiguousCheckout(e)) {
        await secure.remove(storageKey);
        setPending(null);
        preview.refetch();
        refresh();
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const s = preview.data;
  return (
    <Screen
      onRefresh={preview.refetch}
      refreshing={preview.isRefetching}
      footer={
        !pending && s?.items?.length ? (
          <>
            <Row between>
              <T>Order total</T>
              <T heading>{money(s.totalAmount)}</T>
            </Row>
            <Button
              title="Confirm pickup order"
              icon="checkmark-circle-outline"
              busy={busy}
              disabled={
                !s.canCheckout ||
                preview.isFetching ||
                preview.isError ||
                restoring ||
                (!!error && error.startsWith('Unable to restore'))
              }
              onPress={confirm}
            />
          </>
        ) : null
      }
    >
      <PageIntro
        eyebrow="CHECKOUT"
        title="One last look."
        description="Your favorites, prepared for pickup at QUICK."
        icon="receipt-outline"
      />
      <Progress value={0.25} />
      <T muted>Review → Pay → Track → Pick up</T>
      {pending ? (
        <Card>
          <T heading>Finish your previous confirmation</T>
          <T>
            This request may already have created an order. Continue safely with the same request to
            retrieve it.
          </T>
          <T>Reviewed total: {money(pending.payload.expectedTotal)}</T>
          <Button title="Continue confirmation" busy={busy} onPress={confirm} />
          <Button title="Check my orders" secondary onPress={() => router.push('/orders')} />
        </Card>
      ) : (
        <QueryState query={preview}>
          {s?.items?.length ? (
            <>
              <StoreCard store={s.store} notice={s.pickupSchedule?.notice} />
              <Card>
                <T heading>Pickup contact</T>
                <QueryState query={profile}>
                  <T>{profile.data?.fullName}</T>
                  <T muted>{profile.data?.email}</T>
                  <T muted>{profile.data?.phone || 'No phone number saved'}</T>
                  <Button
                    title="Edit contact details"
                    secondary
                    onPress={() => router.push('/profile')}
                  />
                </QueryState>
              </Card>
              <Card>
                <T heading>In your bag</T>
                {s.items.map((item) => (
                  <Row key={item.productId} between>
                    <T style={{ flex: 1 }}>
                      {item.quantity} × {item.name}
                    </T>
                    <T>{money(item.lineTotal)}</T>
                  </Row>
                ))}
              </Card>
              <Field
                label="Voucher code"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                maxLength={40}
              />
              <Button
                title="Apply code"
                secondary
                disabled={busy}
                onPress={() => setAppliedCode(code.trim())}
              />
              <Notice error>
                {s.discountError
                  ? typeof s.discountError === 'string'
                    ? s.discountError
                    : s.discountError.message
                  : ''}
              </Notice>
              <Field
                label="Note for the store (optional)"
                multiline
                maxLength={250}
                value={note}
                onChangeText={setNote}
              />
              <Card>
                <T heading>Payment summary</T>
                <Row>
                  <StatusBadge status="vnpay" />
                  <T muted style={{ flex: 1 }}>
                    Wallet credit is applied automatically.
                  </T>
                </Row>
                <Row between>
                  <T>Subtotal</T>
                  <T>{money(s.subtotal)}</T>
                </Row>
                {s.appliedPromotions?.map((p, i) => (
                  <Row key={i} between>
                    <T style={{ flex: 1 }}>{p.name}</T>
                    <T>−{money(p.amount)}</T>
                  </Row>
                ))}
                {s.discountCode ? (
                  <Row between>
                    <T>{s.discountCode.code}</T>
                    <T>−{money(s.discountCode.amount)}</T>
                  </Row>
                ) : null}
                <Row between>
                  <T heading>Order total</T>
                  <T heading>{money(s.totalAmount)}</T>
                </Row>
                <Row between>
                  <T>From your wallet</T>
                  <T>−{money(Math.min(s.walletBalance || 0, s.totalAmount))}</T>
                </Row>
                <Row between>
                  <T>Pay with VNPay</T>
                  <T style={{ fontWeight: '800' }}>
                    {money(Math.max(0, s.totalAmount - (s.walletBalance || 0)))}
                  </T>
                </Row>
                <T muted>
                  Wallet credit is used first. Points are earned after pickup, according to the
                  store’s membership rules.
                </T>
              </Card>
              {s.issues?.length ? (
                <Notice error>
                  {s.issues.map((i) => i.message || i.name || 'An item is unavailable').join('\n')}
                </Notice>
              ) : null}
              <T muted>
                You can cancel before preparation starts. Paid cancellations are refunded to your
                wallet for your next purchase.
              </T>
            </>
          ) : (
            <Empty
              title="Your bag is empty"
              action="Browse products"
              onPress={() => router.replace('/explore')}
            />
          )}
        </QueryState>
      )}
      <Notice error>{error}</Notice>
    </Screen>
  );
}
export default function CheckoutScreen() {
  return (
    <Gate>
      <CheckoutContent />
    </Gate>
  );
}
