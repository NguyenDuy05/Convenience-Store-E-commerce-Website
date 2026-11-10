import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Modal, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  FadeIn,
} from 'react-native-reanimated';
import { Brand } from '../../components/commerce';
import { Button, T, Row, Notice } from '../../components/ui';
import { secure } from '../../services/storage';
import { useSession } from '../../context/Session';
import { colors as c, radius, shadow, typography } from '../../theme/tokens';

const key = 'quick.onboarding.v1';
// Only a non-sensitive preference is stored on web; authentication stays in SecureStore.
const preference = {
  get: async () =>
    Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) : secure.get(key),
  set: async () =>
    Platform.OS === 'web' ? globalThis.localStorage?.setItem(key, 'done') : secure.set(key, 'done'),
};
export function BrandScene({ step = 0, compact = false }) {
  const reduce = useReducedMotion();
  const icon = ['storefront-outline', 'search-outline', 'bag-handle-outline', 'storefront-outline'][
    step
  ];
  return (
    <Animated.View
      key={step}
      entering={reduce ? undefined : FadeIn.duration(320)}
      accessible
      accessibilityLabel={
        [
          'QUICK store',
          'Discover your everyday essentials',
          'Choose products for your bag',
          'Collect your order at QUICK',
        ][step]
      }
      style={{
        height: compact ? 152 : 270,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: compact ? 140 : 240,
          height: compact ? 140 : 240,
          backgroundColor: c.lime,
          borderRadius: 120,
          transform: [{ rotate: '-12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '6%',
          top: 0,
          width: 52,
          height: 52,
          backgroundColor: c.yellow,
          borderRadius: 19,
          transform: [{ rotate: '20deg' }],
        }}
      />
      <View
        style={{
          width: compact ? 100 : 158,
          height: compact ? 110 : 176,
          borderRadius: radius.xl,
          backgroundColor: c.white,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transform: [{ rotate: '-5deg' }],
          ...shadow.card,
        }}
      >
        <Ionicons name={icon} size={compact ? 50 : 76} color={c.blue} />
        <T heading style={{ color: c.blueText }}>
          QUICK
        </T>
      </View>
      {!compact && step < 3 ? (
        <>
          <Image
            source={require('../../../assets/brand/snack.png')}
            contentFit="contain"
            style={{
              position: 'absolute',
              width: 90,
              height: 120,
              left: 8,
              bottom: 0,
              transform: [{ rotate: '-12deg' }],
            }}
          />
          <Image
            source={require('../../../assets/brand/milk.png')}
            contentFit="contain"
            style={{
              position: 'absolute',
              width: 86,
              height: 110,
              right: 8,
              top: 26,
              transform: [{ rotate: '12deg' }],
            }}
          />
        </>
      ) : null}
      {step === 3 ? (
        <View
          style={{
            position: 'absolute',
            right: 12,
            bottom: 0,
            padding: 16,
            borderRadius: 20,
            backgroundColor: c.yellow,
            ...shadow.card,
          }}
        >
          <Ionicons name="checkmark-circle" size={36} color={c.success} />
          <T style={{ fontWeight: '700' }}>Pick up at QUICK</T>
        </View>
      ) : null}
    </Animated.View>
  );
}
export function BrandSplash() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: c.sky,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <BrandScene compact />
      <Brand />
      <T muted>Quick Picks, Happy Days.</T>
    </SafeAreaView>
  );
}
function Dot({ active }) {
  const width = useSharedValue(active ? 28 : 8),
    reduce = useReducedMotion();
  useEffect(() => {
    width.value = withTiming(active ? 28 : 8, { duration: reduce ? 0 : 180 });
  }, [active, width, reduce]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View
      style={[{ height: 8, borderRadius: 8, backgroundColor: active ? c.blue : c.line }, style]}
    />
  );
}
const slides = [
  {
    title: 'Everything you need, all in one place.',
    body: 'Explore everyday essentials and discover great deals.',
    step: 1,
    tag: '01 / DISCOVER',
  },
  {
    title: 'Pick your favorites.',
    body: 'Add products to your bag. Use wallet credit first, then pay the rest with VNPay.',
    step: 2,
    tag: '02 / ORDER & PAY',
  },
  {
    title: 'Ready when you are.',
    body: 'Follow your order. When it’s ready, bring your order code to QUICK and pick it up in person.',
    step: 3,
    tag: '03 / PICK UP AT QUICK',
  },
];
export default function WelcomeFlow({ children }) {
  const { user, loading } = useSession(),
    path = usePathname();
  const [visible, setVisible] = useState(false),
    [checking, setChecking] = useState(true),
    [intro, setIntro] = useState(true),
    [page, setPage] = useState(0),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const list = useRef(null),
    initialPath = useRef(path),
    reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    if (!loading)
      preference
        .get()
        .then((saved) => {
          if (active && !saved && !user && ['/', '/login'].includes(initialPath.current))
            setVisible(true);
        })
        .catch(() => {
          if (active && !user && initialPath.current === '/') setVisible(true);
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    return () => {
      active = false;
    };
  }, [loading, user]);
  const finish = async (destination) => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await preference.set();
      setVisible(false);
      router.replace(destination);
    } catch {
      setError('Could not save your welcome preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      {children}
      <Modal
        visible={checking || visible}
        animationType={reduce ? 'none' : 'fade'}
        onRequestClose={() => {
          if (!checking) finish('/');
        }}
      >
        {checking ? (
          <BrandSplash />
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: c.sky }}>
            <Row between style={{ paddingHorizontal: 24, paddingTop: 12 }}>
              <Brand small />
              {!intro ? (
                <Button title="Skip" secondary onPress={() => finish('/')} busy={saving} />
              ) : null}
            </Row>
            {intro ? (
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                  paddingHorizontal: 28,
                  gap: 12,
                }}
              >
                <BrandScene />
                <T
                  style={{
                    ...typography.caption,
                    color: c.blueText,
                    textAlign: 'center',
                    letterSpacing: 2,
                    fontWeight: '700',
                  }}
                >
                  QUICK PICKS, HAPPY DAYS.
                </T>
                <T title style={{ textAlign: 'center', fontSize: 40, lineHeight: 46 }}>
                  Welcome to QUICK!
                </T>
                <T muted style={{ textAlign: 'center', paddingHorizontal: 16 }}>
                  Shop your everyday essentials in just a few taps.
                </T>
              </ScrollView>
            ) : (
              <View
                style={{ flex: 1 }}
                onLayout={() => list.current?.scrollTo({ x: page * width, animated: false })}
              >
                <ScrollView
                  ref={list}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setPage(Math.round(e.nativeEvent.contentOffset.x / width))
                  }
                >
                  {slides.map((slide) => (
                    <ScrollView
                      key={slide.step}
                      style={{ width }}
                      contentContainerStyle={{
                        padding: 28,
                        flexGrow: 1,
                        justifyContent: 'center',
                        gap: 12,
                      }}
                    >
                      <BrandScene step={slide.step} />
                      <T
                        style={{
                          ...typography.caption,
                          color: c.blueText,
                          letterSpacing: 1.5,
                          fontWeight: '700',
                        }}
                      >
                        {slide.tag}
                      </T>
                      <T title>{slide.title}</T>
                      <T muted>{slide.body}</T>
                    </ScrollView>
                  ))}
                </ScrollView>
                <Row style={{ justifyContent: 'center', paddingVertical: 16 }}>
                  {slides.map((s, i) => (
                    <Dot key={s.step} active={page === i} />
                  ))}
                </Row>
              </View>
            )}
            <View style={{ padding: 24, gap: 12 }}>
              <Notice error>{error}</Notice>
              <Button
                title={intro ? 'Get Started' : page === 2 ? 'Create your QUICK account' : 'Next'}
                icon="arrow-forward"
                busy={saving}
                onPress={() => {
                  if (intro) setIntro(false);
                  else if (page === 2) finish('/login?mode=register');
                  else {
                    const next = page + 1;
                    setPage(next);
                    list.current?.scrollTo({ x: next * width, animated: !reduce });
                  }
                }}
              />
              <Button
                title={intro ? 'Explore as Guest' : 'Browse without an account'}
                secondary
                busy={saving}
                onPress={() => finish('/')}
              />
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </>
  );
}
