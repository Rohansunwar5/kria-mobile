import { View, Text, Pressable, Image } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { Icon } from '@/components/icons';
import { StatusPill, Tag } from './StatusPill';
import { hue } from './TournamentArt';
import { usePress } from '@/lib/motion';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';
import { posterCell } from '@/lib/homePortal';
import { SPORT_ICON } from '@/lib/sports';
import { dateRange, dayOfEvent, sectionOf } from '@/lib/eventsView';

const FOOT = (theme: Palette) => ({
  fontFamily: 'SpaceMono_400Regular' as const,
  fontSize: 9,
  letterSpacing: 0.08 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const BOLD = (theme: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, color: theme.text });

function initials(name: string) {
  return name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** The banner when there is one, else the tournament's seeded ground — the
 *  same hue as its art strip everywhere else, so it reads as the same event. */
function Thumb({ tournament }: { tournament: Tournament }) {
  const theme = useTheme();
  const icon = SPORT_ICON[tournament.sport] ?? 'trophy';
  return (
    <View style={{ width: 74, overflow: 'hidden', backgroundColor: `hsl(${hue(tournament._id)}, 44%, 18%)` }}>
      {tournament.bannerImage ? (
        <Image source={{ uri: tournament.bannerImage }} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : (
        <>
          <View style={{ position: 'absolute', left: 9, top: 9 }}>
            <Icon name={icon} size={16} color={theme.onDark} />
          </View>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: 'absolute', left: 6, bottom: -6, fontFamily: 'Anton_400Regular', fontSize: 40, lineHeight: 48, color: theme.mutedTint }}
          >
            {initials(tournament.name)}
          </Text>
        </>
      )}
    </View>
  );
}

/** Filled slots out of the cap, one block per team. Grey once full, so a
 *  full event reads as full before anyone taps it. */
function TeamMeter({ teams, max }: { teams: number; max: number }) {
  const theme = useTheme();
  const full = teams >= max;
  // ponytail: one block per slot reads up to a dozen; past that it would wrap.
  if (max > 12) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <View key={i} style={{ width: 7, height: 9, backgroundColor: i < teams ? (full ? theme.textMeta : theme.open) : theme.surfaceAlt }} />
      ))}
    </View>
  );
}

/** The bottom line says what matters for the row's section: the deadline
 *  while entry is open, the day count while live, the start date before. */
function Footer({ tournament }: { tournament: Tournament }) {
  const theme = useTheme();
  const section = sectionOf(tournament.status);
  const teams = tournament.teamsCount ?? 0;
  const max = tournament.settings?.maxTeams ?? 0;
  const cell = posterCell(tournament);
  const view = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ ...FOOT(theme), ...BOLD(theme), color: theme.textBody }}>View</Text>
      <Icon name="chevron-right" size={10} color={theme.textBody} strokeWidth={2.4} />
    </View>
  );

  let left;
  let right = view;
  if (section === 'open') {
    left = (
      <>
        {max > 0 ? <TeamMeter teams={teams} max={max} /> : null}
        <Text style={FOOT(theme)}>
          <Text style={BOLD(theme)}>{teams}</Text>
          {max > 0 ? `/${max}${teams >= max ? ' · Full' : ' teams'}` : ' teams'}
        </Text>
      </>
    );
    right = (
      <Text style={{ ...FOOT(theme), fontFamily: 'SpaceMono_700Bold', color: cell.urgent ? theme.brandInk : theme.textFaint }}>
        {cell.urgent ? `Closes in ${cell.value}` : `${cell.label} ${cell.value}`}
      </Text>
    );
  } else if (section === 'live') {
    const { day, total } = dayOfEvent(tournament);
    left = (
      <Text style={FOOT(theme)}>
        Day <Text style={BOLD(theme)}>{day}</Text> of {total}
      </Text>
    );
  } else if (section === 'done') {
    left = (
      <Text style={FOOT(theme)}>
        <Text style={BOLD(theme)}>{tournament.registeredPlayersCount ?? 0}</Text> players
      </Text>
    );
  } else {
    left = (
      <Text style={FOOT(theme)}>
        {cell.label} <Text style={BOLD(theme)}>{cell.value}</Text>
      </Text>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 9,
        marginHorizontal: -12,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderTopWidth: 1.5,
        borderTopColor: theme.lineFaint,
      }}
    >
      {left}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/** One tournament as a compact ticket on the Events tab. A live one carries
 *  the brand edge; a finished one dims, since there is nothing left to enter. */
export function TournamentCard({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  const theme = useTheme();
  const { press, onPressIn, onPressOut } = usePress();
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.015 }] }));
  const section = sectionOf(tournament.status);
  const meta = [tournament.venue?.city, dateRange(tournament.startDate, tournament.endDate)].filter(Boolean).join(' · ');

  return (
    <Animated.View style={[{ marginBottom: 9 }, cardStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tournament.name}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          flexDirection: 'row',
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor: theme.line,
          borderLeftWidth: section === 'live' ? 4 : 1.5,
          borderLeftColor: section === 'live' ? theme.brand : theme.line,
          borderRadius: 6,
          overflow: 'hidden',
          opacity: section === 'done' ? 0.62 : 1,
        }}
      >
        <Thumb tournament={tournament} />
        <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 12, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StatusPill status={tournament.status} />
            {tournament.sport ? <Tag label={tournament.sport.replace('_', ' ')} /> : null}
          </View>
          <Text
            numberOfLines={2}
            style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.text, marginTop: 7 }}
          >
            {tournament.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.05 * 10, textTransform: 'uppercase', color: theme.textMeta, marginTop: 4 }}
          >
            {meta}
          </Text>
          <Footer tournament={tournament} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
