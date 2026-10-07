import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock } from '@/components/states';
import { KnockoutRow } from '@/components/knockout/KnockoutRow';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';

export default function MyKnockouts() {
  const router = useRouter();
  const theme = useTheme();
  const userId = useAppSelector((s) => s.auth.user?._id);
  const [list, setList] = useState<QuickKnockout[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    // ponytail: /quick-knockout/mine returns 20, page when someone hosts more
    listMyQuickKnockouts().then(
      (l) => live && (setError(false), setList(l)),
      () => live && setError(true),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = () => {
    setError(false);
    setAttempt((n) => n + 1);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => goBack(router, '/(tabs)/profile')}
          hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: theme.fill, borderWidth: 1.5, borderColor: theme.lineSoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={19} color={theme.text} strokeWidth={2.3} />
        </Pressable>
        <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.text }}>My knockouts</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 9 }}>
        {error ? (
          <ErrorBlock label="Knockouts" title="Couldn’t load your knockouts" message="Try again in a moment." onRetry={retry} />
        ) : !list ? (
          <Skeleton h={58} line />
        ) : list.length === 0 ? (
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: theme.textMeta }}>No knockouts yet. Host or join one from Quick matches.</Text>
        ) : (
          list.map((k) => (
            <KnockoutRow key={k._id} knockout={k} viewerId={userId} onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: k._id } })} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
