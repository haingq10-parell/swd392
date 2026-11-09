/*
  Nguyễn Quốc Hải - HE173133 - SE1990NJ
  9/11/2026
*/

import { useState } from 'react';
import { ConfirmationDialog, EmptyState, formatDateTime, formatVnd } from '../shared/operation-ui';

export interface ReceiptLine {
  description: string;
  quantity: number;
  amountVnd: number;
}

export interface ReceiptRecord {
  invoiceId: string;
  invoiceNumber: string;
  paymentStatus: 'PAID' | 'SETTLED' | 'UNPAID';
  branchName: string;
  transactionAt: string;
  cashierName: string;
  paymentMethod: string;
  customerEmail: string | null;
  totalAmountVnd: number;
  lines: ReceiptLine[];
  receiptId: string | null;
}

export type ReceiptDelivery = 'PRINT' | 'EMAIL';

export interface ReceiptContext {
  isLoading: boolean;
  receipt: ReceiptRecord | null;
  onIssue?: (invoiceId: string, delivery: ReceiptDelivery) => Promise<{ receiptId: string }>;
  onReprint?: (invoiceId: string) => Promise<{ receiptId: string }>;
}

export function IssuePaymentReceipt({ context }: { context?: ReceiptContext }) {
  const [delivery, setDelivery] = useState<ReceiptDelivery>('PRINT');
  const [pendingAction, setPendingAction] = useState<'ISSUE' | 'REPRINT' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [printerFailed, setPrinterFailed] = useState(false);
  const [issuedReceiptId, setIssuedReceiptId] = useState<string | null>(null);

  if (!context || context.isLoading) {
    return <EmptyState>{context?.isLoading ? 'Loading payment details...' : 'No payment record selected.'}</EmptyState>;
  }
  const { receipt } = context;
  if (!receipt) return <EmptyState>No payment record selected.</EmptyState>;

  const isPaid = receipt.paymentStatus === 'PAID' || receipt.paymentStatus === 'SETTLED';
  const send = async (action: 'ISSUE' | 'REPRINT', selectedDelivery = delivery) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (action === 'REPRINT') {
        if (!context.onReprint) throw new Error('Receipt reprint is not connected.');
        const result = await context.onReprint(receipt.invoiceId);
        setSuccessMessage(`Copy receipt ${result.receiptId} generated.`);
      } else {
        if (!context.onIssue) throw new Error('Receipt delivery is not connected.');
        const result = await context.onIssue(receipt.invoiceId, selectedDelivery);
        setIssuedReceiptId(result.receiptId);
        setSuccessMessage(`Receipt ${result.receiptId} issued.`);
      }
      setPrinterFailed(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Receipt operation failed.';
      setErrorMessage(message);
      if (action === 'ISSUE' && selectedDelivery === 'PRINT') setPrinterFailed(true);
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  };

  return (
    <section className="operation-panel" aria-labelledby="receipt-title">
      <div className="operation-heading">
        <div><p className="operation-eyebrow">UC34 · Front desk</p><h2 id="receipt-title">Issue payment receipt</h2></div>
        <span className="operation-code">{receipt.invoiceNumber}</span>
      </div>
      {!isPaid && <p className="operation-alert" role="alert">Receipt can only be issued after successful payment settlement.</p>}
      <dl className="receipt-facts">
        <div><dt>Branch</dt><dd>{receipt.branchName}</dd></div>
        <div><dt>Transaction time</dt><dd>{formatDateTime(receipt.transactionAt)}</dd></div>
        <div><dt>Cashier</dt><dd>{receipt.cashierName}</dd></div>
        <div><dt>Payment method</dt><dd>{receipt.paymentMethod}</dd></div>
        <div><dt>Customer email</dt><dd>{receipt.customerEmail ?? 'Not available'}</dd></div>
      </dl>
      <div className="operation-table-wrap">
        <table className="operation-table">
          <thead><tr><th>Line item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>{receipt.lines.map((line, index) => (
            <tr key={`${line.description}-${index}`}><th>{line.description}</th><td>{line.quantity}</td><td>{formatVnd(line.amountVnd)}</td></tr>
          ))}</tbody>
          <tfoot><tr><th colSpan={2}>Total</th><td>{formatVnd(receipt.totalAmountVnd)}</td></tr></tfoot>
        </table>
      </div>
      <fieldset className="operation-choice" disabled={!isPaid || isSubmitting}>
        <legend>Delivery method</legend>
        <label><input type="radio" name="receipt-delivery" checked={delivery === 'PRINT'} onChange={() => setDelivery('PRINT')} /> Print physical receipt</label>
        <label><input type="radio" name="receipt-delivery" checked={delivery === 'EMAIL'} onChange={() => setDelivery('EMAIL')} disabled={!receipt.customerEmail} /> Email receipt</label>
      </fieldset>
      <div className="workspace-actions">
        <button type="button" disabled={!isPaid || isSubmitting || !context.onIssue || (delivery === 'EMAIL' && !receipt.customerEmail)} onClick={() => setPendingAction('ISSUE')}>
          {isSubmitting ? 'Processing...' : 'Issue receipt'}
        </button>
        {(receipt.receiptId || issuedReceiptId) && <button type="button" disabled={isSubmitting || !context.onReprint} onClick={() => setPendingAction('REPRINT')}>Reprint copy</button>}
      </div>
      {printerFailed && receipt.customerEmail && <button type="button" disabled={isSubmitting} onClick={() => void send('ISSUE', 'EMAIL')}>Send digital copy instead</button>}
      {errorMessage && <p className="operation-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="operation-success" role="status">{successMessage}</p>}
      {pendingAction && <ConfirmationDialog
        title={pendingAction === 'ISSUE' ? 'Confirm receipt delivery' : 'Reprint receipt copy'}
        description={pendingAction === 'ISSUE' ? `Issue this settled receipt by ${delivery === 'PRINT' ? 'printing' : 'email'}?` : 'Generate a duplicate marked COPY?'}
        confirmLabel={pendingAction === 'ISSUE' ? 'Issue receipt' : 'Reprint copy'}
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void send(pendingAction)}
      />}
    </section>
  );
}