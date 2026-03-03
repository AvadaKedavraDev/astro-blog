/**
 * SolidJS 代码面板组件 - 卡片式样式
 */
import { For, createMemo } from 'solid-js';
import type { CodeLine } from './types';

interface CodePanelProps {
  codeLines: CodeLine[];
  currentStepRange: [number, number];
  title?: string;
  language?: string;
}

export default function CodePanel(props: CodePanelProps) {
  const isInRange = (lineIndex: number) => {
    const [start, end] = props.currentStepRange;
    return lineIndex >= start && lineIndex <= end;
  };

  const currentExplanation = createMemo(() => {
    const [start] = props.currentStepRange;
    return props.codeLines[start]?.explanation || '';
  });

  return (
    <div class="card-base overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div class="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               class="text-emerald-500">
            <path d="m18 16 4-4-4-4"/>
            <path d="m6 8-4 4 4 4"/>
            <path d="m14.5 4-5 16"/>
          </svg>
          <span class="text-sm font-semibold text-foreground">
            {props.title || '源码'}
          </span>
        </div>
        <span class="text-xs font-mono px-2 py-0.5 rounded bg-background text-muted-foreground border border-border">
          {props.language || 'java'}
        </span>
      </div>

      {/* 代码区域 */}
      <div class="flex-1 overflow-auto px-3 py-2 bg-background min-h-0">
        <div class="font-mono text-[13px] leading-6">
          <For each={props.codeLines}>
            {(line, index) => (
              <div
                class={`flex items-start gap-3 px-2 py-0.5 rounded transition-all duration-200 ${
                  isInRange(index())
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'hover:bg-muted/50'
                }`}
                data-line={index()}
              >
                {/* 行号 */}
                <span class="select-none w-5 text-right text-[11px] font-mono text-muted-foreground">
                  {line.lineNumber}
                </span>
                {/* 代码内容 */}
                <span class={`whitespace-pre ${
                  isInRange(index()) 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                }`}>
                  {'  '.repeat(line.indent)}
                  {line.content}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* 当前行解释 */}
      <div class="px-4 py-2.5 border-t border-border bg-muted/20 shrink-0">
        <p class="text-sm text-foreground truncate">
          {currentExplanation() || '等待执行...'}
        </p>
      </div>
    </div>
  );
}
