import { useEffect, useRef } from 'react';
import { Animated, View, Text, Image } from 'react-native';
import { AuctionPlayer, AuctionStatus } from '@/api/auction';
import { currentBid } from '@/lib/auctionView';

function SkillBadge({ level }: { level?: string }) {
  if (!level) return null;
  return (
    <View className="rounded-full border border-brand/40 bg-brand/10 px-3 py-0.5">
      <Text className="font-oswald text-[10px] font-bold uppercase tracking-wider text-brand">{level}</Text>
    </View>
  );
}

function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
      <Text className="font-oswald text-[10px] uppercase tracking-wider text-gray-500">{label}</Text>
      <Text className="font-montserrat text-lg font-bold capitalize text-white">{value}</Text>
    </View>
  );
}

export function AuctionStage({ player, status }: { player: AuctionPlayer | null; status: AuctionStatus }) {
  const bid = currentBid(status.liveBid?.currentPrice, player?.auctionData?.basePrice);
  const basePrice = player?.auctionData?.basePrice ?? 0;
  const scale = useRef(new Animated.Value(1)).current;
  const prevBid = useRef(bid);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | undefined;
    if (bid > prevBid.current && prevBid.current > 0) {
      anim = Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]);
      anim.start();
    }
    prevBid.current = bid;
    return () => anim?.stop();
  }, [bid, scale]);

  if (!player) {
    return (
      <View className="items-center py-16">
        <Text className="font-montserrat text-base italic text-gray-500">Preparing next player…</Text>
      </View>
    );
  }

  const stats = player.careerStats;
  const hasCareer = stats && stats.matchesPlayed > 0;

  return (
    <View className="items-center gap-4">
      {/* Avatar */}
      <View className="h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-brand/40 bg-[#1a1a1a]">
        {player.profile.photo ? (
          <Image source={{ uri: player.profile.photo }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <Text className="text-5xl">👤</Text>
        )}
      </View>

      <View className="items-center gap-2">
        <Text className="text-center font-oswald text-4xl font-extrabold uppercase text-white">
          {player.profile.firstName} {player.profile.lastName}
        </Text>
        <SkillBadge level={player.profile.skillLevel} />
      </View>

      {/* Attribute chips */}
      <View className="w-full flex-row gap-3">
        <Chip label="Age" value={`${player.profile.age} yrs`} />
        <Chip label="Gender" value={player.profile.gender} />
      </View>

      {/* Career stats */}
      {hasCareer && (
        <View className="w-full flex-row gap-3">
          <Chip label="Played" value={stats!.matchesPlayed} />
          <Chip label="Won" value={stats!.matchesWon} />
          <Chip label="Points" value={stats!.pointsContributed} />
        </View>
      )}

      {/* Price box */}
      <View className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <View className="flex-row items-center justify-between border-b border-white/10 px-5 py-3">
          <Text className="font-oswald text-[10px] uppercase tracking-widest text-gray-500">Base Price</Text>
          <Text className="font-montserrat text-base font-bold text-gray-300">₹{basePrice.toLocaleString()}</Text>
        </View>
        <View className="items-center bg-brand/5 px-5 py-5">
          <Text className="mb-1 font-oswald text-[10px] uppercase tracking-widest text-gray-500">Current Bid</Text>
          <Animated.Text
            style={{ transform: [{ scale }] }}
            className="font-oswald text-5xl font-extrabold text-brand"
          >
            ₹{bid.toLocaleString()}
          </Animated.Text>
          {!!status.liveBid?.highestBidderName && (
            <Text className="mt-1.5 font-oswald text-[11px] uppercase tracking-wider text-gray-500">
              by <Text className="font-bold text-brand">{status.liveBid.highestBidderName}</Text>
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
