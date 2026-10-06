'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Business, CustomerProfile, Visit, AnalyticsEvent, AuditLog } from '@/types';
import { toggleBusinessStatusAction } from '@/actions/admin';
import {
  ShieldAlert,
  Building2,
  Users,
  Activity,
  History,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface AdminClientViewProps {
  businesses: Business[];
  customers: CustomerProfile[];
  recentVisits: Visit[];
  recentEvents: AnalyticsEvent[];
  auditLogs: AuditLog[];
}

export function AdminClientView({
  businesses,
  customers,
  recentVisits,
  recentEvents,
  auditLogs,
}: AdminClientViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'businesses' | 'customers' | 'events' | 'audit'>('businesses');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  function handleToggleStatus(businessId: string, currentStatus: boolean) {
    startTransition(async () => {
      await toggleBusinessStatusAction(businessId, !currentStatus);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`pb-3 flex items-center gap-1.5 transition ${
            activeTab === 'businesses'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Businesses ({businesses.length})
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-3 flex items-center gap-1.5 transition ${
            activeTab === 'customers'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Global Customers ({customers.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 flex items-center gap-1.5 transition ${
            activeTab === 'events'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Platform Events ({recentEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-1.5 transition ${
            activeTab === 'audit'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Businesses */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search businesses by name or slug..."
              className="w-full text-xs pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-6">Business</th>
                  <th className="py-3 px-6">Slug</th>
                  <th className="py-3 px-6">Owner ID</th>
                  <th className="py-3 px-6">Created</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-bold text-slate-900">{b.name}</td>
                    <td className="py-4 px-6 font-mono text-slate-600">/b/{b.slug}</td>
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                      {b.owner_id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          b.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(b.id, b.is_active)}
                        disabled={isPending}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                          b.is_active
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {b.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <Link
                        href={`/b/${b.slug}`}
                        target="_blank"
                        className="inline-block p-1 text-slate-400 hover:text-indigo-600 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 inline" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Global Customers */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-6">Customer Name</th>
                <th className="py-3 px-6">Universal Customer ID</th>
                <th className="py-3 px-6">Phone (Masked)</th>
                <th className="py-3 px-6">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{c.full_name}</td>
                  <td className="py-4 px-6 font-mono text-[11px] text-slate-500">{c.id}</td>
                  <td className="py-4 px-6 text-slate-600">
                    {c.phone.slice(0, 3)}****{c.phone.slice(-3)}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Events */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {recentEvents.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                    {e.event_type}
                  </span>
                  <span className="text-slate-400 ml-2 font-mono text-[10px]">
                    business: {e.business_id?.substring(0, 8) || 'GLOBAL'}
                  </span>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      {JSON.stringify(e.metadata)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-indigo-700 font-mono text-[11px] bg-indigo-50 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-slate-600 font-semibold">{log.entity_type}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  User ID: {log.user_id ? log.user_id.substring(0, 8) : 'SYSTEM'} • Business:{' '}
                  {log.business_id ? log.business_id.substring(0, 8) : 'PLATFORM'}
                </div>
                {log.new_data && (
                  <pre className="text-[10px] bg-slate-50 p-2 rounded-lg text-slate-600 font-mono overflow-x-auto">
                    {JSON.stringify(log.new_data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
