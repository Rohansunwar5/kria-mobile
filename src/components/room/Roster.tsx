import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { QuickMatch } from '@/api/quickMatch';
import { Icon } from '@/components/ui/Icon';
import { colors, display, font } from '@/constants/theme';
import { roster, waitingNote } from '@/lib/roomView';

/** Copy with a short "Copied" acknowledgement. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : `${label} join code`}
      onPress={() => Clipboard.setStringAsync(text).then(() => setCopied(true), () => undefined)}
      style={s.copy}
    >
      <Icon name={copied ? 'check' : 'content_copy'} size={17} />
      <Text style={s.copyText}>{copied ? 'Copied' : label}</Text>
    </Pressable>
  );
}

/** The join code, large, with Copy. Shown only where the server sent the code. */
export function CodeCard({ code }: { code: string }) {
  return (
    <View style={s.codeCard}>
      <View style={{ gap: 2 }}>
        <Text style={s.codeLabel}>Join code</Text>
        <Text style={s.code} accessibilityLabel={`Join code ${code.split('').join(' ')}`}>{code}</Text>
      </View>
      <CopyButton text={code} />
    </View>
  );
}

/** Mock 1e, waiting room: the code, both sides' spots, and what starting now means. */
export function Roster({ match, meId, busy, onRemove }: {
  match: QuickMatch;
  meId: string;
  busy: boolean;
  onRemove: (playerId: string) => void;
}) {
  return (
    <View style={{ gap: 44, paddingTop: 32 }}>
      {/* The server sends the code only to the host and claimed players. */}
      {match.joinCode ? <CodeCard code={match.joinCode} /> : null}

      {roster(match, meId).map((side) => (
        <View key={side.key} style={{ gap: 2 }}>
          <View style={s.sideHead}>
            <Text style={display(20)}>{side.name}</Text>
            <Text style={s.count}>{side.count}</Text>
          </View>
          {side.slots.map((slot) => (
            <View key={slot.key} style={s.slot}>
              <View style={[s.avatar, slot.claimed ? s.claimed : s.open]}>
                <Text style={[s.initials, { color: slot.claimed ? colors.text : colors.text4 }]}>{slot.initials}</Text>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[s.name, { color: slot.claimed ? colors.text : colors.text2 }]}>{slot.name}</Text>
                <Text style={s.sub}>{slot.sub}</Text>
              </View>
              {slot.removable && slot.playerId ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${slot.name}`}
                  disabled={busy}
                  onPress={() => onRemove(slot.playerId!)}
                  style={s.remove}
                >
                  <Icon name="close" size={20} color={colors.text4} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ))}

      <View style={s.note}>
        <Icon name="info" size={16} color={colors.text3} />
        <Text style={s.noteText}>{waitingNote(match, meId)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  copy: { height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  codeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.surface1 },
  codeLabel: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  code: { fontFamily: font.mono, fontSize: 26, letterSpacing: 3.6, color: colors.text },
  sideHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 14 },
  count: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  claimed: { backgroundColor: colors.surface3 },
  open: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ring },
  initials: { fontFamily: font.semibold, fontSize: 12 },
  name: { fontFamily: font.semibold, fontSize: 15 },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: colors.text3 },
});
