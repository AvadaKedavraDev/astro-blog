/**
 * HashMap Put 过程演示
 * 核心逻辑：计算哈希 → 定位索引 → 处理冲突（链表）
 */
import type { AlgorithmDemoConfig, CodeLine, VisualElement } from '../types';

// HashMap Put 核心代码
const codeLines: CodeLine[] = [
  { lineNumber: 1, content: 'public V put(K key, V value) {', indent: 0, explanation: '开始执行 put 方法插入键值对' },
  { lineNumber: 2, content: '  // 1. 计算哈希值', indent: 1, explanation: '计算 key 的 hash 值' },
  { lineNumber: 3, content: '  int hash = hash(key);', indent: 1, explanation: '通过 hash() 方法计算哈希值' },
  { lineNumber: 4, content: '', indent: 0 },
  { lineNumber: 5, content: '  // 2. 计算数组索引', indent: 1, explanation: '根据 hash 计算数组下标' },
  { lineNumber: 6, content: '  int n = table.length;', indent: 1, explanation: '获取当前数组长度' },
  { lineNumber: 7, content: '  int index = (n - 1) & hash;', indent: 1, explanation: '位运算：(长度-1) & hash' },
  { lineNumber: 8, content: '', indent: 0 },
  { lineNumber: 9, content: '  // 3. 检查该位置', indent: 1, explanation: '查看数组该位置是否为空' },
  { lineNumber: 10, content: '  Node<K,V> p = table[index];', indent: 1, explanation: '获取头节点' },
  { lineNumber: 11, content: '', indent: 0 },
  { lineNumber: 12, content: '  if (p == null) {', indent: 1, explanation: '位置为空，直接插入' },
  { lineNumber: 13, content: '    // 直接创建新节点', indent: 2, explanation: '创建包含 hash/key/value/next 的节点' },
  { lineNumber: 14, content: '    table[index] = new Node<>(hash, key, value);', indent: 2, explanation: '新节点放入数组' },
  { lineNumber: 15, content: '  } else {', indent: 1, explanation: '发生哈希冲突' },
  { lineNumber: 16, content: '    // 4. 遍历链表处理冲突', indent: 2, explanation: '需要遍历链表查找或追加' },
  { lineNumber: 17, content: '    for (int binCount = 0; ; binCount++) {', indent: 2, explanation: '开始遍历，记录链表长度' },
  { lineNumber: 18, content: '', indent: 0 },
  { lineNumber: 19, content: '      // 链表尾部追加', indent: 3, explanation: '到达链表尾部，追加新节点' },
  { lineNumber: 20, content: '      if (p.next == null) {', indent: 3, explanation: '检查是否是尾节点' },
  { lineNumber: 21, content: '        p.next = new Node<>(hash, key, value);', indent: 4, explanation: '创建新节点接入链表' },
  { lineNumber: 22, content: '        break;', indent: 4 },
  { lineNumber: 23, content: '      }', indent: 3 },
  { lineNumber: 24, content: '      p = p.next;', indent: 3, explanation: '继续遍历下一个节点' },
  { lineNumber: 25, content: '    }', indent: 2 },
  { lineNumber: 26, content: '  }', indent: 1 },
  { lineNumber: 27, content: '}', indent: 0 }
];

// 画布中心偏移
const OFFSET_X = 1025;
const OFFSET_Y = 710;

// 数组 Y 坐标
const ARRAY_Y = 100 + OFFSET_Y;
// 链表起始 Y 坐标
const LIST_START_Y = 220 + OFFSET_Y;
// 链表节点间距
const LIST_SPACING = 75;

// 创建数组单元格
const createArraySlot = (index: number, x: number, data?: { hash?: number; key?: string; value?: any; next?: string }): VisualElement => ({
  id: `array-${index}`,
  type: 'array',
  x, y: ARRAY_Y,
  width: 90,
  height: 65,
  visible: true,
  metadata: {
    hash: data?.hash,
    key: data?.key ? `${data.key}=${data.value}` : undefined,
    next: data?.next
  }
});

// 创建链表节点
const createListNode = (id: string, x: number, level: number, hash: number, key: string, value: any, hasNext: boolean): VisualElement => ({
  id,
  type: 'linked-list',
  x, y: LIST_START_Y + level * LIST_SPACING,
  width: 110,
  height: 55,
  visible: true,
  metadata: { hash, key, value, next: hasNext ? 'next' : null }
});

// 基础数组位置
const ARRAY_X_START = 120 + OFFSET_X;
const ARRAY_X_SPACING = 105;
const baseArray = () => Array.from({ length: 8 }, (_, i) => createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING));

// 冲突槽位的 X 坐标
const CONFLICT_SLOT_X = ARRAY_X_START + 5 * ARRAY_X_SPACING;

export const hashmapPutDemo: AlgorithmDemoConfig = {
  id: 'hashmap-put-demo',
  name: 'HashMap Put 过程',
  description: '演示 HashMap put 方法的核心逻辑：计算哈希值 → 定位数组索引 → 无冲突直接插入 / 有冲突链表追加',
  category: '数据结构',
  totalSteps: 7,
  codeLines,

  initialState: {
    elements: baseArray(),
    description: '初始状态：创建长度为8的数组，准备执行 put 操作'
  },

  steps: [
    // 步骤1: 计算hash值
    {
      id: 'step-1',
      stepNumber: 0,
      title: '计算哈希值',
      description: '插入 "apple"=5，计算 hash = 5',
      codeLineRange: [0, 3],
      state: {
        elements: [
          ...baseArray(),
          { id: 'hash-calc', type: 'text', x: 450 + OFFSET_X, y: 40 + OFFSET_Y, value: 'hash("apple") = 5', color: '#3b82f6', visible: true }
        ],
        description: '通过 hash() 方法计算 key 的哈希值'
      }
    },

    // 步骤2: 计算索引
    {
      id: 'step-2',
      stepNumber: 1,
      title: '计算数组索引',
      description: 'index = (8-1) & 5 = 7 & 5 = 5，确定存入数组[5]',
      codeLineRange: [4, 7],
      state: {
        elements: [
          ...baseArray(),
          { id: 'index-calc', type: 'text', x: 450 + OFFSET_X, y: 40 + OFFSET_Y, value: 'index = 7 & 5 = 5', color: '#10b981', visible: true }
        ],
        highlights: [{ targetId: 'array-5', color: '#10b981', blink: true }],
        description: '使用位运算 (n-1) & hash 计算索引位置'
      }
    },

    // 步骤3: 检查位置为空
    {
      id: 'step-3',
      stepNumber: 2,
      title: '检查槽位状态',
      description: '检查 table[5] 是否为空',
      codeLineRange: [8, 10],
      state: {
        elements: [
          ...baseArray(),
          { id: 'check', type: 'text', x: CONFLICT_SLOT_X, y: 165 + OFFSET_Y, value: 'table[5] == null ?', color: '#6b7280', visible: true }
        ],
        highlights: [{ targetId: 'array-5', color: '#f59e0b', blink: true }],
        description: '获取指定索引位置的节点，判断是否为空'
      }
    },

    // 步骤4: 首次插入（无冲突）
    {
      id: 'step-4',
      stepNumber: 3,
      title: '首次插入（无冲突）',
      description: '数组[5]为空，直接创建新节点插入',
      codeLineRange: [11, 14],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) =>
            i === 5
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: null })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          { id: 'inserted', type: 'text', x: CONFLICT_SLOT_X, y: 165 + OFFSET_Y, value: '✓ 直接插入', color: '#10b981', visible: true }
        ],
        highlights: [{ targetId: 'array-5', color: '#3b82f6' }],
        description: '槽位为空，直接创建 Node(hash, key, value, next=null) 放入数组'
      }
    },

    // 步骤5: 哈希冲突发生
    {
      id: 'step-5',
      stepNumber: 4,
      title: '哈希冲突发生',
      description: '插入 "apricot"=8，hash=13 → index=5，与 apple 冲突',
      codeLineRange: [14, 16],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) =>
            i === 5
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'apricot' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          { id: 'conflict', type: 'text', x: CONFLICT_SLOT_X, y: 165 + OFFSET_Y, value: '冲突！hash=13 → index=5', color: '#ef4444', visible: true }
        ],
        highlights: [{ targetId: 'array-5', color: '#ef4444', blink: true }],
        description: '不同 key 经哈希计算后映射到同一索引位置，发生哈希冲突'
      }
    },

    // 步骤6: 链表追加
    {
      id: 'step-6',
      stepNumber: 5,
      title: '链表解决冲突',
      description: '遍历链表找到尾部，追加新节点',
      codeLineRange: [17, 22],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) =>
            i === 5
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'apricot' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          createListNode('node-apricot', CONFLICT_SLOT_X, 0, 13, 'apricot', 8, false)
        ],
        connections: [
          { from: 'array-5', to: 'node-apricot', type: 'arrow', color: '#f59e0b', width: 2 }
        ],
        description: '通过 next 指针将新节点链接到链表尾部，形成拉链结构'
      }
    },

    // 步骤7: 链表继续增长
    {
      id: 'step-7',
      stepNumber: 6,
      title: '链表继续增长',
      description: '继续插入冲突元素，链表长度增长',
      codeLineRange: [17, 22],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) =>
            i === 5
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'apricot' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          createListNode('node-apricot', CONFLICT_SLOT_X, 0, 13, 'apricot', 8, true),
          createListNode('node-avocado', CONFLICT_SLOT_X, 1, 21, 'avocado', 3, true),
          createListNode('node-banana', CONFLICT_SLOT_X, 2, 29, 'banana', 7, false)
        ],
        connections: [
          { from: 'array-5', to: 'node-apricot', type: 'arrow', color: '#f59e0b', width: 2 },
          { from: 'node-apricot', to: 'node-avocado', type: 'arrow', color: '#f59e0b', width: 2 },
          { from: 'node-avocado', to: 'node-banana', type: 'arrow', color: '#f59e0b', width: 2 }
        ],
        description: '链表继续追加节点，冲突元素通过 next 指针依次链接'
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

export default hashmapPutDemo;
