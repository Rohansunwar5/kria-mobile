import { useState, type ReactNode } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { KnockoutPlayer, KnockoutTeam, QuickKnockout } from '@/api/quickKnockout';
import { isKnockoutHost, teamPlayers } from '@/lib/quickKnockoutView';
import { PlayerLine } from './PlayerLine';

const MIN_TEAMS = 3;
const MAX_TEAMS = 8;
const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });

/**
 * The cricket waiting room's roster: one card per team, then Any team. The
 * host taps a player, then "Move here" on a card — the doubles tap-to-pair
 * pattern, since an Android alert holds three buttons and there can be eight
 * teams.
 */
export function CricketTeams({ knockout: k, playerId, busy, onRemove, onMove, onAddTeam, onRemoveTeam, onRenameTeam }: {
  knockout: QuickKnockout;
  playerId?: string;
  busy?: boolean;
  onRemove: (playerKey: string) => void;
  onMove: (playerKey: string, teamId: string | null) => void;
  onAddTeam: () => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
}) {
  const t = useTheme();
  const host = isKnockoutHost(k, playerId) && !busy;
  const teams = k.teams ?? [];
  const cap = k.matchConfig.playersPerTeam ?? 0;
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ teamId: string; name: string } | null>(null);
  const picked = k.players.find((p) => p.playerKey === selected);

  const move = (teamId: string | null) => {
    if (!picked) return;
    onMove(picked.playerKey, teamId);
    setSelected(null);
  };
  const saveName = () => {
    if (renaming && renaming.name.trim()) onRenameTeam(renaming.teamId, renaming.name.trim());
    setRenaming(null);
  };

  const tools = (team: KnockoutTeam) => {
    if (!host) return null;
    if (renaming?.teamId === team.teamId) {
      return (
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
          <TextInput
            value={renaming.name}
            onChangeText={(name) => setRenaming({ teamId: team.teamId, name })}
            accessibilityLabel={`New name for ${team.name}`}
            maxLength={20}
            autoFocus
            style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: t.text, borderWidth: 1.5, borderColor: t.line, borderRadius: 5, backgroundColor: t.fillSoft, paddingHorizontal: 12, minHeight: 44 }}
          />
          <Pressable accessibilityRole="button" onPress={saveName} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ ...label(t), color: t.brandInk }}>Save</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', gap: 16, paddingBottom: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${team.name}`} onPress={() => setRenaming({ teamId: team.teamId, name: team.name })} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ ...label(t), color: t.textMeta }}>Rename</Text>
        </Pressable>
        {teams.length > MIN_TEAMS ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${team.name}`} onPress={() => onRemoveTeam(team.teamId)} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text style={{ ...label(t), color: t.failInk }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const card = (key: string, title: string, players: KnockoutPlayer[], teamId: string | null, extra?: ReactNode) => {
    const full = teamId !== null && players.length >= cap;
    const canMoveHere = host && Boolean(picked) && (picked?.teamId ?? null) !== teamId && !full;
    return (
      <View key={key} style={{ marginTop: 12, borderRadius: 6, borderWidth: 1.5, borderColor: canMoveHere ? t.brand : t.line, paddingHorizontal: 8, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: t.text }}>{title}</Text>
          <Text style={label(t)}>{teamId === null ? String(players.length) : `${players.length}/${cap}`}</Text>
          {canMoveHere ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Move ${picked?.displayName} to ${title}`} onPress={() => move(teamId)} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
              <Text style={{ ...label(t), color: t.brandInk }}>Move here</Text>
            </Pressable>
          ) : null}
        </View>
        {extra}
        {players.map((p) => (
          <PlayerLine
            key={p.playerKey}
            player={p}
            viewerId={playerId}
            tone={selected === p.playerKey ? 'selected' : undefined}
            a11y={host ? `Select ${p.displayName}` : undefined}
            onPress={host ? () => setSelected(selected === p.playerKey ? null : p.playerKey) : undefined}
            onRemove={host ? () => onRemove(p.playerKey) : undefined}
          />
        ))}
      </View>
    );
  };

  return (
    <View>
      {host ? <Text style={{ ...label(t), marginTop: 8 }}>Tap a player, then Move here on a team</Text> : null}
      {teams.map((team) => card(team.teamId, team.name, teamPlayers(k, team.teamId), team.teamId, tools(team)))}
      {card('any', 'Any team', teamPlayers(k), null)}
      {host && teams.length < MAX_TEAMS ? (
        <Pressable accessibilityRole="button" onPress={onAddTeam} style={{ marginTop: 12, minHeight: 44, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.textBody }}>+ Add team</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
