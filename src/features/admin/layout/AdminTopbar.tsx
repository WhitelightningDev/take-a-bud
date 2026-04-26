import type { View } from '../types'
import { downloadCsv, viewTitle } from '../utils'

type AdminTopbarProps = {
  view: View
  exportRows: Array<Record<string, string | number | boolean | null | undefined>>
}

export function AdminTopbar({ view, exportRows }: AdminTopbarProps) {
  return (
    <header className="mb-6 flex w-full min-w-0 flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
          Admin workspace
        </p>

        <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {viewTitle(view)}
        </h1>

        <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
          Admin-only controls for your catalog, users, stock, brands, and reporting.
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          type="button"
          onClick={() => {
            downloadCsv(`take-a-bud-export-${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
          }}
          disabled={!exportRows.length}
        >
          Export report
        </button>
      </div>
    </header>
  )
}