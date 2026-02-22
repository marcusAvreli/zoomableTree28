import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrgTreeComponent } from './components/org-tree/org-tree.component';

import { DropdownComponent } from './components/dropdown/dropdown.component';
import { InputComponent } from './components/input/input.component';
import { ListComponent } from './components/list/list.component';
import { ButtonComponent } from './components/button/button.component';
import { LabelComponent } from './components/label/label.component';
import {SpinnerComponent} from './components/spinner/spinner.component';
import {UiEventBus} from './services/ui-event-bus.service';
@NgModule({
  declarations: [
	OrgTreeComponent
	,DropdownComponent
	,InputComponent
	,ListComponent
	,ButtonComponent
	,LabelComponent
	,SpinnerComponent
  ],
  imports: [
    CommonModule
  ],exports:[
	OrgTreeComponent
	,DropdownComponent
	,InputComponent
	,ListComponent
	,ButtonComponent
	,LabelComponent
	,SpinnerComponent
  ],
    providers: [UiEventBus],
})
export class SharedModule { }
