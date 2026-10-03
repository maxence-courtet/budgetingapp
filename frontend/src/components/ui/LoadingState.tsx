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
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm">{message}</p>
      </div>
    </div>
  );
}
