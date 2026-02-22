// list.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent {
  @Input() items: any[] = [];
  @Input() displayField: string = 'name';

  @Output() itemSelected: EventEmitter<any> = new EventEmitter<any>();

  selectItem(item: any, event?: Event) {
    if (event) event.stopPropagation(); // <-- prevent dropdown toggle
    console.log('list_item_selected');
    this.itemSelected.emit(item); // emit selection to parent (app-dropdown)
  }
}
