import { Image, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { router } from 'expo-router';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, font, radius } from '@/constants/theme';
import { datePill, sportName } from '@/lib/homeView';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { Icon, sportIcon } from './ui/Icon';
import { ImagePill, LivePill } from './ui/Pills';
import { Tap } from './ui/Tap';

export type Crest = { name: string; logo?: string };

/**
 * DESIGN §5.4 — one layout everywhere. No price pill: the tournament list
 * carries no fee (SERVER-GAPS.md #1), and the card never shows a number the
 * API can't produce.
 */
export function EventCard({ t, width = 300, imageHeight = 160, crests }: {
  t: Tournament;
  width?: DimensionValue;
  imageHeight?: number;
  /** Auction teams, from GET /tournaments/:id/teams. */
  crests?: Crest[];
}) {
  return (
    <Tap scale={0.98} accessibilityLabel={t.name} onPress={() => router.push(`/tournament/${t._id}`)} style={{ width, gap: 10 }}>
      <EventImage t={t} height={imageHeight} />
      <View style={s.below}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.name} numberOfLines={2}>{t.name}</Text>
          <Where t={t} />
        </View>
        {crests?.length ? <Crests crests={crests} size={26} /> : null}
      </View>
    </Tap>
  );
}

export function EventImage({ t, height, date, round = radius.card }: { t: Tournament; height: number; date?: string; round?: number }) {
  return (
    <View style={[s.image, { height, borderRadius: round }]}>
      {t.bannerImage ? <Image source={{ uri: t.bannerImage }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <SportCover sport={t.sport} />}
      <View style={s.topLeft}><ImagePill label={date ?? datePill(t.startDate)} /></View>
      {t.status === 'ongoing' ? <View style={s.topRight}><LivePill /></View> : null}
      {t.status === 'auction_in_progress' ? <View style={s.bottomLeft}><ImagePill dot label="Auction live" /></View> : null}
    </View>
  );
}

export function Where({ t }: { t: Tournament }) {
  const where = [t.venue?.name, t.venue?.city].filter(Boolean).join(' · ');
  return where ? (
    <View style={s.where}>
      <Icon name="location_on" size={15} color={colors.text3} />
      <Text style={s.whereText} numberOfLines={1}>{where}</Text>
    </View>
  ) : null;
}

/** Team crests sit on a #F5F5F5 circle (DESIGN §12); no logo → initials. */
export function Crests({ crests, size }: { crests: Crest[]; size: number }) {
  return (
    <View style={{ flexDirection: 'row', paddingLeft: 7 }}>
      {crests.slice(0, 4).map((c) => (
        <View key={c.name} style={[s.crest, { width: size, height: size, borderRadius: size / 2, marginLeft: -7 }]} accessibilityLabel={c.name}>
          {c.logo ? (
            <Image source={{ uri: c.logo }} resizeMode="contain" style={{ width: size - 4, height: size - 4, borderRadius: size / 2 }} />
          ) : (
            <Text style={[s.crestText, { fontSize: size * 0.36 }]}>{c.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Missing banner: radial #232328 → #141416 with the sport, never a blank box. */
function SportCover({ sport }: { sport: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, s.cover]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cover" cx="50%" cy="45%" r="70%">
            <Stop offset="0" stopColor={colors.coverIn} />
            <Stop offset="1" stopColor={colors.coverOut} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cover)" />
      </Svg>
      <Icon name={sportIcon(sport)} size={56} color={colors.text3} />
      <Text style={s.coverText}>{sportName(sport)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  image: { overflow: 'hidden', backgroundColor: colors.surface1 },
  topLeft: { position: 'absolute', top: 10, left: 10 },
  topRight: { position: 'absolute', top: 10, right: 10 },
  bottomLeft: { position: 'absolute', bottom: 10, left: 10 },
  below: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20, color: colors.text },
  where: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  whereText: { flexShrink: 1, fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  crest: { backgroundColor: colors.text, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  crestText: { fontFamily: font.bold, color: colors.bg },
  cover: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  coverText: { fontFamily: font.semibold, fontSize: 13, color: colors.text3 },
});
