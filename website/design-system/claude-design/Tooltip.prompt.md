export interface TooltipProps {
  children: React.ReactNode;
  label: string;
  /** @default "top" */
  side?: 'top' | 'bottom' | 'left' | 'right';
  style?: React.CSSProperties;
}
