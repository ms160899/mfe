import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    // Zoneless change detection recommended for isolated Web Components
    // Reduces per-component bundle weight and improves performance
    provideZonelessChangeDetection(),
  ],
}).catch(err => console.error(err));
