import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';
export function Progress({ value }) {
  const progress = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value || 0)), {
      duration: reduce ? 0 : 400,
    });
  }, [value, reduce, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round((value || 0) * 100) }}
      style={{ height: 8, backgroundColor: colors.line, borderRadius: 8, overflow: 'hidden' }}
    >
      <Animated.View
        style={[{ height: 8, backgroundColor: colors.blue, borderRadius: 8 }, style]}
      />
    </View>
  );
}
