/* context-menu.js  — patched:
   1. BUG FIX: anchorRect is always read fresh from getBoundingClientRect() at
      the moment the menu is opened, so dragged components always get their
      current position (not a stale cached rect from before the drag).
   2. Added "Release Coins" to Coin Dispenser menu (triggers coin-fall animation).
   3. Added "Release Cash" to Dispenser menu (triggers bill-emerge animation).
   4. Leaf-click triggers DeviceAnimations.trigger() before ModalManager.open().
*/

(function () {
  'use strict';

  /* ── Context-menu data ── */
  const MENU_DATA = {
    "Card Reader": {
      "Insert Card": [],
      "Take Card": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Status": {
        "Media": ["PRESENT","NOTPRESENT","JAMMED","NOTSUPP","UNKNOWN","ENTERING","LATCHED"],
        "Security": ["OPEN","NOTREADY","NOTSUPP"],
        "Chip": ["ONLINE","POWEROFF","BUSY","NODEVICE","HWERROR","NOCARD","NOTSUPP","UNKNOWN"],
        "Retain Bin": ["OK","HIGH","FULL","NOTSUPP"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Set Capabilities": {
        "Power On Options": ["NOACTION","EJECT","RETAIN","EJECTTHENRETAIN","READPOSITION"],
        "Power Off Options": ["NOACTION","EJECT","RETAIN","EJECTTHENRETAIN","READPOSITION"],
        "Security": ["NOTSUPP","MMBOX","CIM86"],
        "Flux Sensor": ["PRESENT","NOTPRESENT"],
        "Compound": ["FALSE","TRUE"],
        "Flux Sensor Programmable": ["FALSE","TRUE"],
        "Read Write Access Following Eject": ["FALSE","TRUE"],
        "Write Mode": ["NOTSUPP","LOCO","HICO","AUTO"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": []
    },
    "Contactless Card Reader": {
      "Tap Card": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Status": {
        "Media": ["PRESENT","NOTPRESENT","JAMMED","NOTSUPP","UNKNOWN","ENTERING","LATCHED"],
        "Security": ["OPEN","NOTREADY","NOTSUPP"],
        "Chip": ["ONLINE","POWEROFF","BUSY","NODEVICE","HWERROR","NOCARD","NOTSUPP","UNKNOWN"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Set Capabilities": {
        "Security": ["NOTSUPP","MMBOX","CIM86"],
        "Compound": ["FALSE","TRUE"],
        "Flux Sensor Programmable": ["FALSE","TRUE"],
        "Write Mode": ["NOTSUPP","LOCO","HICO","AUTO"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": []
    },
    "Receipt Printer": {
      "Take Receipt": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "View Receipt": [],
      "Change Status": {
        "Media": ["PRESENT","NOTPRESENT","JAMMED","UNKNOWN","ENTERING","RETRACTED"],
        "Toner": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Ink": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Lamp": ["OK","FADING","INOP","NOTSUPP","UNKNOWN"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Change Paper Status": ["JAMMED","FULL","OUT","LOW","NOTSUPP","UNKNOWN"],
      "Change All Paper Status": ["JAMMED","FULL","OUT","LOW","NOTSUPP","UNKNOWN"]
    },
    "Statement Printer": {
      "Take Statement": [],
      "View Statement": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Status": {
        "Media": ["PRESENT","NOTPRESENT","JAMMED","UNKNOWN","ENTERING","RETRACTED"],
        "Toner": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Ink": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Lamp": ["OK","FADING","INOP","NOTSUPP","UNKNOWN"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": []
    },
    "Journal Printer": {
      "View Journal": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Status": {
        "Media": ["PRESENT","NOTPRESENT","JAMMED","UNKNOWN","ENTERING","RETRACTED"],
        "Toner": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Ink": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Lamp": ["OK","FADING","INOP","NOTSUPP","UNKNOWN"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Change Paper Status": ["FULL","OUT","NOTSUPP","UNKNOWN","JAMMED"]
    },
    "Dispenser": {
      "Release Cash": [],
      "Take Cash": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Shutter Status": [],
      "Change Transport": [],
      "Change Status": {
        "Dispenser": ["OK","CUSTATE","CUSTOP","CUUNKNOWN"],
        "Safe Door": ["NOTSUPPORTED","OPEN","CLOSED","UNKNOWN"],
        "Stacker": ["EMPTY","NOTEMPTY","NOTEMPTYCUST","NOTEMPTYUNK","UNKNOWN","NOTSUPPORTED"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Modify Cash": [],
      "Change Capabilities": ["Retract Modify"],
      "Change CashUnit Status": [],
      "Change Transport Status": [],
      "Change Present State": ["UNKNWON","PRESENTED","NOTPRESENTED"]
    },
    "Envelope Depositor": {
      "Take Envelope": [],
      "Insert Envelope": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Status": {
        "Deposit Container": ["OK","HIGH","FULL","INOP","MISSING","UNKNOWN","NOTSUPP"],
        "Deposit Transport": ["OK","INOP","UNKNOWN","NOTSUPP"],
        "Shutter": ["CLOSED","OPEN","JAMMED","UNKNOWN","NOTSUPP"],
        "Envelop Supply": ["OK","LOW","EMPTY","INOP","MISSING","NOTSUPP","UNLOCKED","UNKNOWN"],
        "Envelop Dispenser": ["OK","INOP","UNKNOWN","NOTSUPP"],
        "Printer": ["OK","INOP","UNKNOWN","NOTSUPP"],
        "Toner": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": []
    },
    "Cash Depositor": {
      "Insert Cash": [],
      "Take Cash": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Shutter Status": [],
      "Change Transport": [],
      "Change Status": {
        "Safe Door": ["OPEN","CLOSED","NOTSUPPORTED","UNKNOWN"],
        "Acceptor Cash Units": ["OK","STATE","STOP","UNKNOWN"],
        "Banknote Reader": ["OK","INOP","UNKNOWN","NOTSUPPORTED"],
        "Stacker Status": ["EMPTY","NOTEMPTY","FULL","UNKNOWN","NOTSUPPORTED"],
        "Customer Access": ["CUSTOMERACCESS","NOCUSTOMERACCESS","ACCESSUNKNOWN","NOITEMS"],
        "Drop Box": ["FALSE","TRUE"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      },
      "Change Present State": ["UNKNOWN","PRESENTED","NOTPRESENTED"],
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Change Transport Status": []
    },
    "Coin Depositor": {
      "Insert Coin": [],
      "Take Coin": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Shutter Status": [],
      "Change Transport": [],
      "Change Status": {
        "Safe Door": ["OPEN","CLOSED","NOTSUPPORTED","UNKNOWN"],
        "Acceptor Cash Units": ["OK","STATE","STOP","UNKNOWN"],
        "Banknote Reader": ["OK","INOP","UNKNOWN","NOTSUPPORTED"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"],
        "Stacker Customer Access": ["CUSTOMERACCESS","NOCUSTOMERACCESS","ACCESSUNKNOWN","NOITEMS"],
        "Drop Box": ["FALSE","TRUE"]
      },
      "Change Present State": ["UNKNOWN","PRESENTED","NOTPRESENTED"],
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Change Transport Status": []
    },
    "Cheque Depositor": {
      "Insert Cheque": [],
      "Take Cheque": [],
      "Take Refuse Cheque": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Shutter Status": [],
      "Change Transport Status": [],
      "Change Status": {
        "Media": ["NOTSUPP","NOTPRESENT","REQUIRED","PRESENT","JAMMED"],
        "Toner": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Ink": ["FULL","LOW","OUT","NOTSUPP","UNKNOWN"],
        "Form Data": ["NODATA","MANUAL","PREDEFINED"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"],
        "AntiFraud Module": ["AFMNOTSUPP","AFMOK","AFMINOP","AFMDEVICEDETECTED","AFMUNKNOWN"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Change MediaBin Status": {
        "MediaIn": ["OK","FULL","HIGH","UNKNOWN","MISSING","INOP"],
        "Retract": ["OK","FULL","HIGH","UNKNOWN","MISSING","INOP"]
      }
    },
    "Recycler Cash IN/OUT": {
      "Insert Cash": [],
      "Take Cash": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": {
        "General": [],
        "Device Specific": ["CashDepositor","CashDispenser"]
      },
      "Remove Fault": ["CashDepositor","CashDispenser"],
      "Change Shutter Status": [],
      "Change Transport": [],
      "Change Transport Status": [],
      "Change Status": {
        "Safe Door": ["OPEN","CLOSED","NOTSUPPORTED","UNKNOWN"],
        "Banknote Reader": ["OK","INOP","UNKNOWN","NOTSUPPORTED"],
        "Acceptor Cash Units": ["OK","STATE","STOP","UNKNOWN"],
        "Recycle In": {
          "Stacker": ["EMPTY","NOTEMPTY","FULL","UNKNOWN","NOTSUPPORTED"],
          "Stacker Customer Access": ["CUSTOMERACCESS","NOCUSTOMERACCESS","ACCESSUNKNOWN","NOITEMS"],
          "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
        },
        "Recycle Out": {
          "Stacker": ["EMPTY","NOTEMPTY","NOTEMPTYCUST","NOTEMPTYUNK","UNKNOWN","NOTSUPPORTED"],
          "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
        }
      },
      "Change Position Status": [],
      "Change Capabilities": { "Retract Modify": [] },
      "Change CashUnit Status": {
        "RECYCLEIN": {
          "Logical Unit 1": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"],
          "Logical Unit 2": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"],
          "Logical Unit 3": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"],
          "Logical Unit 4": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"],
          "Logical Unit 5": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"],
          "Logical Unit 6": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"],
          "Logical Unit 7": ["OK","FULL","HIGH","LOW","EMPTY","INOP","MISSING","NOVAL","NOREF","MANIP"]
        },
        "RECYCLEOUT": {
          "Logical Unit 1": ["MISSING","MANIP"],
          "Logical Unit 2": ["MISSING","MANIP"],
          "Logical Unit 3": ["MISSING","MANIP"],
          "Logical Unit 4": ["MISSING","MANIP"],
          "Logical Unit 5": ["MISSING","MANIP"],
          "Logical Unit 8": ["MISSING","MANIP"]
        }
      },
      "Take Cash Fault": [],
      "Modify Cash": [],
      "Change Present State": { "Recycle Out": ["UNKNOWN","PRESENTED","NOTPRESENTED"] },
      "Change lpszExtra": ["Recycle In","Recycle Out"],
      "Clear lpszExtra": ["Recycle In","Recycle Out"]
    },
    "Coin Dispenser": {
      "Release Coins": [],
      "Take Coin": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Shutter Status": [],
      "Change Transport": [],
      "Change Status": {
        "Dispenser": ["OK","CUSTATE","CUSTOP","CUUNKNOWN"],
        "Safe Door": ["OPEN","CLOSED","NOTSUPPORTED","UNKNOWN"],
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"],
        "Stacker": ["EMPTY","NOTEMPTY","NOTEMPTYCUST","NOTEMPTYUNK","UNKNOWN","NOTSUPPORTED"]
      },
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Change Transport Status": [],
      "Change Present State": ["UNKNOWN","PRESENTED","NOTPRESENTED","Encryption"]
    },
    "PIN Pad": {
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change Status": {
        "Device Position": ["DEVICEINPOSITION","DEVICENOTINPOSITION","DEVICEPOSUNKNOWN","DEVICEPOSNOTSUPP"]
      },
      "Change PINBlock": [],
      "ResetPinBlock": [],
      "Change Encryption": ["READY","NOTREADY","INITIALIZED","NOTINITIALIZED","BUSY","UNDEFINED"],
      "Certificate": ["PRIMARY","SECONDARY","NOTREADY","NOTSUPP"],
      "Change lpszExtra": [],
      "Clear lpszExtra": []
    },
    "Barcode Reader": {
      "Select Barcode": [],
      "Clear All Barcode": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change lpszExtra": [],
      "Clear lpszExtra": [],
      "Set Delay": [],
      "Clear Delay": [],
      "Change Status": {
        "Device Position": ["INPOSITION","NOTINPOSITION","UNKNOWN","NOTSUPPORTED"]
      }
    },
    "ID Scanner": {
      "Insert ID": [],
      "Change Dev Status": ["ONLINE","OFFLINE","POWER OFF","BUSY","NO DEVICE","USER ERROR","HW ERROR"],
      "Create Fault": ["General","Device Specific"],
      "Remove Fault": [],
      "Change lpszExtra": [],
      "Clear lpszExtra": []
    }
  };

  /* ── Active menu stack ── */
  let openMenus   = [];
  let hoverTimers = new Map();

  let _rootAction = null;
  let _pathStack  = [];
  let _deviceKey  = null;

  /* ── Utility: does value have children? ── */
  function hasChildren(val) {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return false;
  }

  function closeFrom(level) {
    while (openMenus.length > level) {
      const m = openMenus.pop();
      if (m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
    }
    hoverTimers.forEach((t, el) => {
      if (!document.contains(el)) { clearTimeout(t); hoverTimers.delete(el); }
    });
  }

  function closeAll() {
    _rootAction = null;
    _pathStack  = [];
    _deviceKey  = null;
    closeFrom(0);
  }

  /* ─────────────────────────────────────────────────────────────────
     BUG FIX: positionMenu uses getBoundingClientRect() live for
     sub-menu items (already done). For level-0 (root) menus the
     anchorRect is now ALWAYS captured fresh in wireDevice's mousedown
     handler (not cached), so dragged elements always open at their
     current viewport position.
  ───────────────────────────────────────────────────────────────── */
  function positionMenu(menuEl, parentItemEl, anchorRect, level) {
    document.body.appendChild(menuEl);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = menuEl.offsetWidth  || 200;
    const mh = menuEl.offsetHeight || 100;
    let x, y;
    if (level === 0) {
      // anchorRect is always fresh (captured at mousedown time)
      x = anchorRect.right;
      y = anchorRect.top;
      if (y + mh > vh) y = Math.max(0, vh - mh);
    } else {
      // sub-menu: read parent item's live position
      const pr = parentItemEl.getBoundingClientRect();
      x = pr.right;
      y = pr.top;
      if (x + mw > vw) x = pr.left - mw;
      if (y + mh > vh) y = Math.max(0, vh - mh);
    }
    menuEl.style.left = x + 'px';
    menuEl.style.top  = y + 'px';
  }

  function buildMenu(data, parentItemEl, anchorRect, level, pathSoFar) {
    closeFrom(level);

    const menuEl = document.createElement('div');
    menuEl.className = 'ctx-menu';
    menuEl.dataset.ctxLevel = String(level);
    menuEl.addEventListener('mousedown', e => e.stopPropagation());
    menuEl.addEventListener('click',     e => e.stopPropagation());

    const entries = Array.isArray(data)
      ? data.map(v => [v, []])
      : Object.entries(data);

    entries.forEach(([key, val]) => {
      const hasKids = hasChildren(val);
      const item = document.createElement('div');
      item.className = 'ctx-item';
      item.dataset.ctxKey = key;

      const label = document.createElement('span');
      label.textContent = key;
      item.appendChild(label);

      if (hasKids) {
        const arrow = document.createElement('span');
        arrow.className = 'ctx-arrow';
        arrow.textContent = '▶';
        item.appendChild(arrow);
      }

      item.addEventListener('mouseenter', () => {
        menuEl.querySelectorAll('.ctx-item').forEach(i => i.classList.remove('ctx-hover'));
        item.classList.add('ctx-hover');
        if (hasKids) {
          hoverTimers.forEach((t, el) => { if (el !== item) { clearTimeout(t); hoverTimers.delete(el); } });
          const tid = setTimeout(() => {
            openSubMenu(val, item, level + 1, [...pathSoFar, key]);
          }, 2500);
          hoverTimers.set(item, tid);
        } else {
          closeFrom(level + 1);
          hoverTimers.forEach((t, el) => { clearTimeout(t); hoverTimers.delete(el); });
        }
      });

      item.addEventListener('mouseleave', () => {
        if (hoverTimers.has(item)) { clearTimeout(hoverTimers.get(item)); hoverTimers.delete(item); }
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hasKids) {
          openSubMenu(val, item, level + 1, [...pathSoFar, key]);
        } else {
          /* ── LEAF CLICKED ── fire animation then dispatch ── */
          const fullPath = [...pathSoFar, key];
          fireAnimation(_deviceKey, fullPath);
          dispatchAction(_deviceKey, fullPath);
          closeAll();
        }
      });

      menuEl.appendChild(item);
    });

    openMenus.push({ el: menuEl, level });
    positionMenu(menuEl, parentItemEl, anchorRect, level);
  }

  function openSubMenu(data, parentItemEl, level, path) {
    buildMenu(data, parentItemEl, null, level, path);
  }

  /* ── Fire device animation for known action leaves ── */
  function fireAnimation(deviceKey, path) {
    if (!window.DeviceAnimations) return;
    const action = path[0]; // top-level action key
    window.DeviceAnimations.trigger(deviceKey, action);
  }

  /* ── Dispatch to ModalManager ── */
  function dispatchAction(deviceKey, path) {
    if (!window.ModalManager) {
      console.warn('[ContextMenu] ModalManager not loaded');
      return;
    }

    const [root, ...rest] = path;

    if (root === 'Change Dev Status') {
      window.ModalManager.open(deviceKey, 'Change Dev Status', rest[0]);
    } else if (root === 'Create Fault') {
      window.ModalManager.open(deviceKey, 'Create Fault', rest[0]);
    } else if (root === 'Remove Fault') {
      window.ModalManager.open(deviceKey, 'Remove Fault', rest[0] || null);
    } else if (root === 'Change Status') {
      if (rest.length === 2) {
        window.ModalManager.open(deviceKey, 'Change Status', null, { group: rest[0], value: rest[1] });
      } else if (rest.length === 3) {
        window.ModalManager.open(deviceKey, 'Change Status', null, { group: rest[0] + '/' + rest[1], value: rest[2] });
      } else {
        window.ModalManager.open(deviceKey, 'Change Status', null, { group: rest.join('/'), value: '' });
      }
    } else if (root === 'Set Capabilities') {
      window.ModalManager.open(deviceKey, 'Set Capabilities', null, { group: rest[0], value: rest[1] || '' });
    } else if (root === 'Change Capabilities') {
      window.ModalManager.open(deviceKey, 'Change Capabilities', rest[0]);
    } else if (root === 'Change CashUnit Status') {
      window.ModalManager.open(deviceKey, 'Change CashUnit Status', null, {
        group: (rest[0] || '') + ' / ' + (rest[1] || ''),
        value: rest[2] || rest[1] || ''
      });
    } else if (root === 'Change MediaBin Status') {
      window.ModalManager.open(deviceKey, 'Change MediaBin Status', null, { group: rest[0], value: rest[1] });
    } else if (root === 'Change Present State') {
      const val = rest.length > 1 ? rest[1] : rest[0];
      window.ModalManager.open(deviceKey, 'Change Present State', val);
    } else if (root === 'Change lpszExtra') {
      window.ModalManager.open(deviceKey, 'Change lpszExtra', rest[0] || null);
    } else if (root === 'Clear lpszExtra') {
      window.ModalManager.open(deviceKey, 'Clear lpszExtra', rest[0] || null);
    } else if (root === 'Change Paper Status') {
      window.ModalManager.open(deviceKey, 'Change Paper Status', rest[0]);
    } else if (root === 'Change All Paper Status') {
      window.ModalManager.open(deviceKey, 'Change All Paper Status', rest[0]);
    } else if (root === 'Change Encryption') {
      window.ModalManager.open(deviceKey, 'Change Encryption', rest[0]);
    } else if (root === 'Certificate') {
      window.ModalManager.open(deviceKey, 'Certificate', rest[0]);
    } else {
      /* Simple leaf: Insert Card, Take Card, Release Cash, Release Coins, etc. */
      window.ModalManager.open(deviceKey, root, rest[0] || null);
    }
  }

  /* ── Show "Device not Present" toast ── */
  function showAbsentToast(anchorRect) {
    const existing = document.querySelector('.ctx-absent-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'ctx-absent-toast';
    toast.textContent = 'Device not Present';
    document.body.appendChild(toast);
    const tw = toast.offsetWidth || 160;
    const th = toast.offsetHeight || 26;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = anchorRect.right + 6;
    let y = anchorRect.top + (anchorRect.height / 2) - (th / 2);
    if (x + tw > vw) x = anchorRect.left - tw - 6;
    if (y + th > vh) y = vh - th - 4;
    if (y < 0) y = 4;
    toast.style.left = x + 'px';
    toast.style.top  = y + 'px';
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 320);
    }, 1800);
  }

  function isAbsent(el) {
    if (el.hasAttribute('data-device-absent')) return true;
    if (el.hasAttribute('data-sub-absent')) return true;
    const block = el.closest('[data-device-absent]');
    if (block && block !== el) return true;
    return false;
  }

  /* ── Wire up all devices ── */
  function wireDevice(el) {
    const deviceKey = el.dataset.ctxDevice;
    const isPad     = el.dataset.ctxPad === '1';
    const menuDef   = MENU_DATA[deviceKey];
    if (!menuDef) return;
    el.style.cursor = 'pointer';

    el.addEventListener('mousedown', (e) => {
      if (isPad) { const btn = e.target.closest('button'); if (btn) return; }
      e.preventDefault();
      e.stopPropagation();

      /* ── BUG FIX: always read position fresh here, never cache ── */
      const rect = el.getBoundingClientRect();

      if (isAbsent(el)) { closeAll(); showAbsentToast(rect); return; }

      _deviceKey  = deviceKey;
      _rootAction = null;
      _pathStack  = [];

      buildMenu(menuDef, null, rect, 0, []);
    });
  }

  /* ── Global close ── */
  document.addEventListener('mousedown', () => {
    closeAll();
    const t = document.querySelector('.ctx-absent-toast');
    if (t) t.remove();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAll();
      const t = document.querySelector('.ctx-absent-toast');
      if (t) t.remove();
    }
  });

  /* ── Init ── */
  function init() {
    document.querySelectorAll('[data-ctx-device]').forEach(wireDevice);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();