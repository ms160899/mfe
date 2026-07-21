import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { DataGridComponent } from './data-grid.component';

async function bootstrapDataGridElement() {
  const app = await createApplication();
  const element = createCustomElement(DataGridComponent, { injector: app.injector });

  if (!customElements.get('app-data-grid')) {
    customElements.define('app-data-grid', element);
  }
}

void bootstrapDataGridElement();

export { DataGridComponent } from './data-grid.component';
export {
  DataGridColumn,
  DataGridRow,
  DataGridConfig,
  DataGridRowClickEvent,
  DataGridSortEvent,
  DataGridSelectionEvent
} from './data-grid.types';
