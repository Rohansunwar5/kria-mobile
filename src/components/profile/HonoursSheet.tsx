import { useState } from 'react';
import { ScrollView } from 'react-native';
import { AwardGrid } from '@/components/awards/AwardGrid';
import { AwardDetail } from '@/components/awards/AwardSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { Award } from '@/lib/awardsView';

/** "+N more" on another player's profile: every honour, knockout win and title; a badge opens its detail in place. */
export function HonoursSheet({ open, onClose, awards }: { open: boolean; onClose: () => void; awards: Award[] }) {
  const [detail, setDetail] = useState<Award | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  // Each open starts on the grid; reset here, not on close, so the closing sheet doesn't jump back.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDetail(null);
  }
  return (
    <BottomSheet open={open} onClose={onClose} title={detail ? undefined : 'Honours and titles'}>
      {detail ? (
        <AwardDetail award={detail} onDone={() => setDetail(null)} />
      ) : (
        <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
          <AwardGrid items={awards} size={88} columns={3} onOpen={setDetail} />
        </ScrollView>
      )}
    </BottomSheet>
  );
}
