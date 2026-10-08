import { Alert, ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock } from '@/components/states';
import { Badge } from '@/components/profile/Badge';
import { BracketTree } from '@/components/knockout/BracketTree';
import { KnockoutDrawBar, KnockoutWaitingRoom } from '@/components/knockout/KnockoutWaitingRoom';
import { useQuickKnockout } from '@/lib/useQuickKnockout';
import { championName, formatLabel, isKnockoutHost } from '@/lib/quickKnockoutView';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';

export default function KnockoutScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const ko = useQuickKnockout(id);
  const k = ko.knockout;
  const host = k ? isKnockoutHost(k, user?._id) : false;
  const drawBar = Boolean(k && k.status === 'waiting' && host);

  // One tap would end it for everyone, unfinished matches included.
  const confirmCancel = () =>
    Alert.alert('Cancel this knockout?', 'Every unfinished match is cancelled too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Cancel knockout', style: 'destructive', onPress: ko.cancel },
    ]);

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/quick')} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <Icon name="arrow-left" size={22} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={ko.loading && Boolean(k)} onRefresh={ko.reload} tintColor={t.brand} />}>
        {ko.loading && !k ? <View style={{ paddingHorizontal: 20, gap: 12 }}><Skeleton h={28} w="45%" line /><Skeleton h={160} /></View> : null}
        {ko.error && !k ? <View style={{ paddingHorizontal: 20 }}><ErrorBlock label="Knockout" onRetry={ko.reload} /></View> : null}

        {k && k.status === 'waiting' ? (
          <KnockoutWaitingRoom
            knockout={k} playerId={user?._id} busy={ko.busy}
            onAddGuest={ko.addGuest} onAddPlayer={ko.addPlayer} onRemove={ko.removePlayer} onPair={ko.pair} onUnpair={ko.unpair}
            onMove={ko.moveToTeam} onAddTeam={ko.addTeam} onRemoveTeam={ko.removeTeam} onRenameTeam={ko.renameTeam}
          />
        ) : null}

        {k && k.status !== 'waiting' ? (
          <>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.brandInk }}>
                {`Knockout · ${formatLabel(k)} · ${k.status}`}
              </Text>
              <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 6 }}>{k.name}</Text>
            </View>

            {k.status === 'completed' && k.championEntrantId ? (
              <View style={{ marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 6, borderWidth: 1.5, borderColor: t.brand, backgroundColor: t.brandTint, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Badge badge="knockout-winner" size={44} />
                <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>{`${championName(k)} won ${k.name}`}</Text>
              </View>
            ) : null}

            {host && k.status === 'completed' && k.awardsEligible && k.awards.length < 3 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/knockout/awards/[id]', params: { id: k._id } })} style={{ marginHorizontal: 20, marginTop: 12, minHeight: 48, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.onBrand }}>Give awards</Text>
              </Pressable>
            ) : null}

            <BracketTree knockout={k} onOpenMatch={(matchId) => router.push({ pathname: '/quick/[id]', params: { id: matchId } })} />

          </>
        ) : null}

        {host && k && (k.status === 'waiting' || k.status === 'live') ? (
          <Pressable accessibilityRole="button" onPress={confirmCancel} disabled={ko.busy} style={{ marginHorizontal: 20, marginTop: 24, minHeight: 48, borderRadius: 5, borderWidth: 1.5, borderColor: t.fail, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.failInk }}>Cancel knockout</Text>
          </Pressable>
        ) : null}

        {ko.problem && !drawBar ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk, marginTop: 16, paddingHorizontal: 20 }}>{ko.problem}</Text> : null}
      </ScrollView>

      {k && drawBar ? <KnockoutDrawBar knockout={k} busy={ko.busy} problem={ko.problem} onDraw={ko.draw} onStart={ko.start} /> : null}
    </Screen>
  );
}
