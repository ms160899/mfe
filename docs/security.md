# Security & CSP Configuration

## Overview

The MFE application is designed with security-first principles. This document covers CSP configuration, origin validation, token handling, and security best practices.

## Content Security Policy (CSP)

### For the Main App (iframe-embeddable)

**HTTP Header:**
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  frame-ancestors https://client1.com https://client2.com;
  connect-src 'self' https://api.yourorg.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self'
```

**Explanation:**

- `default-src 'self'` — Only same-origin resources by default
- `script-src 'self' 'wasm-unsafe-eval'` — Same-origin scripts, allow WebAssembly (needed for Angular)
- `style-src 'self' 'unsafe-inline'` — Same-origin styles, inline allowed (Shadow DOM)
- `frame-ancestors` — **CRITICAL** — Explicit allowlist of domains that can embed this app
- `connect-src` — HTTP requests only to same-origin or trusted API domain
- `object-src 'none'` — No plugins, applets
- `base-uri 'self'` — Only same-origin base tags
- `form-action 'self'` — Forms only submit to same-origin

### For Web Components

Since Web Components run in Shadow DOM (same-origin), they inherit the parent app's CSP. No additional policy needed.

## Frame-Ancestors Configuration

**CRITICAL:** The `frame-ancestors` directive controls which domains can embed your app.

### Per-Client Configuration

**Development:**
```
frame-ancestors https://localhost:*
```

**Production (Explicit Allowlist):**
```
frame-ancestors https://client1.com https://client2.com https://client3.com
```

**NEVER use:**
```
frame-ancestors 'self'      /* Wrong: allows any subdomain */
frame-ancestors '*'         /* Wrong: allows ANY domain */
frame-ancestors 'none'      /* Disables embedding entirely */
```

### Adding a New Client

1. **Client requests embedding permission** with their domain
2. **Security review** — verify domain legitimacy
3. **Add to `frame-ancestors`** in production CSP
4. **Client adds `iframe` with iframe sandbox attributes**
5. **Test** — verify embedding works

### Removing a Client

1. **Remove domain** from `frame-ancestors`
2. **Client's embedded iframe fails** (blocked by browser)
3. **Deploy** — change goes live immediately

## Origin Validation

### postMessage Origin Validation

**Host-Side (Sender):**
```typescript
const APP_ORIGIN = 'https://app.yourorg.com';

// Always specify target origin, never use '*'
iframe.contentWindow.postMessage(message, APP_ORIGIN);
```

**Host-Side (Receiver):**
```typescript
const ALLOWED_APP_ORIGINS = ['https://app.yourorg.com'];

window.addEventListener('message', (event) => {
  if (!ALLOWED_APP_ORIGINS.includes(event.origin)) {
    console.warn(`Rejected message from ${event.origin}`);
    return;
  }
  
  // Process event.data safely
});
```

**App-Side (Receiver):**
```typescript
const postMessage = getPostMessageService({
  allowedOrigins: ['https://client1.com', 'https://client2.com']
});

// Messages from other origins will be silently dropped
```

**App-Side (Sender):**
```typescript
// Use '*' only because embedded app doesn't know host origin
// The host validates on receive, so this is safe
window.parent.postMessage(message, '*');
```

### Testing Origin Validation

```typescript
describe('Origin Validation', () => {
  it('should reject messages from untrusted origin', () => {
    const spy = spyOn(console, 'warn');

    // Simulate malicious message
    const event = new MessageEvent('message', {
      data: { type: 'AUTH_TOKEN', payload: { token: 'evil' } },
      origin: 'https://attacker.com'
    });

    window.dispatchEvent(event);

    expect(spy).toHaveBeenCalledWith(
      jasmine.stringContaining('untrusted origin')
    );
  });
});
```

## Authentication & Token Handling

### ✅ Correct Token Transmission

**Via postMessage (Secure):**
```typescript
// Host → App
embed.setAuthToken(jwtToken);

// Message never exposed in URL, history, logs
```

**Stored Securely:**
```typescript
// In app, store in memory (not localStorage if sensitive)
let authToken: string;

const postMessage = getPostMessageService({
  onAuthTokenReceived: (token) => {
    authToken = token;  // Memory only, or use sessionStorage
  }
});

// Use in HTTP requests
headers.append('Authorization', `Bearer ${authToken}`);
```

### ❌ Incorrect Token Transmission

**Via URL Query Parameter (Insecure):**
```typescript
// Leaks to:
// - Browser history
// - Server logs
// - Referrer headers
// - Developer tools
src: 'https://app.yourorg.com?token=eyJhbGc...'
```

**Via Third-Party Cookie (Blocked):**
```typescript
// Modern browsers block 3rd-party cookies anyway
// Don't rely on this pattern
```

### Token Refresh Flow

```typescript
// 1. Host sends initial token
embed.setAuthToken(initialToken);

// 2. Token expires in app
// 3. App requests new token from parent via custom message
postMessage.send('TOKEN_REFRESH_REQUIRED', { reason: 'EXPIRED' });

// 4. Host receives request, gets new token
window.addEventListener('message', (event) => {
  if (event.data.type === 'TOKEN_REFRESH_REQUIRED') {
    // Get fresh token from auth server
    const newToken = await getRefreshToken();
    embed.setAuthToken(newToken);
  }
});

// 5. App receives new token
postMessage.onAuthTokenReceived = (token) => {
  authToken = token;
};
```

## XSS Prevention

All user input is HTML-encoded by default. Do NOT:

```typescript
// ❌ NEVER
component.innerHTML = userInput;

// ❌ NEVER (React)
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ❌ NEVER (Angular)
<div [innerHTML]="userInput"></div>
```

**Instead:**

```typescript
// ✅ CORRECT (automatic encoding)
component.textContent = userInput;

// ✅ CORRECT (React)
<div>{userInput}</div>

// ✅ CORRECT (Angular)
<div>{{ userInput }}</div>
```

### Sanitization for Rich Content

If you need to render rich HTML (e.g., markdown):

```typescript
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

getRichContent(markdown: string) {
  const html = this.markdownToHtml(markdown);
  return this.sanitizer.sanitize(SecurityContext.HTML, html);
}
```

## Shadow DOM Isolation (NOT a Sandbox)

**Important:** Shadow DOM provides **style isolation**, NOT a security sandbox.

### What Shadow DOM Prevents
- CSS leaking in or out
- External DOM manipulation of the component

### What Shadow DOM Does NOT Prevent
- Script execution (all scripts run in the same global context)
- XSS if you use `innerHTML` (still vulnerable)
- Access to global state/storage

**Security Model:**
```
┌─────────────────────────────────┐
│   Host Page Global Scope        │  ← Can access window, eval(), etc.
│                                 │
│ ┌──────────────────────────────┐│
│ │ Web Component (Shadow DOM)   ││  ← Isolated styles, same script context
│ │ Still has access to:         ││
│ │ - window.*                   ││
│ │ - localStorage               ││
│ │ - Parent's state/variables   ││
│ └──────────────────────────────┘│
└─────────────────────────────────┘
```

Don't rely on Shadow DOM for security — use CSP, origin validation, and input sanitization.

## CORS Configuration

Since the app and Web Components are same-origin, CORS is not needed for:
- Loading JS chunks
- Fetching remoteEntry.json
- Communication between components

**You DO need CORS if:**
- Fetching from a different origin API
- Making requests to third-party services

```typescript
// Configure CORS for API requests
import { HTTP_INTERCEPTORS } from '@angular/common/http';

@Injectable()
export class CorsInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Add credentials if API requires authentication
    const corsReq = req.clone({
      withCredentials: true  // Include cookies if needed
    });
    return next.handle(corsReq);
  }
}
```

## HTTPS Enforcement

**Always use HTTPS in production:**

```typescript
// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.yourorg.com',  // HTTPS only
  allowedOrigins: [
    'https://app.yourorg.com',        // HTTPS only
    'https://client1.com',
    'https://client2.com'
  ]
};
```

**Redirect HTTP to HTTPS:**

```nginx
server {
  listen 80;
  server_name app.yourorg.com;
  return 301 https://app.yourorg.com$request_uri;
}
```

## Dependency Scanning

Regularly scan dependencies for vulnerabilities:

```bash
# npm
npm audit

# yarn
yarn audit

# pnpm
pnpm audit

# Fix automatically
npm audit fix
```

## Monitoring & Logging

### CSP Violations

```typescript
// Listen for CSP violations
document.addEventListener('securitypolicyviolation', (e) => {
  console.error('CSP Violation:', {
    violatedDirective: e.violatedDirective,
    blockedURI: e.blockedURI,
    sourceFile: e.sourceFile,
    lineNumber: e.lineNumber
  });

  // Send to monitoring service
  reportSecurityViolation(e);
});
```

### postMessage Monitoring

```typescript
// Log all postMessage activity
let messageCount = 0;

window.addEventListener('message', (event) => {
  messageCount++;
  
  if (messageCount % 100 === 0) {
    console.log(`[Monitoring] Received ${messageCount} postMessages`);
  }

  // Log suspicious patterns
  if (event.origin !== 'https://app.yourorg.com') {
    console.warn('Unexpected origin:', event.origin);
    reportSecurityEvent({
      type: 'UNAUTHORIZED_ORIGIN',
      origin: event.origin,
      messageType: event.data?.type
    });
  }
});
```

## Checklist

- [ ] CSP header configured with explicit `frame-ancestors`
- [ ] Origin validation on all postMessage listeners
- [ ] Authentication tokens sent via postMessage only
- [ ] HTTPS enforced in production
- [ ] Dependencies regularly scanned for vulnerabilities
- [ ] No `innerHTML` / `dangerouslySetInnerHTML` on user input
- [ ] Sandbox attribute set on iframe (if using one)
- [ ] CSP violations monitored and logged
- [ ] Embed SDK uses explicit origin (not `'*'`) when sending messages
- [ ] Security headers reviewed and deployed

## Next Steps

- [iframe Embedding Guide](./iframe-embedding.md) — Safe embedding patterns
- [postMessage Protocol Reference](./postmessage-protocol.md) — Protocol details
- [Multi-Client Consumption Patterns](./multi-client-patterns.md) — Advanced scenarios
