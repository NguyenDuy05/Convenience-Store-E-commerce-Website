import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useResource, usePages } from '../../hooks/data';
import { post, errorText } from '../../services/api';
import { dateTime, label } from '../../utils/domain';
import { PageIntro, StatusBadge } from '../../components/commerce';
function SupportContent() {
  const { orderId } = useLocalSearchParams();
  const requests = usePages('/support/my');
  const [creating, setCreating] = useState(!!orderId),
    [type, setType] = useState('support'),
    [subject, setSubject] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const submit = async () => {
    if (!subject.trim() || !message.trim()) return setError('Enter a subject and message.');
    setBusy(true);
    setError('');
    try {
      const result = await post('/support', {
        type,
        subject,
        message,
        ...(orderId ? { orderId } : {}),
      });
      setCreating(false);
      setSubject('');
      setMessage('');
      requests.refetch();
      router.push(`/support/${result._id}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen onRefresh={requests.refetch} refreshing={requests.isRefetching}>
      <PageIntro
        eyebrow="QUICK SUPPORT"
        title="We’re here to help."
        description="Send your question to the store and follow the response here."
        icon="chatbubbles-outline"
      />
      {creating ? (
        <Card>
          <Row>
            <Chip
              title="Support"
              selected={type === 'support'}
              onPress={() => setType('support')}
            />
            <Chip
              title="Complaint"
              selected={type === 'complaint'}
              onPress={() => setType('complaint')}
            />
          </Row>
          {orderId ? <Notice>This request is linked to your selected order.</Notice> : null}
          <Field label="Subject" value={subject} onChangeText={setSubject} maxLength={200} />
          <Field
            label="Message"
            multiline
            value={message}
            onChangeText={setMessage}
            maxLength={5000}
          />
          <Button title="Send request" busy={busy} onPress={submit} />
          <Button title="Cancel" secondary disabled={busy} onPress={() => setCreating(false)} />
        </Card>
      ) : (
        <Button title="New support request" onPress={() => setCreating(true)} />
      )}
      <Notice error>{error}</Notice>
      <T heading>Your requests</T>
      <QueryState query={requests}>
        {requests.items.length ? (
          requests.items.map((r) => (
            <Card key={r._id}>
              <T heading>{r.subject}</T>
              <StatusBadge status={r.status} />
              <T muted>{dateTime(r.createdAt)}</T>
              <Button
                title="View conversation"
                secondary
                onPress={() => router.push(`/support/${r._id}`)}
              />
            </Card>
          ))
        ) : (
          <Empty title="No support requests yet" />
        )}
      </QueryState>
      {requests.hasNextPage ? (
        <Button
          title="More requests"
          secondary
          busy={requests.isFetchingNextPage}
          onPress={() => requests.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
export default function SupportScreen() {
  return (
    <Gate>
      <SupportContent />
    </Gate>
  );
}
function DetailContent() {
  const { id } = useLocalSearchParams();
  const request = useResource(`/support/${id}`, {}, { refetchInterval: 30000 });
  const r = request.data;
  return (
    <Screen onRefresh={request.refetch} refreshing={request.isRefetching}>
      <QueryState query={request}>
        {r ? (
          <>
            <PageIntro
              eyebrow="YOUR CONVERSATION"
              title={r.subject}
              icon="chatbubble-ellipses-outline"
            />
            <Notice>
              {label(r.status)} · {label(r.type)}
            </Notice>
            {r.order ? (
              <Button
                title={`View order ${r.order.orderCode}`}
                secondary
                onPress={() => router.push(`/order/${r.order._id}`)}
              />
            ) : null}
            <Card>
              <T style={{ fontWeight: '700' }}>Your message</T>
              <T>{r.message}</T>
              <T muted>{dateTime(r.createdAt)}</T>
            </Card>
            <T heading>Store responses</T>
            {r.responses.length ? (
              r.responses.map((response) => (
                <Card key={response._id}>
                  <T style={{ fontWeight: '700' }}>{response.responder || 'QUICK support'}</T>
                  <T>{response.message}</T>
                  <T muted>{dateTime(response.createdAt)}</T>
                </Card>
              ))
            ) : (
              <Empty
                title="Waiting for the store’s response"
                message="Pull down to check for updates."
              />
            )}
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
export function SupportDetailScreen() {
  return (
    <Gate>
      <DetailContent />
    </Gate>
  );
}
