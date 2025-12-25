import { FlashMessage } from "./FlashMessage";

// Component wrapper để dễ dàng thêm toast notification vào form modal
export interface ModalToastProps {
  message: string | null;
  type: "success" | "error" | "info" | "warning" | null;
  visible: boolean;
  onDismiss: () => void;
}

export function ModalToast({ message, type, visible, onDismiss }: ModalToastProps) {
  if (!message || !type) return null;
  
  return (
    <FlashMessage
      type={type}
      text={message}
      onClose={onDismiss}
      position="toaster"
      visible={visible}
    />
  );
}
