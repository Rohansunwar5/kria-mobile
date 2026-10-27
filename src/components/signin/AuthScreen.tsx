import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, display, font } from '@/constants/theme';
import { FooterBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';

/**
 * Sign-in shell: header row, optional 3-segment progress, scroll body, pinned footer, all above the keyboard.
 * `label` sits in the header: centred after a back button, else at the left (mocks 5f/5g).
 */
export function AuthScreen({ onBack, label, right, step, footer, children }: {
  onBack?: () => void; label?: string; right?: React.ReactNode; step?: 1 | 2 | 3; footer: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={s.back}>
              <Icon name="arrow_back" size={24} />
            </Pressable>
          ) : label ? null : <View style={s.back} />}
          {label ? <Text style={[s.label, !onBack && s.labelLeft]} numberOfLines={1}>{label}</Text> : null}
          {typeof right === 'string' ? <Text style={s.right}>{right}</Text> : right}
        </View>
        {step ? (
          <View style={s.progress}>
            {[1, 2, 3].map((i) => <View key={i} style={[s.seg, { backgroundColor: i <= step ? colors.accent : colors.coverIn }]} />)}
          </View>
        ) : null}
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        <FooterBar><View style={{ flex: 1 }}>{footer}</View></FooterBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: string; sub?: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={display(44)}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  right: { fontFamily: font.regular, fontSize: 13, color: colors.text3, paddingRight: 12 },
  label: { flex: 1, textAlign: 'center', fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  labelLeft: { textAlign: 'left', paddingLeft: 12 },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 24 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  body: { padding: 24, gap: 22 },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3 },
});
