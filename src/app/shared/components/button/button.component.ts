import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
})
export class ButtonComponent {
  @Input() label: string = ''; // button text or icon
  @Input() variant: 'primary' | 'danger' | 'clear' = 'primary'; // style type
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() iconOnly = false; // for ✖ icon only button
  @Input() disabled = false;

  @Output() clicked = new EventEmitter<Event>();

  handleClick(event: Event) {
    event.stopPropagation();
    this.clicked.emit(event);
  }

  get buttonClasses() {
    return {
      'icon-only': this.iconOnly,
      [this.variant || '']: !!this.variant,
      [this.size || '']: !!this.size,
    };
  }
}
