/**
 * 可视化演示客户端组件
 * 支持动态切换、分类展示、搜索筛选
 */
import { createSignal, createMemo, For, Show, onMount, onCleanup } from 'solid-js';
import type { AlgorithmDemoConfig } from './types';
import AlgorithmVisualizer from './AlgorithmVisualizer';

interface VisualizerClientProps {
  demos: AlgorithmDemoConfig[];
  defaultDemoId: string;
}

// 按类别分组
const groupByCategory = (demos: AlgorithmDemoConfig[]) => {
  const groups: Record<string, AlgorithmDemoConfig[]> = {};
  demos.forEach(demo => {
    const category = demo.category || '其他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(demo);
  });
  return groups;
};

// 类别图标映射
const categoryIcons: Record<string, string> = {
  '数据结构': 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  '算法': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  '网络': 'M5 12h14M12 5v14M4.929 4.929l14.142 14.142M19.071 4.929L4.929 19.071',
  '并发': 'M13 10V3L4 14h7v7l9-11h-7z',
  '数据库': 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
};

export default function VisualizerClient(props: VisualizerClientProps) {
  // 当前选中的演示 ID
  const [currentDemoId, setCurrentDemoId] = createSignal(props.defaultDemoId);
  // 搜索关键词
  const [searchQuery, setSearchQuery] = createSignal('');
  // 当前筛选的类别（空表示全部）
  const [selectedCategory, setSelectedCategory] = createSignal<string>('');
  // 是否展开选择器（移动端）
  const [isSelectorOpen, setIsSelectorOpen] = createSignal(true);

  // 所有类别
  const categories = createMemo(() => {
    const cats = new Set(props.demos.map(d => d.category || '其他'));
    return Array.from(cats);
  });

  // 按类别分组的演示
  const groupedDemos = createMemo(() => groupByCategory(props.demos));

  // 过滤后的演示
  const filteredDemos = createMemo(() => {
    const query = searchQuery().toLowerCase();
    return props.demos.filter(demo => {
      const matchesSearch = !query || 
        demo.name.toLowerCase().includes(query) ||
        demo.description.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory() || 
        demo.category === selectedCategory();
      return matchesSearch && matchesCategory;
    });
  });

  // 获取当前演示配置
  const currentDemo = createMemo(() => {
    return props.demos.find(d => d.id === currentDemoId()) || props.demos[0];
  });

  // 切换演示
  const switchDemo = (demoId: string) => {
    if (demoId === currentDemoId()) return;
    setCurrentDemoId(demoId);
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('demo', demoId);
      window.history.pushState({}, '', url.toString());
    }
  };

  // 浏览器前进/后退时同步状态
  onMount(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const demoId = url.searchParams.get('demo');
      if (demoId && props.demos.some(d => d.id === demoId)) {
        setCurrentDemoId(demoId);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    onCleanup(() => {
      window.removeEventListener('popstate', handlePopState);
    });
  });

  // 渲染演示卡片
  const DemoCard = (props: { demo: AlgorithmDemoConfig }) => {
    const isActive = () => currentDemoId() === props.demo.id;
    
    return (
      <button
        type="button"
        onClick={() => switchDemo(props.demo.id)}
        class={`text-left p-3 rounded-lg border transition-all duration-200 w-full group ${
          isActive()
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
            : 'border-border hover:border-indigo-300 hover:bg-muted/50'
        }`}
      >
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium text-sm text-foreground line-clamp-1">{props.demo.name}</span>
          <Show when={isActive()}>
            <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
          </Show>
        </div>
        <p class="text-xs text-muted-foreground line-clamp-2 mb-2">{props.demo.description}</p>
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
            <span>{props.demo.totalSteps} 步骤</span>
          </span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {props.demo.category}
          </span>
        </div>
      </button>
    );
  };

  return (
    <>
      {/* 演示选择器 - 可折叠 */}
      <div class="card-base overflow-hidden mb-4">
        {/* 头部 - 搜索和筛选 */}
        <div class="px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span class="text-sm font-semibold text-foreground">选择演示</span>
              <span class="text-xs text-muted-foreground">({props.demos.length})</span>
            </div>
            
            {/* 移动端折叠按钮 */}
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen())}
              class="sm:hidden p-1.5 rounded hover:bg-muted text-muted-foreground"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                class={`transition-transform ${isSelectorOpen() ? '' : 'rotate-180'}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          {/* 搜索和类别筛选 */}
          <div class={`mt-3 flex flex-col sm:flex-row gap-3 ${isSelectorOpen() ? '' : 'hidden sm:flex'}`}>
            {/* 搜索框 */}
            <div class="relative flex-1 max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="搜索演示..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* 类别筛选 */}
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                class={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  selectedCategory() === ''
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-border hover:bg-muted'
                }`}
              >
                全部
              </button>
              <For each={categories()} key={cat => cat}>
                {(category) => (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(category === selectedCategory() ? '' : category)}
                    class={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      selectedCategory() === category
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {category}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* 演示列表 */}
        <div class={`p-4 ${isSelectorOpen() ? '' : 'hidden sm:block'}`}>
          <Show 
            when={filteredDemos().length > 0}
            fallback={
              <div class="text-center py-8 text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2 opacity-50">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p class="text-sm">未找到匹配的演示</p>
              </div>
            }
          >
            {/* 有筛选时平铺展示 */}
            <Show when={searchQuery() || selectedCategory()}>
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <For each={filteredDemos()} key="id">
                  {(demo) => <DemoCard demo={demo} />}
                </For>
              </div>
            </Show>

            {/* 无筛选时按类别分组展示 */}
            <Show when={!searchQuery() && !selectedCategory()}>
              <div class="space-y-4">
                <For each={Object.entries(groupedDemos())} key={([cat]) => cat}>
                  {([category, demos]) => (
                    <div>
                      {/* 类别标题 */}
                      <div class="flex items-center gap-2 mb-2 pb-1 border-b border-border/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500">
                          <path d={categoryIcons[category] || categoryIcons['数据结构']}></path>
                        </svg>
                        <span class="text-sm font-medium text-foreground">{category}</span>
                        <span class="text-xs text-muted-foreground">({demos.length})</span>
                      </div>
                      {/* 该类别下的演示 */}
                      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <For each={demos} key="id">
                          {(demo) => <DemoCard demo={demo} />}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      {/* 主内容区 - 动态渲染 */}
      <div class="card-base overflow-hidden">
        {/* Card Header */}
        <div class="px-4 sm:px-6 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
            <span class="text-sm font-semibold text-foreground">{currentDemo().name}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>就绪</span>
          </div>
        </div>

        {/* Card Body - 可视化组件 */}
        <div class="p-3 sm:p-4">
          <AlgorithmVisualizer config={currentDemo()} />
        </div>
      </div>

      {/* 使用说明 Card */}
      <div class="card-base overflow-hidden mt-4">
        <div class="px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span class="text-sm font-semibold text-foreground">使用说明</span>
          </div>
        </div>
        <div class="p-4 sm:p-6">
          <div class="grid sm:grid-cols-3 gap-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-foreground mb-1">自动播放</h3>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  点击播放按钮自动演示，可在右下角调整播放速度（0.5x - 2x）
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500">
                  <polygon points="5 4 15 12 5 20 5 4"></polygon>
                  <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-foreground mb-1">手动控制</h3>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  使用「上一步」「下一步」按钮控制进度，点击进度条快速跳转
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-foreground mb-1">代码同步</h3>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  右侧面板代码随步骤自动高亮，底部显示当前步骤的详细说明
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
