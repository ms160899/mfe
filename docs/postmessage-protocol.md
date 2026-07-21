# postMessage Protocol Reference

## Overview

The iframe-embedded app communicates with its host exclusively through the `postMessage` API. This document specifies the complete protocol.

## Message Format

All messages conform to this structure:

```typescript
interface PostMessagePayload {
  type: string;              // Message type (see below)
  payload: any;              // Type-specific data
  timestamp: number;         // Unix milliseconds
}
```

## Message Types

### HOST → APP Messages

#### AUTH_TOKEN
Set or update the authentication token.

**Direction:** Host → App  
**Sent by:** `embed.setAuthToken(token)`

```typescript
{
  type: 'AUTH_TOKEN',
  payload: {
    token: string;           // JWT or bearer token
  },
  timestamp: 1719340800000
}
```

**Handler in App:**
```typescript
const postMessage = getPostMessageService({
  onAuthTokenReceived: (token) => {
    // Update auth context, HTTP headers, etc.
  }
});
```

#### THEME
Set or update the application theme.

**Direction:** Host → App  
**Sent by:** `embed.setTheme('dark')`

```typescript
{
  type: 'THEME',
  payload: {
    theme: 'light' | 'dark';
  },
  timestamp: 1719340800000
}
```

**Handler in App:**
```typescript
const postMessage = getPostMessageService({
  onThemeChange: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    // Update component styles, etc.
  }
});
```

#### LOCALE
Set or update the application locale/language.

**Direction:** Host → App  
**Sent by:** `embed.setLocale('de-DE')`

```typescript
{
  type: 'LOCALE',
  payload: {
    locale: string;          // BCP 47 language tag
  },
  timestamp: 1719340800000
}
```

**Handler in App:**
```typescript
const postMessage = getPostMessageService({
  onLocaleChange: (locale) => {
    i18n.changeLanguage(locale);
    // Update number/date formatting, etc.
  }
});
```

#### NAVIGATE
Navigate to a specific path/route within the app.

**Direction:** Host → App  
**Sent by:** `embed.navigate('/dashboard')`

```typescript
{
  type: 'NAVIGATE',
  payload: {
    path: string;            // Route path (e.g., '/dashboard', '/settings')
  },
  timestamp: 1719340800000
}
```

**Handler in App:**
```typescript
const postMessage = getPostMessageService({
  onNavigate: (path) => {
    router.navigate([path]);
  }
});
```

### APP → HOST Messages

#### HEIGHT_CHANGE
Notify host that the content height has changed (for auto-resize).

**Direction:** App → Host  
**Sent by:** `postMessage.notifyHeightChange(number)`

```typescript
{
  type: 'HEIGHT_CHANGE',
  payload: {
    height: number;          // Height in pixels
  },
  timestamp: 1719340800000
}
```

**Handler in Host:**
```javascript
const embed = mountApp('#container', {
  onHeightChange: (height) => {
    // Called automatically when HEIGHT_CHANGE received
    console.log(`Content height: ${height}px`);
  }
});
```

**When to send:**
- After route change (new page might have different height)
- On window resize
- After lazy-loaded content arrives
- On viewport orientation change

**Best Practice:** Debounce height notifications to avoid excessive reflows:

```typescript
import { debounceTime } from 'rxjs';

contentHeightSubject
  .pipe(debounceTime(100))
  .subscribe(height => {
    postMessage.notifyHeightChange(height);
  });
```

#### ROUTE_CHANGE
Notify host that the route has changed (e.g., for URL sync, analytics).

**Direction:** App → Host  
**Sent by:** (Custom, not automatic)

```typescript
{
  type: 'ROUTE_CHANGE',
  payload: {
    path: string;            // Current route
  },
  timestamp: 1719340800000
}
```

**Usage in App:**
```typescript
router.events.pipe(
  filter(event => event instanceof NavigationEnd)
).subscribe((event: NavigationEnd) => {
  postMessage.notifyRouteChange(event.urlAfterRedirects);
});
```

**Handler in Host:**
```javascript
const postMessage = getPostMessageService({
  onMessage: (payload) => {
    if (payload.type === 'ROUTE_CHANGE') {
      console.log('App navigated to:', payload.payload.path);
      // Update browser history, analytics, etc.
    }
  }
});
```

#### ERROR
Notify host of an error in the embedded app.

**Direction:** App → Host  
**Sent by:** `postMessage.notifyError(code, message, details)`

```typescript
{
  type: 'ERROR',
  payload: {
    code: string;            // Error code (e.g., 'AUTH_FAILED', 'NETWORK_ERROR')
    message: string;         // Human-readable message
    details?: object;        // Additional context
  },
  timestamp: 1719340800000
}
```

**Example:**
```typescript
{
  type: 'ERROR',
  payload: {
    code: 'AUTH_FAILED',
    message: 'Token expired',
    details: {
      reason: 'EXPIRED',
      expiresAt: 1719340800000
    }
  },
  timestamp: 1719340800000
}
```

**Handler in Host:**
```javascript
const embed = mountApp('#container', {
  onError: (error) => {
    console.error(`[${error.code}] ${error.message}`, error.details);
    
    // Specific error handling
    if (error.code === 'AUTH_FAILED') {
      // Redirect to login
    } else if (error.code === 'NETWORK_ERROR') {
      // Show retry UI
    }
  }
});
```

#### READY
App has finished loading and is ready for interaction.

**Direction:** App → Host  
**Sent by:** Automatically on app initialization

```typescript
{
  type: 'READY',
  payload: {
    timestamp: number;       // App load time
  },
  timestamp: 1719340800000
}
```

**Handler in Host:**
```javascript
const embed = mountApp('#container', {
  onReady: () => {
    console.log('App is ready to receive commands');
  }
});
```

## Origin Validation

**CRITICAL SECURITY REQUIREMENT:** Always validate `event.origin` before processing messages.

### Host-Side Validation (Receiver)
```typescript
const ALLOWED_APP_ORIGINS = ['https://app.yourorg.com'];

window.addEventListener('message', (event) => {
  // Validate origin FIRST
  if (!ALLOWED_APP_ORIGINS.includes(event.origin)) {
    console.warn(`Rejecting message from untrusted origin: ${event.origin}`);
    return;
  }

  // Now safe to process event.data
  const payload = event.data;
  if (payload.type === 'HEIGHT_CHANGE') {
    // ...
  }
});
```

### Host-Side Validation (Sender)
```typescript
const APP_ORIGIN = 'https://app.yourorg.com';

// Specify target origin (not '*') when sending
iframe.contentWindow.postMessage(message, APP_ORIGIN);
```

### App-Side Validation
```typescript
const postMessage = getPostMessageService({
  allowedOrigins: ['https://yourhost.com']
  // Messages from other origins will be rejected
});
```

## Error Codes

Common error codes the app may send:

| Code | Meaning | Suggested Action |
|------|---------|------------------|
| `AUTH_FAILED` | Authentication failed (token invalid/expired) | Redirect to login, refresh token |
| `AUTH_REQUIRED` | Action requires authentication | Show login dialog |
| `NETWORK_ERROR` | Network request failed | Show retry UI |
| `NOT_FOUND` | Resource not found | Navigate to home, show 404 |
| `PERMISSION_DENIED` | User lacks permission | Show error, navigate to allowed section |
| `INVALID_INPUT` | Invalid input data | Show validation error, focus input |
| `UNKNOWN` | Unexpected error | Log, show generic error message |

## Message Queue & Race Conditions

The Embed SDK automatically queues messages sent before the iframe finishes loading:

```typescript
// These won't send until iframe.onload fires
embed.setTheme('dark');
embed.setLocale('de-DE');
embed.setAuthToken(token);

// Once iframe is ready, all queued messages send automatically
```

**Don't worry about:**
- Sending messages before `onReady()`
- Race conditions between iframe load and first message

## Bidirectional Communication Example

### Scenario: User logs out

```typescript
// 1. Host detects logout
user = null;

// 2. Host notifies embedded app
embed.setAuthToken(null);  // or revoke the token

// 3. App receives AUTH_TOKEN with null/revoke
// 4. App resets auth state, navigates to login
// 5. App sends ERROR notification (or ROUTE_CHANGE)
postMessage.notifyError('AUTH_FAILED', 'Session expired');

// 6. Host receives ERROR
embed.onError = (error) => {
  if (error.code === 'AUTH_FAILED') {
    // Ensure UI is synced (might already be from step 1)
  }
};
```

### Scenario: User requests deep link

```typescript
// 1. Host navigates embedded app
embed.navigate('/reports/sales-q3');

// 2. App receives NAVIGATE, updates route
// 3. App may send HEIGHT_CHANGE if new route height differs
postMessage.notifyHeightChange(800);

// 4. Host receives HEIGHT_CHANGE, resizes iframe
embed.onHeightChange = (height) => {
  container.style.height = `${height}px`;
};
```

## Protocol Extensibility

To add custom message types:

**App Side:**
```typescript
const postMessage = getPostMessageService({
  onMessage: (payload) => {
    if (payload.type === 'CUSTOM_EVENT') {
      handleCustomEvent(payload.payload);
    }
  }
});
```

**Host Side:**
```typescript
window.addEventListener('message', (event) => {
  if (!validateOrigin(event.origin)) return;
  
  if (event.data.type === 'CUSTOM_EVENT') {
    handleCustomEvent(event.data.payload);
  }
});
```

## Rate Limiting

For high-frequency messages (e.g., HEIGHT_CHANGE on resize), use debouncing:

```typescript
import { debounceTime, fromEvent } from 'rxjs';

fromEvent(window, 'resize')
  .pipe(debounceTime(100))
  .subscribe(() => {
    const height = document.body.scrollHeight;
    postMessage.notifyHeightChange(height);
  });
```

## Testing

### Host-Side Test
```typescript
describe('postMessage protocol', () => {
  it('should handle HEIGHT_CHANGE message', () => {
    const iframe = document.createElement('iframe');
    let capturedHeight = null;

    window.addEventListener('message', (event) => {
      if (event.data.type === 'HEIGHT_CHANGE') {
        capturedHeight = event.data.payload.height;
      }
    });

    // Simulate app sending message
    const message = {
      type: 'HEIGHT_CHANGE',
      payload: { height: 800 },
      timestamp: Date.now()
    };
    
    window.postMessage(message, '*');
    
    expect(capturedHeight).toBe(800);
  });
});
```

### App-Side Test
```typescript
describe('PostMessageService', () => {
  it('should send HEIGHT_CHANGE to parent', () => {
    const service = new PostMessageService();
    spyOn(window.parent, 'postMessage');

    service.notifyHeightChange(600);

    expect(window.parent.postMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'HEIGHT_CHANGE',
        payload: { height: 600 }
      }),
      jasmine.any(String)
    );
  });
});
```

## Debugging

Enable debug logging in the SDK:

```typescript
// Add to window for debugging
window.__EMBED_DEBUG__ = true;

const embed = mountApp('#container', {
  // ...
});

// Now postMessage calls are logged to console
```

In the app:

```typescript
const postMessage = getPostMessageService();

// Log all messages
postMessage.onMessage = (payload) => {
  console.log('[postMessage]', payload.type, payload.payload);
};
```

## Next Steps

- [iframe Embedding Guide](./iframe-embedding.md) — Integration patterns
- [Security & CSP Configuration](./security.md) — Security best practices
