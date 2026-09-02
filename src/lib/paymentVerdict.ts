export type VerdictKind = 'success' | 'failure' | 'refunded' | 'pending';

export interface Verdict {
  kind: VerdictKind;
  /** Settled orders stop the poll. */
  settled: boolean;
  title: string;
  message: string;
  tag: string;
}

/**
 * Server statuses are created | paid | failed | refunded. Anything else is
 * treated as pending, never as failure — telling a player their payment failed
 * when we simply do not recognise the status is the worse error.
 */
export function paymentVerdict(status: string): Verdict {
  switch (status) {
    case 'paid':
      return {
        kind: 'success',
        settled: true,
        tag: 'Paid',
        title: "You're in",
        message: 'Payment cleared and your slot is held. The organiser approves entries before the draw.',
      };
    case 'failed':
      return {
        kind: 'failure',
        settled: true,
        tag: 'Failed',
        title: "Didn't go through",
        message: 'Nothing was charged, and your slot is still held. Try again below.',
      };
    case 'refunded':
      return {
        kind: 'refunded',
        settled: true,
        tag: 'Refunded',
        title: 'Refunded',
        message: 'This entry was refunded. It can take a few working days to reach your account.',
      };
    default:
      return {
        kind: 'pending',
        settled: false,
        tag: 'Pending',
        title: 'Still confirming',
        message: 'Waiting on the gateway. This resolves itself here without a second charge.',
      };
  }
}
