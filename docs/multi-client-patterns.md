# Multi-Client Consumption Patterns

## Overview

The MFE application supports **two independent consumption modes** that clients can use in any combination:
1. **Web Components via Native Federation** — For granular, framework-agnostic component embedding
2. **Full-App iframe Embedding** — For complete application isolation

This guide covers real-world scenarios and integration patterns.

## Scenario A: Web Components Only

**Client wants isolated, reusable components, not the full app.**

### Setup

```html
<!-- Load federation manifest -->
<script type="module">
  import { bootstrapDatePickerElement } from 'https://app.yourorg.com/DatePicker.js';
  import { bootstrapDataGridElement } from 'https://app.yourorg.com/DataGrid.js';
</script>

<!-- Use components -->
<app-date-picker id="my-picker"></app-date-picker>
<app-data-grid id="my-grid"></app-data-grid>
```

### Configuration

**No server-side changes needed** — the client simply loads the scripts and uses the components.

**CSP Requirements:**
```
Content-Security-Policy: 
  script-src 'self' https://app.yourorg.com;
  connect-src 'self' https://app.yourorg.com
```

### Advantages
- ✅ Lightweight — only load components you need
- ✅ Composable — integrate into existing layouts
- ✅ No framework lock-in
- ✅ Consumer owns composition logic

### Disadvantages
- ❌ Each component carries its own Angular runtime (~100KB gzipped per component)
- ❌ No automatic state sync between components (consumer's responsibility)
- ❌ Consumer must handle event wiring, no shared context

## Scenario B: iframe Only

**Client wants the full app embedded, complete isolation guaranteed.**

### Setup

```html
<!-- Host page -->
<div id="mfe-app-container"></div>

<script src="https://app.yourorg.com/embed-sdk.js"></script>
<script>
  const { mountApp } = window;
  
  mountApp('#mfe-app-container', {
    src: 'https://app.yourorg.com',
    theme: 'dark',
    authToken: sessionStorage.getItem('auth_token'),
    onReady: () => console.log('App ready'),
    onError: (err) => console.error('App error:', err)
  });
</script>
```

### Configuration

**Server-side (required):**

Add client domain to CSP:
```
Content-Security-Policy: 
  frame-ancestors https://client1.com
```

No per-client build or configuration — same static assets serve the client.

### Advantages
- ✅ Complete isolation — app can't interfere with host
- ✅ Simple integration — one container, one SDK call
- ✅ Automatic message queuing — no race conditions
- ✅ Clean separation of concerns

### Disadvantages
- ❌ Full application overhead (all features, less composable)
- ❌ Cannot compose app pieces into host layout
- ❌ Height must be explicitly configured or auto-resize used

## Scenario C: Both Web Components AND iframe

**Client wants both: full app in one area, specific components elsewhere.**

### Motivation
- Use the full app for main workflow
- Use individual components for supplementary tasks
- Sync state between them via postMessage

### Architecture

```html
<div class="main-content">
  <!-- Full app iframe -->
  <div id="app-container"></div>
</div>

<aside class="sidebar">
  <!-- Standalone component -->
  <app-date-picker id="filter-picker"></app-date-picker>
</aside>
```

### Setup

#### Part 1: Mount the iframe

```javascript
import { mountApp } from '@yourorg/embed-sdk';

const embed = mountApp('#app-container', {
  src: 'https://app.yourorg.com',
  authToken: token,
  onReady: () => {
    console.log('App ready, now sync with Web Components');
  }
});
```

#### Part 2: Load Web Components

```html
<script type="module">
  import { bootstrapDatePickerElement } from 'https://app.yourorg.com/DatePicker.js';
</script>
```

#### Part 3: Sync State Between Modes

```javascript
// When user selects date in the standalone picker
const picker = document.getElementById('filter-picker');

picker.addEventListener('dateChange', (event) => {
  const selectedDate = event.detail.date;

  // Notify iframe app of the change
  // (Custom postMessage, requires app-side listener)
  embed.send('FILTER_DATE_CHANGED', { date: selectedDate });
});

// Optional: If iframe app broadcasts route changes, update picker
window.addEventListener('message', (event) => {
  if (event.data.type === 'ROUTE_CHANGE') {
    // Extract date from route if present
    const path = event.data.payload.path;
    // Update picker to match app state
  }
});
```

### State Sync Patterns

#### Pattern 1: Unidirectional Flow (Component → App)

```
User selects date in Web Component
           ↓
Component emits CustomEvent
           ↓
Host app listens for event
           ↓
Host sends postMessage to iframe
           ↓
iframe app updates state
```

```javascript
picker.addEventListener('dateChange', (event) => {
  const { date } = event.detail;
  
  // Notify iframe
  embed.navigate(`/reports?date=${date}`);
  
  // Or custom message (if app supports it)
  window.parent.postMessage({
    type: 'FILTER_UPDATED',
    payload: { date }
  }, '*');
});
```

#### Pattern 2: Bidirectional Sync

```
User interacts with Web Component
           ↓
Component emits event
           ↓
Host forwards to iframe
           ↓
iframe app responds with state update
           ↓
Host forwards back to Web Component
```

```javascript
// Host receives from picker
picker.addEventListener('dateChange', (event) => {
  const date = event.detail.date;
  
  // Ask iframe for current data matching this date
  embed.navigate(`/api/data?date=${date}`);
});

// Receive app state via postMessage (custom message)
window.addEventListener('message', (event) => {
  if (event.data.type === 'DATA_UPDATED') {
    // Forward to Web Component via DOM property
    picker.dataset.relatedData = JSON.stringify(event.data.payload);
  }
});

// Component could listen for attribute changes (custom implementation)
```

### Configuration

**Server-side:**
```
Content-Security-Policy:
  script-src 'self' https://app.yourorg.com;
  frame-ancestors https://client1.com
```

**Client-side CSP (embedded app domain):**
```
Content-Security-Policy:
  frame-ancestors https://client1.com
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────┐
│    Client Host Page (e.g., React App)      │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ <app-date-picker> Web Component    │  │ ← Standalone component
│  │  Emits: CustomEvent('dateChange')  │  │
│  └──────────┬──────────────────────────┘  │
│             │                              │
│             │ JavaScript Event            │
│             ↓                              │
│  ┌─────────────────────────────────────┐  │
│  │ Host JavaScript Event Listener      │  │ ← Sync logic
│  │  1. Extract date from event         │  │
│  │  2. Send postMessage to iframe      │  │
│  │  3. Listen for response              │  │
│  └──────────┬──────────────────────────┘  │
│             │                              │
│             │ postMessage                  │
│             ↓                              │
│  ┌─────────────────────────────────────┐  │
│  │  <iframe src="/"> (Full App)        │  │ ← iframe app
│  │   Receives: postMessage EVENT       │  │
│  │   Updates: Internal routing/state   │  │
│  │   Sends: postMessage RESPONSE       │  │
│  └──────────┬──────────────────────────┘  │
│             │                              │
│             └──────────────────────────────┘
└─────────────────────────────────────────────┘
```

### Considerations

⚠️ **Duplicate Runtime Cost**: Both the iframe app AND Web Components load separate Angular runtimes (~100KB each). This is expected with full isolation.

⚠️ **Version Drift**: If standalone component is pinned to v1.0.0 and iframe app is running v2.0.0 internally, behavior might diverge. Recommend clients pin both to the same version for consistency.

⚠️ **State Sync is Manual**: There's no built-in state sync between instances. The client's JavaScript code is the synchronization layer. Design this carefully to avoid inconsistencies.

## Scenario D: Multiple App Instances

**Rarely needed, but possible:** embedding the same app multiple times on one page.

### Use Case
- Dashboard with multiple independent "workspaces"
- Split-screen view
- Comparison view (same app, different data sets)

### Implementation

```html
<div class="workspace-left">
  <div id="app-left"></div>
</div>

<div class="workspace-right">
  <div id="app-right"></div>
</div>

<script>
  import { mountApp } from '@yourorg/embed-sdk';

  // Two independent app instances
  const appLeft = mountApp('#app-left', {
    src: 'https://app.yourorg.com',
    authToken: token
  });

  const appRight = mountApp('#app-right', {
    src: 'https://app.yourorg.com',
    authToken: token,
    initialPath: '/workspace-2'  // Start on different page
  });

  // Sync navigation between instances (optional)
  window.addEventListener('message', (event) => {
    if (event.data.type === 'ROUTE_CHANGE') {
      // Mirror navigation to the other instance
      if (event.source === appLeft.iframe) {
        appRight.navigate(event.data.payload.path);
      }
    }
  });
</script>
```

### Considerations
- ⚠️ Heavy on resources (two full app instances)
- ⚠️ Each instance has its own state (no automatic sync)
- ⚠️ Auth tokens apply to both, but they could drift

## Scenario E: Version Upgrade Path

**How to migrate clients from old to new versions without downtime.**

### Multi-Version Support

Route examples for this project:

- Local/dev (`ng serve`): root federation assets
- Versioned production: `/mfe/{version}/` (only after a post-build artifact organization step)

```
/remoteEntry.json                  ← Local/dev manifest
/DatePicker.js                     ← Local/dev DatePicker bundle
/DataGrid.js                       ← Local/dev DataGrid bundle

/mfe/v1.0.0/remoteEntry.json       ← Versioned production manifest
/mfe/v1.0.0/DatePicker.js          ← Versioned production DatePicker bundle
/mfe/v1.0.0/DataGrid.js            ← Versioned production DataGrid bundle
```

### Client Upgrade Options

**Option 1: Pinned Version (Recommended)**
```html
<!-- Client explicitly pins to v1.0.0 -->
<script type="module" 
  src="https://app.yourorg.com/mfe/v1.0.0/DatePicker.js">
</script>
```

**Client can upgrade whenever they choose:**
```html
<!-- Upgrade to v2.0.0 whenever ready -->
<script type="module" 
  src="https://app.yourorg.com/mfe/v2.0.0/DatePicker.js">
</script>
```

**Option 2: Latest (Not Recommended)**
```html
<!-- Auto-upgrades on every release (breaking changes possible) -->
<script type="module" 
  src="https://app.yourorg.com/mfe/latest/DatePicker.js">
</script>
```

### Migration Checklist

1. **Announce Version** — Publish release notes with breaking changes (if any)
2. **Maintain Old Version** — Keep v1.0.0 available indefinitely (static, cheap)
3. **Client Upgrade Window** — Give clients 3-6 months to migrate
4. **Monitor Usage** — Track which versions clients are using
5. **Deprecation Notice** — 3 months before removing a version, announce it
6. **Remove Version** (optional) — Only if truly no longer used

## Decision Tree

### Should I use Web Components or iframe?

```
Do you need the full app?
├─ YES → Use iframe (simpler, better isolated)
└─ NO → Need specific components?
    ├─ YES → Use Web Components (lighter, composable)
    └─ NO → Neither is needed for your use case
```

### Should I use both?

```
Do you need both the full app AND specific components?
├─ YES → 
│   ├─ Will they sync state? 
│   │  ├─ YES → Plan sync logic, use custom postMessage
│   │  └─ NO → Just mount both independently
│   └─ Acceptable to load 2x runtime (~100KB)?
│      ├─ YES → Go for it
│      └─ NO → Redesign to use only one mode
└─ NO → Use just one mode
```

## Deployment Checklist

For each consumption pattern a client uses:

- [ ] Web Components: Client has CDN/network access to `/mfe/{version}/` paths
- [ ] Web Components: Client has added component imports to their build
- [ ] iframe: Client has added CSP `frame-ancestors` with their domain
- [ ] iframe: Client has set up error handling via `onError` callback
- [ ] Both: Client has validated HTTPS URLs only
- [ ] Both: Client has tested with their target browsers/versions
- [ ] Both: Client has documented integration in their own docs
- [ ] Both: Security review completed (CSP, origin validation, token handling)

## Troubleshooting Multi-Client Scenarios

### "Components work in one client but not another"
- Check CSP headers — likely blocked by browser
- Verify origin validation — check `event.origin` in console
- Check network tab — ensure `/mfe/` paths are accessible

### "iframe works for client1 but not client2"
- Verify client2 domain is in `frame-ancestors` CSP
- Check that `src` URL is accessible from client2's network
- Ensure no firewall/proxy is stripping headers

### "iframe and Web Component state out of sync"
- This is expected (no automatic sync)
- Implement sync logic in client's JavaScript
- Consider using Redux/state management to centralize state

## Next Steps

- [Web Components Integration Guide](./web-components.md) — Web Component details
- [iframe Embedding Guide](./iframe-embedding.md) — iframe details
- [postMessage Protocol Reference](./postmessage-protocol.md) — Protocol spec
- [Security & CSP Configuration](./security.md) — Security best practices
