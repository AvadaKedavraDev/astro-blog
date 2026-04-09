/**
 * SolidJS 可拖动缩放画布组件
 * 支持鼠标/触摸拖动、滚轮缩放、过渡动画
 */
import { For, createSignal, onMount, onCleanup } from 'solid-js';
import type { StepState, VisualElement, Connection } from './types';

interface PanZoomCanvasProps {
  state: StepState;
  gridEnabled?: boolean;
}

// 画布尺寸（与 demo 数据中的坐标系统一致）
export default function PanZoomCanvas(props: PanZoomCanvasProps) {
  // 使用 ref 直接操作 SVG，避免 SolidJS 信号更新延迟问题
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  
  // 视图状态
  let viewX = 850;
  let viewY = 550;
  let viewW = 700;
  let viewH = 500;
  let currentScale = 1;
  
  // UI 状态
  const [scaleDisplay, setScaleDisplay] = createSignal(130);
  const [isDragging, setIsDragging] = createSignal(false);
  const [showHint, setShowHint] = createSignal(true);
  
  let dragStart = { x: 0, y: 0 };
  let viewStart = { x: 0, y: 0 };

  // 更新 SVG viewBox
  const updateViewBox = () => {
    if (svgRef) {
      svgRef.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);
    }
    setScaleDisplay(Math.round(currentScale * 100));
  };

  // 重置视图
  const resetView = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    
    // 内容中心点（数组位置大约在 x=1200, y=810）
    const contentCenterX = 1200;
    const contentCenterY = 810;
    
    // 目标缩放比例
    currentScale = 1.3;
    
    // 根据容器大小计算 viewBox
    viewW = rect.width / currentScale;
    viewH = rect.height / currentScale;
    viewX = contentCenterX - viewW / 2;
    viewY = contentCenterY - viewH / 2;
    
    updateViewBox();
  };

  // 放大
  const zoomIn = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    
    currentScale = Math.min(currentScale * 1.2, 3);
    const centerX = viewX + viewW / 2;
    const centerY = viewY + viewH / 2;
    
    viewW = rect.width / currentScale;
    viewH = rect.height / currentScale;
    viewX = centerX - viewW / 2;
    viewY = centerY - viewH / 2;
    
    updateViewBox();
  };

  // 缩小
  const zoomOut = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    
    currentScale = Math.max(currentScale * 0.8, 0.3);
    const centerX = viewX + viewW / 2;
    const centerY = viewY + viewH / 2;
    
    viewW = rect.width / currentScale;
    viewH = rect.height / currentScale;
    viewX = centerX - viewW / 2;
    viewY = centerY - viewH / 2;
    
    updateViewBox();
  };

  // 鼠标滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    currentScale = Math.min(Math.max(currentScale * delta, 0.3), 3);
    
    // 计算新的 viewBox 尺寸
    const newW = rect.width / currentScale;
    const newH = rect.height / currentScale;
    
    // 以鼠标位置为中心缩放
    const zoomPointX = viewX + (mouseX / rect.width) * viewW;
    const zoomPointY = viewY + (mouseY / rect.height) * viewH;
    
    viewX = zoomPointX - (mouseX / rect.width) * newW;
    viewY = zoomPointY - (mouseY / rect.height) * newH;
    viewW = newW;
    viewH = newH;
    
    updateViewBox();
  };

  // 开始拖动
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart = { x: e.clientX, y: e.clientY };
    viewStart = { x: viewX, y: viewY };
    if (containerRef) {
      containerRef.style.cursor = 'grabbing';
    }
  };

  // 拖动中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging() || !containerRef) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // 根据当前缩放比例计算位移
    const scaleFactor = viewW / containerRef.getBoundingClientRect().width;
    
    viewX = viewStart.x - dx * scaleFactor;
    viewY = viewStart.y - dy * scaleFactor;
    
    updateViewBox();
  };

  // 结束拖动
  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef) {
      containerRef.style.cursor = 'grab';
    }
  };

  // 触摸支持
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      viewStart = { x: viewX, y: viewY };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging() || !containerRef || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    
    const scaleFactor = viewW / containerRef.getBoundingClientRect().width;
    
    viewX = viewStart.x - dx * scaleFactor;
    viewY = viewStart.y - dy * scaleFactor;
    
    updateViewBox();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  onMount(() => {
    if (containerRef) {
      containerRef.style.cursor = 'grab';
      containerRef.addEventListener('wheel', handleWheel, { passive: false });
      
      // 延迟初始化视图，确保容器已渲染
      setTimeout(() => {
        resetView();
      }, 100);
      
      setTimeout(() => setShowHint(false), 3000);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    onCleanup(() => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });
  });

  // 渲染元素
  const renderElement = (el: VisualElement) => {
    const commonProps = {
      id: `el-${el.id}`,
      transform: `translate(${el.x}, ${el.y})`,
      style: {
        opacity: el.visible !== false ? 1 : 0,
        transition: 'opacity 400ms ease-out',
      },
    };

    switch (el.type) {
      case 'array':
        return (
          <g {...commonProps}>
            <rect
              x={-(el.width || 90) / 2}
              y={-(el.height || 65) / 2}
              width={el.width || 90}
              height={el.height || 65}
              rx={8}
              fill="var(--background)"
              stroke="var(--border)"
              stroke-width={2}
            />
            <text
              x={0}
              y={-12}
              text-anchor="middle"
              fill="var(--muted-foreground)"
              font-size="10"
              font-family="var(--font-mono)"
              class="select-none"
            >
              {el.metadata?.hash !== undefined ? `hash:${el.metadata.hash}` : ''}
            </text>
            <text
              x={0}
              y={4}
              text-anchor="middle"
              fill="var(--foreground)"
              font-size="12"
              font-family="var(--font-mono)"
              font-weight="600"
              class="select-none"
            >
              {String(el.metadata?.key ?? el.value ?? '')}
            </text>
            <text
              x={0}
              y={20}
              text-anchor="middle"
              fill={el.metadata?.next ? '#f59e0b' : 'var(--muted-foreground)'}
              font-size="10"
              font-family="var(--font-mono)"
              class="select-none"
            >
              {el.metadata?.next ? `next:${el.metadata.next}` : 'next:null'}
            </text>
          </g>
        );

      case 'tree':
        return (
          <g {...commonProps}>
            <circle
              r={(el.width || 50) / 2}
              fill={el.color || 'var(--background)'}
              stroke="var(--foreground)"
              stroke-width={2}
            />
            <text
              x={0}
              y={4}
              text-anchor="middle"
              fill="var(--foreground)"
              font-size="11"
              font-family="var(--font-mono)"
              font-weight="500"
              class="select-none"
            >
              {String(el.metadata?.key ?? el.value ?? '')}
            </text>
          </g>
        );

      case 'linked-list':
        return (
          <g {...commonProps}>
            <rect
              x={-(el.width || 110) / 2}
              y={-(el.height || 55) / 2}
              width={el.width || 110}
              height={el.height || 55}
              rx={10}
              fill={el.color || 'color-mix(in oklch, #f59e0b 12%, var(--background))'}
              stroke="#f59e0b"
              stroke-width={2}
              style="filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.2))"
            />
            <text
              x={0}
              y={-4}
              text-anchor="middle"
              fill="var(--foreground)"
              font-size="12"
              font-family="var(--font-mono)"
              font-weight="600"
              class="select-none"
            >
              {String(el.metadata?.key ?? '')}
            </text>
            <text
              x={0}
              y={16}
              text-anchor="middle"
              fill="#92400e"
              font-size="9"
              font-family="var(--font-mono)"
              class="select-none"
            >
              hash:{el.metadata?.hash} → {el.metadata?.next || 'null'}
            </text>
          </g>
        );

      case 'text':
        return (
          <g {...commonProps}>
            <text
              x={0}
              y={0}
              text-anchor="middle"
              fill={el.color || 'var(--foreground)'}
              font-size="14"
              font-weight="500"
              font-family="var(--font-sans)"
              class="select-none"
            >
              {String(el.value ?? el.label ?? '')}
            </text>
          </g>
        );

      default:
        return (
          <g {...commonProps}>
            <rect
              x={-30}
              y={-20}
              width={60}
              height={40}
              rx={8}
              fill="var(--muted)"
              stroke="var(--border)"
              stroke-width={1.5}
            />
          </g>
        );
    }
  };

  const renderConnection = (conn: Connection, elements: VisualElement[]) => {
    const from = elements.find(e => e.id === conn.from);
    const to = elements.find(e => e.id === conn.to);
    if (!from || !to) return null;

    return (
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={conn.color || 'var(--muted-foreground)'}
        stroke-width={conn.width || 2}
        stroke-dasharray={conn.dashed ? '5,5' : undefined}
        marker-end={conn.type === 'arrow' ? 'url(#arrowhead)' : undefined}
        opacity={0.6}
      />
    );
  };

  const renderHighlight = (hl: { targetId: string; color: string; blink?: boolean }, elements: VisualElement[]) => {
    const target = elements.find(e => e.id === hl.targetId);
    if (!target) return null;

    return (
      <rect
        x={target.x - (target.width || 90) / 2 - 8}
        y={target.y - (target.height || 65) / 2 - 8}
        width={(target.width || 90) + 16}
        height={(target.height || 65) + 16}
        rx={12}
        fill="none"
        stroke={hl.color}
        stroke-width={3}
        opacity={0.5}
        class={hl.blink ? 'animate-pulse' : ''}
      />
    );
  };

  return (
    <div class="card-base overflow-hidden flex flex-col h-full">
      {/* 工具栏 */}
      <div class="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               class="text-indigo-500">
            <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/>
            <path d="M3 16.2V21m0 0h4.8M3 21l6-6"/>
            <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/>
            <path d="M3 7.8V3m0 0h4.8M3 3l6 6"/>
          </svg>
          <span class="text-sm font-medium text-foreground">可视化画布</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={zoomOut}
            title="缩小"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <span class="text-xs font-mono w-12 text-center text-muted-foreground">
            {scaleDisplay()}%
          </span>
          <button
            class="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={zoomIn}
            title="放大"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button
            class="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors ml-1"
            onClick={resetView}
            title="重置视图"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>
          </button>
        </div>
      </div>

      {/* 画布区域 */}
      <div 
        ref={containerRef}
        class="relative overflow-hidden bg-background flex-1 min-h-0"
        style={{ cursor: isDragging() ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 操作提示 */}
        {showHint() && (
          <div class="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-foreground/90 text-background text-xs pointer-events-none animate-pulse">
            滚轮缩放 · 拖动平移
          </div>
        )}

        <svg
          ref={svgRef}
          class="w-full h-full block"
          viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="32"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
            </marker>

            {props.gridEnabled !== false && (
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="var(--border)"
                  stroke-width="1"
                  opacity={0.35}
                />
              </pattern>
            )}
          </defs>
          
          {/* 背景网格 */}
          {props.gridEnabled !== false && (
            <rect x={viewX} y={viewY} width={viewW} height={viewH} fill="url(#grid)" />
          )}
          
          {/* 连接线层 */}
          <g>
            <For each={props.state.connections || []}>
              {(conn) => renderConnection(conn, props.state.elements)}
            </For>
          </g>
          
          {/* 元素层 */}
          <g>
            <For each={props.state.elements}>
              {(el) => renderElement(el)}
            </For>
          </g>
          
          {/* 高亮层 */}
          <g>
            <For each={props.state.highlights || []}>
              {(hl) => renderHighlight(hl, props.state.elements)}
            </For>
          </g>
        </svg>
      </div>

      {/* 步骤描述 */}
      <div class="px-4 py-2.5 border-t border-border bg-muted/30 shrink-0">
        <p class="text-sm text-foreground truncate">
          {props.state.description || '等待执行...'}
        </p>
      </div>
    </div>
  );
}
