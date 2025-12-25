import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { changePassword, type ChangePasswordPayload } from "../../../../api/users";
import { useAuth } from "../../../../hooks/useAuth";
import { useModalToast } from "../../../../hooks/useToast";
import { FlashMessage } from "../../../../components/ui/FlashMessage";

// Kiểu dữ liệu form đổi mật khẩu
type FormState = ChangePasswordPayload;

// Form mặc định
const DEFAULT_FORM: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

// Trang đổi mật khẩu
export default function ChangePassword() {
  const { refreshUser } = useAuth();
  const toast = useModalToast();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [messageVisible, setMessageVisible] = useState(false);

  // Hiển thị thông báo, chờ một lúc, sau đó tự ẩn và xóa thông báo
  useEffect(() => {
    if (!message) return;
    setMessageVisible(true);
    const hideTimer = window.setTimeout(() => {
      setMessageVisible(false);
    }, 4200);
    const removeTimer = window.setTimeout(() => {
      setMessage(null);
    }, 4700);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, [message]);

  const dismissMessage = useCallback(() => {
    setMessageVisible(false);
    window.setTimeout(() => setMessage(null), 250);
  }, []);

  // Xử lý thay đổi input
  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // Xử lý submit form
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessageVisible(false);
    setMessage(null);

    if (!form.currentPassword.trim() || !form.newPassword.trim() || !form.confirmPassword.trim()) {
      const msg = "Vui lòng nhập đầy đủ thông tin.";
      setMessage({ type: "error", text: msg });
      toast.showErrorToast(msg);
      setSubmitting(false);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      const msg = "Mật khẩu mới và xác nhận không khớp.";
      setMessage({ type: "error", text: msg });
      toast.showErrorToast(msg);
      setSubmitting(false);
      return;
    }

    if (form.newPassword.length < 6) {
      const msg = "Mật khẩu mới phải có ít nhất 6 ký tự.";
      setMessage({ type: "error", text: msg });
      toast.showErrorToast(msg);
      setSubmitting(false);
      return;
    }

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      });
      await refreshUser();
      const successMsg = "Đã đổi mật khẩu thành công.";
      setMessage({ type: "success", text: successMsg });
      toast.showSuccessToast(successMsg);
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error(error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const text = axiosError.response?.data?.message || axiosError.message || "Không thể đổi mật khẩu.";
      setMessage({ type: "error", text });
      toast.showErrorToast(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6">

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-pink-600">Đổi mật khẩu</h1>
          <p className="text-sm text-gray-500">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
        </header>

        {message ? (
          <FlashMessage
            type={message.type}
            text={message.text}
            onClose={dismissMessage}
            position="toaster"
            visible={messageVisible}
          />
        ) : null}

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={handleChange("currentPassword")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={handleChange("newPassword")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-60"
              >
                {submitting ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        </section>
    </div>
  );
}
