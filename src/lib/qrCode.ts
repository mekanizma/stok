import QRCode from 'qrcode';

export async function qrDataUrl(text: string, size = 256): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}
