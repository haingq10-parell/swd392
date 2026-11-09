/*
  Nguyễn Quốc Hải - HE173133 - SE1990NJ
  9/11/2026
*/

import { useState } from 'react';
import { EmptyState, formatVnd } from '../shared/operation-ui';

export type InventoryStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type InventoryCategory = 'RETAIL' | 'EQUIPMENT' | 'OTHER';

export interface BranchInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  unitPriceVnd: number | null;
  quantityOnHand: number;
  stockStatus: InventoryStockStatus;
}

export interface BranchInventoryContext {
  isLoading: boolean;
  branchName: string;
  items: BranchInventoryItem[];
}

export function ViewBranchInventory({ context }: { context?: BranchInventoryContext }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'ALL' | InventoryCategory>('ALL');
  const [status, setStatus] = useState<'ALL' | InventoryStockStatus>('ALL');

  if (!context || context.isLoading) return <EmptyState>{context?.isLoading ? 'Loading branch inventory...' : 'Branch inventory is unavailable.'}</EmptyState>;

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredItems = context.items.filter((item) => {
    const matchesText = !normalizedSearch || `${item.name} ${item.sku}`.toLocaleLowerCase().includes(normalizedSearch);
    const matchesCategory = category === 'ALL' || item.category === category;
    const matchesStatus = status === 'ALL' || item.stockStatus === status;
    return matchesText && matchesCategory && matchesStatus;
  });

  return (
    <section className="operation-panel" aria-labelledby="inventory-title">
      <div className="operation-heading"><div><p className="operation-eyebrow">UC42 · Branch operations</p><h2 id="inventory-title">Branch inventory</h2></div><span className="operation-code">{context.branchName}</span></div>
      <div className="inventory-filters">
        <label className="operation-field">Search item or SKU
          <input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        </label>
        <label className="operation-field">Category
          <select value={category} onChange={(event) => setCategory(event.currentTarget.value as 'ALL' | InventoryCategory)}>
            <option value="ALL">All categories</option><option value="RETAIL">Retail</option><option value="EQUIPMENT">Equipment</option><option value="OTHER">Other</option>
          </select>
        </label>
        <label className="operation-field">Stock status
          <select value={status} onChange={(event) => setStatus(event.currentTarget.value as 'ALL' | InventoryStockStatus)}>
            <option value="ALL">All statuses</option><option value="IN_STOCK">In stock</option><option value="LOW_STOCK">Low stock</option><option value="OUT_OF_STOCK">Out of stock</option>
          </select>
        </label>
      </div>
      {filteredItems.length === 0 ? <EmptyState>No inventory items match these filters.</EmptyState> : (
        <div className="operation-table-wrap">
          <table className="operation-table">
            <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Unit price</th><th>On hand</th><th>Status</th></tr></thead>
            <tbody>{filteredItems.map((item) => <tr key={item.id}>
              <th>{item.name}</th><td>{item.sku}</td><td>{item.category}</td><td>{item.unitPriceVnd === null ? '—' : formatVnd(item.unitPriceVnd)}</td><td>{item.quantityOnHand} {item.unit}</td>
              <td><span className={`status-label status-label--${item.stockStatus.toLowerCase()}`}>{item.stockStatus.replace(/_/g, ' ')}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}