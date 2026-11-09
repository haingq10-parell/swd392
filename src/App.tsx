/*
    Nguyễn Quốc Hải - HE173133 - SE1990NJ
    9/11/2026
*/

import { useState } from 'react';
import { CorrectBookingCharges } from './features/billing/CorrectBookingCharges';
import type { CorrectBookingChargesProps } from './features/billing/CorrectBookingCharges';
import { IssuePaymentReceipt } from './features/receipts/IssuePaymentReceipt';
import type { ReceiptContext } from './features/receipts/IssuePaymentReceipt';
import { OpenWorkShift } from './features/shifts/OpenWorkShift';
import type { OpenShiftContext } from './features/shifts/OpenWorkShift';
import { RestoreCourtAvailability } from './features/maintenance/RestoreCourtAvailability';
import type { MaintenanceContext } from './features/maintenance/RestoreCourtAvailability';
import { ViewBranchInventory } from './features/inventory/ViewBranchInventory';
import type { BranchInventoryContext } from './features/inventory/ViewBranchInventory';
import { EmptyState } from './features/shared/operation-ui';
import './App.css';

export type OperationsRole = 'STAFF' | 'FACILITY_MANAGER' | 'COURT_OWNER';
export type OperationsTab = 'UC31' | 'UC34' | 'UC35' | 'UC41' | 'UC42';

export interface AppProps {
  role?: OperationsRole;
  uc31?: CorrectBookingChargesProps;
  uc34?: ReceiptContext;
  uc35?: OpenShiftContext;
  uc41?: MaintenanceContext;
  uc42?: BranchInventoryContext;
}

const availableTabs: Record<OperationsRole, OperationsTab[]> = {
  STAFF: ['UC31', 'UC34', 'UC35', 'UC42'],
  FACILITY_MANAGER: ['UC31', 'UC35', 'UC41', 'UC42'],
  COURT_OWNER: ['UC41'],
};

const tabLabels: Record<OperationsTab, string> = {
  UC31: 'Correct charges',
  UC34: 'Issue receipt',
  UC35: 'Open shift',
  UC41: 'Restore court',
  UC42: 'Branch inventory',
};

export function App({ role, uc31, uc34, uc35, uc41, uc42 }: AppProps) {
  const [selectedTab, setSelectedTab] = useState<OperationsTab>('UC31');
  const tabs = role ? availableTabs[role] : [];
  const activeTab = tabs.includes(selectedTab) ? selectedTab : tabs[0];

  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__brand">CourtChain</p>
        <h1>Front desk and branch operations</h1>
      </header>
      {!role ? <EmptyState>No authenticated operations context is available.</EmptyState> : (
        <>
          <nav className="operation-tabs" aria-label="Operations">
            {tabs.map((tab) => <button key={tab} type="button" aria-current={activeTab === tab ? 'page' : undefined} className={activeTab === tab ? 'operation-tab operation-tab--active' : 'operation-tab'} onClick={() => setSelectedTab(tab)}>
              <span>{tab}</span>{tabLabels[tab]}
            </button>)}
          </nav>
          {activeTab === 'UC31' && (uc31 ? <CorrectBookingCharges {...uc31} /> : <EmptyState>Booking charge correction data is unavailable.</EmptyState>)}
          {activeTab === 'UC34' && <IssuePaymentReceipt context={uc34} />}
          {activeTab === 'UC35' && <OpenWorkShift context={uc35} />}
          {activeTab === 'UC41' && <RestoreCourtAvailability context={uc41} />}
          {activeTab === 'UC42' && <ViewBranchInventory context={uc42} />}
        </>
      )}
    </main>
  );
}