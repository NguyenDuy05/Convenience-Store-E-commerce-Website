import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../components/ui';
import { Entrance } from '../components/commerce';
import { colors, radius, shadow } from '../theme/tokens';
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timeout = useRef(null),
    insets = useSafeAreaInsets();
  const show = useCallback((text) => {
    clearTimeout(timeout.current);
    setMessage(text);
    timeout.current = setTimeout(() => setMessage(''), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timeout.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20 }}
        >
          <Entrance>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${message}. Dismiss notification`}
              onPress={() => setMessage('')}
              style={{
                padding: 16,
                backgroundColor: colors.ink,
                borderRadius: radius.md,
                ...shadow.card,
              }}
            >
              <T
                accessibilityLiveRegion="polite"
                style={{ color: colors.white, textAlign: 'center' }}
              >
                {message}
              </T>
            </Pressable>
          </Entrance>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
