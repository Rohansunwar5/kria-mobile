import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import API from '@/api/axios';
import type { Team } from '@/store/slices/teamSlice';
import { useAppSelector } from '@/store/hooks';
import { InitialsAvatar } from '@/components/InitialsAvatar';

interface RosterPlayer {
  _id: string;
  profile: { firstName: string; lastName: string; gender: string; skillLevel?: string };
  auctionData?: { soldPrice?: number };
  status: string;
}

export function TeamsTab({ myTeam }: { myTeam: Team | null | undefined }) {
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
  }, [teams.map((t) => t._id).join(','), myTeam?._id]);

  if (isLoading) return <View className="py-8"><ActivityIndicator color="#F97316" /></View>;
  if (teams.length === 0) return <View className="px-5 py-10"><Text className="text-center font-montserrat text-gray-400">No teams registered yet.</Text></View>;

  return (
    <View className="gap-4 px-5 py-6">
      <Text className="font-oswald text-2xl font-bold text-white">Participating Teams</Text>
      {teams.map((team) => {
        const isMine = myTeam?._id === team._id;
        const isOpen = expanded === team._id;
        const roster = rosters[team._id] ?? [];
        const color = team.primaryColor || '#F97316';
        return (
          <View key={team._id} className="overflow-hidden rounded-3xl border bg-black/40" style={{ borderColor: isMine ? `${color}60` : 'rgba(255,255,255,0.08)' }}>
            <View className="h-1 w-full" style={{ backgroundColor: color }} />
            <Pressable onPress={() => setExpanded(isOpen ? null : team._id)} className="flex-row items-center gap-4 p-5">
              <InitialsAvatar name={team.name} size={48} color={color} />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-oswald text-lg font-black text-white">{team.name}</Text>
                  {isMine && <Text style={{ backgroundColor: color }} className="rounded-full px-2 py-0.5 font-montserrat text-[10px] font-black uppercase text-white">Your Team</Text>}
                </View>
                <Text className="mt-0.5 font-montserrat text-sm text-gray-400">
                  {loadingRoster[team._id] ? 'Loading…' : `${roster.length} player${roster.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Text className="text-gray-400">{isOpen ? '▲' : '▼'}</Text>
            </Pressable>
            {isOpen && (
              <View className="gap-3 border-t border-white/10 px-5 pb-5 pt-4">
                {isMine && team.whatsappGroupLink && (
                  <Pressable onPress={() => Linking.openURL(team.whatsappGroupLink!)} className="self-start rounded-2xl px-5 py-2.5" style={{ backgroundColor: '#128C7E' }}>
                    <Text className="font-montserrat text-sm font-bold text-white">Join WhatsApp Group</Text>
                  </Pressable>
                )}
                {loadingRoster[team._id] ? (
                  <ActivityIndicator color="#F97316" />
                ) : roster.length === 0 ? (
                  <Text className="py-4 text-center font-montserrat text-sm text-gray-500">No players assigned yet.</Text>
                ) : (
                  roster.map((p) => {
                    const name = `${p.profile.firstName} ${p.profile.lastName}`;
                    return (
                      <View key={p._id} className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <InitialsAvatar name={name} color={color} />
                        <View className="flex-1">
                          <Text className="font-montserrat text-sm font-semibold capitalize text-white">{name}</Text>
                          <Text className="font-montserrat text-xs capitalize text-gray-500">{p.profile.gender}{p.profile.skillLevel ? ` · ${p.profile.skillLevel}` : ''}</Text>
                        </View>
                        {p.auctionData?.soldPrice ? <Text style={{ color }} className="font-montserrat text-xs font-bold">₹{p.auctionData.soldPrice.toLocaleString()}</Text> : null}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
