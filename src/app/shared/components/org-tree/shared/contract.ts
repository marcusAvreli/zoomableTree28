import { Observable} from 'rxjs';

export interface SearchRequest {
  term: string;
  //scopedRootId: string | null;
}

export interface ChartState {
  root: any;
  highlightedIds: Set<string>;
   searchScope: Set<string>;
     nodeMap: Map<string, any>; // 🔥 add this
	   ancestor?: any;

  loadChildren$: (node: any) => Observable<any[]>;
  rootKey:string;
  realRootId: string;    // 2e89ad2f55ea40c4af1f7fb34bead824
  
}
export type SearchRequestWithField = SearchRequest & {
  field?: string;
};

export class OrgNode {
  id: string='';
  name: string='';
  firstName: string='';
  parentId: string ='';
  hasChildren: boolean=false;
  numberOfChildren:number=0;
  _loaded?: boolean = false;
  _expanded?: boolean = false;
  _order?: number = 0;

  constructor(data?: Partial<OrgNode>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  // optional helper
  isLeaf(): boolean {
    return !this.hasChildren;
  }
}

export interface Employee {
  id: number;
  name: string;
  managerId?: number;
}