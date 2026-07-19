import Modal from './Modal';
import Button from './Button';

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title = 'Delete this item?', description, isLoading, confirmLabel = 'Delete' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-body">
        {description || 'This action cannot be undone. Are you sure you want to continue?'}
      </p>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
