export interface IconProps {
  /** Glyph name — see Icon.ICON_NAMES for the full curated list (Lucide-derived, stroke-based). */
  name: string;
  /** Pixel size (square). @default 20 */
  size?: number;
  /** Stroke width. @default 2 */
  strokeWidth?: number;
  /** Stroke color — defaults to currentColor so it inherits text color. */
  color?: string;
  style?: React.CSSProperties;
}
