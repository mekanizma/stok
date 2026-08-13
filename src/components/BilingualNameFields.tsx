import { useRef, useState } from 'react';
import { Input } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { findEntityPair, resolveEntityPair } from '@/lib/entityI18n';

interface Props {
  nameTr: string;
  nameEn: string;
  onChange: (next: { nameTr: string; nameEn: string }) => void;
  required?: boolean;
  labelTr?: string;
  labelEn?: string;
}

/** Dual TR/EN name inputs with auto-fill of the other language. */
export function BilingualNameFields({ nameTr, nameEn, onChange, required = true, labelTr, labelEn }: Props) {
  const { t } = useI18n();
  const autoTr = useRef(!nameTr);
  const autoEn = useRef(!nameEn);
  const [hint, setHint] = useState('');

  const setTr = (value: string) => {
    const nextTr = value;
    let nextEn = nameEn;
    if (autoEn.current || !nameEn.trim()) {
      const pair = resolveEntityPair({ tr: nextTr });
      nextEn = pair.en;
      autoEn.current = true;
      setHint(nextTr.trim() && nextEn !== nextTr ? t('bilingualAutoFilled') : '');
    }
    autoTr.current = false;
    onChange({ nameTr: nextTr, nameEn: nextEn });
  };

  const setEn = (value: string) => {
    const nextEn = value;
    let nextTr = nameTr;
    if (autoTr.current || !nameTr.trim()) {
      const pair = resolveEntityPair({ en: nextEn });
      nextTr = pair.tr;
      autoTr.current = true;
      setHint(nextEn.trim() && nextTr !== nextEn ? t('bilingualAutoFilled') : '');
    }
    autoEn.current = false;
    onChange({ nameTr: nextTr, nameEn: nextEn });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label={`${labelTr || t('nameTr')}${required ? ' *' : ''}`}
          value={nameTr}
          onChange={(e) => setTr(e.target.value)}
          placeholder={t('placeholderNameTr')}
          required={required}
        />
        <Input
          label={`${labelEn || t('nameEn')}${required ? ' *' : ''}`}
          value={nameEn}
          onChange={(e) => setEn(e.target.value)}
          placeholder={t('placeholderNameEn')}
          required={required}
        />
      </div>
      <p className="text-xs text-gray-500">{hint || t('bilingualNameHint')}</p>
    </div>
  );
}

export function initialBilingualNames(existingName?: string | null) {
  if (!existingName?.trim()) return { nameTr: '', nameEn: '' };
  const known = findEntityPair(existingName);
  if (known) return { nameTr: known.tr, nameEn: known.en };
  const pair = resolveEntityPair({ source: existingName });
  return { nameTr: pair.tr, nameEn: pair.en };
}
