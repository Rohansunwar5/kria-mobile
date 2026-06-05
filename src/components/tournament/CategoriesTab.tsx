import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import type { Category } from '@/store/slices/registrationSlice';
import { RegisterModal } from './RegisterModal';

export function CategoriesTab({ tournamentId, tournamentStatus }: { tournamentId: string; tournamentStatus: string }) {
  const router = useRouter();
  const { categories, myRegistrations, isLoading } = useAppSelector((s) => s.registration);
  const { user } = useAppSelector((s) => s.auth);
  const [selected, setSelected] = useState<Category | null>(null);

  const isRegistered = (categoryId: string) => myRegistrations.some((r) => r.categoryId === categoryId);

  const openRegister = (cat: Category) => {
    if (!user) { router.push('/(auth)/login'); return; }
    if (cat.isPaidRegistration && cat.registrationFee > 0) {
      router.push({ pathname: '/checkout/[tournamentId]/[categoryId]', params: { tournamentId, categoryId: cat._id } });
    } else {
      setSelected(cat);
    }
  };

  if (categories.length === 0) {
    return <View className="px-5 py-10"><Text className="text-center font-montserrat text-gray-400">No categories announced yet.</Text></View>;
  }

  return (
    <View className="gap-4 px-5 py-6">
      <Text className="font-oswald text-2xl font-bold text-white">Registration Categories</Text>
      {categories.map((category) => {
        const registered = isRegistered(category._id);
        return (
          <View key={category._id} className="gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
            <Text className="font-oswald text-xl font-bold text-white">{category.name}</Text>
            {category.description ? <Text className="font-montserrat text-sm text-gray-400">{category.description}</Text> : null}
            <View className="flex-row flex-wrap gap-x-6 gap-y-1">
              <Text className="font-montserrat text-xs text-gray-400">Format: <Text className="text-white capitalize">{category.bracketType?.replace('_', ' ') || 'TBD'}</Text></Text>
              <Text className="font-montserrat text-xs text-gray-400">Gender: <Text className="text-white">{category.gender}</Text></Text>
              <Text className="font-montserrat text-xs text-gray-400">Max: <Text className="text-white">{category.maxRegistrations || 'Unlimited'}</Text></Text>
              <Text className="font-montserrat text-xs text-gray-400">Fee: <Text className={category.isPaidRegistration ? 'text-brand' : 'text-emerald-400'}>{category.isPaidRegistration ? `₹${category.registrationFee}` : 'Free'}</Text></Text>
            </View>
            {registered ? (
              <View className="items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 py-2.5"><Text className="font-montserrat font-medium text-emerald-400">Registered</Text></View>
            ) : tournamentStatus === 'registration_open' ? (
              <Pressable onPress={() => openRegister(category)} disabled={isLoading} className="items-center rounded-xl bg-brand py-2.5">
                <Text className="font-montserrat font-bold text-white">{category.isPaidRegistration ? `Pay ₹${category.registrationFee}+ & Register` : 'Register Now'}</Text>
              </Pressable>
            ) : (
              <View className="items-center rounded-xl bg-gray-500/20 py-2.5"><Text className="font-montserrat font-bold text-gray-400">Registration Closed</Text></View>
            )}
          </View>
        );
      })}
      <RegisterModal category={selected} tournamentId={tournamentId} onClose={() => setSelected(null)} />
    </View>
  );
}
