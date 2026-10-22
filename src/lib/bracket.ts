/** Data-neutral bracket shapes: each caller (knockout room, tournament) maps its own data into these. */
export interface BracketScore { v: string; strong: boolean }
export interface BracketRow { name: string; sub?: string; scores: BracketScore[]; won: boolean; lost: boolean; open: boolean }
export interface BracketCard { id: string; header?: string; live: boolean; mine: boolean; openId?: string; rows: [BracketRow, BracketRow] }
export interface BracketColumn { title: string; cards: BracketCard[] }
