/**
 * SolidJS 算法可视化主组件
 * 适配文章详情页的卡片式布局
 */
import { createMemo, Show, onCleanup, createEffect, on } from 'solid-js';
import type { AlgorithmDemoConfig } from './types';
import { createVisualizerStore } from './store';
import PanZoomCanvas from './PanZoomCanvas';
import CodePanel from './CodePanel';
import PlayerControls from './PlayerControls';

interface AlgorithmVisualizerProps {
  config: AlgorithmDemoConfig;
}

export default function AlgorithmVisualizer(props: AlgorithmVisualizerProps) {
  const store = createVisualizerStore(props.config);
  
  // 监听 config 变化，重置播放器状态
  createEffect(on(
    () => props.config.id,
    (newId, oldId) => {
      if (oldId !== undefined && newId !== oldId) {
        // 配置变化时重置 store
        store.reset(props.config);
      }
    }
  ));
  
  // 组件卸载时停止播放
  onCleanup(() => {
    store.controls.stop();
  });
  
  const stepData = createMemo(() => {
    const idx = store.state.currentStepIndex;
    return store.state.config.steps[idx];
  });

  return (
    <div class="algorithm-visualizer flex flex-col" style="height: 520px;">
      {/* 主布局容器 - 固定高度，画布区域 */}
      <div class="grid lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* 左侧：可视化画布 - 占 3/5 */}
        <div class="lg:col-span-3 h-full min-h-0">
          <Show when={stepData()}>
            {(step) => (
              <PanZoomCanvas
                state={step().state}
                gridEnabled={store.state.config.canvasConfig.gridEnabled}
              />
            )}
          </Show>
        </div>

        {/* 右侧：代码面板 - 占 2/5 */}
        <div class="hidden lg:block lg:col-span-2 h-full min-h-0">
          <Show when={stepData()}>
            {(step) => (
              <CodePanel
                codeLines={store.state.config.codeLines}
                currentStepRange={step().codeLineRange}
                title="源码"
                language="java"
              />
            )}
          </Show>
        </div>
      </div>

      {/* 底部播放器控制 */}
      <div class="mt-4 shrink-0">
        <PlayerControls state={store.state.player} controls={store.controls} />
      </div>
    </div>
  );
}
