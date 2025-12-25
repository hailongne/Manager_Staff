import React, { createContext, useState, useCallback } from 'react';
import { FlashMessage } from '../components/ui/FlashMessage';

interface ToastContextType {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  successMessage: string | null;
  showSuccess: boolean;
  errorMessage: string | null;
  showError: boolean;
  message: string | null;
  type: "success" | "error" | null;
  visible: boolean;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export { ToastContext };

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const showSuccessToast = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setErrorMessage(null);
    setShowError(false);

    // Tự động ẩn sau 5 giây
    const timer = setTimeout(() => {
      setShowSuccess(false);
      // Xóa message sau animation
      setTimeout(() => {
        setSuccessMessage(null);
      }, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    setErrorMessage(message);
    setShowError(true);
    setSuccessMessage(null);
    setShowSuccess(false);

    // Tự động ẩn sau 5 giây
    const timer = setTimeout(() => {
      setShowError(false);
      // Xóa message sau animation
      setTimeout(() => {
        setErrorMessage(null);
      }, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const clearAll = useCallback(() => {
    setSuccessMessage(null);
    setShowSuccess(false);
    setErrorMessage(null);
    setShowError(false);
  }, []);

  // Computed values for backward compatibility
  const message = successMessage || errorMessage;
  const type = successMessage ? "success" : errorMessage ? "error" : null;
  const visible = showSuccess || showError;

  const value: ToastContextType = {
    showSuccessToast,
    showErrorToast,
    successMessage,
    showSuccess,
    errorMessage,
    showError,
    message,
    type,
    visible,
    clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {successMessage && (
        <FlashMessage
          type="success"
          text={successMessage}
          position="toaster"
          visible={showSuccess}
        />
      )}
      {errorMessage && (
        <FlashMessage
          type="error"
          text={errorMessage}
          position="toaster"
          visible={showError}
        />
      )}
    </ToastContext.Provider>
  );
}