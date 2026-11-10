import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  useReducedMotion,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, usePathname, useLocalSearchParams } from 'expo-router';
import { colors as c, typography, radius, shadow, layout } from '../theme/tokens';
import { useSession } from '../context/Session';
import { API_URL, errorText } from '../services/api';
import { imageUrl } from '../utils/domain';

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.paper },
  content: { padding: layout.page, gap: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { ...typography.h1, color: c.ink },
  heading: { ...typography.h2, color: c.ink },
  text: { ...typography.body, color: c.ink },
  muted: { color: c.muted, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: c.white,
    padding: 16,
    borderRadius: radius.lg,
    gap: 12,
    ...shadow.card,
  },
  input: {
    minHeight: 52,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: c.ink,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    fontFamily: 'Inter',
    fontSize: 16,
  },
  chip: {
    borderRadius: 24,
    paddingHorizontal: 17,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
  },
});
export function T({ children, muted, heading, title, style, ...props }) {
  return (
    <Text
      {...props}
      style={[
        styles.text,
        muted && styles.muted,
        heading && styles.heading,
        title && styles.title,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({ children, between, style }) {
  return <View style={[between ? styles.between : styles.row, style]}>{children}</View>;
}
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
  style,
  top = false,
  footer,
}) {
  return (
    <SafeAreaView edges={top ? ['top'] : ['bottom']} style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%', maxWidth: layout.formWidth, alignSelf: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={top ? 0 : 88}
      >
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, style]}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={c.blue}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
        {footer ? (
          <View
            style={{
              padding: 16,
              gap: 12,
              backgroundColor: c.white,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              ...shadow.floating,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
  danger = false,
  icon,
  style,
  accessibilityLabel,
  compact = false,
}) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const unavailable = disabled || busy;
  const foreground = secondary ? (danger ? c.danger : c.blueText) : c.white;
  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: unavailable, busy }}
        disabled={unavailable}
        onPress={onPress}
        onPressIn={() => {
          if (!reduce) scale.set(withTiming(0.97, { duration: 90 }));
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: reduce ? 0 : 150 }));
        }}
        style={{
          minHeight: compact ? 44 : 48,
          paddingHorizontal: compact ? 12 : 16,
          paddingVertical: compact ? 8 : 10,
          borderRadius: 16,
          backgroundColor: secondary ? c.blueSoft : danger ? c.danger : c.blue,
          opacity: unavailable ? 0.5 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 9,
        }}
      >
        {busy ? (
          <ActivityIndicator color={foreground} />
        ) : icon ? (
          <Ionicons name={icon} size={20} color={foreground} />
        ) : null}
        <T
          style={{
            color: foreground,
            fontWeight: '700',
            fontSize: compact || secondary ? 15 : 18.7,
            lineHeight: 25,
            textAlign: 'center',
            flexShrink: 1,
          }}
        >
          {title}
        </T>
      </Pressable>
    </Animated.View>
  );
}
export function Field({ label, error, style, secureTextEntry, ...props }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <T style={{ fontSize: 14, fontWeight: '600' }}>{label}</T>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.placeholder}
          autoCapitalize="none"
          style={[
            styles.input,
            props.multiline && { minHeight: 110, textAlignVertical: 'top' },
            focused && { borderColor: c.blue, backgroundColor: c.blueSoft },
            error && { borderColor: c.danger },
            secureTextEntry && { paddingRight: 56 },
            style,
          ]}
          {...props}
          secureTextEntry={secureTextEntry && !visible}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible(!visible)}
            style={{ position: 'absolute', right: 4, padding: 14 }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={c.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Notice error>{error}</Notice> : null}
    </View>
  );
}
export function Notice({ children, error = false, success = false }) {
  return children ? (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: error ? c.dangerSoft : success ? c.successSoft : c.sky,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <T style={{ color: error ? c.danger : c.ink, fontSize: 14 }}>{children}</T>
    </View>
  ) : null;
}
export function Chip({ title, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: c.blueSoft, borderColor: c.blue },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <T style={{ fontSize: 14, color: selected ? c.blueText : c.ink, fontWeight: '600' }}>
        {title}
      </T>
    </Pressable>
  );
}
export function Empty({
  title = 'Nothing here yet',
  message,
  icon = 'bag-outline',
  action,
  onPress,
}) {
  return (
    <View style={{ paddingVertical: 32, gap: 12, alignItems: 'center' }}>
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: radius.xl,
          backgroundColor: c.white,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          ...shadow.card,
        }}
      >
        <Ionicons name={icon} size={44} color={c.blue} />
        <View
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            width: 25,
            height: 25,
            borderRadius: 13,
            backgroundColor: c.yellow,
          }}
        />
      </View>
      <T heading style={{ textAlign: 'center' }}>
        {title}
      </T>
      {message && (
        <T muted style={{ textAlign: 'center' }}>
          {message}
        </T>
      )}
      {action && <Button title={action} onPress={onPress} />}
    </View>
  );
}
export function Skeleton() {
  const opacity = useSharedValue(0.55);
  const reduce = useReducedMotion();
  useEffect(() => {
    opacity.value = reduce ? 0.7 : withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [reduce, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View accessibilityLabel="Loading" style={[{ gap: 14, padding: 12 }, animated]}>
      {[130, 24, 24].map((height, i) => (
        <View
          key={i}
          style={{
            height,
            borderRadius: 18,
            backgroundColor: c.line,
            width: i === 2 ? '65%' : '100%',
          }}
        />
      ))}
    </Animated.View>
  );
}
export function QueryState({ query, children }) {
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <Empty
        title="Could not load this"
        message={errorText(query.error)}
        action="Try again"
        onPress={() => query.refetch()}
        icon="cloud-offline-outline"
      />
    );
  return children;
}
export function Gate({ children }) {
  const { user, loading, restoreError, restore, clear } = useSession();
  const path = usePathname();
  const params = useLocalSearchParams();
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => typeof value === 'string'),
  ).toString();
  const next = path + (query ? `?${query}` : '');
  if (loading)
    return (
      <Screen>
        <Skeleton />
      </Screen>
    );
  if (restoreError)
    return (
      <Screen>
        <Notice error>{restoreError}</Notice>
        <Button title="Reconnect" onPress={restore} />
        <Button title="Continue as guest" secondary onPress={() => clear().catch(() => {})} />
      </Screen>
    );
  if (!user)
    return (
      <Screen top>
        <Empty
          title="Your QUICK, everywhere"
          message="Log in with your website account to access your cart, orders and rewards."
          action="Log in or sign up"
          onPress={() => router.push({ pathname: '/login', params: { next } })}
          icon="person-circle-outline"
        />
      </Screen>
    );
  return children;
}
export function ProductImage({ uri, style, name = 'Product' }) {
  const [failedSource, setFailedSource] = useState(null);
  const source = imageUrl(uri, API_URL);
  const reduce = useReducedMotion();
  return (
    <View
      style={[
        {
          backgroundColor: c.blueSoft,
          borderRadius: 18,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          height: 150,
        },
        style,
      ]}
    >
      {source && failedSource !== source ? (
        <Image
          source={source}
          accessibilityLabel={name}
          cachePolicy="memory-disk"
          recyclingKey={source}
          contentFit="contain"
          transition={reduce ? 0 : 180}
          onError={() => setFailedSource(source)}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <View style={{ alignItems: 'center', gap: 4, padding: 8 }}>
          <Ionicons name="bag-handle-outline" size={28} color={c.blueText} />
          <T muted style={{ fontSize: 12, textAlign: 'center' }}>
            {source ? 'Image unavailable' : 'Photo coming soon'}
          </T>
          {source ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry product image"
              onPress={() => setFailedSource(null)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <T style={{ fontSize: 12, color: c.blueText }}>Retry</T>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
export function Quantity({ value, max, onChange, disabled }) {
  return (
    <Row style={{ gap: 0, backgroundColor: c.blueSoft, borderRadius: 12, alignSelf: 'flex-start' }}>
      {[-1, 0, 1].map((step) =>
        step === 0 ? (
          <AnimatedValue key="value" value={value}>
            <T
              accessibilityLiveRegion="polite"
              style={{ fontWeight: '700', minWidth: 28, textAlign: 'center' }}
            >
              {value}
            </T>
          </AnimatedValue>
        ) : (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={step < 0 ? 'Decrease quantity' : 'Increase quantity'}
            disabled={disabled || (step < 0 ? value <= 1 : value >= max)}
            onPress={() => onChange(value + step)}
            style={({ pressed }) => ({
              width: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity:
                disabled || (step < 0 ? value <= 1 : value >= max) ? 0.35 : pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name={step < 0 ? 'remove' : 'add'} size={18} color={c.blueText} />
          </Pressable>
        ),
      )}
    </Row>
  );
}
export function AnimatedValue({ value, children }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View key={String(value)} entering={reduce ? undefined : FadeIn.duration(160)}>
      {children}
    </Animated.View>
  );
}
export function StoreCard({ store, notice }) {
  const [error, setError] = useState('');
  if (!store) return <Notice>Pickup location is unavailable. Refresh before checking out.</Notice>;
  const open = (url) =>
    Linking.openURL(url).catch(() => setError('Could not open this link on your device.'));
  return (
    <Card>
      <Row>
        <Ionicons name="storefront" size={28} color={c.blue} />
        <View style={{ flex: 1 }}>
          <T heading>{store.name}</T>
          <T muted>In-store pickup</T>
        </View>
      </Row>
      <T>{store.address}</T>
      {store.phone ? <T muted>{store.phone}</T> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      <Row>
        {store.phone ? (
          <Button
            title="Call store"
            secondary
            icon="call-outline"
            onPress={() => open(`tel:${store.phone.replace(/[^+\d]/g, '')}`)}
            style={{ flex: 1 }}
          />
        ) : null}
        {store.address ? (
          <Button
            title="Directions"
            secondary
            icon="navigate-outline"
            onPress={() =>
              open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`,
              )
            }
            style={{ flex: 1 }}
          />
        ) : null}
      </Row>
      {store.openingHours?.length ? (
        <T muted>
          {store.openingHours.length === 7 &&
          store.openingHours.every(
            (d) =>
              !d.isClosed &&
              d.openTime === store.openingHours[0].openTime &&
              d.closeTime === store.openingHours[0].closeTime,
          )
            ? `Daily · ${store.openingHours[0].openTime}–${store.openingHours[0].closeTime}`
            : store.openingHours
                .filter((d) => !d.isClosed)
                .map(
                  (d) =>
                    `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.day]} ${d.openTime}–${d.closeTime}`,
                )
                .join(' · ')}
        </T>
      ) : null}
      <Notice error>{error}</Notice>
    </Card>
  );
}
