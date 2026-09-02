import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '@/components/icons';

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
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Date of birth"
        onPress={() => setShow(true)}
        style={{
          height: 52,
          borderRadius: 5,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.14)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingHorizontal: 13,
        }}
      >
        <Icon name="calendar" size={15} color="#7d7d7d" strokeWidth={2} />
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 14, color: value ? '#fff' : '#7d7d7d' }}>
          {value
            ? parseLocal(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
            : 'SELECT'}
        </Text>
      </Pressable>
      {show && <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={handle} />}
    </View>
  );
}
