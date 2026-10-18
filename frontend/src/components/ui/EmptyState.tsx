interface Props {
  message: string;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({ message, cta }: Props) {
  return (
    <div className="border border-dashed border-line-strong rounded-2xl p-8 text-center">
      <p className="text-muted text-sm">{message}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-3 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
