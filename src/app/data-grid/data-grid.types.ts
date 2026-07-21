/**
 * DataGrid Component Public Contract
 * 
 * All consumers of this Web Component MUST conform to these interfaces.
 */

export interface DataGridColumn {
  /**
   * Unique identifier for the column
   */
  field: string;

  /**
   * Display header text
   */
  header: string;

  /**
   * Column width (CSS value)
   */
  width?: string;

  /**
   * Whether column is sortable
   */
  sortable?: boolean;

  /**
   * Whether column is filterable
   */
  filterable?: boolean;

  /**
   * Data type for proper rendering/sorting
   */
  type?: 'text' | 'number' | 'date' | 'boolean';
}

export interface DataGridRow {
  [key: string]: any;
}

export interface DataGridConfig {
  /**
   * Number of rows per page
   */
  pageSize?: number;

  /**
   * Whether to enable row selection
   */
  selectable?: boolean;

  /**
   * Whether to enable sorting
   */
  sortable?: boolean;

  /**
   * Default sort column
   */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };

  /**
   * Whether to enable pagination
   */
  paginated?: boolean;
}

export interface DataGridRowClickEvent {
  row: DataGridRow;
  rowIndex: number;
  field?: string;
}

export interface DataGridSortEvent {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataGridSelectionEvent {
  selectedRows: DataGridRow[];
  selectedIndices: number[];
}
