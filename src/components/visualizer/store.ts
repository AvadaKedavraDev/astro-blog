/**
 * SolidJS Store - 算法可视化状态管理
 */
import { createStore, produce } from 'solid-js/store';
import type { AlgorithmDemoConfig, PlayerState } from './types';

// 播放器默认状态
const createDefaultPlayerState = (totalSteps: number): PlayerState => ({
  isPlaying: false,
  currentStep: 0,
  totalSteps,
  progress: 0,
  speed: 1,
  isFinished: false,
});

// 判断是否在浏览器环境
const isBrowser = typeof window !== 'undefined';

// 创建可视化 store
export function createVisualizerStore(config: AlgorithmDemoConfig) {
  const [state, setState] = createStore({
    config,
    player: createDefaultPlayerState(config.totalSteps),
    currentStepIndex: 0,
  });

  let playTimer: number | null = null;

  // 重置状态（用于切换配置时）
  const reset = (newConfig?: AlgorithmDemoConfig) => {
    const targetConfig = newConfig || config;
    setState(produce(s => {
      s.config = targetConfig;
      s.player = createDefaultPlayerState(targetConfig.totalSteps);
      s.currentStepIndex = 0;
    }));
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
  };

  // 更新当前步骤
  const updateStep = (stepIndex: number) => {
    const configTotalSteps = state.config.totalSteps;
    if (stepIndex >= 0 && stepIndex < configTotalSteps) {
      setState(produce(s => {
        s.currentStepIndex = stepIndex;
        s.player.currentStep = stepIndex;
        s.player.progress = ((stepIndex + 1) / configTotalSteps) * 100;
        s.player.isFinished = stepIndex >= configTotalSteps - 1;
      }));
    }
  };

  // 播放控制
  const controls = {
    play: () => {
      if (!isBrowser) return;
      
      if (state.player.isFinished) {
        updateStep(0);
      }
      setState('player', 'isPlaying', true);
      
      const scheduleNext = () => {
        if (!state.player.isPlaying) return;
        
        const currentConfig = state.config;
        const step = currentConfig.steps[state.currentStepIndex];
        const duration = (step?.duration || 1500) / state.player.speed;
        
        playTimer = window.setTimeout(() => {
          if (state.currentStepIndex < currentConfig.totalSteps - 1) {
            updateStep(state.currentStepIndex + 1);
            scheduleNext();
          } else {
            setState('player', 'isPlaying', false);
          }
        }, duration);
      };
      
      scheduleNext();
    },

    pause: () => {
      if (!isBrowser) return;
      
      setState('player', 'isPlaying', false);
      if (playTimer) {
        clearTimeout(playTimer);
        playTimer = null;
      }
    },

    stop: () => {
      if (!isBrowser) return;
      
      controls.pause();
      updateStep(0);
    },

    next: () => {
      if (state.currentStepIndex < state.config.totalSteps - 1) {
        updateStep(state.currentStepIndex + 1);
      }
    },

    prev: () => {
      if (state.currentStepIndex > 0) {
        updateStep(state.currentStepIndex - 1);
      }
    },

    goto: (stepIndex: number) => {
      updateStep(stepIndex);
    },

    setSpeed: (speed: number) => {
      setState('player', 'speed', speed);
    },
  };

  return {
    state,
    setState,
    controls,
    reset,
    getCurrentStep: () => state.config.steps[state.currentStepIndex],
  };
}

export type VisualizerStore = ReturnType<typeof createVisualizerStore>;
