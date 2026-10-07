import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { useTheme } from '@/lib/theme';
import type { KnockoutPlayer } from '@/api/quickKnockout';

/** One person in a waiting room: name, You / Joined / Guest, optional select and remove. */
export function PlayerLine({ player, viewerId, tone, onPress, onRemove, a11y }: {
  player: KnockoutPlayer; viewerId?: string; tone?: 'selected'; onPress?: () => void; onRemove?: () => void; a11y?: string;
}) {
  const t = useTheme();
  const tag = player.playerId && player.playerId === viewerId ? (['You', 'auction'] as const)
    : player.playerId ? (['Joined', 'open'] as const) : (['Guest', 'end'] as const);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: 1.5, borderBottomColor: t.lineSoft, backgroundColor: tone === 'selected' ? t.brandTint : undefined }}>
      <Pressable accessibilityRole="button" accessibilityLabel={a11y} disabled={!onPress} onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 4 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text }}>{player.displayName}</Text>
        <Tag label={tag[0]} variant={tag[1]} />
      </Pressable>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${player.displayName}`} onPress={onRemove} hitSlop={8} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={t.textMeta} />
        </Pressable>
      ) : null}
    </View>
  );
}
