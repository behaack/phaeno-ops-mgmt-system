export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Footer action buttons, typically <Button> elements. */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}
