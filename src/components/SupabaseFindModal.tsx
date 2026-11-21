import React, { useEffect, useMemo, useRef, useState } from 'react';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface FindModalColumn<T = any> {
  header: string;
  accessor: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  widthClass?: string;
  mono?: boolean;
  bold?: boolean;
}

interface SupabaseFindModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string;
  rows: T[];
  columns: FindModalColumn<T>[];
  getRowId: (row: T) => string;
  getSearchValues: (row: T) => (string | number | boolean | null | undefined)[];
  selectedId?: string;
  onSelectRow: (row: T, currentQuery: string) => void;
  onSearchSupabase?: (query: string) => Promise<T[] | null | void>;
  onRefreshSupabase?: () => Promise<T[] | null | void>;
  initialQuery?: string;
  placeholder?: string;
  isBusy?: boolean;
}

export function SupabaseFindModal<T = any>({
  isOpen,
  onClose,
  tableLabel,
  rows,
  columns,
  getRowId,
  getSearchValues,
  selectedId,
  onSelectRow,
  onSearchSupabase,
  onRefreshSupabase,
  initialQuery = '',
  placeholder = 'Cari Kode atau kata kunci di seluruh kolom...',
  isBusy = false,
}: SupabaseFindModalProps<T>) {
  const [query, setQuery] = useState(initialQuery);
  const [localBusy, setLocalBusy] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialQuery || '');
    setStatusNote(null);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
    return () => clearTimeout(t);
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesMultiKeyword(getSearchValues(row), query)),
    [rows, getSearchValues, query]
  );

  if (!isOpen) return null;

  const busy = isBusy || localBusy;

  const handleSearchClick = async () => {
    if (onSearchSupabase) {
      try {
        setLocalBusy(true);
        const res = await onSearchSupabase(query);
        if (Array.isArray(res)) {
          setStatusNote(`Hasil live Supabase: ${res.length} baris ditemukan.`);
        }
      } finally {
        setLocalBusy(false);
      }
    }
  };

  const handleRefreshClick = async () => {
    setQuery('');
    setStatusNote(null);
    if (onRefreshSupabase) {
      try {
        setLocalBusy(true);
        const res = await onRefreshSupabase();
        if (Array.isArray(res)) {
          setStatusNote(`Data di-refresh (${res.length} baris).`);
        }
      } finally {
        setLocalBusy(false);
      }
    } else if (onSearchSupabase) {
      try {
        setLocalBusy(true);
        await onSearchSupabase('');
      } finally {
        setLocalBusy(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 font-sans select-none">
      <div className="bg-[#ECE9D8] border-2 border-[#000084] shadow-2xl w-[880px] max-w-[96vw] max-h-[85vh] flex flex-col text-xs text-black">
        <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold shrink-0">
          <span>Cari &amp; Daftar {tableLabel} (Supabase)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-1.5 bg-[#C00000] hover:bg-[#E81123] text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 space-y-2 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Cari :</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchClick();
                }
              }}
              placeholder={placeholder}
              className="flex-1 h-[24px] px-2 bg-white border border-[#7F9DB9] outline-none focus:border-[#316AC5]"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleSearchClick}
              className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Mencari...' : 'Cari'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleRefreshClick}
              className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="flex-1 min-h-[240px] overflow-auto bg-white border border-[#7F9DB9]">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-2 py-1 border-r border-[#ACA899] font-bold ${
                        col.widthClass || ''
                      } ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data {tableLabel} yang cocok
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIdx) => {
                    const rowId = getRowId(row);
                    const isSelected = selectedId === rowId;
                    return (
                      <tr
                        key={rowId || rowIdx}
                        onClick={() => {
                          onSelectRow(row, query);
                          onClose();
                        }}
                        className={`cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white ${
                          isSelected ? 'bg-[#FFFF99]' : ''
                        }`}
                      >
                        {columns.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            className={`px-2 py-1 border-r border-[#E0E0E0] ${
                              col.mono ? 'font-mono' : ''
                            } ${col.bold ? 'font-bold' : ''} ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {col.accessor(row, rowIdx)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-1 gap-2">
            <span className="text-[11px] text-[#555] truncate">
              {statusNote
                ? `${statusNote} `
                : ''}
              Menampilkan {filteredRows.length} dari {rows.length} {tableLabel}. Klik baris untuk memilih record.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
