import { View, Text } from 'react-native';
import { AuctionStatus, AuctionTeam } from '@/api/auction';

export function TieBreakerPanel({ status, teams }: { status: AuctionStatus; teams: AuctionTeam[] }) {
  const tied = status.liveBid?.tiedTeams || [];
  if (tied.length < 2) return null;

  const winnerId = status.liveBid?.spinWinnerId;
  const winner = winnerId ? teams.find((t) => t._id === winnerId) : null;

  if (winner) {
    return (
      <View className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
        <Text className="font-oswald text-[11px] uppercase tracking-widest text-emerald-400">Tie-Breaker Winner</Text>
        <Text className="mt-1 font-oswald text-lg font-bold uppercase text-white">{winner.name}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
      <Text className="font-oswald text-sm font-bold uppercase tracking-wider text-amber-400">
        ⚡ Tie-Breaker · {tied.length} teams tied
      </Text>
      <Text className="mt-1 font-montserrat text-xs text-gray-400">Awaiting resolution…</Text>
    </View>
  );
}
