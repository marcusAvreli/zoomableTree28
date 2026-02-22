import { Observable} from 'rxjs';

export interface SearchRequest {
  term: string;
}

export interface ChartState {
  root: any;
  highlightedIds: Set<string>;
    
}