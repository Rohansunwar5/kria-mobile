import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, EmptyState, StaleBanner, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { useAuctionSocket } from '@/lib/useAuctionSocket';
import { AuctionStage } from '@/components/auction/AuctionStage';
import { BidHistoryList } from '@/components/auction/BidHistoryList';
import { TeamsStrip } from '@/components/auction/TeamsStrip';
import { SoldLogList } from '@/components/auction/SoldLogList';
import { SoldCelebration } from '@/components/auction/SoldCelebration';
import { TieBreakerPanel } from '@/components/auction/TieBreakerPanel';
import { CompletedSummary } from '@/components/auction/CompletedSummary';

function Header({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
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

export default function AuctionBroadcast() {
  const { tournamentId, categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const { data, soldLog, loading, error, connected, lastUpdate, reload } = useAuctionSocket(tournamentId, categoryId);
  const user = useAppSelector((s) => s.auth.user);
  const [now, setNow] = useState(Date.now());

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
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 40, lineHeight: 36, color: '#fff', marginTop: 10 }}>
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

  return (
    <Screen>
      <Header
        title={title}
        sub={`Player ${status.currentPlayerIndex + 1} / ${status.totalPlayers}`}
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

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} style={dropped ? { opacity: 0.5 } : undefined}>
        <AuctionStage player={data.currentPlayer} status={status} teams={data.teams} />

        <View style={{ paddingHorizontal: 16, paddingTop: 13, gap: 15 }}>
          <TieBreakerPanel status={status} teams={data.teams} />
          {status.liveBid?.bidHistory?.length ? (
            <BidHistoryList bids={status.liveBid.bidHistory} teams={data.teams} />
          ) : (
            <EmptyState
              icon="gavel"
              title="No bids yet"
              message="The floor is open. Bids appear here the moment a team raises."
            />
          )}
          <TeamsStrip teams={data.teams} />
          <SoldLogList logs={soldLog} youName={youName} />
        </View>
      </ScrollView>
    </Screen>
  );
}
