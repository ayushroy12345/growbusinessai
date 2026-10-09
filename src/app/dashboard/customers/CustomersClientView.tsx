'use client';

import { useState } from 'react';
import { BusinessCustomer } from '@/types';
import { Search, Filter, Download } from 'lucide-react';

interface CustomersClientViewProps {
  customers: BusinessCustomer[];
  businessName: string;
}

function formatDate(value: string) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function exportRowsToCsv(rows: BusinessCustomer[], businessName: string) {
  const headers = [
    'Name',
    'Phone',
    'Total Visits',
    'Total Spend',
    'Points Balance',
    'First Visit',
    'Last Visit',
    'Status',
  ];

  const escape = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.map(escape).join(',')];
  for (const bc of rows) {
    lines.push(
      [
        bc.customer_profile?.full_name || 'Anonymous Customer',
        bc.customer_profile?.phone || '',
        bc.total_visits,
        bc.total_spend || 0,
        bc.current_points_balance || 0,
        formatDate(bc.first_visit_at),
        formatDate(bc.last_visit_at),
        bc.status,
      ]
        .map(escape)
        .join(',')
    );
  }

  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const safeName = businessName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'business';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_customers_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CustomersClientView({ customers, businessName }: CustomersClientViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'REPEAT' | 'NEW'>('ALL');

  const filtered = customers.filter((bc) => {
    const nameMatch =
      bc.customer_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bc.customer_profile?.phone?.includes(searchTerm);

    if (!nameMatch) return false;

    if (filterType === 'REPEAT') return bc.total_visits > 1;
    if (filterType === 'NEW') return bc.total_visits === 1;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Customers ({customers.length})</option>
            <option value="REPEAT">Repeat Customers (&gt;1 visit)</option>
            <option value="NEW">New Customers (1 visit)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => exportRowsToCsv(filtered, businessName)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Download className="w-4 h-4" />
          Download CSV ({filtered.length})
        </button>
      </div>

      <p className="text-[11px] text-slate-400 -mt-3">
        Exports the currently filtered customers as a CSV file that opens in Excel and Google Sheets.
      </p>

      {/* Customer Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No customer relationships found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Total Visits</th>
                  <th className="py-3.5 px-6">First Visit</th>
                  <th className="py-3.5 px-6">Last Visit</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((bc) => (
                  <tr key={bc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {bc.customer_profile?.full_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div>{bc.customer_profile?.full_name || 'Anonymous Customer'}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          ID: {bc.customer_id.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      {bc.customer_profile?.phone || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          bc.total_visits > 1
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {bc.total_visits} {bc.total_visits === 1 ? 'visit' : 'visits'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(bc.first_visit_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(bc.last_visit_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {bc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
