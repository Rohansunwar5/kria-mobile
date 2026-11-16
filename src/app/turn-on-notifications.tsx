import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, display, font } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { askPushPermission, registerPushToken } from '@/lib/push';
import { setItem } from '@/lib/secureStore';
import { PUSH_ASKED_KEY } from '@/lib/usePushAsk';
import { useAppSelector } from '@/store/hooks';

const MOMENTS: { icon: IconName; title: string; line: string }[] = [
  { icon: 'how_to_reg', title: 'Your entry is decided', line: "Approved, or not, with the organiser's reason" },
  { icon: 'gavel', title: "You're sold at auction", line: 'Which team picked you, and for how much' },
  { icon: 'play_circle', title: 'Your match is starting', line: "The round, who you're playing and the court" },
  { icon: 'campaign', title: 'Tournament news', line: "Announcements from events you've entered" },
  { icon: 'group_add', title: "You're added to a quick match", line: 'When a host puts you on a side' },
];

/** The one-time ask, shown from Home. Either answer is remembered and never asked again. */
export default function TurnOnNotifications() {
  const router = useRouter();
  const playerId = useAppSelector((s) => s.auth.user)?._id;
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    await setItem(PUSH_ASKED_KEY, '1').catch(() => {});
    goBack(router);
  };
  const turnOn = async () => {
    setBusy(true);
    const granted = await askPushPermission().catch(() => false);
    if (granted && playerId) await registerPushToken(playerId);
    await finish();
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.top}>
        <View style={s.badge}><Icon name="notifications_active" size={32} color={colors.accent} /></View>
        <View style={s.head}>
          <Text accessibilityRole="header" style={s.title}>{"Know when it's your turn."}</Text>
          <Text style={s.sub}>{"Only for things you're part of. No promotions."}</Text>
        </View>
        <View>
          {MOMENTS.map((m) => (
            <View key={m.icon} style={s.row}>
              <Icon name={m.icon} size={22} color={colors.text2} />
              <View style={s.copy}>
                <Text style={s.rowTitle}>{m.title}</Text>
                <Text style={s.rowLine}>{m.line}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={s.bottom}>
        <Button label="Turn on notifications" onPress={turnOn} busy={busy} />
        <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={finish} disabled={busy} style={s.skip}>
          <Text style={s.skipText}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 16, justifyContent: 'space-between' },
  top: { paddingTop: 48, gap: 28 },
  badge: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  head: { gap: 10 },
  title: { ...display(44) },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong },
  copy: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  rowLine: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  bottom: { gap: 6 },
  skip: { height: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: font.semibold, fontSize: 14, color: colors.text3 },
});
