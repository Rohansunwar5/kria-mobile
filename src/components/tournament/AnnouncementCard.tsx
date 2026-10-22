import { StyleSheet, Text, View } from 'react-native';
import type { Announcement } from '@/api/profileApi';
import { Icon } from '@/components/ui/Icon';
import { colors, font, radius, space } from '@/constants/theme';
import { announcementTag, timeAgo } from '@/lib/tournamentView';

export function AnnouncementCard({ a, now }: { a: Announcement; now: Date }) {
  const tag = announcementTag(a);
  const tint = tag.tone === 'accent' ? colors.accent : colors.text2;
  return (
    <View style={s.card}>
      <View style={s.tag}>
        {a.pinned ? <Icon name="push_pin" size={14} color={tint} /> : null}
        <Text style={[s.tagText, { color: tint }]}>{tag.text}</Text>
      </View>
      {a.title ? <Text style={s.title}>{a.title}</Text> : null}
      <Text style={s.message}>{a.message}</Text>
      <Text style={s.meta}>{a.authorName} · {timeAgo(a.createdAt, now)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface1, borderRadius: radius.card, padding: space.cardInner, gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontFamily: font.semibold, fontSize: 12 },
  title: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  message: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.text2 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
