import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { QuickKnockout } from '@/api/quickKnockout';
import { QUICK_AWARD_BADGES, awardablePlayers } from '@/lib/quickKnockoutView';

const MAX_AWARDS = 3;

/** Host only, once the knockout is finished. Low-tier badges; the server enforces every rule again. */
export function KnockoutAwards({ knockout: k, hostId, busy, onAward }: {
  knockout: QuickKnockout; hostId: string; busy?: boolean; onAward: (playerId: string, badge: string) => void;
}) {
  const t = useTheme();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint };
  const chip = (on: boolean) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1.5, borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.fillSoft, justifyContent: 'center' as const });
  const chipText = (on: boolean) => ({ fontFamily: 'SpaceGrotesk_500Medium' as const, fontSize: 13, color: on ? t.onBrand : t.textBody });

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Text style={label}>Awards</Text>
      {!k.awardsEligible ? (
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 6 }}>
          Awards need at least 4 Kria players in the knockout.
        </Text>
      ) : (
        <>
          {k.awards.map((a, i) => (
            <Text key={`${a.playerId}-${a.badge}-${i}`} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text, marginTop: 8 }}>{a.title}</Text>
          ))}
          {k.awards.length < MAX_AWARDS ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {awardablePlayers(k, hostId).map((p) => (
                  <Pressable key={p.playerKey} accessibilityRole="button" onPress={() => setPlayerId(p.playerId!)} style={chip(playerId === p.playerId)}>
                    <Text style={chipText(playerId === p.playerId)}>{p.displayName}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {Object.entries(QUICK_AWARD_BADGES).map(([key, name]) => (
                  <Pressable key={key} accessibilityRole="button" onPress={() => setBadge(key)} style={chip(badge === key)}>
                    <Text style={chipText(badge === key)}>{name}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy || !playerId || !badge}
                onPress={() => { onAward(playerId!, badge!); setPlayerId(null); setBadge(null); }}
                style={{ minHeight: 48, marginTop: 12, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy || !playerId || !badge ? 0.45 : 1 }}
              >
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.onBrand }}>Give award</Text>
              </Pressable>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}
