import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';
import type { PlayerHit } from '@/api/playerSearch';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Icon } from '@/components/icons';

const META = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.12 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

/**
 * One player hit in the Explore search. `sport` and `location` are both
 * optional on the server — the meta line only renders when at least one of
 * them is present, so a sparse record still shows a clean row rather than a
 * blank second line.
 */
export default function PlayerHitRow({ hit }: { hit: PlayerHit }) {
  const theme = useTheme();
  const name = `${hit.firstName} ${hit.lastName}`;
  const meta = [hit.sport, hit.location].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => router.push({ pathname: '/player/[playerId]', params: { playerId: hit._id } })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <InitialsAvatar name={name} size={36} logo={hit.profileImage} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, color: theme.text }} numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text style={{ ...META(theme), marginTop: 3 }} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={16} color={theme.textFaint} strokeWidth={2.2} />
    </Pressable>
  );
}
