'use client';

import { useState } from 'react';
import { BusinessCustomer } from '@/types';
import { Search, Filter, Users, Calendar, Phone } from 'lucide-react';

interface CustomersClientViewProps {
  customers: BusinessCustomer[];
  businessName: string;
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
      </div>

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
