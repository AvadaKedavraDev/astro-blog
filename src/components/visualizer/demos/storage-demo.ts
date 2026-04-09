/**
 * HashMap 存储结构演变演示
 * 真实实现：数组 → 链表（冲突） → 红黑树（链表>8 且 总量>64）
 * 使用拉链式布局，链表节点垂直向下排列
 */
import type { AlgorithmDemoConfig, CodeLine, VisualElement } from '../types';

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
  { lineNumber: 19, content: '      // 检查是否需要转红黑树', indent: 3, explanation: '检查转换条件' },
  { lineNumber: 20, content: '      if (binCount >= TREEIFY_THRESHOLD - 1) {', indent: 3, explanation: '链表长度 >= 7（TREEIFY_THRESHOLD=8）' },
  { lineNumber: 21, content: '        // 链表长度>8 且 总数据>64 才转树', indent: 4, explanation: '两个条件必须同时满足' },
  { lineNumber: 22, content: '        if (size >= MIN_TREEIFY_CAPACITY) {', indent: 4, explanation: 'MIN_TREEIFY_CAPACITY = 64' },
  { lineNumber: 23, content: '          treeifyBin(table, hash);', indent: 5, explanation: '执行树化操作' },
  { lineNumber: 24, content: '          break;', indent: 5 },
  { lineNumber: 25, content: '        }', indent: 4 },
  { lineNumber: 26, content: '      }', indent: 3 },
  { lineNumber: 27, content: '', indent: 0 },
  { lineNumber: 28, content: '      // 链表尾部追加', indent: 3, explanation: '到达链表尾部，追加新节点' },
  { lineNumber: 29, content: '      if (p.next == null) {', indent: 3, explanation: '检查是否是尾节点' },
  { lineNumber: 30, content: '        p.next = new Node<>(hash, key, value);', indent: 4, explanation: '创建新节点接入链表' },
  { lineNumber: 31, content: '        break;', indent: 4 },
  { lineNumber: 32, content: '      }', indent: 3 },
  { lineNumber: 33, content: '      p = p.next;', indent: 3, explanation: '继续遍历下一个节点' },
  { lineNumber: 34, content: '    }', indent: 2 },
  { lineNumber: 35, content: '  }', indent: 1 },
  { lineNumber: 36, content: '}', indent: 0 }
];

// 画布中心偏移（3000x2000画布，内容居中显示）
const OFFSET_X = 1025;
const OFFSET_Y = 710;

// 数组 Y 坐标
const ARRAY_Y = 100 + OFFSET_Y;
// 链表起始 Y 坐标（在数组下方）
const LIST_START_Y = 220 + OFFSET_Y;
// 链表节点间距
const LIST_SPACING = 75;

// 创建数组单元格
const createArraySlot = (index: number, x: number, data?: { hash?: number; key?: string; value?: any; next?: string | null }): VisualElement => ({
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

// 创建链表节点 - 垂直向下排列
const createListNode = (id: string, x: number, level: number, hash: number, key: string, value: any, hasNext: boolean): VisualElement => ({
  id,
  type: 'linked-list',
  x, y: LIST_START_Y + level * LIST_SPACING,
  width: 110,
  height: 55,
  visible: true,
  metadata: { hash, key, value, next: hasNext ? 'next' : undefined }
});

// 创建树节点
const createTreeNode = (id: string, x: number, y: number, hash: number, key: string, color?: string): VisualElement => ({
  id,
  type: 'tree',
  x, y,
  width: 50,
  height: 50,
  color: color || '#1f2937',
  visible: true,
  metadata: { hash, key, value: key.split('=')[1] }
});

// 基础数组位置（8个槽位）
const ARRAY_X_START = 120 + OFFSET_X;
const ARRAY_X_SPACING = 105;
const baseArray = () => Array.from({ length: 8 }, (_, i) => createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING));

// 冲突槽位的 X 坐标（用于链表节点）
const CONFLICT_SLOT_X = ARRAY_X_START + 5 * ARRAY_X_SPACING; // 数组[5]的位置

export const storageDemo: AlgorithmDemoConfig = {
  id: 'hashmap-storage-demo',
  name: 'HashMap 存储结构演变',
  description: '演示 HashMap 内部结构如何动态演变：数组存储 → 链表解决冲突 → 满足条件后转换为红黑树（链表长度>8 且 总数据量>64）',
  category: '数据结构',
  totalSteps: 14,
  codeLines,
  
  initialState: {
    elements: baseArray(),
    description: '初始状态：创建长度为8的数组，每个槽位可存储 hash/key/value/next 结构的节点'
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
        description: '计算 key 的哈希值，决定存储位置'
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
        description: '使用位运算计算索引位置'
      }
    },
    
    // 步骤3: 首次插入
    {
      id: 'step-3',
      stepNumber: 2,
      title: '首次插入（无冲突）',
      description: '数组[5]为空，创建节点 Node(hash=5, key="apple", value=5, next=null)',
      codeLineRange: [11, 14],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: null })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          )
        ],
        highlights: [{ targetId: 'array-5', color: '#3b82f6' }],
        description: '创建包含 hash/key/value/next 的完整节点结构'
      }
    },
    
    // 步骤4: 哈希冲突
    {
      id: 'step-4',
      stepNumber: 3,
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
          { id: 'conflict', type: 'text', x: CONFLICT_SLOT_X, y: 165 + OFFSET_Y, value: '冲突！hash=13 → index=5', color: '#f59e0b', visible: true }
        ],
        highlights: [{ targetId: 'array-5', color: '#f59e0b', blink: true }],
        description: '不同 key 可能映射到同一索引，形成冲突'
      }
    },
    
    // 步骤5: 链表追加 - 垂直拉链布局
    {
      id: 'step-5',
      stepNumber: 4,
      title: '链表解决冲突',
      description: '通过 next 指针将 apricot 链接到 apple 后面，形成拉链结构',
      codeLineRange: [27, 31],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'apricot' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          // 链表节点垂直向下排列
          createListNode('node-apricot', CONFLICT_SLOT_X, 0, 13, 'apricot', 8, false)
        ],
        // 从数组槽位指向第一个链表节点的箭头
        connections: [
          { from: 'array-5', to: 'node-apricot', type: 'arrow', color: '#f59e0b', width: 2 }
        ],
        description: '链表节点通过 next 指针链接，垂直向下延伸'
      }
    },
    
    // 步骤6: 链表继续增长 - 垂直拉链
    {
      id: 'step-6',
      stepNumber: 5,
      title: '链表增长',
      description: '继续插入冲突元素，链表长度达到 3，形成垂直拉链结构',
      codeLineRange: [27, 31],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'apricot' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          // 垂直排列的链表节点
          createListNode('node-apricot', CONFLICT_SLOT_X, 0, 13, 'apricot', 8, true),
          createListNode('node-avocado', CONFLICT_SLOT_X, 1, 21, 'avocado', 3, false)
        ],
        connections: [
          { from: 'array-5', to: 'node-apricot', type: 'arrow', color: '#f59e0b', width: 2 },
          { from: 'node-apricot', to: 'node-avocado', type: 'arrow', color: '#f59e0b', width: 2 }
        ],
        description: '链表继续追加节点，垂直向下延伸'
      }
    },
    
    // 步骤7: 链表接近阈值 - 长拉链
    {
      id: 'step-7',
      stepNumber: 6,
      title: '链表接近阈值',
      description: '链表长度达到 7，即将触发树化检查（TREEIFY_THRESHOLD=8）',
      codeLineRange: [18, 20],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'node0' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          // 7个链表节点垂直排列
          ...[0, 1, 2, 3, 4, 5].map(i => 
            createListNode(`node-${i}`, CONFLICT_SLOT_X, i, 5 + i * 8, `key${i}`, i + 1, i < 5)
          ),
          { id: 'threshold-notice', type: 'text', x: CONFLICT_SLOT_X + 180, y: 280 + OFFSET_Y, value: '链表长度 = 7，即将检查树化条件', color: '#f59e0b', visible: true }
        ],
        connections: [
          { from: 'array-5', to: 'node-0', type: 'arrow', color: '#f59e0b', width: 2 },
          ...[0, 1, 2, 3, 4].map(i => ({ 
            from: `node-${i}`, 
            to: `node-${i+1}`, 
            type: 'arrow' as const, 
            color: '#f59e0b', 
            width: 2 
          }))
        ],
        description: '链表长度达到 7（即将达到阈值 8），形成长拉链'
      }
    },
    
    // 步骤8: 不满足树化条件
    {
      id: 'step-8',
      stepNumber: 7,
      title: '不满足树化条件',
      description: '链表长度达到 8，但总数据量 size=8 < 64，暂不转树，继续扩容',
      codeLineRange: [19, 26],
      state: {
        elements: [
          ...baseArray(),
          { id: 'notice', type: 'text', x: 450 + OFFSET_X, y: 40 + OFFSET_Y, value: '链表长度=8，但总数据量=8 < 64', color: '#ef4444', visible: true },
          { id: 'notice2', type: 'text', x: 450 + OFFSET_X, y: 65 + OFFSET_Y, value: '条件不满足，继续扩容而非转树', color: '#6b7280', visible: true }
        ],
        description: '树化需要同时满足两个条件：链表长度>8 且 总数据量>64'
      }
    },
    
    // 步骤9: 扩容后重新分布
    {
      id: 'step-9',
      stepNumber: 8,
      title: '数组扩容',
      description: '数组扩容至 16，节点重新计算索引分布',
      codeLineRange: [0, 0],
      state: {
        elements: baseArray(),
        description: '扩容后，部分节点可能移动到新的槽位'
      }
    },
    
    // 步骤10: 大量数据插入 - 满足条件
    {
      id: 'step-10',
      stepNumber: 9,
      title: '大量数据插入',
      description: '继续插入数据，总数据量超过 64，且某链表长度再次达到 8',
      codeLineRange: [0, 0],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, { hash: 5, key: 'apple', value: 5, next: 'node0' })
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          // 8个链表节点垂直排列
          ...[0, 1, 2, 3, 4, 5, 6].map(i => 
            createListNode(`node-${i}`, CONFLICT_SLOT_X, i, 5 + i * 8, `key${i}`, i + 1, i < 6)
          ),
          { id: 'ready-notice', type: 'text', x: CONFLICT_SLOT_X + 180, y: 300 + OFFSET_Y, value: '链表长度=8，总数据量=68 > 64', color: '#10b981', visible: true },
          { id: 'ready-notice2', type: 'text', x: CONFLICT_SLOT_X + 180, y: 325 + OFFSET_Y, value: '两个条件都满足，准备转红黑树！', color: '#10b981', visible: true }
        ],
        connections: [
          { from: 'array-5', to: 'node-0', type: 'arrow', color: '#f59e0b', width: 2 },
          ...[0, 1, 2, 3, 4, 5].map(i => ({ 
            from: `node-${i}`, 
            to: `node-${i+1}`, 
            type: 'arrow' as const, 
            color: '#f59e0b', 
            width: 2 
          }))
        ],
        description: '现在两个条件都满足：链表长度>8 且 总数据量>64'
      }
    },
    
    // 步骤11: 开始树化
    {
      id: 'step-11',
      stepNumber: 10,
      title: '触发树化操作',
      description: '满足所有条件，开始将链表转换为红黑树',
      codeLineRange: [19, 24],
      state: {
        elements: [
          ...baseArray(),
          { id: 'tree-notice', type: 'text', x: 450 + OFFSET_X, y: 40 + OFFSET_Y, value: '开始执行 treeifyBin()...', color: '#8b5cf6', visible: true }
        ],
        highlights: [{ targetId: 'array-5', color: '#8b5cf6', blink: true }],
        description: '调用 treeifyBin() 方法开始转换'
      }
    },
    
    // 步骤12: 红黑树根节点
    {
      id: 'step-12',
      stepNumber: 11,
      title: '红黑树 - 根节点',
      description: '链表首节点转为红黑树根节点（黑色）',
      codeLineRange: [0, 0],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? { ...createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, undefined), value: '◉', color: '#1f2937' }
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          createTreeNode('tree-root', CONFLICT_SLOT_X, 220 + OFFSET_Y, 5, 'apple=5', '#1f2937')
        ],
        connections: [
          { from: 'array-5', to: 'tree-root', type: 'line', color: '#8b5cf6', width: 2 }
        ],
        description: '根节点（黑色）：hash=5, key=apple'
      }
    },
    
    // 步骤13: 构建红黑树
    {
      id: 'step-13',
      stepNumber: 12,
      title: '红黑树 - 插入平衡',
      description: '按 hash 值比较插入，进行颜色翻转和旋转保持平衡',
      codeLineRange: [0, 0],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? { ...createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, undefined), value: '◉', color: '#1f2937' }
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          // 树形结构 - 根节点在中间上方
          createTreeNode('tree-root', CONFLICT_SLOT_X, 220 + OFFSET_Y, 37, 'key4=5', '#1f2937'),
          // 左子树
          createTreeNode('tree-left', CONFLICT_SLOT_X - 80, 310 + OFFSET_Y, 5, 'apple=5', '#ef4444'),
          createTreeNode('tree-ll', CONFLICT_SLOT_X - 130, 400 + OFFSET_Y, 13, 'apricot=8', '#1f2937'),
          createTreeNode('tree-lr', CONFLICT_SLOT_X - 30, 400 + OFFSET_Y, 21, 'avocado=3', '#1f2937'),
          // 右子树
          createTreeNode('tree-right', CONFLICT_SLOT_X + 80, 310 + OFFSET_Y, 69, 'key8=9', '#ef4444'),
          createTreeNode('tree-rl', CONFLICT_SLOT_X + 30, 400 + OFFSET_Y, 45, 'key5=6', '#1f2937'),
          createTreeNode('tree-rr', CONFLICT_SLOT_X + 130, 400 + OFFSET_Y, 77, 'key9=10', '#1f2937')
        ],
        connections: [
          { from: 'array-5', to: 'tree-root', type: 'line', color: '#8b5cf6', width: 2 },
          { from: 'tree-root', to: 'tree-left', type: 'line', color: '#8b5cf6', width: 2 },
          { from: 'tree-root', to: 'tree-right', type: 'line', color: '#8b5cf6', width: 2 },
          { from: 'tree-left', to: 'tree-ll', type: 'line', color: '#8b5cf6', width: 1.5 },
          { from: 'tree-left', to: 'tree-lr', type: 'line', color: '#8b5cf6', width: 1.5 },
          { from: 'tree-right', to: 'tree-rl', type: 'line', color: '#8b5cf6', width: 1.5 },
          { from: 'tree-right', to: 'tree-rr', type: 'line', color: '#8b5cf6', width: 1.5 }
        ],
        description: '红黑树平衡完成：根节点黑色，子节点红色'
      }
    },
    
    // 步骤14: 完成
    {
      id: 'step-14',
      stepNumber: 13,
      title: '存储结构演变完成',
      description: '数组 → 链表（冲突时） → 红黑树（链表>8 且 总量>64）',
      codeLineRange: [0, 0],
      state: {
        elements: [
          ...Array.from({ length: 8 }, (_, i) => 
            i === 5 
              ? { ...createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING, undefined), value: '🌳', color: '#22c55e' }
              : createArraySlot(i, ARRAY_X_START + i * ARRAY_X_SPACING)
          ),
          createTreeNode('tree-root', CONFLICT_SLOT_X, 280 + OFFSET_Y, 0, 'root', '#1f2937'),
          { id: 'summary', type: 'text', x: 450 + OFFSET_X, y: 40 + OFFSET_Y, value: '✓ 链表长度>8 且 数据量>64 才转红黑树', color: '#10b981', visible: true }
        ],
        connections: [
          { from: 'array-5', to: 'tree-root', type: 'line', color: '#8b5cf6', width: 2 }
        ],
        description: '演变完成：链表长度>8 且 总数据量>64 时才会转换为红黑树'
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

export default storageDemo;
