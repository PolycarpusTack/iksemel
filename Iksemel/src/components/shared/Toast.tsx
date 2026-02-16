import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className={styles["container"]} aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`${styles["toast"]} ${styles[toast.variant] ?? ""}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

/**
 * Inline container for rendering toasts — rendered inside App
 * but toasts are managed by ToastProvider above the App.
 */
export function ToastContainer() {
  // Toasts render in the provider, this is a no-op placeholder
  // kept to make the App import explicit about toast support.
  return null;
}
