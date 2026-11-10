import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { T, ProductImage, Button, Notice } from '../../components/ui';
import { useSession } from '../../context/Session';
import { useCartAction } from '../../hooks/data';
import { errorText } from '../../services/api';
import { colors, shadow, radius } from '../../theme/tokens';
import { productPhotos } from '../../utils/catalogImages';
import { money, estimatePrice } from '../../utils/domain';

export default function ProductCard({ product, promotions = [], width = 176 }) {
  const { user } = useSession();
  const action = useCartAction();
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const price = estimatePrice(product, promotions);
  const detail = `/product/${product._id}`;
  return (
    <Animated.View
      style={[
        {
          width,
          backgroundColor: colors.white,
          padding: 10,
          borderRadius: radius.lg,
          gap: 8,
          ...shadow.card,
        },
        motion,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${product.name}`}
        onPressIn={() => scale.set(withTiming(reduce ? 1 : 0.98, { duration: 100 }))}
        onPressOut={() => scale.set(withTiming(1, { duration: reduce ? 0 : 140 }))}
        onPress={() => router.push(detail)}
        style={{ gap: 6, flex: 1 }}
      >
        <View>
          <ProductImage
            uri={productPhotos(product)[0]}
            name={product.name}
            style={{
              height: undefined,
              aspectRatio: 1,
              borderRadius: 12,
              backgroundColor: colors.white,
            }}
          />
          {price < product.price ? (
            <View
              style={{
                position: 'absolute',
                left: 8,
                top: 8,
                backgroundColor: colors.yellow,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <T style={{ fontSize: 12, lineHeight: 16, fontWeight: '700' }}>
                −{Math.round((1 - price / product.price) * 100)}%
              </T>
            </View>
          ) : null}
        </View>
        <T
          numberOfLines={2}
          style={{ fontWeight: '700', minHeight: 44, fontSize: 14, lineHeight: 22 }}
        >
          {product.name}
        </T>
        <T
          muted
          numberOfLines={1}
          style={{ fontSize: 11, color: product.stockQuantity > 0 ? colors.success : colors.muted }}
        >
          {product.unit} · {product.stockQuantity > 0 ? 'In stock' : 'Sold out'}
        </T>
        <T style={{ color: colors.blueText, fontWeight: '800', fontSize: 17, lineHeight: 23 }}>
          {money(price)}
        </T>
        {price < product.price ? (
          <T muted style={{ textDecorationLine: 'line-through' }}>
            {money(product.price)}
          </T>
        ) : null}
      </Pressable>
      <Button
        compact
        secondary
        title={action.isSuccess ? 'Added' : 'Add'}
        icon={action.isSuccess ? 'checkmark' : 'add'}
        busy={action.isPending}
        disabled={product.stockQuantity <= 0}
        onPress={() =>
          user
            ? action.mutate({ id: product._id })
            : router.push({ pathname: '/login', params: { next: detail } })
        }
      />
      {action.isError ? <Notice error>{errorText(action.error)}</Notice> : null}
    </Animated.View>
  );
}
