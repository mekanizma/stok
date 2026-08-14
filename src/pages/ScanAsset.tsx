import { useEffect, useRef, useState } from 'react';
import { Search, QrCode, Camera, Keyboard } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { type Page } from '@/App';
import { Button, Input, PageHeader } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  navigate: (p: Page) => void;
  canAdd?: boolean;
}

const SCANNER_REGION_ID = 'asset-qr-reader';

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

function extractAssetId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const asUrl = new URL(text);
    const fromHash = asUrl.hash.match(/\/asset\/([^/?#]+)/i);
    if (fromHash?.[1]) return decodeURIComponent(fromHash[1]);
  } catch {
    /* not a URL */
  }
  const hashMatch = text.match(/#\/asset\/([^/?#]+)/i) || text.match(/\/asset\/([^/?#]+)/i);
  if (hashMatch?.[1]) return decodeURIComponent(hashMatch[1]);
  const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  if (uuid?.[0]) return uuid[0];
  return null;
}

function likeExact(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function findAssetId(value: string): Promise<string | null> {
  const byId = extractAssetId(value);
  if (byId) {
    const { data } = await supabase.from('assets').select('id').eq('id', byId).limit(1);
    if (data?.[0]?.id) return data[0].id;
  }

  const variants = Array.from(new Set([value, value.toUpperCase(), value.replace(/^0+/, '') || value]));
  for (const v of variants) {
    const exact = likeExact(v);
    const { data: byTag } = await supabase.from('assets').select('id').ilike('asset_tag', exact).limit(1);
    if (byTag?.[0]?.id) return byTag[0].id;
    const { data: bySerial } = await supabase.from('assets').select('id').ilike('serial', exact).limit(1);
    if (bySerial?.[0]?.id) return bySerial[0].id;
  }
  return null;
}

export default function ScanAssetPage({ navigate, canAdd = false }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

  const resolveCode = async (raw: string) => {
    const value = raw.trim();
    if (!value) {
      setError(t('scanEnterCode'));
      return;
    }
    setQuery(value);
    setSearching(true);
    setError('');
    try {
      const assetId = await findAssetId(value);
      if (assetId) {
        navigate({ name: 'asset-detail', id: assetId });
        return;
      }
      if (canAdd) {
        navigate({ name: 'assets', addCode: value });
        return;
      }
      setError(t('assetNotFound'));
    } finally {
      setSearching(false);
    }
  };

  const releaseScanner = async () => {
    handlingRef.current = false;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      /* already stopped */
    }
    try {
      scanner.clear();
    } catch {
      /* ignore */
    }
  };

  const stopCamera = async () => {
    await releaseScanner();
    setCameraOn(false);
    setCameraStarting(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('scanCameraUnavailable'));
      return;
    }

    await releaseScanner();
    setCameraOn(true);
    setCameraStarting(true);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const el = document.getElementById(SCANNER_REGION_ID);
    if (!el) {
      setCameraOn(false);
      setCameraStarting(false);
      setCameraError(t('scanCameraUnavailable'));
      return;
    }

    try {
      const scanner = new Html5Qrcode(SCANNER_REGION_ID, {
        formatsToSupport: BARCODE_FORMATS,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = scanner;

      const config = {
        fps: 16,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.max(220, Math.floor(Math.min(viewfinderWidth * 0.92, 420)));
          const height = Math.max(110, Math.floor(Math.min(viewfinderHeight * 0.38, width * 0.48)));
          return { width, height };
        },
        aspectRatio: window.innerWidth < 640 ? 1.333 : 1.777,
        disableFlip: false,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const onDecoded = (decodedText: string) => {
        if (handlingRef.current) return;
        handlingRef.current = true;
        try {
          navigator.vibrate?.(80);
        } catch {
          /* ignore */
        }
        void (async () => {
          await stopCamera();
          await resolveCode(decodedText);
        })();
      };

      try {
        await scanner.start({ facingMode: 'environment' }, config, onDecoded, () => undefined);
      } catch {
        const cams = await Html5Qrcode.getCameras();
        const back = cams.find((c) => /back|rear|environment|arka|world/i.test(c.label)) || cams[0];
        if (!back?.id) throw new Error('no camera');
        await scanner.start(back.id, config, onDecoded, () => undefined);
      }
      setCameraStarting(false);
    } catch (e) {
      await releaseScanner();
      setCameraOn(false);
      setCameraStarting(false);
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
      if (/permission|notallowed|denied|security/i.test(msg)) {
        setCameraError(t('scanCameraDenied'));
      } else if (/https|secure|only secure/i.test(msg)) {
        setCameraError(t('scanCameraNeedsHttps'));
      } else {
        setCameraError(t('scanCameraUnavailable'));
      }
    }
  };

  useEffect(() => () => {
    void releaseScanner();
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto">
      <PageHeader title={t('scanAsset')} description={t('scanAssetDesc')} />

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-700 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-600">{t('scanHint')}</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void resolveCode(query);
          }}
        >
          <Input
            label={t('scanCodeLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('scanCodePlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
          />
          <Button type="submit" className="w-full min-h-11" disabled={searching || !query.trim()}>
            <Search className="w-4 h-4" />
            {searching ? t('checking') : t('scanOpenAsset')}
          </Button>
        </form>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <Camera className="w-3.5 h-3.5" />
            {t('scanWithCamera')}
          </div>
          {!cameraOn ? (
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-11"
              onClick={() => { void startCamera(); }}
              disabled={cameraStarting}
            >
              <Camera className="w-4 h-4" /> {t('scanStartCamera')}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-xl bg-black min-h-[280px] sm:min-h-[320px]">
                <div
                  id={SCANNER_REGION_ID}
                  className="w-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-xl [&_img]:w-full"
                />
                {cameraStarting ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                    {t('checking')}
                  </div>
                ) : (
                  <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-center text-[11px] text-white/90 bg-black/45 rounded-lg px-2 py-1.5">
                    {t('scanCameraAlign')}
                  </p>
                )}
              </div>
              <Button type="button" variant="secondary" className="w-full min-h-11" onClick={() => { void stopCamera(); }}>
                {t('scanStopCamera')}
              </Button>
            </div>
          )}
          {cameraError ? <p className="text-sm text-amber-700">{cameraError}</p> : null}
          <p className="text-xs text-gray-400 flex items-start gap-1.5">
            <Keyboard className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {t('scanManualFallback')}
          </p>
        </div>

        {error ? <p className="text-sm text-red-600 text-center">{error}</p> : null}
      </div>

      <p className="mt-4 text-xs text-center text-gray-400">{t('scanLabelTip')}</p>
    </div>
  );
}
