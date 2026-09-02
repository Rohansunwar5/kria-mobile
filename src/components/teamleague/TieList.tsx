import { View, Text, Pressable } from 'react-native';
import { Tie } from '@/api/teamLeague';
import { Tag } from '@/components/StatusPill';
import { EmptyState } from '@/components/states';

export function TieList({ ties, onSelect }: { ties: Tie[]; onSelect: (t: Tie) => void }) {
  if (ties.length === 0) {
    return (
      <EmptyState
        icon="bracket"
        title="No ties yet"
        message="Fixtures for this group appear once the organiser schedules them."
      />
    );
  }

  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      {ties.map((tie, i) => {
        const completed = tie.status === 'completed';
        const win1 = tie.winnerId === tie.teams?.team1Id;
        const win2 = tie.winnerId === tie.teams?.team2Id;
        const progress =
          tie.completedCount !== undefined && (tie.subMatchCount ?? 0) > 0
            ? `${tie.completedCount}/${tie.subMatchCount}`
            : 'VS';

        const name = (label: string, won: boolean, align: 'right' | 'left') => (
          <Text
            numberOfLines={2}
            style={{
              flex: 1,
              textAlign: align,
              fontFamily: won ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_400Regular',
              fontSize: 13,
              color: won ? '#16C46A' : completed ? 'rgba(255,255,255,0.5)' : '#fff',
            }}
          >
            {label}
          </Text>
        );

        return (
          <View key={tie._id}>
            {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
            <Pressable
              onPress={() => onSelect(tie)}
              accessibilityRole="button"
              accessibilityLabel={`${tie.teams?.team1Name} versus ${tie.teams?.team2Name}`}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 14, paddingVertical: 12 }}
            >
              {name(tie.teams?.team1Name || 'TBD', win1, 'right')}
              <View style={{ minWidth: 64, alignItems: 'center', paddingHorizontal: 10 }}>
                {completed ? (
                  <Tag label="Done" variant="open" />
                ) : (
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, color: '#7d7d7d' }}>{progress}</Text>
                )}
              </View>
              {name(tie.teams?.team2Name || 'TBD', win2, 'left')}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
