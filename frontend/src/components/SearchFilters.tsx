import { RotateCcw, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { DEFAULT_FILTERS, SORT_OPTIONS, validatePriceRange, type FilterState } from '../lib/filters';

interface SearchFiltersProps {
  filters: FilterState;
  categories: string[];
  onApply: (filters: FilterState) => void;
  onReset: () => void;
}

export default function SearchFilters({ filters, categories, onApply, onReset }: SearchFiltersProps) {
  const [draft, setDraft] = useState<FilterState>(filters);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Keep the form in sync when the parent changes filters (Reset / Clear filters).
  useEffect(() => {
    setDraft(filters);
    setPriceError(null);
  }, [filters]);

  function apply(next: FilterState) {
    const problem = validatePriceRange(next);
    setPriceError(problem);
    if (!problem) onApply(next);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    apply(draft);
  }

  // Selects and the checkbox are "pick one" controls, so they apply immediately; text/number fields wait for Search.
  function pick<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    apply(next);
  }

  const text = (key: 'make' | 'model' | 'minPrice' | 'maxPrice') => ({ value: draft[key], onChange: (e: { target: { value: string } }) => setDraft({ ...draft, [key]: e.target.value }) });

  return (
    <form role="search" aria-label="Filter vehicles" onSubmit={submit} noValidate className="card space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="f-make" className="label">
            Search make
          </label>
          <input id="f-make" type="search" placeholder="Toyota, Ford, Tesla..." className="input" {...text('make')} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </button>
          <button type="button" className="btn-secondary" onClick={() => onReset()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>
          <label htmlFor="f-model" className="label">
            Model
          </label>
          <input id="f-model" type="text" className="input" {...text('model')} />
        </div>
        <div>
          <label htmlFor="f-category" className="label">
            Category
          </label>
          <select id="f-category" className="input" value={draft.category} onChange={(e) => pick('category', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-min" className="label">
            Min price
          </label>
          <input id="f-min" type="number" inputMode="decimal" min={0} placeholder="0" className="input" aria-invalid={priceError ? true : undefined} {...text('minPrice')} />
        </div>
        <div>
          <label htmlFor="f-max" className="label">
            Max price
          </label>
          <input id="f-max" type="number" inputMode="decimal" min={0} placeholder="Any" className="input" aria-invalid={priceError ? true : undefined} {...text('maxPrice')} />
        </div>
        <div>
          <label htmlFor="f-sort" className="label">
            Sort by
          </label>
          <select id="f-sort" className="input" value={draft.sort} onChange={(e) => pick('sort', e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {priceError ? <p className="text-sm text-red-700">{priceError}</p> : null}

      <label className="flex w-fit items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-petrol-600" checked={draft.includeSoldOut} onChange={(e) => pick('includeSoldOut', e.target.checked)} />
        Include sold out
      </label>
    </form>
  );
}

export { DEFAULT_FILTERS };
