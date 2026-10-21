import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KnockoutPlayer, KnockoutTeam, QuickKnockout } from '@/api/quickKnockout';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { colors, display, font, radius } from '@/constants/theme';
import { playerSub, teamLine } from '@/lib/knockoutRoom';
import { initials } from '@/lib/matchCard';
import { isKnockoutHost, teamPlayers, unpairedPlayers } from '@/lib/quickKnockoutView';

const MIN_TEAMS = 3;
const MAX_TEAMS = 8;

/** One person: avatar, name, Host / You / Joined / Guest, and remove for the host. */
export function PlayerRow({ k, p, meId, selected, onPress, onRemove }: {
  k: QuickKnockout;
  p: KnockoutPlayer;
  meId: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  const me = !!p.playerId && p.playerId === meId;
  // The viewer's own row is tinted for everyone but the host, who sees it as "Host · you".
  const tinted = selected || (me && !isKnockoutHost(k, meId));
  const sub = selected ? 'Selected · tap a partner' : playerSub(k, p, meId);
  return (
    <View style={[s.row, tinted && s.tinted]}>
      <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${p.displayName}, ${sub}`} disabled={!onPress} onPress={onPress} style={s.who}>
        <View style={[s.av, p.playerId ? { backgroundColor: colors.surface3 } : s.guest]}>
          <Text style={[s.ini, !p.playerId && { color: colors.text4 }]}>{initials(p.displayName)}</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={s.name} numberOfLines={1}>{p.displayName}</Text>
          <Text style={[s.sub, tinted && { color: colors.accentInk }]} numberOfLines={1}>{sub}</Text>
        </View>
      </Pressable>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.displayName}`} onPress={onRemove} style={s.x}>
          <Icon name="close" size={20} color={colors.text4} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AddRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Add a player" onPress={onPress} style={s.row}>
      <View style={s.who}>
        <View style={[s.av, s.dash]}><Icon name="add" size={20} color={colors.text3} /></View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={s.name}>Add a player</Text>
          <Text style={s.sub}>Find a Kria player, or add a guest</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={s.head}>
      <Text style={s.headTitle}>{title}</Text>
      {meta ? <Text style={s.headMeta}>{meta}</Text> : null}
    </View>
  );
}

/** Rally sports (K1, K2): players, or for doubles the host's pairs then everyone still unpaired. */
export function RallyPeople({ k, meId, busy, onAdd, onRemove, onPair, onUnpair }: {
  k: QuickKnockout;
  meId: string;
  busy: boolean;
  onAdd?: () => void;
  onRemove: (playerKey: string) => void;
  onPair: (a: string, b: string) => void;
  onUnpair: (pairId: string) => void;
}) {
  const host = isKnockoutHost(k, meId);
  const [selected, setSelected] = useState<string | null>(null);
  const doubles = k.format === 'doubles';
  const byKey = (key: string) => k.players.find((p) => p.playerKey === key);
  const pairs = k.pairs.filter((p) => p.byHost);
  const loose = doubles ? unpairedPlayers(k) : k.players;
  // As before: the host can re-pair after a draw too; the server re-checks at Start.
  const editable = host;

  const tap = (key: string) => {
    if (!selected) return setSelected(key);
    if (selected === key) return setSelected(null);
    onPair(selected, key);
    setSelected(null);
  };
  const row = (p: KnockoutPlayer) => (
    <PlayerRow
      key={p.playerKey}
      k={k}
      p={p}
      meId={meId}
      selected={selected === p.playerKey}
      onPress={editable && doubles && !busy ? () => tap(p.playerKey) : undefined}
      onRemove={host && !busy ? () => onRemove(p.playerKey) : undefined}
    />
  );

  if (!doubles) {
    return (
      <View style={s.section}>
        <SectionHead title="Players" meta={`${k.players.length} in`} />
        {k.players.map(row)}
        {onAdd ? <AddRow onPress={onAdd} /> : null}
      </View>
    );
  }
  return (
    <>
      {pairs.length ? (
        <View style={s.section}>
          <SectionHead title="Pairs" meta={`${pairs.length} set by ${host ? 'you' : 'the host'}`} />
          {pairs.map((pair) => {
            const [a, b] = pair.playerKeys.map(byKey);
            return (
              <View key={pair.pairId} style={s.pair}>
                <View style={s.pairHead}>
                  <Text style={s.pairLabel}>Pair</Text>
                  {editable ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Split ${a?.displayName} and ${b?.displayName}`} disabled={busy} onPress={() => onUnpair(pair.pairId)} hitSlop={10}>
                      <Text style={s.split}>Split</Text>
                    </Pressable>
                  ) : null}
                </View>
                {[a, b].map((p, i) => (p ? <View key={p.playerKey} style={i === 0 ? { marginTop: -1 } : undefined}><PlayerRow k={k} p={p} meId={meId} /></View> : null))}
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={[s.section, pairs.length ? { marginTop: 32 } : null]}>
        <SectionHead title={pairs.length ? 'Not paired yet' : 'Players'} meta={`${loose.length}`} />
        {editable ? <Text style={s.hint}>Tap two players to pair them. The draw pairs anyone left.</Text> : null}
        {loose.map(row)}
        {onAdd ? <AddRow onPress={onAdd} /> : null}
      </View>
    </>
  );
}

/** Cricket (K3, K4): each team a section; the host moves people with a sheet. */
export function CricketPeople({ k, meId, busy, onAdd, onRemove, onMove, onAddTeam, onRemoveTeam, onRenameTeam }: {
  k: QuickKnockout;
  meId: string;
  busy: boolean;
  onAdd?: () => void;
  onRemove: (playerKey: string) => void;
  onMove: (playerKey: string, teamId: string | null) => void;
  onAddTeam: () => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
}) {
  const host = isKnockoutHost(k, meId);
  const teams = k.teams ?? [];
  const cap = k.matchConfig.playersPerTeam ?? 0;
  const [moving, setMoving] = useState<KnockoutPlayer | null>(null);
  const [editing, setEditing] = useState<KnockoutTeam | null>(null);
  const [name, setName] = useState('');

  const people = (list: KnockoutPlayer[]) =>
    list.map((p) => <PlayerRow key={p.playerKey} k={k} p={p} meId={meId} onPress={host && !busy ? () => setMoving(p) : undefined} />);

  return (
    <View>
      {host ? (
        <View style={s.note}>
          <Icon name="info" size={16} color={colors.text3} />
          <Text style={s.noteText}>Tap a player to move them. Anyone left in Any team is dealt to the smallest teams by the draw.</Text>
        </View>
      ) : null}
      {teams.map((team) => {
        const list = teamPlayers(k, team.teamId);
        return (
          <View key={team.teamId} style={s.team}>
            <View style={s.teamHead}>
              <Text style={[display(20), { flex: 1 }]} numberOfLines={1}>{team.name}</Text>
              <Text style={s.headMeta}>{`${list.length} / ${cap}`}</Text>
              {host ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`${team.name} options`} disabled={busy} onPress={() => { setEditing(team); setName(team.name); }} style={s.more}>
                  <Icon name="more_horiz" size={20} color={colors.text2} />
                </Pressable>
              ) : null}
            </View>
            {list.length ? people(list) : <Text style={s.empty}>No players yet</Text>}
          </View>
        );
      })}
      <View style={s.team}>
        <View style={s.teamHead}>
          <Text style={[display(20), { flex: 1, color: colors.text2 }]}>Any team</Text>
          <Text style={s.headMeta}>{teamPlayers(k).length}</Text>
        </View>
        {people(teamPlayers(k))}
        {onAdd ? <AddRow onPress={onAdd} /> : null}
      </View>
      {host && teams.length < MAX_TEAMS ? (
        <Button variant="secondary" icon="add" label="Add a team" onPress={onAddTeam} disabled={busy} style={{ marginTop: 26, height: 48, borderRadius: radius.input }} />
      ) : null}

      <BottomSheet open={!!moving} onClose={() => setMoving(null)} title={moving ? `Move ${moving.displayName}` : ''} subtitle={`${cap} players a team · full teams can't take more`}>
        <View>
          {[...teams.map((t) => ({ id: t.teamId as string | null, name: t.name, count: teamPlayers(k, t.teamId).length })), { id: null, name: 'Any team', count: -1 }].map((o) => {
            const here = (moving?.teamId ?? null) === o.id;
            const full = o.id !== null && o.count >= cap && !here;
            return (
              <Pressable
                key={o.id ?? 'any'}
                accessibilityRole="radio"
                accessibilityState={{ selected: here, disabled: full }}
                disabled={full || here}
                onPress={() => { if (moving) onMove(moving.playerKey, o.id); setMoving(null); }}
                style={[s.option, full && { opacity: 0.45 }]}
              >
                <View style={{ gap: 2 }}>
                  <Text style={s.optionName}>{o.name}</Text>
                  <Text style={s.optionSub}>{o.id === null ? 'Let the draw decide' : teamLine(o.count, cap, here)}</Text>
                </View>
                {here ? <Icon name="check" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => { if (moving) onRemove(moving.playerKey); setMoving(null); }} style={[s.option, { borderBottomWidth: 0 }]}>
            <Text style={[s.optionName, { color: colors.error }]}>Remove from the knockout</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ''} subtitle={editing ? `${teamPlayers(k, editing.teamId).length} / ${cap} players` : ''}>
        <View style={{ gap: 12 }}>
          <TextInput value={name} onChangeText={setName} maxLength={20} placeholder="Team name" placeholderTextColor={colors.text4} accessibilityLabel="Team name" style={s.input} />
          <Button
            label="Save name"
            disabled={!name.trim() || name.trim() === editing?.name}
            onPress={() => { if (editing) onRenameTeam(editing.teamId, name.trim()); setEditing(null); }}
          />
          {editing && teams.length > MIN_TEAMS ? (
            <Pressable accessibilityRole="button" onPress={() => { onRemoveTeam(editing.teamId); setEditing(null); }} style={s.removeTeam}>
              <Text style={[s.optionName, { color: colors.error }]}>Remove this team</Text>
            </Pressable>
          ) : (
            <Text style={s.optionSub}>A cricket knockout keeps at least 3 teams.</Text>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 44 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 14 },
  headTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  headMeta: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text3, marginTop: -6, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, borderTopWidth: 1, borderTopColor: colors.line },
  tinted: { backgroundColor: colors.accentTint, borderRadius: 14, borderTopColor: 'transparent', marginHorizontal: -10, paddingHorizontal: 10 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  av: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  guest: { borderWidth: 1.5, borderColor: colors.ring },
  dash: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ring },
  ini: { fontFamily: font.semibold, fontSize: 12, color: colors.text },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pair: { marginTop: 10, borderRadius: 18, backgroundColor: colors.surface1, paddingHorizontal: 14, paddingBottom: 2 },
  pairHead: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pairLabel: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  split: { fontFamily: font.semibold, fontSize: 12, color: colors.text2 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 22 },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: colors.text3 },
  team: { marginTop: 30 },
  teamHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  more: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.text4, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.cardLine },
  optionName: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  optionSub: { fontFamily: font.regular, fontSize: 12, color: colors.text4, fontVariant: ['tabular-nums'] },
  input: { height: 52, paddingHorizontal: 16, borderRadius: radius.input, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.lineStrong, fontFamily: font.semibold, fontSize: 16, color: colors.text },
  removeTeam: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
