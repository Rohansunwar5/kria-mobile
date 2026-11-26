import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getNotifications, markNotificationsRead, type AppNotification } from '@/api/notifications';
import { TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, space } from '@/constants/theme';
import { askPushPermission, canAskAgain, pushPermission, registerPushToken } from '@/lib/push';
import { goBack } from '@/lib/nav';
import { NOTIFICATION_ICON, rowContext, splitBySeen, targetHref } from '@/lib/notificationsView';
import { useAppSelector } from '@/store/hooks';

const PAGE = 30; // the server's page size

export default function Notifications() {
  const router = useRouter();
  const playerId = useAppSelector((s) => s.auth.user)?._id;
  const [items, setItems] = useState<AppNotification[] | null>(null);
  // Fixed at load: rows that were new keep their dot until the player leaves.
  const [seenAt, setSeenAt] = useState<string | null>(null);
  // The first page failed while there are no rows; Load more failed once there are.
  const [failed, setFailed] = useState(false);
  const [end, setEnd] = useState(false);
  const [more, setMore] = useState(false);
  const [off, setOff] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await getNotifications();
      setItems(page.notifications);
      setSeenAt(page.seenAt);
      setEnd(page.notifications.length < PAGE);
      markNotificationsRead(page.notifications[0]?.createdAt).catch(() => {}); // the dot clears next time Home looks
    } catch {
      setFailed(true);
    }
  }, []);

  // Expo Go can fail here: treat that as not granted, never as a crash.
  const checkPermission = useCallback(async () => {
    setOff(await pushPermission().then((p) => p !== 'granted', () => true));
  }, []);
  // Load once: coming back from a row must not re-split New and Earlier. Permission is re-read, as the player may have used Settings.
  const loaded = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!loaded.current) {
      loaded.current = true;
      load();
    }
    checkPermission();
  }, [load, checkPermission]));

  const turnOn = async () => {
    const again = await canAskAgain().catch(() => true);
    if (!again) {
      Linking.openSettings().catch(() => {});
      return;
    }
    const granted = await askPushPermission().catch(() => false);
    if (granted && playerId) await registerPushToken(playerId);
    await checkPermission();
  };

  const loadMore = async () => {
    const oldest = items?.[items.length - 1]?.createdAt;
    if (more || end || !oldest) return;
    setMore(true);
    setFailed(false);
    try {
      const next = (await getNotifications(oldest)).notifications;
      setItems((cur) => [...(cur ?? []), ...next]);
      if (next.length < PAGE) setEnd(true);
    } catch {
      setFailed(true);
    }
    setMore(false);
  };

  const open = (n: AppNotification) => {
    const href = targetHref(n.target);
    if (href) router.push(href as never);
  };

  const now = new Date();
  const { fresh, earlier } = splitBySeen(items ?? [], seenAt);
  const empty = items !== null && items.length === 0;

  const section = (title: string, list: AppNotification[], isNew: boolean) =>
    list.length ? (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
        {list.map((n) => (
          <Pressable
            key={n._id}
            accessibilityRole="button"
            accessibilityLabel={`${isNew ? 'Unread. ' : ''}${n.title}${n.detail ? `. ${n.detail}` : ''}. ${rowContext(n, now)}`}
            onPress={() => open(n)} style={s.row}>
            <View style={s.iconCircle}><Icon name={NOTIFICATION_ICON[n.kind]} size={21} color={colors.text2} /></View>
            <View style={s.body}>
              <Text style={s.title}>{n.title}</Text>
              {n.detail ? <Text style={s.detail} numberOfLines={2}>{n.detail}</Text> : null}
              <Text style={s.context}>{rowContext(n, now)}</Text>
            </View>
            {isNew ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.dot} /> : null}
          </Pressable>
        ))}
      </View>
    ) : null;

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Notifications" onBack={() => goBack(router, '/(tabs)/home')} />
      {off ? (
        <View style={s.bar}>
          <Icon name="notifications_off" size={22} color={colors.text2} />
          <Text style={s.barText}>{"Notifications are off on this phone. You'll still find them here."}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Turn on" onPress={turnOn} hitSlop={4} style={s.turnOn}>
            <Text style={s.turnOnText}>Turn on</Text>
          </Pressable>
        </View>
      ) : null}

      {failed && !items ? <InlineError what="Couldn't load notifications." onRetry={() => { setFailed(false); load(); }} /> : null}
      {items === null && !failed ? (
        <View style={s.skeletons}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 64 }} />)}
        </View>
      ) : null}

      {empty ? (
        <View style={s.empty}>
          <Icon name="notifications" size={48} color={colors.text3} />
          <Text style={display(36)}>Nothing yet</Text>
          <Text style={s.emptyLine}>{"Enter a tournament and you'll hear when your entry is decided, when you're sold at auction, when your match starts and when the organiser posts news."}</Text>
          <Button variant="secondary" label="Find an event" onPress={() => router.push('/(tabs)/events')} style={{ marginTop: 10, height: 52 }} />
        </View>
      ) : items?.length ? (
        <ScrollView contentContainerStyle={s.list}>
          {section('New', fresh, true)}
          {section('Earlier', earlier, false)}
          {failed ? <InlineError what="Couldn't load more notifications." onRetry={loadMore} />
            : !end ? <Button variant="secondary" label="Load more" busyLabel="Loading more" busy={more} onPress={loadMore} /> : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { marginTop: 8, marginHorizontal: space.gutter, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surface1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  barText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text2 },
  turnOn: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  turnOnText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  skeletons: { gap: 14, padding: space.gutter },
  list: { paddingTop: 8, paddingHorizontal: space.gutter, paddingBottom: 32, gap: space.sectionGap },
  section: {},
  sectionTitle: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, color: colors.text, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: space.rowY, borderBottomWidth: 1, borderBottomColor: colors.line },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: colors.text },
  detail: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text2 },
  context: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text3 },
  dot: { width: 7, height: 7, marginTop: 7, borderRadius: 4, backgroundColor: colors.accent },
  empty: { flex: 1, justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingBottom: 120 },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3 },
});
