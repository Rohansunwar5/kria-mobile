import { View, Pressable, Text } from 'react-native';

const OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export function GenderSegment({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-row gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
      {OPTIONS.map((o) => {
        const on = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center rounded-xl py-2.5 ${on ? 'bg-brand' : ''}`}
          >
            <Text className={`font-montserrat text-sm ${on ? 'font-semibold text-white' : 'text-gray-400'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
