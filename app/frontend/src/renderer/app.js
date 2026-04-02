/* app.js — ATM Simulator renderer logic */

// ── Element references ─────────────────────────────────────────
const screenMessage = document.getElementById('screenMessage');
const cardVisual    = document.getElementById('cardVisual');
const cardSlot      = document.getElementById('cardSlot');
const btnInsertCard = document.getElementById('btnInsertCard');
const btnEjectCard  = document.getElementById('btnEjectCard');
const btnDispense   = document.getElementById('btnDispense');
const btnPrint      = document.getElementById('btnPrint');
const xfsDeviceList = document.getElementById('xfsDeviceList');
const deviceError   = document.getElementById('deviceError');

const lightReady    = document.getElementById('lightReady');
const lightBusy     = document.getElementById('lightBusy');
const lightError    = document.getElementById('lightError');

const readerStatus  = document.getElementById('readerStatus');
const cashStatus    = document.getElementById('cashStatus');
const receiptStatus = document.getElementById('receiptStatus');

// Both keypads (right-column fallback + bottom-row L-shape)
const allKeypads = Array.from(
  document.querySelectorAll('#keypad, #keypad-bottom, [aria-label="ATM keypad"], [aria-label="ATM keypad (bottom)"]')
).filter((el, i, arr) => arr.indexOf(el) === i); // deduplicate

// ── State ──────────────────────────────────────────────────────
const state = {
  cardInserted:  false,
  pinBuffer:     '',
  authenticated: false,
};

// ── UI Helpers ─────────────────────────────────────────────────
function setMessage(message) {
  if (screenMessage) screenMessage.textContent = message;
}

function setLights(mode) {
  if (!lightReady) return;
  lightReady.className = 'light';
  lightBusy.className  = 'light';
  lightError.className = 'light';
  if (mode === 'ready') lightReady.className = 'light on ready';
  if (mode === 'busy')  lightBusy.className  = 'light on busy';
  if (mode === 'error') lightError.className = 'light on error';
}

function setDeviceActivity(activeElement) {
  [readerStatus, cashStatus, receiptStatus].forEach(el => el && el.classList.remove('active'));
  if (activeElement) activeElement.classList.add('active');
}

// ── ATM Actions ────────────────────────────────────────────────
function insertCard() {
  if (state.cardInserted) {
    setMessage('Card already inserted. Enter 4-digit PIN and press Enter.');
    return;
  }
  state.cardInserted  = true;
  state.pinBuffer     = '';
  state.authenticated = false;
  if (cardVisual) cardVisual.className = 'card card-in';
  setLights('busy');
  setDeviceActivity(readerStatus);
  setMessage('Card detected. Please enter your 4-digit PIN.');
}

function ejectCard() {
  if (!state.cardInserted) {
    setMessage('No card to eject. Please insert your card.');
    return;
  }
  state.cardInserted  = false;
  state.pinBuffer     = '';
  state.authenticated = false;
  if (cardVisual) cardVisual.className = 'card card-out';
  setLights('ready');
  setDeviceActivity(readerStatus);
  setMessage('Please take your card. Ready for next customer.');
  setTimeout(() => {
    if (cardVisual) cardVisual.className = 'card card-hidden';
    setDeviceActivity(null);
  }, 1200);
}

function onDigit(digit) {
  if (!state.cardInserted) { setMessage('Insert card first.'); setLights('error'); return; }
  if (state.authenticated) { setMessage('Authenticated. Choose an action: Dispense Cash or Print Receipt.'); setLights('ready'); return; }
  if (state.pinBuffer.length >= 4) return;
  state.pinBuffer += digit;
  setLights('busy');
  setMessage(`PIN: ${'*'.repeat(state.pinBuffer.length)}${'_'.repeat(4 - state.pinBuffer.length)}`);
}

function onEnter() {
  if (!state.cardInserted) { setMessage('Insert card first.'); setLights('error'); return; }
  if (state.pinBuffer.length !== 4) { setMessage('Enter exactly 4 digits, then press Enter.'); setLights('error'); return; }
  state.authenticated = true;
  setLights('ready');
  setMessage('PIN accepted. Select action: Dispense Cash or Print Receipt.');
}

function onCancel() {
  state.pinBuffer     = '';
  state.authenticated = false;
  setLights('ready');
  setMessage(state.cardInserted
    ? 'Transaction cancelled. Enter PIN again or Eject Card.'
    : 'Please insert your card.');
}

function dispenseCash() {
  if (!state.authenticated) { setMessage('Authenticate first by entering PIN.'); setLights('error'); return; }
  setLights('busy');
  setDeviceActivity(cashStatus);
  setMessage('Cash dispenser ready. Please collect cash.');
  setTimeout(() => {
    setLights('ready');
    setDeviceActivity(null);
    setMessage('Cash dispensed successfully. You can print receipt or eject card.');
  }, 1300);
}

function printReceipt() {
  if (!state.cardInserted) { setMessage('Insert card first.'); setLights('error'); return; }
  setLights('busy');
  setDeviceActivity(receiptStatus);
  setMessage('Printing receipt...');
  setTimeout(() => {
    setLights('ready');
    setDeviceActivity(null);
    setMessage('Receipt printed. You can eject card.');
  }, 1000);
}

// ── Device panel listing (XFS only) ───────────────────────────
async function bindDevicePanel() {
  const config     = await window.atmApi?.getDeviceConfig?.();
  const safeConfig = config || { xfsDevices: [], vendor: 'Unknown', error: 'Preload bridge unavailable.' };
  const { xfsDevices, vendor, error } = safeConfig;

  if (error && deviceError) deviceError.textContent = error;

  if (!xfsDevices.length) {
    const item = document.createElement('li');
    item.textContent = 'No XFS devices found in DeviceMap.json';
    if (xfsDeviceList) xfsDeviceList.appendChild(item);
    return;
  }
  xfsDevices.forEach((device) => {
    const item = document.createElement('li');
    item.textContent = `${vendor} | ${device.DeviceName} | ${device.DeviceLogicalName}`;
    if (xfsDeviceList) xfsDeviceList.appendChild(item);
  });
}

// ── Device presence — absent icon overlay ─────────────────────
/**
 * Loads all devices, marks absent ones with data-device-absent (dims + cancel icon).
 *
 * Special handling for the merged CARD_CCR block:
 *   - The outer block [data-device-name="CARD_CCR"] is never dimmed as a whole.
 *   - [data-sub-device="CARD"] is individually dimmed if CARD is absent.
 *   - [data-sub-device="CCR"]  is individually dimmed if CCR is absent.
 */
async function applyDevicePresence() {
  let allDevices = [];

  // 1. Try Electron IPC bridge
  const config = await window.atmApi?.getDeviceConfig?.();
  console.log('[DevicePresence] IPC config:', config);

  if (config?.allDevices?.length) {
    allDevices = config.allDevices;
  } else {
    // 2. Fallback: fetch JSON directly
    const fetchPath = '../../DeviceMap.json';
    console.log('[DevicePresence] fetching:', fetchPath);
    try {
      const response = await fetch(fetchPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      allDevices = json?.SimulatorList?.DeviceArray || [];
    } catch (err) {
      console.error('[DevicePresence] fetch failed:', err);
      return;
    }
  }

  // Build DeviceName → DeviceType map (upper-cased keys for robustness)
  const deviceTypeMap = new Map(
    allDevices.map(d => [String(d.DeviceName).toUpperCase(), d.DeviceType])
  );
  console.log('[DevicePresence] deviceTypeMap:', Object.fromEntries(deviceTypeMap));

  // ── Handle normal blocks ──────────────────────────────────────
  document.querySelectorAll('[data-device-name]').forEach((el) => {
    const rawName = el.dataset.deviceName;

    // Skip the merged card-ccr outer block — handled separately below
    if (rawName === 'CARD_CCR') return;

    const type = deviceTypeMap.get(rawName.toUpperCase());
    console.log(`[DevicePresence] ${rawName} → ${type}`);

    if (type === 'XFS') {
      el.removeAttribute('data-device-absent');
    } else {
      el.setAttribute('data-device-absent', '');
    }
  });

  // ── Handle merged Card Reader / CCR block ─────────────────────
  document.querySelectorAll('[data-sub-device]').forEach((subEl) => {
    const subName = subEl.dataset.subDevice;
    const type    = deviceTypeMap.get(subName.toUpperCase());
    console.log(`[DevicePresence] sub:${subName} → ${type}`);

    if (type === 'XFS') {
      subEl.removeAttribute('data-sub-absent');
    } else {
      subEl.setAttribute('data-sub-absent', '');
    }
  });

  console.log('[DevicePresence] done.');
}

// ── Event wiring ───────────────────────────────────────────────
btnInsertCard?.addEventListener('click', insertCard);
btnEjectCard?.addEventListener('click',  ejectCard);
btnDispense?.addEventListener('click',   dispenseCash);
btnPrint?.addEventListener('click',      printReceipt);
cardSlot?.addEventListener('click',      insertCard);

// Wire all visible keypads (bottom-row and right-column fallback)
function handleKeypadClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const digit  = button.dataset.key;
  const action = button.dataset.action;
  if (digit)              { onDigit(digit); return; }
  if (action === 'enter') { onEnter();   return; }
  if (action === 'cancel'){ onCancel();  return; }
}

allKeypads.forEach(kp => kp.addEventListener('click', handleKeypadClick));

// ── Init ───────────────────────────────────────────────────────
setLights('ready');
setMessage('Please insert your card');
bindDevicePanel();
applyDevicePresence();

// ── Selective click-through (Electron transparent window) ──────
const _cabinet = document.querySelector('.screen-cabinet');
let _ignoring = false;
document.addEventListener('mousemove', (e) => {
  if (!_cabinet) return;
  const r = _cabinet.getBoundingClientRect();
  const inCabinet = e.clientX >= r.left && e.clientX <= r.right &&
                    e.clientY >= r.top  && e.clientY <= r.bottom;
  if (inCabinet !== _ignoring) {
    _ignoring = inCabinet;
    window.atmApi?.setIgnoreMouse(_ignoring);
  }
});