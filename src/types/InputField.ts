interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: React.ReactElement;
  error?: string;
  register: any;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  rightAction?: React.ReactNode;
}