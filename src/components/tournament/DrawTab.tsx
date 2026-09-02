import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Category } from '@/store/slices/registrationSlice';
import { Tag } from '@/components/StatusPill';
import { Icon } from '@/components/icons';
import { Skeleton, EmptyState } from '@/components/states';
import { drawDestination, DRAW_LABEL, type DrawKind } from '@/lib/drawRoute';

const KIND_TAG: Record<Exclude<DrawKind, 'none'>, { label: string; variant: 'live' | 'auction' | 'up' }> = {
  auction: { label: 'Live', variant: 'auction' },
  teamLeague: { label: 'League', variant: 'up' },
  bracket: { label: 'Draw', variant: 'up' },
};

// One tab where there used to be three. Each category resolves to exactly one
// destination — see src/lib/drawRoute.ts and its tests.
export function DrawTab({
  tournamentId,
  categories,
  isLoading,
}: {
  tournamentId: string;
  categories: Category[];
  isLoading: boolean;
}) {
  const router = useRouter();

  if (isLoading && categories.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 7 }}>
        <Skeleton h={62} />
        <Skeleton h={62} />
        <Skeleton h={62} />
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={{ paddingTop: 14 }}>
        <EmptyState
          icon="bracket"
          title="Nothing drawn yet"
          message="Brackets, league tables and the auction room appear here once the organiser starts a category."
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 7 }}>
      {categories.map((cat) => {
        const dest = drawDestination(cat, tournamentId);
        const live = dest.kind === 'auction';
        const disabled = dest.kind === 'none';
        const tag = dest.kind === 'none' ? null : KIND_TAG[dest.kind];

        return (
          <Pressable
            key={cat._id}
            disabled={disabled}
            onPress={() => router.push(dest.href as any)}
            accessibilityRole="button"
            accessibilityLabel={`${cat.name} — ${DRAW_LABEL[dest.kind]}`}
            accessibilityState={{ disabled }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              minHeight: 44,
              paddingHorizontal: 13,
              paddingVertical: 11,
              backgroundColor: '#151515',
              borderWidth: 1.5,
              borderColor: live ? 'rgba(250,76,147,0.5)' : 'rgba(255,255,255,0.14)',
              borderRadius: 6,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
                {cat.name}
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 4 }}>
                {DRAW_LABEL[dest.kind]}
              </Text>
            </View>
            {tag ? <Tag label={tag.label} variant={tag.variant} dot={live} /> : null}
            {disabled ? null : <Icon name="chevron-right" size={15} color="#7d7d7d" />}
          </Pressable>
        );
      })}
    </View>
  );
}
