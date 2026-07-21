export interface BadgeProps {
  children: React.ReactNode;
  /** @default "neutral" */
  tone?: 'neutral' | 'brand' | 'rna' | 'evidence' | 'danger';
  style?: React.CSSProperties;
}
