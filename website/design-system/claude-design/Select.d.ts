export interface RadioProps {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  id?: string;
  style?: React.CSSProperties;
}
