import { Component, EventEmitter, Input, Output, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePickerConfig, DateChangeEvent, DatePickerErrorEvent } from './date-picker.types';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="date-picker-container">
      <div class="date-picker-header">
        <button (click)="previousMonth()" aria-label="Previous month">
          ← Prev
        </button>
        <h3>{{ displayMonth }}</h3>
        <button (click)="nextMonth()" aria-label="Next month">
          Next →
        </button>
      </div>

      <div class="date-picker-weekdays">
        <div class="weekday" *ngFor="let day of weekdayLabels">
          {{ day }}
        </div>
      </div>

      <div class="date-picker-days">
        <button
          *ngFor="let day of calendarDays"
          [class.empty]="!day.isCurrentMonth"
          [class.selected]="day.isSelected"
          [class.disabled]="day.isDisabled"
          [disabled]="day.isDisabled || !day.isCurrentMonth"
          (click)="selectDate(day)"
          [attr.aria-label]="day.dateString"
        >
          {{ day.day }}
        </button>
      </div>

      <div class="date-picker-footer" *ngIf="selectedDate">
        <strong>Selected:</strong> {{ selectedDate | date: 'fullDate' : undefined : locale }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary-color: #0066cc;
      --border-color: #e0e0e0;
      --hover-bg: #f5f5f5;
      --disabled-color: #ccc;
      --text-color: #333;
    }

    .date-picker-container {
      font-family: inherit;
      color: var(--text-color);
      user-select: none;
      padding: 1rem;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      max-width: 320px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .date-picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      button {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 0.5rem;
        font-weight: bold;

        &:hover {
          text-decoration: underline;
        }

        &:disabled {
          color: var(--disabled-color);
          cursor: not-allowed;
        }
      }
    }

    .date-picker-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 0.5rem;
      font-weight: bold;
      font-size: 0.85rem;
      text-align: center;
    }

    .weekday {
      padding: 0.5rem;
      color: #666;
    }

    .date-picker-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 1rem;

      button {
        aspect-ratio: 1;
        border: 1px solid transparent;
        background: white;
        color: inherit;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.9rem;
        transition: all 0.2s;

        &:hover:not(.disabled):not(.empty) {
          background: var(--hover-bg);
          border-color: var(--primary-color);
        }

        &.selected {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
          font-weight: bold;
        }

        &.disabled {
          color: var(--disabled-color);
          cursor: not-allowed;
          text-decoration: line-through;
        }

        &.empty {
          color: transparent;
          cursor: default;
        }
      }
    }

    .date-picker-footer {
      padding: 0.75rem;
      background: #f9f9f9;
      border-radius: 4px;
      font-size: 0.9rem;
      text-align: center;
      border: 1px solid var(--border-color);
    }
  `]
})
export class DatePickerComponent {
  @Input() config: DatePickerConfig = {};
  @Output() dateChange = new EventEmitter<DateChangeEvent>();
  @Output() errorOccurred = new EventEmitter<DatePickerErrorEvent>();

  selectedDate: Date | null = null;
  displayMonth: string = '';
  locale: string = 'en-US';
  
  currentMonth: Date = new Date();
  weekdayLabels: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: any[] = [];

  constructor() {
    this.initializeComponent();
  }

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnChanges() {
    if (this.config?.locale) {
      this.locale = this.config.locale;
    }
    this.generateCalendar();
  }

  private initializeComponent() {
    if (this.config?.locale) {
      this.locale = this.config.locale;
    }
    this.generateCalendar();
  }

  private generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    this.displayMonth = new Date(year, month).toLocaleDateString(this.locale, {
      month: 'long',
      year: 'numeric'
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    this.calendarDays = [];

    // Fill empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push({ isCurrentMonth: false });
    }

    // Fill days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];

      this.calendarDays.push({
        day,
        dateString,
        date,
        isCurrentMonth: true,
        isSelected: this.selectedDate?.toDateString() === date.toDateString(),
        isDisabled: this.isDateDisabled(dateString, date)
      });
    }
  }

  private isDateDisabled(dateString: string, date: Date): boolean {
    if (this.config?.min && dateString < this.config.min) {
      return true;
    }
    if (this.config?.max && dateString > this.config.max) {
      return true;
    }
    if (this.config?.disabledDates?.includes(dateString)) {
      return true;
    }
    return false;
  }

  selectDate(day: any) {
    if (!day.isCurrentMonth || day.isDisabled) {
      return;
    }

    this.selectedDate = day.date;
    const event: DateChangeEvent = {
      date: day.dateString,
      timestamp: day.date.getTime(),
      dateObject: day.date
    };

    // Emit as CustomEvent for Shadow DOM boundary crossing
    this.dateChange.emit(event);
    this.dispatchCustomEvent('dateChange', event);
    this.generateCalendar();
  }

  previousMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1
    );
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1
    );
    this.generateCalendar();
  }

  private dispatchCustomEvent(eventName: string, detail: any) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    });
    (this as any).el?.dispatchEvent?.(event);
  }
}
