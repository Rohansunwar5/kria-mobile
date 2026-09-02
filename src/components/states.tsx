import { useEffect } from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, type IconName } from '@/components/icons';

// The four patterns from Patterns.dc.html. Every screen used to do
// `if (loading) return <ActivityIndicator />`, which blanks header, hero and
// nav then snaps back. These keep the chrome in place so nothing jumps.


/** Low-opacity oversized display type. RN has no text stroke, so this is
 *  .ghostfill from the canvas, not .ghost. */
export function Ghost({ text, size, color, style }: { text: string; size: number; color?: string; style?: ViewStyle }) {
  return (
    <Text
      style={[
        {
          position: 'absolute',
          pointerEvents: 'none',
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: size,
          lineHeight: size * 0.78,
          color: color ?? 'rgba(255,255,255,0.045)',
        },
        style as any,
      ]}
    >
      {text}
    </Text>
  );
}

/** 01 — Skeleton, not spinner. Block shapes match the real card geometry, so
 *  nothing shifts when data lands. `line` renders the flat text-bar variant. */
export function Skeleton({ h, w, line, style }: { h: number; w?: number | string; line?: boolean; style?: ViewStyle }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.55, { duration: 850 }), -1, true);
  }, [pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const box = { height: h, width: (w ?? '100%') as any };

  if (line) {
    return <Animated.View style={[box, { borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.10)' }, anim, style as any]} />;
  }
  return (
    <Animated.View style={[box, { borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }, anim, style as any]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.11)', 'rgba(255,255,255,0.05)']}
        locations={[0, 0.45, 0.9]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.2 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

/** 02 — Empty with a way out. Names what would appear, and offers the single
 *  action that fills it. */
export function EmptyState({
  title,
  message,
  cta,
  onCta,
  icon = 'document',
  ghost,
}: {
  title: string;
  message: string;
  cta?: string;
  onCta?: () => void;
  icon?: IconName;
  ghost?: string;
}) {
  return (
    <View style={{ paddingHorizontal: 26, paddingTop: 40, position: 'relative', overflow: 'hidden' }}>
      {ghost ? <Ghost text={ghost} size={120} style={{ right: -24, bottom: 20 }} /> : null}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 5,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={26} color="#5c5c5c" strokeWidth={1.9} />
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 23, color: '#fff', marginTop: 14 }}>
        {title}
      </Text>
      <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#d4d4d4', marginTop: 9 }}>
        {message}
      </Text>
      {cta && onCta ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCta}
          style={{ height: 46, borderRadius: 5, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}
        >
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, letterSpacing: 0.04 * 15, color: '#0B0B0B' }}>
            {cta}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 03 — Error keeps its context. Scope this to the section that failed and
 *  leave the hero, tabs and back button rendered around it. */
export function ErrorBlock({
  label,
  title = 'Couldn’t reach the server',
  message,
  onRetry,
}: {
  label: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={{ borderWidth: 1.5, borderColor: '#FF4438', borderRadius: 6, backgroundColor: '#151515', overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FF4438' }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.16 * 9, textTransform: 'uppercase', color: '#2A0703' }}>
          {label}
        </Text>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#fff' }}>{title}</Text>
        {message ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#d4d4d4', marginTop: 5 }}>
            {message}
          </Text>
        ) : null}
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={onRetry}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 11,
              minHeight: 44, // canvas draws a 30px chip; hit targets stay 44
              paddingHorizontal: 12,
              borderRadius: 3,
              borderWidth: 1.5,
              borderColor: '#FF4438',
            }}
          >
            <Icon name="refresh" size={12} color="#FF4438" strokeWidth={2.4} />
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: '#FF4438' }}>
              Retry
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** 04 — Live data, dropped socket. Say how old the number is rather than
 *  blanking it or silently showing a wrong price. Dim the stale content itself
 *  with `opacity: 0.5` at the call site. */
export function StaleBanner({ secondsAgo, text }: { secondsAgo?: number; text?: string }) {
  const copy = text ?? `Reconnecting · Last update ${secondsAgo ?? 0}s ago`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 9,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderBottomWidth: 1.5,
        borderBottomColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#a3a3a3' }} />
      <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: '#d4d4d4' }}>
        {copy}
      </Text>
    </View>
  );
}
