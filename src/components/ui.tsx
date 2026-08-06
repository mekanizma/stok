import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { type AssetStatus } from '@/lib/supabase';
import { useI18n, type TranslationKey } from '@/lib/i18n';

// ---- Status Badge ----
const STATUS_CONFIG: Record<AssetStatus, { bg: string; text: string; dot: string; key: TranslationKey }> = {
  ready: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', key: 'ready' },
  deployed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', key: 'deployed' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', key: 'pending' },
  broken: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', key: 'broken' },
  lost: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', key: 'lost' },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const { t } = useI18n();
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {t(cfg.key)}
    </span>
  );
}

export const STATUS_OPTIONS: AssetStatus[] = ['ready', 'deployed', 'pending', 'broken', 'lost'];

// ---- Button ----
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  };
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- Modal ----
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white rounded-xl shadow-xl animate-scale-in max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

// ---- Input ----
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block mb-1.5 text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block mb-1.5 text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block mb-1.5 text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

// ---- Empty State ----
export function EmptyState({ icon: Icon, title, description, action }: { icon: typeof X; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ---- Confirm Dialog ----
export function ConfirmDialog({ open, onClose, onConfirm, title, message }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>{t('delete')}</Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}

// ---- Page Header ----
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Avatar ----
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  const colors = ['bg-brand-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600', 'bg-cyan-600', 'bg-orange-600'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <div className={`flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${sizes[size]} ${colors[colorIndex]}`}>
      {initials || '?'}
    </div>
  );
}
