import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { DatePickerComponent } from './date-picker.component';

async function bootstrapDatePickerElement() {
  const app = await createApplication();
  const element = createCustomElement(DatePickerComponent, { injector: app.injector });

  if (!customElements.get('app-date-picker')) {
    customElements.define('app-date-picker', element);
  }
}

void bootstrapDatePickerElement();

export { DatePickerComponent } from './date-picker.component';
export { DatePickerConfig, DateChangeEvent, DatePickerErrorEvent } from './date-picker.types';
