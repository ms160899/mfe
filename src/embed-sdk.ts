/**
 * Embed SDK for iframe Integration
 *
 * Wraps the iframe creation + postMessage protocol for safe, framework-agnostic embedding.
 *
 * Usage:
 * import { mountApp } from '@app/embed-sdk';
 * mountApp('#container', { src: 'https://app.yourorg.com', theme: 'dark' });
 */

import {
  PostMessagePayload,
  MessagePayloadMap,
  MessageType,
  isPostMessagePayload,
} from './app/shared/post-message.types';

export type { PostMessagePayload, MessagePayloadMap, MessageType };


export interface EmbedConfig {
  /**
   * Source URL of the embedded app (same-origin only)
   */
  src: string;

  /**
   * CSS selector or HTMLElement where iframe will be mounted
   */
  container?: string | HTMLElement;

  /**
   * Theme ('light' | 'dark')
   */
  theme?: 'light' | 'dark';

  /**
   * BCP 47 language tag
   */
  locale?: string;

  /**
   * Auth token for the embedded app
   */
  authToken?: string;

  /**
   * Initial route/path to navigate to
   */
  initialPath?: string;

  /**
   * Whether iframe should auto-resize based on content height
   */
  autoResize?: boolean;

  /**
   * Maximum height for the iframe
   */
  maxHeight?: string;

  /**
   * Callback when iframe is ready
   */
  onReady?: () => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: EmbedError) => void;

  /**
   * Callback when height changes (if autoResize enabled)
   */
  onHeightChange?: (height: number) => void;
}

export interface EmbedError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Mount the embedded app in a container
 */
export function mountApp(containerSelector: string | HTMLElement, config: EmbedConfig): EmbedInstance {
  const container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector) as HTMLElement
    : containerSelector;

  if (!container) {
    throw new Error(`Container not found: ${containerSelector}`);
  }

  return new EmbedInstance(container, config);
}

/**
 * EmbedInstance manages a single embedded app lifecycle
 */
export class EmbedInstance {
  private iframe: HTMLIFrameElement | null = null;
  private config: EmbedConfig;
  private container: HTMLElement;
  private messageQueue: PostMessagePayload[] = [];
  private isReady = false;
  private allowedOrigins: string[] = [];
  private boundMessageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(container: HTMLElement, config: EmbedConfig) {
    this.container = container;
    this.config = { autoResize: true, ...config };
    this.extractAllowedOrigin();
    this.createIframe();
    this.setupMessageListener();
  }

  /**
   * Extract origin from config.src for validation
   */
  private extractAllowedOrigin() {
    try {
      const url = new URL(this.config.src);
      this.allowedOrigins = [url.origin];
    } catch (e) {
      console.warn('Invalid src URL:', this.config.src);
      this.allowedOrigins = [window.location.origin];
    }
  }

  /**
   * Create and configure the iframe element
   */
  private createIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.config.src;
    this.iframe.title = 'Embedded Application';
    
    // Security: minimal sandbox, rely on origin validation
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    
    // Styling
    this.iframe.style.width = '100%';
    this.iframe.style.height = this.config.maxHeight || '600px';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '8px';
    this.iframe.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

    // Events
    this.iframe.addEventListener('load', () => this.onIframeLoaded());
    this.iframe.addEventListener('error', () => this.onIframeError());

    this.container.appendChild(this.iframe);
  }

  /**
   * Handle iframe load event
   */
  private onIframeLoaded() {
    const targetOrigin = this.allowedOrigins[0] ?? '*';

    // Flush queued messages that were sent before the iframe was ready.
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.iframe!.contentWindow!.postMessage(msg, targetOrigin);
    }

    // Send initial config
    if (this.config.authToken) {
      this.send('AUTH_TOKEN', { token: this.config.authToken });
    }
    if (this.config.theme) {
      this.send('THEME', { theme: this.config.theme });
    }
    if (this.config.locale) {
      this.send('LOCALE', { locale: this.config.locale });
    }
    if (this.config.initialPath) {
      this.send('NAVIGATE', { path: this.config.initialPath });
    }

    this.isReady = true;
    this.config.onReady?.();
  }

  /**
   * Handle iframe error
   */
  private onIframeError() {
    const error: EmbedError = {
      code: 'IFRAME_LOAD_ERROR',
      message: 'Failed to load embedded application'
    };
    this.config.onError?.(error);
  }

  /**
   * Setup postMessage listener
   */
  private setupMessageListener() {
    this.boundMessageHandler = (event: MessageEvent) => {
      // Origin check — CRITICAL SECURITY CONTROL.
      // The SDK always knows the embedded app's origin (derived from config.src).
      if (!this.allowedOrigins.includes(event.origin)) {
        console.warn(`Rejecting message from unauthorized origin: ${event.origin}`);
        return;
      }

      // Source check — must come from our iframe, not another frame on the page.
      if (event.source !== this.iframe?.contentWindow) {
        return;
      }

      // Structural validation against the typed protocol contract.
      if (!isPostMessagePayload(event.data)) {
        return;
      }

      this.handleMessage(event.data);
    };
    window.addEventListener('message', this.boundMessageHandler);
  }

  /**
   * Handle incoming messages from iframe
   */
  private handleMessage(payload: PostMessagePayload) {
    switch (payload.type) {
      case 'HEIGHT_CHANGE':
        if (this.config.autoResize && this.iframe) {
          this.iframe.style.height = `${payload.payload.height}px`;
          this.config.onHeightChange?.(payload.payload.height);
        }
        break;

      case 'NAVIGATE':
      case 'ROUTE_CHANGE':
        console.log('Route changed in embedded app:', payload.payload.path);
        break;

      case 'ERROR':
        this.config.onError?.(payload.payload as EmbedError);
        break;

      default:
        break;
    }
  }

  /**
   * Send a typed message to the iframe.
   * The target origin is always the embedded app's own origin (derived from
   * config.src), so messages are never broadcast to unintended frames.
   */
  private send<T extends MessageType>(type: T, data: MessagePayloadMap[T]) {
    const message = { type, payload: data, timestamp: Date.now() } as PostMessagePayload;
    const targetOrigin = this.allowedOrigins[0] ?? '*';

    if (!this.iframe?.contentWindow) {
      this.messageQueue.push(message);
      return;
    }

    this.iframe.contentWindow.postMessage(message, targetOrigin);
  }

  /**
   * Public API: Set theme
   */
  setTheme(theme: 'light' | 'dark') {
    this.config.theme = theme;
    this.send('THEME', { theme });
  }

  /**
   * Public API: Set locale
   */
  setLocale(locale: string) {
    this.config.locale = locale;
    this.send('LOCALE', { locale });
  }

  /**
   * Public API: Set auth token
   */
  setAuthToken(token: string) {
    this.config.authToken = token;
    this.send('AUTH_TOKEN', { token });
  }

  /**
   * Public API: Navigate to path
   */
  navigate(path: string) {
    this.send('NAVIGATE', { path });
  }

  /**
   * Public API: Destroy the embed
   */
  destroy() {
    if (this.boundMessageHandler) {
      window.removeEventListener('message', this.boundMessageHandler);
      this.boundMessageHandler = null;
    }
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    this.isReady = false;
    this.messageQueue = [];
  }
}
