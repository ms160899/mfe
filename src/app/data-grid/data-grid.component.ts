import { Component, EventEmitter, Input, Output, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataGridColumn, DataGridRow, DataGridConfig, DataGridRowClickEvent, DataGridSortEvent } from './data-grid.types';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="data-grid-container">
      <div class="data-grid-toolbar">
        <div class="toolbar-info">
          <span *ngIf="dataSource">{{ dataSource.length }} rows</span>
          <span *ngIf="config?.paginated && pageInfo">(Page {{ currentPage }} of {{ totalPages }})</span>
        </div>
      </div>

      <table class="data-grid-table" role="grid" [attr.aria-label]="'Data Grid'">
        <thead>
          <tr role="row">
            <th
              *ngFor="let column of columns"
              role="columnheader"
              [class.sortable]="column.sortable"
              [style.width]="column.width"
              (click)="config.sortable && column.sortable ? sort(column) : null"
              [attr.aria-sort]="getSortState(column)"
            >
              <div class="column-header">
                <span>{{ column.header }}</span>
                <span *ngIf="column.sortable" class="sort-indicator">
                  {{ getSortIndicator(column) }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let row of displayedRows; let idx = index"
            role="row"
            [class.clickable]="true"
            (click)="onRowClick(row, idx)"
          >
            <td *ngFor="let column of columns" role="cell">
              {{ formatCell(row[column.field], column) }}
            </td>
          </tr>
          <tr *ngIf="!displayedRows || displayedRows.length === 0" class="empty-state">
            <td [attr.colspan]="columns.length" style="text-align: center; padding: 2rem;">
              No data available
            </td>
          </tr>
        </tbody>
      </table>

      <div class="data-grid-pagination" *ngIf="config?.paginated && totalPages > 1">
        <button
          [disabled]="currentPage === 1"
          (click)="previousPage()"
          aria-label="Previous page"
        >
          ← Previous
        </button>
        <span class="page-indicator">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          [disabled]="currentPage === totalPages"
          (click)="nextPage()"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary-color: #0066cc;
      --border-color: #e0e0e0;
      --hover-bg: #f5f5f5;
      --header-bg: #f9f9f9;
      --text-color: #333;
      --zebra-bg: #fafafa;
    }

    .data-grid-container {
      font-family: inherit;
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .data-grid-toolbar {
      padding: 1rem;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toolbar-info {
      font-size: 0.9rem;
      color: #666;

      span {
        margin-right: 1rem;
      }
    }

    .data-grid-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;

      thead {
        background: var(--header-bg);
        border-bottom: 2px solid var(--border-color);
      }

      th {
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 600;
        user-select: none;

        &.sortable {
          cursor: pointer;

          &:hover {
            background: #f0f0f0;
          }
        }
      }

      td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border-color);
      }

      tbody tr {
        &:nth-child(even) {
          background: var(--zebra-bg);
        }

        &.clickable:hover {
          background: var(--hover-bg);
          cursor: pointer;
        }

        &.empty-state {
          background: white !important;
          color: #999;
        }
      }
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-indicator {
      font-size: 0.8rem;
      color: var(--primary-color);
      font-weight: bold;
    }

    .data-grid-pagination {
      padding: 1rem;
      background: var(--header-bg);
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;

      button {
        padding: 0.5rem 1rem;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        color: var(--primary-color);
        font-weight: bold;

        &:hover:not(:disabled) {
          background: var(--primary-color);
          color: white;
        }

        &:disabled {
          color: #ccc;
          cursor: not-allowed;
          border-color: #ddd;
        }
      }

      .page-indicator {
        font-size: 0.9rem;
        color: #666;
      }
    }
  `]
})
export class DataGridComponent {
  @Input() dataSource: DataGridRow[] = [];
  @Input() columns: DataGridColumn[] = [];
  @Input() config: DataGridConfig = { pageSize: 10, paginated: true };
  
  @Output() rowClick = new EventEmitter<DataGridRowClickEvent>();
  @Output() sortChange = new EventEmitter<DataGridSortEvent>();

  currentPage = 1;
  totalPages = 1;
  displayedRows: DataGridRow[] = [];
  pageInfo: string = '';
  sortField: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  ngOnChanges() {
    this.updateDisplayedRows();
  }

  ngOnInit() {
    this.updateDisplayedRows();
  }

  private updateDisplayedRows() {
    if (!this.dataSource || this.dataSource.length === 0) {
      this.displayedRows = [];
      this.totalPages = 1;
      return;
    }

    let data = [...this.dataSource];

    // Apply sorting
    if (this.sortField) {
      data.sort((a, b) => {
        const aVal = a[this.sortField!];
        const bVal = b[this.sortField!];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Apply pagination
    if (this.config?.paginated && this.config.pageSize) {
      this.totalPages = Math.ceil(data.length / this.config.pageSize);
      const start = (this.currentPage - 1) * this.config.pageSize;
      const end = start + this.config.pageSize;
      this.displayedRows = data.slice(start, end);
      this.pageInfo = `Showing ${start + 1} to ${Math.min(end, data.length)} of ${data.length}`;
    } else {
      this.displayedRows = data;
      this.totalPages = 1;
    }
  }

  sort(column: DataGridColumn) {
    if (this.sortField === column.field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = column.field;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.sortChange.emit({ field: this.sortField, direction: this.sortDirection });
    this.updateDisplayedRows();
  }

  getSortState(column: DataGridColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortField !== column.field) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  getSortIndicator(column: DataGridColumn): string {
    if (this.sortField !== column.field) return '⇅';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  formatCell(value: any, column: DataGridColumn): string {
    if (value === null || value === undefined) return '';
    
    if (column.type === 'date') {
      return new Date(value).toLocaleDateString();
    }
    if (column.type === 'boolean') {
      return value ? '✓' : '✗';
    }
    if (column.type === 'number') {
      return Number(value).toLocaleString();
    }
    return String(value);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedRows();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedRows();
    }
  }

  onRowClick(row: DataGridRow, idx: number) {
    const event: DataGridRowClickEvent = {
      row,
      rowIndex: idx + (this.currentPage - 1) * (this.config?.pageSize || 10)
    };
    this.rowClick.emit(event);
    this.dispatchCustomEvent('rowClick', event);
  }

  private dispatchCustomEvent(eventName: string, detail: any) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    });
    (this as any).el?.dispatchEvent?.(event);
  }
}
