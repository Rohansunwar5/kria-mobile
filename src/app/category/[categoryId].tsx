import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { StatusPill } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, Ghost } from '@/components/states';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerForCategory, fetchMyRegistrations, type Category } from '@/store/slices/registrationSlice';
import { getCategory, getSportConfig, slotPressure, type SportConfig } from '@/api/category';
import { computeAge } from '@/lib/format';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };
const DATA = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 15, color: '#fff' };

function monogram(name: string) {
  return name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Icon name={ok ? 'check' : 'info'} size={15} color={ok ? '#16C46A' : '#7d7d7d'} strokeWidth={ok ? 2.6 : 2.2} />
      <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: ok ? '#d4d4d4' : '#a3a3a3' }}>
        {text}
      </Text>
    </View>
  );
}

export default function CategoryRegister() {
  const { categoryId, tournamentId } = useLocalSearchParams<{ categoryId: string; tournamentId?: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { myRegistrations, categoryRegistrations } = useAppSelector((s) => s.registration);
  const { currentTournament } = useAppSelector((s) => s.tournament);

  const [category, setCategory] = useState<Category | null>(null);
  const [sport, setSport] = useState<SportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const cat = await getCategory(categoryId);
      if (!cat) throw new Error('This category could not be found.');
      setCategory(cat);
      const sportName = currentTournament?.sport;
      if (sportName) setSport(await getSportConfig(sportName));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not load this category.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, currentTournament?.sport]);

  useEffect(() => {
    load();
  }, [load]);

  const already = myRegistrations.some((r) => r.categoryId === categoryId);
  const fee = category?.registrationFee ?? 0;
  const paid = !!category?.isPaidRegistration && fee > 0;
  const cap = category?.maxRegistrations || category?.maxParticipants || 0;
  const filled = categoryRegistrations.filter((r) => r.categoryId === categoryId).length;
  const slots = slotPressure(filled, cap);
  const open = category?.status === 'registration_open';

  const age = computeAge(user?.dateOfBirth);
  const profileReady = !!user?.gender && !!user?.dateOfBirth;
  const genderOk =
    !category ||
    category.gender === 'Any' ||
    category.gender === 'Mixed' ||
    (user?.gender || '').toLowerCase() === category.gender.toLowerCase();
  const ageOk = !category || ((!category.minAge || age >= category.minAge) && (!category.maxAge || age <= category.maxAge));

  const enter = async () => {
    if (!category) return;
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (paid && tournamentId) {
      router.push({ pathname: '/checkout/[tournamentId]/[categoryId]', params: { tournamentId, categoryId: category._id } });
      return;
    }
    if (!profileReady) {
      router.push('/profile/edit');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(
        registerForCategory({
          tournamentId: category.tournamentId,
          categoryId: category._id,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            age,
            gender: user.gender || 'male',
            phone: user.phone || '',
            // ponytail: no skill picker on this artboard; the organiser can
            // reband a player. Add one here if seeding starts depending on it.
            skillLevel: 'intermediate',
          },
        })
      ).unwrap();
      await dispatch(fetchMyRegistrations());
      router.replace('/profile/registrations');
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Registration failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Category</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
          {currentTournament?.name || ' '}
        </Text>
      </View>
      {category ? <StatusPill status={category.status} /> : null}
    </View>
  );

  if (loading && !category) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={12} w={130} line />
          <Skeleton h={68} />
          <Skeleton h={96} />
          <Skeleton h={110} />
        </View>
      </Screen>
    );
  }

  if (!category) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16 }}>
          <ErrorBlock label="Category unavailable" message={error || undefined} onRetry={load} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {Header}

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, overflow: 'hidden' }}>
          <Ghost text={monogram(category.name)} size={84} style={{ right: -6, top: 2 }} />
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#F97316' }}>
            {[currentTournament?.sport, category.bracketType?.replace('_', ' ')].filter(Boolean).join(' · ')}
          </Text>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 38, lineHeight: 34, color: '#fff', marginTop: 8 }}>
            {category.name}
          </Text>
        </View>

        {/* Slot pressure */}
        {!slots.unlimited ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
            <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.45)', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={LBL}>Slots filled</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, color: '#fff' }}>{filled}</Text>
                    <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 13, color: '#7d7d7d' }}>/ {cap}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={LBL}>Max age</Text>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#F97316', marginTop: 5 }}>
                    {category.maxAge ? `${category.maxAge}` : 'Any'}
                  </Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${slots.ratio * 100}%`, height: '100%', backgroundColor: '#F97316' }} />
              </View>
              {slots.filling ? (
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#FA4C93', marginTop: 8 }}>
                  {slots.left} slot{slots.left === 1 ? '' : 's'} left — filling fast
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Format & scoring, from SportConfig */}
        {sport?.scoringConfig ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
            <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 8 }}>Format &amp; scoring</Text>
            <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row' }}>
                {[
                  ['Sets', sport.defaults?.bestOf ? `Best of ${sport.defaults.bestOf}` : '—'],
                  ['Points', sport.scoringConfig.pointsToWin ? String(sport.scoringConfig.pointsToWin) : '—'],
                  ['Cap', sport.scoringConfig.maxPoints ? String(sport.scoringConfig.maxPoints) : '—'],
                ].map(([label, value], i) => (
                  <View
                    key={label}
                    style={{
                      flex: 1,
                      paddingHorizontal: 13,
                      paddingVertical: 11,
                      ...(i < 2 ? { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.10)' } : null),
                    }}
                  >
                    <Text style={LBL}>{label}</Text>
                    <Text style={{ ...DATA, marginTop: 3 }}>{value}</Text>
                  </View>
                ))}
              </View>
              {sport.scoringConfig.tieBreakerRules || category.description ? (
                <>
                  <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#d4d4d4', padding: 13 }}>
                    {category.description || sport.scoringConfig.tieBreakerRules}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Eligibility */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 6 }}>
          <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 2 }}>Eligibility</Text>
          <Rule
            ok={genderOk && ageOk}
            text={`${category.gender === 'Any' ? 'Open to all' : category.gender}${category.minAge ? `, ${category.minAge} and over` : ''}${genderOk && ageOk ? ' — you qualify' : ' — you do not meet this'}`}
          />
          <Rule ok={profileReady} text={profileReady ? 'Profile complete — player ID issued' : 'Add your date of birth and gender before entering'} />
          <Rule ok={false} text={paid ? 'Approval by the organiser after payment' : 'Approval by the organiser after entry'} />
        </View>

        {error ? (
          <View style={{ padding: 16 }}>
            <ErrorBlock label="Entry failed" message={error} onRetry={() => setError(null)} />
          </View>
        ) : null}
      </ScrollView>

      {/* Enter bar */}
      <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#101010', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 11 }}>
          <View>
            <Text style={LBL}>Entry fee</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 24, color: '#16C46A', marginTop: 2 }}>
              {paid ? `₹${fee.toLocaleString('en-IN')}` : 'Free'}
            </Text>
          </View>
          {paid ? (
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.06 * 9, textTransform: 'uppercase', color: '#7d7d7d', textAlign: 'right', lineHeight: 14 }}>
              + Platform &amp; GST{'\n'}shown at checkout
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={already ? 'Already entered' : 'Enter this category'}
          accessibilityState={{ disabled: already || !open || submitting }}
          disabled={already || !open || submitting}
          onPress={enter}
          style={{
            height: 54,
            borderRadius: 5,
            backgroundColor: already || !open ? 'rgba(255,255,255,0.10)' : '#F97316',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, letterSpacing: 0.04 * 17, color: already || !open ? '#7d7d7d' : '#0B0B0B' }}>
            {already ? 'Already entered' : !open ? 'Entry closed' : submitting ? 'Entering…' : !profileReady ? 'Complete your profile' : 'Enter this category'}
          </Text>
          {!already && open && !submitting ? <Icon name="arrow-right" size={19} color="#0B0B0B" strokeWidth={2.8} /> : null}
        </Pressable>
      </View>
    </Screen>
  );
}
