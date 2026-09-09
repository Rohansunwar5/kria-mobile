import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { claimQuickMatchSlot, getQuickMatchByCode, type QuickMatch } from '@/api/quickMatch';
import { freeSlots } from '@/lib/quickMatchView';

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

const serverMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ? message : fallback;
};

export default function JoinQuickMatchScreen() {
  const [code, setCode] = useState('');
  const [match, setMatch] = useState<QuickMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const lookup = async () => {
    setBusy(true);
    setProblem('');
    try {
      setMatch(await getQuickMatchByCode(code));
    } catch (err) {
      setMatch(null);
      setProblem(serverMessage(err, 'No match found for that code.'));
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
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
            Find match
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
      </ScrollView>
    </Screen>
  );
}
