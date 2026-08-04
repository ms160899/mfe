import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { getPostMessageService } from './app/shared/post-message.service';
import { environment } from './environments/environment';

// Initialise the embed protocol before Angular boots so messages sent before
// the first render cycle are still handled.
getPostMessageService({
  allowedOrigins: environment.allowedOrigins,
});

bootstrapApplication(AppComponent, {
  providers: [
    // Zoneless change detection recommended for isolated Web Components
    // Reduces per-component bundle weight and improves performance
    provideZonelessChangeDetection(),
  ],
}).catch(err => console.error(err));
