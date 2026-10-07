import { ScrollView, Text, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { ChoiceCard } from '@/components/quick/HostSteps';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';

/** What the Host button opens: one quick match, or a knockout for a group. */
export default function HostChooser() {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/quick')} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <Icon name="arrow-left" size={22} color={t.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.brandInk }}>Host</Text>
        <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 32, lineHeight: 39, textTransform: 'uppercase', color: t.text }}>
          What are you hosting?
        </Text>
        {/* replace, not push: Back from either wizard skips the chooser. */}
        <ChoiceCard icon="shuttlecock" title="Quick match" hint="One match: singles, doubles or cricket." selected={false} onPress={() => router.replace('/quick/new')} />
        <ChoiceCard icon="bracket" title="Knockout" hint="A badminton knockout for 3 to 16 entrants." selected={false} onPress={() => router.replace('/knockout/new')} />
      </ScrollView>
    </Screen>
  );
}
