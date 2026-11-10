import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useCart } from '../../hooks/data';
import { colors } from '../../theme/tokens';
import { CartBadge } from '../../components/commerce';
function TabIcon({ icon, color, focused, count }) {
  const reduce = useReducedMotion(),
    scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withTiming(focused ? 1.08 : 1, { duration: reduce ? 0 : 180 });
  }, [focused, reduce, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        {
          width: 48,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? colors.sky : colors.transparent,
        },
        animated,
      ]}
    >
      <Ionicons name={focused ? icon.replace('-outline', '') : icon} color={focused ? colors.blue : color} size={23} />
      <CartBadge count={count} />
    </Animated.View>
  );
}
export default function TabLayout() {
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const count = cart.data?.itemCount || 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blueText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          height: 62 + Math.max(insets.bottom, 10),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
        tabBarHideOnKeyboard: true,
      }}
    >
      {[
        ['index', 'Home', 'storefront-outline'],
        ['explore', 'Explore', 'search-outline'],
        ['cart', 'Cart', 'bag-outline'],
        ['orders', 'Orders', 'receipt-outline'],
        ['account', 'Account', 'person-outline'],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icon}
                color={color}
                focused={focused}
                count={name === 'cart' ? count : 0}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
