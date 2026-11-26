import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { colors, display, font } from '@/constants/theme';

/**
 * What an invited player sees on a knockout or quick match the host put them
 * in: nothing reaches their profile until they accept. Once it can no longer
 * be accepted, all that is left is taking their name off it.
 */
export function InviteCard({ title, busy, finished, onAccept, onDecline }: {
  title: string;
  busy: boolean;
  finished: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={s.card}>
      <Icon name="group_add" size={22} color={finished ? colors.text3 : colors.accent} />
      <Text style={display(22)}>{finished ? 'This finished before you accepted' : title}</Text>
      <Text style={s.sub}>
        {finished ? 'Nothing from it is on your profile. Your name stays on it until you remove it.' : 'Nothing goes on your profile until you accept.'}
      </Text>
      {finished ? (
        <Button variant="secondary" label="Remove my name" busy={busy} busyLabel="Removing" onPress={onDecline} />
      ) : (
        <View style={s.actions}>
          <Button variant="secondary" label="Decline" disabled={busy} onPress={onDecline} style={{ flex: 1 }} />
          <Button label="Accept" busy={busy} busyLabel="Accepting" onPress={onAccept} style={{ flex: 1.3 }} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 28, padding: 18, borderRadius: 20, backgroundColor: colors.surface1, gap: 10 },
  sub: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 10 },
});
