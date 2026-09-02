import { View, Text } from 'react-native';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hazard } from '@/components/canvas';

export function ChampionBanner({ teamName }: { teamName: string }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(22,196,106,0.5)', borderRadius: 6, overflow: 'hidden' }}>
      <Hazard height={4} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <InitialsAvatar name={teamName} size={44} color="#16C46A" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#16C46A' }}>
            Champion
          </Text>
          <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 24, color: '#fff', marginTop: 5 }}>
            {teamName}
          </Text>
        </View>
      </View>
    </View>
  );
}
