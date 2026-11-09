/*
  Nguyễn Quốc Hải - HE173133 - SE1990NJ
  9/11/2026
*/

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmationDialog, EmptyState, formatVnd } from '../shared/operation-ui';

const cashDenominations = [500_000, 200_000, 100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000];

export interface ShiftCounter {
  id: string;
  name: string;
}

export interface OpenShiftRequest {
  counterId: string;
  denominationCounts: Array<{ denominationVnd: number; quantity: number }>;
  totalOpeningFloatVnd: number;
  varianceReason: string | null;
}

export interface OpenShiftContext {
  isLoading: boolean;
  facilityName: string;
  counters: ShiftCounter[];
  previousShiftClosed: boolean;
  hasActiveShift: boolean;
  standardOpeningFloatVnd: number;
  onOpenShift?: (request: OpenShiftRequest) => Promise<void>;
  authorizeFloatVariance?: (varianceVnd: number, reason: string) => Promise<boolean>;
}

export function OpenWorkShift({ context }: { context?: OpenShiftContext }) {
  const [counterId, setCounterId] = useState('');
  const [counts, setCounts] = useState<Record<number, string>>(() => Object.fromEntries(cashDenominations.map((value) => [value, '0'])));
  const [varianceReason, setVarianceReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!context || context.isLoading) {
    return <EmptyState>{context?.isLoading ? 'Loading shift and counter status...' : 'Shift opening context is unavailable.'}</EmptyState>;
  }

  const parsedCounts = cashDenominations.map((denominationVnd) => ({
    denominationVnd,
    quantity: Number(counts[denominationVnd] ?? ''),
    raw: counts[denominationVnd] ?? '',
  }));
  const invalidCounts = parsedCounts.some(({ quantity, raw }) => raw.trim() === '' || !Number.isSafeInteger(quantity) || quantity < 0);
  const totalOpeningFloatVnd = invalidCounts ? 0 : parsedCounts.reduce((sum, item) => sum + item.denominationVnd * item.quantity, 0);
  const varianceVnd = totalOpeningFloatVnd - context.standardOpeningFloatVnd;
  const requiresManagerVerification = varianceVnd !== 0;
  const blocked = !context.previousShiftClosed || context.hasActiveShift || context.counters.length === 0;

  const openShift = async () => {
    if (!context.onOpenShift) {
      setErrorMessage('Shift opening is not connected.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (requiresManagerVerification) {
        if (!varianceReason.trim()) throw new Error('Enter a reason for the opening cash variance.');
        if (!context.authorizeFloatVariance || !(await context.authorizeFloatVariance(varianceVnd, varianceReason.trim()))) {
          throw new Error('Facility Manager verification was not completed.');
        }
      }
      await context.onOpenShift({
        counterId,
        denominationCounts: parsedCounts.map(({ denominationVnd, quantity }) => ({ denominationVnd, quantity })),
        totalOpeningFloatVnd,
        varianceReason: requiresManagerVerification ? varianceReason.trim() : null,
      });
      setSuccessMessage('Shift opened successfully.');
      setConfirming(false);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to open shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewOpening = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirming(true);
  };

  return (
    <section className="operation-panel" aria-labelledby="shift-title">
      <div className="operation-heading"><div><p className="operation-eyebrow">UC35 · Shift reconciliation</p><h2 id="shift-title">Open shift</h2></div><span className="operation-code">{context.facilityName}</span></div>
      {context.hasActiveShift && <p className="operation-alert" role="alert">An open shift already exists for this staff member or counter.</p>}
      {!context.previousShiftClosed && <p className="operation-alert" role="alert">The previous shift must be closed and reconciled first.</p>}
      {context.counters.length === 0 && <p className="operation-alert" role="alert">No active counter is available at this branch.</p>}
      {!blocked && <form onSubmit={reviewOpening}>
        <label className="operation-field">Counter
          <select required value={counterId} onChange={(event) => setCounterId(event.currentTarget.value)}>
            <option value="">Select counter</option>
            {context.counters.map((counter) => <option key={counter.id} value={counter.id}>{counter.name}</option>)}
          </select>
        </label>
        <div className="denomination-grid">
          {cashDenominations.map((denomination) => (
            <label className="operation-field" key={denomination}>
              <span>{formatVnd(denomination)}</span>
              <input type="number" min="0" step="1" inputMode="numeric" value={counts[denomination] ?? ''} onChange={(event) => setCounts((current) => ({ ...current, [denomination]: event.currentTarget.value }))} />
            </label>
          ))}
        </div>
        {invalidCounts && <p className="operation-error" role="alert">Denomination counts must be non-negative integers.</p>}
        <dl className="receipt-facts">
          <div><dt>Counted float</dt><dd>{formatVnd(totalOpeningFloatVnd)}</dd></div>
          <div><dt>Branch baseline</dt><dd>{formatVnd(context.standardOpeningFloatVnd)}</dd></div>
          <div><dt>Variance</dt><dd>{formatVnd(varianceVnd)}</dd></div>
        </dl>
        {requiresManagerVerification && <>
          <label className="operation-field">Variance explanation
            <textarea required minLength={1} value={varianceReason} onChange={(event) => setVarianceReason(event.currentTarget.value)} rows={3} />
          </label>
          <p className="operation-alert" role="status">Manager verification is required because the counted float differs from the branch baseline.</p>
        </>}
        <div className="workspace-actions"><button className="workspace-primary" type="submit" disabled={!counterId || invalidCounts || isSubmitting || !context.onOpenShift || (requiresManagerVerification && !varianceReason.trim())}>Review opening float</button></div>
      </form>}
      {errorMessage && <p className="operation-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="operation-success" role="status">{successMessage}</p>}
      {confirming && <ConfirmationDialog
        title="Confirm shift opening"
        description={`Open a shift at ${context.facilityName} with a starting float of ${formatVnd(totalOpeningFloatVnd)}?`}
        confirmLabel="Open shift"
        isSubmitting={isSubmitting}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void openShift()}
      />}
    </section>
  );
}