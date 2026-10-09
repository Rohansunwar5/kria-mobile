import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons';
import { usePress } from '@/lib/motion';
import { useTheme } from '@/lib/theme';

/** Everything Host can start, one tap from any tab. The /quick/host chooser
 *  screen stays for links that go straight to it. */
export const HOST_OPTIONS: { title: string; hint: string; icon: IconName; href: '/quick/new' | '/knockout/new' | '/quick/join' }[] = [
  { title: 'Quick match', hint: 'One match: singles, doubles or cricket', icon: 'shuttlecock', href: '/quick/new' },
  { title: 'Knockout', hint: 'A badminton knockout for 3 to 16', icon: 'bracket', href: '/knockout/new' },
  { title: 'Join with a code', hint: 'Six characters from the host', icon: 'id-card', href: '/quick/join' },
];

function OptionRow({ option, divided, onPress }: { option: (typeof HOST_OPTIONS)[number]; divided: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { press, onPressIn, onPressOut } = usePress();
  const dim = useAnimatedStyle(() => ({ opacity: 1 - press.value * 0.4 }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.title}
      accessibilityHint={option.hint}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ minHeight: 60, justifyContent: 'center', ...(divided ? { borderTopWidth: 0.5, borderTopColor: theme.keyline } : null) }}
    >
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 }, dim]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={option.icon} size={19} color={theme.brandInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: theme.text }}>{option.title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.textMeta, marginTop: 2 }}>
            {option.hint}
          </Text>
        </View>
        <Icon name="chevron-right" size={14} color={theme.textFaint} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * A floating sheet of frosted glass over the current screen. Same RN `Modal`
 * + slide as FilterSheet, so the two sheets in the app move alike.
 */
export function HostSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const pick = (href: (typeof HOST_OPTIONS)[number]['href']) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }}
        />

        <View
          accessibilityViewIsModal
          style={{
            marginHorizontal: 8,
            marginBottom: 8 + insets.bottom,
            borderRadius: 26,
            overflow: 'hidden',
            borderWidth: 0.5,
            borderColor: theme.keyline,
          }}
        >
          <BlurView
            intensity={60}
            tint="dark"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ backgroundColor: theme.glass, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.handle, marginBottom: 12 }} />
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: theme.text, marginBottom: 4 }}>
              Host
            </Text>
            {HOST_OPTIONS.map((o, i) => (
              <OptionRow key={o.href} option={o} divided={i > 0} onPress={() => pick(o.href)} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
