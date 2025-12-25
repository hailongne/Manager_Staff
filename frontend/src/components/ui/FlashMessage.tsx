import classNames from "classnames";
import { createPortal } from "react-dom";

// Kiểu dữ liệu thông báo nhanh
export interface FlashMessageProps {
  type: "success" | "error" | "info" | "warning";
  text: string;
  onClose?: () => void;
  className?: string;
  position?: "inline" | "toaster";
  visible?: boolean;
}

// Các kiểu dáng theo loại thông báo
const toneStyles: Record<FlashMessageProps["type"], { container: string; indicator: string }> = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-700",
    indicator: "bg-emerald-400"
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-600",
    indicator: "bg-red-400"
  },
  info: {
    container: "border-sky-200 bg-sky-50 text-sky-700",
    indicator: "bg-sky-400"
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-700",
    indicator: "bg-amber-400"
  }
};

const TOASTER_ROOT_ID = "flash-message-toaster-root";

const ensureToasterRoot = () => {
  if (typeof document === "undefined") return null;
  let root = document.getElementById(TOASTER_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOASTER_ROOT_ID;
    document.body.appendChild(root);
  }
  if (!root.dataset.positioned) {
    root.className = "pointer-events-none fixed top-[80px] right-6 z-[9999] flex flex-col items-end gap-3";
    root.dataset.positioned = "true";
  }
  return root;
};

export function FlashMessage({
  type,
  text,
  onClose,
  className,
  position = "inline",
  visible = true
}: FlashMessageProps) {
  const tone = toneStyles[type];

  const content = (
    <div
      className={classNames(
        "relative flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg transition duration-300 ease-out",
        position === "toaster" && "w-full max-w-sm",
        tone.container,
        position === "toaster" && "pointer-events-auto",
        visible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0",
        className
      )}
      role={type === "error" ? "alert" : "status"}
    >
      <span className={classNames("mt-1 h-2 w-2 flex-shrink-0 rounded-full", tone.indicator)} aria-hidden="true" />
      <p className="flex-1 leading-5">{text}</p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="-m-1 rounded-md p-1 text-xs/none text-current opacity-75 transition hover:opacity-100"
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      ) : null}
    </div>
  );

  if (position === "toaster") {
    const root = ensureToasterRoot();
    if (!root) return null;
    return createPortal(content, root);
  }

  return content;
}
