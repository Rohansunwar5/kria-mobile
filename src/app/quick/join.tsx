import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { claimQuickMatchSlot, type QuickMatch } from '@/api/quickMatch';
import { claimKnockoutGuest, joinQuickKnockout, resolveQuickCode, type QuickKnockout } from '@/api/quickKnockout';
import { useAppSelector } from '@/store/hooks';
import { freeSlots } from '@/lib/quickMatchView';
import { goBack } from '@/lib/nav';
import { formatLabel, teamPlayers } from '@/lib/quickKnockoutView';

/** The server's code alphabet — no 0, O, 1 or I, because codes get read aloud
 *  and retyped. Anything else a keyboard offers is dropped on entry. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const normalise = (input: string) =>
  input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, CODE_LENGTH);

const KNOCKOUT_CLOSED: Record<Exclude<QuickKnockout['status'], 'waiting'>, string> = {
  live: 'This knockout has already started.',
  completed: 'This knockout has finished.',
  cancelled: 'This knockout was cancelled.',
};

const serverMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ? message : fallback;
};

export default function JoinQuickMatchScreen() {
  const [code, setCode] = useState('');
  const [match, setMatch] = useState<QuickMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const { user } = useAppSelector((s) => s.auth);
  const [knockout, setKnockout] = useState<QuickKnockout | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  const lookup = async () => {
    setBusy(true);
    setProblem('');
    setTeamId(null);
    try {
      const found = await resolveQuickCode(code);
      setMatch(found.kind === 'match' ? found.data : null);
      setKnockout(found.kind === 'knockout' ? found.data : null);
    } catch (err) {
      setMatch(null);
      setKnockout(null);
      setProblem(serverMessage(err, 'No match or knockout found for that code.'));
    } finally {
      setBusy(false);
    }
  };

  const enterKnockout = async (action: () => Promise<QuickKnockout>) => {
    setBusy(true);
    setProblem('');
    try {
      const joined = await action();
      router.replace({ pathname: '/knockout/[id]', params: { id: joined._id } });
    } catch (err) {
      setProblem(serverMessage(err, 'Could not join that knockout.'));
    } finally {
      setBusy(false);
    }
  };

  const claim = async (slotId: string) => {
    setBusy(true);
    setProblem('');
    try {
      const joined = await claimQuickMatchSlot(code, slotId);
      router.replace({ pathname: '/quick/[id]', params: { id: joined._id } });
    } catch (err) {
      // Every one of these is reachable: the match may have completed, the
      // player may already be in it, or another joiner may have taken the slot
      // between the lookup and the tap.
      const message = serverMessage(err, 'Could not claim that slot.');
      await lookup();
      setProblem(message);
    } finally {
      setBusy(false);
    }
  };

  const open = match ? freeSlots(match) : [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 }}>
        <Pressable onPress={() => goBack(router, '/quick')} hitSlop={12}>
          <Text style={{ ...LBL, letterSpacing: 0.22 * 9 }}>Back</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 28, color: '#fff', marginTop: 10 }}>
          Join a match
        </Text>

        <Text style={{ ...LBL, marginTop: 18 }}>Six-character code</Text>
        <TextInput
          value={code}
          onChangeText={(text) => setCode(normalise(text))}
          placeholder="ABC234"
          placeholderTextColor="#5a5a5a"
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 26,
            letterSpacing: 0.2 * 26,
            color: '#fff',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.14)',
            borderRadius: 4,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginTop: 6,
          }}
        />

        <Pressable
          onPress={lookup}
          disabled={busy || code.length < CODE_LENGTH}
          style={{
            marginTop: 14,
            backgroundColor: '#F97316',
            opacity: busy || code.length < CODE_LENGTH ? 0.5 : 1,
            borderRadius: 4,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: '#0B0B0B' }}>
            Find
          </Text>
        </Pressable>

        {problem ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#FF4438', marginTop: 16 }}>
            {problem}
          </Text>
        ) : null}

        {match ? (
          <View style={{ marginTop: 26 }}>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, color: '#fff' }}>
              {`${match.sides[0].name} v ${match.sides[1].name}`}
            </Text>

            {open.length === 0 ? (
              <Text style={{ ...LBL, marginTop: 10 }}>Every slot in this match is taken.</Text>
            ) : (
              <>
                <Text style={{ ...LBL, marginTop: 12 }}>Pick a slot</Text>
                {match.sides.map((side) => (
                  <View key={side.sideId} style={{ marginTop: 12 }}>
                    <Text style={LBL}>{side.name}</Text>
                    {side.slots.map((slot) => {
                      const taken = Boolean(slot.playerId);
                      return (
                        <Pressable
                          key={slot.slotId}
                          onPress={() => claim(slot.slotId)}
                          disabled={taken || busy}
                          style={{
                            marginTop: 8,
                            borderWidth: 1.5,
                            borderColor: taken ? 'rgba(255,255,255,0.12)' : '#F97316',
                            borderRadius: 4,
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            opacity: taken ? 0.45 : 1,
                          }}
                        >
                          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>
                            {taken ? `${slot.displayName} · taken` : slot.displayName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </View>
        ) : null}

        {knockout ? (
          <View style={{ marginTop: 26, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, padding: 14 }}>
            <Text style={{ ...LBL, color: '#16C46A' }}>{`Knockout · ${formatLabel(knockout)}`}</Text>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: '#fff', marginTop: 6 }}>{knockout.name}</Text>
            <Text style={{ ...LBL, marginTop: 4 }}>
              {`Hosted by ${knockout.players.find((p) => p.playerId === knockout.hostId)?.displayName ?? 'the host'} · ${knockout.players.length} in so far`}
            </Text>
            {/* Someone already in can always open it; only a newcomer cares whether it has begun. */}
            {user?._id && knockout.players.some((p) => p.playerId === user._id) ? (
              <Pressable onPress={() => router.replace({ pathname: '/knockout/[id]', params: { id: knockout._id } })} style={{ marginTop: 14, backgroundColor: '#F97316', borderRadius: 4, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: '#0B0B0B' }}>You are in · Open</Text>
              </Pressable>
            ) : knockout.status !== 'waiting' ? (
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#d4d4d4', marginTop: 12 }}>{KNOCKOUT_CLOSED[knockout.status]}</Text>
            ) : (
              <>
                {knockout.sport === 'cricket' ? (
                  <>
                    <Text style={{ ...LBL, marginTop: 14 }}>Pick your team</Text>
                    {(knockout.teams ?? []).map((team) => {
                      const count = teamPlayers(knockout, team.teamId).length;
                      const full = count >= (knockout.matchConfig.playersPerTeam ?? 0);
                      const on = teamId === team.teamId;
                      return (
                        <Pressable
                          key={team.teamId}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on, disabled: full }}
                          disabled={full || busy}
                          onPress={() => setTeamId(team.teamId)}
                          style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: on ? '#F97316' : 'rgba(255,255,255,0.14)', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 12, opacity: full ? 0.45 : 1 }}
                        >
                          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>{team.name}</Text>
                          <Text style={LBL}>{full ? 'Full' : `${count}/${knockout.matchConfig.playersPerTeam}`}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: teamId === null }}
                      disabled={busy}
                      onPress={() => setTeamId(null)}
                      style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: teamId === null ? '#F97316' : 'rgba(255,255,255,0.14)', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 12 }}
                    >
                      <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>Any team</Text>
                      <Text style={LBL}>The draw places you</Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable disabled={busy} onPress={() => enterKnockout(() => (teamId ? joinQuickKnockout(code, teamId) : joinQuickKnockout(code)))} style={{ marginTop: 14, backgroundColor: '#F97316', opacity: busy ? 0.5 : 1, borderRadius: 4, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: '#0B0B0B' }}>
                    {`Join as ${user ? `${user.firstName} ${user.lastName}` : 'yourself'}`}
                  </Text>
                </Pressable>
                {knockout.players.some((p) => !p.playerId) ? (
                  <Text style={{ ...LBL, marginTop: 16 }}>Already added by the host? Tap your name</Text>
                ) : null}
                {knockout.players.filter((p) => !p.playerId).map((p) => (
                  <Pressable key={p.playerKey} disabled={busy} onPress={() => enterKnockout(() => claimKnockoutGuest(code, p.playerKey))}
                    style={{ marginTop: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 12 }}>
                    <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>{p.displayName}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
