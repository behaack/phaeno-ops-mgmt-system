export interface IconButtonProps {
  /** Icon glyph name (see Icon component). */
  icon: string;
  /** Required accessible name — icon-only controls must expose a label. */
  label: string;
  /** @default "secondary" */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Square size in px; minimum interactive target enforced at 44px. @default 44 */
  size?: number;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
