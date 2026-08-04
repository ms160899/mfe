/**
 * Shared postMessage protocol types.
 *
 * Used by both the embedded child app (PostMessageService) and the host-side
 * Embed SDK so the protocol contract is defined in exactly one place.
 */

// ---------------------------------------------------------------------------
// Per-message payload shapes
// ---------------------------------------------------------------------------

export interface ThemePayload       { theme: 'light' | 'dark'; }
export interface LocalePayload      { locale: string; }
export interface AuthTokenPayload   { token: string; }
export interface NavigatePayload    { path: string; }
export interface HeightChangePayload { height: number; }
export interface RouteChangePayload { path: string; }
export interface ReadyPayload       { timestamp: number; }
export interface ErrorPayload       { code: string; message: string; details?: unknown; }

// ---------------------------------------------------------------------------
// Protocol map — single source of truth for all message types
// ---------------------------------------------------------------------------

export interface MessagePayloadMap {
  THEME:         ThemePayload;
  LOCALE:        LocalePayload;
  AUTH_TOKEN:    AuthTokenPayload;
  NAVIGATE:      NavigatePayload;
  HEIGHT_CHANGE: HeightChangePayload;
  ROUTE_CHANGE:  RouteChangePayload;
  READY:         ReadyPayload;
  ERROR:         ErrorPayload;
}

export type MessageType = keyof MessagePayloadMap;

// ---------------------------------------------------------------------------
// Discriminated union — narrows payload type from the `type` discriminant
// ---------------------------------------------------------------------------

export type PostMessagePayload = {
  [K in MessageType]: { type: K; payload: MessagePayloadMap[K]; timestamp: number };
}[MessageType];

// ---------------------------------------------------------------------------
// Runtime guard — validates that an unknown value is a well-formed protocol
// message before it is dispatched to handlers.
// ---------------------------------------------------------------------------

const KNOWN_TYPES = new Set<string>([
  'THEME', 'LOCALE', 'AUTH_TOKEN', 'NAVIGATE',
  'HEIGHT_CHANGE', 'ROUTE_CHANGE', 'READY', 'ERROR',
]);

export function isPostMessagePayload(value: unknown): value is PostMessagePayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['type'] === 'string' &&
    KNOWN_TYPES.has(v['type']) &&
    v['payload'] !== undefined &&
    typeof v['timestamp'] === 'number'
  );
}
