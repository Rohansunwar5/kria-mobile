import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { usePress } from '@/lib/motion';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import {
  BEST_OF,
  POINTS,
  activeSlots,
  formatChips,
  sideLabels,
  teamNames,
  type HostDraft,
  type SlotDraft,
  type Sport,
} from '@/lib/quickHostWizard';

// The bodies of the host wizard's five steps, plus the controls they share.
// The screen (src/app/quick/new.tsx) owns the draft, the chrome and the CTA.

type Patch = (next: Partial<HostDraft>) => void;

const label = (t: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.18 * 9,
  textTransform: 'uppercase' as const,
  color: t.textFaint,
});

const body = (t: Palette) => ({
  fontFamily: 'SpaceGrotesk_400Regular' as const,
  fontSize: 13,
  lineHeight: 19,
  color: t.textMeta,
});

const input = (t: Palette) => ({
  fontFamily: 'SpaceGrotesk_500Medium' as const,
  fontSize: 15,
  color: t.text,
  borderWidth: 1.5,
  borderColor: t.line,
  borderRadius: 5,
  backgroundColor: t.fillSoft,
  paddingHorizontal: 12,
  minHeight: 48,
});

function Tag({ text, tone }: { text: string; tone: 'brand' | 'quiet' }) {
  const t = useTheme();
  return (
    <View style={{ borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: tone === 'brand' ? t.brand : t.fill }}>
      <Text style={{ ...label(t), color: tone === 'brand' ? t.onBrand : t.textBody }}>{text}</Text>
    </View>
  );
}

/** A big one-tap answer. Tapping it is the answer — the screen advances. */
export function ChoiceCard({ icon, title, hint, selected, onPress }: {
  icon: IconName;
  title: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const { press, onPressIn, onPressOut } = usePress();
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.015 }] }));
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          minHeight: 96,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: selected ? t.brand : t.line,
          backgroundColor: selected ? t.brandTint : t.surface,
        }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? t.brand : t.fill }}>
          <Icon name={icon} size={28} color={selected ? t.onBrand : t.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 24, lineHeight: 29, textTransform: 'uppercase', color: t.text }}>
            {title}
          </Text>
          <Text style={{ ...body(t), marginTop: 2 }}>{hint}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={selected ? t.brandInk : t.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

export function Segmented<T extends string | number | boolean>({ title, options, value, onChange, hint }: {
  title: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (next: T) => void;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 26 }}>
      <Text style={label(t)}>{title}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(option.value)}
              style={{
                flex: 1,
                minHeight: 52,
                paddingVertical: 10,
                borderRadius: 5,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: on ? t.brand : t.line,
                backgroundColor: on ? t.brand : t.fillSoft,
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.1 * 12, textTransform: 'uppercase', color: on ? t.onBrand : t.text }}>
                {option.label}
              </Text>
              {option.sub ? (
                <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 11, marginTop: 2, color: on ? t.onBrand : t.textFaint }}>
                  {option.sub}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={{ ...body(t), marginTop: 8 }}>{hint}</Text> : null}
    </View>
  );
}

/** − value + with presets. Bounded, so a cricket config can never be invalid. */
export function Stepper({ title, value, min, max, presets, onChange, hint }: {
  title: string;
  value: number;
  min: number;
  max: number;
  presets: number[];
  onChange: (next: number) => void;
  hint: string;
}) {
  const t = useTheme();
  const nudge = (by: number) => onChange(Math.min(max, Math.max(min, value + by)));
  const square = (icon: IconName, by: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${by > 0 ? 'More' : 'Fewer'} ${title.toLowerCase()}`}
      disabled={disabled}
      onPress={() => nudge(by)}
      style={{ width: 52, height: 52, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fill, opacity: disabled ? 0.35 : 1 }}
    >
      <Icon name={icon} size={20} color={t.text} />
    </Pressable>
  );
  return (
    <View style={{ marginBottom: 26 }}>
      <Text style={label(t)}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
        {square('minus', -1, value <= min)}
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: 'SpaceMono_700Bold', fontSize: 34, color: t.text }}>{value}</Text>
        {square('plus', 1, value >= max)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {presets.map((preset) => {
          const on = preset === value;
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(preset)}
              style={{ flex: 1, minHeight: 44, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.brand : t.fillSoft, borderWidth: 1.5, borderColor: on ? t.brand : t.line }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: on ? t.onBrand : t.textBody }}>{preset}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ ...body(t), marginTop: 8 }}>{hint}</Text>
    </View>
  );
}

function PersonRow({ name, tag, onRemove }: { name: string; tag: string; onRemove?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 10, borderRadius: 5, backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line }}>
      <InitialsAvatar name={name} size={32} color={t.brand} />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: t.text }}>{name}</Text>
      <Tag text={tag} tone={tag === 'You' ? 'brand' : 'quiet'} />
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} onPress={onRemove} hitSlop={8} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={t.textMeta} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * One box for a player. Typing names a guest; three letters in, matching Kria
 * players appear underneath and tapping one links their account instead.
 */
function PlayerField({ slot, placeholder, exclude, onChange }: {
  slot: SlotDraft;
  placeholder: string;
  exclude: string[];
  onChange: (next: SlotDraft) => void;
}) {
  const t = useTheme();
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const [searching, setSearching] = useState(false);
  // Responses can land out of order; only the newest query may write.
  const latest = useRef('');

  if (slot.playerId) {
    return <PersonRow name={slot.displayName} tag="On Kria" onRemove={() => onChange({ displayName: '' })} />;
  }

  const type = async (text: string) => {
    onChange({ displayName: text });
    const q = text.trim();
    latest.current = q;
    if (q.length < 3) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let found: PlayerHit[] = [];
    try {
      found = await searchPlayers(q);
    } catch {
      // A failed search still leaves a usable guest name.
    }
    if (latest.current !== q) return;
    setHits(found.filter((hit) => !exclude.includes(hit._id)).slice(0, 4));
    setSearching(false);
  };

  return (
    <View>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          value={slot.displayName}
          onChangeText={type}
          placeholder={placeholder}
          placeholderTextColor={t.textFaint}
          autoCorrect={false}
          style={input(t)}
        />
        {searching ? <ActivityIndicator color={t.brand} style={{ position: 'absolute', right: 12 }} /> : null}
      </View>
      {hits.length ? (
        <View style={{ marginTop: 6, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
          <Text style={{ ...label(t), paddingHorizontal: 12, paddingTop: 10 }}>On Kria — tap to link</Text>
          {hits.map((hit) => {
            const name = `${hit.firstName} ${hit.lastName}`;
            return (
              <Pressable
                key={hit._id}
                accessibilityRole="button"
                onPress={() => {
                  latest.current = '';
                  setHits([]);
                  onChange({ playerId: hit._id, displayName: name });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12 }}
              >
                <InitialsAvatar name={name} size={28} color={t.brand} logo={hit.profileImage} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text }}>{name}</Text>
                {hit.location ? <Text numberOfLines={1} style={{ ...body(t), fontSize: 12, maxWidth: 110 }}>{hit.location}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A side's heading. The name is optional: closed, it says what the side will
 * be called anyway ("Plays as Arjun & Priya"); opened, a typed name wins.
 */
function TeamHeader({ side, auto, custom, onCustom, alwaysOpen }: {
  side: string;
  auto: string;
  custom: string;
  onCustom: (next: string) => void;
  alwaysOpen?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(Boolean(alwaysOpen || custom));
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
        <Text style={{ ...label(t), color: t.brandInk }}>{side}</Text>
        {alwaysOpen ? (
          <Text style={label(t)}>Optional</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? `Use player names for ${side}` : `Name ${side}`}
            hitSlop={10}
            onPress={() => {
              if (open) onCustom('');
              setOpen(!open);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}
          >
            <Icon name={open ? 'close' : 'edit'} size={13} color={t.textMeta} />
            <Text style={{ ...label(t), color: t.textMeta }}>{open ? 'Use player names' : 'Name team'}</Text>
          </Pressable>
        )}
      </View>
      {open ? (
        <TextInput
          value={custom}
          onChangeText={onCustom}
          placeholder={auto}
          placeholderTextColor={t.textFaint}
          autoFocus={!alwaysOpen}
          maxLength={40}
          style={{ ...input(t), marginTop: 6 }}
        />
      ) : auto ? (
        <Text style={{ ...body(t), marginTop: 2 }}>
          Plays as <Text style={{ color: t.text, fontFamily: 'SpaceGrotesk_700Bold' }}>{auto}</Text>
        </Text>
      ) : null}
    </View>
  );
}

function VsRule() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1.5, backgroundColor: t.line }} />
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 18, lineHeight: 22, color: t.brandInk }}>VS</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: t.line }} />
    </View>
  );
}

// ─── The steps ───────────────────────────────────────────────────────────────

export function SportStep({ draft, onPick }: { draft: HostDraft; onPick: (sport: Sport) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <ChoiceCard icon="shuttlecock" title="Badminton" hint="Singles or doubles, rally scoring" selected={draft.sport === 'badminton'} onPress={() => onPick('badminton')} />
      <ChoiceCard icon="cricket-bat" title="Cricket" hint="Limited overs, ball by ball" selected={draft.sport === 'cricket'} onPress={() => onPick('cricket')} />
    </View>
  );
}

export function RoleStep({ draft, onPick }: { draft: HostDraft; onPick: (hostPlays: boolean) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <ChoiceCard icon="person" title="I'm playing" hint="You take a spot, and the result counts towards your record." selected={draft.hostPlays} onPress={() => onPick(true)} />
      <ChoiceCard icon="edit" title="Just scoring" hint="You keep the score. It won't count towards your record." selected={!draft.hostPlays} onPress={() => onPick(false)} />
    </View>
  );
}

export function FormatStep({ draft, patch }: { draft: HostDraft; patch: Patch }) {
  if (draft.sport === 'cricket') {
    return (
      <>
        <Stepper
          title="Overs per innings"
          value={draft.maxOvers}
          min={1}
          max={50}
          presets={[5, 8, 10, 20]}
          onChange={(maxOvers) => patch({ maxOvers })}
          hint="Each team bats for this many overs."
        />
        <Stepper
          title="Players per team"
          value={draft.squadSize}
          min={2}
          max={11}
          presets={[4, 6, 8, 11]}
          onChange={(squadSize) => patch({ squadSize })}
          hint="Sets how many can bat. Everyone claims their spot with the match code."
        />
      </>
    );
  }
  return (
    <>
      <Segmented
        title="Format"
        options={[{ value: false, label: 'Singles', sub: '1 v 1' }, { value: true, label: 'Doubles', sub: '2 v 2' }]}
        value={draft.doubles}
        onChange={(doubles) => patch({ doubles })}
      />
      <Segmented
        title="Match length"
        options={([1, 3, 5] as const).map((n) => ({ value: n, label: BEST_OF[n].label }))}
        value={draft.bestOf}
        onChange={(bestOf) => patch({ bestOf })}
        hint={BEST_OF[draft.bestOf].hint}
      />
      <Segmented
        title="Points per game"
        options={([11, 15, 21] as const).map((n) => ({ value: n, label: String(n), sub: POINTS[n] }))}
        value={draft.pointsToWin}
        onChange={(pointsToWin) => patch({ pointsToWin })}
      />
    </>
  );
}

export function PlayersStep({ draft, patch, host }: { draft: HostDraft; patch: Patch; host: SlotDraft }) {
  const t = useTheme();
  const labels = sideLabels(draft.hostPlays);
  const auto = teamNames({ ...draft, teamNames: ['', ''] }, host);
  const setName = (i: 0 | 1) => (name: string) =>
    patch({ teamNames: i === 0 ? [name, draft.teamNames[1]] : [draft.teamNames[0], name] });

  if (draft.sport === 'cricket') {
    return (
      <>
        <TeamHeader side={labels[0]} auto={auto[0]} custom={draft.teamNames[0]} onCustom={setName(0)} alwaysOpen />
        <VsRule />
        <TeamHeader side={labels[1]} auto={auto[1]} custom={draft.teamNames[1]} onCustom={setName(1)} alwaysOpen />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, padding: 12, borderRadius: 5, backgroundColor: t.fillSoft }}>
          <Icon name="people" size={18} color={t.brandInk} />
          <Text style={{ ...body(t), flex: 1 }}>
            {`${draft.squadSize} spots a side${draft.hostPlays ? ', and you take the first one' : ''}. After you start, share the match code and everyone claims their own spot.`}
          </Text>
        </View>
      </>
    );
  }

  const [side1, side2] = activeSlots(draft, host);
  const picked = [...side1, ...side2].map((s) => s.playerId).filter((id): id is string => Boolean(id));
  const setSlot = (side: 'side1' | 'side2', i: 0 | 1) => (slot: SlotDraft) => {
    const next: [SlotDraft, SlotDraft] = [...draft[side]];
    next[i] = slot;
    patch(side === 'side1' ? { side1: next } : { side2: next });
  };
  const field = (side: 'side1' | 'side2', i: 0 | 1, placeholder: string) => (
    <PlayerField slot={draft[side][i]} placeholder={placeholder} exclude={picked} onChange={setSlot(side, i)} />
  );

  return (
    <>
      <TeamHeader side={labels[0]} auto={auto[0]} custom={draft.teamNames[0]} onCustom={setName(0)} />
      <View style={{ gap: 8 }}>
        {draft.hostPlays ? <PersonRow name={host.displayName} tag="You" /> : field('side1', 0, 'Player name')}
        {draft.doubles ? field('side1', 1, "Partner's name") : null}
      </View>
      <VsRule />
      <TeamHeader side={labels[1]} auto={auto[1]} custom={draft.teamNames[1]} onCustom={setName(1)} />
      <View style={{ gap: 8 }}>
        {field('side2', 0, draft.hostPlays ? "Opponent's name" : 'Player name')}
        {draft.doubles ? field('side2', 1, draft.hostPlays ? "Opponent's partner" : "Partner's name") : null}
      </View>
      <Text style={{ ...body(t), marginTop: 22 }}>
        Not on Kria? Just type their name — they can claim the spot later with the match code.
      </Text>
    </>
  );
}

export function ReviewStep({ draft, host, onEdit }: { draft: HostDraft; host: SlotDraft; onEdit: (step: number) => void }) {
  const t = useTheme();
  const [name1, name2] = teamNames(draft, host);
  const people = draft.sport === 'badminton' ? activeSlots(draft, host).map((side) => side.map((s) => s.displayName.trim()).join(' & ')) : null;
  const team = { fontFamily: 'Anton_400Regular' as const, fontSize: 32, lineHeight: 39, textTransform: 'uppercase' as const, color: t.text };

  const row = (title: string, value: string, step: number) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title.toLowerCase()}`}
      onPress={() => onEdit(step)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1.5, borderBottomColor: t.lineSoft }}
    >
      <Text style={{ ...label(t), width: 76 }}>{title}</Text>
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.textBody, paddingVertical: 8 }}>{value}</Text>
      <Icon name="edit" size={14} color={t.textFaint} />
    </Pressable>
  );

  return (
    <>
      <View style={{ borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, overflow: 'hidden' }}>
        <View style={{ height: 5, backgroundColor: t.brand }} />
        <View style={{ padding: 18 }}>
          <Text style={{ ...label(t), color: t.brandInk }}>{draft.sport}</Text>
          <Text numberOfLines={2} style={{ ...team, marginTop: 10 }}>{name1}</Text>
          {people && people[0] !== name1 ? <Text style={body(t)}>{people[0]}</Text> : null}
          <VsRule />
          <Text numberOfLines={2} style={team}>{name2}</Text>
          {people && people[1] !== name2 ? <Text style={body(t)}>{people[1]}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
            {formatChips(draft).map((chip) => <Tag key={chip} text={chip} tone="quiet" />)}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        {row('Sport', draft.sport === 'badminton' ? 'Badminton' : 'Cricket', 0)}
        {row('Your role', draft.hostPlays ? 'Playing — on your record' : 'Just scoring — off your record', 1)}
        {row('Format', formatChips(draft).join(' · '), 2)}
        {row(draft.sport === 'badminton' ? 'Players' : 'Teams', `${name1} v ${name2}`, 3)}
      </View>
    </>
  );
}
