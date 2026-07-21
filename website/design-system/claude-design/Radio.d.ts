export interface InputProps {
  label?: string;
  placeholder?: string;
  /** Error message; sets aria-invalid and renders the message below the field. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'search';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  style?: React.CSSProperties;
}
