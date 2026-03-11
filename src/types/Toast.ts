export interface ToastProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}