interface Props {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center py-20"
    >
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm">{message}</p>
      </div>
    </div>
  );
}
