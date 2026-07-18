export interface ToastProps {
  open?: boolean;
  /** @default "info" */
  tone?: 'info' | 'success' | 'evidence' | 'danger';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
