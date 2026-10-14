/**
 * Reusable Accessible Modal Dialog Component
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, description, children, footer, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-darkgreen/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl border border-themeborder transition-all sm:my-8 w-full ${maxWidth}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-themeborder/60">
            <div>
              {title && (
                <h3 className="text-lg font-semibold leading-6 text-darkgreen" id="modal-headline">
                  {title}
                </h3>
              )}
              {description && <p className="text-xs text-darkgreen-muted mt-1">{description}</p>}
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-darkgreen-muted hover:text-darkgreen hover:bg-palesage/50 transition-colors"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4">{children}</div>

          {footer && (
            <div className="px-6 py-3.5 bg-ivory/60 border-t border-themeborder/60 flex items-center justify-end space-x-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
