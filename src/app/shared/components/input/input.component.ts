import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  OnDestroy,
  OnChanges,
  AfterViewInit,
  SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiEventBus } from '../../services/ui-event-bus.service';
import moment from 'moment';
export type InputChangeEvent = {
	type: 'typed' | 'cleared';
	value: string | null;

};

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor, OnInit, OnDestroy, OnChanges,AfterViewInit {
  @Input() placeholder = '';
  @Input() readonly = false;
  @Input() bindToDropdownId?: string;
  @Input() value: string | number | null = null;
  @Input() inputType: 'text' | 'number' = 'text'; // NEW: allows switching between text or numeric input
  @Input() waitable = false;  // whether spinner can be shown
  @Input() label = '';
  @Input() labeled = true;
  @Input() direction= 'rtl';
  @Input() loading = false;   // show spinner when true
  @Input() mask: 'text' | 'number' | 'date' | 'time' | 'datetime' = 'text';
  @Input() datetimeFormat?: string;
  private _disabled = false;
  
    
    @Input() dir= 'rtl';
   @Input()
   get disabled(): boolean {
     return this._disabled;
   }
   set disabled(val: boolean) {
     this._disabled = val;
   }

  @Output() inputChange = new EventEmitter<InputChangeEvent>();
  @Output() clicked = new EventEmitter<void>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private sub?: Subscription;

  constructor(private uiBus: UiEventBus) {}


  ngOnInit(): void {
    if (this.bindToDropdownId) {
      this.subscribeDropdown();
    }
  }									
   
  ngAfterViewInit(): void {
    // ✅ disable datetime after Angular form initialization
    if (this.mask === 'datetime') {
      queueMicrotask(() => this.disableForDatetime());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mask'] && this.mask === 'datetime') {
      this.disableForDatetime();
    }

    if (changes['bindToDropdownId'] && this.bindToDropdownId) {
      this.subscribeDropdown();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  writeValue(value: any): void {
    if (value == null) {
      this.value = null;
    } else if (this.mask === 'datetime') {
      this.value = moment(value).format(this.datetimeFormat);
      this.disableForDatetime();
    } else {
      this.value = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
	this.disabled = isDisabled;
	this.readonly = isDisabled;
  }

  onInput(event: Event): void {
	
	if (this.disabled) return;
	const input = event.target as HTMLInputElement;


	 // keep raw value without trimming null on Enter
	 const newValue = input.value; 
	 this.value = newValue;
	 this.onChange(this.value);
	 this.inputChange.emit({ type: 'typed', value: this.value });
  }

						
							
															  
 

  clearFromMouse(): void {
	console.log("clear_from_mopuse");
    this.value = null;
    this.onChange(null);
    this.inputChange.emit({ type: 'cleared', value: null });
  }

  onBlur(): void {
    this.onTouched();
  }

  onInputClick(event: Event): void {
    event.stopPropagation();
    this.clicked.emit();
  }
  
  // ---------------- Helpers ----------------
    private disableForDatetime(): void {
      this.disabled = true;
      this.readonly = true;
      // inform parent form that control is disabled
      this.setDisabledState(true);
    }

    private subscribeDropdown(): void {
      this.sub?.unsubscribe();
      this.sub = this.uiBus
        .on<{ id: string; text: string }>('ui:dropdown:valueChanged')
        .subscribe(event => {
          if (event.id.toLowerCase() === this.bindToDropdownId?.toLowerCase()) {
            this.writeValue(event.text);
            this.onChange(event.text);
          }
        });
    }
}
