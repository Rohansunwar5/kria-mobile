export interface MotivationOption {
  key: string;
  label: string;
}

export const MOTIVATIONS: MotivationOption[] = [
  { key: 'winning', label: 'Winning tournaments' },
  { key: 'drafted', label: 'Getting drafted' },
  { key: 'teammates', label: 'Finding teammates' },
  { key: 'performance', label: 'Tracking performance' },
  { key: 'rankings', label: 'Climbing rankings' },
  { key: 'awards', label: 'Earning awards' },
];
