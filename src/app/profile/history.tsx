import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { HistoryCard } from '@/components/profile/HistoryCard';
import { Chip, Lbl, ScreenHeader } from '@/components/canvas';
import { EmptyState, ErrorBlock, Ghost, Skeleton } from '@/components/states';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';

// TournamentHistory.dc.html — the career ribbon holds only figures the history
// endpoint actually returns, so no Titles/Finals column (there is no placement
// in the payload).
function Ribbon({ played, matches, record, earned }: { played: number; matches: number; record: string; earned: string }) {
  const cells = [
    { label: 'Played', value: String(played), tone: '#fff', size: 22 },
    { label: 'Matches', value: String(matches), tone: '#fff', size: 22 },
    { label: 'W-L', value: record, tone: '#fff', size: 16 },
    { label: 'Earned', value: earned, tone: '#F97316', size: 16 },
  ];
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      {cells.map((c, i) => (
        <View
          key={c.label}
          style={{
            flex: 1,
            paddingHorizontal: 10,
            paddingVertical: 11,
            ...(i < cells.length - 1 ? { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.12)' } : null),
          }}
        >
          <Lbl style={{ letterSpacing: 0.1 * 9 }}>{c.label}</Lbl>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: c.size, color: c.tone, marginTop: c.size === 22 ? 2 : 6 }}>
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function History() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { tournamentHistory, historyLoading, error } = useAppSelector((s) => s.registration);
  const [sport, setSport] = useState('All');

  useEffect(() => {
    dispatch(fetchPlayerTournamentHistory());
  }, [dispatch]);

  const sports = useMemo(
    () => ['All', ...Array.from(new Set(tournamentHistory.map((e) => e.tournament?.sport).filter(Boolean) as string[]))],
    [tournamentHistory]
  );

  const shown = sport === 'All' ? tournamentHistory : tournamentHistory.filter((e) => e.tournament?.sport === sport);

  const totals = useMemo(() => {
    const matches = tournamentHistory.reduce((s, e) => s + (e.stats?.matchesPlayed ?? 0), 0);
    const won = tournamentHistory.reduce((s, e) => s + (e.stats?.matchesWon ?? 0), 0);
    const earned = tournamentHistory.reduce((s, e) => s + (e.auctionData?.soldPrice ?? 0), 0);
    return {
      played: tournamentHistory.length,
      matches,
      record: `${won}-${Math.max(matches - won, 0)}`,
      earned: earned >= 1000 ? `₹${(earned / 1000).toFixed(earned % 1000 === 0 ? 0 : 1)}k` : `₹${earned}`,
    };
  }, [tournamentHistory]);

  // Newest year first, entries newest first within it.
  const years = useMemo(() => {
    const byYear = new Map<string, typeof shown>();
    [...shown]
      .sort((a, b) => new Date(b.tournament?.startDate || b.createdAt).getTime() - new Date(a.tournament?.startDate || a.createdAt).getTime())
      .forEach((e) => {
        const y = new Date(e.tournament?.startDate || e.createdAt).getFullYear().toString();
        byYear.set(y, [...(byYear.get(y) || []), e]);
      });
    return [...byYear.entries()];
  }, [shown]);

  const loading = historyLoading && tournamentHistory.length === 0;

  return (
    <Screen>
      <ScreenHeader
        title="History"
        onBack={() => router.back()}
        right={
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.12 * 9, color: '#7d7d7d' }}>
            {String(tournamentHistory.length).padStart(2, '0')}
          </Text>
        }
      />
      <Ribbon {...totals} />

      {sports.length > 2 ? (
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 11 }}>
          {sports.map((s) => (
            <Chip key={s} label={s === 'All' ? 'All' : s.replace('_', ' ')} selected={sport === s} onPress={() => setSport(s)} />
          ))}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 }}>
        <Ghost text="Past" size={140} style={{ right: -38, bottom: 60 }} />

        {loading ? (
          <View style={{ gap: 9 }}>
            <Skeleton h={104} />
            <Skeleton h={104} />
            <Skeleton h={104} />
          </View>
        ) : error ? (
          <ErrorBlock
            label="History"
            message={error}
            onRetry={() => dispatch(fetchPlayerTournamentHistory())}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            ghost="0"
            icon="clock"
            title="No history yet"
            message="Tournaments you have played land here with your record, team and auction price."
            cta="Browse events"
            onCta={() => router.push('/(tabs)/home')}
          />
        ) : (
          years.map(([year, entries]) => (
            <View key={year}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9, marginTop: 5 }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.16 * 11, color: year === years[0][0] ? '#F97316' : '#7d7d7d' }}>
                  {year}
                </Text>
                <View style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              </View>
              <View style={{ gap: 9, marginBottom: 14 }}>
                {entries.map((e) => (
                  <HistoryCard key={e._id} entry={e} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
