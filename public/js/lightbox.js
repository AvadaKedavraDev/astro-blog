/**
 * 图片灯箱 - 文章页图片点击放大查看
 * 支持：滚轮缩放、拖拽移动、ESC 关闭
 */
(function() {
    // 灯箱状态
    let lightbox = null;
    let lightboxImg = null;
    let isOpen = false;

    // 缩放状态
    let currentScale = 1;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentContent = null;
    let rafId = null;
    let pendingX = 0;
    let pendingY = 0;

    // 初始化灯箱
    function initLightbox() {
        if (document.getElementById('image-lightbox')) return;

        lightbox = document.createElement('div');
        lightbox.id = 'image-lightbox';
        lightbox.className = 'fixed inset-0 z-50 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300';
        lightbox.style.cssText = 'background-color: rgba(0, 0, 0, 0.9); backdrop-filter: blur(8px);';
        
        lightbox.innerHTML = `
            <div id="lightbox-content-wrapper" class="relative flex items-center justify-center" style="width: 90vw; height: 90vh; overflow: hidden; touch-action: none;">
                <img id="lightbox-img" src="" alt="" class="max-w-full max-h-full object-contain transition-transform duration-100 rounded-lg shadow-2xl" style="transform-origin: center center; will-change: transform;" />
            </div>
            <button id="lightbox-close" class="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/10 bg-black/20" aria-label="关闭">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full backdrop-blur-sm">
                <button id="lightbox-zoom-out" class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors" aria-label="缩小">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span id="lightbox-zoom-level" class="text-white text-sm font-mono min-w-[60px] text-center">100%</span>
                <button id="lightbox-zoom-in" class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors" aria-label="放大">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <div class="w-px h-6 bg-white/20 mx-1"></div>
                <button id="lightbox-reset" class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors" aria-label="重置">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </button>
            </div>
            <div id="lightbox-hint" class="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs px-3 py-1 bg-black/30 rounded-full">滚轮缩放 · 拖拽移动 · ESC 关闭</div>
            <div id="lightbox-caption" class="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/80 text-sm max-w-[80vw] text-center"></div>
        `;
        
        document.body.appendChild(lightbox);
        lightboxImg = document.getElementById('lightbox-img');

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        
        document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) closeLightbox();
        });

        document.getElementById('lightbox-zoom-in').addEventListener('click', (e) => {
            e.stopPropagation();
            zoomIn();
        });
        document.getElementById('lightbox-zoom-out').addEventListener('click', (e) => {
            e.stopPropagation();
            zoomOut();
        });
        document.getElementById('lightbox-reset').addEventListener('click', (e) => {
            e.stopPropagation();
            resetZoom();
        });

        const wrapper = document.getElementById('lightbox-content-wrapper');
        wrapper.addEventListener('wheel', handleWheel, { passive: false });
        wrapper.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function updateTransform() {
        if (!currentContent || rafId) return;
        
        rafId = requestAnimationFrame(() => {
            rafId = null;
            currentContent.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
        });
        
        document.getElementById('lightbox-zoom-level').textContent = Math.round(currentScale * 100) + '%';
    }

    function zoomIn() {
        currentScale = Math.min(currentScale * 1.25, 5);
        updateTransform();
    }

    function zoomOut() {
        currentScale = Math.max(currentScale / 1.25, 0.2);
        updateTransform();
    }

    function resetZoom() {
        currentScale = 1;
        currentX = currentY = pendingX = pendingY = 0;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        updateTransform();
    }

    function handleWheel(e) {
        if (!isOpen) return;
        e.preventDefault();
        currentScale = Math.max(0.2, Math.min(5, currentScale * (e.deltaY > 0 ? 0.9 : 1.1)));
        updateTransform();
    }

    function handleMouseDown(e) {
        const target = e.target;
        if (!isOpen || e.button !== 0 || !target) return;
        const el = target.nodeType === Node.TEXT_NODE ? target.parentElement : (typeof target.closest === 'function' ? target : null);
        if (!el || el.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        pendingX = currentX;
        pendingY = currentY;
        if (currentContent) currentContent.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function handleMouseMove(e) {
        if (!isDragging || !isOpen) return;
        currentX = pendingX + (e.clientX - startX);
        currentY = pendingY + (e.clientY - startY);
        updateTransform();
    }

    function handleMouseUp() {
        if (isDragging) {
            isDragging = false;
            pendingX = currentX;
            pendingY = currentY;
            if (currentContent) currentContent.style.cursor = 'grab';
        }
    }

    function openLightbox(img) {
        if (!lightbox) initLightbox();
        resetZoom();
        
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || '';
        lightboxImg.style.cssText = 'display: block; cursor: grab; transform-origin: center center; will-change: transform;';
        currentContent = lightboxImg;
        
        const caption = document.getElementById('lightbox-caption');
        caption.textContent = img.alt || '';
        caption.style.display = img.alt ? 'block' : 'none';
        
        lightbox.classList.remove('opacity-0', 'pointer-events-none');
        lightbox.classList.add('opacity-100', 'pointer-events-auto');
        
        setTimeout(() => { lightboxImg.style.transform = 'scale(1)'; }, 10);
        isOpen = true;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox || !isOpen) return;
        
        lightbox.classList.remove('opacity-100', 'pointer-events-auto');
        lightbox.classList.add('opacity-0', 'pointer-events-none');
        
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        
        isOpen = isDragging = false;
        document.body.style.overflow = '';
        
        setTimeout(() => {
            lightboxImg.style.cssText = '';
            currentContent = null;
            resetZoom();
        }, 300);
    }

    function bindImages() {
        const articleContent = document.querySelector('.prose-custom');
        if (!articleContent) return;

        articleContent.querySelectorAll('img:not([data-lightbox-bound])').forEach(img => {
            img.style.cursor = 'zoom-in';
            img.classList.add('hover:opacity-90', 'transition-opacity');
            img.addEventListener('click', (e) => {
                e.preventDefault();
                openLightbox(img);
            });
            img.dataset.lightboxBound = 'true';
        });
    }

    let isInitialized = false;
    function init() {
        if (isInitialized) return;
        isInitialized = true;
        initLightbox();
        bindImages();
    }

    document.addEventListener('astro:page-load', init);
})();
