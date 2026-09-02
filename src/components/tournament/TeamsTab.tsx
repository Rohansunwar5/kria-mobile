import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import API from '@/api/axios';
import type { Team } from '@/store/slices/teamSlice';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { Chip } from '@/components/canvas';
import { Icon } from '@/components/icons';
import { Skeleton, EmptyState } from '@/components/states';

interface RosterPlayer {
  _id: string;
  profile: { firstName: string; lastName: string; gender: string; skillLevel?: string };
  auctionData?: { soldPrice?: number };
  status: string;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Teams absorbs the old Players tab: every player in this tournament is on a
// roster, so the roster is the player list.
export function TeamsTab({ myTeam }: { myTeam: Team | null | undefined }) {
  const router = useRouter();
  const { teams, isLoading } = useAppSelector((s) => s.team);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Record<string, RosterPlayer[]>>({});
  const [loadingRoster, setLoadingRoster] = useState<Record<string, boolean>>({});
  const fetched = useRef<Set<string>>(new Set());

  const fetchRoster = async (teamId: string) => {
    if (fetched.current.has(teamId)) return;
    fetched.current.add(teamId);
    setLoadingRoster((p) => ({ ...p, [teamId]: true }));
    try {
      const res = await API.get(`/registrations/teams/${teamId}/roster`);
      const payload = res.data?.data?.data || res.data?.data || {};
      setRosters((p) => ({ ...p, [teamId]: Array.isArray(payload?.players) ? payload.players : [] }));
    } catch (_e) {
      setRosters((p) => ({ ...p, [teamId]: [] }));
    } finally {
      setLoadingRoster((p) => ({ ...p, [teamId]: false }));
    }
  };

  useEffect(() => {
    if (teams.length === 0) return;
    teams.forEach((t) => fetchRoster(t._id));
    if (myTeam?._id) setExpanded(myTeam._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.map((t) => t._id).join(','), myTeam?._id]);

  if (isLoading && teams.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 7 }}>
        <Skeleton h={70} />
        <Skeleton h={70} />
        <Skeleton h={70} />
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={{ paddingTop: 14 }}>
        <EmptyState
          icon="shield"
          title="No teams yet"
          message="Teams appear here once the organiser creates them, and fill up as the auction runs."
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 7 }}>
      {teams.map((team) => {
        const isMine = myTeam?._id === team._id;
        const isOpen = expanded === team._id;
        const roster = rosters[team._id] ?? [];
        const color = team.primaryColor || '#F97316';

        return (
          <View
            key={team._id}
            style={{
              backgroundColor: '#151515',
              borderWidth: 1.5,
              borderColor: isMine ? 'rgba(250,76,147,0.5)' : 'rgba(255,255,255,0.14)',
              borderLeftWidth: 4,
              borderLeftColor: color,
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => setExpanded(isOpen ? null : team._id)}
              accessibilityRole="button"
              accessibilityLabel={team.name}
              accessibilityState={{ expanded: isOpen }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 12, minHeight: 44 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 14, color: '#fff' }}>{initials(team.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>
                  {team.name}
                </Text>
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 4 }}>
                  {loadingRoster[team._id] ? 'Loading roster' : `${roster.length} player${roster.length === 1 ? '' : 's'}`}
                </Text>
              </View>
              {isMine ? <Tag label="You" variant="auction" /> : null}
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#7d7d7d" />
            </Pressable>

            {isOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${team.name}`}
                onPress={() => router.push({ pathname: '/team/[teamId]', params: { teamId: team._id } })}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 13, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}
              >
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#F97316' }}>
                  Team page
                </Text>
                <Icon name="chevron-right" size={13} color="#F97316" />
              </Pressable>
            ) : null}

            {isOpen ? (
              <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)', padding: 13, gap: 7 }}>
                {isMine && team.whatsappGroupLink ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => Linking.openURL(team.whatsappGroupLink!)}
                    style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
                  >
                    <Chip label="Join team chat" selected variant="auction" />
                  </Pressable>
                ) : null}

                {loadingRoster[team._id] ? (
                  <>
                    <Skeleton h={44} />
                    <Skeleton h={44} />
                  </>
                ) : roster.length === 0 ? (
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#7d7d7d', paddingVertical: 8 }}>
                    No players on this roster yet.
                  </Text>
                ) : (
                  roster.map((p) => {
                    const name = `${p.profile.firstName} ${p.profile.lastName}`.trim();
                    return (
                      <View
                        key={p._id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          padding: 9,
                          backgroundColor: '#1E1E1E',
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.10)',
                          borderRadius: 6,
                        }}
                      >
                        <InitialsAvatar name={name} size={32} color={color} />
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#fff' }}>
                            {name}
                          </Text>
                          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                            {[p.profile.gender, p.profile.skillLevel].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        {p.auctionData?.soldPrice ? (
                          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#16C46A' }}>
                            ₹{p.auctionData.soldPrice.toLocaleString('en-IN')}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
