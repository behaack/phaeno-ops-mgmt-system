export interface TagProps {
  children: React.ReactNode;
  /** Selected/active filter state. */
  selected?: boolean;
  /** Shows a remove (x) affordance when provided. */
  onRemove?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}
