import { useEffect, useRef, useState } from 'react';
import { Search, QrCode, Camera, Keyboard } from 'lucide-react';
import { supabase, type Asset } from '@/lib/supabase';
import { type Page } from '@/App';
import { Button, Input, PageHeader } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  navigate: (p: Page) => void;
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector(): (new (opts?: { formats?: string[] }) => BarcodeDetectorLike) | null {
  const w = window as Window & { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike };
  return w.BarcodeDetector || null;
}

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

export default function ScanAssetPage({ navigate }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const openAsset = (asset: Asset) => {
    navigate({ name: 'asset-detail', id: asset.id });
  };

  const resolveCode = async (raw: string) => {
    const value = raw.trim();
    if (!value) {
      setError(t('scanEnterCode'));
      return;
    }
    setSearching(true);
    setError('');
    try {
      const byId = extractAssetId(value);
      if (byId) {
        const { data } = await supabase
          .from('assets')
          .select('id, name, asset_tag, status')
          .eq('id', byId)
          .maybeSingle();
        if (data) {
          openAsset(data as Asset);
          return;
        }
      }

      const tag = value.toUpperCase();
      const { data: byTag } = await supabase
        .from('assets')
        .select('id, name, asset_tag, status')
        .ilike('asset_tag', tag)
        .limit(1)
        .maybeSingle();
      if (byTag) {
        openAsset(byTag as Asset);
        return;
      }

      const { data: bySerial } = await supabase
        .from('assets')
        .select('id, name, asset_tag, status')
        .ilike('serial', value)
        .limit(1)
        .maybeSingle();
      if (bySerial) {
        openAsset(bySerial as Asset);
        return;
      }

      setError(t('assetNotFound'));
    } finally {
      setSearching(false);
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCameraError('');
    const Detector = getBarcodeDetector();
    if (!Detector) {
      setCameraError(t('scanCameraUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      await new Promise((r) => setTimeout(r, 50));
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ['qr_code', 'code_128', 'ean_13', 'code_39'] });
      scanningRef.current = true;

      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            const raw = codes.find((c) => c.rawValue)?.rawValue;
            if (raw) {
              stopCamera();
              await resolveCode(raw);
              return;
            }
          }
        } catch {
          /* keep scanning */
        }
        if (scanningRef.current) requestAnimationFrame(() => { void tick(); });
      };
      requestAnimationFrame(() => { void tick(); });
    } catch {
      setCameraError(t('scanCameraDenied'));
      stopCamera();
    }
  };

  useEffect(() => () => stopCamera(), []);

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
          <Button type="submit" className="w-full" disabled={searching || !query.trim()}>
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
            <Button type="button" variant="outline" className="w-full" onClick={() => { void startCamera(); }}>
              <Camera className="w-4 h-4" /> {t('scanStartCamera')}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-xl bg-black aspect-[3/4] sm:aspect-video">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 border-2 border-white/40 m-8 sm:m-12 rounded-lg pointer-events-none" />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={stopCamera}>
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
