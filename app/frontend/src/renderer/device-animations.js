/* device-animations.js  v3
   ─────────────────────────────────────────────────────────────────────
   FIXES in v3:
   1. Card animation: card slides FROM the RIGHT, entering chip-first 
      (left side of card = chip side goes into the slit from the right).
      The card originates outside the slit to the right, then slides
      left so the chip end enters the slot. Matches reference image.
   2. Cash dispenser: bills grow FROM the slit downward — only the 
      bottom half visible, as if half the note is still inside.
   3. Cash depositor: bills start below the slot visible, slide UP 
      into the slit disappearing half way.
   4. Receipt printer: paper grows DOWN from the slit slot. Good as-is.
   5. Coin deposit/dispense: coin slides through vertical slit (dep)
      and drops into tray (disp).
   6. ALL modal/confirm dialogs disabled — animations fire directly.
   ─────────────────────────────────────────────────────────────────────
*/
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     POPUP-AWARE DEFERRED TRIGGER
  ══════════════════════════════════════════════════════════════════ */
  function afterModalClose(fn) {
    // Dialogs are disabled — fire immediately
    fn();
  }

  /* ══════════════════════════════════════════════════════════════════
     BODY-LEVEL OVERLAY SYSTEM
  ══════════════════════════════════════════════════════════════════ */
  const _map = new WeakMap();

  function _reposition(block, el, cropFrac) {
    const r = block.getBoundingClientRect();
    if (cropFrac != null) {
      /* Cropped: overlay starts at slit, covers only the lower fraction */
      el.style.left   = r.left + 'px';
      el.style.top    = (r.top + r.height * cropFrac) + 'px';
      el.style.width  = r.width + 'px';
      el.style.height = (r.height * (1 - cropFrac)) + 'px';
    } else {
      el.style.left   = r.left   + 'px';
      el.style.top    = r.top    + 'px';
      el.style.width  = r.width  + 'px';
      el.style.height = r.height + 'px';
    }
  }

  function _tick(block) {
    const entry = _map.get(block);
    if (!entry || entry.el.style.display === 'none') return;
    _reposition(block, entry.el, entry.cropFrac);
    entry.rafId = requestAnimationFrame(() => _tick(block));
  }

  function getOverlay(block, buildFn) {
    if (_map.has(block)) return _map.get(block).el;
    const el = buildFn();
    el.style.cssText += ';position:fixed;pointer-events:none;z-index:9500;display:none;';
    document.body.appendChild(el);
    _map.set(block, { el, rafId: null, cropFrac: null });
    return el;
  }

  function showOverlay(block, buildFn, cropFrac) {
    const el = getOverlay(block, buildFn);
    const entry = _map.get(block);
    entry.cropFrac = cropFrac != null ? cropFrac : null;
    _reposition(block, el, entry.cropFrac);
    el.style.display = 'block';
    if (entry.rafId) cancelAnimationFrame(entry.rafId);
    entry.rafId = requestAnimationFrame(() => _tick(block));
    return el;
  }

  function hideOverlay(block) {
    if (!_map.has(block)) return;
    const entry = _map.get(block);
    entry.el.style.display = 'none';
    entry.cropFrac = null;
    if (entry.rafId) { cancelAnimationFrame(entry.rafId); entry.rafId = null; }
  }

  /* ══════════════════════════════════════════════════════════════════
     COIN DEPOSITOR
     Vertical slit. Coin starts to the RIGHT, slides LEFT into slit,
     gets squeezed (scaleX shrinks to near zero), disappears.
  ══════════════════════════════════════════════════════════════════ */
  function _buildCoinDepOverlay() {
    const el = document.createElement('div');
    el.className = 'da-coin-dep-overlay';
    el.style.overflow = 'hidden';
    el.style.borderRadius = '4px';

    const coin = document.createElement('div');
    coin.className = 'da-coin';
    coin.style.cssText = [
      'position:absolute',
      'width:38%',
      'aspect-ratio:1/1',
      'border-radius:50%',
      'background:radial-gradient(circle at 35% 32%, #fff9b0 0%, #f5c200 30%, #c89000 65%, #8a6000 100%)',
      'border:2.5px solid #7a5500',
      'box-shadow:0 3px 12px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.5)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'top:50%',
      'left:115%',
      'transform:translateY(-50%)',
      'transition:none',
    ].join(';');

    const sym = document.createElement('span');
    sym.textContent = '$';
    sym.style.cssText = 'font-size:1.1em;font-weight:900;color:#5a3800;text-shadow:0 1px 0 rgba(255,255,255,0.5);user-select:none;';
    coin.appendChild(sym);
    el.appendChild(coin);
    return el;
  }

  function animCoinDepInsert(block) {
    afterModalClose(() => {
      const overlay = showOverlay(block, _buildCoinDepOverlay);
      const coin = overlay.querySelector('.da-coin');
      if (!coin) return;

      coin.style.transition = 'none';
      coin.style.left = '115%';
      coin.style.transform = 'translateY(-50%) scaleX(1)';
      coin.style.opacity = '1';

      requestAnimationFrame(() => requestAnimationFrame(() => {
        // Slide to slit centre
        coin.style.transition = 'left 0.45s cubic-bezier(0.35,0,0.2,1)';
        coin.style.left = '32%';

        setTimeout(() => {
          // Squeeze into slit
          coin.style.transition = 'left 0.28s linear, transform 0.28s linear';
          coin.style.left = '14%';
          coin.style.transform = 'translateY(-50%) scaleX(0.06)';

          setTimeout(() => {
            coin.style.transition = 'opacity 0.12s';
            coin.style.opacity = '0';
            setTimeout(() => hideOverlay(block), 160);
          }, 300);
        }, 480);
      }));
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     COIN DISPENSER
     Coin peeks from slot, drops into tray. Persists until Take Coin.
  ══════════════════════════════════════════════════════════════════ */
  function _buildCoinDispOverlay() {
    const el = document.createElement('div');
    el.className = 'da-coin-disp-overlay';
    el.style.overflow = 'visible';

    const coin = document.createElement('div');
    coin.className = 'da-disp-coin';
    coin.style.cssText = [
      'position:absolute',
      'width:36%',
      'aspect-ratio:1/1',
      'border-radius:50%',
      'background:radial-gradient(circle at 35% 32%, #fff9b0 0%, #f5c200 30%, #c89000 65%, #8a6000 100%)',
      'border:2.5px solid #7a5500',
      'box-shadow:0 4px 14px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.5)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'left:32%',
      'top:-50%',
      'opacity:0',
      'transition:none',
    ].join(';');

    const sym = document.createElement('span');
    sym.textContent = '$';
    sym.style.cssText = 'font-size:1.0em;font-weight:900;color:#5a3800;text-shadow:0 1px 0 rgba(255,255,255,0.5);user-select:none;';
    coin.appendChild(sym);
    el.appendChild(coin);
    return el;
  }

  function animCoinDispRelease(block) {
    afterModalClose(() => {
      const overlay = showOverlay(block, _buildCoinDispOverlay);
      const coin = overlay.querySelector('.da-disp-coin');
      if (!coin) return;

      coin.style.transition = 'none';
      coin.style.top = '-45%';
      coin.style.opacity = '0';
      coin.style.transform = 'scale(0.5)';

      requestAnimationFrame(() => requestAnimationFrame(() => {
        coin.style.transition = 'top 0.22s ease-out, opacity 0.18s, transform 0.22s ease-out';
        coin.style.top = '5%';
        coin.style.opacity = '1';
        coin.style.transform = 'scale(1)';

        setTimeout(() => {
          coin.style.transition = 'top 0.42s cubic-bezier(0.5,0,1,1)';
          coin.style.top = '52%';

          setTimeout(() => {
            coin.style.transition = 'top 0.11s ease-out';
            coin.style.top = '42%';
            setTimeout(() => {
              coin.style.transition = 'top 0.09s ease-in';
              coin.style.top = '49%';
            }, 120);
          }, 440);
        }, 250);
      }));
    });
  }

  function animCoinDispTake(block) {
    afterModalClose(() => {
      const entry = _map.get(block);
      if (!entry) return;
      const coin = entry.el.querySelector('.da-disp-coin');
      if (!coin) return;

      coin.style.transition = 'opacity 0.28s, transform 0.28s';
      coin.style.opacity = '0';
      coin.style.transform = 'scale(0.3) translateY(-20%)';
      setTimeout(() => hideOverlay(block), 350);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     CASH DISPENSER — v3
     Bills emerge DOWNWARD from the tray-slot opening (at ~52% top).
     Only the BOTTOM HALF of the bills is visible — as if still half
     inside the machine. Slot acts as the "ceiling" that clips.
  ══════════════════════════════════════════════════════════════════ */
  const BILL_COLORS = ['#2a7a36','#318c3e','#3a9a48'];

  function _buildCashDispOverlay() {
    const el = document.createElement('div');
    el.className = 'da-cash-disp-overlay';
    /* overflow:hidden clips bills at the slot level (top half inside machine) */
    el.style.overflow = 'hidden';

    BILL_COLORS.forEach((color, i) => {
      const bill = document.createElement('div');
      bill.className = 'da-disp-bill';
      const off = i * 1.5;
      bill.style.cssText = [
        'position:absolute',
        `left:${8 + off}%`,
        `right:${8 - off}%`,
        /* Anchored at top of cropped overlay = exactly at the slit. Height grows downward. */
        'top:0',
        'height:0',
        'background:' + color,
        'border-radius:0 0 3px 3px',
        'border:1px solid rgba(0,0,0,0.25)',
        `box-shadow:${1+i}px ${2+i}px 10px rgba(0,0,0,0.4)`,
        `transform:rotate(${(i-1)*0.8}deg)`,
        'transform-origin:top center',
        'overflow:hidden',
        'opacity:0',
        'transition:none',
      ].join(';');

      // Dollar sign watermark
      const sym = document.createElement('div');
      sym.textContent = '$';
      sym.style.cssText = 'position:absolute;bottom:4px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:900;color:rgba(255,255,255,0.45);';
      bill.appendChild(sym);

      // Horizontal detail lines
      [10, 20].forEach(top => {
        const ln = document.createElement('div');
        ln.style.cssText = `position:absolute;left:8%;right:8%;top:${top}px;height:1px;background:rgba(255,255,255,0.2);`;
        bill.appendChild(ln);
      });

      el.appendChild(bill);
    });

    return el;
  }

  function animCashDispRelease(block) {
    afterModalClose(() => {
      const overlay = showOverlay(block, _buildCashDispOverlay, 0.52);

      const bills = Array.from(overlay.querySelectorAll('.da-disp-bill'));

      bills.forEach(b => {
        b.style.transition = 'none';
        b.style.height = '0';
        b.style.opacity = '0';
      });

      requestAnimationFrame(() => requestAnimationFrame(() => {
        bills.forEach((bill, i) => {
          setTimeout(() => {
            bill.style.transition = 'height 0.38s cubic-bezier(0.2,0.9,0.3,1), opacity 0.2s';
            bill.style.height = '32px';
            bill.style.opacity = '1';
          }, i * 120);
        });
      }));
    });
  }

  function animCashDispTake(block) {
    afterModalClose(() => {
      const entry = _map.get(block);
      if (!entry) return;
      /* Re-apply crop on take so retract stays correctly clipped */
      const r = block.getBoundingClientRect();
      const slitFrac = 0.52;
      entry.el.style.top    = (r.top  + r.height * slitFrac) + 'px';
      entry.el.style.height = (r.height * (1 - slitFrac))    + 'px';
      const bills = Array.from(entry.el.querySelectorAll('.da-disp-bill'));

      bills.forEach((bill, i) => {
        setTimeout(() => {
          bill.style.transition = 'height 0.22s ease-in, opacity 0.18s';
          bill.style.height = '0';
          bill.style.opacity = '0';
        }, i * 55);
      });
      setTimeout(() => hideOverlay(block), 420);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     CASH DEPOSITOR — v3
     Insert Cash: bills appear below slot, animate UP into slot.
     Only bottom half visible at end (sucked into machine).
     Take Cash: reverse — bills emerge from slot downward.
  ══════════════════════════════════════════════════════════════════ */
  function _buildCashDepOverlay() {
    const el = document.createElement('div');
    el.className = 'da-cash-dep-overlay';
    el.style.overflow = 'hidden';

    BILL_COLORS.forEach((color, i) => {
      const bill = document.createElement('div');
      bill.className = 'da-dep-bill';
      const off = i * 1.5;
      bill.style.cssText = [
        'position:absolute',
        `left:${8 + off}%`,
        `right:${8 - off}%`,
        'height:36px',
        /* start below the slit (bottom of component area) */
        'bottom:-40px',
        'background:' + color,
        'border-radius:3px 3px 0 0',
        'border:1px solid rgba(0,0,0,0.25)',
        `box-shadow:${1+i}px ${-1-i}px 10px rgba(0,0,0,0.4)`,
        `transform:rotate(${(i-1)*0.8}deg)`,
        'overflow:hidden',
        'opacity:0',
        'transition:none',
      ].join(';');

      const sym = document.createElement('div');
      sym.textContent = '$';
      sym.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:900;color:rgba(255,255,255,0.45);';
      bill.appendChild(sym);

      el.appendChild(bill);
    });

    return el;
  }

  function animCashDepInsert(block) {
    afterModalClose(() => {
      const overlay = showOverlay(block, _buildCashDepOverlay, 0.50);

      const bills = Array.from(overlay.querySelectorAll('.da-dep-bill'));

      bills.forEach(b => {
        b.style.transition = 'none';
        b.style.bottom = '-40px';
        b.style.opacity = '0';
      });

      requestAnimationFrame(() => requestAnimationFrame(() => {
        // Appear below slot
        bills.forEach((bill, i) => {
          setTimeout(() => {
            bill.style.transition = 'opacity 0.18s, bottom 0.0s';
            bill.style.bottom = '5%';
            bill.style.opacity = '1';
          }, i * 70);
        });

        // Then suck upward into slot
        setTimeout(() => {
          bills.forEach((bill, i) => {
            setTimeout(() => {
              bill.style.transition = 'bottom 0.42s cubic-bezier(0.5,0.1,0.8,0.5), opacity 0.3s';
              bill.style.bottom = '62%';
              bill.style.opacity = '0';
            }, i * 85);
          });
          setTimeout(() => hideOverlay(block), 700);
        }, 480);
      }));
    });
  }

  function animCashDepTake(block) {
    afterModalClose(() => {
      const overlay = showOverlay(block, _buildCashDepOverlay);

      /* Crop overlay to lower half */
      const r = block.getBoundingClientRect();
      const slitFrac = 0.50;
      overlay.style.top    = (r.top  + r.height * slitFrac) + 'px';
      overlay.style.height = (r.height * (1 - slitFrac))    + 'px';

      const bills = Array.from(overlay.querySelectorAll('.da-dep-bill'));

      bills.forEach(b => {
        b.style.transition = 'none';
        b.style.bottom = '60%';
        b.style.opacity = '0';
      });

      requestAnimationFrame(() => requestAnimationFrame(() => {
        bills.forEach((bill, i) => {
          setTimeout(() => {
            bill.style.transition = 'bottom 0.4s cubic-bezier(0.2,0.9,0.3,1), opacity 0.3s';
            bill.style.bottom = '5%';
            bill.style.opacity = '1';
          }, i * 90);
        });
      }));
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     RECEIPT PRINTER — v3
     Paper grows DOWNWARD from slot (~55% from top).
     Anchored at the slot opening; only the part below slot visible.
  ══════════════════════════════════════════════════════════════════ */
  function _buildReceiptOverlay() {
    const el = document.createElement('div');
    el.className = 'da-receipt-overlay';
    /* overflow:hidden clips the paper at the slot level */
    el.style.overflow = 'hidden';

    const paper = document.createElement('div');
    paper.className = 'da-paper';
    paper.style.cssText = [
      'position:absolute',
      'left:18%',
      'right:18%',
      'top:65%',
      'height:0',
      'background:#fefefe',
      'border-radius:0 0 2px 2px',
      'border:1px solid #ddd',
      'border-top:none',
      'box-shadow:2px 5px 16px rgba(0,0,0,0.32)',
      'overflow:hidden',
      'transition:none',
    ].join(';');

    // Receipt content lines
    const lines = [
      { top:'6px',  w:'65%', l:'12%' },
      { top:'13px', w:'80%', l:'10%' },
      { top:'20px', w:'50%', l:'25%' },
      { top:'27px', w:'72%', l:'10%' },
      { top:'34px', w:'60%', l:'10%' },
      { top:'41px', w:'75%', l:'10%' },
      { top:'49px', w:'45%', l:'28%' },
    ];
    lines.forEach(d => {
      const ln = document.createElement('div');
      ln.style.cssText = `position:absolute;top:${d.top};left:${d.l};width:${d.w};height:1.5px;background:#ccc;`;
      paper.appendChild(ln);
    });

    // Zigzag torn edge
    const torn = document.createElement('div');
    torn.style.cssText = [
      'position:absolute',
      'bottom:-6px',
      'left:0','right:0',
      'height:7px',
      'background:#fefefe',
      'clip-path:polygon(0% 0%, 4% 100%, 8% 0%, 12% 100%, 16% 0%, 20% 100%, 24% 0%, 28% 100%, 32% 0%, 36% 100%, 40% 0%, 44% 100%, 48% 0%, 52% 100%, 56% 0%, 60% 100%, 64% 0%, 68% 100%, 72% 0%, 76% 100%, 80% 0%, 84% 100%, 88% 0%, 92% 100%, 96% 0%, 100% 100%, 100% 0%)',
    ].join(';');
    paper.appendChild(torn);

    el.appendChild(paper);
    return el;
  }

  const _receiptState = new WeakMap();

  function animReceiptTakeReceipt(block) {
    const state = _receiptState.get(block);

    if (state === 'printed') {
      // Retract paper
      afterModalClose(() => {
        const entry = _map.get(block);
        if (!entry) return;
        const paper = entry.el.querySelector('.da-paper');
        if (!paper) return;

        paper.style.transition = 'height 0.3s ease-in, opacity 0.25s';
        paper.style.height = '0';
        paper.style.opacity = '0';
        setTimeout(() => {
          paper.style.opacity = '1';
          hideOverlay(block);
          _receiptState.delete(block);
        }, 380);
      });
    } else {
      // Print paper
      afterModalClose(() => {
        const overlay = showOverlay(block, _buildReceiptOverlay);
        const paper = overlay.querySelector('.da-paper');
        if (!paper) return;

        paper.style.transition = 'none';
        paper.style.height = '0';
        paper.style.opacity = '1';

        requestAnimationFrame(() => requestAnimationFrame(() => {
          paper.style.transition = 'height 0.7s cubic-bezier(0.15,0.9,0.3,1)';
          paper.style.height = '75px';
          _receiptState.set(block, 'printed');
        }));
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     CARD READER — v3  FIXED
     Reference image shows: card starts OUTSIDE the slit to the RIGHT,
     slides LEFT. The chip is on the LEFT side of the card so the chip
     goes in FIRST. The card is oriented horizontally.

     Insert Card:
       - Card starts fully to the RIGHT of the visible area
       - Slides LEFT, chip-end (left edge) enters the slit
       - Stops with ~60% of the card inside, tail visible on right
     Take Card:
       - Card slides back out to the right
  ══════════════════════════════════════════════════════════════════ */
  function _buildCardOverlay() {
    const el = document.createElement('div');
    el.className = 'da-card-overlay';
    el.style.overflow = 'hidden';
    el.style.borderRadius = '4px';

    const card = document.createElement('div');
    card.className = 'da-bank-card';
    card.style.cssText = [
      'position:absolute',
      /* Portrait card — top-down entry. One card only. */
      'width:68%',
      'height:50%',
      'top:-55%',        /* start fully ABOVE the block */
      'left:16%',        /* horizontally centred */
      'border-radius:4px',
      'background:linear-gradient(160deg,#281055 0%,#4c34b0 55%,#7560d8 100%)',
      'border:1px solid rgba(255,255,255,0.18)',
      'box-shadow:0 4px 18px rgba(0,0,0,0.65)',
      'overflow:hidden',
      'transition:none',
    ].join(';');

    /* EMV Chip — top of portrait card (enters slit first). Small. */
    const chip = document.createElement('div');
    chip.style.cssText = [
      'position:absolute',
      'top:9%','left:28%',
      'width:44%','height:16%',
      'background:linear-gradient(135deg,#dfc050 0%,#b89020 100%)',
      'border-radius:2px',
      'border:0.5px solid #806010',
    ].join(';');
    const chipLines = document.createElement('div');
    chipLines.style.cssText = 'position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 28%,rgba(0,0,0,0.15) 28%,rgba(0,0,0,0.15) 32%);border-radius:inherit;';
    chip.appendChild(chipLines);
    card.appendChild(chip);

    /* Magnetic stripe — horizontal near bottom */
    const stripe = document.createElement('div');
    stripe.style.cssText = 'position:absolute;bottom:9%;left:0;right:0;height:9%;background:rgba(0,0,0,0.7);';
    card.appendChild(stripe);

    /* Card number dots — centre */
    const numRow = document.createElement('div');
    numRow.style.cssText = 'position:absolute;top:46%;left:10%;right:10%;display:flex;justify-content:space-between;';
    for (let g = 0; g < 4; g++) {
      const grp = document.createElement('div');
      grp.style.cssText = 'display:flex;gap:1.5px;';
      for (let d = 0; d < 4; d++) {
        const dot = document.createElement('div');
        dot.style.cssText = 'width:2.5px;height:2.5px;border-radius:50%;background:rgba(255,255,255,0.35);';
        grp.appendChild(dot);
      }
      numRow.appendChild(grp);
    }
    card.appendChild(numRow);

    el.appendChild(card);
    return el;
  }

  function animCardInsert(block) {
    afterModalClose(() => {
      /* Destroy any stale overlay so we always start fresh with ONE card */
      if (_map.has(block)) {
        hideOverlay(block);
        const entry = _map.get(block);
        if (entry.el && entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
        _map.delete(block);
      }

      const overlay = showOverlay(block, _buildCardOverlay);
      const card = overlay.querySelector('.da-bank-card');
      if (!card) return;

      /* Reset: card fully ABOVE the block */
      card.style.transition = 'none';
      card.style.top  = '-55%';
      card.style.left = '16%';

      requestAnimationFrame(() => requestAnimationFrame(() => {
        /* Phase 1: slide DOWN — chip enters slot first */
        card.style.transition = 'top 0.50s cubic-bezier(0.25,0,0.3,1)';
        card.style.top = '15%';   /* card partially inserted */

        setTimeout(() => {
          /* Phase 2: suck further in — most of card inside machine */
          card.style.transition = 'top 0.28s cubic-bezier(0.4,0,0.2,1)';
          card.style.top = '50%'; /* only bottom tail visible */
        }, 540);
      }));
    });
  }

  function animCardTake(block) {
    afterModalClose(() => {
      const entry = _map.get(block);
      if (!entry) return;
      const card = entry.el.querySelector('.da-bank-card');
      if (!card) return;

      /* Eject upward out of slot */
      card.style.transition = 'top 0.42s cubic-bezier(0.4,0,0.6,1)';
      card.style.top = '-55%';
      setTimeout(() => hideOverlay(block), 480);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════════════ */
  window.DeviceAnimations = {

    trigger(deviceKey, action) {
      const all = sel => Array.from(document.querySelectorAll(sel));

      switch (deviceKey) {

        case 'Card Reader':
          all('[data-ctx-device="Card Reader"]').forEach(b => {
            if (action === 'Insert Card') animCardInsert(b);
            if (action === 'Take Card')   animCardTake(b);
          });
          break;

        case 'Dispenser':
          all('[data-ctx-device="Dispenser"]').forEach(b => {
            if (action === 'Release Cash') animCashDispRelease(b);
            if (action === 'Take Cash')    animCashDispTake(b);
          });
          break;

        case 'Cash Depositor':
          all('[data-ctx-device="Cash Depositor"]').forEach(b => {
            if (action === 'Insert Cash') animCashDepInsert(b);
            if (action === 'Take Cash')   animCashDepTake(b);
          });
          break;

        case 'Receipt Printer':
          all('[data-ctx-device="Receipt Printer"]').forEach(b => {
            if (action === 'Take Receipt') animReceiptTakeReceipt(b);
          });
          break;

        case 'Coin Depositor':
          all('[data-ctx-device="Coin Depositor"]').forEach(b => {
            if (action === 'Insert Coin') animCoinDepInsert(b);
          });
          break;

        case 'Coin Dispenser':
          all('[data-ctx-device="Coin Dispenser"]').forEach(b => {
            if (action === 'Release Coins') animCoinDispRelease(b);
            if (action === 'Take Coin')     animCoinDispTake(b);
          });
          break;
      }
    }
  };

})();