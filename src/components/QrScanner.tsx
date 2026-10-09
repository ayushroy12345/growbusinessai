'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { QrCode, X, ScanLine } from 'lucide-react';

interface QrScannerProps {
  label?: string;
  className?: string;
}

export function QrScanner({ label = 'Scan a QR code', className = '' }: QrScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => () => stop(), []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotFound(false);
    setScanning(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available here. Use a secure (HTTPS) connection or try a phone.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setScanning(true);
        rafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        setError('Could not access your camera. Allow camera permission and try again.');
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function extractTarget(data: string): string | null {
    const trimmed = data.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        if (url.pathname.startsWith('/b/')) return url.pathname;
      } catch {
        return null;
      }
    } else if (trimmed.startsWith('/b/')) {
      return trimmed.split(/[?#]/)[0];
    } else if (/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
      return `/b/${trimmed}`;
    }
    return null;
  }

  function scanLoop() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !streamRef.current) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });

    if (code && code.data) {
      const target = extractTarget(code.data);
      if (target) {
        stop();
        setScanning(false);
        setOpen(false);
        router.push(target);
        return;
      }
      if (!notFound) {
        setNotFound(true);
        setTimeout(() => setNotFound(false), 2500);
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition ${className}`}
      >
        <QrCode className="w-4 h-4" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Scan a store QR code</h3>
              <button
                type="button"
                onClick={() => {
                  stop();
                  setOpen(false);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="Close scanner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-square bg-black overflow-hidden">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              {!scanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                  <div className="w-10 h-10 border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-2xl border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                <ScanLine className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-52 text-emerald-300/70 animate-pulse" />
              </div>
            </div>

            <div className="px-5 py-4 space-y-2">
              <p className="text-xs text-slate-500 text-center">
                Point your camera at the QR code at the shop. You&apos;ll jump straight to that store&apos;s
                card to request your stamp.
              </p>
              {error && (
                <p className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 text-center">
                  {error}
                </p>
              )}
              {notFound && !error && (
                <p className="p-3 bg-amber-50 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 text-center">
                  Not a Grow Business QR code. Try another.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}