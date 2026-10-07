interface Props {
  label?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDelete({ label = "Delete this item?", onConfirm, onCancel }: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-xs text-muted">{label}</span>
      <button
        onClick={onConfirm}
        className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
