
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,OnChanges,SimpleChanges,Input
} from '@angular/core';
import { LazyOrgChart } from '../../../shared/components/org-tree/lazy';
import { Observable, of, firstValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';
import {BehaviorSubject,shareReplay,from} from 'rxjs';
import { toArray, concatMap, map, tap, take } from 'rxjs/operators';
import { OrgNodeService } from '../../../core/backend/org-node.service';
import {ChartState, SearchRequest,SearchRequestWithField } from '../../../shared/components/org-tree/shared/contract';
import { FormControl, FormGroup } from '@angular/forms';
import { OrgNode } from '../../../core/models/org-node.model';
@Component({
  selector: 'app-org-tree-main',
   templateUrl: './org-tree-main.component.html',
     styleUrls: ['./org-tree-main.component.scss']
 
})
export class OrgTreeMainComponent  implements OnInit,OnChanges {

  /* ---------------- STATE ---------------- */
  private chartStateSubject =
    new BehaviorSubject<ChartState>(null!);
@Input() selectedNodeId!: string | number;
  chartState$ = this.chartStateSubject.asObservable();
private realIdIndex = new Map<string, string>(); 
  /* ---------------- INTERNAL DATA ---------------- */
  private cache = new Map<string, any[]>();
  private nodeMap = new Map<string, any>();
  private highlightedNodeIds = new Set<string>();
  private searchScope = new Set<string>();
  currentAncestor:any;
  /* ---------------- SEARCH UI ---------------- */
  availableFields: string[] = [];
  searchField: string = '';
  searchTerm: string = '';
constructor(private readonly orgNodeService: OrgNodeService){}
private childOrder = new Map<string, number>(); // parentId → counter

public searchForm = new FormGroup({
  searchField: new FormControl<string | null>(null),
  searchTerm: new FormControl<string | null>(null),
});
public searchFieldOptions: Array<{ value: string; displayName: string }> = [];
  
  /* ---------------- Repository ---------------- */
repository = {
  get: (url: string): Observable<OrgNode[]> => {
	 
    const parentId = url.split('/').pop();
    const nodes = this.ALL.filter(n => n['parentId'] === parentId);
    return of(nodes).pipe(delay(200));
  },

 search: (term: string, field: string): Observable<OrgNode[]> => {
      if (!field) return of([]); // do nothing if no field selected
      term = term.toLowerCase();
      return of(
        this.ALL.filter(n =>
          n[field as keyof OrgNode]?.toString().toLowerCase() === term
        )
      ).pipe(delay(300));
    }
};
onSearchFieldSelected(item: { value: string; displayName: string }) {
  const field = item?.value ?? '';
  this.searchField = field; // keep your existing logic working
}

ngOnInit() {
  // dynamically read OrgNode fields
 // this.availableFields = Object.keys(new OrgNode()).filter(k => !k.startsWith('_'));
this.availableFields = Object.keys(new OrgNode()).filter(k => !k.startsWith('_'));
this.searchFieldOptions = this.availableFields.map(f => ({
  value: f,
  displayName: f
}));
  this.orgNodeService.findAll()
    .pipe(
      map(nodes => {
        if (!nodes || nodes.length === 0) {
          throw new Error('No nodes returned from API');
        }

        const n = nodes[0];

        // ✅ Create chart root node
        const root = new OrgNode(
          n.id,        // ⚠️ always fixed id
          n.name,
          n.firstName,
          n.lastName,
          n.title,
		  n.gender,
          'root',
          n.companyCode,
          n.companyName,
          n.parentCompanyCode,
          n.parentCompanyName,
          n.branchId,
          n.managerId,
          n.orgUnitCode,
          n.costCenter,
          n.contractCode,
          n.email,
          n.phoneNumber,
          n.positionCode,
          n.jobKey,
          n.jobName,
          n.image,
          false,   // childrenLoaded
          [],      // parentPath
          [],      // childrenIds
          n.hasChildren ?? false, // hasChildren
          n.numberOfChildren      // numberOfChildren
        );

        root._expanded = true;
        root._loaded = true;
(root as any)._key = 'root';
        // 🔥 Clear previous nodes and register ONLY chart root
        this.nodeMap.clear();
		 this.realIdIndex.clear();
        this.nodeMap.set('root', root);
this.realIdIndex.set(root!.id!, 'root');
        console.log("Root registered:", root, "Original API node:", n, "Total nodes fetched:", nodes.length);

        return { root, originalNode: n, allNodes: nodes };
      }),
      concatMap(({ root, originalNode, allNodes }) =>
        this.orgNodeService.getChildNodes(root!.id!, 'managerial').pipe(
          tap(children => {
            // ⚠️ Prevent adding the original root again
           const filtered = children.filter(c => c.id !== this.nodeMap.get('root')?.id);
            filtered.forEach(c => this.registerNode(c));
            this.cache.set(root!.id!, filtered);
            console.log("Children registered for root:", filtered.length);
          }),
          map(() => root)
        )
      )
    )
    .subscribe({
      next: root => {
        console.log("Emit chart state with single root:", root.id);
        this.emitState(); // push chartState
      },
      error: err => console.error('Failed to load org chart', err)
    });
}


ngOnChanges(changes: SimpleChanges): void {
		if (!changes['selectedNodeId']) return;

		const current = changes['selectedNodeId'].currentValue;
		const previous = changes['selectedNodeId'].previousValue;
		console.log("ng_on_changes:" ,"before_return:",current,previous);
		if (current == null || current === previous) return;
		console.log("ng_on_changes:",current);
		console.log("ng_on_changes:",current);
		this.onSelectedNodeChanged$(current).subscribe();

	}
private onSelectedNodeChanged$(id: string | number): Observable<void> {

  return this.orgNodeService.loadEmployeesDown(String(id)).pipe(

    take(1),

    tap(nodes => {
console.log("onSelectedNodeChanged:",nodes);
      if (!nodes?.length) return;

      // 🔥 FULL RESET
      this.nodeMap.clear();
      this.realIdIndex.clear();
      this.cache.clear();
      this.childOrder.clear();
      this.searchScope.clear();
      this.highlightedNodeIds.clear();

      // First node becomes synthetic root
      const n = nodes[0];

      const root = new OrgNode(
        n.id,
        n.name,
        n.firstName,
        n.lastName,
        n.title,
		n.gender,
        'root', // synthetic key
        n.companyCode,
        n.companyName,
        n.parentCompanyCode,
        n.parentCompanyName,
        n.branchId,
        n.managerId,
        n.orgUnitCode,
        n.costCenter,
        n.contractCode,
        n.email,
        n.phoneNumber,
        n.positionCode,
        n.jobKey,
        n.jobName,
        n.image,
        false,
        [],
        [],
        n.hasChildren ?? false,
        n.numberOfChildren
      );

      root._expanded = true;
      root._loaded = true;

      this.nodeMap.set('root', root);
      this.realIdIndex.set(root!.id!, 'root');

      // Register all returned nodes except root duplicate
      nodes
        .filter(x => x.id !== root.id)
        .forEach(x => 
		{ 
		(x as any)._expanded = true;
      (x as any)._loaded = true;
			this.registerNode(x)
		});

      // Build cache for direct children of root
      const children = nodes.filter(x => x['parentId'] === root.id);
      this.cache.set(root!.id!, children);
console.log("onSelectedNodeChanged:",nodes,this.nodeMap.values());
    }),

    tap(() => this.emitState()),

    map(() => void 0)
  );
}

get canSearch(): boolean {
  const field = this.searchForm.get('searchField')?.value ?? '';
  const term = (this.searchForm.get('searchTerm')?.value ?? '').toString().trim();
  return !!field && !!term;
}

  triggerSearch() {
  const field = this.searchForm.get('searchField')?.value ?? '';
  const term  = (this.searchForm.get('searchTerm')?.value ?? '').toString();

  this.searchField = field;   // optional: keep existing props in sync
  this.searchTerm = term;     // optional: keep existing props in sync

  if (!field || !term.trim()) return;

  this.handleSearch({ term, field });
  }
  /* ---------------- Search Entry ---------------- */
  handleSearch(req: SearchRequestWithField) {
	    if (!req.term || !req.field) return;
  const term = req.term.trim().toLowerCase();
  const  field  = req.field;     
  if (!term) return;
    this.highlightedNodeIds.clear();
	console.log("!!!!!!!!field:",field);
this.orgNodeService.getEmployeesUpToRoot(term,field).pipe(
    //this.orgNodeService.searchChildren(term, 'managerial').pipe(
    take(1),

    tap(matches => {
      if (!matches.length) {
        alert('Not found');
        throw new Error('NO_MATCH');
      }else{
		    console.log("matches:",matches);
	  }
    }),

    // register matches
    tap(matches => matches.forEach(m => this.registerNode(m))),

    // expand paths + scope lazily
    concatMap(matches =>
      from(matches).pipe(
        concatMap(m => this.expandNodeAndScope(m, field, term)),
        toArray(),
        map(() => matches)
      )
    ),

    tap(matches => {
    
	
    
	   matches.forEach(m => {
    // Only highlight if the node's field exactly matches the search term
    const nodeValue = (m[field] ?? '').toString().trim().toLowerCase();
    if (nodeValue === term) {
      this.addIfDefined(this.highlightedNodeIds, m.id);
    }
  });
    }),

    tap(matches => {
      // 🔥 FIND LCA HERE
      const lca = this.findCommonAncestor(matches);
	  console.log("parent:", " handleSearch lca:",lca, " matches:",matches);
      if (!lca) return;

      // collapse scope to subtree under LCA
      const nextScope = new Set<string>();
      for (const id of this.searchScope) {
        let cur = this.nodeMap.get(id);
        while (cur) {
          if (cur.id === lca.id) {
            nextScope.add(id);
            break;
          }
          cur = cur.parentId
            ? this.nodeMap.get(cur.parentId)
            : undefined;
        }
      }

      this.searchScope = nextScope;
	  this.currentAncestor = lca;
	console.log("parent:", " handleSearch lca:",lca, " matches:",matches, " searchScope:",this.searchScope);
      // ensure LCA is visible & expanded
      lca._expanded = true;
      lca._loaded = true;
    }),
 
    tap(() => this.emitState())
  ).subscribe({
    error: err => {
      if (err.message !== 'NO_MATCH') console.error(err);
    }
  });
}


private expandNodeAndScope(node: any, field: string, term: string): Observable<void> {
  return new Observable<void>(observer => {
    let cur: any = node;

    const walk = () => {
      if (!cur) {
        observer.next();
        observer.complete();
        return;
      }
 // ✅ check if this node matches the search term exactly
      const nodeValue = (cur[field] ?? '').toString().trim().toLowerCase();
      if (nodeValue === term) {
        this.addIfDefined(this.highlightedNodeIds, cur.id);
      }
      // include current node in searchScope
      this.searchScope.add(cur.id);

      // get siblings
      let siblings = this.cache.get(cur.parentId);
      if (siblings) {
        siblings.forEach(s => this.searchScope.add(s.id));
      } else if (cur.parentId) {
        // lazy load siblings
      this.orgNodeService
  .getChildNodes(cur.parentId!, 'managerial')
  .pipe(take(1))
  .subscribe(children => {
    children.forEach(c => this.registerNode(c));
    this.cache.set(cur.parentId!, children);

    children.forEach(s =>
      this.addIfDefined(this.searchScope, s.id)
    );

    // move to parent
    cur = this.nodeMap.get(cur.parentId!);
    walk();
  });
        return;
      }

      // move to parent
      if (!cur.parentId) {
        observer.next();
        observer.complete();
        return;
      }
      let parent = this.nodeMap.get(cur.parentId);

      // lazy load parent if missing
      if (!parent) {
       this.orgNodeService
	  .getChildNodes(cur.parentId!, 'managerial')
	  .pipe(take(1))
	  .subscribe(parents => {
		if (parents && parents.length) {
		  const parent = parents[0];   // same assumption as before
		  this.registerNode(parent);
		  cur = parent;
		  walk();
		} else {
		  observer.next();
		  observer.complete();
		}
	  });
        return;
      }

      cur = parent;
      walk();
    };

    walk();
  });
}

  /* ---------------- State Push ---------------- */
private emitState() {
	const rootNode = this.nodeMap.get('root') ?? null;
   this.chartStateSubject.next({
    root: rootNode,
    highlightedIds: new Set(this.highlightedNodeIds),
    searchScope: new Set(this.searchScope),
    loadChildren$: this.loadChildren$,
    nodeMap: new Map(this.nodeMap),
    ancestor: this.currentAncestor,
    rootKey: 'root',
    realRootId: rootNode?.id ?? ''   // ✅ SET HERE
  });
}

  /* ---------------- Helpers ---------------- */

private registerNode(node: any) {
	console.log("registerNode:","start", " node:",node);
  if (!node?.id) return;
	console.log("registerNode:","1"," realIdIndex:",this.realIdIndex);
  // 🔒 If already indexed, skip
  /*if (this.realIdIndex.has(node.id)) {
    return;
  }
  */
console.log("registerNode:","2");
  if (!this.childOrder.has(node.parentId)) {
	  node._order = 0;
    this.childOrder.set(node.parentId, 0);
  }

  node._order = this.childOrder.get(node.parentId)!;
  this.childOrder.set(node.parentId, node._order + 1);

  this.nodeMap.set(node.id, node);
  this.realIdIndex.set(node.id, node.id);
  console.log("registerNode:","end");
}


 private expandPaths$(matches: any[]): Observable<void> {
  return of(matches).pipe(
    tap(nodes => {
		console.log("parent","expandPaths:",nodes);
      for (const node of nodes) {
        let cur: any = node;

        while (cur?.parentId) {
          if (!this.nodeMap.has(cur.id)) {
            this.registerNode(cur);
          }

          let parent = this.nodeMap.get(cur.parentId);
          if (!parent) break;

          cur = parent;
        }
      }
    }),
    map(() => void 0)
  );
}
  /*
private buildSearchScope(matches: any[]) {
  this.searchScope.clear();

  const pathNodes = new Set<string>();

  // 1️⃣ collect matches + ancestors (ONLY from nodeMap)
  for (const node of matches) {
    let cur: any | undefined = node;

    while (cur) {
      pathNodes.add(cur.id);
      this.searchScope.add(cur.id);

      cur = cur.parentId
        ? this.nodeMap.get(cur.parentId)
        : undefined;
    }
  }

  // 2️⃣ add siblings using cache only
  for (const id of pathNodes) {
    const node = this.nodeMap.get(id);
    if (!node?.parentId) continue;

    const siblings = this.cache.get(node.parentId);
    if (!siblings) continue;

    for (const sib of siblings) {
      this.searchScope.add(sib.id);
    }
  }
  console.log("parent","searchScope",this.searchScope);
}
*/
private loadChildren$ = (d: any): Observable<any[]> => {
	console.log("parent","loadChildren:",this.cache ,"load_id:",d);
if (this.cache.has(String(d.id))) {
	const cached = this.cache.get(String(d.id))!;
	if(cached && cached.length>0){
console.log("CACHED CHILD SAMPLE:", cached[0],cached[0]._order);

  return of(
    [...cached!]
      .sort(this.compareOrder)
  );
	}
}

console.log("parent","loadChildren:","2", d.id);
 return this.orgNodeService.getChildNodes(d.id!, 'managerial').pipe(
    tap(children => {
      children.forEach(c => this.registerNode(c)); // register in nodeMap
   this.cache.set(String(d.id!), children);         // cache children
    }),
    map(children => [...children].sort(this.compareOrder)), // ensure order
    shareReplay(1)
  );
};
private findCommonAncestor(matches: any[]): any {
  if (!matches.length) return this.nodeMap.get('root');

  // build ancestor paths
  const paths = matches.map(n => {
    const path: any[] = [];
    let cur: any | undefined = n;
    while (cur) {
      path.unshift(cur);
      cur = this.nodeMap.get(cur.parentId);
    }
    return path;
  });

  // find logical LCA
  let lca = paths[0][0];
  for (let i = 0; i < paths[0].length; i++) {
    const candidate = paths[0][i];
    if (paths.every(p => p[i]?.id === candidate.id)) {
      lca = candidate;
    } else break;
  }

  // WALK UP to **highest ancestor present in chart**, fallback to root
  let cur: any = lca;
  let lastSafe = this.nodeMap.get('root'); // root is always safe

  while (cur) {
    // if parent exists in cache, consider cur safe
    if (!cur.parentId || this.cache.has(cur.parentId)) {
      lastSafe = cur;
    }

    cur = this.nodeMap.get(cur.parentId);
  }

  return lastSafe;
}
private addIfDefined<T>(set: Set<T>, value: T | undefined | null) {
  if (value != null) set.add(value);
}
private compareOrder(a: { _order?: number }, b: { _order?: number }): number {
  const orderA = a._order ?? 0;
  const orderB = b._order ?? 0;
  return orderA - orderB;
}
  /* ---------------- Mock Data ---------------- */
  private ALL: OrgNode[] = [
  new OrgNode()

];
}


