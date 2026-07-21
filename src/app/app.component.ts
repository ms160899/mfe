import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-container">
      <header>
        <h1>🚀 MFE - Multi-Framework Distribution Hub</h1>
        <p>Framework-agnostic Web Components & iframe Embedding</p>
      </header>

      <main>
        <section class="intro">
          <h2>Architecture Overview</h2>
          <p>
            This Angular application demonstrates two complementary consumption patterns:
          </p>
          <ul>
            <li><strong>Web Components via Native Federation</strong> — Standalone, isolated components for any framework</li>
            <li><strong>Full-App iframe Embedding</strong> — Complete app with postMessage protocol</li>
          </ul>
        </section>

        <section class="components">
          <h2>Exposed Web Components</h2>
          <div class="component-grid">
            <div class="component-card">
              <h3>📅 DatePicker</h3>
              <p>A powerful, isolated date selection component with full localization support.</p>
              <pre><code>&lt;app-date-picker 
  [config]="{{ '{' }}locale: 'en-US', min: '2026-01-01'{{ '}' }}"
  (dateChange)="onDateChange($event)"&gt;
&lt;/app-date-picker&gt;</code></pre>
            </div>
            <div class="component-card">
              <h3>📊 DataGrid</h3>
              <p>A high-performance data grid component with sorting, filtering, and pagination.</p>
              <pre><code>&lt;app-data-grid 
  [dataSource]="gridData"
  [columns]="gridColumns"
  (rowClick)="onRowClick($event)"&gt;
&lt;/app-data-grid&gt;</code></pre>
            </div>
          </div>
        </section>

        <section class="paths">
          <h2>Available Paths</h2>
          <ul>
            <li><strong>/</strong> — Full SPA app (iframe-embeddable)</li>
            <li><strong>/mfe/v1.0.0/remoteEntry.json</strong> — Federation manifest</li>
            <li><strong>/mfe/v1.0.0/date-picker-element-*.js</strong> — DatePicker Web Component</li>
            <li><strong>/mfe/v1.0.0/data-grid-element-*.js</strong> — DataGrid Web Component</li>
            <li><strong>/embed-sdk.js</strong> — Embed SDK for iframe integration</li>
          </ul>
        </section>

        <section class="docs">
          <h2>Documentation & Resources</h2>
          <ul>
            <li><a href="/docs/web-components.md" target="_blank">Web Components Integration Guide</a></li>
            <li><a href="/docs/iframe-embedding.md" target="_blank">iframe Embedding Guide</a></li>
            <li><a href="/docs/postmessage-protocol.md" target="_blank">postMessage Protocol Reference</a></li>
            <li><a href="/docs/security.md" target="_blank">Security & CSP Configuration</a></li>
            <li><a href="/docs/multi-client-patterns.md" target="_blank">Multi-Client Consumption Patterns</a></li>
          </ul>
        </section>
      </main>

      <footer>
        <p>&copy; 2026 MFE Architecture. Full isolation, framework-agnostic, production-ready.</p>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #e0e0e0;

      h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        color: #222;
      }

      p {
        font-size: 1.1rem;
        color: #666;
      }
    }

    main {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      h2 {
        font-size: 1.8rem;
        margin-bottom: 1rem;
        color: #333;
      }

      p, li {
        line-height: 1.6;
        color: #555;
        margin-bottom: 0.5rem;
      }

      ul {
        list-style: none;
        padding-left: 1rem;

        li {
          margin-bottom: 0.75rem;

          &:before {
            content: '✓ ';
            color: #4CAF50;
            font-weight: bold;
            margin-right: 0.5rem;
          }
        }
      }
    }

    .component-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .component-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;

      &:hover {
        border-color: #0066cc;
        box-shadow: 0 4px 16px rgba(0, 102, 204, 0.15);
      }

      h3 {
        font-size: 1.3rem;
        margin-bottom: 0.5rem;
        color: #222;
      }

      p {
        font-size: 0.95rem;
        margin-bottom: 1rem;
        color: #666;
      }

      pre {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;

        code {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.85rem;
          color: #d73a49;
        }
      }
    }

    .docs {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2, p, a {
        color: white;
      }

      a {
        text-decoration: underline;
        font-weight: bold;

        &:hover {
          opacity: 0.8;
        }
      }

      ul li:before {
        color: #fff;
      }
    }

    footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 0.9rem;
    }
  `]
})
export class AppComponent {
  title = 'mfe-app';
}
