/*
  Nguyễn Quốc Hải - HE173133 - SE1990NJ
  9/11/2026
*/

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmationDialog, EmptyState, formatDateTime } from '../shared/operation-ui';

export interface MaintenanceBlock {
  id: string;
  courtNames: string[];
  startAt: string;
  endAt: string;
  reason: string;
  workCompleted: boolean;
}

export interface MaintenanceContext {
  isLoading: boolean;
  blocks: MaintenanceBlock[];
  onRestore?: (maintenanceId: string) => Promise<void>;
  onUpdateEndTime?: (maintenanceId: string, endAt: string) => Promise<void>;
}

export function RestoreCourtAvailability({ context }: { context?: MaintenanceContext }) {
  const [selectedBlock, setSelectedBlock] = useState<MaintenanceBlock | null>(null);
  const [newEndTimes, setNewEndTimes] = useState<Record<string, string>>({});
  const [pendingEndUpdate, setPendingEndUpdate] = useState<MaintenanceBlock | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!context || context.isLoading) return <EmptyState>{context?.isLoading ? 'Loading maintenance blocks...' : 'Maintenance schedule is unavailable.'}</EmptyState>;

  const restore = async (block: MaintenanceBlock) => {
    if (!context.onRestore) {
      setErrorMessage('Court availability restoration is not connected.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await context.onRestore(block.id);
      setSuccessMessage('Court availability was restored.');
      setSelectedBlock(null);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to restore court availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEndTime = async (block: MaintenanceBlock) => {
    const endAt = newEndTimes[block.id];
    if (!endAt || !context.onUpdateEndTime) {
      setErrorMessage('A new maintenance end time and connected update action are required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await context.onUpdateEndTime(block.id, new Date(endAt).toISOString());
      setSuccessMessage('Maintenance end time updated.');
      setPendingEndUpdate(null);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update maintenance end time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmEndUpdate = (event: FormEvent<HTMLFormElement>, block: MaintenanceBlock) => {
    event.preventDefault();
    const endAt = newEndTimes[block.id];
    if (!endAt || Date.parse(endAt) <= Date.parse(block.startAt)) {
      setErrorMessage('Maintenance end time must be later than its start time.');
      return;
    }
    setErrorMessage('');
    setPendingEndUpdate(block);
  };

  return (
    <section className="operation-panel" aria-labelledby="maintenance-title">
      <div className="operation-heading"><div><p className="operation-eyebrow">UC41 · Facility operations</p><h2 id="maintenance-title">Restore court availability</h2></div></div>
      {context.blocks.length === 0 ? <EmptyState>No maintenance blocks are available.</EmptyState> : (
        <div className="maintenance-list">
          {context.blocks.map((block) => <article className="maintenance-row" key={block.id}>
            <div className="maintenance-row__details">
              <h3>{block.courtNames.join(', ')}</h3>
              <p>{formatDateTime(block.startAt)} to {formatDateTime(block.endAt)}</p>
              <p>{block.reason}</p>
              <span className={block.workCompleted ? 'status-label status-label--ready' : 'status-label'}>{block.workCompleted ? 'Work complete' : 'Work not marked complete'}</span>
            </div>
            <div className="maintenance-row__actions">
              <button type="button" disabled={!block.workCompleted || isSubmitting || !context.onRestore} onClick={() => setSelectedBlock(block)}>Restore availability</button>
              <form onSubmit={(event) => confirmEndUpdate(event, block)}>
                <label className="operation-field">New end time
                  <input type="datetime-local" required value={newEndTimes[block.id] ?? ''} onChange={(event) => setNewEndTimes((current) => ({ ...current, [block.id]: event.currentTarget.value }))} />
                </label>
                <button type="submit" disabled={isSubmitting || !context.onUpdateEndTime || !newEndTimes[block.id]}>Update end time</button>
              </form>
            </div>
          </article>)}
        </div>
      )}
      {errorMessage && <p className="operation-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="operation-success" role="status">{successMessage}</p>}
      {selectedBlock && <ConfirmationDialog
        title="Restore court availability"
        description={`Release the maintenance block for ${selectedBlock.courtNames.join(', ')}? The server will revalidate bookings and availability before saving.`}
        confirmLabel="Restore availability"
        isSubmitting={isSubmitting}
        onCancel={() => setSelectedBlock(null)}
        onConfirm={() => void restore(selectedBlock)}
      />}
      {pendingEndUpdate && <ConfirmationDialog
        title="Update maintenance end time"
        description={`Change the planned end time for ${pendingEndUpdate.courtNames.join(', ')}?`}
        confirmLabel="Save end time"
        isSubmitting={isSubmitting}
        onCancel={() => setPendingEndUpdate(null)}
        onConfirm={() => void updateEndTime(pendingEndUpdate)}
      />}
    </section>
  );
}