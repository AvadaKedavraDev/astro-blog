/**
 * 阅读进度条组件
 * 显示当前文章阅读进度
 */
(function() {
  let progressBar = null;
  let article = null;
  let ticking = false;

  function updateProgress() {
    if (!progressBar || !article) return;

    const scrollTop = window.scrollY;
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const windowHeight = window.innerHeight;

    // 如果文章高度小于视口高度
    if (articleHeight <= windowHeight) {
      progressBar.style.width = scrollTop > articleTop ? '100%' : '0%';
      ticking = false;
      return;
    }

    const readableHeight = articleHeight - windowHeight + articleTop;
    const currentProgress = Math.max(0, scrollTop - articleTop + 100);
    const progress = Math.min(100, Math.max(0, (currentProgress / readableHeight) * 100));

    progressBar.style.width = progress + '%';
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateProgress);
  }

  function init() {
    progressBar = document.getElementById('reading-progress');
    article = document.querySelector('article');

    if (!progressBar || !article) {
      if (progressBar) progressBar.style.width = '0%';
      return;
    }

    // 清理旧监听器
    window.removeEventListener('scroll', onScroll, { passive: true });
    window.removeEventListener('resize', updateProgress, { passive: true });

    // 添加新监听器
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });

    updateProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('astro:page-load', init);
})();
