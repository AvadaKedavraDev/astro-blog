/**
 * ArrayList 扩容过程演示
 * 核心逻辑：容量检查 → 创建新数组 → 元素迁移 → 继续添加
 */
import type { AlgorithmDemoConfig, CodeLine, VisualElement } from '../types';

// ArrayList 扩容核心代码
const codeLines: CodeLine[] = [
  { lineNumber: 1, content: 'public boolean add(E e) {', indent: 0, explanation: '开始执行 add 方法添加元素' },
  { lineNumber: 2, content: '  // 1. 检查容量', indent: 1, explanation: '检查当前数组是否已满' },
  { lineNumber: 3, content: '  ensureCapacityInternal(size + 1);', indent: 1, explanation: '确保有足够容量容纳新元素' },
  { lineNumber: 4, content: '', indent: 0 },
  { lineNumber: 5, content: '  // 2. 扩容判断', indent: 1, explanation: '判断是否需要扩容' },
  { lineNumber: 6, content: '  if (minCapacity > elementData.length) {', indent: 1, explanation: '所需容量 > 当前数组长度' },
  { lineNumber: 7, content: '    // 计算新容量', indent: 2, explanation: '计算扩容后的新容量' },
  { lineNumber: 8, content: '    int newCapacity = oldCapacity + (oldCapacity >> 1);', indent: 2, explanation: '新容量 = 旧容量的 1.5 倍' },
  { lineNumber: 9, content: '', indent: 0 },
  { lineNumber: 10, content: '    // 3. 创建新数组', indent: 2, explanation: '根据新容量创建数组' },
  { lineNumber: 11, content: '    elementData = Arrays.copyOf(elementData, newCapacity);', indent: 2, explanation: '复制旧数组数据到新数组' },
  { lineNumber: 12, content: '  }', indent: 1 },
  { lineNumber: 13, content: '', indent: 0 },
  { lineNumber: 14, content: '  // 4. 添加元素', indent: 1, explanation: '将元素添加到数组末尾' },
  { lineNumber: 15, content: '  elementData[size++] = e;', indent: 1, explanation: '元素放入当前 size 位置，size+1' },
  { lineNumber: 16, content: '  return true;', indent: 1 },
  { lineNumber: 17, content: '}', indent: 0 }
];

// 画布中心偏移
const OFFSET_X = 1025;
const OFFSET_Y = 710;

// 数组配置
const ARRAY_Y = 150 + OFFSET_Y;
const NEW_ARRAY_Y = 400 + OFFSET_Y;
const ARRAY_X_START = 100 + OFFSET_X;
const ARRAY_X_SPACING = 85;

// 创建数组单元格
const createArraySlot = (id: string, index: number, x: number, y: number, value?: string, isHighlighted?: boolean): VisualElement => ({
  id,
  type: 'array',
  x, y,
  width: 75,
  height: 60,
  visible: true,
  color: isHighlighted ? '#3b82f6' : undefined,
  metadata: {
    key: value,
    index: index.toString()
  }
});

// 创建带标签的数组
const createArrayWithLabel = (
  prefix: string,
  startX: number,
  y: number,
  size: number,
  capacity: number,
  values: string[],
  highlightIndex?: number
): VisualElement[] => {
  const elements: VisualElement[] = [];

  // 标签
  elements.push({
    id: `${prefix}-label`,
    type: 'text',
    x: startX - 80,
    y: y + 15,
    value: prefix,
    color: '#6b7280',
    visible: true
  });

  // 数组槽位
  for (let i = 0; i < capacity; i++) {
    const hasValue = i < values.length;
    elements.push(createArraySlot(
      `${prefix}-slot-${i}`,
      i,
      startX + i * ARRAY_X_SPACING,
      y,
      hasValue ? values[i] : undefined,
      i === highlightIndex
    ));
  }

  // 容量标记
  elements.push({
    id: `${prefix}-capacity`,
    type: 'text',
    x: startX + capacity * ARRAY_X_SPACING + 10,
    y: y + 15,
    value: `capacity=${capacity}`,
    color: '#6b7280',
    visible: true
  });

  return elements;
};

export const arraylistResizeDemo: AlgorithmDemoConfig = {
  id: 'arraylist-resize-demo',
  name: 'ArrayList 扩容过程',
  description: '演示 ArrayList 扩容机制：容量检查 → 计算新容量(1.5倍) → 创建新数组 → 元素复制 → 继续添加',
  category: '数据结构',
  totalSteps: 8,
  codeLines,

  initialState: {
    elements: [
      ...createArrayWithLabel('Array', ARRAY_X_START, ARRAY_Y, 0, 4, []),
      { id: 'info', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: '初始容量 = 4，size = 0', color: '#6b7280', visible: true }
    ],
    description: '初始状态：创建默认容量为 4 的空 ArrayList'
  },

  steps: [
    // 步骤1: 添加元素 A
    {
      id: 'step-1',
      stepNumber: 0,
      title: '添加元素 "A"',
      description: '检查容量充足，直接添加到数组[0]',
      codeLineRange: [0, 3],
      state: {
        elements: [
          ...createArrayWithLabel('Array', ARRAY_X_START, ARRAY_Y, 1, 4, ['A']),
          { id: 'info', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: 'size=1 < capacity=4，无需扩容', color: '#10b981', visible: true }
        ],
        highlights: [{ targetId: 'Array-slot-0', color: '#3b82f6' }],
        description: '容量充足，直接添加元素到 size 位置，size 增加到 1'
      }
    },

    // 步骤2: 继续添加元素 B, C
    {
      id: 'step-2',
      stepNumber: 1,
      title: '继续添加元素',
      description: '依次添加 "B"、"C"，数组状态',
      codeLineRange: [13, 15],
      state: {
        elements: [
          ...createArrayWithLabel('Array', ARRAY_X_START, ARRAY_Y, 3, 4, ['A', 'B', 'C']),
          { id: 'info', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: 'size=3 < capacity=4，继续添加', color: '#10b981', visible: true }
        ],
        highlights: [{ targetId: 'Array-slot-2', color: '#3b82f6' }],
        description: '继续添加元素，size 增加到 3，仍未达到容量上限'
      }
    },

    // 步骤3: 容量检查 - 即将满了
    {
      id: 'step-3',
      stepNumber: 2,
      title: '容量检查',
      description: '准备添加 "D"，检查容量',
      codeLineRange: [1, 3],
      state: {
        elements: [
          ...createArrayWithLabel('Array', ARRAY_X_START, ARRAY_Y, 3, 4, ['A', 'B', 'C']),
          { id: 'check', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: 'size+1=4 <= capacity=4，刚好够用', color: '#f59e0b', visible: true }
        ],
        highlights: [{ targetId: 'Array-slot-3', color: '#f59e0b', blink: true }],
        description: '检查 minCapacity = size + 1 = 4，刚好等于当前容量'
      }
    },

    // 步骤4: 添加 D，数组满了
    {
      id: 'step-4',
      stepNumber: 3,
      title: '数组已满',
      description: '添加 "D" 后，size = capacity = 4',
      codeLineRange: [13, 15],
      state: {
        elements: [
          ...createArrayWithLabel('Array', ARRAY_X_START, ARRAY_Y, 4, 4, ['A', 'B', 'C', 'D']),
          { id: 'full', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: '数组已满！size=4 == capacity=4', color: '#ef4444', visible: true }
        ],
        highlights: [{ targetId: 'Array-slot-3', color: '#3b82f6' }],
        description: '数组已满，下次添加将触发扩容'
      }
    },

    // 步骤5: 触发扩容
    {
      id: 'step-5',
      stepNumber: 4,
      title: '触发扩容',
      description: '准备添加 "E"，发现容量不足，需要扩容',
      codeLineRange: [5, 6],
      state: {
        elements: [
          ...createArrayWithLabel('Array', ARRAY_X_START, ARRAY_Y, 4, 4, ['A', 'B', 'C', 'D']),
          { id: 'need-resize', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: 'minCapacity=5 > capacity=4，需要扩容！', color: '#ef4444', visible: true }
        ],
        highlights: [{ targetId: 'Array-slot-0', color: '#ef4444', blink: true }],
        description: '容量不足，进入扩容流程'
      }
    },

    // 步骤6: 计算新容量
    {
      id: 'step-6',
      stepNumber: 5,
      title: '计算新容量',
      description: '新容量 = 旧容量 + 旧容量/2 = 4 + 2 = 6',
      codeLineRange: [6, 8],
      state: {
        elements: [
          ...createArrayWithLabel('Old', ARRAY_X_START, ARRAY_Y, 4, 4, ['A', 'B', 'C', 'D']),
          { id: 'calc', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: 'newCapacity = 4 + (4 >> 1) = 6', color: '#8b5cf6', visible: true },
          { id: 'formula', type: 'text', x: 400 + OFFSET_X, y: 75 + OFFSET_Y, value: '扩容为原来的 1.5 倍', color: '#6b7280', visible: true }
        ],
        description: 'ArrayList 默认扩容为原容量的 1.5 倍 (oldCapacity >> 1 相当于除以 2)'
      }
    },

    // 步骤7: 创建新数组并复制元素
    {
      id: 'step-7',
      stepNumber: 6,
      title: '元素迁移',
      description: '创建新数组，将旧数组元素复制过去',
      codeLineRange: [9, 11],
      state: {
        elements: [
          ...createArrayWithLabel('Old', ARRAY_X_START, ARRAY_Y, 4, 4, ['A', 'B', 'C', 'D']),
          ...createArrayWithLabel('New', ARRAY_X_START, NEW_ARRAY_Y, 0, 6, []),
          { id: 'copying', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: 'Arrays.copyOf(elementData, 6)', color: '#8b5cf6', visible: true },
          { id: 'arrow', type: 'text', x: 400 + OFFSET_X, y: 320 + OFFSET_Y, value: '↓ 复制元素', color: '#8b5cf6', visible: true }
        ],
        connections: [
          { from: 'Old-slot-0', to: 'New-slot-0', type: 'arrow', color: '#8b5cf6', width: 2 },
          { from: 'Old-slot-1', to: 'New-slot-1', type: 'arrow', color: '#8b5cf6', width: 2 },
          { from: 'Old-slot-2', to: 'New-slot-2', type: 'arrow', color: '#8b5cf6', width: 2 },
          { from: 'Old-slot-3', to: 'New-slot-3', type: 'arrow', color: '#8b5cf6', width: 2 }
        ],
        description: '使用 Arrays.copyOf 创建新数组并复制所有元素'
      }
    },

    // 步骤8: 扩容完成，添加新元素
    {
      id: 'step-8',
      stepNumber: 7,
      title: '扩容完成',
      description: '新数组准备就绪，添加 "E"',
      codeLineRange: [13, 15],
      state: {
        elements: [
          ...createArrayWithLabel('New', ARRAY_X_START, NEW_ARRAY_Y, 5, 6, ['A', 'B', 'C', 'D', 'E']),
          { id: 'done', type: 'text', x: 400 + OFFSET_X, y: 50 + OFFSET_Y, value: '✓ 扩容完成，新容量 = 6', color: '#10b981', visible: true },
          { id: 'summary', type: 'text', x: 400 + OFFSET_X, y: 75 + OFFSET_Y, value: 'size=5，还可以再添加 1 个元素', color: '#6b7280', visible: true }
        ],
        highlights: [{ targetId: 'New-slot-4', color: '#3b82f6' }],
        description: '扩容完成，新容量为 6，可以继续添加元素直到再次满员'
      }
    }
  ],

  canvasConfig: {
    width: 3000,
    height: 2000,
    backgroundColor: 'var(--background)',
    gridEnabled: true
  }
};

export default arraylistResizeDemo;
