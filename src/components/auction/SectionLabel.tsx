import { View, Text } from 'react-native';

/** The mono caps label + orange count that heads every panel on this screen. */
export function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#F97316' }}>
          {String(count).padStart(2, '0')}
        </Text>
      ) : null}
    </View>
  );
}
