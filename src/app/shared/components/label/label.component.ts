import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'app-label',
  templateUrl: './label.component.html',
  styleUrls: ['./label.component.scss']
})
export class LabelComponent {
  /** Main key text */
  @Input() text = '';

  /** Value text shown next to or under key */
  @Input() value?: string;

  /** Optional helper/hint text */
  @Input() hint?: string;

  /** Optional id of associated input */
  @Input() forId?: string;

  /** Mark required fields */
  @Input() required = false;

  /** Layout mode */
  @Input() layout: 'block' | 'inline' = 'block';

  /** Text direction */
  @Input() direction: 'ltr' | 'rtl' = 'rtl';

  /** Font size (auto clamps to min 12px) */
  @Input() fontSize: string | number = '0.95rem';

  /** Bind direction attribute to outer label */
  @HostBinding('attr.dir') get dir() {
    return this.direction;
  }

  /** Style getter ensures font scaling and min-size */
  get fontStyle() {
    const numeric = typeof this.fontSize === 'number' ? `${this.fontSize}px` : this.fontSize;
    return { 'font-size': `max(${numeric}, 12px)` };
  }
}
