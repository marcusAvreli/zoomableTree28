import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  EventEmitter,
  Output
} from '@angular/core';
import { takeUntil, tap,map,firstValueFrom  } from 'rxjs';
import { OrgNode } from '../../../core/models/org-node.model';
import { OrgNodeService } from '../../../core/backend/org-node.service';
import { LoggerService } from '../../../core/services/logger.service';
import * as d3 from 'd3';
/*
🔗 Scale link anchor points correctly

🔍 Integrate with d3.zoom

📐 Add collision safety for deep subtrees

🎯 Auto-balance rows based on container aspect ratio
*/
interface TreeNode {
  id: string;
  firstName: string;
  lastName: string;
  divisionName: string;
  children?: TreeNode[];
  _children?: TreeNode[];
}

@Component({
  selector: 'app-org-tree-title',
  templateUrl: './org-tree-title.component.html',
  styleUrls: ['./org-tree-title.component.scss']
})
export class OrgTreeTitleComponent  implements AfterViewInit {

  @ViewChild('svg', { static: true }) svgRef!: ElementRef<SVGSVGElement>;
  @Output() nodeSelected = new EventEmitter<string | number>();

  private svg!: any;
  private g!: any;

  private root!: any;
  private duration = 500;

  private cell = 90;
  private cols = 5;
  private baseY = 140;
  
  partialRowAlign: 'left' | 'center' | 'right' = 'center'; // change as needed
  private marginLeft = 80;
private marginRight = 80;
private minCols = 1;
private maxCols = 8;
private margin = { top: 40, left: 40, right: 40 };


private nodeWidth = 180;
private nodeHeight = 64;

private nodePaddingX = 40;
private nodePaddingY = 100;

// Derived spacing
private cellX = this.nodeWidth + this.nodePaddingX;
private cellY = this.nodeHeight + this.nodePaddingY;

constructor(private readonly orgNodeService: OrgNodeService
	,private logger: LoggerService
	
	) {
	}
  ngAfterViewInit(): void {
    this.initSvg();
	 console.log(" rootNode_loaded:", this.root);
    this.initData();
	//this.loadData();
	 console.log(" rootNode_loaded:", this.root);
    
	 
	 //this.update(this.root);
  }

  // ---------------- SVG ----------------
  private initSvg() {
    this.svg = d3.select(this.svgRef.nativeElement);
	//coordinates of root node
    this.g = this.svg.append('g').attr('transform', 'translate(40,40)');
  }

  // ---------------- DATA ----------------
  
  private loadData(){
	  this.orgNodeService.searchByRange()
	    .pipe(
        tap((res: any) => {
         // this.logger.info("ensureChildrenRaw",'raw_object', 'rest_api', 'cold_start', res);
		 this.logger.info("ensureChildrenRaw",'raw_object', 'rest_api', 'cold_start', res);
        })
      )
      .subscribe({
        next: (nodes: OrgNode[]) => {
          console.log("ensureChildrenRaw loaded:", nodes);
		  const rootNode = this.findRootNode(nodes);
		  this.logger.info("ensureChildrenRaw rootNode_loaded:", rootNode);
		
		if (!rootNode) return;
          if (nodes?.length) {
            /*rootNode!.children = nodes.map((c: any) => {
              const copy = { ...c };
              copy.children = copy.children ?? undefined;
              copy._children = copy._children ?? undefined;
              copy.hasChildren = !!copy.hasChildren;
              return copy;
            });
			
			*/
			rootNode!.children = nodes.filter(n => n.id !== rootNode.id)   // ✅ remove root
			  .map((n:any) => {
				const copy = { ...n };
				 copy.children = copy.children ?? undefined;
              copy._children = copy._children ?? undefined;
              copy.hasChildren = !!copy.hasChildren;
				return copy;
			  });
			
			this.root = d3.hierarchy(rootNode);
			this.root.x0 = 0;
			this.root.y0 = 0;
            console.log("ensureChildrenRaw transformed raw:", rootNode);
			this.update(this.root);
          // resolve(raw.children);
          }
/*		  else {
            //resolve(undefined);
          }
		  */
        },
        error: (err:any) => {
          console.error(err);
          //reject(err);
        }
      });
  }
  private initData() {
	const data: TreeNode = {
		id: '64b6d7755a2a4cc1bd1e7a610c47b750',
		firstName: 'Daniel',
		lastName: 'Cohen',
		divisionName: 'Executive',

		children: [
		{
			id: '2a4705155ac1434897f1e7944535599e',
			firstName: 'Sarah',
			lastName: 'Levi',
			divisionName: 'Finance'

		}
		,
		{
			id: '2e89ad2f55ea40c4af1f7fb34bead824',
			firstName: 'Amit',
			lastName: 'Katz',
			divisionName: 'Engineering'

		}
		,
		{
		id: '35a1e7327b90492cb7b63cf1a9eb3698',
		firstName: 'Rina',
		lastName: 'Mor',
		divisionName: 'HR'
		}
		,
		{
			id: '3d8b9a8b8eb14adeb32aaff9f60f729c',
			firstName: 'Moshe',
			lastName: 'Azulai',
			divisionName: 'Sales'
		}
		,
		{
		id: '5e0e5600b7134e258355003a996501ac',
		firstName: 'Tal',
		lastName: 'Noy',
		divisionName: 'Marketing'
		}
		,
		{
		id: 'c3441d8774754ed683191f7dbcd659a3',
		firstName: 'Yossi',
		lastName: 'Halevi',
		divisionName: 'Support'
		}
	
		,
		{
		id: 'd7',
		firstName: 'Dana',
		lastName: 'Peretz',
		divisionName: 'Operations'
		}
		,
		{
		id: 'd8',
		firstName: 'Itai',
		lastName: 'Friedman',
		divisionName: 'Security'
		}
		,{
		id: 'd9',
		firstName: 'Maya',
		lastName: 'Ron',
		divisionName: 'Product'
		}
		,
		{
		id: 'd10',
		firstName: 'Omer',
		lastName: 'Ziv',
		divisionName: 'IT'
		}
		
		,
		{
		id: 'd11',
		firstName: 'Omer2',
		lastName: 'Ziv2',
		divisionName: 'IT2'
		}
	,
		{
		id: 'd12',
		firstName: 'Omer2',
		lastName: 'Ziv2',
		divisionName: 'IT2'
		}
	  ,
		{
		id: 'd13',
		firstName: 'Omer2',
		lastName: 'Ziv2',
		divisionName: 'IT2'
		}
		 ,
		{
		id: 'd14',
		firstName: 'Omer2',
		lastName: 'Ziv2',
		divisionName: 'IT2'
		}
		
	  
    ]
  };
console.log("pyramid_Data -3:",this.root);
    this.root = d3.hierarchy(data);
	console.log("pyramid_Data -2:",this.root);
    this.root.x0 = 0;
    this.root.y0 = 0;
	console.log("pyramid_Data -1:",this.root.children);
	this.update(this.root);
  }
/*
 getRow1Xs(count: number, stepX: number): number[] {
  const xs: number[] = [];
  const pairs = count / 2;
console.log("pyramid_Data: ", " getRow1Xs:",pairs);
  for (let i = 1; i <= pairs; i++) {
    xs.push(-i * stepX);
    xs.push( i * stepX);
  }

  return xs;
}
*/

getRow1Xs(count: number, stepX: number): number[] {
  // ---- 0 nodes ----
  if (count <= 0) return [];

  // ---- 1 node ----
  if (count === 1) return [0];

  const xs: number[] = [];
  const pairs = Math.floor(count / 2);

  for (let i = 1; i <= pairs; i++) {
    xs.push(-i * stepX);
    xs.push( i * stepX);
  }
console.log("pyramid_Data: ", " getRow1Xs:",pairs,xs);
  // keep left → right order
  return xs.sort((a, b) => a - b);
}
 splitRows(n: number): { row1: number; row2: number } {
  if (n <= 3) {
    return { row1: n, row2: 0 };
  }

  let row1 = Math.floor(n / 2);

  // pull back row1 when imbalance is visually too strong
  if (n % 4 === 2 || n % 4 === 3) {
    row1 -= 1;
  }

  // safety
  row1 = Math.max(1, row1);

  return {
    row1,
    row2: n - row1
  };
}


 getRowXs(count: number, stepX: number): number[] {
  if (count === 1) return [0];

  const xs: number[] = [];
  const start = -((count - 1) * stepX) / 2;

  for (let i = 0; i < count; i++) {
    xs.push(start + i * stepX);
  }

  return xs;
}

 getUpperRowXs(
  upperCount: number,
  lowerXs: number[]
): number[] {
  if (upperCount === 1) return [0];

  const xs: number[] = [];

  if (upperCount === lowerXs.length) {
    // same width → copy
    return [...lowerXs];
  }

  // place between lower nodes
  for (let i = 0; i < upperCount; i++) {
    const left = lowerXs[i];
    const right = lowerXs[i + 1];
    xs.push((left + right) / 2);
  }

  return xs;
}
 row1Calc(children: number): number {
   if (children === 20) return 8; // special cap

    const block = Math.floor(children / 4);
    const remainder = children % 4;

    if (remainder === 3) {
        return 2 * block + 1;
    } else {
        return 2 * block;
    }
}
private makeRenderTemplate(): any[] {
  if (!this.root || !this.root.children?.length) return [];

  const children = this.root.children;
  const n = children.length;
const abc = this.row1Calc(n);
console.log("row1Count:"+abc);
  // ---- Layout units ----
  const nodeWidth = 3;
  const nodeHeight = 1;
  const paddingRootX = 2;
  const paddingRootY = 2;
  const paddingBetweenX = 1;
  const paddingBetweenY = 1;
  const stepX = nodeWidth + paddingBetweenX;
  const stepY = nodeHeight + paddingBetweenY;
console.log("row1Count", "before");
  // ---- Row split ----
  const { row1, row2 } = this.splitRows(n);
  const row1Count = abc;
  const row2Count = n- row1Count;
console.log("row1Count: ",row1Count, " row2Count:", row2Count);
  const pyramidData: any[] = [];
  let index = 0;

  // ---------- Helpers ----------
const getRowXs = (count: number, stepX: number): number[] => {
  if (count === 1) return [0];

  const xs: number[] = [];
 const totalWidth = stepX * (count - 1); // distance from first to last node
  const halfWidth = totalWidth / 2;
  const half = Math.floor(count / 2);

  const result: number[] = [];

  for (let i = half; i > 0; i--) {
    result.push(-halfWidth * (i / half));
  }

  if (count % 2 === 1) {
    result.push(0);
  }

  for (let i = 1; i <= half; i++) {
    result.push(halfWidth * (i / half));
  }

 
  console.log("result" ,"down ",result, " totalWidth:",totalWidth, " half:",half);
  
   
  return result;
	

};

  // Stagger upper row between lower row positions
 const getUpperRowXs = (
  upperCount: number,
  lowerXs: number[],
  stepX: number
): number[] => {
/*
  // ---- Single node ----
  if (upperCount === 1) return [0];

  // ---- Upper row spacing is ALWAYS tighter ----
  const upperSpacing = stepX / 2;

  // ---- 2 nodes ----
  if (upperCount === 2) {
    return [-upperSpacing, upperSpacing];
  }

  // ---- 3 nodes ----
  if (upperCount === 3) {
    return [-upperSpacing, 0, upperSpacing];
  }

  // ---- 4+ nodes ----
  console.log("upperSpacing:",upperSpacing," upperCount:",upperCount);
  const start = -((upperCount - 1) * upperSpacing) / 2;
  return Array.from(
    { length: upperCount },
    (_, i) => start + i * upperSpacing
  );
  */
  /* const xs: number[] = [];

  for (let i = 0; i < upperCount/2; i++) {
    const left = lowerXs[i * 2];
    const right = lowerXs[i * 2 + 1];
console.log("left:",left," right:",right, " lowerXs:",lowerXs);
    if (right !== undefined) {
      xs.push((left + right) / 2);
    } else {
      xs.push(left);
    }
  }
console.log("left:"," right:", " lowerXs:",lowerXs," xs:",xs);
  return xs;
  */
 if (!lowerXs || lowerXs.length < 2 || upperCount < 1) return [];

  let  step = -1;
  if(lowerXs.length == 2){
	  step = 4;
  }else{
  step = lowerXs[1] - lowerXs[0]; // base step
  }
  const count = lowerXs.length;
  const totalWidth = stepX * 2*(count-1); // double stepX as you mentioned
  const halfWidth = totalWidth / 2;

  const leftHalf: number[] = [];

  // compute first half of upper row
  const halfNodes = Math.floor(upperCount / 2);

  for (let i = 0; i < halfNodes; i++) {
    // find corresponding lower nodes
    const left = lowerXs[i];
   
    const mid = left + step / 2; // midpoint between bottom nodes
    leftHalf.push(mid);
  }

  const result: number[] = [...leftHalf];

  // add middle node if odd upperCount
  if (upperCount % 2 === 1) {
    result.push(0);
  }

  // mirror left half for right side
  const mirrored = leftHalf.map(x => -x).reverse();
  result.push(...mirrored);




	
	console.log("totalWidth: ",totalWidth,"  count:",count ,"upperCount:",upperCount," step:",step," stepX:",stepX,"resultUpper:",result);
  return result;
};

  // ---------- Compute X positions ----------
  const row2Xs = getRowXs(row2Count, stepX*2 ); // row2 wider
const row1Xs =
  row1Count > 0
    ? getUpperRowXs(row1Count, row2Xs, stepX)
    : [];
console.log("row2Xs: ",row2Xs," row1Xs: ",row1Xs, " stepX:",stepX);
  // ---------- Row 1 ----------
  row1Xs.forEach((x, i) => {
    pyramidData.push({
      id: children[index++].data.id,
      row: 1,
      col: i + 1,
      x,
      y: paddingRootY
    });
  });

  // ---------- Row 2 ----------
  row2Xs.forEach((x, i) => {
    pyramidData.push({
      id: children[index++].data.id,
      row: 2,
      col: i + 1,
      x,
      y: paddingRootY + stepY
    });
  });

  console.log("pyramid_Data:", pyramidData);
  return pyramidData;
}
/*
+-------------------------------------------------------+
|														|
|	UPDGRADE START										|
|														|
+-------------------------------------------------------+
*/

private computeBounds(nodes: any[]) {
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  });
   return { minX, maxX, minY, maxY };
}

 createScales(
  bounds: any,
  svgWidth: number,
  svgHeight: number
) {
  const paddingX = 40; // screen padding
  const paddingY = 40;

  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  const scaleX = (x: number) =>
    paddingX +
    ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * usableWidth;

  const scaleY = (y: number) =>
    paddingY +
    ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * usableHeight;

  return { scaleX, scaleY };
}

private layoutFirstLevelChess(): void {
  if (!this.root || !this.root.children?.length) return;

  const pyramidData = this.makeRenderTemplate();

  const svgEl = this.svgRef.nativeElement;
  const svgWidth = svgEl.clientWidth;
  const svgHeight = svgEl.clientHeight;

  // 1️⃣ Compute logical bounds (INCLUDING ROOT CENTER)
  const bounds = this.computeBounds(pyramidData);
console.log("bounds:",bounds);
  // ⬇️ FORCE symmetry around x = 0
  bounds.minX = Math.min(bounds.minX, 0);
  bounds.maxX = Math.max(bounds.maxX, 0);
  bounds.minY = Math.min(bounds.minY, 0);
  bounds.maxY = Math.max(bounds.maxY, 0);

  // 2️⃣ Logical → pixel scale
  const padding = 40;
const logicalWidth = Math.max(1, bounds.maxX - bounds.minX);
  const pxPerUnitX =
    (svgWidth - 100 * 2) / logicalWidth;

  const pxPerUnitY =
    (svgHeight - padding * 2) / (bounds.maxY - bounds.minY);
const pxPerUnit = Math.min(pxPerUnitX, pxPerUnitY);

  // 3️⃣ Logical node size (single source of truth)
  const logicalNodeWidth = 3;
  const logicalNodeHeight = 1;

  // 4️⃣ Convert logical → pixel
 
  this.nodeWidth = logicalNodeWidth * pxPerUnit;
  this.nodeHeight = logicalNodeHeight * pxPerUnit;
  
  console.log("Sizing ","Width_And_X"," logicalNodeWidth: " ,logicalNodeWidth, " pxPerUnitX: ", pxPerUnitX, " nodeWidth:",this.nodeWidth);
  console.log("Sizing ","Height_And_Y", " logicalNodeHeight:",logicalNodeHeight, " pxPerUnitY: ",  pxPerUnitY, " nodeHeight",this.nodeHeight);

  // 5️⃣ Scaling functions (CENTER PRESERVED)
  const logicalCenterX = (bounds.minX + bounds.maxX) / 2;
const logicalCenterY = (bounds.minY + bounds.maxY) / 2;
  
  const scaleX = (x: number) =>
   (x - logicalCenterX) * pxPerUnitX;

const scaleY = (y: number) =>
  padding + (y - bounds.minY) * pxPerUnitY;
  
  
  pyramidData.forEach(node => {
    const child = this.root.children.find(
      (c: any) => c.data.id === node.id
    );
	console.log("caculate:", " pyramid_Data:",pyramidData," child:",child, " this.root.children:",this.root.children);
    if (!child) return;
console.log("caculate ","before "," node.x: ",node.x," node.y:",node.y)
    child.x = scaleX(node.x);
    child.y = scaleY(node.y);
console.log("caculate ","after "," child.x: ",child.x," child.y:",child.y, " scaleX:",scaleX, " logicalCenterX:",logicalCenterX," pxPerUnit:",pxPerUnit, " pxPerUnitX:",pxPerUnitX)
    child.sizeFactor = 1.6; // visual only

    this.layoutSubtree(child);
  });
}





private paddingLeft(svgWidth: number, cols: number, colIndex: number, nodeWidth: number, sizeFactor: number, extraPadding: number) {
  const totalWidth = cols * (nodeWidth * sizeFactor + extraPadding) - extraPadding; // total occupied width
  const startX = (svgWidth - totalWidth) / 2; // start position to center children
  return startX + colIndex * (nodeWidth * sizeFactor + extraPadding) + (nodeWidth * sizeFactor) / 2;
}
  // ---------------- UPDATE ----------------
  private update(source: any) {
	// Root fixed at top
	this.root.x = 0;
	this.root.y = 0;
	// First-level children: chess layout
	this.cols = this.computeCols();


	//layout
	this.layoutFirstLevelChess();

    const nodes = this.root.descendants();
    const links = this.root.links();

    // ---------------- NODES ----------------
    const node = this.g.selectAll('g.node')
      .data(nodes, (d:any) => d.data.id);

    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (_:any) => `translate(${source.x0},${source.y0-20})`)
      /*.on('click', (_ : any, d:any) =>{ 
			if (d.depth === 0){
				this.toggle(d)
			}
			if (d.depth > 0){
				console.log("child_clicked", d);
				}
		});
		*/
		/*.each((d: any, i: number, nodes: any[]) => {
		  const sel = d3.select(nodes[i]);

		  if (d.depth === 0) {
		    sel.on('click', () => this.toggle(d));
		  } else {
		    sel.on('click', () => this.childClick.emit(d.data.id));
		  }
		});
		*/
		.on('click', (event: MouseEvent, d: any) => {
		    event.stopPropagation();
		    this.onNodeClicked(d, event.currentTarget as SVGGElement);
		  })
		  .on('dblclick', (event: MouseEvent, d: any) => {
		    event.stopPropagation();
		    this.toggle(d);
		  });

		  nodeEnter.append('rect')
		       .attr('x', (d: any) => -this.nodeWidth / 2 * (d.sizeFactor || 1)) // Scale based on sizeFactor
		       .attr('y', (d: any) => -this.nodeHeight / 2 * (d.sizeFactor || 1)) // Scale based on sizeFactor
		       .attr('width', (d: any) => this.nodeWidth * (d.sizeFactor || 1))  // Scale width
		       .attr('height', (d: any) => this.nodeHeight * (d.sizeFactor || 1)) // Scale height
		       .attr('rx', 10)
		       .attr('fill', (d: any) => d.depth === 0 ? '#1e3c95' : '#484795');
  
  
			   nodeEnter.append('text')
			           .attr('y', -6)
			           .attr('text-anchor', 'middle')
			           .attr('fill', '#e5e7eb')
			           .attr('font-weight', 600)
			           .attr('font-size', (d: any) => `${(8 * (d.sizeFactor || 1))}px`) // Scale font size based on sizeFactor
			           .text((d: any) => `${d.data.firstName} ${d.data.lastName}`);
  
					   nodeEnter.append('text')
					          .attr('y', 14)
					          .attr('text-anchor', 'middle')
					          .attr('fill', '#e5e7eb')
					          .attr('font-size', (d: any) => `${(11 * (d.sizeFactor || 1))}px`) // Scale font size based on sizeFactor
					          .text((d: any) => d.data.divisionName);



    nodeEnter.merge(node as any)
      .transition()
      .duration(this.duration)
      .attr('transform', (d:any) => `translate(${d.x},${d.y})`);

    node.exit()
      .transition()
      .duration(this.duration)
      .attr('transform', (_:any) => `translate(${source.x},${source.y})`)
      .remove();

    // ---------------- LINKS ----------------
    const link = this.g.selectAll('path.link')
      .data(links, (d:any) => d.target.data.id);

    const linkEnter = link.enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 1.5)
      .attr('d', (_:any) => this.linkPath({
        source: source,
        target: source
      }));

    linkEnter.merge(link as any)
      .transition()
      .duration(this.duration)
      .attr('d', (d:any) => this.linkPath(d));

    link.exit()
      .transition()
      .duration(this.duration)
      .attr('d', (_:any) => this.linkPath({
        source: source,
        target: source
      }))
      .remove();

    // Store old positions
    nodes.forEach((d:any) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
	this.centerTree(true,nodes);
  }
  
  private getNodeFill(d: any): string {
  	console.log("get_node_fill");
    if (d.data?.selected) {
      return '#ff9800'; // selected color
    }
    return d.depth === 0 ? '#1e3c95' : '#484795';
  }
  private onNodeClicked(d: any, nodeEl: SVGGElement): void {
    this.clearSelection();
    d.data.selected = true;

    d3.select(nodeEl)
      .select('rect')
      .attr('fill', this.getNodeFill(d));

    this.nodeSelected.emit(d.data.id);
  }
  private clearSelection(): void {
    this.g.selectAll('rect')
      .each((d: any, i:number, nodes : any) => {
        d.data.selected = false;
        d3.select(nodes[i])
          .attr('fill', this.getNodeFill(d));
      });
  }
private layoutSubtree(parent: any) {
  if (!parent.children) return;

  let offsetX = -((parent.children.length - 1) * this.cellX) / 2;

  parent.children.forEach((child: any, i: number) => {
    // place child relative to parent
    child.x = parent.x + offsetX + i * this.cellX;
    child.y = parent.y + this.nodeHeight + this.nodePaddingY;

    this.layoutSubtree(child);
  });
}
  // ---------------- LINK PATH (ANTI-OVERLAP) ----------------
  private linkPath(d: any): string {
      const sx = d.source.x;
  const sy = d.source.y + this.nodeHeight / 2;

  const tx = d.target.x;
  const ty = d.target.y - this.nodeHeight / 2;

  const midY = sy + 30; // small drop, avoids sibling illusion

  return `
    M ${sx},${sy}
    V ${midY}
    H ${tx}
    V ${ty}
  `;
  }
  
  private centerTree(animate = true, nodes?: any[]) {
    const svgEl = this.svgRef.nativeElement;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 600;

    const rootX = this.root.x ?? 0;
    const rootY = this.root.y ?? 0;

    // compute zoom based on tree bounding box
    let k = 1;
    if (nodes) {
      k = this.computeAutoZoom(nodes);
    }

    // center root horizontally and respect margin vertically
    const translateX = width / 2 - rootX * k;
    const translateY = this.margin.top - rootY * k-20;

    const transform = `translate(${translateX},${translateY}) scale(${k})`;

    if (animate) {
      this.g
        .transition()
        .duration(this.duration)
        .attr('transform', transform);
    } else {
      this.g.attr('transform', transform);
    }
  }
private computeCols(): number {
  const svgEl = this.svgRef.nativeElement;
  const width = svgEl.clientWidth || 800;

  // available width for nodes
  const usableWidth = width - this.marginLeft - this.marginRight;

  // number of nodes that can fit
  let cols = Math.floor(usableWidth / this.cellX);

  // clamp to min/max
  cols = Math.max(this.minCols, Math.min(cols, this.maxCols));

  return cols;
}

private computeAutoZoom(nodes: any[]): number {
  if (!nodes?.length) return 1;

  const svgEl = this.svgRef.nativeElement;
  const width = svgEl.clientWidth || 800;
  const height = svgEl.clientHeight || 600;

  // bounding box of all nodes
  const minX = d3.min(nodes, (d:any) => d.x - this.nodeWidth / 2) ?? 0;
  const maxX = d3.max(nodes, (d:any) => d.x + this.nodeWidth / 2) ?? 0;
  const minY = d3.min(nodes, (d:any) => d.y - this.nodeHeight / 2) ?? 0;
  const maxY = d3.max(nodes, (d:any) => d.y + this.nodeHeight / 2) ?? 0;

  const treeWidth = maxX - minX;
  const treeHeight = maxY - minY;

  // scale to fit available width/height with margin
  const scaleX = (width - this.margin.left - this.margin.right) / treeWidth;
  const scaleY = (height - this.margin.top - this.margin.top) / treeHeight;

  // pick the smaller scale (fit both width and height)
  const k = Math.min(1, 1, 1); // never zoom > 1
  return k;
}

  // ---------------- TOGGLE ----------------
  private toggle(d: any) {
    if (d.children) {
      d._children = d.children;
      d.children = undefined;
    } else {
      d.children = d._children;
      d._children = undefined;
    }
    this.update(d);
  }
  
  
  
  
  public findRootNode(nodes: OrgNode[]): OrgNode | null {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  // 1️⃣ Prefer nodes with empty parentPath
  const explicitRoots = nodes.filter(
    n => !n.parentPath || n.parentPath.length === 0
  );

  if (explicitRoots.length === 1) {
    return explicitRoots[0];
  }

  if (explicitRoots.length > 1) {
    // if multiple, pick the one with shortest path anyway
    return explicitRoots.reduce((a, b) =>
      (a.parentPath?.length ?? 0) <= (b.parentPath?.length ?? 0) ? a : b
    );
  }

  // 2️⃣ Otherwise, choose node with shortest parentPath
  return nodes.reduce((minNode, current) => {
    const minLen = minNode.parentPath?.length ?? Number.MAX_SAFE_INTEGER;
    const curLen = current.parentPath?.length ?? Number.MAX_SAFE_INTEGER;

    return curLen < minLen ? current : minNode;
  });
}
}
