import React from 'react';
import { router } from 'expo-router';
import { Screen, Empty } from '../components/ui';
export default function NotFound() {
  return (
    <Screen>
      <Empty title="Page not found" action="Go home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
