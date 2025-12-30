import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal open={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onCancel}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Xác nhận
          </Button>
        </div>
      </div>
    </Modal>
  );
}