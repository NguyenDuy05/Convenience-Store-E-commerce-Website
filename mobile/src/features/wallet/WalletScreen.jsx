import React from 'react';
import { Screen, Gate, T, Row, Card, Button, QueryState, Empty, Notice } from '../../components/ui';
import { usePages } from '../../hooks/data';
import { dateTime, money } from '../../utils/domain';
import { PageIntro } from '../../components/commerce';
import { colors } from '../../theme/tokens';
function WalletContent() {
  const wallet = usePages('/wallet');
  return (
    <Screen onRefresh={wallet.refetch} refreshing={wallet.isRefetching}>
      <PageIntro
        eyebrow="QUICK WALLET"
        title="Ready for next time."
        description="Your refunds, ready for your next favorites."
        icon="wallet-outline"
      />
      <QueryState query={wallet}>
        <Card style={{ backgroundColor: colors.lime }}>
          <T>Available wallet balance</T>
          <T title>{money(wallet.data?.pages[0]?.balance)}</T>
        </Card>
        <Notice>
          Refunds return here. Your balance is automatically used first on your next order; pay the
          remainder with VNPay.
        </Notice>
        <T heading>Wallet activity</T>
        {wallet.items.length ? (
          wallet.items.map((e) => (
            <Card key={e.key}>
              <Row between>
                <T style={{ flex: 1 }}>{e.description}</T>
                <T style={{ fontWeight: '800' }}>
                  {e.amount > 0 ? '+' : ''}
                  {money(e.amount)}
                </T>
              </Row>
              <T muted>
                {e.orderCode} · {dateTime(e.createdAt)}
              </T>
              <T muted>Balance after: {money(e.balanceAfter)}</T>
            </Card>
          ))
        ) : (
          <Empty title="No wallet activity yet" />
        )}
        {wallet.hasNextPage ? (
          <Button
            title="More activity"
            secondary
            busy={wallet.isFetchingNextPage}
            onPress={() => wallet.fetchNextPage()}
          />
        ) : null}
      </QueryState>
    </Screen>
  );
}
export default function WalletScreen() {
  return (
    <Gate>
      <WalletContent />
    </Gate>
  );
}
