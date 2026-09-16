import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, StaleBanner, Ghost, EmptyState } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { useAuctionSocket } from '@/lib/useAuctionSocket';
import { AuctionStage } from '@/components/auction/AuctionStage';
import { BidHistoryList } from '@/components/auction/BidHistoryList';
import { TeamsStrip } from '@/components/auction/TeamsStrip';
import { SoldLogList } from '@/components/auction/SoldLogList';
import { SoldCelebration } from '@/components/auction/SoldCelebration';
import { SpinWheel } from '@/components/auction/SpinWheel';
import { UpNextList } from '@/components/auction/UpNextList';
import { CompletedSummary } from '@/components/auction/CompletedSummary';

type TabKey = 'bids' | 'next' | 'sold' | 'purses';

function Header({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => goBack(router)}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 20, color: '#fff' }}>
          {title}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Auction-wide progress: the one bar that says how far through the lot list we are. */
function ProgressBar({ index, total, sold, unsold, rotation }: { index: number; total: number; sold: number; unsold: number; rotation: number }) {
  const pct = total > 0 ? Math.min(100, ((index + 1) / total) * 100) : 0;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 11, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#FA4C93' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          Lot {index + 1} of {total}
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          {sold} sold · {unsold} unsold{rotation > 0 ? ` · round ${rotation + 1}` : ''}
        </Text>
      </View>
    </View>
  );
}

function Tabs({ active, onChange, counts }: { active: TabKey; onChange: (k: TabKey) => void; counts: Record<TabKey, number> }) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'bids', label: 'Bids' },
    { key: 'next', label: 'Up next' },
    { key: 'sold', label: 'Sold' },
    { key: 'purses', label: 'Purses' },
  ];
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.label}, ${counts[t.key]}`}
            onPress={() => onChange(t.key)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: on ? '#F97316' : 'transparent' }}
          >
            <Text style={{ fontFamily: on ? 'SpaceMono_700Bold' : 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: on ? '#fff' : '#7d7d7d' }}>
              {t.label}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: on ? '#F97316' : '#5a5a5a', marginTop: 3 }}>
              {String(counts[t.key]).padStart(2, '0')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AuctionBroadcast() {
  const { tournamentId, categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const { data, soldLog, preAssigned, totalRevenue, loading, error, connected, lastUpdate, reload } =
    useAuctionSocket(tournamentId, categoryId);
  const user = useAppSelector((s) => s.auth.user);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<TabKey>('bids');

  const status = data?.auction;
  const isLive = status?.status === 'in_progress' || status?.status === 'paused';
  const dropped = isLive && !connected;

  // Only runs while the socket is down, to keep the "last update" honest.
  useEffect(() => {
    if (!dropped) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [dropped]);

  const categoryName = data?.category?.name || 'Auction';
  const title = `${categoryName} auction`;
  const youName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
  const upcoming = useMemo(() => data?.upcoming || [], [data?.upcoming]);

  if (loading && !data) {
    return (
      <Screen>
        <Header title="Auction" />
        <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
          <Skeleton h={10} w={90} line />
          <Skeleton h={120} />
          <Skeleton h={10} w={70} line style={{ marginTop: 4 }} />
          <Skeleton h={110} />
        </View>
      </Screen>
    );
  }

  if (error || !data || !status) {
    return (
      <Screen>
        <Header title="Auction" />
        <View style={{ padding: 16 }}>
          <ErrorBlock
            label="Auction unavailable"
            message="The auction room could not be reached. The tournament page still works."
            onRetry={reload}
          />
        </View>
      </Screen>
    );
  }

  if (status.status === 'not_started') {
    return (
      <Screen>
        <Header title={title} />
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden' }}>
          <Ghost text="SOON" size={150} style={{ right: -20, top: 40 }} />
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#FA4C93' }}>
            {data.tournament?.name || 'Kria'}
          </Text>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 40, lineHeight: 48, color: '#fff', marginTop: 10 }}>
            Starting{'\n'}soon
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 12, maxWidth: 300 }}>
            {categoryName} goes under the hammer shortly. Leave this open — the board fills itself the moment bidding starts.
          </Text>
        </View>
      </Screen>
    );
  }

  if (status.status === 'sold' && status.lastSoldResult) {
    return (
      <Screen>
        <Header title={title} />
        <SoldCelebration
          playerName={status.lastSoldResult.playerName}
          teamName={status.lastSoldResult.teamName}
          teamColor={status.lastSoldResult.teamColor}
          soldPrice={status.lastSoldResult.soldPrice}
        />
      </Screen>
    );
  }

  if (status.status === 'completed') {
    return (
      <Screen>
        <Header title={title} />
        <CompletedSummary
          tournamentName={data.tournament?.name || 'Kria'}
          categoryName={categoryName}
          teams={data.teams}
        />
      </Screen>
    );
  }

  // Teams can sit tied at the hard limit for a while before the organizer
  // presses "start tie-breaker". Only the active flag earns the wheel — until
  // then the player on the block is still the story, same as the big screen.
  const tiedCount = status.liveBid?.tiedTeams?.length ?? 0;
  const tieBreaker = tiedCount >= 2 && !!status.liveBid?.tieBreakerActive;
  const tiePending = tiedCount >= 2 && !status.liveBid?.tieBreakerActive;
  const bids = status.liveBid?.bidHistory ?? [];
  const remaining = status.remainingCount ?? Math.max(0, status.totalPlayers - (status.currentPlayerIndex + 1));
  const counts: Record<TabKey, number> = {
    bids: bids.length,
    next: remaining,
    sold: soldLog.length,
    purses: data.teams.length,
  };

  return (
    <Screen>
      <Header
        title={title}
        sub={data.tournament?.name}
        right={
          status.status === 'paused' ? (
            <Tag label="Paused" variant="end" />
          ) : dropped ? (
            <Tag label="Stale" variant="end" />
          ) : (
            <Tag label="On air" variant="live" dot />
          )
        }
      />
      {dropped ? <StaleBanner secondsAgo={Math.round((now - lastUpdate) / 1000)} /> : null}

      <View style={{ flex: 1 }} pointerEvents={dropped ? 'none' : 'auto'}>
        <View style={dropped ? { opacity: 0.5 } : undefined}>
          <ProgressBar
            index={status.currentPlayerIndex}
            total={status.totalPlayers}
            sold={soldLog.length}
            unsold={status.unsoldCount}
            rotation={status.rotationCount}
          />

          {/* The wheel takes the stage's place, exactly as the broadcast screen
              does — during a tie-breaker the player card is no longer the story. */}
          {tieBreaker ? (
            <SpinWheel status={status} teams={data.teams} />
          ) : (
            <>
              <AuctionStage player={data.currentPlayer} status={status} teams={data.teams} />
              {tiePending ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#FA4C93' }}>
                  <Icon name="flame" size={12} color="#240614" strokeWidth={2.8} />
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: '#240614' }}>
                    {tiedCount} teams tied at the cap · tie-breaker pending
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        <Tabs active={tab} onChange={setTab} counts={counts} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 }}
          style={dropped ? { opacity: 0.5 } : undefined}
        >
          {tab === 'bids' ? (
            bids.length ? (
              <BidHistoryList bids={bids} teams={data.teams} />
            ) : (
              <EmptyState
                icon="gavel"
                title="No bids yet"
                message="The floor is open. Bids appear here the moment a team raises."
              />
            )
          ) : null}
          {tab === 'next' ? <UpNextList upcoming={upcoming} remaining={remaining} /> : null}
          {tab === 'sold' ? (
            <SoldLogList logs={soldLog} preAssigned={preAssigned} totalRevenue={totalRevenue} youName={youName} />
          ) : null}
          {tab === 'purses' ? <TeamsStrip teams={data.teams} /> : null}
        </ScrollView>
      </View>
    </Screen>
  );
}
