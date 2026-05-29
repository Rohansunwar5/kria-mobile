import { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerForCategory, fetchMyRegistrations, type Category } from '@/store/slices/registrationSlice';
import { computeAge, feeBreakdown } from '@/lib/format';

const SKILLS = ['beginner', 'intermediate', 'advanced', 'professional'];

export function RegisterModal({ category, tournamentId, onClose }: { category: Category | null; tournamentId: string; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { isLoading, error } = useAppSelector((s) => s.registration);
  const [skillLevel, setSkillLevel] = useState('intermediate');

  if (!category) return null;
  const profileReady = !!user?.gender && !!user?.dateOfBirth;
  const age = computeAge(user?.dateOfBirth);

  const submitFree = async () => {
    if (!user || !profileReady) return;
    const result = await dispatch(registerForCategory({
      tournamentId,
      categoryId: category._id,
      profile: { firstName: user.firstName, lastName: user.lastName, age, gender: user.gender || 'male', phone: user.phone || '', skillLevel },
    }));
    if (registerForCategory.fulfilled.match(result)) { dispatch(fetchMyRegistrations()); onClose(); }
  };

  const fees = category.isPaidRegistration ? feeBreakdown(category.registrationFee) : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="rounded-t-3xl border-t border-white/10 bg-[#1a1a1a] p-6">
          <Text className="mb-5 font-oswald text-2xl font-bold text-white">Complete Registration</Text>

          {fees && (
            <View className="mb-4 rounded-xl border border-brand/30 bg-brand/10 p-4">
              <Text className="mb-2 font-montserrat text-sm font-semibold text-brand">Payment Summary</Text>
              <View className="flex-row justify-between"><Text className="font-montserrat text-gray-300">Registration Fee</Text><Text className="font-montserrat text-gray-300">₹{fees.base.toFixed(2)}</Text></View>
              <View className="flex-row justify-between"><Text className="font-montserrat text-gray-400">Convenience Fee (incl. GST)</Text><Text className="font-montserrat text-gray-400">₹{fees.convenienceFee.toFixed(2)}</Text></View>
              <View className="my-1 h-px bg-white/10" />
              <View className="flex-row justify-between"><Text className="font-montserrat font-bold text-white">Total</Text><Text className="font-montserrat font-bold text-brand">₹{fees.total.toFixed(2)}</Text></View>
            </View>
          )}

          {!profileReady && (
            <Pressable onPress={() => { onClose(); router.push('/(tabs)/profile'); }} className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <Text className="font-montserrat text-sm text-yellow-400">Update your profile with gender and date of birth before registering.</Text>
            </Pressable>
          )}

          <Text className="font-montserrat text-sm text-gray-400">Player</Text>
          <Text className="mb-3 font-montserrat text-white">{user?.firstName} {user?.lastName} · {profileReady ? `${age}` : '—'} · {user?.gender || '—'}</Text>

          <Text className="mb-2 font-montserrat text-sm text-gray-400">Skill Level</Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {SKILLS.map((s) => (
              <Pressable key={s} onPress={() => setSkillLevel(s)} className={`rounded-full border px-4 py-2 ${skillLevel === s ? 'border-brand bg-brand' : 'border-white/15'}`}>
                <Text className={`font-montserrat text-sm capitalize ${skillLevel === s ? 'text-white' : 'text-gray-300'}`}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}

          <View className="flex-row justify-end gap-3">
            <Pressable onPress={onClose} className="rounded-xl border border-white/10 px-5 py-3"><Text className="font-montserrat text-white">Cancel</Text></Pressable>
            {category.isPaidRegistration ? (
              <View className="rounded-xl bg-white/10 px-6 py-3"><Text className="font-montserrat font-bold text-gray-400">Online payment — coming soon</Text></View>
            ) : (
              <Pressable onPress={submitFree} disabled={isLoading || !profileReady} className="flex-row items-center gap-2 rounded-xl bg-brand px-6 py-3" style={{ opacity: isLoading || !profileReady ? 0.5 : 1 }}>
                {isLoading ? <ActivityIndicator color="#fff" /> : null}
                <Text className="font-montserrat font-bold text-white">Submit</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
