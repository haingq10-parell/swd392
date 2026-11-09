/*
  Nguyễn Quốc Hải - HE173133 - SE1990NJ
  9/11/2026
*/

import type { ReactNode } from 'react';

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="workspace-empty" role="status">{children}</p>;
}

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="workspace-backdrop">
      <section className="workspace-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="workspace-actions">
          <button type="button" disabled={isSubmitting} onClick={onCancel}>Cancel</button>
          <button className="workspace-primary" type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export const formatVnd = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));