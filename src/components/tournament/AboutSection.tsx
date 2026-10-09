import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { Icon } from '@/components/icons';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';

const KEY = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 8,
  letterSpacing: 0.14 * 8,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

// ponytail: no line measuring — a long description folds by length.
const FOLD_AT = 220;

interface Award {
  _id?: string;
  title: string;
  player?: { profile?: { firstName?: string; lastName?: string; name?: string } };
  team?: { name?: string };
}

function recipientOf(award: Award) {
  const p = award.player?.profile;
  if (p) return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || 'Unknown recipient';
  return award.team?.name || 'Unknown recipient';
}

/** The tournament's awards, each with who took it home. */
export function AwardsList({ awards }: { awards: Award[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {awards.map((award, i) => (
        <View
          key={award._id || i}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6 }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="medal" size={18} color={theme.brandInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text }}>
              {award.title}
            </Text>
            <Text numberOfLines={1} style={{ ...KEY(theme), fontSize: 9, fontFamily: 'SpaceMono_400Regular', color: theme.textMeta, marginTop: 3 }}>
              {recipientOf(award)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Dates, venue, the organiser's description and the announcements link. */
export function AboutSection({ tournament, onAnnouncements }: { tournament: Tournament; onAnnouncements: () => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const closed = tournament.status !== 'registration_open' && tournament.status !== 'draft';
  const facts: [string, string][] = [
    ['Starts', formatDate(tournament.startDate)],
    ['Ends', formatDate(tournament.endDate)],
    ['Venue', tournament.venue?.name || tournament.venue?.city || 'TBD'],
    [closed ? 'Entry closed' : 'Entry closes', tournament.registrationDeadline ? formatDate(tournament.registrationDeadline) : 'TBD'],
  ];
  const about = tournament.description?.trim();
  const long = !!about && about.length > FOLD_AT;

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6 }}>
        {facts.map(([k, v], i) => (
          <View
            key={k}
            style={{
              width: '50%',
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 4,
              ...(i % 2 === 1 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineFaint } : null),
              ...(i > 1 ? { borderTopWidth: 1.5, borderTopColor: theme.lineFaint } : null),
            }}
          >
            <Text style={KEY(theme)}>{k}</Text>
            <Text numberOfLines={2} style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: theme.text }}>{v}</Text>
          </View>
        ))}
      </View>

      <Text
        numberOfLines={long && !open ? 4 : undefined}
        style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 20, color: theme.textBody, marginTop: 12 }}
      >
        {about || 'The organiser has not written a description for this tournament yet.'}
      </Text>
      {long ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} hitSlop={12} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
          <Text style={{ ...KEY(theme), fontSize: 9.5, color: theme.brandInk }}>{open ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Announcements"
        onPress={onAnnouncements}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginTop: 12, paddingHorizontal: 12, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, backgroundColor: theme.surface }}
      >
        <Icon name="bell" size={14} color={theme.brandInk} />
        <Text style={{ ...KEY(theme), flex: 1, fontSize: 10, color: theme.text }}>Announcements</Text>
        <Icon name="chevron-right" size={12} color={theme.textFaint} />
      </Pressable>
    </View>
  );
}
