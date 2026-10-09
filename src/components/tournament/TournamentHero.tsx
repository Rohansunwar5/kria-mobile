import { View, Text, Pressable, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill, Tag } from '@/components/StatusPill';
import { Icon, type IconName } from '@/components/icons';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { heroParallax, useDrift } from '@/lib/motion';
import { posterCell } from '@/lib/homePortal';
import { dateRange } from '@/lib/eventsView';
import { tournamentSports } from '@/lib/sports';
import { useTheme } from '@/lib/theme';

const BANNER = 196;

function IconButton({ name, label, onPress }: { name: IconName; label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 38,
        height: 38,
        borderRadius: 5,
        backgroundColor: theme.scrim,
        borderWidth: 1.5,
        borderColor: theme.keyline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={17} color={theme.onDark} strokeWidth={1.9} />
    </Pressable>
  );
}

function monogram(name: string) {
  const word = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean);
  return (word.find((w) => w.length > 3) || word[0] || 'KRIA').toUpperCase();
}

/**
 * The organiser's banner, shown clean — it is a poster with its own type, so
 * the title sits under it on solid ground rather than on top of it. Without a
 * banner, hairlines and a ghost word carry the art. `scrollY` drives the
 * parallax: the banner travels at 0.45x and dims as the page comes up over it.
 */
export function TournamentHero({
  tournament,
  scrollY,
  onBack,
  onShare,
  onAnnouncements,
}: {
  tournament: Tournament;
  scrollY?: SharedValue<number>;
  onBack: () => void;
  onShare?: () => void;
  onAnnouncements?: () => void;
}) {
  const theme = useTheme();
  const rest = useSharedValue(0);
  const y = scrollY ?? rest;
  const focused = useIsFocused();
  const kb = useDrift(!!tournament.bannerImage && focused);
  const artStyle = useAnimatedStyle(() => {
    const p = heroParallax(y.value);
    const d = kb.value;
    return {
      transform: [
        { translateX: -d * 8.6 },
        { translateY: p.artY - d * 3.7 },
        { scale: p.artScale * (1 + d * 0.09) },
      ],
    };
  });
  const deepenStyle = useAnimatedStyle(() => ({ opacity: heroParallax(y.value).deepen }));
  const meta = [tournament.venue?.name || tournament.venue?.city, dateRange(tournament.startDate, tournament.endDate)]
    .filter(Boolean)
    .join(' · ');

  return (
    <View>
      <View style={{ height: BANNER, backgroundColor: theme.bg, overflow: 'hidden' }}>
        {tournament.bannerImage ? (
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, artStyle]}>
            <Image source={{ uri: tournament.bannerImage }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </Animated.View>
        ) : (
          <>
            <Hairlines />
            <Ghost text={monogram(tournament.name)} size={150} style={{ left: -16, top: 40 }} />
          </>
        )}
        <LinearGradient
          colors={['transparent', theme.bg]}
          locations={[0.62, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.bg }, deepenStyle]}
        />

        <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8 }}>
            <IconButton name="chevron-left" label="Go back" onPress={onBack} />
            <View style={{ flex: 1 }} />
            {onAnnouncements ? <IconButton name="bell" label="Announcements" onPress={onAnnouncements} /> : null}
            {onShare ? <IconButton name="share" label="Share tournament" onPress={onShare} /> : null}
          </View>
        </SafeAreaView>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 2 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <StatusPill status={tournament.status} />
          {tournamentSports(tournament).map((s) => (
            <Tag key={s} label={s.replace('_', ' ')} />
          ))}
        </View>
        <Text
          numberOfLines={3}
          style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 34, lineHeight: 41, color: theme.text, marginTop: 10 }}
        >
          {tournament.name}
        </Text>
        <Text
          numberOfLines={2}
          style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: theme.textMeta, marginTop: 6 }}
        >
          {meta}
        </Text>
      </View>
    </View>
  );
}

/** Four numbers under the title. The last one changes with the stage. */
export function FactStrip({ cells }: { cells: { label: string; value: string; accent?: boolean }[] }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 14,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderRadius: 6,
        backgroundColor: theme.surface,
      }}
    >
      {cells.map((c, i) => (
        <View
          key={c.label}
          style={{ flex: 1, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10, gap: 3, ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineFaint } : null) }}
        >
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.14 * 8, textTransform: 'uppercase', color: theme.textFaint }}>
            {c.label}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: c.accent ? theme.brandInk : theme.text }}>
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** While entry is open: how long is left, and the exact deadline beside it. */
export function EntryClock({ tournament }: { tournament: Tournament }) {
  const theme = useTheme();
  const cell = posterCell(tournament);
  if (!cell.urgent) return null;
  const deadline = new Date(tournament.registrationDeadline);
  return (
    <View
      accessible
      accessibilityLabel={`Entries close in ${cell.value}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, backgroundColor: theme.brand }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: theme.onBrand }}>
          Entries close in
        </Text>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 24, lineHeight: 29, color: theme.onBrand }}>
          {cell.value}
        </Text>
      </View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, lineHeight: 15, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: theme.onBrand, textAlign: 'right' }}>
        {deadline.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        {'\n'}
        {deadline.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
      </Text>
    </View>
  );
}
