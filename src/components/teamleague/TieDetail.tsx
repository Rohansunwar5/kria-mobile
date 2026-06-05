import { View, Text, Pressable } from 'react-native';
import { Tie, SubMatch, Lineup } from '@/api/teamLeague';
import { tieSubScore, subMatchView } from '@/lib/teamLeagueView';

type Slot = { slotNumber: number; label: string };

function TeamCol({ name, winner, dim }: { name: string; winner: boolean; dim: boolean }) {
  return (
    <View className={`flex-1 items-center justify-center gap-1 px-4 py-6 ${winner ? 'bg-emerald-500/8' : ''}`}>
      {winner && <Text className="text-base">🏆</Text>}
      <Text className={`text-center font-oswald text-lg font-bold ${winner ? 'text-emerald-300' : dim ? 'text-white/40' : 'text-white'}`} numberOfLines={2}>{name}</Text>
      {winner && <Text className="font-montserrat text-[9px] font-bold uppercase tracking-widest text-emerald-500">Winner</Text>}
    </View>
  );
}

export function TieDetail({ tie, subMatches, lineups, slots, onBack }: {
  tie: Tie;
  subMatches: SubMatch[];
  lineups: Lineup[];
  slots: Slot[];
  onBack: () => void;
}) {
  const team1Id = tie.teams?.team1Id;
  const team2Id = tie.teams?.team2Id;
  const team1Name = tie.teams?.team1Name || 'Team 1';
  const team2Name = tie.teams?.team2Name || 'Team 2';
  const completed = tie.status === 'completed';
  const { t1, t2, hasScore } = tieSubScore(subMatches, team1Id, team2Id);
  const showScore = completed && hasScore;
  const labelFor = (slotNumber: number, fallback?: string) =>
    fallback || slots.find((s) => s.slotNumber === slotNumber)?.label || `Slot ${slotNumber}`;
  const doneCount = subMatches.filter((s) => s.status === 'completed').length;

  return (
    <View className="gap-5">
      <Pressable onPress={onBack} className="self-start">
        <Text className="font-montserrat text-sm text-gray-400">‹ Back to ties</Text>
      </Pressable>

      {/* Scoreboard */}
      <View className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <View className="flex-row items-stretch">
          <TeamCol name={team1Name} winner={tie.winnerId === team1Id} dim={completed} />
          <View className="min-w-[88px] items-center justify-center border-x border-white/5 px-4 py-6">
            {showScore ? (
              <>
                <View className="flex-row items-baseline gap-2">
                  <Text className={`font-oswald text-3xl font-black ${tie.winnerId === team1Id ? 'text-emerald-400' : 'text-white/40'}`}>{t1}</Text>
                  <Text className="text-gray-600">—</Text>
                  <Text className={`font-oswald text-3xl font-black ${tie.winnerId === team2Id ? 'text-emerald-400' : 'text-white/40'}`}>{t2}</Text>
                </View>
                <Text className="mt-1 font-montserrat text-[9px] uppercase tracking-widest text-gray-600">sub-matches</Text>
              </>
            ) : completed ? (
              <Text className="font-montserrat text-[9px] font-bold uppercase tracking-widest text-emerald-400">Completed</Text>
            ) : (
              <Text className="font-montserrat text-[9px] font-bold uppercase tracking-widest text-blue-400">In progress</Text>
            )}
          </View>
          <TeamCol name={team2Name} winner={tie.winnerId === team2Id} dim={completed} />
        </View>
      </View>

      {/* Lineups */}
      {lineups.length > 0 && (
        <View className="gap-2">
          <Text className="font-montserrat text-[10px] font-bold uppercase tracking-widest text-gray-500">Lineups</Text>
          {lineups.map((lu) => (
            <View key={lu._id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <Text className="mb-3 font-montserrat text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {lu.teamId === team1Id ? team1Name : team2Name}
              </Text>
              <View className="gap-1.5">
                {(lu.assignments || []).map((a) => (
                  <View key={a.slotNumber} className="flex-row items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5">
                    <Text className="font-montserrat text-[10px] text-gray-500">{labelFor(a.slotNumber)}</Text>
                    <Text className="flex-1 text-right font-montserrat text-sm font-medium text-white" numberOfLines={1}>{a.playerNames?.join(' & ') || 'TBD'}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sub-matches */}
      <View className="gap-2">
        <Text className="font-montserrat text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Sub-Matches{subMatches.length > 0 ? `  (${doneCount}/${subMatches.length} done)` : ''}
        </Text>
        {subMatches.length === 0 ? (
          <Text className="py-4 text-center font-montserrat text-sm text-gray-600">No sub-matches yet.</Text>
        ) : (
          subMatches.map((sm) => {
            const v = subMatchView(sm);
            const label = labelFor(sm.subMatchSlotNumber, sm.slotLabel);
            const p1Name = sm.player1?.name || team1Name;
            const p2Name = sm.player2?.name || team2Name;
            return (
              <View key={sm._id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <View className="flex-row items-center justify-between border-b border-white/5 bg-black/20 px-4 py-1.5">
                  <Text className="font-montserrat text-[10px] text-gray-500">{label}</Text>
                  <Text className={`font-montserrat text-[9px] font-bold uppercase tracking-wider ${v.done ? 'text-emerald-400' : 'text-gray-600'}`}>{v.done ? 'Done' : 'Upcoming'}</Text>
                </View>
                <View className="flex-row items-stretch">
                  <View className={`flex-1 items-end justify-center px-4 py-3 ${v.p1Wins ? 'bg-emerald-500/5' : ''}`}>
                    <Text className={`text-right font-montserrat text-sm ${v.p1Wins ? 'font-bold text-emerald-300' : v.done ? 'text-white/40' : 'text-white/80'}`} numberOfLines={2}>{p1Name}</Text>
                  </View>
                  <View className="min-w-[80px] items-center justify-center border-x border-white/5 px-3 py-2">
                    {v.gameScores.length > 0 ? (
                      <View className="gap-0.5">
                        {v.gameScores.map((gs, gi) => <Text key={gi} className="text-center font-montserrat text-xs font-bold text-gray-300">{gs}</Text>)}
                      </View>
                    ) : (
                      <Text className="font-montserrat text-[9px] font-bold uppercase tracking-wider text-gray-700">vs</Text>
                    )}
                  </View>
                  <View className={`flex-1 items-start justify-center px-4 py-3 ${v.p2Wins ? 'bg-emerald-500/5' : ''}`}>
                    <Text className={`font-montserrat text-sm ${v.p2Wins ? 'font-bold text-emerald-300' : v.done ? 'text-white/40' : 'text-white/80'}`} numberOfLines={2}>{p2Name}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
