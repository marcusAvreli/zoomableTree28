import { Observable} from 'rxjs';

export interface SearchRequest {
  term: string;
}

export interface ChartState {
  root: any;
  highlightedIds: Set<string>;
   searchScope: Set<string>;
     nodeMap: Map<string, any>; // 🔥 add this
  loadChildren$: (node: any) => Observable<any[]>;
}