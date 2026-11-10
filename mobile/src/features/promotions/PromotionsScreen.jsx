import React from 'react';
import { router } from 'expo-router';
import { Screen, T, Card, Button, QueryState, Empty } from '../../components/ui';
import { useResource } from '../../hooks/data';
import { dateTime, money } from '../../utils/domain';
import { PageIntro } from '../../components/commerce';
import { colors } from '../../theme/tokens';
export default function PromotionsScreen() {
  const offers = useResource('/promotions');
  return (
    <Screen onRefresh={offers.refetch} refreshing={offers.isRefetching}>
      <PageIntro
        eyebrow="QUICK OFFERS"
        title="More good in your bag."
        description="Current offers from your local store."
        icon="pricetag-outline"
      />
      <QueryState query={offers}>
        {offers.data?.items.length ? (
          offers.data.items.map((p) => (
            <Card key={p._id} style={{ backgroundColor: colors.yellowSoft }}>
              <T heading>{p.name}</T>
              <T title style={{ color: colors.blueText }}>
                {p.type === 'percent' ? `${p.value}% off` : `${money(p.value)} off`}
              </T>
              <T>{p.description}</T>
              <T muted>
                {p.scope === 'all'
                  ? 'All products'
                  : [...(p.categories || []), ...(p.products || [])]
                      .map((x) => x.name)
                      .filter(Boolean)
                      .join(', ')}
              </T>
              {p.maxDiscount > 0 ? <T muted>Maximum discount: {money(p.maxDiscount)}</T> : null}
              <T muted>Ends {dateTime(p.endDate)} (Vietnam time)</T>
              <Button title="Browse products" secondary onPress={() => router.push('/explore')} />
            </Card>
          ))
        ) : (
          <Empty title="Fresh offers are on their way" message="Check back for new promotions." />
        )}
      </QueryState>
    </Screen>
  );
}
