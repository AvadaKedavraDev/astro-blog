/**
 * 算法可视化框架 - 核心类型定义
 */

// 可视化元素类型
export type VisualElementType = 
  | 'array'      // 数组
  | 'linked-list' // 链表
  | 'tree'       // 树
  | 'graph'      // 图
  | 'hash-table' // 哈希表
  | 'pointer'    // 指针
  | 'node'       // 通用节点
  | 'edge'       // 边
  | 'highlight'  // 高亮区域
  | 'text';      // 文本

// 可视化元素
export interface VisualElement {
  id: string;
  type: VisualElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: any;
  label?: string;
  color?: string;
  opacity?: number;
  scale?: number;
  parentId?: string;
  children?: string[];
  next?: string;
  prev?: string;
  visible?: boolean;
  animated?: boolean;
  // HashMap 等数据结构的详细字段
  metadata?: {
    hash?: number;
    key?: string;
    value?: any;
    next?: string | null;
    [key: string]: any;
  };
}

// 连接线
export interface Connection {
  from: string;
  to: string;
  type?: 'line' | 'curve' | 'arrow';
  color?: string;
  width?: number;
  dashed?: boolean;
  label?: string;
}

// 步骤状态
export interface StepState {
  elements: VisualElement[];
  connections?: Connection[];
  highlights?: { targetId: string; color: string; blink?: boolean }[];
  description?: string;
}

// 代码行
export interface CodeLine {
  lineNumber: number;
  content: string;
  indent: number;
  highlight?: boolean;
  explanation?: string;
}

// 演示步骤
export interface AlgorithmStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  codeLineRange: [number, number];
  state: StepState;
  duration?: number;
}

// 算法演示配置
export interface AlgorithmDemoConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  totalSteps: number;
  codeLines: CodeLine[];
  steps: AlgorithmStep[];
  initialState: StepState;
  canvasConfig: {
    width: number;
    height: number;
    backgroundColor?: string;
    gridEnabled?: boolean;
  };
}

// 播放器状态
export interface PlayerState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  progress: number;
  speed: number;
  isFinished: boolean;
}

// 播放器控制接口
export interface PlayerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goto: (step: number) => void;
  setSpeed: (speed: number) => void;
}
