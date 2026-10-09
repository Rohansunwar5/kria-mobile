import { View, Text, Pressable, Linking } from 'react-native';
import type { Team } from '@/store/slices/teamSlice';
import type { Registration } from '@/store/slices/registrationSlice';
import { Tag } from '@/components/StatusPill';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useTheme } from '@/lib/theme';

/** The team you were drafted to, what you went for, and its group chat. */
export function YourTeam({ team, assignment }: { team: Team; assignment?: Registration }) {
  const theme = useTheme();
  const sold = assignment?.auctionData?.soldPrice;

  return (
    <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.auctionLine, borderRadius: 6, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 }}>
        <InitialsAvatar name={team.name} logo={team.logo} size={44} color={team.primaryColor || theme.brand} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 22, color: theme.text }}>
            {team.name}
          </Text>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: theme.textMeta, marginTop: 3 }}>
            {sold ? `Sold ₹${sold.toLocaleString('en-IN')}` : 'Drafted'}
          </Text>
        </View>
        <Tag label="You" variant="auction" />
      </View>
      {team.whatsappGroupLink ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open team chat on WhatsApp"
          onPress={() => Linking.openURL(team.whatsappGroupLink!)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderTopWidth: 1.5, borderTopColor: theme.lineFaint, backgroundColor: theme.brandTint }}
        >
          <Icon name="message" size={13} color={theme.brandInk} />
          <Text style={{ flex: 1, fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: theme.text }}>
            Team chat · WhatsApp
          </Text>
          <Icon name="chevron-right" size={12} color={theme.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}
