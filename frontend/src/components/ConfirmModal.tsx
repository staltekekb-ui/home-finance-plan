import { memo } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  danger = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="fixed inset-0" onClick={onCancel} />
      <div className="modal-content p-6">
        <h3 className="text-xl font-bold text-slate-700 mb-3">{title}</h3>
        <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ConfirmModal);
