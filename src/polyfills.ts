import { provideZonelessChangeDetection } from '@angular/core';

// Zone.js polyfills. Include this in your main.ts for Angular 16 and older
// For Angular 20+, use provideZonelessChangeDetection() instead

if (typeof ngDevMode !== 'undefined') {
  enableDebugTools(getComponent(document.body));
}
