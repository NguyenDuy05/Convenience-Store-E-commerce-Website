import React, { useState } from 'react';
import { router } from 'expo-router';
import { Screen, Gate, T, Card, Button, Notice, QueryState, Empty } from '../../components/ui';
import { usePages, useRefreshAll } from '../../hooks/data';
import { patch, errorText } from '../../services/api';
import { dateTime } from '../../utils/domain';
import { PageIntro } from '../../components/commerce';
import { colors } from '../../theme/tokens';
function destination(link) {
  const order = /^\/orders\/([a-f\d]{24})(?:\/tracking)?$/i.exec(link || '');
  if (order) return `/order/${order[1]}`;
  return (
    {
      '/cart': '/cart',
      '/promotions': '/promotions',
      '/orders': '/orders',
      '/wallet': '/wallet',
      '/membership': '/membership',
    }[link] || null
  );
}
function NotificationsContent() {
  const inbox = usePages('/notifications', {}, { refetchInterval: 30000 });
  const refresh = useRefreshAll();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const mark = async (id, link) => {
    setBusy(true);
    setError('');
    try {
      await patch(id ? `/notifications/${id}/read` : '/notifications/read-all');
      await inbox.refetch();
      refresh();
      const path = destination(link);
      if (path) router.push(path);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen onRefresh={inbox.refetch} refreshing={inbox.isRefetching}>
      <PageIntro
        eyebrow="YOUR INBOX"
        title="A little heads-up."
        description="Order updates, store news and new offers."
        icon="notifications-outline"
      />
      <Button
        title="Mark all as read"
        secondary
        busy={busy}
        disabled={!inbox.data?.pages[0]?.unreadCount}
        onPress={() => mark()}
      />
      <Notice error>{error}</Notice>
      <QueryState query={inbox}>
        {inbox.items.length ? (
          inbox.items.map((n) => (
            <Card
              key={n._id}
              style={
                !n.readAt
                  ? {
                      borderLeftWidth: 4,
                      borderLeftColor: colors.blue,
                      backgroundColor: colors.white,
                    }
                  : { backgroundColor: colors.blueSoft }
              }
            >
              <T heading>{n.title}</T>
              <T>{n.message}</T>
              <T muted>
                {dateTime(n.publishedAt)}
                {!n.readAt ? ' · Unread' : ''}
              </T>
              {!n.readAt || destination(n.link) ? (
                <Button
                  title={destination(n.link) ? 'View details' : 'Mark as read'}
                  secondary
                  disabled={busy}
                  onPress={() => mark(n._id, n.link)}
                />
              ) : null}
            </Card>
          ))
        ) : (
          <Empty title="You’re all caught up" />
        )}
      </QueryState>
      {inbox.hasNextPage ? (
        <Button
          title="More notifications"
          secondary
          busy={inbox.isFetchingNextPage}
          onPress={() => inbox.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
export default function NotificationsScreen() {
  return (
    <Gate>
      <NotificationsContent />
    </Gate>
  );
}
