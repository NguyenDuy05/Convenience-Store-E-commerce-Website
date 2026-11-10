import React, { useEffect, useState } from 'react';
import { View, Pressable, TextInput, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Row, ProductImage, Card, Notice } from './ui';
import { Progress } from './Progress';
import { colors as c, radius, shadow, typography, motion } from '../theme/tokens';
import { productPhotos } from '../utils/catalogImages';
import { dateTime, label, money } from '../utils/domain';

export function Brand({ small = false }) {
  return (
    <Row style={{ gap: 8 }}>
      <Image
        source={require('../../assets/quick-icon.png')}
        style={{ width: small ? 32 : 42, height: small ? 32 : 42, borderRadius: 12 }}
      />
      <T heading style={{ color: c.blueText, fontSize: small ? 23 : 28 }}>
        QUICK
      </T>
    </Row>
  );
}
export function Entrance({ children, style }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(motion.screen)} style={style}>
      {children}
    </Animated.View>
  );
}
export function IconButton({
  icon,
  label: title,
  onPress,
  count = 0,
  tone = c.white,
  disabled = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${count ? `, ${count}` : ''}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={23} color={c.ink} />
      <CartBadge count={count} />
    </Pressable>
  );
}
export function CartBadge({ count }) {
  const scale = useSharedValue(1),
    reduce = useReducedMotion();
  useEffect(() => {
    scale.value = reduce ? 1 : 0.7;
    scale.value = withTiming(1, { duration: motion.quick });
  }, [count, reduce, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (!count) return null;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -3,
          right: -3,
          backgroundColor: c.ink,
          minWidth: 20,
          paddingHorizontal: 4,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: c.white,
        },
        animated,
      ]}
    >
      <T style={{ ...typography.caption, color: c.white, fontSize: 12, textAlign: 'center' }}>
        {count > 99 ? '99+' : count}
      </T>
    </Animated.View>
  );
}
export function SectionHeader({ title, subtitle, action, onPress }) {
  return (
    <Row between>
      <View style={{ flex: 1 }}>
        <T heading>{title}</T>
        {subtitle ? <T muted>{subtitle}</T> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <T style={{ color: c.blueText, fontWeight: '700', fontSize: 13 }}>{action} →</T>
        </Pressable>
      ) : null}
    </Row>
  );
}
export function PageIntro({ title, description, icon = 'sparkles-outline' }) {
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <Ionicons name={icon} size={24} color={c.blue} />
        <T title style={{ flex: 1 }}>
          {title}
        </T>
      </Row>
      {description ? <T muted>{description}</T> : null}
    </View>
  );
}
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search your QUICK favorites...',
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: focus ? c.blue : c.transparent,
        paddingLeft: 16,
        ...shadow.card,
      }}
    >
      <Ionicons name="search-outline" size={22} color={c.blueText} />
      <TextInput
        accessibilityLabel="Search products"
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCapitalize="none"
        style={{ ...typography.body, flex: 1, minHeight: 48, paddingHorizontal: 12, color: c.ink }}
      />
      {value ? (
        <IconButton icon="close" label="Clear search" onPress={() => onChangeText('')} />
      ) : null}
      {onSubmit ? <IconButton icon="arrow-forward" label="Search" onPress={onSubmit} /> : null}
    </View>
  );
}
export function CategoryCard({ category, image, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 88,
        alignItems: 'center',
        gap: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.lg,
          backgroundColor: c.white,
          padding: 8,
          ...shadow.card,
        }}
      >
        {image ? (
          <ProductImage uri={image} style={{ height: 56, backgroundColor: c.white }} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name={
                {
                  snack: 'nutrition-outline',
                  'mi-lau-ly': 'restaurant-outline',
                  'banh-ngot': 'cafe-outline',
                  'nuoc-uong': 'water-outline',
                  sua: 'cafe-outline',
                  'com-nam-com-hop': 'restaurant-outline',
                  'xuc-xich-do-an-nhanh': 'fast-food-outline',
                }[category.slug] || 'basket-outline'
              }
              size={30}
              color={c.blueText}
            />
          </View>
        )}
      </View>
      <T
        numberOfLines={2}
        style={{ textAlign: 'center', fontSize: 12, lineHeight: 17, fontWeight: '600' }}
      >
        {category.name}
      </T>
    </Pressable>
  );
}
export function PromoBanner({ promotion, product, width }) {
  const image = productPhotos(product)[0];
  return (
    <View
      style={{
        width,
        backgroundColor: promotion ? c.yellowSoft : c.lime,
        borderRadius: radius.xl,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <Row style={{ gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <T style={{ ...typography.caption, color: c.blueText, fontWeight: '700' }}>
            {promotion ? 'QUICK OFFERS' : 'QUICK PICKS, HAPPY DAYS.'}
          </T>
          <T heading numberOfLines={2} style={{ fontSize: 24, lineHeight: 28 }}>
            {promotion?.name || 'Everyday favorites. Ready for pickup.'}
          </T>
          {promotion ? (
            <T style={{ color: c.blueText, fontWeight: '800', fontSize: 18 }}>
              {promotion.type === 'percent'
                ? promotion.value + '% off'
                : money(promotion.value) + ' off'}
            </T>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(promotion ? '/promotions' : '/explore')}
            style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <T style={{ fontWeight: '700', color: c.blueText }}>
              {' '}
              {promotion ? 'View offer' : 'Shop now'} →
            </T>
          </Pressable>
        </View>
        <View style={{ width: '33%', maxWidth: 150, aspectRatio: 0.82, justifyContent: 'center' }}>
          {image ? (
            <ProductImage uri={image} style={{ height: '100%', backgroundColor: c.transparent }} />
          ) : (
            <Image
              source={require('../../assets/brand/milk.png')}
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </View>
      </Row>
    </View>
  );
}
export function BottomSheet({ visible, onClose, title, children }) {
  const reduce = useReducedMotion(),
    insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduce ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            backgroundColor: c.white,
            padding: 24,
            paddingBottom: Math.max(insets.bottom, 24),
            gap: 20,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 4,
              backgroundColor: c.line,
              alignSelf: 'center',
            }}
          />
          <Row between>
            <T heading style={{ flex: 1 }}>
              {title}
            </T>
            <IconButton icon="close" label="Close sheet" onPress={onClose} />
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function StatusBadge({ status }) {
  const positive = ['paid', 'completed', 'ready_for_pickup', 'resolved'].includes(status);
  const negative = ['cancelled', 'failed', 'rejected'].includes(status);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: positive ? c.successSoft : negative ? c.dangerSoft : c.blueSoft,
      }}
    >
      <T
        style={{
          fontSize: 12,
          lineHeight: 18,
          fontWeight: '700',
          color: positive ? c.success : negative ? c.danger : c.blueText,
        }}
      >
        {label(status)}
      </T>
    </View>
  );
}
const orderSteps = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup', 'completed'];
export function OrderTimeline({ order }) {
  const index = orderSteps.indexOf(order.status);
  return (
    <Card>
      <T heading>Your pickup journey</T>
      <Progress value={Math.max(0, index) / 4} />
      {orderSteps.map((step, i) => {
        const event = order.statusHistory?.find((e) => e.status === step);
        const reached = !!event || i === index;
        return (
          <Entrance key={step}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons
                  name={reached ? 'checkmark-circle' : 'ellipse-outline'}
                  size={25}
                  color={reached ? c.blueText : c.placeholder}
                />
                {i < 4 ? (
                  <View style={{ width: 2, height: 20, backgroundColor: c.line, marginTop: 5 }} />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: i === index ? '700' : '400' }}>{label(step)}</T>
                {event ? (
                  <T muted style={{ fontSize: 12 }}>
                    {dateTime(event.changedAt)}
                  </T>
                ) : null}
                {step === 'ready_for_pickup' && index === i ? (
                  <T muted>Bring your order code to the store.</T>
                ) : null}
              </View>
              {index === i ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.blue,
                    marginTop: 8,
                  }}
                />
              ) : null}
            </Row>
          </Entrance>
        );
      })}
      {['cancelled', 'failed'].includes(order.status) ? (
        <Notice error>
          {label(order.status)} · {dateTime(order.updatedAt)}
        </Notice>
      ) : null}
    </Card>
  );
}
export function MenuItem({ title, description, icon, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 8,
        minHeight: 52,
        borderBottomWidth: 0,
        borderColor: c.line,
      })}
    >
      <View style={{ backgroundColor: c.blueSoft, padding: 9, borderRadius: 12 }}>
        <Ionicons name={icon} size={21} color={c.blueText} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600' }}>{title}</T>
        {description ? (
          <T muted style={{ fontSize: 12 }}>
            {description}
          </T>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}

export function MenuGroup({ title, items }) {
  return (
    <View style={{ gap: 8 }}>
      <T heading>{title}</T>
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {items.map((item) => (
          <MenuItem key={item.title} {...item} />
        ))}
      </Card>
    </View>
  );
}
