import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';
import type { TournamentHit } from '@/api/tournaments';
import { StatusPill } from '@/components/StatusPill';

const META = (theme: Palette) => ({
  fontFamily: 'SpaceMono_400Regular' as const,
  fontSize: 11,
  letterSpacing: 0.05 * 11,
  textTransform: 'uppercase' as const,
  color: theme.textMeta,
});

/** One tournament hit in the Explore search. Matches LiveRow's idiom: a
 *  bordered, brand-edged card rather than a plain list row. */
export default function EventHitRow({ hit }: { hit: TournamentHit }) {
  const theme = useTheme();
  const meta = [hit.sport, hit.venue?.name, hit.venue?.city].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hit.name}
      onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: hit._id } })}
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderLeftWidth: 4,
        borderLeftColor: theme.brand,
        borderRadius: 6,
        padding: 12,
        marginBottom: 9,
      }}
    >
      <StatusPill status={hit.status} />
      <Text
        style={{
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: 18,
          lineHeight: 22,
          color: theme.text,
          marginTop: 8,
        }}
        numberOfLines={2}
      >
        {hit.name}
      </Text>
      {meta ? (
        <Text style={{ ...META(theme), marginTop: 6 }} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}
