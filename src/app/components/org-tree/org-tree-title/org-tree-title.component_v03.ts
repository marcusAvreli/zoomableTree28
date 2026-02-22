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
    //this.initData();
	this.loadData();
	 console.log(" rootNode_loaded:", this.root);
    
	 
	 //this.update(this.root);
  }

  // ---------------- SVG ----------------
  private initSvg() {
    this.svg = d3.select(this.svgRef.nativeElement);
	//coordinates of root node
    this.g = this.svg.append('g').attr('transform', 'translate(400,40)');
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


  private makeRenderTemplate(): any[] {
    if (!this.root || !this.root.children?.length) return[];

    const children = this.root.children; // Get the children of root.

    const svgEl = this.svgRef.nativeElement;
    const containerWidth = svgEl.clientWidth || 800; // Get the width of the SVG container
    const containerHeight = svgEl.clientHeight || 600; // Get the height of the SVG container

    // Initialize an array to store the pyramid data based on children
    const pyramidData :any= [];

    let rowIndex = 1; // Start from row 1
    let colIndex = 1; // Start from column 1
    let nodesInCurrentRow = 4; // Start with 4 nodes in the first row
    const verticalSpacing = 150; // Vertical spacing between rows
    const baseY = 150; // Vertical starting position for rows

    const baseX = containerWidth / 2; // Center of the SVG for the first row (this will adjust based on the row)
    const initialXSpacing = 200; // Horizontal spacing between nodes (starting from a reasonable distance)

    // Calculate initial X positions for the first row (symmetrically placed around the center)
    const firstRowX = [
      -2 * initialXSpacing-100, // Leftmost
      -initialXSpacing-100,     // Left center
      initialXSpacing+100,      // Right center
      2 * initialXSpacing+100   // Rightmost
    ];

    // Iterate over children and apply logic to create pyramid-like structure
    children.forEach((child: any, index: number) => {
      let x, y;

      // First row nodes are centered and symmetrically placed
      if (rowIndex === 1) {
        x = firstRowX[colIndex - 1]; // Use pre-calculated X for the first row
        y = baseY; // All first row nodes are at the same Y position
      } else if (rowIndex === 2) {
        // Second row starts from x = -500 and ends at x = 500
        const xStep = (500 - (-500)) / (nodesInCurrentRow - 1); // Step between nodes for the second row
        x = -500 + (colIndex - 1) * xStep; // Spread nodes symmetrically from -500 to 500
        y = baseY + (rowIndex - 1) * verticalSpacing; // Vertical positioning based on row index
      } else {
        // For subsequent rows, calculate X step dynamically based on the row
        const xStep = containerWidth / nodesInCurrentRow; // Space between nodes in the row
        x = baseX + (colIndex - (nodesInCurrentRow / 2)) * xStep; // Spread nodes around the center
        y = baseY + (rowIndex - 1) * verticalSpacing; // Vertical positioning based on row index
      }

      // Push node data with id, row, col, piece, and coordinates (x, y)
      pyramidData.push({
        id: child.data.id, // Use child id (or node itself)
        row: rowIndex, // Row number
        col: colIndex, // Column number
        piece: child.piece || '', // Assuming each child might have a `piece` property or other identifier
        x: x, // Calculated X position
        y: y  // Calculated Y position
      });

      // Increment column index
      colIndex++;

      // When the number of columns exceeds the number of nodes for the current row, move to the next row
      if (colIndex > nodesInCurrentRow) {
        rowIndex++; // Move to the next row
        colIndex = 1; // Reset column index
        nodesInCurrentRow+=2; // Increase number of nodes in the next row (4, 5, 6, ...)
      }
    });

    // Output the generated pyramidData for debugging
    console.log(pyramidData);

    // Now pyramidData contains an array like this:
    // [
    //   { id: 1, row: 1, col: 1, piece: 'Rook' },
    //   { id: 2, row: 1, col: 2, piece: 'Knight' },
    //   { id: 3, row: 1, col: 3, piece: 'Bishop' },
    //   { id: 4, row: 1, col: 4, piece: 'Queen' },
    //   { id: 5, row: 2, col: 1, piece: 'Pawn' },
    //   { id: 6, row: 2, col: 2, piece: 'Pawn' },
    //   { id: 7, row: 2, col: 3, piece: 'Pawn' },
    //   { id: 8, row: 2, col: 4, piece: 'Pawn' },
    //   { id: 9, row: 2, col: 5, piece: 'Pawn' },
    //   { id: 10, row: 3, col: 1, piece: 'King' }
    //   // And so on...
    // ]

    // Continue to render the layout with this pyramidData, for example:
    // renderChessboard(pyramidData);
	return pyramidData;
  }


private layoutFirstLevelChess(): void {
  if (!this.root || !this.root.children?.length) return;

  const children = this.root.children;
  const pyramidData = this.makeRenderTemplate(); // Original x/y coordinates

  const svgEl = this.svgRef.nativeElement;
  const width = svgEl.clientWidth || 800;
  const height = svgEl.clientHeight || 600;
  console.log("original_widht:",width ," original_height:",height)
  const k = 0.3; // Zoom factor for enlarging visuals
  const horizontalPadding = 50; // Minimum horizontal distance between nodes
  const baseYOffset = 110; // Push all rows down
  const extraRowPadding = 80; // Extra vertical padding between rows

  // Group pyramidData by row
  const rowsMap = new Map<number, any[]>();
  pyramidData.forEach(node => {
    if (!rowsMap.has(node.row)) rowsMap.set(node.row, []);
    rowsMap.get(node.row)?.push(node);
  });

  // Find min and max Y from pyramidData to scale rows properly
  const allYs = pyramidData.map(n => n.y);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const totalHeight = height - baseYOffset - 50; // leave some bottom padding
  const scaleY = totalHeight / (maxY - minY);

  // Iterate over rows to assign coordinates
  Array.from(rowsMap.entries()).forEach(([rowNumber, rowNodes], rowIndex) => {
    const cols = rowNodes.length;
	
    // --- Node enlargement factor ---
    const k = 0.8; // scale up nodes
    const nodeWidth = this.nodeWidth * (1 + k); 

    // --- Pyramid layout: calculate row width dynamically ---
    const minRowWidth = nodeWidth * 2;      // top row width minimum
    const maxRowWidth = 1750;               // bottom row width = full container width
    const rowFraction = rowIndex / (rowsMap.size - 1); // 0 for top, 1 for bottom
    const rowWidth = minRowWidth + (maxRowWidth - minRowWidth) * rowFraction;

    // --- Horizontal spacing for chess/pyramid look ---
    const stepX = nodeWidth+100;                // equal to node width
    const totalRowWidth = stepX * (cols - 1);
    const startX = -totalRowWidth / 2;      // center row horizontally

    // --- Vertical positioning ---
    const topPadding = 160;                 // distance from root
    const extraRowPadding = 160;            // vertical space between rows
    const rowY = topPadding + rowIndex * extraRowPadding;

    rowNodes.forEach((node, colIndex) => {
      const child = children.find((c: any) => c.data.id === node.id);
	  console.log("colIndex ",colIndex, " rowIndex:",rowIndex)
	 
	  
      if (!child) return;

      // Assign X position
      child.x = startX + colIndex * stepX;

      // Assign Y position
      child.y = rowY;
	  if(rowIndex==0){
	  	if(colIndex<2){
	  		child.x -=220;
	  	}
	    }
		if(rowIndex==0){
		  	if(colIndex >= 2){
		  		child.x +=220;
		  	}
		    }
      // Enlarge nodes
      child.sizeFactor = 1 + k;

      // Layout subtree if any
      this.layoutSubtree(child);

      this.logger.info(
        'layoutFirstLevelPyramid',
        `row=${node.row}`,
        `col=${node.col}`,
        `x=${child.x}`,
        `y=${child.y}`,
        `sizeFactor=${child.sizeFactor}`
      );
    });
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
			           .attr('font-size', (d: any) => `${(16 * (d.sizeFactor || 1))}px`) // Scale font size based on sizeFactor
			           .text((d: any) => `${d.data.firstname} ${d.data.lastname}`);
  
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
  const k = Math.min(0.32, 0.32, 1); // never zoom > 1
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
