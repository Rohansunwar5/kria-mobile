// src/app/(onboarding)/welcome.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Hairlines, Hazard, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';

// The proof strip: three facts we can actually stand behind. Badminton and
// cricket are the only sports with auction + live + standings, hence "2".
const PROOF = [
  { value: '2', label: 'Sports live' },
  { value: 'Live', label: 'Auctions' },
  { value: 'Free', label: 'To join' },
];

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <LinearGradient
        colors={['#3a2415', '#141414', '#0B0B0B']}
        locations={[0, 0.58, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Hairlines />
      <Ghost text="K" size={290} color="rgba(249,115,22,0.10)" style={{ left: -40, top: 40 }} />
      <LinearGradient
        colors={['transparent', 'rgba(11,11,11,0.55)', '#0B0B0B']}
        locations={[0.12, 0.48, 0.86]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 24, color: '#fff' }}>Kria</Text>
          <Lbl style={{ color: '#F97316', letterSpacing: 0.3 * 9, marginTop: 4 }}>Sports</Lbl>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ height: 5, width: 64, marginBottom: 18, overflow: 'hidden' }}>
            <Hazard />
          </View>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 52, lineHeight: 46, color: '#fff' }}>
            Play.{'\n'}Compete.{'\n'}
            <Text style={{ color: '#F97316' }}>Get picked.</Text>
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, lineHeight: 21, color: '#d4d4d4', marginTop: 16, maxWidth: 310 }}>
            Enter real tournaments, go into a live auction, and build a record that follows your name.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 22, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' }}>
          {PROOF.map((p, i) => (
            <View
              key={p.label}
              style={{
                flex: 1,
                paddingVertical: 11,
                paddingLeft: i === 0 ? 20 : 14,
                ...(i < PROOF.length - 1 ? { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.12)' } : null),
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 19, color: '#fff' }}>{p.value}</Text>
              <Lbl style={{ letterSpacing: 0.1 * 9, marginTop: 2 }}>{p.label}</Lbl>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26 }}>
          <Btn label="Get started" arrow onPress={() => router.push('/(onboarding)/story')} style={{ marginBottom: 9 }} />
          <Btn label="I already have an account" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </SafeAreaView>
    </View>
  );
}
