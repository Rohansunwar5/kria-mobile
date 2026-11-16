/** A player's honour, as the server's player.model honorSchema stores it. Badge names and art: HONOUR_BADGES in lib/awardsView.ts. */
export interface Honor {
  title: string; badge: string;
  /** The quick knockout that gave it. */
  ref?: string;
  /** Where and when it was earned (SERVER-GAPS #8): an organiser honour's tournament, or a knockout's name and sport. */
  tournamentId?: string; eventName?: string; sport?: string; awardedAt?: string;
}
