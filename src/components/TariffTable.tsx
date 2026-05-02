"use client";

import { useMemo } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { Tariff, TouPeriod } from "@/types";
import { formatCurrency } from "@/lib/utils";

type TariffTableRow = Tariff & {
  peakMultiplier: number;
  offPeakMultiplier: number;
};

interface TariffTableProps {
  tariffs: Tariff[];
  touPeriods: TouPeriod[];
  compact?: boolean;
}

export function TariffTable({ tariffs, touPeriods, compact = false }: TariffTableProps) {
  const rows = useMemo<TariffTableRow[]>(
    () =>
      tariffs.map((tariff) => {
        const periods = touPeriods.filter((period) => period.tariffId === tariff.id);
        const peakMultiplier = Math.max(...periods.map((p) => p.multiplier), 1);
        const offPeakMultiplier = Math.min(...periods.map((p) => p.multiplier), 1);
        return { ...tariff, peakMultiplier, offPeakMultiplier };
      }),
    [tariffs, touPeriods]
  );

  const columnHelper = createColumnHelper<TariffTableRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("providerName", {
        header: "Provider",
        cell: (info) => <span className="font-medium text-white">{info.getValue()}</span>
      }),
      columnHelper.accessor("ratePerKwh", {
        header: "Base Rate",
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor("peakStartTime", {
        header: "Peak Window",
        cell: (info) => `${info.getValue()} - ${info.row.original.peakEndTime}`
      }),
      columnHelper.accessor("peakMultiplier", {
        header: "Peak x",
        cell: (info) => <span className="text-rose-300">{info.getValue().toFixed(2)}x</span>
      }),
      columnHelper.accessor("offPeakMultiplier", {
        header: "Off-Peak x",
        cell: (info) => <span className="text-emerald-300">{info.getValue().toFixed(2)}x</span>
      })
    ],
    [columnHelper]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-brand text-base font-semibold text-white">Tariff Matrix</h3>
        <p className="text-sm text-slate-300">Compare provider baseline rates and TOU uplift exposure.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className={`px-4 ${compact ? "py-2" : "py-3"} font-medium`}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5 text-slate-100">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`px-4 ${compact ? "py-2" : "py-3"}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
