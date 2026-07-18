export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled active value; omit for uncontrolled (defaults to first item). */
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
