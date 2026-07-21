/**
 * DatePicker Component Public Contract
 * 
 * All consumers of this Web Component MUST conform to these interfaces.
 * They define the complete, immutable communication surface.
 */

export interface DatePickerConfig {
  /**
   * BCP 47 language tag for localization
   * @example 'en-US', 'de-DE', 'fr-FR'
   */
  locale?: string;

  /**
   * Minimum selectable date (ISO 8601 format)
   * @example '2026-01-01'
   */
  min?: string;

  /**
   * Maximum selectable date (ISO 8601 format)
   * @example '2026-12-31'
   */
  max?: string;

  /**
   * Whether to show week numbers
   */
  showWeekNumbers?: boolean;

  /**
   * Starting day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
   */
  firstDayOfWeek?: number;

  /**
   * Disabled dates in ISO 8601 format
   */
  disabledDates?: string[];
}

export interface DateChangeEvent {
  /**
   * Selected date in ISO 8601 format
   * @example '2026-06-15'
   */
  date: string;

  /**
   * Timestamp in milliseconds
   */
  timestamp: number;

  /**
   * Parsed date object for convenience
   */
  dateObject: Date;
}

export interface DatePickerErrorEvent {
  code: 'INVALID_CONFIG' | 'INVALID_DATE' | 'OUT_OF_RANGE' | 'UNKNOWN';
  message: string;
  details?: Record<string, any>;
}
