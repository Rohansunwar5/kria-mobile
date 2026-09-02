import { useEffect } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { MenuRow } from '@/components/profile/MenuRow';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';
import { groupMenu } from '@/lib/profileMenu';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function StatCell({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 11,
        ...(last ? null : { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.12)' }),
      }}
    >
      <Text style={{ ...LBL, letterSpacing: 0.1 * 9 }}>{label}</Text>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 22, color: accent ? '#F97316' : '#fff', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

export default function Profile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, playerStats } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchPlayerStats());
  }, [dispatch]);

  const name = user ? `${user.firstName} ${user.lastName}`.trim() : 'Player';
  const played = playerStats?.totalMatchesPlayed ?? 0;
  const won = playerStats?.totalMatchesWon ?? 0;
  const rate = played > 0 ? `${Math.round((won / played) * 100)}%` : '—';

  const meta = [user?.email, user?.location].filter(Boolean).join(' · ').toUpperCase();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Identity slab */}
        <View style={{ overflow: 'hidden' }}>
          <Hairlines />
          <Ghost
            text={name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
            size={150}
            style={{ right: -26, top: -8 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingTop: 10 }}>
            <AvatarPicker name={name} imageUrl={user?.profileImage} size={76} />
            <View style={{ flex: 1, paddingBottom: 3 }}>
              <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 26, color: '#fff' }}>
                {name}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => router.push('/profile/edit')}
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 4, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="settings" size={17} color="#fff" strokeWidth={1.9} />
            </Pressable>
          </View>
          {meta ? (
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, color: '#a3a3a3', paddingHorizontal: 16, paddingTop: 12 }}>
              {meta}
            </Text>
          ) : null}
          <View style={{ marginTop: 13 }}>
            <Hazard />
          </View>
        </View>

        {/* Career strip */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
          <StatCell label="Events" value={String(playerStats?.totalTournaments ?? 0)} />
          <StatCell label="Matches" value={String(played)} />
          <StatCell label="Wins" value={String(won)} accent />
          <StatCell label="Rate" value={rate} last />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {user?.titles?.length ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ ...LBL, marginBottom: 8 }}>Honors</Text>
              <View style={{ gap: 7 }}>
                {user.titles.map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#F97316', borderRadius: 6 }}>
                    <Icon name="trophy" size={17} color="#0B0B0B" strokeWidth={2.2} />
                    <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 14, color: '#0B0B0B' }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Grouped, not a flat list of eight rows */}
          {groupMenu().map((group) => (
            <View key={group.title} style={{ marginBottom: 14 }}>
              <Text style={{ ...LBL, marginBottom: 8 }}>{group.title}</Text>
              <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
                {group.items.map((item, i) => (
                  <MenuRow
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    first={i === 0}
                    onPress={() => router.push(item.href as any)}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,68,56,0.4)', borderRadius: 6, overflow: 'hidden' }}>
            <MenuRow label="Log out" icon="logout" danger first onPress={() => dispatch(logout())} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
