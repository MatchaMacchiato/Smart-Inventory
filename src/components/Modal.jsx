import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Universal Portal Modal component.
 * Renders directly into document.body to escape any CSS transformed ancestors (e.g. Framer Motion page-anim),
 * ensuring the modal is always centered in the current viewport with backdrop blur and body scroll lock.
 */
export default function Modal({
  isOpen = true,
  onClose,
  size = "md", // 'sm' | 'md' | 'lg' | 'xl'
  maxWidth,
  children,
  className = "",
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size ? `modal-${size}` : "modal-md";

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-flexible ${sizeClass} ${className}`.trim()}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
