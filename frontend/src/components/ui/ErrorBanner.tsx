interface Props {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between"
    >
      <span className="text-sm">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="ml-4 text-red-500 hover:text-red-700 text-sm font-medium shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
