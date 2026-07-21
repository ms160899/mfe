/**
 * postMessage Protocol Service
 * 
 * Handles incoming/outgoing postMessage communication for iframe embedding.
 * Used internally by the embedded app to communicate with its host.
 */

export interface PostMessagePayload {
  type: string;
  payload: any;
  timestamp: number;
}

export interface PostMessageConfig {
  /**
   * Allowed origin(s) that can send/receive messages
   * Defaults to the app's own origin
   */
  allowedOrigins?: string[];

  /**
   * Callback when 'THEME' message received
   */
  onThemeChange?: (theme: 'light' | 'dark') => void;

  /**
   * Callback when 'LOCALE' message received
   */
  onLocaleChange?: (locale: string) => void;

  /**
   * Callback when 'AUTH_TOKEN' message received
   */
  onAuthTokenReceived?: (token: string) => void;

  /**
   * Callback when 'NAVIGATE' message received
   */
  onNavigate?: (path: string) => void;

  /**
   * Callback for all incoming messages (for custom handling)
   */
  onMessage?: (payload: PostMessagePayload) => void;
}

export class PostMessageService {
  private config: PostMessageConfig;
  private allowedOrigins: string[];
  private isInIframe: boolean;

  constructor(config: PostMessageConfig = {}) {
    this.config = config;
    this.isInIframe = window.self !== window.top;
    
    // Default to current origin if not in iframe, otherwise allow all same-origin
    this.allowedOrigins = config.allowedOrigins || [window.location.origin];
    
    // Only initialize listeners if running in an iframe
    if (this.isInIframe) {
      this.setupMessageListener();
      this.notifyReady();
    }
  }

  /**
   * Setup the message listener on the window
   */
  private setupMessageListener() {
    window.addEventListener('message', (event: MessageEvent) => {
      // Validate origin — CRITICAL SECURITY CONTROL
      if (!this.allowedOrigins.includes(event.origin)) {
        console.warn(`[PostMessage] Rejected message from unauthorized origin: ${event.origin}`);
        return;
      }

      const payload: PostMessagePayload = event.data;
      
      // Basic validation
      if (!payload || typeof payload !== 'object' || !payload.type) {
        return;
      }

      // Dispatch to handlers
      this.handleMessage(payload);

      // Custom handler
      this.config.onMessage?.(payload);
    });
  }

  /**
   * Route incoming messages to appropriate handlers
   */
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
        // Unhandled message type
        break;
    }
  }

  /**
   * Notify the host that the embedded app is ready
   */
  private notifyReady() {
    this.send('READY', { timestamp: Date.now() });
  }

  /**
   * Send a message to the host
   */
  send(type: string, payload: any) {
    if (!this.isInIframe) {
      console.warn('[PostMessage] Not in iframe, cannot send message');
      return;
    }

    const message: PostMessagePayload = {
      type,
      payload,
      timestamp: Date.now()
    };

    // Always use '*' when the app doesn't know its embedder origin
    // The embedder validates the sender, so this is safe
    const targetOrigin = this.allowedOrigins[0] || '*';
    window.parent.postMessage(message, targetOrigin);
  }

  /**
   * Notify host that content height changed (for auto-resize)
   */
  notifyHeightChange(height: number) {
    this.send('HEIGHT_CHANGE', { height });
  }

  /**
   * Notify host of an error
   */
  notifyError(code: string, message: string, details?: any) {
    this.send('ERROR', { code, message, details });
  }

  /**
   * Notify host of route/navigation change
   */
  notifyRouteChange(path: string) {
    this.send('ROUTE_CHANGE', { path });
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
