import { X } from 'lucide-react';

interface ActiveFilterProps {
  filter: string;
  onClear: () => void;
}

export function ActiveFilter({ filter, onClear }: ActiveFilterProps) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full">
        <span className="text-lg">Showing: {filter}</span>
        <button
          onClick={onClear}
          className="hover:bg-blue-100 rounded-full p-1 transition-colors"
          aria-label="Clear filter"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}