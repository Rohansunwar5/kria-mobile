import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Category } from '@/store/slices/registrationSlice';
import { getAuctionStatus } from '@/api/auction';
import { auctionTag, type AuctionState } from '@/lib/drawRoute';
import { Tag } from '@/components/StatusPill';
import { Icon } from '@/components/icons';
import { Skeleton, EmptyState } from '@/components/states';

interface Room {
  categoryId: string;
  name: string;
  state: AuctionState;
  lot: number;
  totalLots: number;
}

/**
 * The auction rooms, on their own tab.
 *
 * Draw still links to a live auction, but it only does so while the category is
 * mid-bidding — once the hammer falls on the last lot the row hands over to the
 * bracket and the results become unreachable. This tab is keyed off the auction
 * document instead of the category status, so a finished auction stays listed.
 */
export function AuctionTab({
  tournamentId,
  categories,
  isLoading,
}: {
  tournamentId: string;
  categories: Category[];
  isLoading: boolean;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[] | null>(null);

  const categoryKey = categories.map((c) => `${c._id}:${c.name}`).join(',');

  useEffect(() => {
    if (categories.length === 0) {
      setRooms([]);
      return;
    }
    let active = true;
    Promise.all(
      categories.map((c) =>
        getAuctionStatus(tournamentId, c._id)
          .then((r) =>
            r?.auction
              ? {
                categoryId: c._id,
                name: c.name,
                state: r.auction.status as AuctionState,
                lot: (r.auction.currentPlayerIndex ?? 0) + 1,
                totalLots: r.auction.totalPlayers ?? 0,
              }
              : null,
          )
          // No auction document for this category — it simply is not an
          // auction category, which is not an error worth surfacing.
          .catch(() => null),
      ),
    ).then((found) => {
      if (!active) return;
      setRooms(found.filter((r): r is Room => r !== null));
    });
    return () => { active = false; };
  }, [tournamentId, categoryKey, categories]);

  if ((isLoading && categories.length === 0) || rooms === null) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 7 }}>
        <Skeleton h={62} />
        <Skeleton h={62} />
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={{ paddingTop: 14 }}>
        <EmptyState
          icon="gavel"
          title="No auction in this tournament"
          message="Squads were entered directly. Rooms and results appear here the moment an organiser opens bidding on a category."
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 7 }}>
      {rooms.map((room) => {
        const tag = auctionTag(room.state);
        const done = room.state === 'completed';
        const sub = done
          ? 'Results · who went where, and for how much'
          : room.state === 'not_started'
            ? 'Bidding has not opened yet'
            : `Lot ${room.lot} of ${room.totalLots}`;

        return (
          <Pressable
            key={room.categoryId}
            onPress={() => router.push(`/auction/${tournamentId}/${room.categoryId}` as never)}
            accessibilityRole="button"
            accessibilityLabel={`${room.name} — ${tag.label}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              minHeight: 44,
              paddingHorizontal: 13,
              paddingVertical: 11,
              backgroundColor: '#151515',
              borderWidth: 1.5,
              borderColor: tag.live ? 'rgba(250,76,147,0.5)' : 'rgba(255,255,255,0.14)',
              borderRadius: 6,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 20, color: '#fff' }}>
                {room.name}
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 4 }}>
                {sub}
              </Text>
            </View>
            <Tag label={tag.short} variant={tag.live ? 'auction' : 'up'} dot={tag.live} />
            <Icon name="chevron-right" size={15} color="#7d7d7d" />
          </Pressable>
        );
      })}
    </View>
  );
}
