import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/store/slices/registrationSlice';

export function BracketTab({ tournamentId, categories }: { tournamentId: string; categories: Category[] }) {
  const router = useRouter();

  if (categories.length === 0) {
    return (
      <View className="m-4 items-center rounded-2xl border border-white/10 bg-white/5 p-8">
        <Text className="text-center font-montserrat text-gray-400">No categories announced for this tournament yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3 p-4">
      <Text className="font-oswald text-xl font-bold uppercase text-white">Bracket</Text>
      {categories.map((cat) => (
        <View key={cat._id} className="flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <Text className="flex-1 font-oswald text-lg font-bold uppercase text-white" numberOfLines={1}>{cat.name}</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/bracket/[tournamentId]/[categoryId]', params: { tournamentId, categoryId: cat._id, type: cat.bracketType || 'knockout' } })}
            className="rounded-xl bg-brand px-4 py-2"
          >
            <Text className="font-montserrat text-xs font-bold uppercase text-white">View Bracket</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
