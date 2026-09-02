import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill, Tag } from '@/components/StatusPill';
import { Icon, type IconName } from '@/components/icons';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
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

// TournamentDetail.dc.html: no banner photo — hairline texture, an oversized
// ghost word, and the name in Anton carry the hero.
export function TournamentHero({
  tournament,
  categoryCount,
  onBack,
  onShare,
  onAnnouncements,
}: {
  tournament: Tournament;
  categoryCount?: number;
  onBack: () => void;
  onShare?: () => void;
  onAnnouncements?: () => void;
}) {
  const meta = [
    tournament.venue?.city,
    `${formatShortDate(tournament.startDate)}–${formatShortDate(tournament.endDate)}`,
    categoryCount ? `${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ height: 262, backgroundColor: '#0B0B0B', overflow: 'hidden' }}>
      <Hairlines />
      <Ghost text={monogram(tournament.name)} size={170} style={{ left: -16, top: 44 }} />
      <LinearGradient
        colors={['transparent', 'rgba(11,11,11,0.4)', '#0B0B0B']}
        locations={[0.15, 0.5, 0.94]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
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
