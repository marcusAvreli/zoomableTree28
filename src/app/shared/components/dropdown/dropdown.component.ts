import {
  Component,
  Input,
  HostListener,
  ElementRef,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { UiEventBus } from '../../services/ui-event-bus.service'; // adjust path
import { InputChangeEvent } from '../input/input.component';
import { CommonUtil } from '../../../core/utilities/common.util';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
})
export class DropdownComponent implements OnInit, OnDestroy {
  // ---- Inputs ----
  @Input() label!: string;
  @Input() options: any[] = [];
  @Input() valueField: string = 'name';
  @Input() displayField: string = 'displayName';
  @Input() multiple = false;
  @Input() formGroup!: FormGroup;
  @Input() controlName!: string;
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() allowNewItem = false;
  @Input() newItemDisplay = 'New Item...';
  @Input() typeable = false;
    @Input() minCharsToLoad = 2;
	@Input() loading = false;
	@Input() newItemCallback?: (item: any) => void;
	@Input() refresh!: (inputValue: any) => void; // backend function
	private selectedNewItem: any | null = null;
  // ---- Outputs ----
  @Output() selectItem = new EventEmitter<any>();
  private typeSubject = new Subject<string>();
  // ---- Local state ----
    dropdownId = 'dropdown_' + Math.random().toString(36).substr(2, 9);
  isOpen = false;
  selectedText = '';
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  private sub?: Subscription;

  constructor(private elRef: ElementRef, private uiBus: UiEventBus) {}

  // ---------------- Lifecycle ----------------
  ngOnInit() {
    // Ensure control exists
    if (this.formGroup && this.controlName && !this.formGroup.get(this.controlName)) {
      this.formGroup.addControl(this.controlName, new FormControl(null));
    }

    this.updateDisplayText();

    // Subscribe to value changes and broadcast via UiEventBus
    this.sub = this.control?.valueChanges.subscribe(() => {
      this.updateDisplayText();
      this.uiBus.emit('ui:dropdown:valueChanged', {
        id: this.dropdownId,
        text: this.selectedText,
      });
    });
	this.typeSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(val => {
	     this.loading = true;
	     this.refresh?.(val);
	   });
  }

  ngOnDestroy() {
	this.sub?.unsubscribe();
	   this.typeSubject.complete();
  }

  // ---------------- Getters ----------------
  get control(): FormControl | null {
    if (!this.formGroup || !this.controlName) return null;
    return this.formGroup.get(this.controlName) as FormControl;
  }

  // ---------------- Core Methods ----------------
  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  onItemSelected(item: any) {
    if (!this.control) return;
    const value = item[this.valueField];

    // New Item special handling
    if (this.allowNewItem && item[this.displayField] === this.newItemDisplay) {
      this.selectedNewItem = item; // store selected new item
      this.control.setValue(item[this.valueField]);
      this.control.markAsTouched();
      this.updateDisplayText();
      this.isOpen = false;
      this.newItemCallback?.(item);
     // this.selectItem.emit(item);
      return;
    }

    if (this.multiple) {
      const current = this.control.value || [];
      this.control.setValue(
        current.includes(value)
          ? current.filter((v: any) => v !== value)
          : [...current, value]
      );
      this.isOpen = true;
    } else {
      this.control.setValue(value);
      this.isOpen = false;
    }

    this.control.markAsTouched();
    this.selectItem.emit(item);
  }

  updateDisplayText() {
    const value = this.control?.value;
    if (!value) {
      this.selectedText = '';
      return;
    }

    if (this.multiple && Array.isArray(value)) {
      this.selectedText = this.options
        .filter((opt) => value.includes(opt[this.valueField]))
        .map((opt) => opt[this.displayField] ?? opt[this.valueField])
        .join(', ');
      return;
    }

    const found = this.options.find((opt) => opt[this.valueField] === value);
    this.selectedText = found
      ? found[this.displayField] ?? found[this.valueField]
      : '';
  }

  displayValue(): string {
    return this.selectedText;
  }
  get displayOptions(): any[] {
	  console.log("dropdown:",this.options)
     if (!this.allowNewItem) return this.options;
     const firstItem = this.selectedNewItem ?? {
       [this.valueField]: '__new__',
       [this.displayField]: this.newItemDisplay,
     };
     return [firstItem, ...this.options];
   }

   getSelectedItems(): any[] {
     const value = this.control?.value;
     if (!value) return [];

     if (this.multiple && Array.isArray(value)) {
       return this.displayOptions.filter(opt => value.includes(opt[this.valueField]));
     }

     const found = this.displayOptions.find(opt => opt[this.valueField] === value);
     return found ? [found] : [];
   }

  clearSelection() {
    if (!this.control) return;
    this.control.setValue(this.multiple ? [] : null);
    this.control.markAsTouched();
  }

  // ---------------- Input Events ----------------
  onInputChange(event: InputChangeEvent) {
	console.log("event_dropdown_type:",event);
	if (event.type === 'typed' && event.value !== null && this.typeable) {
	      this.onInputTyped(event.value);
	    } else if (event.type === 'cleared') {
	      this.clearSelection();
	    }
  }

  onInputTyped(val: string | number) {
	console.log("event_dropdown_type_1:",val);
	if (typeof val === 'string') {
	     this.typeSubject.next(val);
	   }
  }

  // ---------------- Outside Click Handling ----------------
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const clickedInside = this.elRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isOpen = false;
    }
  }
}
