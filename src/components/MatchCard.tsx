import { StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { sportIcon } from '@/components/ui/Icon';
import { Chip, LivePill, ResultBadge } from '@/components/ui/Pills';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font } from '@/constants/theme';
import { sportName } from '@/lib/homeView';
import type { MatchCardView } from '@/lib/matchCard';

/** DESIGN §5.5 / mock 1c: Home's Up next and every row of Compete › Matches. */
export function MatchCard({ v }: { v: MatchCardView }) {
  const people = [...v.avatars, ...(v.extra ? [`+${v.extra}`] : [])];
  return (
    <Tap scale={0.98} accessibilityLabel={v.title} onPress={() => router.push(v.href as Href)} style={[s.card, v.dim && { opacity: 0.6 }]}>
      <View style={s.top}>
        <View style={s.chips}>
          <Chip icon={sportIcon(v.sport)} label={sportName(v.sport)} />
          <Chip label={v.format} />
        </View>
        {v.right?.kind === 'live' ? <LivePill /> : null}
        {v.right?.kind === 'code' ? <Text style={s.code} accessibilityLabel={`Join code ${v.right.code.split('').join(' ')}`}>{v.right.code}</Text> : null}
        {v.right?.kind === 'text' ? <Text style={s.date}>{v.right.text}</Text> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={display(24)} numberOfLines={2}>{v.title}</Text>
        {v.line ? <Text style={s.line}>{v.line}</Text> : null}
      </View>

      {v.foot || v.footSub || people.length || v.result ? (
        <View style={s.foot}>
          <View style={{ flexShrink: 1, gap: 3 }}>
            {v.foot ? <Text style={[s.footText, v.dim && { color: colors.text3 }]}>{v.foot}</Text> : null}
            {v.footSub ? <Text style={s.footSub}>{v.footSub}</Text> : null}
          </View>
          {people.length ? (
            <View style={{ flexDirection: 'row' }}>
              {people.map((p, i) => (
                <View key={`${p}${i}`} style={[s.avatar, i > 0 && { marginLeft: -6 }]}>
                  <Text style={s.avatarText}>{p}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {v.result ? <ResultBadge result={v.result} /> : null}
        </View>
      ) : null}
    </Tap>
  );
}

const s = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, backgroundColor: colors.surface1, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  code: { fontFamily: font.mono, fontSize: 12, letterSpacing: 0.72, color: colors.text3 },
  date: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  line: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardLine },
  footText: { fontFamily: font.semibold, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  footSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface3, borderWidth: 2, borderColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.semibold, fontSize: 10, color: colors.text },
});
