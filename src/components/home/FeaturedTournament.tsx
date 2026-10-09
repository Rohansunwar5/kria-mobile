import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { Icon } from '@/components/icons';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { StatusPill, Tag } from '@/components/StatusPill';
import { TournamentArt } from '@/components/TournamentArt';
import { useLandReveal, useRise, usePress } from '@/lib/motion';
import { posterCell } from '@/lib/homePortal';
import { dateRange } from '@/lib/eventsView';
import { useTheme } from '@/lib/theme';

function initials(name: string) {
  return name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** The Events tab's big card: the open tournament whose entries close first.
 *  The countdown leads, and entry is the one orange action on the screen. */
export function FeaturedTournament({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  const theme = useTheme();
  const { sweep, wipe, rise, riseLate } = useLandReveal(`featured:${tournament._id}`);
  const riseStyle = useRise(rise);
  const riseLateStyle = useRise(riseLate);
  const { press, onPressIn, onPressOut } = usePress();
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.015 }] }));
  const clock = posterCell(tournament);

  const cells = [
    { label: 'Players', value: String(tournament.registeredPlayersCount ?? 0), flex: 1 },
    { label: 'Teams', value: `${tournament.teamsCount ?? 0}/${tournament.settings?.maxTeams || '∞'}`, flex: 1 },
    { label: 'Dates', value: dateRange(tournament.startDate, tournament.endDate), flex: 1.3 },
  ];

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tournament.name}, ${clock.label} ${clock.value}`}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, overflow: 'hidden' }}
      >
        <View>
          <TournamentArt
            uri={tournament.bannerImage}
            seed={tournament._id}
            height={128}
            fadeTo={theme.surface}
            wipe={wipe}
            sweep={sweep}
            press={press}
            drift
            shimmer
          />
          <View style={{ position: 'absolute', right: 0, top: 0, backgroundColor: theme.brand, borderBottomLeftRadius: 6, paddingHorizontal: 10, paddingTop: 7, paddingBottom: 6, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.14 * 8, textTransform: 'uppercase', color: theme.onBrand }}>
              {clock.label}
            </Text>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: theme.onBrand }}>
              {clock.value}
            </Text>
          </View>
          <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 6 }}>
            <StatusPill status={tournament.status} />
            {tournament.sport ? <Tag label={tournament.sport.replace('_', ' ')} /> : null}
          </View>
        </View>
        <Hairlines />
        <Ghost text={initials(tournament.name)} size={96} style={{ right: -8, bottom: 40 }} />

        <Animated.View style={[{ paddingHorizontal: 14, paddingTop: 6 }, riseStyle]}>
          <Text numberOfLines={3} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 25, lineHeight: 30, color: theme.text }}>
            {tournament.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: theme.textMeta, marginTop: 7 }}
          >
            {[tournament.venue?.name, tournament.venue?.city].filter(Boolean).join(' · ') || 'Venue TBD'}
          </Text>
        </Animated.View>

        <Animated.View style={[{ flexDirection: 'row', marginTop: 14, borderTopWidth: 1.5, borderTopColor: theme.lineFaint }, riseLateStyle]}>
          {cells.map((c, i) => (
            <View
              key={c.label}
              style={{
                flex: c.flex,
                paddingHorizontal: 12,
                paddingTop: 9,
                paddingBottom: 10,
                ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineFaint } : null),
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.14 * 8, textTransform: 'uppercase', color: theme.textFaint }}>
                {c.label}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 15, color: theme.text, marginTop: 3 }}>
                {c.value}
              </Text>
            </View>
          ))}
        </Animated.View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.brand,
            paddingHorizontal: 14,
            minHeight: 48,
          }}
        >
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.onBrand }}>
            Enter now
          </Text>
          <Icon name="arrow-right" size={19} color={theme.onBrand} strokeWidth={2.6} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
