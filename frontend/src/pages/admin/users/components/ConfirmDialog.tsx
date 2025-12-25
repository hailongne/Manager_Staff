import { useEffect } from "react";
import type { ConfirmDialogProps } from "../types";

export function ConfirmDialog({
  open,
  title,
  message,
  confirming,
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, confirming, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
      onClick={(event) => {
        if (event.target === event.currentTarget && !confirming) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={confirming}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              void onConfirm();
            }}
            disabled={confirming}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
          >
            {confirming ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}
