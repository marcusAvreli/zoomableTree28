import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,Input,Output,EventEmitter,OnDestroy,AfterViewInit
} from '@angular/core';
import * as d3 from 'd3';
import { LazyOrgChart } from './lazy';
import { Observable, of, firstValueFrom,BehaviorSubject, Subscription,filter,take } from 'rxjs';
import { delay } from 'rxjs/operators';
import domtoimage from 'dom-to-image';
import {ChartState, SearchRequest,Employee } from './shared/contract';
import { NODE_CARD_CONFIG } from '../../../core/models/ui/node-config.model';
import { FormControl, FormGroup } from '@angular/forms';
@Component({
  selector: 'app-org-tree',
   templateUrl: './org-tree.component.html',
     styleUrls: ['./org-tree.component.scss']
})
export class OrgTreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input() state$!: Observable<ChartState>;
  @Output() search$ = new EventEmitter<SearchRequest>();
 // @Input() selectedNodeId!: string | number;
private directManagers = new Set<string>();
private directSiblingsByManager = new Map<string, any[]>();
public managerDropdownMap = new Map<string, string>();
private employeeMap = new Map<number, Employee[]>();
private currentState?: ChartState;
selectedManagerId: string = '';
public nodeMapSize = 0; // ← reactive property to display node count

  private initialized = false;
  private chart = new LazyOrgChart();
  private sub?: Subscription;

  /** Component-level nodeMap (all known nodes) */
  private nodeMap = new Map<string, any>();

public dropdownForm = new FormGroup({
  managerId: new FormControl<string | null>(null),
});

public managerDropdownOptions: Array<{ id: string; displayName: string }> = [];


ngAfterViewInit() {

  this.sub = this.state$
    .pipe(filter((s): s is ChartState => !!s))
    .subscribe((state) => {
      this.nodeMap.clear();
      this.currentState = state;

      if (!state.root) {
        this.chart['container'](this.chartContainer.nativeElement)
          .data([])
          .render();
        return;
      }
	const syntheticRootId = state.rootKey || 'root';
const realRootId = state.realRootId || state.root.id;
      const addedIds = new Set<string>();

      // -------------------- Normalize root --------------------
     // const rootId = 'root'; // pick a single consistent root ID
	const root = {
	  ...state.root,
	  id: syntheticRootId,
	  parentId: null,
	  managerId: null,
	 
	_key: realRootId,   // ✅ preserve real id here
	};
     this.nodeMap.set(syntheticRootId, root);
      addedIds.add(root.id);

      // ------------------ Add highlighted nodes ------------------
      state.highlightedIds.forEach((id) => {
        const node = this.getNodeFromState(id, state);
        if (node) {
          const nodeId = String(node.id);
          if (nodeId !== syntheticRootId  && !addedIds.has(nodeId)) {
            this.nodeMap.set(nodeId, { ...node, id: nodeId });
            addedIds.add(nodeId);
          }
        }
      });

      // ------------------ Merge state.nodeMap safely ------------------
      if (state.nodeMap instanceof Map) {
        state.nodeMap.forEach((value, key) => {
          const nodeId = String(key);
          if (nodeId !== syntheticRootId  && !addedIds.has(nodeId)) {
           // this.nodeMap.set(nodeId, { ...value, id: nodeId });
		   const normalizedParentId =
  value.managerId === realRootId
    ? syntheticRootId
    : value.managerId ?? null;

this.nodeMap.set(nodeId, {
  ...value,
  id: nodeId,
  parentId: normalizedParentId
});
            addedIds.add(nodeId);
          }
        });
      }

      // ------------------ Clear derived maps ------------------
      this.directManagers.clear();
      this.directSiblingsByManager.clear();
      this.managerDropdownMap.clear();
	  this.managerDropdownOptions = [];
		this.selectedManagerId = '';
		this.dropdownForm.get('managerId')?.setValue(null, { emitEvent: false });
      this.updateNodeMapCount();

      // ------------------ Pass cleaned state ------------------
      const fixedState: ChartState = {
        ...state,
        nodeMap: new Map(this.nodeMap)
      };
      console.log("nodeMap values:", Array.from(this.nodeMap.values()).map(n => n.name + ':' + n.id));
      this.render(fixedState);
    });
}

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
private updateNodeMapCount() {
  this.nodeMapSize = this.nodeMap.size;
  console.log("NodeMap size:", this.nodeMapSize,this.nodeMap);
}
  onSearch(term: string) {
    term = term.trim();
    if (!term) return;
    this.search$.emit({ term });
  }

  /** ---------------- NodeMap ---------------- */

  private getNode(id: string) {
    return this.nodeMap.get(id) || null;
  }

  private getNodeFromState(id: string, state: ChartState) {
    if (this.nodeMap.has(id)) return this.nodeMap.get(id);
    if (state.root.id === id) return state.root;
    return null;
  }

  /** ---------------- Build children map for search ---------------- */
  private buildSearchChildrenMap(scope: Set<string>): Map<string, any[]> {
    const map = new Map<string, any[]>();
    for (const node of this.nodeMap.values()) {
      if (!node.parentId) continue;
      if (!scope.has(node.id) && !scope.has(node.parentId)) continue;

      if (!map.has(node.parentId)) map.set(node.parentId, []);
      map.get(node.parentId)!.push(node);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a._order ?? 0) - (b._order ?? 0));
    return map;
  }
private registerAncestors(node: any) {
	const id = String(node.id);
if (!node || this.nodeMap.has(id)) return;
  //if (!node || this.nodeMap.has(node.id)) return;

  // Add current node
 this.nodeMap.set(id, node);


  // Recursively register parent
  if (node.parentId) {
    const parent = this.nodeMap.get(node.parentId);
    if (parent) this.registerAncestors(parent);
  }
}
  /** ---------------- Add subtree in search scope ---------------- */

private async addSubtreeInOrderParallel(
  node: any,
  childrenMap: Map<string, any[]>,
  searchScope: Set<string>,
  loadChildren$: (node: any) => Observable<any[]>
): Promise<void> {

  if (!node || !searchScope.has(node.id)) return;

  const nodeId = String(node.id);
  this.nodeMap.set(nodeId, node);

  // Add node if missing
  if (!this.chart['hasNode']?.(nodeId)) {
    this.chart.addNodes([node]);
  }

  // 🔥 LOAD CHILDREN IN PARALLEL
  if (!node._loaded && node.hasChildren) {

    const children = await firstValueFrom(loadChildren$(node));

    children.forEach((c) => {
      const id = String(c.id);
      if (!this.nodeMap.has(id)) {
        this.nodeMap.set(id, c);
      }
    });

    node._loaded = true;

    if (!childrenMap.has(nodeId)) {
      childrenMap.set(nodeId, []);
    }

    childrenMap.get(nodeId)!.push(...children);
  }

  node._expanded = true;
  this.chart['setExpanded'](nodeId);

  const kids = childrenMap.get(nodeId) ?? [];

  // 🔥 PARALLEL recursion instead of sequential await
  await Promise.all(
    kids.map(child =>
      this.addSubtreeInOrderParallel(
        child,
        childrenMap,
        searchScope,
        loadChildren$
      )
    )
  );
}
  /** ---------------- Render chart ---------------- */
  private async render(state: ChartState) {
    const { root, highlightedIds, searchScope, ancestor, loadChildren$ } = state;
if (highlightedIds?.size) {
  this.calculateDirectRelations(highlightedIds);
  this.populateManagerDropdown();
  this.rebuildManagerDropdownOptions(); // ✅ NEW
} else {
  // no matches => hide dropdown and clear selection
  this.managerDropdownOptions = [];
  this.selectedManagerId = '';
  this.dropdownForm.get('managerId')?.setValue(null, { emitEvent: false });
}
console.log("directSiblingsByManager:",this.directSiblingsByManager);
    if (!this.initialized) {
		this.nodeMap = new Map<string, any>();
      this.chart
        ['container'](this.chartContainer.nativeElement)
      
	   .nodeId((d: any) => d.id)
	
		.parentNodeId((d: any) => d.parentId ?? null)
        .hasChildren((d: any) => d.hasChildren)
       .loadChildren((d: any) =>
  new Promise<any[]>((resolve) => {

    const realId =
      d._key === state.root._key
        ? state.root.id
        : d.id;

    loadChildren$({ ...d, id: realId })
      .pipe(take(1))
      .subscribe((children) => {

        children.forEach((c) => {
          c._key = String(c.id);
          this.nodeMap.set(c._key, c);
        });
 console.log("this.nodeMap.values()1:",this.nodeMap.values());
        resolve(children);
        this.updateNodeMapCount();
      });
  })
)['buttonContent']((d: any) => {
        const isExpanded = !!d.node.children;
        const hasChildren = d.node.data.hasChildren;
        return `
          <div style="border-radius:3px;padding:3px;font-size:10px;margin:auto;background-color:lightgray">
            ${hasChildren ? (isExpanded ? '▲' : '▼') : ''} ${d.node.data.numberOfChildren || ''}
          </div>
        `;
      }).childrenMargin((d:any) => 50) .compactMarginBetween((d:any) => 35)
      .compactMarginPair((d:any) => 30)
      .neighbourMargin((a:any, b:any) => 20).afterUpdate(() => {
		    const svg = this.chartContainer.nativeElement.querySelector('svg');
			
			// svg.setAttribute('width', String("100wh"));
 // svg.setAttribute('height', String("100vh"));
			
			console.log("chartContainer_detected",svg);

  this.chart['fit']();
	   requestAnimationFrame(() => {

  });
	  
	  
	  
	  })
        .nodeContent(this.nodeContent(state))
        .data([root])
        .render();
 console.log("this.nodeMap.values()1_1:",this.nodeMap.values());
      this.initialized = true;
    } else {
		
 console.log("nodeMap_values2_2:",this.nodeMap.values());
 const firstKey = this.nodeMap.keys().next().value;
 //  this.nodeMap.delete(firstKey);
     // this.chart['nodeContent'](this.nodeContent(state));
	  console.log("nodeMap_values2:", " root:",root, Array.from(this.nodeMap.values()).map(n => n.name + ':' + n.id));


	 this.chart
    ['nodeContent'](this.nodeContent(state))
  //  .data([root])  // 🔥 dynamic root
   .data(Array.from(this.nodeMap.values()))
    .render();
	requestAnimationFrame(() => {
  this.expandAllNodes();
});
    }

    if (searchScope?.size) {
		for (const id of searchScope) {
			const node = this.nodeMap.get(id);
			if (node) this.registerAncestors(node);
		}
		const childrenMap = this.buildSearchChildrenMap(searchScope);
		const startNode = ancestor ?? root;
		//await  this.addSubtreeInOrder(startNode, childrenMap, searchScope, loadChildren$);
		 await this.addSubtreeInOrderParallel(
    startNode,
    childrenMap,
    searchScope,
    loadChildren$
  );

		
		  this.chart['render']();
			this.chart['fit']();
	}
  }

private expandAllNodes() {
  for (const node of this.nodeMap.values()) {
    if (node.hasChildren) {
      this.chart['setExpanded'](node._key ?? node.id);
    }
  }

  this.chart['render']();
  this.chart['fit']();
}


private populateManagerDropdown() {
  this.managerDropdownMap.clear();

  for (const managerId of this.directSiblingsByManager.keys()) {
    const manager = this.nodeMap.get(managerId);
    if (manager) {
      this.managerDropdownMap.set(managerId, manager.name);
    }
  }
}

get managerDropdownEntries(): [string, string][] {
  return Array.from(this.managerDropdownMap.entries());
}
private calculateDirectRelations(matches: Set<string>) {
  if (!matches?.size) return;

  // Build parent -> children index once (O(n))
  const parentChildren = new Map<string, any[]>();

  for (const node of this.nodeMap.values()) {
    if (!node.parentId) continue;

    if (!parentChildren.has(node.parentId)) {
      parentChildren.set(node.parentId, []);
    }

    parentChildren.get(node.parentId)!.push(node);
  }

  // For every match
  for (const id of matches) {
    const node = this.nodeMap.get(id);
    if (!node || !node.parentId) continue;

    const managerId = node.parentId;

    // Save manager
    this.directManagers.add(managerId);
    const managerNode = this.nodeMap.get(managerId);
    if (managerNode) {
      this.managerDropdownMap.set(managerId, managerNode.name);
    }
    // Save siblings (all children under same manager except the match)
    const siblings =
      (parentChildren.get(managerId) ?? [])
        .filter(n => !matches.has(n.id));

    this.directSiblingsByManager.set(managerId, siblings);
  }
}


private buildManagerSubtreeScope(managerId: string): Set<string> {
  const scope = new Set<string>();

  const traverse = (id: string) => {
    const node = this.nodeMap.get(id);
    if (!node) return;

    scope.add(id);

    for (const child of this.nodeMap.values()) {
      if (child.parentId === id) {
        traverse(child.id);
      }
    }
  };

  traverse(managerId);
  return scope;
}
resetFilter() {
  if (!this.currentState) return;
  this.render(this.currentState);
}

async onManagerSelected(managerId: string) {
  this.selectedManagerId = managerId;
  if (!this.currentState) return;

  // 🔁 Restore full tree
  if (!managerId) {
    const allLoaded = Array.from(this.nodeMap.values()).map(n => ({
      ...n
    }));

    this.chart['data'](allLoaded).render();
    this.chart['fit']();
    return;
  }

  const manager = this.nodeMap.get(managerId);
  if (!manager) return;

  const children = Array.from(this.nodeMap.values())
    .filter(n => n.parentId === managerId);

  const flatData = [
    { ...manager, parentId: null },
    ...children.map(child => ({
      ...child,
      parentId: managerId
    }))
  ];

  this.chart['data'](flatData).render();
  this.chart['setCentered'](managerId);
  this.chart['fit']();
}



/*
+-------------------------------------------------------+
|									======2_of_26======	|
|	DROP DOWN HELPERS									|
|														|
+-------------------------------------------------------+


*/

private rebuildManagerDropdownOptions() {
  this.managerDropdownOptions = Array.from(this.managerDropdownMap.entries()).map(
    ([id, name]) => ({ id, displayName: name })
  );

  // If current selection no longer exists, clear it
  if (this.selectedManagerId && !this.managerDropdownMap.has(this.selectedManagerId)) {
    this.selectedManagerId = '';
    this.dropdownForm.get('managerId')?.setValue(null, { emitEvent: false });
  }
}

onManagerDropdownSelect(item: { id: string; displayName: string }) {
  const id = item?.id ?? '';
  this.selectedManagerId = id;
  // control is already set inside DropdownComponent, but calling the same flow is what you want
  this.onManagerSelected(id);
}

clearManagerFilter() {
  this.selectedManagerId = '';
  this.dropdownForm.get('managerId')?.setValue(null);
  this.onManagerSelected('');
}












  exportSvg(filename = 'org-chart.svg') {
  const container: HTMLElement = this.chartContainer.nativeElement;
  const svg = container.querySelector('svg') as SVGSVGElement;

  if (!svg) {
    console.error('SVG not found in chart container');
    return;
  }

  // Serialize SVG as-is, no xmlns modification
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);

  const blob = new Blob([source], {
    type: 'image/svg+xml;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
exportPng(filename = 'org-chart.png') {
  const container: HTMLElement = this.chartContainer.nativeElement;
  const svg = container.querySelector('svg') as SVGSVGElement;

  if (!svg) {
    console.error('SVG not found');
    return;
  }

  const width = Number(svg.getAttribute('width') ?? 1000);
  const height = Number(svg.getAttribute('height') ?? 800);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, width, height);

  // Load background image
  const bg = new Image();
  bg.src = 'assets/background.png';

  bg.onload = () => {
    ctx.globalAlpha = 0.2; // faded background
    ctx.drawImage(bg, 0, 0, width, height);
    ctx.globalAlpha = 1; // reset alpha

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const svgImg = new Image();
    svgImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    svgImg.onload = () => {
      ctx.drawImage(svgImg, 0, 0);

      // Load PNG watermark (top-left corner)
      const watermark = new Image();
      watermark.src = 'assets/avatar-placeholder.png';

      watermark.onload = () => {
        const padding = 10;
        const wmWidth = 100;
        const wmHeight = (watermark.height / watermark.width) * wmWidth;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(watermark, padding, padding, wmWidth, wmHeight);
        ctx.globalAlpha = 1;

        // Draw text watermark in bottom-right corner
        const text = 'בוקר טוב לצוות ניהול זהויות';
        ctx.font = 'bold 24px Arial';

        ctx.fillStyle = 'rgba(0, 128, 0, 0.5)'; // green, adjust alpha if needed
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'right';
        const textPadding = 10;
        ctx.fillText(text, width - textPadding, height - textPadding);

        // Export PNG
        canvas.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
      };

      watermark.onerror = e => console.error('Watermark image failed to load', e);
    };

    svgImg.onerror = e => console.error('SVG image load failed', e);
  };

  bg.onerror = e => console.error('Background image load failed', e);
}

  /** ---------------- Node content ---------------- */

private nodeContent(state: ChartState) {
  const { searchScope, highlightedIds } = state;

  return (d: any) => {
    const show = !searchScope?.size || searchScope.has(d.data.id);
    // if (!show) return ''; // keep if you want hard-filter
    const highlight = highlightedIds.has(d.data.id);
	const genderRaw = d.data?.gender;
	const gender = genderRaw ? genderRaw.toString().toLowerCase() : null;

	let genderIcon = '';
	let avatarBorder = '2px dashed #cfc4b8'; // default dashed

	if (gender === 'female') {
	  genderIcon = './assets/icon_female.png';
	} else if (gender === 'male') {
	  genderIcon = './assets/icon_male.png';
	} else {
	  // unknown | null | undefined | anything else
	  avatarBorder = '2px solid green';
	}
    // 🔹 Node type (fallback to managerial)
    const type: string = 'managerial';
    const fields = NODE_CARD_CONFIG[type] || [];

    // 🔹 Dynamic fields rendering (RTL/LTR safe)
    const renderedFields = fields
      .map((field) => {
        const rawValue = d.data[field.key];
        if (rawValue === undefined || rawValue === null || rawValue === '') return '';

        const value = field.format ? field.format(rawValue) : rawValue;

        return `
          <div style="
            font-size:11px;
            color:#5d5d5d;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            text-align:start;
          ">
            <bdi style="direction:inherit; unicode-bidi:plaintext;">
              ${field.label ? `<span style="color:#716E7B">${field.label}: </span>` : ``}
              <span>${value}</span>
            </bdi>
          </div>
        `;
      })
      .join('');

    const subCount =
      d.data.subordinates ??
      d.data.numberOfChildren ??
      d.data.childrenCount ??
      d.data.directReports ??
      null;

return `
  <div
    class="card"
    aria-label="Employee card"
    dir="rtl"
    style="
      --bg:#f5f3ef;
      --card:#ffffff;
      --ink:#1f1f1f;
      --muted:#5d5d5d;
      --accent:#d98c2b;
      --ring:rgba(0,0,0,0.08);
      --avatar-max:72px;

      box-sizing:border-box;
      width:${Math.min(300, d.width)}px;
      max-width:300px;
      max-height:${d.height}px;

      background:var(--card);
      border-radius:18px;
      box-shadow:0 12px 30px var(--ring);
      padding-inline:10px;
      padding-block:10px;

      display:grid;
      grid-template-columns:minmax(0, var(--avatar-max)) 1fr;
      gap:8px;
      align-items:stretch;
      overflow:hidden;

      border:2px solid ${highlight ? 'var(--accent)' : 'transparent'};
      box-shadow:${highlight ? '0 0 0 3px rgba(217,140,43,0.25), 0 12px 30px var(--ring)' : '0 12px 30px var(--ring)'};
      transition:all 0.2s ease;
    "
  >
    <div
      class="avatar-box"
      aria-hidden="true"
      style="
        padding-top:5px;
        padding-bottom:5px;
        padding-inline:5px;
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        aspect-ratio:1 / 1;
        max-width:var(--avatar-max);
        max-height:var(--avatar-max);
        box-sizing:border-box;
      "
    >
      <div
        class="avatar"
        style="
          width:min(100%, 72px);
          height:min(100%, 72px);
          aspect-ratio:1 / 1;
          border-radius:50%;
          border:${avatarBorder};
          background:linear-gradient(135deg,#f2e9df 0%,#f8f2eb 45%,#f2e9df 100%);
          position:relative;
          display:grid;
          place-items:center;
          overflow:hidden;
          box-sizing:border-box;
        "
      >
        ${
          genderIcon
            ? `
              <img
                src="${genderIcon}"
                alt=""
                style="
                  width:100%;
                  height:100%;
                  display:block;
                  object-fit:cover;
                  border-radius:50%;
                "
              />
            `
            : ``
        }
      </div>
    </div>

    <div class="meta" style="display:grid; gap:6px; min-width:0;">
      <div
        class="name"
        style="
          font-size:15px;
          font-weight:700;
          letter-spacing:0.02em;
          color:var(--ink);
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          text-align:start;
        "
      >
        <bdi style="direction:inherit; unicode-bidi:plaintext;">
          ${d.data.name || ''}
        </bdi>
      </div>

      <div
        class="role"
        style="
          font-size:11px;
          color:var(--muted);
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          text-align:start;
        "
      >
        <bdi style="direction:inherit; unicode-bidi:plaintext;">
          ${d.data.position || ''}
        </bdi>
      </div>

      ${
        subCount !== null && subCount !== undefined && subCount !== ''
          ? `
            <div
              class="subordinates"
              style="
                font-size:11px;
                color:var(--muted);
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
                text-align:start;
              "
            >
              <bdi style="direction:inherit; unicode-bidi:plaintext;">
                Subordinates: ${subCount}
              </bdi>
            </div>
          `
          : ``
      }

      ${
        renderedFields
          ? `
            <div class="badges" style="display:grid; gap:6px; justify-items:start; min-width:0;">
              ${renderedFields}
            </div>
          `
          : ``
      }
    </div>
  </div>
`;
  };
}
 
}

