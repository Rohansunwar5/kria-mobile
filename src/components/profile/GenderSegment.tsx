import { View, Pressable, Text } from 'react-native';

// EditProfile.dc.html: three hard cells inside one 5px box, hairline dividers,
// Anton labels. Not a pill group.
const OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function GenderSegment({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 5, overflow: 'hidden' }}>
      {OPTIONS.map((o, i) => {
        const on = value === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: 13,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? '#F97316' : 'transparent',
              ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: 'rgba(255,255,255,0.14)' } : null),
            }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 13, color: on ? '#0B0B0B' : '#7d7d7d' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
