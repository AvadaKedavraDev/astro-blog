/**
 * SolidJS 可视化画布组件 - 卡片式样式
 */
import { For } from 'solid-js';
import type { StepState, VisualElement, Connection } from './types';

interface VisualCanvasProps {
  state: StepState;
  width?: number;
  height?: number;
  gridEnabled?: boolean;
}

export default function VisualCanvas(props: VisualCanvasProps) {
  const width = () => props.width || 850;
  const height = () => props.height || 480;
  const gridEnabled = () => props.gridEnabled !== false;

  const renderElement = (el: VisualElement) => {
    const commonProps = {
      id: `el-${el.id}`,
      transform: `translate(${el.x}, ${el.y})`,
      style: {
        opacity: el.visible !== false ? 1 : 0,
        transition: el.animated ? 'all 0.5s ease-out' : undefined,
      },
    };

    switch (el.type) {
      case 'array':
      case 'node':
        return (
          <g {...commonProps}>
            <rect
              x={-(el.width || 70) / 2}
              y={-(el.height || 48) / 2}
              width={el.width || 70}
              height={el.height || 48}
              rx={8}
              fill={el.color || 'var(--background)'}
              stroke="var(--border)"
              stroke-width={2}
            />
            <text
              x={0}
              y={0}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="var(--foreground)"
              font-size="13"
              font-family="var(--font-mono)"
              font-weight="500"
            >
              {String(el.value ?? el.label ?? '')}
            </text>
          </g>
        );

      case 'tree':
        return (
          <g {...commonProps}>
            <circle
              r={(el.width || 44) / 2}
              fill={el.color || 'var(--background)'}
              stroke="var(--foreground)"
              stroke-width={2}
            />
            <text
              x={0}
              y={4}
              text-anchor="middle"
              fill="var(--foreground)"
              font-size="12"
              font-family="var(--font-mono)"
              font-weight="500"
            >
              {String(el.value ?? el.label ?? '')}
            </text>
          </g>
        );

      case 'linked-list':
        return (
          <g {...commonProps}>
            <rect
              x={-(el.width || 100) / 2}
              y={-(el.height || 44) / 2}
              width={el.width || 100}
              height={el.height || 44}
              rx={8}
              fill={el.color || 'color-mix(in oklch, #f59e0b 8%, var(--background))'}
              stroke="#f59e0b"
              stroke-width={1.5}
            />
            <text
              x={0}
              y={0}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="var(--foreground)"
              font-size="12"
              font-family="var(--font-mono)"
              font-weight="500"
            >
              {String(el.value ?? el.label ?? '')}
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
        opacity={0.5}
      />
    );
  };

  const renderHighlight = (hl: { targetId: string; color: string; blink?: boolean }, elements: VisualElement[]) => {
    const target = elements.find(e => e.id === hl.targetId);
    if (!target) return null;

    return (
      <rect
        x={target.x - (target.width || 70) / 2 - 6}
        y={target.y - (target.height || 48) / 2 - 6}
        width={(target.width || 70) + 12}
        height={(target.height || 48) + 12}
        rx={12}
        fill="none"
        stroke={hl.color}
        stroke-width={2.5}
        opacity={0.6}
      >
        {hl.blink && (
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      </rect>
    );
  };

  return (
    <div class="card-base overflow-hidden">
      {/* SVG 画布 */}
      <svg
        width={width()}
        height={height()}
        viewBox={`0 0 ${width()} ${height()}`}
        class="w-full block"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="26"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--muted-foreground)" />
          </marker>
          
          {gridEnabled() && (
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--border)"
                stroke-width="1"
                opacity={0.6}
              />
            </pattern>
          )}
        </defs>
        
        {gridEnabled() && (
          <rect width="100%" height="100%" fill="url(#grid)" />
        )}
        
        <g>
          <For each={props.state.connections || []} key={item => `${item.from}-${item.to}`}>
            {(conn) => renderConnection(conn, props.state.elements)}
          </For>
        </g>
        
        <g>
          <For each={props.state.elements} key="id">
            {(el) => renderElement(el)}
          </For>
        </g>
        
        <g>
          <For each={props.state.highlights || []} key="targetId">
            {(hl) => renderHighlight(hl, props.state.elements)}
          </For>
        </g>
      </svg>
      
      {/* 步骤描述 - 在画布底部 */}
      {props.state.description && (
        <div class="px-4 py-3 border-t border-border bg-muted/30">
          <p class="text-sm leading-relaxed text-foreground">
            {props.state.description}
          </p>
        </div>
      )}
    </div>
  );
}
