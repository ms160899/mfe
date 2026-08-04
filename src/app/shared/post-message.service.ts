/**
 * postMessage Protocol Service
 *
 * Handles incoming/outgoing postMessage communication for iframe embedding.
 * Used internally by the embedded app to communicate with its host.
 *
 * Origin policy (open-embed design):
 * - When `allowedOrigins` is omitted the service accepts messages from ANY
 *   origin so that any host application can embed this app without extra
 *   configuration.  Message structure is still validated against the typed
 *   protocol contract via `isPostMessagePayload`.
 * - When `allowedOrigins` is supplied, only those origins are accepted and
 *   all others are silently dropped.
 */

import {
  PostMessagePayload,
  MessagePayloadMap,
  MessageType,
  isPostMessagePayload,
} from './post-message.types';

// Re-export so callers that previously imported these from this module keep
// working without changes.
export type { PostMessagePayload, MessagePayloadMap, MessageType };
export { isPostMessagePayload } from './post-message.types';

export interface PostMessageConfig {
  /**
   * Allowed origin(s) that can send messages to this app.
   * Omit (or pass an empty array) to accept messages from any origin —
   * required when the set of embedding hosts is open / not known at build time.
   */
  allowedOrigins?: string[];

  /** Callback when 'THEME' message received */
  onThemeChange?: (theme: 'light' | 'dark') => void;

  /** Callback when 'LOCALE' message received */
  onLocaleChange?: (locale: string) => void;

  /** Callback when 'AUTH_TOKEN' message received */
  onAuthTokenReceived?: (token: string) => void;

  /** Callback when 'NAVIGATE' message received */
  onNavigate?: (path: string) => void;

  /** Callback for all validated incoming messages (for custom handling) */
  onMessage?: (payload: PostMessagePayload) => void;
}

export class PostMessageService {
  private config: PostMessageConfig;
  /** Null means open-embed mode: accept from any origin. */
  private allowedOrigins: string[] | null;
  private isInIframe: boolean;
  private boundMessageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(config: PostMessageConfig = {}) {
    this.config = config;
    this.isInIframe = window.self !== window.top;

    // null = open-embed (any host allowed); non-empty array = strict allowlist.
    this.allowedOrigins =
      config.allowedOrigins && config.allowedOrigins.length > 0
        ? config.allowedOrigins
        : null;

    // Only initialise listeners when running inside an iframe.
    if (this.isInIframe) {
      this.setupMessageListener();
      this.notifyReady();
    }
  }

  private setupMessageListener() {
    this.boundMessageHandler = (event: MessageEvent) => {
      // Origin check — CRITICAL SECURITY CONTROL.
      // Skipped only in open-embed mode (allowedOrigins not configured).
      if (this.allowedOrigins !== null && !this.allowedOrigins.includes(event.origin)) {
        console.warn(`[PostMessage] Rejected message from unauthorized origin: ${event.origin}`);
        return;
      }

      // Structural validation against the typed protocol contract.
      if (!isPostMessagePayload(event.data)) {
        return;
      }

      const payload: PostMessagePayload = event.data;
      this.handleMessage(payload);
      this.config.onMessage?.(payload);
    };
    window.addEventListener('message', this.boundMessageHandler);
  }

  private handleMessage(payload: PostMessagePayload) {
    switch (payload.type) {
      case 'THEME':
        this.config.onThemeChange?.(payload.payload.theme);
        break;
      case 'LOCALE':
        this.config.onLocaleChange?.(payload.payload.locale);
        break;
      case 'AUTH_TOKEN':
        this.config.onAuthTokenReceived?.(payload.payload.token);
        break;
      case 'NAVIGATE':
        this.config.onNavigate?.(payload.payload.path);
        break;
      default:
        break;
    }
  }

  private notifyReady() {
    this.send('READY', { timestamp: Date.now() });
  }

  /**
   * Send a typed message to the host frame.
   * Uses '*' as the target origin because this app doesn't know which host is
   * embedding it.  The host is responsible for validating messages it receives.
   */
  send<T extends MessageType>(type: T, payload: MessagePayloadMap[T]) {
    if (!this.isInIframe) {
      console.warn('[PostMessage] Not in iframe, cannot send message');
      return;
    }

    const message: PostMessagePayload = { type, payload, timestamp: Date.now() } as PostMessagePayload;
    window.parent.postMessage(message, '*');
  }

  notifyHeightChange(height: number) {
    this.send('HEIGHT_CHANGE', { height });
  }

  notifyError(code: string, message: string, details?: unknown) {
    this.send('ERROR', { code, message, details });
  }

  notifyRouteChange(path: string) {
    this.send('ROUTE_CHANGE', { path });
  }

  destroy() {
    if (this.boundMessageHandler) {
      window.removeEventListener('message', this.boundMessageHandler);
      this.boundMessageHandler = null;
    }
  }
}

/**
 * Singleton instance for the embedded app
 */
let postMessageServiceInstance: PostMessageService | null = null;

/**
 * Get or create the PostMessageService singleton
 */
export function getPostMessageService(config?: PostMessageConfig): PostMessageService {
  if (!postMessageServiceInstance) {
    postMessageServiceInstance = new PostMessageService(config);
  }
  return postMessageServiceInstance;
}
