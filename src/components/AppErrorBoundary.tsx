import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { colors, font } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

/**
 * Exported as the root layout's ErrorBoundary (LAUNCH-AUDIT H22): a screen that
 * throws while rendering shows this instead of closing the app, and the error
 * is reported (when Sentry has a DSN).
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <View style={s.screen}>
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.body}>This screen hit a problem. Try again, or go back to Home.</Text>
      <Button label="Try again" onPress={() => { void retry(); }} />
      {/* A screen that fails every time needs a way out other than Try again. */}
      <Button label="Go to Home" variant="secondary" onPress={() => { router.replace('/'); void retry(); }} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.text2, marginBottom: 12 },
});
