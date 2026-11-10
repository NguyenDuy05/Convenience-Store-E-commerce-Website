import React from 'react';
import { View } from 'react-native';
import { PageIntro } from '../../components/commerce';
import { colors } from '../../theme/tokens';
import { Screen, Gate, T, Row, Card, Button, QueryState, Empty } from '../../components/ui';
import { Progress } from '../../components/Progress';
import { useResource, usePages } from '../../hooks/data';
import { dateTime, label } from '../../utils/domain';
function MembershipContent() {
  const member = useResource('/membership/me'),
    history = usePages('/membership/me/history');
  const m = member.data;
  return (
    <Screen
      onRefresh={() => {
        member.refetch();
        history.refetch();
      }}
      refreshing={member.isRefetching}
    >
      <PageIntro
        eyebrow="QUICK REWARDS"
        title="Good things add up."
        description="Every completed pickup brings a little more good."
        icon="ribbon-outline"
      />
      <QueryState query={member}>
        {m ? (
          <>
            <View
              style={{ padding: 24, borderRadius: 28, gap: 16, backgroundColor: colors.yellow }}
            >
              <Row between>
                <T style={{ color: colors.ink, fontWeight: '700', letterSpacing: 2 }}>QUICK CLUB</T>
                <T muted>{m.memberCode}</T>
              </Row>
              <T heading>{m.tier?.name || 'Member'}</T>
              <T title>{m.points} points</T>
              <T>{m.lifetimePoints} lifetime points</T>
              {m.tier?.description ? <T>{m.tier.description}</T> : null}
            </View>
            {m.nextTier ? (
              <Card>
                <T heading>Next: {m.nextTier.name}</T>
                <Progress
                  value={
                    (m.lifetimePoints - (m.tier?.minPoints || 0)) /
                    Math.max(1, m.nextTier.minPoints - (m.tier?.minPoints || 0))
                  }
                />
                <T muted>{m.pointsToNextTier} more lifetime points to reach the next tier.</T>
              </Card>
            ) : null}
          </>
        ) : null}
      </QueryState>
      <T heading>Points history</T>
      <QueryState query={history}>
        {history.items.length ? (
          history.items.map((entry) => (
            <Card key={entry._id}>
              <Row between>
                <T>{label(entry.type)}</T>
                <T heading>
                  {entry.points > 0 ? '+' : ''}
                  {entry.points}
                </T>
              </Row>
              <T>{entry.reason}</T>
              <T muted>
                {entry.orderId?.orderCode} · {dateTime(entry.createdAt)}
              </T>
              <T muted>Balance after: {entry.balanceAfter}</T>
            </Card>
          ))
        ) : (
          <Empty
            title="Your points journey starts with pickup"
            message="Complete a purchase to earn points according to the store’s policy."
          />
        )}
      </QueryState>
      {history.hasNextPage ? (
        <Button
          title="More history"
          secondary
          busy={history.isFetchingNextPage}
          onPress={() => history.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
export default function MembershipScreen() {
  return (
    <Gate>
      <MembershipContent />
    </Gate>
  );
}
