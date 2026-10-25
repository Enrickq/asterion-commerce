import { useEffect, useRef } from 'react';

/** Native modal dialogs provide focus containment and make the background inert. */
export default function AccessibleModal({ className = '', label, onClose, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const disposing = useRef(false);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    disposing.current = false;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const initial = dialog.querySelector('[data-dialog-initial-focus]') || dialog.querySelector('[autofocus]')
      || dialog.querySelector('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
    (initial || dialog).focus({ preventScroll: true });
    return () => {
      disposing.current = true;
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function requestClose() {
    if (!disposing.current) closeRef.current?.();
  }
  function closeOnBackdrop(event) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
  }
  return (
    <dialog ref={dialogRef} className={`modal accessible-modal ${className}`.trim()} aria-label={label}
      onCancel={event => { event.preventDefault(); requestClose(); }}
      onClose={() => { if (!dialogRef.current?.open) requestClose(); }} onClick={closeOnBackdrop} tabIndex={-1}>
      {children}
    </dialog>
  );
}
