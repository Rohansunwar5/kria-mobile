import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, display, font } from '@/constants/theme';
import { KriaMark } from '@/components/KriaMark';
import { Button } from '@/components/ui/Button';
import { Tap } from '@/components/ui/Tap';

const PHOTO = { w: 1672, h: 941, box: 520 };

export default function Welcome() {
  const router = useRouter();
  const { width: boxW } = useWindowDimensions();
  // Cover the photo box, focal point 58% / 30% as in the mock.
  const scale = Math.max(boxW / PHOTO.w, PHOTO.box / PHOTO.h);
  const imgW = PHOTO.w * scale;
  const imgH = PHOTO.h * scale;
  return (
    <View style={s.screen}>
      <View style={s.photoBox}>
        <Image
          source={require('../../../assets/images/welcome.png')}
          style={{ width: imgW, height: imgH, marginLeft: -(imgW - boxW) * 0.58, marginTop: -(imgH - PHOTO.box) * 0.3 }}
          accessible={false}
        />
      </View>
      <Svg style={s.fade} width="100%" height={240}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="0.85" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
      <SafeAreaView style={s.content} edges={['top', 'bottom']}>
        <View style={s.bottom}>
          <KriaMark width={56} />
          <View>
            {['Play.', 'Compete.', 'Get on the board.'].map((t) => <Text key={t} style={display(64)}>{t}</Text>)}
          </View>
          <Text style={s.sub}>Host games with friends, enter real tournaments and build a record that counts.</Text>
          <Button label="Create account" onPress={() => router.push('/(auth)/intro')} />
          <Tap accessibilityLabel="Log in" onPress={() => router.push('/(auth)/login')} style={s.login}>
            <Text style={s.loginText}>I already have an account · <Text style={s.loginLink}>Log in</Text></Text>
          </Tap>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  photoBox: { position: 'absolute', top: 0, left: 0, right: 0, height: PHOTO.box, overflow: 'hidden' },
  fade: { position: 'absolute', top: 300, left: 0, right: 0 },
  content: { flex: 1, paddingHorizontal: 24 },
  bottom: { flex: 1, justifyContent: 'flex-end', gap: 16, paddingBottom: 12 },
  sub: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.text2 },
  login: { height: 44, alignItems: 'center', justifyContent: 'center' },
  loginText: { fontFamily: font.regular, fontSize: 14, color: colors.text3 },
  loginLink: { fontFamily: font.semibold, color: colors.text },
});
