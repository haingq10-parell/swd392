/*
  Nguyễn Quốc Hải - HE173133 - SE1990NJ
  9/11/2026
*/

import { useState } from 'react';
import './CorrectBookingCharges.css';

export type BookingChargeStatus =
  | 'ACTIVE'
  | 'PENDING_CHECKOUT'
  | 'PAID'
  | 'COMPLETED';

export interface BookingChargeLine {
  id: string;
  description: string;
  amountVnd: number;
}

export interface ChargeCorrectionLine {
  lineId: string;
  previousAmountVnd: number;
  correctedAmountVnd: number;
}

export interface CorrectBookingChargesRequest {
  bookingId: string;
  rationale: string;
  lines: ChargeCorrectionLine[];
}

export interface CorrectBookingChargesProps {
  bookingId: string;
  bookingCode: string;
  status: BookingChargeStatus;
  charges: BookingChargeLine[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  requiresManagerApproval: (lines: ChargeCorrectionLine[]) => boolean;
  authorizeManager: () => Promise<boolean>;
  onSubmit: (request: CorrectBookingChargesRequest) => Promise<void>;
}

const settledStatuses: BookingChargeStatus[] = ['PAID', 'COMPLETED'];

const formatVnd = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export function CorrectBookingCharges({
  bookingId,
  bookingCode,
  status,
  charges,
  isLoading = false,
  isSubmitting = false,
  requiresManagerApproval,
  authorizeManager,
  onSubmit,
}: CorrectBookingChargesProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(charges.map((charge) => [charge.id, String(charge.amountVnd)])),
  );
  const [rationale, setRationale] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const parsedAmounts = charges.map((charge) => ({
    charge,
    value: Number(amounts[charge.id]),
    raw: amounts[charge.id] ?? '',
  }));
  const hasInvalidAmount = parsedAmounts.some(
    ({ value, raw }) => raw.trim() === '' || !Number.isSafeInteger(value) || value < 0,
  );
  const correctionLines: ChargeCorrectionLine[] = hasInvalidAmount
    ? []
    : parsedAmounts
        .filter(({ charge, value }) => value !== charge.amountVnd)
        .map(({ charge, value }) => ({
          lineId: charge.id,
          previousAmountVnd: charge.amountVnd,
          correctedAmountVnd: value,
        }));
  const correctedTotal = hasInvalidAmount
    ? null
    : parsedAmounts.reduce((total, { value }) => total + value, 0);
  const managerApprovalNeeded =
    correctionLines.length > 0 && requiresManagerApproval(correctionLines);
  const canReview =
    !isLoading &&
    !isSubmitting &&
    !hasInvalidAmount &&
    correctionLines.length > 0 &&
    rationale.trim().length > 0;

  const updateAmount = (lineId: string, value: string) => {
    setAmounts((current) => ({ ...current, [lineId]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const submitCorrection = async () => {
    setErrorMessage('');
    try {
      if (managerApprovalNeeded && !(await authorizeManager())) {
        setErrorMessage('Manager authorization was not completed.');
        setConfirming(false);
        return;
      }

      await onSubmit({
        bookingId,
        rationale: rationale.trim(),
        lines: correctionLines,
      });
      setSuccessMessage('Booking charges were corrected.');
      setConfirming(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to correct booking charges.',
      );
    }
  };

  if (settledStatuses.includes(status)) {
    return (
      <section className="charge-correction" aria-labelledby="charge-correction-title">
        <h2 id="charge-correction-title">Correct booking charges</h2>
        <p className="charge-correction__notice" role="alert">
          This booking is already settled. Direct charge corrections are unavailable;
          use the refund or adjustment-voucher workflow.
        </p>
      </section>
    );
  }

  return (
    <section className="charge-correction" aria-labelledby="charge-correction-title">
      <header className="charge-correction__header">
        <div>
          <p className="charge-correction__eyebrow">Front desk billing</p>
          <h2 id="charge-correction-title">Correct booking charges</h2>
        </div>
        <span className="charge-correction__booking">{bookingCode}</span>
      </header>

      {isLoading ? (
        <p className="charge-correction__state" role="status">
          Loading charge details...
        </p>
      ) : charges.length === 0 ? (
        <p className="charge-correction__state">No charge lines are available.</p>
      ) : (
        <>
          <div className="charge-correction__table-wrap">
            <table className="charge-correction__table">
              <thead>
                <tr>
                  <th scope="col">Charge item</th>
                  <th scope="col">Current amount</th>
                  <th scope="col">Corrected amount (VND)</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <th scope="row">{charge.description}</th>
                    <td>{formatVnd(charge.amountVnd)}</td>
                    <td>
                      <label className="charge-correction__input-label" htmlFor={`amount-${charge.id}`}>
                        Corrected amount for {charge.description}
                      </label>
                      <input
                        id={`amount-${charge.id}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={amounts[charge.id] ?? ''}
                        onChange={(event) => updateAmount(charge.id, event.currentTarget.value)}
                        aria-invalid={
                          amounts[charge.id]?.trim() === '' ||
                          !Number.isSafeInteger(Number(amounts[charge.id])) ||
                          Number(amounts[charge.id]) < 0
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="charge-correction__summary">
            <span>Revised total</span>
            <strong>{correctedTotal === null ? 'Check entered amounts' : formatVnd(correctedTotal)}</strong>
          </div>

          <label className="charge-correction__field" htmlFor="correction-rationale">
            <span>Adjustment justification</span>
            <textarea
              id="correction-rationale"
              value={rationale}
              onChange={(event) => setRationale(event.currentTarget.value)}
              rows={3}
              required
              placeholder="Explain why these charges need correction"
            />
          </label>

          {managerApprovalNeeded && (
            <p className="charge-correction__notice" role="status">
              Facility Manager authorization is required for this correction.
            </p>
          )}

          {errorMessage && (
            <p className="charge-correction__error" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="charge-correction__success" role="status">
              {successMessage}
            </p>
          )}

          <div className="charge-correction__actions">
            <button
              className="charge-correction__primary"
              type="button"
              disabled={!canReview}
              onClick={() => setConfirming(true)}
            >
              Review correction
            </button>
          </div>
        </>
      )}

      {confirming && (
        <div className="charge-correction__backdrop">
          <section
            className="charge-correction__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="charge-correction-confirm-title"
            aria-describedby="charge-correction-confirm-description"
          >
            <h3 id="charge-correction-confirm-title">Confirm charge correction</h3>
            <p id="charge-correction-confirm-description">
              Update {correctionLines.length} charge line(s) for booking {bookingCode}?
              The new total will be {correctedTotal === null ? 'invalid' : formatVnd(correctedTotal)}.
            </p>
            {managerApprovalNeeded && (
              <p>Manager authorization will be requested before saving.</p>
            )}
            <div className="charge-correction__dialog-actions">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="charge-correction__primary"
                type="button"
                disabled={isSubmitting}
                onClick={submitCorrection}
              >
                {isSubmitting ? 'Saving...' : 'Confirm correction'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}