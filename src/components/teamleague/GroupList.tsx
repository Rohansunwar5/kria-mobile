import { View, Text, Pressable } from 'react-native';
import { Group, GroupStandings } from '@/api/teamLeague';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/states';

export function GroupList({ groups, standings, onSelect }: {
  groups: Group[];
  standings: GroupStandings[];
  onSelect: (g: Group) => void;
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon="people"
        title="No groups yet"
        message="The organiser draws groups once every team has a roster."
      />
    );
  }

  return (
    <View style={{ gap: 7 }}>
      {groups.map((g) => {
        const gs = standings.find((s) => s.group._id === g._id);
        const done = gs?.completedTies ?? 0;
        const total = gs?.totalTies ?? 0;
        const pct = total > 0 ? (done / total) * 100 : 0;
        const allDone = total > 0 && done === total;

        return (
          <Pressable
            key={g._id}
            onPress={() => onSelect(g)}
            accessibilityRole="button"
            accessibilityLabel={g.groupName}
            style={{
              minHeight: 44,
              paddingHorizontal: 13,
              paddingVertical: 12,
              backgroundColor: '#151515',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.14)',
              borderLeftWidth: 4,
              borderLeftColor: allDone ? '#16C46A' : '#F97316',
              borderRadius: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
                {g.groupName}
              </Text>
              <Icon name="chevron-right" size={15} color="#7d7d7d" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3' }}>
                {g.teamIds?.length ?? 0} teams
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: allDone ? '#16C46A' : '#7d7d7d' }}>
                {total > 0 ? `${done}/${total} ties` : 'No ties yet'}
              </Text>
            </View>
            {total > 0 ? (
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: allDone ? '#16C46A' : '#F97316' }} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
