import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchRegistrationsByCategory } from '@/store/slices/registrationSlice';
import { InitialsAvatar } from '@/components/InitialsAvatar';

export function PlayersTab() {
  const dispatch = useAppDispatch();
  const { categories, categoryRegistrations, isLoading } = useAppSelector((s) => s.registration);
  const { teams } = useAppSelector((s) => s.team);
  const [selected, setSelected] = useState('');

  useEffect(() => { if (categories.length && !selected) setSelected(categories[0]._id); }, [categories, selected]);
  useEffect(() => { if (selected) dispatch(fetchRegistrationsByCategory(selected)); }, [selected, dispatch]);

  const visible = categoryRegistrations.filter((r) => r.status === 'approved' || r.status === 'assigned' || r.status === 'auctioned');

  return (
    <View className="gap-4 px-5 py-6">
      <Text className="font-oswald text-2xl font-bold text-white">Approved Players</Text>
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((cat) => (
            <Pressable key={cat._id} onPress={() => setSelected(cat._id)} className={`rounded-full border px-4 py-2 ${selected === cat._id ? 'border-brand bg-brand' : 'border-white/15'}`}>
              <Text className={`font-montserrat text-sm ${selected === cat._id ? 'text-white' : 'text-gray-300'}`}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {isLoading ? (
        <ActivityIndicator color="#F97316" />
      ) : visible.length === 0 ? (
        <Text className="py-10 text-center font-montserrat text-gray-400">No players approved for this category yet.</Text>
      ) : (
        visible.map((reg) => {
          const team = reg.status === 'auctioned' && reg.teamId ? teams.find((t) => t._id === reg.teamId) : null;
          const name = `${reg.profile?.firstName || ''} ${reg.profile?.lastName || ''}`.trim();
          return (
            <View key={reg._id} className="flex-row items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <InitialsAvatar name={name} size={48} />
              <View className="flex-1">
                <Text className="font-montserrat text-base font-bold capitalize text-white">{name}</Text>
                <View className="mt-1 flex-row flex-wrap items-center gap-2">
                  <Text className="font-montserrat text-xs capitalize text-gray-400">{reg.profile?.gender}</Text>
                  {reg.status === 'approved' && <Text className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-montserrat text-xs text-emerald-400">Verified</Text>}
                  {team && <Text style={{ color: team.primaryColor || '#F97316' }} className="rounded border px-2 py-0.5 font-montserrat text-xs font-bold">{team.name}</Text>}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
