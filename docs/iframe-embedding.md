# iframe Embedding Guide

## Overview

The MFE application can be embedded as a **full-app iframe** on any client domain. The iframe communicates with its host exclusively through `postMessage`, maintaining complete isolation.

## Architecture

### Same-Origin Requirement
- The app and iframe must be on the **same origin** (protocol + domain + port)
- CORS is not needed — origin validation is handled via `postMessage`
- Example: If the app is at `https://app.yourorg.com`, embed it from `https://app.yourorg.com` or a path like `https://yourorg.com/app`

### Communication Pattern
```
┌─────────────────────────────────────────┐
│   Host Page (Client Domain)             │
│  ┌────────────────────────────────────┐ │
│  │ <iframe src="/"> (MFE App)         │ │
│  │                                    │ │
│  │  ↔ postMessage ↔ (validated)      │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Quick Start

### 1. Add embed SDK to your host page

```html
<!-- React -->
import { mountApp } from '@yourorg/embed-sdk';

<!-- Or directly from CDN -->
<script src="https://app.yourorg.com/embed-sdk.js"></script>
```

### 2. Mount the app

```html
<!-- HTML -->
<div id="mfe-app-container"></div>

<!-- JavaScript -->
<script>
  const { mountApp } = window;
  
  mountApp('#mfe-app-container', {
    src: 'https://app.yourorg.com',
    theme: 'dark',
    locale: 'en-US',
    authToken: 'your-jwt-token',
    onReady: () => console.log('App ready'),
    onError: (err) => console.error('App error:', err),
    onHeightChange: (height) => console.log('New height:', height)
  });
</script>
```

### 3. Communicate via postMessage

```typescript
// From inside the embedded app (optional postMessage setup)
import { getPostMessageService } from '@app/shared/post-message.service';

const postMessage = getPostMessageService();

// Listen for host messages
postMessage.onAuthTokenReceived = (token) => {
  // Update auth context
};

postMessage.onThemeChange = (theme) => {
  // Apply theme
};

// Notify host of height changes (for auto-resize)
postMessage.notifyHeightChange(document.body.scrollHeight);

// Report errors
postMessage.notifyError('AUTH_FAILED', 'Invalid token');
```

## SDK API Reference

### mountApp(container, config)

```typescript
function mountApp(
  containerSelector: string | HTMLElement,
  config: EmbedConfig
): EmbedInstance
```

**Parameters:**

- `containerSelector` — CSS selector string (e.g., `'#my-container'`) or HTMLElement
- `config` — Configuration object (see below)

**Returns:** `EmbedInstance` — Control object for the embedded app

### EmbedConfig

```typescript
interface EmbedConfig {
  src: string;                    // URL of app root (e.g., 'https://app.yourorg.com')
  theme?: 'light' | 'dark';       // Initial theme
  locale?: string;                // BCP 47 language tag (e.g., 'en-US')
  authToken?: string;             // JWT or bearer token
  initialPath?: string;           // Route to navigate to (e.g., '/dashboard')
  autoResize?: boolean;           // Auto-fit iframe height (default: true)
  maxHeight?: string;             // Max height CSS value (e.g., '800px')
  onReady?: () => void;           // Callback when app loads
  onError?: (error) => void;      // Callback on error
  onHeightChange?: (h) => void;   // Callback when height changes
}
```

### EmbedInstance Methods

```typescript
class EmbedInstance {
  setTheme(theme: 'light' | 'dark'): void
  setLocale(locale: string): void
  setAuthToken(token: string): void
  navigate(path: string): void
  destroy(): void
}
```

## Usage Examples

### React Integration

```jsx
import { useRef, useEffect, useState } from 'react';
import { mountApp } from '@yourorg/embed-sdk';

export function AppEmbed({ theme, locale, authToken }) {
  const containerRef = useRef(null);
  const embedRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Mount the app
    embedRef.current = mountApp(containerRef.current, {
      src: 'https://app.yourorg.com',
      theme,
      locale,
      authToken,
      onReady: () => setIsReady(true),
      onError: (err) => console.error('Embed error:', err),
      autoResize: true
    });

    return () => {
      embedRef.current?.destroy();
    };
  }, []);

  // Update theme reactively
  useEffect(() => {
    embedRef.current?.setTheme(theme);
  }, [theme]);

  // Update locale reactively
  useEffect(() => {
    embedRef.current?.setLocale(locale);
  }, [locale]);

  // Update auth token reactively
  useEffect(() => {
    if (authToken) {
      embedRef.current?.setAuthToken(authToken);
    }
  }, [authToken]);

  return (
    <div ref={containerRef} style={{ width: '100%', minHeight: '600px' }} />
  );
}

// Parent component
export function Dashboard() {
  const [user, setUser] = useState(null);

  return (
    <AppEmbed
      theme={user?.theme || 'light'}
      locale={user?.locale || 'en-US'}
      authToken={user?.token}
    />
  );
}
```

### Vue Integration

```vue
<template>
  <div ref="container" class="embed-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { mountApp } from '@yourorg/embed-sdk';

const props = defineProps({
  theme: { type: String, default: 'light' },
  locale: { type: String, default: 'en-US' },
  authToken: String
});

const container = ref(null);
const embed = ref(null);

onMounted(() => {
  if (!container.value) return;

  embed.value = mountApp(container.value, {
    src: 'https://app.yourorg.com',
    theme: props.theme,
    locale: props.locale,
    authToken: props.authToken,
    onReady: () => console.log('Embed ready')
  });
});

onUnmounted(() => {
  embed.value?.destroy();
});

watch(() => props.theme, (newTheme) => {
  embed.value?.setTheme(newTheme);
});

watch(() => props.locale, (newLocale) => {
  embed.value?.setLocale(newLocale);
});

watch(() => props.authToken, (newToken) => {
  if (newToken) {
    embed.value?.setAuthToken(newToken);
  }
});
</script>

<style scoped>
.embed-container {
  width: 100%;
  min-height: 600px;
}
</style>
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Embed Example</title>
  <style>
    #app-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <h1>Embedded MFE App</h1>
  <div id="app-container"></div>

  <script src="https://app.yourorg.com/embed-sdk.js"></script>
  <script>
    const { mountApp } = window;

    // Mount app
    const embed = mountApp('#app-container', {
      src: 'https://app.yourorg.com',
      theme: localStorage.getItem('theme') || 'light',
      locale: navigator.language,
      authToken: sessionStorage.getItem('token'),
      onReady: () => {
        console.log('App loaded and ready');
      },
      onError: (error) => {
        console.error('App error:', error);
        alert(`Error: ${error.message}`);
      },
      onHeightChange: (height) => {
        console.log(`App height: ${height}px`);
      }
    });

    // Theme switcher
    document.addEventListener('themechange', (e) => {
      embed.setTheme(e.detail);
    });

    // Locale switcher
    document.addEventListener('localechange', (e) => {
      embed.setLocale(e.detail);
    });
  </script>
</body>
</html>
```

## postMessage Protocol

All communication happens via `window.postMessage()`. See [postmessage-protocol.md](./postmessage-protocol.md) for detailed specification.

### Common Message Types

| Message | Direction | Payload |
|---------|-----------|---------|
| `HEIGHT_CHANGE` | app → host | `{ height: number }` |
| `AUTH_TOKEN` | host → app | `{ token: string }` |
| `THEME` | host → app | `{ theme: 'light' \| 'dark' }` |
| `LOCALE` | host → app | `{ locale: string }` |
| `NAVIGATE` | both | `{ path: string }` |
| `ERROR` | app → host | `{ code, message, details }` |

### Example: Custom Message Handling

```typescript
// Inside the embedded app
import { getPostMessageService } from '@app/shared/post-message.service';

const postMessage = getPostMessageService({
  onThemeChange: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  },
  onLocaleChange: (locale) => {
    i18n.changeLanguage(locale);
  },
  onAuthTokenReceived: (token) => {
    localStorage.setItem('auth_token', token);
    // Update HTTP headers, etc.
  },
  onNavigate: (path) => {
    router.navigate([path]);
  }
});
```

## Security Best Practices

### 1. Validate Origin (Host Side)

```typescript
// In your embedder/host code
const ALLOWED_EMBED_ORIGINS = [
  'https://app.yourorg.com'
  // NOT '*' — always be explicit
];

window.addEventListener('message', (event) => {
  // ALWAYS validate origin first
  if (!ALLOWED_EMBED_ORIGINS.includes(event.origin)) {
    console.warn(`Rejected message from ${event.origin}`);
    return;
  }

  // Now safe to process event.data
});
```

### 2. Use HTTPS Only

```typescript
// Production configuration
const config = {
  src: 'https://app.yourorg.com', // Always HTTPS
  // ... rest of config
};
```

### 3. Secure Token Transmission

```typescript
// ✅ Correct — via postMessage
embed.setAuthToken(jwtToken);

// ❌ Wrong — via URL (leaks to logs, history, referrer)
// src: 'https://app.yourorg.com?token=...'

// ❌ Wrong — via 3rd-party cookie (blocked by browsers anyway)
```

### 4. Content Security Policy

Configure CSP headers to allow iframe embedding:

```
Content-Security-Policy: frame-ancestors https://client1.com https://client2.com
```

Never use wildcard `frame-ancestors 'self'` or `'*'`.

## Handling Errors

```typescript
const embed = mountApp('#container', {
  src: 'https://app.yourorg.com',
  onError: (error) => {
    console.error('Embed error:', {
      code: error.code,
      message: error.message,
      details: error.details
    });

    // Handle specific errors
    if (error.code === 'AUTH_FAILED') {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.code === 'NETWORK_ERROR') {
      // Show retry UI
      showRetryButton();
    }
  }
});
```

## Styling the iframe

```html
<style>
  /* Default iframe styling */
  #app-container iframe {
    width: 100%;
    height: 600px;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Responsive sizing -->
  @media (max-width: 768px) {
    #app-container iframe {
      height: 100vh;
    }
  }
</style>
```

## Performance Considerations

### Auto-Resize Performance

With `autoResize: true`, the app notifies the host of height changes frequently. To avoid excessive reflows:

```typescript
// Debounce height changes on the host side
let heightTimeout;
embed.onHeightChange = (height) => {
  clearTimeout(heightTimeout);
  heightTimeout = setTimeout(() => {
    document.getElementById('container').style.height = `${height}px`;
  }, 100); // Debounce 100ms
};
```

### Lazy Loading

Don't load the embed SDK until the container is visible:

```typescript
// Intersection Observer
const container = document.getElementById('app-container');
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    // Load embed SDK and mount
    import('@yourorg/embed-sdk').then(({ mountApp }) => {
      mountApp(container, { src: '...' });
    });
    observer.unobserve(container);
  }
});
observer.observe(container);
```

## Troubleshooting

### "Failed to load iframe"
- Check browser console for CORS errors
- Verify `src` URL is accessible
- Ensure CSP headers allow the origin

### "postMessage not working"
- Verify app is running in iframe (`window.self !== window.top`)
- Check that `src` is same-origin
- Validate `event.origin` before processing

### "iframe height not updating"
- Ensure `autoResize: true` in config
- Check that the app is calling `notifyHeightChange()`
- Verify no errors in browser console

## Next Steps

- [postMessage Protocol Reference](./postmessage-protocol.md) — Protocol details
- [Security & CSP Configuration](./security.md) — Security best practices
- [Multi-Client Consumption Patterns](./multi-client-patterns.md) — Advanced scenarios
