interface Props {
  message: string;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({ message, cta }: Props) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8 text-center">
      <p className="text-slate-500 text-sm">{message}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
