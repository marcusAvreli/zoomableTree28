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
  /*
private async addSubtreeInOrder(
  node: any,
  childrenMap: Map<string, any[]>,
  searchScope: Set<string>,
  loadChildren$: (node: any) => Observable<any[]>
) {
  if (!node || !searchScope.has(node.id)) return;
 this.nodeMap.set(String(node.id), node);
console.log("this.nodeMap.values()2:",this.nodeMap.values());
  // Add node if missing
  if (!this.chart['hasNode']?.(node.id)) {
    this.chart.addNodes([node]);
  }

  // Load children if not already loaded
  if (!node._loaded && node.hasChildren) {
    const children = await firstValueFrom(loadChildren$(node));
 //  children.forEach((c) => this.nodeMap.set(String(c.id), c));
children.forEach((c) => {
  const id = String(c.id);
  if (!this.nodeMap.has(id)) {
    this.nodeMap.set(id, c);
  }
});
console.log("this.nodeMap.values()2:",this.nodeMap.values());
    node._loaded = true;

    // Update childrenMap in case new nodes arrived
    if (!childrenMap.has(node.id)) childrenMap.set(node.id, []);
    children.forEach((c) => childrenMap.get(node.id)!.push(c));
  }

  node._expanded = true;
  this.chart['setExpanded'](node.id);

  const kids = childrenMap.get(node.id) ?? [];

  // Recursively expand children
  for (const k of kids) {
    await this.addSubtreeInOrder(k, childrenMap, searchScope, loadChildren$);
  }
}

*/
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
}
console.log("directSiblingsByManager:",this.directSiblingsByManager);
    if (!this.initialized) {
		this.nodeMap = new Map<string, any>();
      this.chart
        ['container'](this.chartContainer.nativeElement)
       //.nodeId((d: any) => d._key ?? d.id)
	   .nodeId((d: any) => d.id)
		/*.parentNodeId((d: any) => {
		  if (!d.parentId) return null;

		  if (d.parentId === state.root.id) {
			return state.root._key; // map to synthetic root
		  }

		  return d.parentId;
		})*/
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
   // .data([root])  // 🔥 dynamic root
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

		this.updateNodeMapCount();
		//const first = [...highlightedIds][0];
		//if (first) this.chart['setCentered'](first);
		//this.chart['render']();
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
private fitChartToContainer() {
  const state = (this.chart as any).getChartState?.();
  if (!state) return;

  const svg = state.svg?.node();
  const chartGroup = state.chart;

  if (!svg || !chartGroup) return;

  const containerRect =
    this.chartContainer.nativeElement.getBoundingClientRect();

  // 🔥 RESET ZOOM FIRST
  d3.select(svg).call(
    state.zoomBehavior.transform,
    d3.zoomIdentity
  );

  // Wait one frame so reset applies
  requestAnimationFrame(() => {

    const bbox = chartGroup.node().getBBox();
    if (!bbox.width || !bbox.height) return;

    const scale = Math.min(
      containerRect.width / bbox.width,
      containerRect.height / bbox.height
    );

    const translateX =
      (containerRect.width - bbox.width * scale) / 2 - bbox.x * scale;

    const translateY =
      (containerRect.height - bbox.height * scale) / 2 - bbox.y * scale;

    d3.select(svg).call(
      state.zoomBehavior.transform,
      d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale)
    );
  });
}



private autoFitToContainer() {
  const container = this.chartContainer.nativeElement;
  const svg: SVGSVGElement | null = container.querySelector('svg');
  const chartGroup: SVGGElement | null = container.querySelector('g.chart');
console.log("autoFitToContainer:", "chartGroup:",chartGroup, " svg:",svg);
  if (!svg || !chartGroup) return;

  // Get container size (CSS-controlled)
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Get actual tree bounding box
  const bbox = chartGroup.getBBox();

  if (!bbox.width || !bbox.height) return;

  // Calculate scale to fit both width & height
  const scaleX = containerWidth / bbox.width;
  const scaleY = containerHeight / bbox.height;

  const scale = Math.min(scaleX, scaleY);

  // Centering offsets
  const translateX =
    (containerWidth - bbox.width * scale) / 2 - bbox.x * scale;

  const translateY =
    (containerHeight - bbox.height * scale) / 2 - bbox.y * scale;

  chartGroup.setAttribute(
    'transform',
    `translate(${translateX}, ${translateY}) scale(${scale})`
  );
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
 /* private nodeContent(state: ChartState) {
    const { searchScope, highlightedIds } = state;

    return (d: any) => {
      const show = !searchScope?.size || searchScope.has(d.data.id);
      //if (!show) return '';

      const highlight = highlightedIds.has(d.data.id);
 const color = '#FFFFFF';
        const imageDiffVert = 25 + 2;
	  return `
	   
<div style='
  width:${d.width}px;
  height:${d.height}px;
  padding-top:${imageDiffVert - 2}px;
  padding-left:1px;
  padding-right:1px;
'>
  <div style="
    font-family: 'Inter', sans-serif;
    background-color:${highlight ? '#fff8dc' : color};
    margin-left:-1px;
    width:${d.width - 2}px;
    height:${d.height - imageDiffVert}px;
    border-radius:10px;
    border:2px solid ${highlight ? 'orange' : '#E4E2E9'};
    box-shadow:${highlight ? '0 0 0 3px rgba(255,165,0,0.25)' : 'none'};
    transition: all 0.2s ease;
  ">

      <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">
        #${d.data.id}
      </div>

      <div style="
        background-color:${highlight ? '#ffe7a3' : color};
        margin-top:${-imageDiffVert - 20}px;
        margin-left:15px;
        border-radius:100px;
        width:50px;
        height:50px;
      "></div>

      <div style="margin-top:${-imageDiffVert - 20}px;">
        <img 
          src="${d.data.image}" 
          style="margin-left:20px;border-radius:100px;width:40px;height:40px;" 
        />
      </div>

      <div style="
        font-size:15px;
        color:#08011E;
        margin-left:20px;
        margin-top:10px;
        font-weight:${highlight ? '600' : '500'};
      ">
        ${d.data.name}
      </div>

      <div style="
        color:#716E7B;
        margin-left:20px;
        margin-top:3px;
        font-size:10px;
      ">
        ${d.data.position}
      </div>

  </div>
</div>

	  `;
    };
  }
  */
  private nodeContent(state: ChartState) {
  const { searchScope, highlightedIds } = state;

  return (d: any) => {
    const show = !searchScope?.size || searchScope.has(d.data.id);
    const highlight = highlightedIds.has(d.data.id);

    const color = '#FFFFFF';
    const imageDiffVert = 25 + 2;

    // 🔹 Node type (fallback to managerial)
    const type: string =  'managerial';
    const fields = NODE_CARD_CONFIG[type] || [];

    // 🔹 Dynamic fields rendering (RTL aware)
     const renderedFields = fields
      .map(field => {
        const rawValue = d.data[field.key];
        if (!rawValue) return '';

        const value = field.format
          ? field.format(rawValue)
          : rawValue;

        return `
          <div dir="auto" style="
            margin-left:20px;
            margin-top:4px;
            margin-right:15px;
            font-size:11px;
            color:#444;
            text-align:right;
            unicode-bidi: plaintext;
            word-break: break-word;
          ">
            ${field.label 
              ? `<span style="color:#716E7B">${field.label}: </span>` 
              : ''}
            <span>${value}</span>
          </div>
        `;
      })
      .join('');

    return `
<div style='
  width:${d.width}px;
  height:${d.height}px;
  padding-top:${imageDiffVert - 2}px;
  padding-left:1px;
  padding-right:1px;
'>
  <div style="
    font-family: 'Inter', sans-serif;
    background-color:${highlight ? '#fff8dc' : color};
    margin-left:-1px;
    width:${d.width - 2}px;
    height:${d.height - imageDiffVert}px;
    border-radius:10px;
    border:2px solid ${highlight ? 'orange' : '#E4E2E9'};
    box-shadow:${highlight ? '0 0 0 3px rgba(255,165,0,0.25)' : 'none'};
    transition: all 0.2s ease;
    overflow:visible;
  ">

      <!-- ID -->
	  <!--
      <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px">
        #${d.data.id}
      </div>
-->
      <!-- Circle Background (same position as before) -->
      <div style="
        background-color:${highlight ? '#ffe7a3' : color};
        margin-top:${-imageDiffVert - 20}px;
        margin-left:15px;
        border-radius:100px;
        width:50px;
        height:50px;
      "></div>

      <!-- Image (same position as before, half outside card) -->
      <div style="margin-top:${-imageDiffVert + 7}px;">
        <img 
          src="./assets/icon_female.png" 
          style="
            margin-left:20px;
            border-radius:100px;
            width:40px;
            height:40px;
            object-fit:cover;
			border:solid 2px green;
          " 
        />
      </div>

      <!-- Name -->
      <div dir="auto" style="
        font-size:15px;
        color:#08011E;
        margin-left:20px;
        margin-top:10px;
        font-weight:${highlight ? '600' : '500'};
        text-align:right;
        unicode-bidi: plaintext;
      ">
        ${d.data.name || ''}
      </div>

      <!-- Position -->
      <div dir="auto" style="
        color:#716E7B;
        margin-left:20px;
        margin-top:3px;
        font-size:10px;
        text-align:right;
        unicode-bidi: plaintext;
      ">
        ${d.data.position || ''}
      </div>

      <!-- Dynamic Fields -->
      ${renderedFields}

  </div>
</div>
    `;
  };
}
  
}

