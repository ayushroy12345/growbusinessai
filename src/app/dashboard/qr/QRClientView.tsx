'use client';

import { useState } from 'react';
import { Download, Copy, Check, ExternalLink, Printer } from 'lucide-react';
import Link from 'next/link';

interface QRClientViewProps {
  businessName: string;
  businessSlug: string;
  qrDataUrl: string;
  targetUrl: string;
}

export function QRClientView({
  businessName,
  businessSlug,
  qrDataUrl,
  targetUrl,
}: QRClientViewProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${businessSlug}-loyalty-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Printable Standee Display Card */}
      <div
        id="printable-standee"
        className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-xl text-center space-y-6 relative overflow-hidden"
      >
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            Customer Loyalty & Rewards
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight pt-2">
            {businessName}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Scan with your phone camera to check in & unlock free perks!
          </p>
        </div>

        {/* QR Code Graphic */}
        <div className="p-4 bg-white inline-block rounded-3xl border-4 border-slate-900 shadow-md">
          <img
            src={qrDataUrl}
            alt={`${businessName} Loyalty QR Code`}
            className="w-64 h-64 mx-auto rounded-xl object-contain"
          />
        </div>

        <div className="space-y-1">
          <div className="font-mono text-xs font-semibold text-slate-400">
            {targetUrl}
          </div>
          <p className="text-[11px] text-slate-400">
            No app download required • Works directly in mobile browser
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download PNG (360x360)
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Standee
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied URL!' : 'Copy Link'}
          </button>

          <Link
            href={`/b/${businessSlug}`}
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            Open Page
          </Link>
        </div>
      </div>
    </div>
  );
}
