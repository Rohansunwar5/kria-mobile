import { useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, display, font } from '@/constants/theme';
import { KriaMark } from '@/components/KriaMark';
import { Button } from '@/components/ui/Button';
import { Tap } from '@/components/ui/Tap';
import { googleIdToken, googleSignInAvailable, googleSignOut } from '@/lib/googleSignIn';
import { googleSignIn } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';

const PHOTO = { w: 1672, h: 941, box: 520 };
const GOOGLE_FAILED = "Couldn't sign in with Google. Try again.";

/** Mock 5a's mark on Continue with Google: a light disc with a "G". */
const GDisc = () => <View style={s.gDisc}><Text style={s.gText}>G</Text></View>;

export default function Welcome() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SERVER-GAPS #35. The AuthGate routes once signed in: Your game when new, else Home.
  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const idToken = await googleIdToken();
      if (!idToken) return; // cancelled the picker
      const res = await dispatch(googleSignIn({ idToken }));
      if (googleSignIn.rejected.match(res)) {
        setError(res.payload ?? GOOGLE_FAILED);
        await googleSignOut(); // or the next tap reuses the refused account without the picker
      }
    } catch (e) {
      // Google's SDK failed: its code (e.g. DEVELOPER_ERROR on a SHA-1 mismatch) is only in this log.
      console.warn('[google sign-in]', e);
      setError(GOOGLE_FAILED);
    } finally {
      setBusy(false);
    }
  };

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
          {googleSignInAvailable() ? (
            <Button variant="secondary" label="Continue with Google" busy={busy} busyLabel="Signing in" lead={<GDisc />} onPress={google} />
          ) : null}
          <Tap accessibilityLabel="Log in" onPress={() => router.push('/(auth)/login')} style={s.login}>
            <Text style={s.loginText}>I already have an account · <Text style={s.loginLink}>Log in</Text></Text>
          </Tap>
          {error ? <Text style={s.error}>{error}</Text> : null}
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
  gDisc: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  gText: { fontFamily: font.bold, fontSize: 13, color: colors.bg },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.error, textAlign: 'center' },
});
