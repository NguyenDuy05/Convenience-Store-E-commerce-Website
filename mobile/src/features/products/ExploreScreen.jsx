import React, { useEffect, useState } from 'react';
import { View, FlatList, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { T, Row, Chip, Button, QueryState, Empty, styles } from '../../components/ui';
import { SearchBar, BottomSheet, IconButton } from '../../components/commerce';
import { usePages, useResource } from '../../hooks/data';
import { catalogLayout } from '../../utils/catalogLayout';
import ProductCard from './ProductCard';
export default function ExploreScreen() {
  const params = useLocalSearchParams();
  return <ExploreContent key={`${params.q || ''}:${params.categoryId || ''}`} params={params} />;
}
function ExploreContent({ params }) {
  const [search, setSearch] = useState(String(params.q || '')),
    [q, setQ] = useState(String(params.q || '')),
    [categoryId, setCategory] = useState(String(params.categoryId || '')),
    [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);
  const categories = useResource('/categories');
  const promos = useResource('/promotions', { limit: 100 });
  const products = usePages('/products', {
    ...(q ? { q } : {}),
    ...(categoryId ? { categoryId } : {}),
  });
  const dimensions = useWindowDimensions();
  const { columns, cardWidth, frameWidth } = catalogLayout(
    dimensions.width,
    dimensions.height,
    dimensions.fontScale,
  );
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <View style={{ padding: 16, paddingTop: 8, gap: 12, width: frameWidth, alignSelf: 'center' }}>
        <Row between>
          <T title>Explore</T>
          <IconButton
            icon="options-outline"
            label="Filter products"
            onPress={() => setFiltersOpen(true)}
          />
        </Row>
        <SearchBar value={search} onChangeText={setSearch} onSubmit={() => setQ(search.trim())} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip title="All" selected={!categoryId} onPress={() => setCategory('')} />
          {categories.data?.map((c) => (
            <Chip
              key={c._id}
              title={c.name}
              selected={categoryId === c._id}
              onPress={() => setCategory(c._id)}
            />
          ))}
        </ScrollView>
        {q || categoryId ? (
          <Row between>
            <T muted style={{ flex: 1 }}>
              {products.data?.pages[0]?.total ?? '…'} results
            </T>
            <Button
              title="Reset"
              secondary
              onPress={() => {
                setSearch('');
                setQ('');
                setCategory('');
              }}
            />
          </Row>
        ) : null}
      </View>
      <QueryState query={products}>
        <FlatList
          style={{ width: frameWidth, alignSelf: 'center' }}
          key={columns}
          data={products.items}
          numColumns={columns}
          initialNumToRender={8}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
          renderItem={({ item }) => (
            <ProductCard product={item} width={cardWidth} promotions={promos.data?.items || []} />
          )}
          refreshing={products.isRefetching}
          onRefresh={products.refetch}
          onEndReached={() => {
            if (products.hasNextPage && !products.isFetchingNextPage) products.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Empty
              title="No matches yet"
              message="Try another search or category."
              action="Clear filters"
              onPress={() => {
                setSearch('');
                setQ('');
                setCategory('');
              }}
            />
          }
          ListFooterComponent={
            products.hasNextPage ? (
              <Button
                title="Load more"
                secondary
                busy={products.isFetchingNextPage}
                onPress={() => products.fetchNextPage()}
              />
            ) : null
          }
        />
      </QueryState>
      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Find your category"
      >
        <QueryState query={categories}>
          <Chip title="All products" selected={!categoryId} onPress={() => setCategory('')} />
          {categories.data?.map((cat) => (
            <Chip
              key={cat._id}
              title={cat.name}
              selected={categoryId === cat._id}
              onPress={() => setCategory(cat._id)}
            />
          ))}
        </QueryState>
        <Button title="Show products" onPress={() => setFiltersOpen(false)} />
      </BottomSheet>
    </SafeAreaView>
  );
}
