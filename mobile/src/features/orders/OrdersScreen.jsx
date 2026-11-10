import React, { useState } from 'react';
import { ScrollView, View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Gate, T, Card, Row, Button, Chip, QueryState, Empty } from '../../components/ui';
import { usePages } from '../../hooks/data';
import { money, label, dateTime } from '../../utils/domain';
import { StatusBadge } from '../../components/commerce';
import { colors } from '../../theme/tokens';

function OrderCard({ order: o }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View order ${o.orderCode}`}
      onPress={() => router.push(`/order/${o._id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card
        style={{
          padding: 14,
          gap: 8,
          ...(o.status === 'ready_for_pickup'
            ? { borderLeftWidth: 4, borderColor: colors.lime }
            : {}),
        }}
      >
        <Row between>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }}>{o.orderCode}</T>
            <T muted style={{ fontSize: 12 }}>
              {dateTime(o.createdAt)}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.blueText} />
        </Row>
        <Row between style={{ flexWrap: 'wrap', gap: 8 }}>
          <StatusBadge status={o.status} />
          <T muted style={{ fontSize: 12 }}>
            {label(o.paymentStatus)}
          </T>
        </Row>
        <T numberOfLines={1} style={{ fontSize: 14 }}>
          {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
        </T>
        <Row between>
          <T muted style={{ flex: 1, fontSize: 12 }}>
            {o.store?.name || 'Store pickup'} · {o.itemCount} items
          </T>
          <T style={{ fontWeight: '800', color: colors.blueText, fontSize: 16 }}>
            {money(o.totalAmount)}
          </T>
        </Row>
      </Card>
    </Pressable>
  );
}
function OrdersContent() {
  const [filter, setFilter] = useState('all');
  const orders = usePages(
    filter === 'history' ? '/orders/my/history' : '/orders/my',
    !['all', 'history'].includes(filter) ? { status: filter } : {},
    { refetchInterval: 15000 },
  );
  return (
    <Screen top scroll={false}>
      <View style={{ padding: 16, paddingTop: 8, gap: 12 }}>
        <T title>Your orders</T>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            ['all', 'All'],
            ['pending_payment', 'Unpaid'],
            ['confirmed', 'Confirmed'],
            ['preparing', 'Preparing'],
            ['ready_for_pickup', 'Ready'],
            ['history', 'History'],
          ].map(([value, title]) => (
            <Chip
              key={value}
              title={title}
              selected={filter === value}
              onPress={() => setFilter(value)}
            />
          ))}
        </ScrollView>
      </View>
      <QueryState query={orders}>
        <FlatList
          data={orders.items}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          refreshing={orders.isRefetching}
          onRefresh={orders.refetch}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (orders.hasNextPage && !orders.isFetchingNextPage) orders.fetchNextPage();
          }}
          ListEmptyComponent={
            <Empty
              title="No orders here yet"
              message="Your next pickup starts with a few favorites."
              action="Start shopping"
              onPress={() => router.push('/explore')}
            />
          }
          ListFooterComponent={
            orders.hasNextPage ? (
              <Button
                title="Load more orders"
                secondary
                compact
                busy={orders.isFetchingNextPage}
                onPress={() => orders.fetchNextPage()}
              />
            ) : null
          }
        />
      </QueryState>
    </Screen>
  );
}
export default function OrdersScreen() {
  return (
    <Gate>
      <OrdersContent />
    </Gate>
  );
}
