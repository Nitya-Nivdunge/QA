/* drag-devices.js — FINAL PATCHED VERSION
   Fixes fallback height expansion by freezing flexbox during drag
*/

(function () {
    'use strict';

    /* Kill scrollbars */
    const _killScroll = () => {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    };
    _killScroll();
    new MutationObserver(_killScroll).observe(document.documentElement, {
        attributes: true, attributeFilter: ['style']
    });
    new MutationObserver(_killScroll).observe(document.body, {
        attributes: true, attributeFilter: ['style']
    });

    /* State map */
    const liftedState = new WeakMap();

    /* Strict viewport clamp */
    function clamp(x, y, w, h) {
        const maxX = Math.max(0, window.innerWidth - w);
        const maxY = Math.max(0, window.innerHeight - h);
        return [
            Math.max(0, Math.min(x, maxX)),
            Math.max(0, Math.min(y, maxY)),
        ];
    }

    /* FLEX FREEZE HELPERS — ★ MAIN FIX ★ */
    function freezeFallbackFlex() {
        document.querySelectorAll('.fb-col').forEach(col => {
            col.classList.add('freeze-flex');
        });

        const grid = document.querySelector('.fb-device-grid');
        if (grid) grid.classList.add('freeze-flex');
    }

    function unfreezeFallbackFlex() {
        document.querySelectorAll('.fb-col').forEach(col => {
            col.classList.remove('freeze-flex');
        });

        const grid = document.querySelector('.fb-device-grid');
        if (grid) grid.classList.remove('freeze-flex');
    }

    /* Lift element to fixed */
    function liftToFixed(el, snapshotRect) {
        if (liftedState.has(el)) return;


const liveRect = el.getBoundingClientRect();

const rect = {
    width: liveRect.width,
    height: liveRect.height,
    top: liveRect.top,
    left: liveRect.left
};
        const cs   = window.getComputedStyle(el);

        /* The parent may use flexbox `gap` instead of `margin-top`.
           If the dragged element is NOT the first child, the gap before it
           is "owned" by the spacing — the ghost must include it so nothing shifts.
           We read the parent's row-gap (flex column gap) and add it to the ghost
           height when this element has a preceding sibling. */
        const parent     = el.parentNode;
        const parentCs   = window.getComputedStyle(parent);
        const parentGap  = parseFloat(parentCs.rowGap) || parseFloat(parentCs.gap) || 0;
        /* marginTop from CSS — may be 0 for gap-only layouts */
        const cssMarginTop = parseFloat(cs.marginTop) || 0;
        const isFallback =
    document.documentElement.dataset.layout === "twocol" ||
    document.documentElement.dataset.layout === "small";

console.log("isFallback =", isFallback);
        const ghost = document.createElement('div');
        ghost.setAttribute('data-drag-ghost', '1');
        /* Copy ALL classes from the dragged element onto the ghost.
           This is critical: CSS rules like `.dev-block + .dev-block { margin-top }` 
           use sibling class selectors. If the ghost doesn't have those classes,
           the next sibling loses its margin and jumps up. */
        ghost.className = el.className;
        ghost.classList.remove('is-dragging');   /* never show drag state on ghost */
        ghost.style.cssText =
    `width:${rect.width}px;` +
    `height:${rect.height}px;` +
    `flex-shrink:0;pointer-events:none;visibility:hidden;margin:0;`;

    ghost.style.marginTop = isFallback ? "0px" : cssMarginTop + "px";

    
    ghost.style.marginTop = cssMarginTop + "px";


        const nextSibling = el.nextSibling;

        parent.insertBefore(ghost, el);

        document.body.appendChild(el);
        el.style.position      = 'fixed';
        el.style.left          = rect.left + 'px';
        el.style.top           = rect.top  + 'px';
        el.style.width         = rect.width  + 'px';
        el.style.height        = rect.height + 'px';
        el.style.margin        = '0';
        el.style.transform     = 'none';
        el.style.pointerEvents = 'auto';

        liftedState.set(el, { ghost, parent, nextSibling });
    }

    /* Restore element to original slot */
    function resetToOriginal(el) {
        if (!liftedState.has(el)) return;

        const { ghost, parent, nextSibling } = liftedState.get(el);

        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.width = '';
        el.style.height = '';
        el.style.margin = '';
        el.style.transform = '';
        el.style.zIndex = '';
        el.style.pointerEvents = '';
        el.classList.remove('is-dragging');

        if (nextSibling && nextSibling.parentNode === parent) {
            parent.insertBefore(el, nextSibling);
        } else {
            parent.insertBefore(el, ghost);
        }
        ghost.remove();
        liftedState.delete(el);

        /* Unfreeze */
        unfreezeFallbackFlex();
    }

    /* R key resets all */
    document.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'r') {
            e.preventDefault();
            document.querySelectorAll('[data-draggable-control]').forEach(resetToOriginal);
        }
    });

    const NO_DRAG_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'LABEL']);

    /* Wiring */
    document.querySelectorAll('[data-draggable-control]').forEach(el => {

        let dragging = false;
        let startMouseX = 0, startMouseY = 0;
        let startElemX = 0, startElemY = 0;
        let elemW = 0, elemH = 0;

        const onPointerMove = e => {
            if (!dragging) return;
            const [x, y] = clamp(
                startElemX + (e.clientX - startMouseX),
                startElemY + (e.clientY - startMouseY),
                elemW,
                elemH
            );
            el.style.left = x + 'px';
            el.style.top = y + 'px';
        };

        const onPointerUp = () => {
            if (!dragging) return;

            dragging = false;
            el.classList.remove('is-dragging');

            const rect = el.getBoundingClientRect();
            const [fx, fy] = clamp(rect.left, rect.top, rect.width, rect.height);
            el.style.left = fx + 'px';
            el.style.top = fy + 'px';
            el.style.zIndex = '50';
            el.style.pointerEvents = 'auto';

            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            /* Unfreeze flex now that drag is over */
            unfreezeFallbackFlex();
        };

        el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (NO_DRAG_TAGS.has(e.target.tagName)) return;
    if (e.target.closest('[data-sub-device]')) return;

    e.preventDefault();
    e.stopPropagation();

    // Snapshot BEFORE flexbox can modify height
    const snapshot = el.getBoundingClientRect();

    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startElemX = snapshot.left;
    startElemY = snapshot.top;
    elemW = snapshot.width;
    elemH = snapshot.height;

    const THRESHOLD = 5;

    const onMovePending = e2 => {
        if (Math.abs(e2.clientX - startMouseX) < THRESHOLD &&
            Math.abs(e2.clientY - startMouseY) < THRESHOLD) return;

        window.removeEventListener('pointermove', onMovePending);
        window.removeEventListener('pointerup', onUpPending);

        // LIFT WITH FROZEN SIZES
        liftToFixed(el, snapshot);

        dragging = true;
        el.classList.add('is-dragging');
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'auto';

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const onUpPending = () => {
        window.removeEventListener('pointermove', onMovePending);
        window.removeEventListener('pointerup', onUpPending);
    };

    window.addEventListener('pointermove', onMovePending);
    window.addEventListener('pointerup', onUpPending);
        });

    });

    /* Electron click‑through handling preserved */
    const _frame = document.querySelector('.screen-frame');
    let _ignoring = false;

    document.addEventListener('mousemove', e => {
        if (!_frame) return;

        const r = _frame.getBoundingClientRect();
        let overDraggable = false;

        document.querySelectorAll('[data-draggable-control]').forEach(el => {
            if (!liftedState.has(el)) return;
            const dr = el.getBoundingClientRect();
            if (e.clientX >= dr.left && e.clientX <= dr.right &&
                e.clientY >= dr.top && e.clientY <= dr.bottom) {
                overDraggable = true;
            }
        });

        const inScreenArea = e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom;

        const shouldIgnore = inScreenArea && !overDraggable;

        if (shouldIgnore !== _ignoring) {
            _ignoring = shouldIgnore;
            window.atmApi?.setIgnoreMouse(_ignoring);
        }
    });

})();