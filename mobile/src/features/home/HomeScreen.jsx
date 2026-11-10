import React, { useState } from 'react';
import { View, ScrollView, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { T, Row, Button, QueryState, Empty, StoreCard, styles } from '../../components/ui';
import {
  Brand,
  IconButton,
  SearchBar,
  SectionHeader,
  CategoryCard,
  PromoBanner,
  BottomSheet,
  Entrance,
} from '../../components/commerce';
import { useSession } from '../../context/Session';
import { useResource, useCart } from '../../hooks/data';
import { productPhotos } from '../../utils/catalogImages';
import { catalogLayout } from '../../utils/catalogLayout';
import ProductCard from '../products/ProductCard';
import { colors as c, radius } from '../../theme/tokens';

export default function HomeScreen() {
  const { user } = useSession();
  const [search, setSearch] = useState(''),
    [storeOpen, setStoreOpen] = useState(false),
    [banner, setBanner] = useState(0);
  const products = useResource('/products', { limit: 20 });
  const categories = useResource('/categories');
  const promotions = useResource('/promotions', { limit: 10 });
  const stores = useResource('/stores');
  const cart = useCart();
  const notifications = useResource('/notifications', { limit: 1 }, { enabled: !!user });
  const dimensions = useWindowDimensions();
  const { columns, cardWidth, frameWidth } = catalogLayout(
    dimensions.width,
    dimensions.height,
    dimensions.fontScale,
  );
  const width = frameWidth;
  const explore = (params = {}) => router.push({ pathname: '/explore', params });
  const offers = promotions.data?.items || [],
    items = products.data?.items || [],
    store = stores.data?.[0];
  const refresh = () => {
    products.refetch();
    categories.refetch();
    promotions.refetch();
    stores.refetch();
    if (user) notifications.refetch();
  };
  const header = (
    <View style={{ gap: 16, paddingBottom: 4 }}>
      <Entrance style={{ gap: 12 }}>
        <View>
          <T muted>
            {user
              ? `Good to see you, ${user.fullName?.split(' ')[0] || 'friend'}.`
              : 'Your neighborhood, in your pocket.'}
          </T>
          <T heading>What’s on your list today?</T>
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onSubmit={() => explore({ q: search })}
        />
      </Entrance>
      {offers.length ? (
        <View style={{ gap: 10 }}>
          <ScrollView
            horizontal
            snapToInterval={width - 20}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setBanner(Math.round(e.nativeEvent.contentOffset.x / (width - 20)))
            }
            contentContainerStyle={{ gap: 12 }}
          >
            {offers.map((p) => {
              const product = items.find(
                (item) =>
                  p.scope === 'all' ||
                  p.products?.some((x) => String(x._id || x) === item._id) ||
                  p.categories?.some(
                    (x) => String(x._id || x) === String(item.categoryId?._id || item.categoryId),
                  ),
              );
              return <PromoBanner key={p._id} promotion={p} product={product} width={width - 32} />;
            })}
          </ScrollView>
          {offers.length > 1 ? (
            <Row style={{ justifyContent: 'center', gap: 5 }}>
              {offers.map((p, i) => (
                <View
                  key={p._id}
                  style={{
                    width: i === banner ? 22 : 6,
                    height: 6,
                    borderRadius: 6,
                    backgroundColor: i === banner ? c.blue : c.line,
                  }}
                />
              ))}
            </Row>
          ) : null}
        </View>
      ) : (
        <PromoBanner width={width - 32} product={items.find((p) => productPhotos(p).length)} />
      )}
      <View style={{ gap: 12 }}>
        <SectionHeader title="Shop by category" action="See all" onPress={() => explore()} />
        <QueryState query={categories}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          >
            {categories.data?.map((cat) => (
              <CategoryCard
                key={cat._id}
                category={cat}
                image={
                  productPhotos(
                    items.find((p) => String(p.categoryId?._id || p.categoryId) === cat._id),
                  )[0]
                }
                onPress={() => explore({ categoryId: cat._id })}
              />
            ))}
          </ScrollView>
        </QueryState>
      </View>
      <SectionHeader title="Everyday favorites" action="See all" onPress={() => explore()} />
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <Row
        between
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          width: frameWidth,
          alignSelf: 'center',
        }}
      >
        <Brand />
        <Row style={{ gap: 10 }}>
          {user ? (
            <IconButton
              icon="notifications-outline"
              label="Notifications"
              count={notifications.data?.unreadCount || 0}
              onPress={() => router.push('/notifications')}
            />
          ) : (
            <IconButton
              icon="person-outline"
              label="Log in"
              onPress={() => router.push('/login')}
            />
          )}
          <IconButton
            icon="bag-handle-outline"
            label="Your bag"
            tone={c.lime}
            count={cart.data?.itemCount || 0}
            onPress={() => router.push('/cart')}
          />
        </Row>
      </Row>
      <FlatList
        style={{ width: frameWidth, alignSelf: 'center' }}
        key={columns}
        data={items}
        numColumns={columns}
        keyExtractor={(p) => p._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12 }}
        columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ProductCard product={item} width={cardWidth} promotions={offers} />
        )}
        refreshing={products.isRefetching}
        onRefresh={refresh}
        initialNumToRender={6}
        windowSize={5}
        ListEmptyComponent={
          <QueryState query={products}>
            <Empty title="Shelves are being stocked" />
          </QueryState>
        }
        ListFooterComponent={
          <View
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: radius.xl,
              backgroundColor: c.white,
              gap: 16,
            }}
          >
            <Row>
              <View style={{ padding: 14, borderRadius: 18, backgroundColor: c.sky }}>
                <Ionicons name="storefront-outline" size={32} color={c.blueText} />
              </View>
              <View style={{ flex: 1 }}>
                <T heading>Pick up at QUICK</T>
              </View>
            </Row>
            <T muted>Choose → Confirm → Track → Pick up</T>
            {store ? <T muted>{store.address}</T> : null}
            <Button title="View pickup store" secondary onPress={() => setStoreOpen(true)} />
          </View>
        }
      />
      <BottomSheet visible={storeOpen} onClose={() => setStoreOpen(false)} title="Your QUICK store">
        <QueryState query={stores}>
          <StoreCard store={store} />
        </QueryState>
      </BottomSheet>
    </SafeAreaView>
  );
}
