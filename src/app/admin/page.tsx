import { requireRole } from '@/lib/session';
import { getSuperAdminOverview } from '@/lib/db';
import { AdminClientView } from './AdminClientView';
import { ShieldAlert } from 'lucide-react';

export default async function AdminPage() {
  const admin = await requireRole(['SUPER_ADMIN']);
  const data = await getSuperAdminOverview();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>Platform Super Admin Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          System Overview & Audit
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor platform tenants, review audit logs, and moderate businesses.
        </p>
      </div>

      <AdminClientView
        businesses={data.businesses}
        customers={data.customers}
        recentVisits={data.recentVisits}
        recentEvents={data.recentEvents}
        auditLogs={data.auditLogs}
      />
    </div>
  );
}
