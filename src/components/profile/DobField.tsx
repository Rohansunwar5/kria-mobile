import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '@/components/icons';

// Local calendar day, not toISOString(): that converts to UTC, which in IST
// turns a picked local midnight into the previous day.
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Emits an ISO YYYY-MM-DD string; `value` is that same string or ''.
export function DobField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const parseLocal = (v: string) => {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const date = value ? parseLocal(value) : new Date(2000, 0, 1);

  const pick = (_e: unknown, picked: Date) => {
    if (Platform.OS === 'android') setShow(false);
    onChange(toISODate(picked));
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
        <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, color: value ? '#fff' : '#7d7d7d' }}>
          {value
            ? parseLocal(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
            : 'SELECT'}
        </Text>
      </Pressable>
      {/* The picker library has no web build (it renders null), so on web an
          invisible native date input sits over the field and takes the tap. */}
      {Platform.OS === 'web' ? (
        <input
          type="date"
          aria-label="Date of birth"
          value={value}
          max={toISODate(new Date())}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
      ) : (
        show && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onValueChange={pick}
            onDismiss={() => setShow(false)}
          />
        )
      )}
    </View>
  );
}
