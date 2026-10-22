import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SkillLevel, TournamentCategory } from '@/api/tournaments';
import { FactsGrid } from '@/components/tournament/FactsGrid';
import { Tap } from '@/components/ui/Tap';
import { colors, font, radius, space } from '@/constants/theme';
import { categoryFacts, entryLine, howItWorks, type EntryUser } from '@/lib/entryView';
import { feeBreakdown, rupees } from '@/lib/format';
import { initials } from '@/lib/matchCard';
import { isFree } from '@/lib/tournamentView';

const SKILLS: { key: SkillLevel; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'professional', label: 'Professional' },
];

/** Mock 2b form: facts, how it works, your entry, skill level, payment. `user` null hides your entry; no `onSkill` hides the skill choice. */
export function EntryForm({ category: c, teamsCount, user, now, skill, onSkill, onEditProfile }: {
  category: TournamentCategory;
  teamsCount: number;
  user: EntryUser | null;
  now: Date;
  skill: SkillLevel | null;
  onSkill?: (s: SkillLevel) => void;
  onEditProfile: () => void;
}) {
  const fee = feeBreakdown(c.registrationFee);
  const rows = [
    ['Entry fee', fee.base], ['Payment gateway (2%)', fee.razorpayFee], ['Platform fee (2%)', fee.platformFee], ['GST (18% on fees)', fee.gst], ['Total', fee.total],
  ] as const;
  const name = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <View style={s.root}>
      <FactsGrid items={categoryFacts(c)} />

      <View style={s.section}>
        <Text style={s.h}>How it works</Text>
        {howItWorks(c, teamsCount).map((st, i) => (
          <View key={st.title} style={s.step}>
            <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
            <View style={s.stepText}>
              <Text style={s.stepTitle}>{st.title}</Text>
              <Text style={s.stepBody}>{st.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {user ? (
        <View style={s.section}>
          <View style={s.headRow}>
            <Text style={s.h}>Your entry</Text>
            <Pressable accessibilityRole="link" hitSlop={12} onPress={onEditProfile}>
              <Text style={s.link}>Edit profile</Text>
            </Pressable>
          </View>
          <View style={s.card}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} accessibilityIgnoresInvertColors style={s.avatar} />
            ) : (
              <View style={s.avatar}><Text style={s.ini}>{initials(name)}</Text></View>
            )}
            <View style={s.who}>
              <Text style={s.name} numberOfLines={1}>{name}</Text>
              <Text style={s.meta}>{entryLine(user, now)}</Text>
            </View>
          </View>
          {!user.dateOfBirth || !user.gender ? (
            <Text style={s.note}>Add your date of birth and gender to enter</Text>
          ) : (
            <Text style={s.fine}>Age and gender come from your profile. Organisers see this snapshot and your skill level.</Text>
          )}
        </View>
      ) : null}

      {user && onSkill ? (
        <View style={s.skills}>
          <Text style={s.label}>Skill level</Text>
          {[SKILLS.slice(0, 2), SKILLS.slice(2)].map((pair) => (
            <View key={pair[0].key} style={s.pair}>
              {pair.map((k) => {
                const on = skill === k.key;
                return (
                  <Tap
                    key={k.key}
                    accessibilityState={{ selected: on }}
                    onPress={() => onSkill(k.key)}
                    style={[s.skill, { backgroundColor: on ? colors.text : colors.surface2 }]}
                  >
                    <Text style={[s.skillText, { color: on ? colors.bg : colors.text }]}>{k.label}</Text>
                  </Tap>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}

      <View>
        <Text style={[s.h, { paddingBottom: 12 }]}>Payment</Text>
        {isFree(c) ? (
          <Text style={s.row}>Free entry</Text>
        ) : (
          <>
            {rows.map(([k, v], i) => {
              const total = i === rows.length - 1;
              return (
                <View key={k} style={[s.feeRow, total && s.totalRow]}>
                  <Text style={[s.row, total && s.total]}>{k}</Text>
                  <Text style={[s.row, total && s.total]}>{rupees(v)}</Text>
                </View>
              );
            })}
            <Text style={[s.fine, { paddingTop: 4 }]}>Paid via Razorpay · UPI, cards, netbanking</Text>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: space.sectionGap, paddingTop: 20 },
  section: { gap: 12 },
  h: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: font.bold, fontSize: 12, color: colors.text },
  stepText: { flex: 1, gap: 2, paddingTop: 2 },
  stepTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  stepBody: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text3 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontFamily: font.medium, fontSize: 13, color: colors.text3 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: space.cardInner, borderRadius: 18, backgroundColor: colors.surface1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ini: { fontFamily: font.bold, fontSize: 16, color: colors.text2 },
  who: { flex: 1, gap: 2 },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  note: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.accent },
  fine: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text4 },
  skills: { gap: 8 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2, paddingBottom: 2 },
  pair: { flexDirection: 'row', gap: 8 },
  skill: { flex: 1, height: 48, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  skillText: { fontFamily: font.semibold, fontSize: 14 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.lineStrong },
  row: { fontFamily: font.regular, fontSize: 14, color: colors.text2, fontVariant: ['tabular-nums'] },
  total: { fontFamily: font.bold, color: colors.text },
});
