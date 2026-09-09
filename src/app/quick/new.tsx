import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { createQuickMatch, type CreateQuickMatchBody } from '@/api/quickMatch';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import { useAppSelector } from '@/store/hooks';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const INPUT = {
  fontFamily: 'SpaceGrotesk_500Medium' as const,
  fontSize: 15,
  color: '#fff',
  borderWidth: 1.5,
  borderColor: 'rgba(255,255,255,0.14)',
  borderRadius: 4,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginTop: 6,
};

/** One editable slot. `playerId` absent means it is a placeholder that a join
 *  code can fill; `displayName` is required either way, because
 *  createQuickMatchValidator enforces notEmpty() on it unconditionally. */
type SlotDraft = { playerId?: string; displayName: string; locked?: boolean };

/** Deliberately non-generic. A generic over the literal unions would need the
 *  call sites to pass `as const` arrays, which are readonly and then do not
 *  satisfy a mutable `T[]` prop. Plain numbers, cast at the setter. */
function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={LBL}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {options.map((option) => {
          const on = option === value;
          return (
            <Pressable
              key={String(option)}
              onPress={() => onChange(option)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 4,
                backgroundColor: on ? '#F97316' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: on ? '#0B0B0B' : '#d4d4d4' }}>
                {String(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SlotEditor({
  slot,
  onChange,
  alreadyPicked,
}: {
  slot: SlotDraft;
  onChange: (next: SlotDraft) => void;
  alreadyPicked: string[];
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 3) {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      const found = await searchPlayers(text.trim());
      setHits(found.filter((hit) => !alreadyPicked.includes(hit._id)));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  if (slot.locked) {
    return (
      <View style={{ marginTop: 12 }}>
        <Text style={LBL}>You</Text>
        <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: '#fff', marginTop: 6 }}>
          {slot.displayName}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={LBL}>{slot.playerId ? 'Registered player' : 'Name or find a player'}</Text>
      <TextInput
        value={slot.displayName}
        onChangeText={(displayName) => onChange({ playerId: slot.playerId, displayName })}
        placeholder="Player name"
        placeholderTextColor="#5a5a5a"
        style={INPUT}
      />

      {slot.playerId ? (
        <Pressable onPress={() => onChange({ displayName: '' })} style={{ marginTop: 6 }}>
          <Text style={{ ...LBL, color: '#FF4438' }}>Clear</Text>
        </Pressable>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={runSearch}
            placeholder="Search registered players (3+ letters)"
            placeholderTextColor="#5a5a5a"
            autoCapitalize="none"
            style={{ ...INPUT, fontSize: 13 }}
          />
          {searching ? <ActivityIndicator color="#F97316" style={{ marginTop: 8 }} /> : null}
          {hits.map((hit) => (
            <Pressable
              key={hit._id}
              onPress={() => {
                onChange({ playerId: hit._id, displayName: `${hit.firstName} ${hit.lastName}` });
                setQuery('');
                setHits([]);
              }}
              style={{ paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}
            >
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>
                {`${hit.firstName} ${hit.lastName}`}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

export default function NewQuickMatchScreen() {
  const { user } = useAppSelector((s) => s.auth);
  const hostName = user ? `${user.firstName} ${user.lastName}` : 'You';

  const [doubles, setDoubles] = useState(false);
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [pointsToWin, setPointsToWin] = useState<11 | 15 | 21>(21);
  const [side1Name, setSide1Name] = useState('Side 1');
  const [side2Name, setSide2Name] = useState('Side 2');
  const [partner, setPartner] = useState<SlotDraft>({ displayName: 'Partner' });
  const [opponent1, setOpponent1] = useState<SlotDraft>({ displayName: 'Opponent' });
  const [opponent2, setOpponent2] = useState<SlotDraft>({ displayName: 'Opponent 2' });
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState('');

  const hostSlot: SlotDraft = { playerId: user?._id, displayName: hostName, locked: true };
  // Only the slots actually in play for the current doubles/singles choice —
  // a previously-picked opponent 2 must stop being excluded from search the
  // moment doubles is turned off, since they are no longer in the match.
  const side1Slots = doubles ? [hostSlot, partner] : [hostSlot];
  const side2Slots = doubles ? [opponent1, opponent2] : [opponent1];
  const picked = [...side1Slots, ...side2Slots]
    .map((slot) => slot.playerId)
    .filter((id): id is string => Boolean(id));

  const submit = async () => {
    // displayName is required on EVERY slot, including ones carrying a
    // playerId — an empty one is a 422 from the server.
    const named = [...side1Slots, ...side2Slots].every((slot) => slot.displayName.trim().length > 0);
    if (!named) {
      setProblem('Every slot needs a name.');
      return;
    }

    const body: CreateQuickMatchBody = {
      sport: 'badminton',
      sides: [
        { name: side1Name.trim(), slots: side1Slots.map((s) => ({ playerId: s.playerId, displayName: s.displayName.trim() })) },
        { name: side2Name.trim(), slots: side2Slots.map((s) => ({ playerId: s.playerId, displayName: s.displayName.trim() })) },
      ],
      matchConfig: { bestOf, pointsToWin },
    };

    setSubmitting(true);
    setProblem('');
    try {
      const created = await createQuickMatch(body);
      router.replace({ pathname: '/quick/[id]', params: { id: created._id } });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProblem(message ? message : 'Could not create the match. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...LBL, letterSpacing: 0.22 * 9 }}>Back</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 28, color: '#fff', marginTop: 10 }}>
          New quick match
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          {[false, true].map((isDoubles) => (
            <Pressable
              key={String(isDoubles)}
              onPress={() => setDoubles(isDoubles)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 4,
                alignItems: 'center',
                backgroundColor: doubles === isDoubles ? '#F97316' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.14 * 11, textTransform: 'uppercase', color: doubles === isDoubles ? '#0B0B0B' : '#d4d4d4' }}>
                {isDoubles ? 'Doubles' : 'Singles'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Chips label="Games" options={[1, 3, 5]} value={bestOf} onChange={(next) => setBestOf(next as 1 | 3 | 5)} />
        <Chips label="Points to win" options={[11, 15, 21]} value={pointsToWin} onChange={(next) => setPointsToWin(next as 11 | 15 | 21)} />

        <View style={{ marginTop: 22 }}>
          <Text style={LBL}>Side 1</Text>
          <TextInput value={side1Name} onChangeText={setSide1Name} style={INPUT} placeholderTextColor="#5a5a5a" />
          <SlotEditor slot={hostSlot} onChange={() => undefined} alreadyPicked={picked} />
          {doubles ? <SlotEditor slot={partner} onChange={setPartner} alreadyPicked={picked} /> : null}
        </View>

        <View style={{ marginTop: 22 }}>
          <Text style={LBL}>Side 2</Text>
          <TextInput value={side2Name} onChangeText={setSide2Name} style={INPUT} placeholderTextColor="#5a5a5a" />
          <SlotEditor slot={opponent1} onChange={setOpponent1} alreadyPicked={picked} />
          {doubles ? <SlotEditor slot={opponent2} onChange={setOpponent2} alreadyPicked={picked} /> : null}
        </View>

        {problem ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#FF4438', marginTop: 16 }}>
            {problem}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={submitting}
          style={{
            marginTop: 24,
            backgroundColor: '#F97316',
            opacity: submitting ? 0.5 : 1,
            borderRadius: 4,
            paddingVertical: 15,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: '#0B0B0B' }}>
            Start match
          </Text>
        </Pressable>

        <Text style={{ ...LBL, marginTop: 14, letterSpacing: 0.1 * 9 }}>
          Slots left as names can be claimed later with the join code.
        </Text>
      </ScrollView>
    </Screen>
  );
}
