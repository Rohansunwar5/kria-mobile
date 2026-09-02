import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines } from '@/components/canvas';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getTeam, getTeamRoster, type Team, type RosterPlayer } from '@/api/profileApi';
import { purseHealth, shortMoney } from '@/lib/auctionView';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function initials(name?: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function TeamDetail() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const myRegistrations = useAppSelector((s) => s.registration.myRegistrations);

  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [t, r] = await Promise.all([getTeam(teamId), getTeamRoster(teamId).catch(() => [])]);
      if (!t) throw new Error('not found');
      setTeam(t);
      setRoster(r);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const isMine = myRegistrations.some((r) => r.teamId === teamId);
  const color = team?.primaryColor || '#F97316';
  const purse = purseHealth(team?.budget ?? 0, team?.initialBudget ?? 0);

  const Header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: '#fff' }}>Team</Text>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        <Skeleton h={130} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={54} />
          <Skeleton h={54} />
          <Skeleton h={54} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

  if (error || !team) {
    return (
      <Screen>
        {Header}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Team unavailable" message="This team could not be loaded. Pull to retry." onRetry={load} />
        </ScrollView>
      </Screen>
    );
  }

  const spent = team.totalSpent ?? 0;

  return (
    <Screen>
      {Header}
      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ overflow: 'hidden' }}>
          <Hairlines />
          <Ghost text={initials(team.name)} size={150} style={{ right: -24, top: -10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
            <View style={{ width: 64, height: 64, borderRadius: 4, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 24, color: '#fff' }}>{initials(team.name)}</Text>
            </View>
            <View style={{ flex: 1, paddingBottom: 3 }}>
              <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 28, lineHeight: 25, color: '#fff' }}>
                {team.name}
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 6 }}>
                {roster.length} player{roster.length === 1 ? '' : 's'}
                {isMine ? ' · your team' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Purse */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' }}>
          <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={LBL}>Purse left</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 20, color: purse.color, marginTop: 2 }}>
              {shortMoney(team.budget ?? 0)}
            </Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={LBL}>Spent</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 20, color: '#fff', marginTop: 2 }}>{shortMoney(spent)}</Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11 }}>
            <Text style={LBL}>Squad</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 20, color: '#fff', marginTop: 2 }}>{roster.length}</Text>
          </View>
        </View>

        {isMine && team.whatsappGroupLink ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join team chat"
            onPress={() => Linking.openURL(team.whatsappGroupLink!)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F97316' }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#0B0B0B' }}>Join team chat</Text>
            <Icon name="arrow-right" size={17} color="#0B0B0B" strokeWidth={2.6} />
          </Pressable>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 8 }}>Squad</Text>
          {roster.length === 0 ? (
            <EmptyState
              icon="people"
              title="No squad yet"
              message="Players land here as the auction fills this team."
            />
          ) : (
            <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
              {roster.map((p, i) => {
                const name = `${p.profile.firstName} ${p.profile.lastName}`.trim();
                return (
                  <View key={p._id}>
                    {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
                    <Pressable
                      accessibilityRole={p.playerId ? 'button' : undefined}
                      accessibilityLabel={name}
                      disabled={!p.playerId}
                      onPress={() => router.push({ pathname: '/player/[playerId]', params: { playerId: p.playerId! } })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 44, paddingHorizontal: 13, paddingVertical: 10 }}
                    >
                      <InitialsAvatar name={name} size={32} color={color} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#fff' }}>
                          {name}
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                          {[p.profile.gender, p.profile.skillLevel].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      {p.auctionData?.soldPrice ? (
                        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#16C46A' }}>
                          ₹{p.auctionData.soldPrice.toLocaleString('en-IN')}
                        </Text>
                      ) : null}
                      {p.playerId ? <Icon name="chevron-right" size={13} color="#7d7d7d" /> : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
