import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
      <button type="button" className="btn-secondary" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>
      <p className="text-sm text-slate-600">{`Page ${page} of ${totalPages}`}</p>
      <button type="button" className="btn-secondary" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
