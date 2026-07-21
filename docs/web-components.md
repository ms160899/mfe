# Web Components Integration Guide

## Overview

The MFE Angular application exposes standalone, framework-agnostic components as **Web Components** via Native Federation. These components run in complete isolation — no shared framework runtime, no shared CSS, no shared services.

## Architecture Principles

### Full Isolation
- Each exposed component carries its own copy of Angular, RxJS, and Zone.js
- No dependency negotiation between host and component
- Shadow DOM (`ViewEncapsulation.ShadowDom`) provides **mandatory** style isolation
- No cross-boundary service/store access

### Communication Contract
- **Input**: DOM properties (objects/arrays) + HTML attributes (primitives)
- **Output**: CustomEvent (with `bubbles: true, composed: true`)
- **Nothing else** — no shared context, no service injection

## Available Components

### DatePicker (`app-date-picker`)

A powerful date selection component with full localization support.

#### Usage (React Example)
```jsx
import { useRef, useEffect } from 'react';

export function MyComponent() {
  const ref = useRef();

  useEffect(() => {
    const picker = ref.current;
    
    // Set config via DOM property (not attribute)
    picker.config = {
      locale: 'en-US',
      min: '2026-01-01',
      max: '2026-12-31'
    };

    // Listen for date changes
    const handleChange = (event) => {
      console.log('Date selected:', event.detail.date);
    };
    
    picker.addEventListener('dateChange', handleChange);

    return () => {
      picker.removeEventListener('dateChange', handleChange);
    };
  }, []);

  return <app-date-picker ref={ref}></app-date-picker>;
}
```

#### Usage (Vue Example)
```vue
<template>
  <app-date-picker
    ref="pickerRef"
    @dateChange="onDateChange"
  ></app-date-picker>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const pickerRef = ref();

onMounted(() => {
  // Set config via DOM property
  pickerRef.value.config = {
    locale: 'fr-FR',
    showWeekNumbers: true
  };
});

const onDateChange = (event) => {
  console.log('Selected:', event.detail);
};
</script>
```

#### Usage (Angular Example)
```typescript
@Component({
  selector: 'app-my-component',
  template: `<app-date-picker
    #picker
    (dateChange)="onDateChange($event)"
  ></app-date-picker>`
})
export class MyComponent {
  @ViewChild('picker') picker!: ElementRef;

  ngAfterViewInit() {
    // Set config as DOM property
    this.picker.nativeElement.config = {
      locale: 'de-DE',
      min: '2026-06-01'
    };
  }

  onDateChange(event: CustomEvent) {
    console.log('Date:', event.detail.date);
  }
}
```

#### Usage (Vanilla JavaScript Example)
```html
<script type="module" src="https://app.yourorg.com/mfe/v1.0.0/remoteEntry.json"></script>

<app-date-picker id="my-picker"></app-date-picker>

<script>
  const picker = document.getElementById('my-picker');
  
  picker.config = {
    locale: 'es-ES',
    min: '2026-01-01'
  };

  picker.addEventListener('dateChange', (event) => {
    console.log('Selected date:', event.detail.date);
  });
</script>
```

#### Component API

**Input Properties (set via DOM property, not attribute):**
```typescript
config: {
  locale?: string;              // e.g., 'en-US', 'de-DE'
  min?: string;                 // ISO 8601: '2026-01-01'
  max?: string;                 // ISO 8601: '2026-12-31'
  showWeekNumbers?: boolean;    // default: false
  firstDayOfWeek?: number;      // 0=Sun, 1=Mon, ... 6=Sat (default: 0)
  disabledDates?: string[];     // Array of ISO 8601 dates
}
```

**Output Events (CustomEvent):**
```typescript
// dateChange event
event.detail: {
  date: string;              // ISO 8601 format
  timestamp: number;         // milliseconds
  dateObject: Date;          // parsed Date object
}

// errorOccurred event
event.detail: {
  code: string;              // 'INVALID_CONFIG' | 'INVALID_DATE' | ...
  message: string;
  details?: object;
}
```

### DataGrid (`app-data-grid`)

A high-performance data grid with sorting, filtering, and pagination.

#### Usage (React Example)
```jsx
export function MyComponent() {
  const gridRef = useRef();

  useEffect(() => {
    const grid = gridRef.current;

    // Set columns
    grid.columns = [
      { field: 'id', header: 'ID', width: '80px', sortable: true },
      { field: 'name', header: 'Name', sortable: true, filterable: true },
      { field: 'email', header: 'Email', filterable: true },
      { field: 'created', header: 'Created', type: 'date', sortable: true }
    ];

    // Set data
    grid.dataSource = [
      { id: 1, name: 'Alice', email: 'alice@example.com', created: '2026-01-15' },
      { id: 2, name: 'Bob', email: 'bob@example.com', created: '2026-02-20' }
    ];

    // Set config
    grid.config = {
      pageSize: 10,
      paginated: true,
      sortable: true
    };

    // Listen for events
    grid.addEventListener('rowClick', (event) => {
      console.log('Row clicked:', event.detail.row);
    });

    grid.addEventListener('sortChange', (event) => {
      console.log('Sort changed:', event.detail);
    });
  }, []);

  return <app-data-grid ref={gridRef}></app-data-grid>;
}
```

#### Component API

**Input Properties:**
```typescript
dataSource: DataGridRow[];    // Array of row objects
columns: DataGridColumn[];    // Column definitions
config: {
  pageSize?: number;          // default: 10
  paginated?: boolean;        // default: true
  sortable?: boolean;         // default: false
  selectable?: boolean;       // default: false
  defaultSort?: {             // Initial sort state
    field: string;
    direction: 'asc' | 'desc';
  };
}
```

**Output Events:**
```typescript
// rowClick event
event.detail: {
  row: DataGridRow;
  rowIndex: number;
  field?: string;             // Clicked field if applicable
}

// sortChange event
event.detail: {
  field: string;
  direction: 'asc' | 'desc';
}

// selectionChange event
event.detail: {
  selectedRows: DataGridRow[];
  selectedIndices: number[];
}
```

## Critical Implementation Details

### ⚠️ Property vs. Attribute

This is the **#1 source of integration bugs**:

❌ **WRONG** — Setting complex objects as attributes:
```jsx
<app-date-picker config="{{ locale: 'en-US' }}"></app-date-picker>
```

✅ **CORRECT** — Setting complex objects as DOM properties:
```jsx
const picker = document.querySelector('app-date-picker');
picker.config = { locale: 'en-US' };
```

**Rule:**
- **Primitives** (strings, numbers, booleans) → HTML attributes
- **Objects/arrays** → DOM properties (never attributes)

### ⚠️ Event Bubbling

All custom elements emit CustomEvents with `composed: true`, which allows them to cross the Shadow DOM boundary:

```typescript
// In the component
const event = new CustomEvent('dateChange', {
  detail: payload,
  bubbles: true,
  composed: true  // CRITICAL — without this, host won't see the event
});
```

In your consumer code:
```jsx
// React
picker.addEventListener('dateChange', e => console.log(e.detail));

// Vue
@dateChange="onDateChange"

// Angular
(dateChange)="onDateChange($event)"
```

### Styling the Components

Each component uses Shadow DOM, so styles cannot leak in or out. To style a Web Component from the host page:

**Option 1: CSS Custom Properties (if exposed)**
```css
app-date-picker {
  --primary-color: #0066cc;
  --border-color: #e0e0e0;
  --text-color: #333;
}
```

**Option 2: ::part() pseudo-element (if exposed)**
```css
app-date-picker::part(header) {
  background: #f0f0f0;
}
```

**Note:** Not all components expose `::part()` or CSS variables. Check the component's documentation for available customization hooks.

## Loading Web Components

### Option 1: Script Module (Recommended for simple cases)
```html
<script type="module">
  import { bootstrapDatePickerElement } from 'https://app.yourorg.com/mfe/v1.0.0/date-picker-element.js';
  // Component is now available as <app-date-picker>
</script>

<app-date-picker id="my-picker"></app-date-picker>
```

### Option 2: Dynamic Import (ES6 Modules, Recommended for SPAs)
```typescript
async function loadDatePicker() {
  const module = await import('https://app.yourorg.com/mfe/v1.0.0/date-picker-element.js');
  return module.bootstrapDatePickerElement(injector); // Injector is framework-specific
}
```

### Option 3: Custom Elements Registry (Advanced)
```typescript
// Check if already defined
if (!customElements.get('app-date-picker')) {
  // Fetch and register
  const DatePickerElement = await import('...');
  // Define in registry
}
```

## Testing Web Components

### Unit Tests (Isolated)
```typescript
describe('DatePicker Component', () => {
  it('should emit dateChange event on date selection', (done) => {
    const picker = document.createElement('app-date-picker');
    
    picker.config = { locale: 'en-US' };
    
    picker.addEventListener('dateChange', (event: CustomEvent) => {
      expect(event.detail.date).toBeDefined();
      done();
    });

    document.body.appendChild(picker);
    // Simulate user interaction...
  });
});
```

### Integration Tests (With Host)
```typescript
describe('DatePicker in React App', () => {
  it('should update parent state on date change', async () => {
    // Mount a React component that uses the Web Component
    const { getByRole } = render(<MyApp />);
    
    // Interact with the Web Component through the React wrapper
    const picker = getByRole('grid');
    picker.config = { locale: 'en-US' };

    // Verify React state update
    expect(...).toBe(...);
  });
});
```

## Troubleshooting

### "Component not found" / "is not a registered custom element"
**Solution:** Ensure the script module was imported before using the element in HTML. Check network tab for 404s.

### Events not firing / Property changes not reflected
**Solution:** Ensure you're setting properties (via `element.prop = value`), not attributes (`<element prop="value">`).

### Styles leaking in or out
**Solution:** This shouldn't happen with `ViewEncapsulation.ShadowDom`. If it does, file a bug. Shadow DOM is a structural guarantee, not a convention.

### "Origin not allowed" errors in browser console
**Solution:** Check CSP headers on both host and component server. Ensure `script-src` allows the component origin.

## Performance Considerations

### Bundle Size
Each Web Component is independent, so every component bundle includes its own Angular runtime (~100KB gzipped). This is expected with `shared: {}`.

Monitor per-component bundle size:
```bash
npm run bundle-analyzer
```

### Lazy Loading
Load components only when needed:
```typescript
async function loadComponent(name: string) {
  const module = await import(`/.../mfe/v1.0.0/${name}-element.js`);
  return module; // Component is now available
}
```

### Change Detection
Zoneless change detection (`provideZonelessChangeDetection`) is enabled by default for faster performance. Ensure your app works correctly with `ChangeDetectionStrategy.OnPush` on all exposed components.

## Security Considerations

- **XSS Protection:** Inputs are HTML-encoded. Never use `innerHTML` or `dangerouslySetInnerHTML` unless the content is explicitly safe.
- **CSP Compliance:** All Web Components conform to CSP `script-src 'self'`. No inline scripts.
- **No Service Worker Caching Issues:** Web Components do not rely on service workers for functionality — they are self-contained.

## Version Management

Web Components are versioned at `/mfe/{version}/`. A client can pin to a specific version:

```html
<!-- Pin to v1.0.0 — never changes, safe for long-term embedding -->
<script type="module" src="https://app.yourorg.com/mfe/v1.0.0/date-picker-element.js"></script>

<!-- Consume latest (not recommended for production) -->
<script type="module" src="https://app.yourorg.com/mfe/latest/date-picker-element.js"></script>
```

Old versions are retained indefinitely, so a client's pinned URL never breaks.

## Next Steps

- [iframe Embedding Guide](./iframe-embedding.md) — For full-app embedding
- [postMessage Protocol Reference](./postmessage-protocol.md) — Detailed protocol spec
- [Security & CSP Configuration](./security.md) — Security best practices
- [Multi-Client Consumption Patterns](./multi-client-patterns.md) — Advanced scenarios
