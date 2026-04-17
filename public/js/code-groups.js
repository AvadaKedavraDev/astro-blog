/**
 * rehype-code-group 代码块多标签切换初始化
 * 全局脚本，在页面加载和 View Transitions 切换后自动执行
 */
(function() {
  function initCodeGroups() {
    const codeGroups = document.querySelectorAll('.rehype-code-group');
    if (codeGroups.length === 0) return;
    
    codeGroups.forEach((group) => {
      // 跳过已初始化的组（防止重复绑定）
      if (group.dataset.codeGroupInitialized) return;
      
      const tabs = group.querySelectorAll('.rcg-tab');
      const blocks = group.querySelectorAll('.rcg-block');
      
      if (tabs.length === 0 || blocks.length === 0) return;
      
      // 标记为已初始化
      group.dataset.codeGroupInitialized = 'true';
      
      // 添加点击事件监听
      group.addEventListener('click', (event) => {
        const target = event.target;
        if (!target) return;
        const el = target.nodeType === Node.TEXT_NODE ? target.parentElement : (typeof target.closest === 'function' ? target : null);
        if (!el) return;
        const tab = el.closest('.rcg-tab');
        if (!tab) return;
        
        const index = Array.from(tabs).indexOf(tab);
        if (index === -1) return;
        
        // 移除当前激活状态
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        blocks.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('hidden', 'true');
        });
        
        // 激活新标签
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        
        const newBlock = blocks[index];
        if (newBlock) {
          newBlock.classList.add('active');
          newBlock.removeAttribute('hidden');
        }
      });
    });
  }
  
  // 初始加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCodeGroups);
  } else {
    initCodeGroups();
  }
  
  // Astro View Transitions 页面切换后重新初始化
  document.addEventListener('astro:page-load', initCodeGroups);
})();
