/**
 * SolidJS 播放器控制组件 - 固定在底部，卡片式样式
 */
import { createSignal, For } from 'solid-js';
import type { PlayerState, PlayerControls as ControlsType } from './types';

interface PlayerControlsProps {
  state: PlayerState;
  controls: ControlsType;
}

export default function PlayerControls(props: PlayerControlsProps) {
  const speeds = [0.5, 1, 1.5, 2];
  const [showSpeedMenu, setShowSpeedMenu] = createSignal(false);

  const handleProgressClick = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const step = Math.round(percent * (props.state.totalSteps - 1));
    props.controls.goto(step);
  };

  return (
    <div class="card-base overflow-hidden">
      {/* 进度条 */}
      <div class="px-4 py-2.5 border-b border-border bg-muted/30">
        <div class="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span class="font-mono">步骤 {props.state.currentStep + 1} / {props.state.totalSteps}</span>
          <span class="font-mono">{Math.round(props.state.progress)}%</span>
        </div>
        <div
          class="relative h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            class="absolute left-0 top-0 h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${props.state.progress}%` }}
          />
        </div>
      </div>

      {/* 控制按钮 */}
      <div class="px-4 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-1">
          {/* 重置 - 使用更精致的样式 */}
          <button
            class="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
            onClick={() => props.controls.stop()}
            title="重置到开始"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 1024 1024" 
              xmlns="http://www.w3.org/2000/svg"
              class="transition-transform group-hover:-rotate-90"
            >
              <path 
                fill="currentColor"
                class="opacity-60 group-hover:opacity-100 transition-opacity"
                d="M512.00108628 164.38571167c191.66522941 0 347.61320203 155.94797262 347.61320205 347.61320205s-155.94797262 347.61320203-347.61320202 347.61320202a344.57158652 344.57158652 0 0 1-250.75947378-106.93451141c-7.43023233-7.69094237-36.06486969-38.71542051-43.66890849-48.40513825a16.55507888 16.55507888 0 0 1 26.07099014-20.37882384 1182.44975812 1182.44975812 0 0 0 41.4094231 45.84149103A311.98284882 311.98284882 0 0 0 512.00108629 826.50195797C685.4166226 826.50195797 826.50413057 685.41445001 826.50413056 511.9989137S685.4166226 197.49586943 512.0010863 197.49586944 197.49804203 338.5833774 197.49804203 511.99891371A16.5116271 16.5116271 0 1 1 164.38788426 511.99891369c0-191.66522941 155.94797262-347.61320203 347.61320202-347.61320202z"
              />
              <path 
                fill="currentColor"
                class="opacity-60 group-hover:opacity-100 transition-opacity"
                d="M236.387269 660.9946223l126.61810871-1e-8a16.5116271 16.5116271 0 1 1 0 33.11015777l-126.6181087 0c-3.1719702 0-5.822521 2.60709901-5.82252168 5.77906922L230.56474732 826.50195797a16.5116271 16.5116271 0 1 1-33.11015708 0l0-126.66156047a38.97613056 38.97613056 0 0 1 38.93267876-38.8457752z"
              />
            </svg>
            <span class="hidden sm:inline">重置</span>
          </button>

          <div class="w-px h-5 bg-border mx-1" />

          {/* 上一步 */}
          <button
            class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            classList={{
              'text-muted-foreground hover:text-foreground': props.state.currentStep !== 0,
              'text-muted-foreground': props.state.currentStep === 0
            }}
            onClick={() => props.controls.prev()}
            disabled={props.state.currentStep === 0}
            title="上一步"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5"/>
            </svg>
          </button>

          {/* 播放/暂停 */}
          <button
            class="p-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition-all mx-1 shadow-sm"
            onClick={() => props.state.isPlaying ? props.controls.pause() : props.controls.play()}
            title={props.state.isPlaying ? '暂停' : '播放'}
          >
            {props.state.isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* 下一步 */}
          <button
            class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            classList={{
              'text-muted-foreground hover:text-foreground': props.state.currentStep < props.state.totalSteps - 1,
              'text-muted-foreground': props.state.currentStep >= props.state.totalSteps - 1
            }}
            onClick={() => props.controls.next()}
            disabled={props.state.currentStep >= props.state.totalSteps - 1}
            title="下一步"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>
        </div>

        {/* 步骤导航点 */}
        <div class="hidden sm:flex items-center gap-1.5">
          <For each={Array.from({ length: props.state.totalSteps }, (_, i) => i)} key={i => i}>
            {(i) => (
              <button
                class="w-1.5 h-1.5 rounded-full transition-all duration-200 hover:scale-125"
                classList={{
                  'bg-foreground': i === props.state.currentStep,
                  'bg-muted-foreground': i < props.state.currentStep,
                  'bg-border': i > props.state.currentStep
                }}
                onClick={() => props.controls.goto(i)}
                title={`步骤 ${i + 1}`}
              />
            )}
          </For>
        </div>

        {/* 速度控制 */}
        <div class="relative">
          <button
            class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
            classList={{ 'text-foreground bg-muted': showSpeedMenu(), 'text-muted-foreground': !showSpeedMenu() }}
            onClick={() => setShowSpeedMenu(!showSpeedMenu())}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span class="font-mono">{props.state.speed}x</span>
          </button>

          {showSpeedMenu() && (
            <div class="absolute right-0 bottom-full mb-2 rounded-lg border border-border bg-card shadow-lg py-1 min-w-[72px] z-10">
              <For each={speeds} key={speed => speed}>
                {(speed) => (
                  <button
                    class="block w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors"
                    classList={{
                      'text-foreground font-medium': speed === props.state.speed,
                      'text-muted-foreground': speed !== props.state.speed
                    }}
                    onClick={() => {
                      props.controls.setSpeed(speed);
                      setShowSpeedMenu(false);
                    }}
                  >
                    <span class="font-mono">{speed}x</span>
                  </button>
                )}
              </For>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
