/**
 * 首页动态背景组件
 * 渐变网格动画 + 鼠标视差效果 + IntersectionObserver 控制
 * 完全适配 Astro ClientRouter (View Transitions)
 */
(function() {
  let bg = null;
  let mesh = null;
  let rafId = null;
  let observer = null;
  let isVisible = true;
  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;
  let lastMove = 0;

  // 鼠标移动处理
  function onMouseMove(e) {
    const now = Date.now();
    if (now - lastMove < 50) return;
    lastMove = now;
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  // 动画循环
  function animate() {
    if (!isVisible || !mesh) return;
    currentX += (mouseX - currentX) * 0.05;
    currentY += (mouseY - currentY) * 0.05;
    mesh.style.setProperty('--parallax-x', `${currentX * -20}px`);
    mesh.style.setProperty('--parallax-y', `${currentY * -20}px`);
    rafId = requestAnimationFrame(animate);
  }

  // IntersectionObserver 回调
  function onObserve(entries) {
    const entry = entries[0];
    const ratio = entry.intersectionRatio;
    
    if (ratio > 0) {
      isVisible = true;
      bg.style.opacity = 0.2 + ratio * 0.8;
      mesh.style.animationDuration = `${90 - ratio * 30}s`;
      if (!rafId) animate();
    } else {
      isVisible = false;
      bg.style.opacity = '0';
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  }

  // 页面可见性变化
  function onVisibilityChange() {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!document.hidden && !rafId && isVisible) {
      animate();
    }
  }

  // 清理函数
  function cleanup() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    document.removeEventListener('mousemove', onMouseMove, { passive: true });
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  // 初始化
  function init() {
    // 清理旧的
    cleanup();

    // 获取元素（每次初始化都重新获取，适配 ClientRouter）
    bg = document.getElementById('hero-bg');
    mesh = document.getElementById('gradient-mesh');
    
    if (!bg || !mesh) return;

    // 重置状态
    isVisible = true;
    mouseX = mouseY = currentX = currentY = 0;
    lastMove = 0;

    // 绑定鼠标事件（非移动设备）
    if (!window.matchMedia('(pointer: coarse)').matches) {
      document.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    // 创建 IntersectionObserver（简化 threshold 提高性能）
    observer = new IntersectionObserver(onObserve, {
      threshold: [0, 0.5, 1],
      rootMargin: '-10% 0px -10% 0px'
    });
    observer.observe(bg);

    // 页面可见性
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 启动动画
    animate();
  }

  // 初始化和页面切换
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ClientRouter 页面切换后重新初始化
  document.addEventListener('astro:page-load', init);
  
  // 页面卸载前清理（可选，防止内存泄漏）
  document.addEventListener('astro:before-swap', cleanup);
})();
