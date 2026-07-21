# MFE Angular Application — Framework-Agnostic Distribution

**A production-ready Angular application exposing components as standalone Web Components via Native Federation and enabling full-app iframe embedding, all from a single origin with zero shared dependencies.**

## Architecture

```
Single Origin (e.g., https://app.yourorg.com)
├── /                          ← SPA (iframe-embeddable)
├── /mfe/v1.0.0/
│   ├── remoteEntry.json       ← Federation manifest
│   ├── date-picker-*.js       ← DatePicker Web Component
│   └── data-grid-*.js         ← DataGrid Web Component
└── /embed-sdk.js              ← iframe Integration SDK
```

## Two Consumption Modes

### 1️⃣ Web Components (Standalone, Framework-Agnostic)

```html
<script type="module" src="https://app.yourorg.com/mfe/v1.0.0/date-picker-element.js"></script>

<app-date-picker id="my-picker"></app-date-picker>

<script>
  const picker = document.getElementById('my-picker');
  picker.config = { locale: 'en-US', min: '2026-01-01' };
  picker.addEventListener('dateChange', (e) => console.log(e.detail.date));
</script>
```

**Consumption support:** React, Vue, Angular, vanilla JS, any framework

### 2️⃣ iframe Embedding (Full App Isolation)

```html
<div id="app-container"></div>

<script src="https://app.yourorg.com/embed-sdk.js"></script>
<script>
  const { mountApp } = window;
  mountApp('#app-container', { 
    src: 'https://app.yourorg.com',
    theme: 'dark',
    authToken: myToken
  });
</script>
```

**Communication:** postMessage protocol (HEIGHT_CHANGE, AUTH_TOKEN, THEME, LOCALE, NAVIGATE, ERROR)

## Key Features

✅ **Full Isolation** — No shared dependencies, no shared runtime, no shared CSS  
✅ **Shadow DOM** — Mandatory style encapsulation, zero CSS leakage  
✅ **Framework-Agnostic** — Works with React, Vue, Angular, vanilla JS  
✅ **Same-Origin** — No CORS complexity, single deployment  
✅ **Security-First** — CSP, origin validation, no token in URLs  
✅ **Versioned Paths** — `/mfe/{version}/` keeps old clients working  
✅ **Production-Ready** — Zoneless change detection, bundle-size budgets, E2E tests  
✅ **Multi-Mode Clients** — Use iframe only, Web Components only, or both simultaneously  

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Angular CLI 17+

### Installation

```bash
# Install dependencies
npm install

# Serve development environment
npm start

# Build for production
npm run build

# Analyze bundle size
npm run bundle-analyzer
```

## Project Structure

```
src/
├── app/
│   ├── app.component.ts               ← Main app (SPA)
│   ├── app.routes.ts                  ← Routing
│   ├── date-picker/
│   │   ├── date-picker.component.ts   ← Component implementation
│   │   ├── date-picker.types.ts       ← Public contract (types)
│   │   └── date-picker-element.ts     ← Web Component bootstrap
│   ├── data-grid/
│   │   ├── data-grid.component.ts
│   │   ├── data-grid.types.ts
│   │   └── data-grid-element.ts
│   └── shared/
│       └── post-message.service.ts    ← iframe communication
├── embed-sdk.ts                       ← SDK for embedding
├── main.ts                            ← Entry point
├── index.html                         ← App shell
└── styles.scss                        ← Global styles
docs/
├── web-components.md                  ← Web Component guide
├── iframe-embedding.md                ← iframe guide
├── postmessage-protocol.md            ← Protocol spec
├── security.md                        ← Security best practices
└── multi-client-patterns.md           ← Advanced scenarios
federation.config.js                   ← Native Federation config
angular.json                           ← Angular build config
package.json                           ← Dependencies
tsconfig.json                          ← TypeScript config
```

## Build Output

After running `npm run build`, the dist folder contains:

```
dist/browser/
├── index.html                         ← App shell (root)
├── main-ABC123.js, chunk-*.js         ← App bundles
├── assets/                            ← Static files
├── embed-sdk.js                       ← iframe SDK (transpiled)
└── mfe/v1.0.0/                        ← Federation remote
    ├── remoteEntry.json
    ├── date-picker-element-ABC.js
    └── data-grid-element-XYZ.js
```

**Deployment:**
- Upload `dist/browser/` to your origin CDN
- Post-build script moves federation chunks under `mfe/{version}/`

## Configuration

### Environment Variables

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.yourorg.com',
  allowedOrigins: [
    'https://client1.com',
    'https://client2.com'
  ]
};
```

### CSP Headers

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  frame-ancestors https://client1.com https://client2.com;
  connect-src 'self' https://api.yourorg.com
```

### Federation Config

Edit `federation.config.js` to add more exposed components:

```javascript
module.exports = withNativeFederation({
  name: 'mfe-app-remote',
  exposes: {
    './DatePicker': './src/app/date-picker/date-picker-element.ts',
    './DataGrid': './src/app/data-grid/data-grid-element.ts',
    // Add more: './MyComponent': './src/app/my-component/my-component-element.ts'
  },
  shared: {}, // Full isolation — no shared deps
});
```

## Documentation

- **[Web Components Integration Guide](./docs/web-components.md)** — How to consume components in React, Vue, Angular, or vanilla JS
- **[iframe Embedding Guide](./docs/iframe-embedding.md)** — How to embed the full app with the SDK
- **[postMessage Protocol Reference](./docs/postmessage-protocol.md)** — Detailed protocol specification
- **[Security & CSP Configuration](./docs/security.md)** — Security best practices
- **[Multi-Client Consumption Patterns](./docs/multi-client-patterns.md)** — Real-world scenarios

## Component API Reference

### DatePicker (`app-date-picker`)

```typescript
// Input
config: { locale: 'en-US', min: '2026-01-01', max: '2026-12-31', ... }

// Output Events
addEventListener('dateChange', (e) => console.log(e.detail.date))
addEventListener('errorOccurred', (e) => console.log(e.detail.code))
```

[Full DatePicker API →](./docs/web-components.md#datepicker-app-date-picker)

### DataGrid (`app-data-grid`)

```typescript
// Input
dataSource: Array<RowObject>
columns: Array<ColumnDefinition>
config: { pageSize: 10, paginated: true, sortable: true, ... }

// Output Events
addEventListener('rowClick', (e) => console.log(e.detail.row))
addEventListener('sortChange', (e) => console.log(e.detail.field))
```

[Full DataGrid API →](./docs/web-components.md#datagrid-app-data-grid)

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Lint
npm run lint
```

## Security

🔐 **Critical Security Points:**

1. **CSP Headers** — Always use explicit `frame-ancestors`, never `'*'`
2. **Origin Validation** — Validate `event.origin` on all postMessage listeners
3. **Token Handling** — Send auth tokens via postMessage, never in URL
4. **HTTPS Only** — Production must use HTTPS
5. **Input Sanitization** — Never use `innerHTML` on user input

[Security Guide →](./docs/security.md)

## Performance

- **Bundle Size per Component** — ~150KB (includes Angular runtime)
- **Zoneless Change Detection** — Enabled for smaller bundles
- **Shadow DOM** — Mandatory on all exposed components
- **Bundle Analyzer** — `npm run bundle-analyzer` to identify large deps

## Deployment

### Development

```bash
npm start
# App runs at http://localhost:4200
# Web Components available at http://localhost:4200/mfe/v1.0.0/
```

### Production

```bash
npm run build
# Post-build: Move remoteEntry + chunks to dist/browser/mfe/{version}/
npm run deploy -- --config=production
```

### Version Management

- **New Release:** Create version tag (e.g., `v1.0.1`)
- **Build:** `npm run build` produces `v1.0.1` artifacts
- **Deploy:** Upload `dist/browser/` to CDN
- **Cache Headers:**
  - `index.html` — `no-cache` (always revalidate)
  - `/mfe/v1.0.1/*.js` — `immutable, max-age=31536000` (1 year)
  - `embed-sdk.js` — `max-age=3600` (1 hour)
- **Old Versions:** Kept indefinitely, never deleted

## Architecture Decisions (Locked)

These decisions were made during planning and should not be changed without significant effort:

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Hosting** | Single origin, path-based split | Simpler, no CORS, single deployment |
| **Build** | Single `ng build` via Native Federation | One invocation produces both outputs |
| **Isolation** | Full (`shared: {}`) | No version negotiation, clear contracts |
| **Style Boundary** | Shadow DOM (mandatory) | Prevents CSS leakage in both directions |
| **Communication** | Properties + Events (Web Components) / postMessage (iframe) | Clean, documented, framework-agnostic |
| **Change Detection** | Zoneless (default) | Smaller bundles, faster performance |
| **Version Paths** | `/mfe/{version}/` | Clients can pin, old versions never break |

## Contributing

1. **Feature Branch** — Create a branch from `main`
2. **Components** — Follow standalone component patterns (Shadow DOM mandatory)
3. **Tests** — Add unit + E2E tests for new components
4. **Bundle Size** — Check `npm run bundle-analyzer` before PR
5. **Documentation** — Update docs if contracts change
6. **PR Review** — Ensure CSP, origin validation, and security practices are followed

## Troubleshooting

### "Component not registered"
Ensure the Web Component bootstrap script was imported before using the element.

### "postMessage not working"
Verify origin validation — check that `event.origin` matches expected host domain.

### "Styles not applying"
Shadow DOM prevents external styles. Use CSS variables or ::part() if exposed.

### "token leaking in logs"
Never pass token in URL. Use postMessage:
```javascript
embed.setAuthToken(token);  // ✅ Correct
// NOT: src="...?token=..." // ❌ Wrong
```

[More troubleshooting →](./docs/)

## License

[Your License Here]

## Support

For questions or issues:

1. Check the [documentation](./docs/)
2. Review [security best practices](./docs/security.md)
3. See [consumption patterns](./docs/multi-client-patterns.md) for your use case
4. Open a GitHub issue

---

**Built with Angular 17 + Native Federation + Shadow DOM. Designed for production, tested for security, ready for scale.**
