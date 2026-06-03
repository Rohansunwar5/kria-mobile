import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuctionSocket } from '@/lib/useAuctionSocket';
import { LiveBadge } from '@/components/auction/LiveBadge';
import { AuctionStage } from '@/components/auction/AuctionStage';
import { BidHistoryList } from '@/components/auction/BidHistoryList';
import { TeamsStrip } from '@/components/auction/TeamsStrip';
import { SoldLogList } from '@/components/auction/SoldLogList';
import { SoldCelebration } from '@/components/auction/SoldCelebration';
import { TieBreakerPanel } from '@/components/auction/TieBreakerPanel';
import { CompletedSummary } from '@/components/auction/CompletedSummary';

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
      <Pressable onPress={onBack} className="rounded-full bg-white/10 px-3 py-1.5">
        <Text className="font-montserrat text-sm text-white">‹ Back</Text>
      </Pressable>
      <Text className="flex-1 font-oswald text-base font-bold uppercase text-white" numberOfLines={1}>{title}</Text>
    </View>
  );
}

export default function AuctionBroadcast() {
  const { tournamentId, categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const router = useRouter();
  const { data, soldLog, loading, error } = useAuctionSocket(tournamentId, categoryId);

  const tournamentName = data?.tournament?.name || 'Auction';
  const categoryName = data?.category?.name || '';
  const back = () => router.back();

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#111111' }}>
      <View className="flex-1 bg-ink">{children}</View>
    </SafeAreaView>
  );

  if (loading) {
    return (
      <Frame>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      </Frame>
    );
  }

  if (error || !data) {
    return (
      <Frame>
        <BackBar title="Auction" onBack={back} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-montserrat text-gray-400">Auction unavailable.</Text>
        </View>
      </Frame>
    );
  }

  const status = data.auction;

  if (status.status === 'not_started') {
    return (
      <Frame>
        <BackBar title={tournamentName} onBack={back} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-oswald text-4xl font-extrabold uppercase text-white">{tournamentName}</Text>
          {!!categoryName && (
            <Text className="mt-2 font-oswald text-base uppercase tracking-widest text-gray-500">{categoryName} — Auction</Text>
          )}
          <View className="my-6 h-1 w-14 rounded-full bg-brand" />
          <Text className="font-oswald text-base uppercase tracking-[0.3em] text-gray-500">Starting Soon</Text>
        </View>
      </Frame>
    );
  }

  if (status.status === 'sold' && status.lastSoldResult) {
    return (
      <Frame>
        <BackBar title={tournamentName} onBack={back} />
        <SoldCelebration
          playerName={status.lastSoldResult.playerName}
          teamName={status.lastSoldResult.teamName}
          teamColor={status.lastSoldResult.teamColor}
          soldPrice={status.lastSoldResult.soldPrice}
        />
      </Frame>
    );
  }

  if (status.status === 'completed') {
    return (
      <Frame>
        <BackBar title={tournamentName} onBack={back} />
        <CompletedSummary tournamentName={tournamentName} categoryName={categoryName} teams={data.teams} />
      </Frame>
    );
  }

  // in_progress | paused
  return (
    <Frame>
      <BackBar title={tournamentName} onBack={back} />
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="font-oswald text-xs uppercase tracking-wider text-gray-500">
          Player <Text className="text-brand">{status.currentPlayerIndex + 1}</Text>/{status.totalPlayers}
        </Text>
        <LiveBadge paused={status.status === 'paused'} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <AuctionStage player={data.currentPlayer} status={status} />
        <TieBreakerPanel status={status} teams={data.teams} />
        <BidHistoryList bids={status.liveBid?.bidHistory || []} teams={data.teams} />
        <TeamsStrip teams={data.teams} />
        <SoldLogList logs={soldLog} />
      </ScrollView>
    </Frame>
  );
}
