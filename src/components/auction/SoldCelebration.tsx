import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { Hairlines, Hazard, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';

interface Props {
  playerName: string;
  teamName: string;
  teamColor?: string;
  soldPrice: number;
}

export function SoldCelebration({ playerName, teamName, teamColor, soldPrice }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0B0B', paddingHorizontal: 26, overflow: 'hidden' }}>
      <Hairlines />
      <Ghost text="Sold" size={230} style={{ left: -30 }} />

      <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center' }}>
        <Lbl style={{ letterSpacing: 0.3 * 9 }}>Sold to</Lbl>
        <Text
          style={{
            fontFamily: 'Anton_400Regular',
            textTransform: 'uppercase',
            fontSize: 46,
            lineHeight: 41,
            textAlign: 'center',
            marginTop: 12,
            color: teamColor || '#F97316',
          }}
        >
          {teamName}
        </Text>

        <View style={{ height: 5, width: 72, marginVertical: 18, overflow: 'hidden' }}>
          <Hazard />
        </View>

        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 24, lineHeight: 22, color: '#d4d4d4', textAlign: 'center' }}>
          {playerName}
        </Text>

        <View style={{ marginTop: 20, backgroundColor: '#F97316', borderRadius: 6, paddingHorizontal: 22, paddingVertical: 12 }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 32, color: '#0B0B0B' }}>
            ₹{soldPrice.toLocaleString('en-IN')}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
