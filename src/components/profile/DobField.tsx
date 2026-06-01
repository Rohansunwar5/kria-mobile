import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Emits an ISO YYYY-MM-DD string; `value` is that same string or ''.
export function DobField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const parseLocal = (v: string) => {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const date = value ? parseLocal(value) : new Date(2000, 0, 1);

  const handle = (_e: unknown, picked?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (picked) onChange(picked.toISOString().split('T')[0]);
  };

  return (
    <View className="gap-1.5">
      <Text className="font-montserrat text-xs uppercase tracking-wide text-gray-500">Date of Birth</Text>
      <Pressable
        onPress={() => setShow(true)}
        className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
      >
        <Text className="font-montserrat text-white">
          {value ? parseLocal(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select date'}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          onChange={handle}
        />
      )}
    </View>
  );
}
