import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import API from '@/api/axios';
import type { Team } from '@/store/slices/teamSlice';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { Icon } from '@/components/icons';
import { useTheme } from '@/lib/theme';

/** Players per team, from each roster. One failing roster leaves that tile
 *  without a count rather than taking the grid down. */
function useRosterCounts(teams: Team[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = teams.map((t) => t._id).join(',');

  useEffect(() => {
    if (!key) return;
    let active = true;
    Promise.all(
      key.split(',').map((id) =>
        API.get(`/registrations/teams/${id}/roster`)
          .then((res) => {
            const payload = res.data?.data?.data || res.data?.data || {};
            return [id, Array.isArray(payload?.players) ? payload.players.length : 0] as const;
          })
          .catch(() => null),
      ),
    ).then((found) => {
      if (active) setCounts(Object.fromEntries(found.filter((x) => x !== null)));
    });
    return () => { active = false; };
  }, [key]);

  return counts;
}

function TeamTile({ team, players, isMine, isChampion }: { team: Team; players?: number; isMine: boolean; isChampion: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const color = team.primaryColor || theme.brand;
  const meta = [players !== undefined ? `${players} ${players === 1 ? 'player' : 'players'}` : null, isChampion ? 'Champions' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${team.name}${isChampion ? ', champions' : ''}${isMine ? ', your team' : ''}`}
      onPress={() => router.push({ pathname: '/team/[teamId]', params: { teamId: team._id } })}
      style={{
        flex: 1,
        minHeight: 104,
        padding: 11,
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: isMine ? theme.auctionLine : theme.line,
        borderTopWidth: 4,
        borderTopColor: color,
        borderRadius: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <InitialsAvatar name={team.name} logo={team.logo} size={34} color={color} />
        {isMine ? <Tag label="You" variant="auction" /> : isChampion ? <Icon name="trophy" size={15} color={theme.brandInk} /> : null}
      </View>
      <View>
        <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text }}>
          {team.name}
        </Text>
        {meta ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: theme.textMeta, marginTop: 3 }}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Every team, two to a row in its own colour. Tap one for its roster. */
export function TeamsGrid({ teams, myTeamId, championIds }: { teams: Team[]; myTeamId?: string; championIds: Set<string> }) {
  const counts = useRosterCounts(teams);
  const rows: Team[][] = [];
  for (let i = 0; i < teams.length; i += 2) rows.push(teams.slice(i, i + 2));

  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <View key={row[0]._id} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((t) => (
            <TeamTile key={t._id} team={t} players={counts[t._id]} isMine={t._id === myTeamId} isChampion={championIds.has(t._id)} />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
