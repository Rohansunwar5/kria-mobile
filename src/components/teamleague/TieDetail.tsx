import { View, Text, Pressable } from 'react-native';
import { Tie, SubMatch, Lineup } from '@/api/teamLeague';
import { tieSubScore, subMatchView } from '@/lib/teamLeagueView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';

// TeamLeague.dc.html's tie block: two squad squares either side of a brand VS,
// then the lineup as one tagged row per rubber.

type Slot = { slotNumber: number; label: string };

function Block({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

function Divide() {
  return <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />;
}

export function TieDetail({
  tie,
  subMatches,
  lineups,
  slots,
  onBack,
}: {
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
    <View style={{ gap: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to ties" onPress={onBack} hitSlop={10} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
        <Icon name="chevron-left" size={13} color="#7d7d7d" strokeWidth={2.4} />
        <Lbl style={{ letterSpacing: 0.12 * 9 }}>Back to ties</Lbl>
      </Pressable>

      <Block>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
          <View style={{ alignItems: 'center', width: 74 }}>
            <InitialsAvatar name={team1Name} size={34} color={tie.winnerId === team1Id ? '#F97316' : '#3f3f46'} />
            <Text numberOfLines={2} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textAlign: 'center', color: tie.winnerId === team1Id ? '#fff' : '#a3a3a3', marginTop: 6 }}>
              {team1Name}
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            {showScore ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, color: tie.winnerId === team1Id ? '#F97316' : '#a3a3a3' }}>{t1}</Text>
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 15, color: '#5c5c5c' }}>—</Text>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, color: tie.winnerId === team2Id ? '#F97316' : '#a3a3a3' }}>{t2}</Text>
              </View>
            ) : (
              <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 18, color: '#F97316' }}>VS</Text>
            )}
            <Lbl style={{ letterSpacing: 0.1 * 9, marginTop: 5 }}>
              {showScore ? 'Rubbers won' : completed ? 'Completed' : 'In progress'}
            </Lbl>
          </View>

          <View style={{ alignItems: 'center', width: 74 }}>
            <InitialsAvatar name={team2Name} size={34} color={tie.winnerId === team2Id ? '#F97316' : '#3f3f46'} />
            <Text numberOfLines={2} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textAlign: 'center', color: tie.winnerId === team2Id ? '#fff' : '#a3a3a3', marginTop: 6 }}>
              {team2Name}
            </Text>
          </View>
        </View>

        {subMatches.length > 0 ? (
          <>
            <Divide />
            <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Lbl style={{ letterSpacing: 0.12 * 9 }}>
                {`${doneCount}/${subMatches.length} rubbers played`}
              </Lbl>
            </View>
          </>
        ) : null}
      </Block>

      {lineups.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Lbl>Lineups</Lbl>
          {lineups.map((lu) => (
            <Block key={lu._id}>
              <View style={{ paddingHorizontal: 13, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <Lbl style={{ letterSpacing: 0.12 * 9 }}>{lu.teamId === team1Id ? team1Name : team2Name}</Lbl>
              </View>
              {(lu.assignments || []).map((a) => (
                <View key={a.slotNumber} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <View style={{ width: 46 }}>
                    <Tag label={labelFor(a.slotNumber)} variant="up" />
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#d4d4d4' }}>
                    {a.playerNames?.join(' / ') || 'Not submitted yet'}
                  </Text>
                </View>
              ))}
            </Block>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Lbl>Rubbers</Lbl>
        {subMatches.length === 0 ? (
          <Block>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: '#7d7d7d', textAlign: 'center', paddingVertical: 22 }}>
              No rubbers yet
            </Text>
          </Block>
        ) : (
          subMatches.map((sm) => {
            const v = subMatchView(sm);
            const p1Name = sm.player1?.name || team1Name;
            const p2Name = sm.player2?.name || team2Name;
            return (
              <Block key={sm._id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Lbl style={{ letterSpacing: 0.12 * 9 }}>{labelFor(sm.subMatchSlotNumber, sm.slotLabel)}</Lbl>
                  <Tag label={v.done ? 'Done' : 'Upcoming'} variant={v.done ? 'open' : 'end'} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <Text numberOfLines={2} style={{ flex: 1, textAlign: 'right', paddingRight: 10, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: v.p1Wins ? '#fff' : v.done ? '#7d7d7d' : '#d4d4d4' }}>
                    {p1Name}
                  </Text>
                  <View style={{ minWidth: 62, alignItems: 'center' }}>
                    {v.gameScores.length > 0 ? (
                      v.gameScores.map((gs, gi) => (
                        <Text key={gi} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: '#d4d4d4' }}>
                          {gs}
                        </Text>
                      ))
                    ) : (
                      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 13, color: '#5c5c5c' }}>VS</Text>
                    )}
                  </View>
                  <Text numberOfLines={2} style={{ flex: 1, paddingLeft: 10, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: v.p2Wins ? '#fff' : v.done ? '#7d7d7d' : '#d4d4d4' }}>
                    {p2Name}
                  </Text>
                </View>
              </Block>
            );
          })
        )}
      </View>
    </View>
  );
}
