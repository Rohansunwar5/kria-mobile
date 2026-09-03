import { View, Text, Pressable, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill, Tag } from '@/components/StatusPill';
import { Icon, type IconName } from '@/components/icons';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { heroParallax, useDrift } from '@/lib/motion';
import { formatShortDate } from '@/lib/format';

function IconButton({ name, label, onPress }: { name: IconName; label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 38,
        height: 38,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={17} color="#fff" strokeWidth={1.9} />
    </Pressable>
  );
}

function monogram(name: string) {
  const word = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean);
  return (word.find((w) => w.length > 3) || word[0] || 'KRIA').toUpperCase();
}

// TournamentDetail.dc.html: the organiser's banner when there is one, behind the
// gradient; otherwise hairline texture and an oversized ghost word carry the hero.
// `scrollY` drives the parallax (motion option D) — the banner travels at 0.45x
// and the scrim deepens as the tabs come up over it.
export function TournamentHero({
  tournament,
  categoryCount,
  scrollY,
  onBack,
  onShare,
  onAnnouncements,
}: {
  tournament: Tournament;
  categoryCount?: number;
  scrollY?: SharedValue<number>;
  onBack: () => void;
  onShare?: () => void;
  onAnnouncements?: () => void;
}) {
  const rest = useSharedValue(0);
  const y = scrollY ?? rest;
  // Option B lives here and on the featured card only — the two surfaces big
  // enough to earn a permanent animation.
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
  const meta = [
    tournament.venue?.city,
    `${formatShortDate(tournament.startDate)}–${formatShortDate(tournament.endDate)}`,
    categoryCount ? `${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ height: 262, backgroundColor: '#0B0B0B', overflow: 'hidden' }}>
      {tournament.bannerImage ? (
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, artStyle]}>
          <Image source={{ uri: tournament.bannerImage }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      ) : null}
      <Hairlines />
      {tournament.bannerImage ? null : (
        <Ghost text={monogram(tournament.name)} size={170} style={{ left: -16, top: 44 }} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(11,11,11,0.4)', '#0B0B0B']}
        locations={[0.15, 0.5, 0.94]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0B0B0B' }, deepenStyle]}
      />

      <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6 }}>
          <IconButton name="chevron-left" label="Go back" onPress={onBack} />
          <View style={{ flex: 1 }} />
          {onAnnouncements ? <IconButton name="bell" label="Announcements" onPress={onAnnouncements} /> : null}
          {onShare ? <IconButton name="share" label="Share tournament" onPress={onShare} /> : null}
        </View>
      </SafeAreaView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 9 }}>
          <StatusPill status={tournament.status} />
          {tournament.sport ? <Tag label={tournament.sport.replace('_', ' ')} /> : null}
        </View>
        <Text
          numberOfLines={2}
          style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 40, lineHeight: 36, color: '#fff' }}
        >
          {tournament.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 9 }}
        >
          {meta}
        </Text>
      </View>
    </View>
  );
}
