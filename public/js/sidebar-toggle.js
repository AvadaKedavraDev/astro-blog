/**
 * 文章页侧边栏展开/收起控制
 * 状态持久化到 localStorage
 * will-change 仅在动画时动态添加，避免常驻内存
 */
(function() {
    const ANIMATION_DURATION = 300;

    function setWillChange(element, properties) {
        if (!element) return;
        element.style.willChange = properties;
        setTimeout(() => { element.style.willChange = 'auto'; }, ANIMATION_DURATION);
    }

    function initSidebarToggle() {
        const leftSidebar = document.getElementById('left-sidebar');
        const leftToggle = document.getElementById('toggle-left-sidebar');
        const leftExpand = document.getElementById('expand-left-sidebar');

        const rightSidebar = document.getElementById('right-sidebar');
        const rightToggle = document.getElementById('toggle-right-sidebar');
        const rightExpand = document.getElementById('expand-right-sidebar');

        const leftCollapsed = localStorage.getItem('left-sidebar-collapsed') === 'true';
        const rightCollapsed = localStorage.getItem('right-sidebar-collapsed') === 'true';

        function setLeftSidebarCollapsed(collapsed) {
            if (!leftSidebar) return;

            if (collapsed) {
                Object.assign(leftSidebar.style, { width: '0', opacity: '0', marginRight: '-20px' });
                if (leftExpand) {
                    Object.assign(leftExpand.style, { display: 'flex', opacity: '1' });
                }
            } else {
                Object.assign(leftSidebar.style, { width: '14rem', opacity: '1', marginRight: '0' });
                if (leftExpand) {
                    Object.assign(leftExpand.style, { display: 'none', opacity: '0' });
                }
            }
        }

        // 初始化左侧边栏
        if (leftSidebar) setLeftSidebarCollapsed(leftCollapsed);

        // 初始化右侧边栏
        if (rightSidebar && rightCollapsed) {
            Object.assign(rightSidebar.style, { width: '0', opacity: '0', marginLeft: '-20px' });
            if (rightExpand) {
                Object.assign(rightExpand.style, { display: 'flex', opacity: '1' });
            }
        }

        // 左侧边栏收起
        leftToggle?.addEventListener('click', () => {
            setLeftSidebarCollapsed(true);
            localStorage.setItem('left-sidebar-collapsed', 'true');
        });

        // 左侧边栏展开
        leftExpand?.addEventListener('click', () => {
            setLeftSidebarCollapsed(false);
            localStorage.setItem('left-sidebar-collapsed', 'false');
        });

        // 右侧边栏收起
        rightToggle?.addEventListener('click', () => {
            setWillChange(rightSidebar, 'width, opacity, margin');
            Object.assign(rightSidebar.style, { width: '0', opacity: '0', marginLeft: '-20px' });
            localStorage.setItem('right-sidebar-collapsed', 'true');
            if (rightExpand) {
                setTimeout(() => Object.assign(rightExpand.style, { display: 'flex', opacity: '1' }), ANIMATION_DURATION);
            }
        });

        // 右侧边栏展开
        rightExpand?.addEventListener('click', () => {
            setWillChange(rightSidebar, 'width, opacity, margin');
            Object.assign(rightSidebar.style, { width: '16rem', opacity: '1', marginLeft: '0' });
            rightExpand.style.opacity = '0';
            localStorage.setItem('right-sidebar-collapsed', 'false');
            setTimeout(() => { rightExpand.style.display = 'none'; }, ANIMATION_DURATION);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebarToggle);
    } else {
        initSidebarToggle();
    }

    document.addEventListener('astro:page-load', initSidebarToggle);
})();
