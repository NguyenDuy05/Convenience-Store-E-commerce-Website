import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MenuGroup, IconButton, Entrance } from '../../components/commerce';
import { Screen, Gate, T, Row, Button, Notice } from '../../components/ui';
import { useSession } from '../../context/Session';
import { useResource } from '../../hooks/data';
import { money } from '../../utils/domain';
import { errorText } from '../../services/api';
import { colors as c, radius } from '../../theme/tokens';

function AccountContent() {
  const { user, logout } = useSession();
  const profile = useResource('/profile'),
    membership = useResource('/membership/me'),
    wallet = useResource('/wallet'),
    notifications = useResource('/notifications', { limit: 1 });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const fullName = profile.data?.fullName || user.fullName || 'QUICK member';
  const item = (path, title, icon, description) => ({
    title,
    icon,
    description,
    onPress: () => router.push(`/${path}`),
  });
  return (
    <Screen
      top
      onRefresh={() => {
        profile.refetch();
        membership.refetch();
        wallet.refetch();
        notifications.refetch();
      }}
      refreshing={profile.isRefetching}
    >
      <T title>Account</T>
      <Row style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            backgroundColor: c.lime,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T title>{fullName.trim().slice(0, 1).toUpperCase()}</T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T heading>{fullName}</T>
          <T muted style={{ fontSize: 13 }}>
            {profile.data?.email || user.email}
          </T>
        </View>
        <IconButton
          icon="create-outline"
          label="Edit profile"
          onPress={() => router.push('/profile')}
        />
      </Row>
      <Entrance>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View membership"
          onPress={() => router.push('/membership')}
          style={{ backgroundColor: c.ink, padding: 16, borderRadius: radius.lg, gap: 12 }}
        >
          <Row between>
            <T style={{ color: c.sky, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
              QUICK CLUB
            </T>
            <T style={{ color: c.lime, fontSize: 13 }}>
              {membership.data?.tier?.name || 'Membership'}
            </T>
          </Row>
          <Row between>
            <T heading style={{ color: c.white, fontSize: 24 }}>
              {membership.data ? `${membership.data.points} points` : 'View your points'}
            </T>
            <T style={{ color: c.yellow, fontSize: 13 }}>View rewards →</T>
          </Row>
        </Pressable>
      </Entrance>
      <MenuGroup
        title="Shopping & Orders"
        items={[
          item('orders', 'Order history', 'receipt-outline'),
          item(
            'notifications',
            'Notifications',
            'notifications-outline',
            notifications.data?.unreadCount
              ? `${notifications.data.unreadCount} unread`
              : undefined,
          ),
        ]}
      />
      <MenuGroup
        title="Membership & Rewards"
        items={[
          item('membership', 'Membership & points', 'ribbon-outline'),
          item(
            'wallet',
            'Wallet & refunds',
            'wallet-outline',
            wallet.data ? money(wallet.data.balance) : undefined,
          ),
        ]}
      />
      <MenuGroup
        title="Account Settings"
        items={[
          item('profile', 'Edit profile', 'person-outline'),
          item('password', 'Change password', 'lock-closed-outline'),
          item('addresses', 'Address book', 'location-outline'),
        ]}
      />
      <MenuGroup
        title="Help & Support"
        items={[
          item('reviews', 'My reviews', 'star-outline'),
          item('support', 'Support requests', 'chatbubble-ellipses-outline'),
        ]}
      />
      <Notice error>{error}</Notice>
      <Button
        title="Log out"
        secondary
        compact
        danger
        busy={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await logout();
            router.replace('/');
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      <T muted style={{ textAlign: 'center', fontSize: 12 }}>
        QUICK · Quick Picks, Happy Days.
      </T>
    </Screen>
  );
}
export default function AccountScreen() {
  return (
    <Gate>
      <AccountContent />
    </Gate>
  );
}
