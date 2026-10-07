import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock } from '@/components/states';
import { Badge } from '@/components/profile/Badge';
import { useQuickKnockout } from '@/lib/useQuickKnockout';
import { QUICK_AWARD_BADGES, awardablePlayers, championName, isKnockoutHost } from '@/lib/quickKnockoutView';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';

const MAX_AWARDS = 3;

/** Host only, once the knockout is finished. Low-tier badges; the server enforces every rule again. */
export default function KnockoutAwardsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const ko = useQuickKnockout(id);
  const k = ko.knockout;
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);

  const toBracket = () => router.dismissTo({ pathname: '/knockout/[id]', params: { id } });
  const host = k ? isKnockoutHost(k, user?._id) : false;
  const canGive = Boolean(k) && host && k!.status === 'completed' && k!.awardsEligible && k!.awards.length < MAX_AWARDS;
  const ready = Boolean(playerId && badge) && !ko.busy;

  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint };
  const body = { fontFamily: 'SpaceGrotesk_400Regular' as const, fontSize: 13, lineHeight: 19, color: t.textMeta };
  const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase' as const };
  const choice = (on: boolean) => ({ borderRadius: 6, borderWidth: 1.5, borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brandTint : t.fillSoft });

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/knockout')} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <Icon name="arrow-left" size={22} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {ko.loading && !k ? <View style={{ paddingHorizontal: 20, gap: 12 }}><Skeleton h={28} w="45%" line /><Skeleton h={160} /></View> : null}
        {ko.error && !k ? <View style={{ paddingHorizontal: 20 }}><ErrorBlock label="Knockout" onRetry={ko.reload} /></View> : null}

        {k && !host ? <Text style={{ ...body, paddingHorizontal: 20 }}>Only the host gives awards</Text> : null}

        {k && host ? (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={label}>Awards</Text>
            <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 6 }}>{k.name}</Text>
            {k.championEntrantId ? (
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.textBody, marginTop: 4 }}>{`${championName(k)} won ${k.name}`}</Text>
            ) : null}

            {k.awards.map((a, i) => (
              <Text key={`${a.playerId}-${a.badge}-${i}`} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text, marginTop: 8 }}>
                {[k.players.find((p) => p.playerId === a.playerId)?.displayName, a.title].filter(Boolean).join(' · ')}
              </Text>
            ))}

            {!k.awardsEligible ? (
              <Text style={{ ...body, marginTop: 16 }}>Awards need at least 4 Kria players in the knockout.</Text>
            ) : k.status === 'completed' && k.awards.length >= MAX_AWARDS ? (
              <Text style={{ ...body, marginTop: 16 }}>All {MAX_AWARDS} awards given.</Text>
            ) : null}

            {canGive ? (
              <>
                <Text style={{ ...label, marginTop: 24 }}>Who gets it?</Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {awardablePlayers(k, user!._id).map((p) => (
                    <Pressable key={p.playerKey} accessibilityRole="button" accessibilityState={{ selected: playerId === p.playerId }} onPress={() => setPlayerId(p.playerId!)} style={{ ...choice(playerId === p.playerId), minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' }}>
                      <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: playerId === p.playerId ? t.text : t.textBody }}>{p.displayName}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ ...label, marginTop: 24 }}>Which award?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {Object.entries(QUICK_AWARD_BADGES).map(([key, name]) => (
                    <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: badge === key }} onPress={() => setBadge(key)} style={{ ...choice(badge === key), width: '48%', padding: 12, alignItems: 'center', gap: 8 }}>
                      <Badge badge={key} size={56} />
                      <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: badge === key ? t.text : t.textBody }}>{name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

      </ScrollView>

      {k && host ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg, gap: 8 }}>
          {ko.problem ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk }}>{ko.problem}</Text> : null}
          {canGive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Give award"
              onPress={async () => {
                if (await ko.award(playerId!, badge!)) { setPlayerId(null); setBadge(null); }
              }}
              disabled={!ready}
              accessibilityState={{ disabled: !ready }}
              style={{ minHeight: 52, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: ready ? 1 : 0.45 }}
            >
              <Text style={{ ...button, fontSize: 13, color: t.onBrand }}>Give award</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={toBracket} style={{ minHeight: 44, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...button, color: t.textBody }}>{k.awards.length > 0 || !canGive ? 'Done' : 'Skip'}</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
