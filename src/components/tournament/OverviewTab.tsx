import { View, Text, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import type { Team } from '@/store/slices/teamSlice';
import type { Registration, Category } from '@/store/slices/registrationSlice';
import { Tag } from '@/components/StatusPill';
import { Chip } from '@/components/canvas';
import { Icon } from '@/components/icons';
import { Skeleton, EmptyState } from '@/components/states';
import { STATUS_TAG } from '@/lib/tournamentConstants';

const EDGE: Record<string, string> = {
  auction_in_progress: '#FA4C93',
  ongoing: '#F97316',
  registration_open: '#16C46A',
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** "Your place in this" — the team you were drafted to, and what happens next. */
function YourPlace({ team, assignment }: { team: Team; assignment?: Registration }) {
  const color = team.primaryColor || '#F97316';
  const sold = assignment?.auctionData?.soldPrice;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginBottom: 8 }}>
        Your place in this
      </Text>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 }}>
          <View style={{ width: 46, height: 46, borderRadius: 5, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 16, color: '#fff' }}>{initials(team.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 17, color: '#fff' }}>
              {team.name}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 5 }}>
              {sold ? `Sold ₹${sold.toLocaleString('en-IN')}` : 'Drafted'}
            </Text>
          </View>
          <Tag label="In" variant="open" />
        </View>
        {team.whatsappGroupLink ? (
          <>
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(team.whatsappGroupLink!)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, minHeight: 44, backgroundColor: 'rgba(249,115,22,0.07)' }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
                  Team chat
                </Text>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#fff', marginTop: 3 }}>WhatsApp group</Text>
              </View>
              <Chip label="Open" selected />
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

export function OverviewTab({
  tournamentId,
  tournamentStatus,
  categories,
  myRegistrations,
  myTeam,
  myTeamAssignment,
  isTeamDataReady,
  isLoading,
  user,
}: {
  tournamentId: string;
  tournamentStatus: string;
  categories: Category[];
  myRegistrations: Registration[];
  myTeam: Team | null | undefined;
  myTeamAssignment?: Registration;
  isTeamDataReady: boolean;
  isLoading: boolean;
  user: any;
}) {
  const router = useRouter();
  const registeredIn = (categoryId: string) => myRegistrations.some((r) => r.categoryId === categoryId);

  const openCategory = (cat: Category) => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push({ pathname: '/category/[categoryId]', params: { categoryId: cat._id, tournamentId } });
  };

  if (isLoading && categories.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
        <Skeleton h={10} w={110} line />
        <Skeleton h={92} />
        <Skeleton h={10} w={80} line style={{ marginTop: 6 }} />
        <Skeleton h={62} />
        <Skeleton h={62} />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}>
      {user && isTeamDataReady && myTeam ? <YourPlace team={myTeam} assignment={myTeamAssignment} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          Categories
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#F97316' }}>
          {String(categories.length).padStart(2, '0')}
        </Text>
      </View>

      {categories.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No categories yet"
          message="The organiser has not announced categories for this tournament. Entry opens once they do."
        />
      ) : (
        <View style={{ gap: 7 }}>
          {categories.map((cat) => {
            const tag = STATUS_TAG[cat.status] ?? STATUS_TAG.draft;
            const mine = registeredIn(cat._id);
            const meta = [
              cat.bracketType?.replace('_', ' '),
              cat.maxRegistrations ? String(cat.maxRegistrations) : null,
              cat.isPaidRegistration ? `₹${cat.registrationFee}` : 'Free',
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable
                key={cat._id}
                onPress={() => openCategory(cat)}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 44,
                  paddingHorizontal: 13,
                  paddingVertical: 11,
                  backgroundColor: '#151515',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.14)',
                  borderLeftWidth: 4,
                  borderLeftColor: EDGE[cat.status] || 'rgba(255,255,255,0.14)',
                  borderRadius: 6,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
                    {cat.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 4 }}>
                    {meta}
                  </Text>
                </View>
                {mine ? <Tag label="Entered" variant="auction" /> : <Tag label={tag.label} variant={tag.variant} dot={tag.dot} />}
                <Icon name="chevron-right" size={15} color="#7d7d7d" />
              </Pressable>
            );
          })}
        </View>
      )}

      {tournamentStatus !== 'registration_open' && categories.length > 0 ? (
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#7d7d7d', marginTop: 12 }}>
          Entry is closed for this tournament. Categories stay here so you can follow the draw and results.
        </Text>
      ) : null}
    </View>
  );
}
