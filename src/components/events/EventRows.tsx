import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Crests, EventImage, Where, type Crest } from '@/components/EventCard';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius } from '@/constants/theme';
import { dateSpan, featuredCta } from '@/lib/eventsList';
import { sportName } from '@/lib/homeView';
import { tournamentSports } from '@/lib/sports';
import type { Tournament } from '@/store/slices/tournamentSlice';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Mock 1f featured: the 196px banner, condensed name, and one action. */
export function Featured({ t, crests }: { t: Tournament; crests?: Crest[] }) {
  const sports = tournamentSports(t).map(sportName).join(' · ');
  const detail = [sports, t.teamsCount ? `${t.teamsCount} teams` : ''].filter(Boolean).join(' · ');
  const open = () => router.push(`/tournament/${t._id}`);
  return (
    <View style={{ gap: 18 }}>
      <Tap scale={0.99} accessibilityLabel={t.name} onPress={open}>
        <EventImage t={t} height={196} round={radius.cardLg} date={dateSpan(t.startDate, t.endDate)} />
      </Tap>
      <View style={{ gap: 6 }}>
        <Text style={display(30)}>{t.name}</Text>
        <Where t={t} />
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      {t.status === 'auction_in_progress' && crests?.length ? (
        <View style={s.teams}>
          <Crests crests={crests} size={36} />
          <Text style={s.detail}>{`${crests.length} teams bidding for players`}</Text>
        </View>
      ) : null}
      <Tap accessibilityLabel={featuredCta(t.status)} onPress={open} style={s.cta}>
        <Text style={s.ctaText}>{featuredCta(t.status)}</Text>
      </Tap>
    </View>
  );
}

/** Past events collapse to compact date-led rows (DESIGN §5.4). */
export function PastRow({ t }: { t: Tournament }) {
  const d = new Date(t.startDate);
  const cancelled = t.status === 'cancelled';
  return (
    <Tap scale={0.99} accessibilityLabel={`${t.name}, ${cancelled ? 'cancelled' : 'completed'}`} onPress={() => router.push(`/tournament/${t._id}`)} style={s.past}>
      <View style={s.date}>
        <Text style={s.mon}>{MONTHS[d.getMonth()]}</Text>
        <Text style={[display(28), { color: colors.text3 }]}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.pastName} numberOfLines={2}>{t.name}</Text>
        {t.venue?.name || t.venue?.city ? <Text style={s.venue} numberOfLines={1}>{[t.venue?.name, t.venue?.city].filter(Boolean).join(' · ')}</Text> : null}
        <Text style={[s.state, { color: cancelled ? colors.text4 : colors.text3 }]}>{cancelled ? 'Cancelled by organiser' : 'Completed'}</Text>
      </View>
      <Icon name="chevron_right" size={20} color={colors.disabled} />
    </Tap>
  );
}

const s = StyleSheet.create({
  detail: { fontFamily: font.regular, fontSize: 13, color: colors.text2 },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cta: { height: 50, borderRadius: radius.input, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.bold, fontSize: 15, color: colors.bg },
  past: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  date: { width: 48, alignItems: 'center' },
  mon: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.44, color: colors.text3 },
  pastName: { fontFamily: font.semibold, fontSize: 15, lineHeight: 19, color: colors.text },
  venue: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  state: { fontFamily: font.semibold, fontSize: 12 },
});
