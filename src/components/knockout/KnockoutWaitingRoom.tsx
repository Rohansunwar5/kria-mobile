import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Share, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import type { QuickKnockout } from '@/api/quickKnockout';
import { PlayerLine } from './PlayerLine';
import { CricketTeams } from './CricketTeams';
import { bracketColumns, drawBlocker, entrantShortName, formatLabel, isKnockoutHost, unpairedPlayers } from '@/lib/quickKnockoutView';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });
const body = (t: Palette) => ({ fontFamily: 'SpaceGrotesk_400Regular' as const, fontSize: 13, lineHeight: 19, color: t.textMeta });
const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase' as const };

/** Type a guest's name, or 3+ letters to find a Kria player. */
function AddPlayer({ onAddGuest, onAddPlayer, excludeIds }: { onAddGuest: (name: string) => void; onAddPlayer: (id: string) => void; excludeIds: string[] }) {
  const t = useTheme();
  const [text, setText] = useState('');
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const latest = useRef('');

  const type = async (next: string) => {
    setText(next);
    const q = next.trim();
    latest.current = q;
    if (q.length < 3) { setHits([]); return; }
    let found: PlayerHit[] = [];
    try { found = await searchPlayers(q); } catch { /* a failed search still allows a guest */ }
    if (latest.current === q) setHits(found.filter((h) => !excludeIds.includes(h._id)).slice(0, 4));
  };
  const reset = () => { setText(''); setHits([]); latest.current = ''; };

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={type}
          placeholder="Name, or search Kria players"
          placeholderTextColor={t.textFaint}
          maxLength={40}
          style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: t.text, borderWidth: 1.5, borderColor: t.line, borderRadius: 5, backgroundColor: t.fillSoft, paddingHorizontal: 12, minHeight: 48 }}
        />
        <Pressable accessibilityRole="button" disabled={!text.trim()} onPress={() => { onAddGuest(text.trim()); reset(); }}
          style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
          <Text style={{ ...button, fontSize: 10, color: t.textBody }}>Add as guest</Text>
        </Pressable>
      </View>
      {hits.map((hit) => (
        <Pressable key={hit._id} accessibilityRole="button" onPress={() => { onAddPlayer(hit._id); reset(); }}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, borderBottomWidth: 1.5, borderBottomColor: t.lineSoft }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text }}>{`${hit.firstName} ${hit.lastName}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function KnockoutWaitingRoom({ knockout: k, playerId, busy, onAddGuest, onAddPlayer, onRemove, onPair, onUnpair, onMove, onAddTeam, onRemoveTeam, onRenameTeam }: {
  knockout: QuickKnockout;
  playerId?: string;
  busy?: boolean;
  onAddGuest: (name: string) => void;
  onAddPlayer: (playerId: string) => void;
  onRemove: (playerKey: string) => void;
  onPair: (a: string, b: string) => void;
  onUnpair: (pairId: string) => void;
  onMove: (playerKey: string, teamId: string | null) => void;
  onAddTeam: () => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
}) {
  const t = useTheme();
  const host = isKnockoutHost(k, playerId);
  const [selected, setSelected] = useState<string | null>(null);
  const hostName = k.players.find((p) => p.playerId === k.hostId)?.displayName ?? 'the host';
  const byKey = (key: string) => k.players.find((p) => p.playerKey === key)!;
  const doubles = k.format === 'doubles';
  const hostPairs = k.pairs.filter((p) => p.byHost);

  const tapToPair = (key: string) => {
    if (!selected) return setSelected(key);
    if (selected === key) return setSelected(null);
    onPair(selected, key);
    setSelected(null);
  };

  const share = () => {
    Share.share({ message: `Join my knockout "${k.name}" on Kria. Open Kria, tap Join by code and enter ${k.joinCode}.` }).catch(() => undefined);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Tag label="waiting" variant="open" />
        <Text style={label(t)}>{`Knockout · ${formatLabel(k)}`}</Text>
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 10 }}>{k.name}</Text>

      {host && k.joinCode ? (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
          <Text style={label(t)}>Code</Text>
          <Text selectable style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 34, letterSpacing: 0.2 * 34, color: t.brandInk, marginTop: 4 }}>{k.joinCode}</Text>
          <Pressable accessibilityRole="button" onPress={share} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 12, borderRadius: 5, borderWidth: 1.5, borderColor: t.brand }}>
            <Icon name="share" size={16} color={t.brandInk} />
            <Text style={{ ...button, color: t.brandInk }}>Share code</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
          <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>{`Waiting for ${hostName} to start`}</Text>
          <Text style={{ ...body(t), marginTop: 6 }}>
            {k.sport === 'cricket' ? 'The host or the draw settles the teams.'
              : doubles ? 'Your partner is decided by the host or the draw.' : 'The bracket appears here once the host draws it.'}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
        <Text style={label(t)}>{`${k.players.length} players`}</Text>
        {host && doubles ? <Text style={label(t)}>Tap two players to pair them</Text> : null}
      </View>

{k.sport === 'cricket' ? (        <CricketTeams          knockout={k} playerId={playerId} busy={busy}          onRemove={onRemove} onMove={onMove} onAddTeam={onAddTeam} onRemoveTeam={onRemoveTeam} onRenameTeam={onRenameTeam}        />      ) : (        <>
      {hostPairs.map((pair) => {
        const [a, b] = pair.playerKeys.map(byKey);
        return (
          <View key={pair.pairId} style={{ marginTop: 8, borderRadius: 6, borderWidth: 1.5, borderColor: t.brand, paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
              <Text style={{ ...label(t), color: t.brandInk }}>Pair</Text>
              {host ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Split ${a.displayName} and ${b.displayName}`} onPress={() => onUnpair(pair.pairId)} disabled={busy} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
                  <Text style={{ ...label(t), color: t.textMeta }}>Split</Text>
                </Pressable>
              ) : null}
            </View>
            <PlayerLine player={a} viewerId={playerId} />
            <PlayerLine player={b} viewerId={playerId} />
          </View>
        );
      })}

      {(doubles ? unpairedPlayers(k) : k.players).map((p) => (
        <PlayerLine
          key={p.playerKey}
          player={p}
          viewerId={playerId}
          tone={selected === p.playerKey ? 'selected' : undefined}
          a11y={host && doubles ? `Select ${p.displayName}` : undefined}
          onPress={host && doubles && !busy ? () => tapToPair(p.playerKey) : undefined}
          onRemove={host && !busy ? () => onRemove(p.playerKey) : undefined}
        />
      ))}
        </>
      )}

      {host ? <AddPlayer onAddGuest={onAddGuest} onAddPlayer={onAddPlayer} excludeIds={k.players.map((p) => p.playerId).filter((x): x is string => Boolean(x))} /> : null}

      {k.entrants.length > 0 ? (
        <View style={{ marginTop: 24 }}>
          <Text style={label(t)}>Draw preview — nothing is played until the host starts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
            {bracketColumns(k).map((col) => (
              <View key={col.name} style={{ width: 140, gap: 8, justifyContent: 'space-around' }}>
                <Text style={label(t)}>{col.name}</Text>
                {col.fixtures.map((f) => (
                  <View key={f.fixtureId} style={{ borderRadius: 5, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, padding: 6 }}>
                    <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: f.entrantA ? t.text : t.textFaint }}>{entrantShortName(k, f.entrantA) || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: f.entrantB ? t.text : t.textFaint }}>{f.bye ? 'Bye' : entrantShortName(k, f.entrantB) || '—'}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/** Host only, pinned under the scroll by the screen. */
export function KnockoutDrawBar({ knockout: k, busy, onDraw, onStart }: { knockout: QuickKnockout; busy?: boolean; onDraw: () => void; onStart: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const blocker = drawBlocker(k);
  const drawn = k.entrants.length > 0;
  // Pressable writes `disabled` over accessibilityState.disabled, so the
  // blocked state goes through `disabled` for a screen reader to hear it.
  const off = Boolean(busy) || (!drawn && Boolean(blocker));
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg, gap: 8 }}>
      {blocker ? <Text style={{ ...body(t), fontSize: 12, lineHeight: 17 }}>{blocker}</Text> : null}
      {drawn ? (
        <Pressable accessibilityRole="button" onPress={onDraw} disabled={busy} style={{ minHeight: 44, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...button, color: t.textBody }}>Reshuffle</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={drawn ? onStart : onDraw}
        disabled={off}
        accessibilityState={{ disabled: off }}
        style={{ minHeight: 52, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.45 : 1 }}
      >
        <Text style={{ ...button, fontSize: 13, color: t.onBrand }}>{drawn ? 'Start knockout' : 'Draw'}</Text>
      </Pressable>
    </View>
  );
}
