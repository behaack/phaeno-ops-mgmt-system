export interface ButtonProps {
  children: React.ReactNode;
  /** @default "primary" */
  variant?: 'primary' | 'secondary' | 'tertiary';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Optional trailing (or leading) icon name from the Icon glyph set. */
  icon?: string;
  /** @default "trailing" */
  iconPosition?: 'leading' | 'trailing';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  style?: React.CSSProperties;
}
