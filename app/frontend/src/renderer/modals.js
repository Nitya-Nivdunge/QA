/* modal-manager.js
   Manages all action dialogs triggered from the context menu.

   DIALOGS IMPLEMENTED (mirrors C# forms):
   ┌─────────────────────────────────────────────────────────┐
   │  #dlg-fault-create     FaultCreationForm.cs             │
   │  #dlg-dev-status       Change Dev Status (inline)       │
   │  #dlg-change-status    Change Status (nested key/val)   │
   │  #dlg-set-lpszextra    FormSetlpszExtra.cs              │
   │  #dlg-clear-lpszextra  FormClearlpszExtra.cs            │
   │  #dlg-delay            FormDelay.cs                     │
   │  #dlg-position         PositionFaultsForm.cs            │
   │  #dlg-simple-action    Generic confirmation dialog      │
   └─────────────────────────────────────────────────────────┘

   BACKEND CONTRACT  (Spring Boot REST — port 8080 by default)
   POST /api/device/{deviceKey}/action
   Body: { action, params: { ... } }

   The deviceKey matches ContextMenu.json top-level keys, e.g. "Card Reader".
*/

(function () {
  'use strict';

  /* ── Backend base URL ────────────────────────────────────── */
  const API_BASE = 'http://localhost:8080/api/device';

  /* ── Generic return codes (from DeviceXfs.java) ─────────── */
  const GENERIC_RETURN_CODES = [
    'SUCCESS (0)', 'ALREADY_STARTED (-1)', 'API_VER_TOO_HIGH (-2)',
    'API_VER_TOO_LOW (-3)', 'CANCELED (-4)', 'DEV_NOT_READY (-13)',
    'HARDWARE_ERROR (-14)', 'INTERNAL_ERROR (-15)', 'INVALID_COMMAND (-20)',
    'LOCKED (-32)', 'NOT_STARTED (-39)', 'OP_IN_PROGRESS (-41)',
    'OUT_OF_MEMORY (-42)', 'TIMEOUT (-48)', 'USER_ERROR (-55)',
    'FRAUD_ATTEMPT (-57)'
  ];

  /* ── Device-specific return codes by device type ─────────── */
  const DEVICE_SPECIFIC_CODES = {
    'Card Reader': [
      'MEDIANOTSUPP', 'SHUTTERFAIL', 'FRAUDATTEMPT', 'NOCARD',
      'INVALIDCARD', 'RETAINBINFULL', 'INVALIDMEDIA', 'CARDTOOSHORT',
      'CARDTOOLONG'
    ],
    'Contactless Card Reader': [
      'MEDIANOTSUPP', 'SHUTTERFAIL', 'FRAUDATTEMPT', 'NOCARD', 'INVALIDCARD'
    ],
    'Receipt Printer': [
      'FORMNOTFOUND', 'FIELDNOTFOUND', 'NOMEDIAPRESENT', 'FLUSHFAIL',
      'PAPERJAMMED', 'PAPEROUT', 'INKOUT', 'TONEROUT', 'LAMPINOP',
      'MEDIAJAMMED', 'MEDIAOVERFLOW', 'STACKERFULL'
    ],
    'Statement Printer': [
      'FORMNOTFOUND', 'FIELDNOTFOUND', 'NOMEDIAPRESENT', 'FLUSHFAIL',
      'PAPERJAMMED', 'PAPEROUT', 'INKOUT', 'TONEROUT', 'LAMPINOP',
      'MEDIAJAMMED', 'MEDIAOVERFLOW', 'STACKERFULL'
    ],
    'Journal Printer': [
      'FORMNOTFOUND', 'NOMEDIAPRESENT', 'PAPERJAMMED', 'PAPEROUT',
      'INKOUT', 'TONEROUT', 'MEDIAJAMMED', 'STACKERFULL'
    ],
    'Dispenser': [
      'CASHUNITERROR', 'TOOMANYITEMS', 'NOMIXEDMEDIA', 'NOTDISPENSED',
      'EMPTYCASHUNIT', 'SHUTFAIL', 'INVALIDDENOMINATION', 'INVALIDCURRENCY'
    ],
    'Cash Depositor': [
      'CASHUNITERROR', 'INVALIDMEDIA', 'INVALIDBILL', 'FULLNOTEACCEPTOR',
      'STACFULL', 'SHUTFAIL', 'ITEMSTAKEN'
    ],
    'Coin Depositor': [
      'CASHUNITERROR', 'INVALIDMEDIA', 'STACFULL', 'SHUTFAIL'
    ],
    'Coin Dispenser': [
      'CASHUNITERROR', 'EMPTYCASHUNIT', 'SHUTFAIL', 'INVALIDDENOMINATION'
    ],
    'Cheque Depositor': [
      'MEDIAJAMMED', 'TOOBIG', 'TOOSMALL', 'CODLINENOTFOUND',
      'MEDIARETRACTED', 'RFNOTSUPP', 'STACKERFULLEMPTY'
    ],
    'Envelope Depositor': [
      'ENVTOOSHORT', 'ENVTOOLONG', 'SHUTFAIL', 'DEPFULL'
    ],
    'Recycler Cash IN/OUT': [
      'CASHUNITERROR', 'INVALIDMEDIA', 'FULLNOTEACCEPTOR',
      'NOTDISPENSED', 'EMPTYCASHUNIT', 'SHUTFAIL'
    ],
    'PIN Pad': [
      'KEYNOTFOUND', 'ACCESSDENIED', 'DUPLICATEKEY', 'KEYNOVALUE',
      'USENOTSUPP', 'NOINPUTDATA', 'INVALIDKEYLENGTH'
    ],
    'Barcode Reader': [
      'BARCODEUNREADABLE', 'BARCODETOOLONG', 'BARCODETRANSPORTERROR'
    ],
    'ID Scanner': [
      'FORMNOTFOUND', 'MEDIAJAMMED', 'MEDIANOTFOUND', 'NOMEDIAPRESENT'
    ],
    'Sensors': [],
    'Mixed Depositor': [
      'CASHUNITERROR', 'MEDIAJAMMED', 'INVALIDMEDIA', 'STACFULL'
    ]
  };

  /* ── Commands per device (from XFS Java *Xfs.setFaults()) ── */
  const DEVICE_COMMANDS = {
    'Card Reader': [
      'WFS_CMD_IDC_READ_TRACK', 'WFS_CMD_IDC_WRITE_TRACK',
      'WFS_CMD_IDC_EJECT_CARD', 'WFS_CMD_IDC_RETAIN_CARD',
      'WFS_CMD_IDC_RESET_COUNT', 'WFS_CMD_IDC_SETKEY',
      'WFS_CMD_IDC_READ_RAW_DATA', 'WFS_CMD_IDC_WRITE_RAW_DATA',
      'WFS_CMD_IDC_CHIP_IO', 'WFS_CMD_IDC_RESET',
      'WFS_CMD_IDC_CHIP_POWER', 'WFS_CMD_IDC_PARSE_DATA'
    ],
    'Contactless Card Reader': [
      'WFS_CMD_IDC_READ_TRACK', 'WFS_CMD_IDC_EJECT_CARD',
      'WFS_CMD_IDC_CHIP_IO', 'WFS_CMD_IDC_RESET', 'WFS_CMD_IDC_CHIP_POWER'
    ],
    'Receipt Printer': [
      'WFS_CMD_PTR_CONTROL_MEDIA', 'WFS_CMD_PTR_PRINT_FORM',
      'WFS_CMD_PTR_READ_FORM', 'WFS_CMD_PTR_RAW_DATA',
      'WFS_CMD_PTR_MEDIA_EXTENTS', 'WFS_CMD_PTR_RESET_COUNT',
      'WFS_CMD_PTR_READ_IMAGE', 'WFS_CMD_PTR_RESET',
      'WFS_CMD_PTR_RETRACT_MEDIA', 'WFS_CMD_PTR_DISPENSE_PAPER'
    ],
    'Statement Printer': [
      'WFS_CMD_PTR_CONTROL_MEDIA', 'WFS_CMD_PTR_PRINT_FORM',
      'WFS_CMD_PTR_READ_FORM', 'WFS_CMD_PTR_RAW_DATA',
      'WFS_CMD_PTR_RESET', 'WFS_CMD_PTR_RETRACT_MEDIA',
      'WFS_CMD_PTR_DISPENSE_PAPER'
    ],
    'Journal Printer': [
      'WFS_CMD_PTR_CONTROL_MEDIA', 'WFS_CMD_PTR_PRINT_FORM',
      'WFS_CMD_PTR_READ_FORM', 'WFS_CMD_PTR_RAW_DATA',
      'WFS_CMD_PTR_RESET', 'WFS_CMD_PTR_RETRACT_MEDIA',
      'WFS_CMD_PTR_DISPENSE_PAPER'
    ],
    'Dispenser': [
      'WFS_CMD_CIM_OPEN_SHUTTER', 'WFS_CMD_CIM_CLOSE_SHUTTER',
      'WFS_CMD_CDM_DISPENSE', 'WFS_CMD_CDM_PRESENT',
      'WFS_CMD_CDM_REJECT', 'WFS_CMD_CDM_RETRACT',
      'WFS_CMD_CDM_RESET', 'WFS_CMD_CDM_COUNT'
    ],
    'Cash Depositor': [
      'WFS_CMD_CIM_OPEN_SHUTTER', 'WFS_CMD_CIM_CLOSE_SHUTTER',
      'WFS_CMD_CIM_IN_ROLLBACK', 'WFS_CMD_CIM_IN_RETRACT',
      'WFS_CMD_CIM_CASH_IN_START', 'WFS_CMD_CIM_CASH_IN',
      'WFS_CMD_CIM_CASH_IN_END', 'WFS_CMD_CIM_RESET'
    ],
    'Coin Depositor': [
      'WFS_CMD_CIM_OPEN_SHUTTER', 'WFS_CMD_CIM_CLOSE_SHUTTER',
      'WFS_CMD_CIM_CASH_IN_START', 'WFS_CMD_CIM_CASH_IN',
      'WFS_CMD_CIM_CASH_IN_END', 'WFS_CMD_CIM_RESET'
    ],
    'Coin Dispenser': [
      'WFS_CMD_CDM_DISPENSE', 'WFS_CMD_CDM_PRESENT',
      'WFS_CMD_CDM_REJECT', 'WFS_CMD_CDM_RESET'
    ],
    'Cheque Depositor': [
      'WFS_CMD_IPM_MEDIA_IN_START', 'WFS_CMD_IPM_MEDIA_IN',
      'WFS_CMD_IPM_MEDIA_IN_END', 'WFS_CMD_IPM_MEDIA_IN_ROLLBACK',
      'WFS_CMD_IPM_PRINT_TEXT', 'WFS_CMD_IPM_RESET'
    ],
    'Envelope Depositor': [
      'WFS_CMD_DEP_ENTRY', 'WFS_CMD_DEP_DISPENSE',
      'WFS_CMD_DEP_RETRACT', 'WFS_CMD_DEP_RESET'
    ],
    'Recycler Cash IN/OUT': [
      'WFS_CMD_CIM_CASH_IN_START', 'WFS_CMD_CIM_CASH_IN',
      'WFS_CMD_CIM_CASH_IN_END', 'WFS_CMD_CDM_DISPENSE',
      'WFS_CMD_CDM_PRESENT', 'WFS_CMD_CDM_RETRACT', 'WFS_CMD_CDM_RESET'
    ],
    'PIN Pad': [
      'WFS_CMD_PIN_GET_DATA', 'WFS_CMD_PIN_CRYPT',
      'WFS_CMD_PIN_LOCAL_DES', 'WFS_CMD_PIN_LOCAL_EUROCHEQUE',
      'WFS_CMD_PIN_LOCAL_VISA', 'WFS_CMD_PIN_CREATE_OFFSET',
      'WFS_CMD_PIN_DERIVE_KEY', 'WFS_CMD_PIN_GET_PIN_BLOCK',
      'WFS_CMD_PIN_LOCAL_BANKSYS', 'WFS_CMD_PIN_IMPORT_KEY',
      'WFS_CMD_PIN_INITIALIZE_PIN', 'WFS_CMD_PIN_RESET'
    ],
    'Barcode Reader': [
      'WFS_CMD_BCR_READ', 'WFS_CMD_BCR_RESET'
    ],
    'ID Scanner': [
      'WFS_CMD_SDC_READ', 'WFS_CMD_SDC_RESET'
    ],
    'Sensors': [
      'WFS_CMD_SIU_SET_PORTS', 'WFS_CMD_SIU_SET_DOOR',
      'WFS_CMD_SIU_RESET'
    ],
    'Mixed Depositor': [
      'WFS_CMD_CIM_CASH_IN_START', 'WFS_CMD_CIM_CASH_IN',
      'WFS_CMD_CIM_CASH_IN_END', 'WFS_CMD_IPM_MEDIA_IN_START',
      'WFS_CMD_IPM_MEDIA_IN', 'WFS_CMD_IPM_MEDIA_IN_END'
    ]
  };

  /* ── Active dialog state ─────────────────────────────────── */
  let _currentDevice  = null;
  let _currentAction  = null;
  let _currentPayload = null;

  /* ══════════════════════════════════════════════════════════
     PUBLIC API — called by context-menu.js
     ══════════════════════════════════════════════════════════ */
  window.ModalManager = {

    /**
     * Main entry point. Called by context-menu.js when a leaf item is clicked.
     * @param {string} deviceKey  - e.g. "Card Reader"
     * @param {string} action     - e.g. "Create Fault", "Insert Card", "Change Dev Status"
     * @param {string} [subValue] - selected sub-value if any (e.g. "ONLINE", "General")
     * @param {object} [extra]    - extra context (e.g. { statusGroup: "Media", statusValue: "JAMMED" })
     */
    open(deviceKey, action, subValue, extra) {
      _currentDevice  = deviceKey;
      _currentAction  = action;
      _currentPayload = { subValue, extra };

      console.log('[ModalManager] open:', deviceKey, '→', action, subValue, extra);

      /* DIALOGS DISABLED — animations already fired by context-menu.js.
         All dialog popups are suppressed. Just return silently. */
      return;

      /* Route to the correct dialog */
      if (action === 'Insert Card') {
        openCardSelect(deviceKey, 'insert_card');
      } else if (action === 'Tap Card') {
        openCardSelect(deviceKey, 'tap_card');
      } else if (action === 'Insert Cheque') {
        openChequeSelect(deviceKey);
      } else if (action === 'Insert Cash') {
        openCashSelect(deviceKey, 'insert_cash');
      } else if (action === 'Insert Coin') {
        openCashSelect(deviceKey, 'insert_coin');
      } else if (action === 'Select Barcode') {
        openBarcodeSelect(deviceKey);
      }
      else if (action === 'Create Fault') {
        openFaultCreate(deviceKey, subValue === 'Device Specific');
      } else if (action === 'Change Dev Status') {
        /* subValue already holds the chosen status — send directly */
        confirmAndSend(
          `Set device status to <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'setDevStatus', { status: subValue })
        );
      } else if (action === 'Change Status') {
        /* extra = { group, value } */
        confirmAndSend(
          `Set <strong>${extra.group}</strong> → <strong>${extra.value}</strong>?`,
          () => callApi(deviceKey, 'changeStatus', { group: extra.group, value: extra.value })
        );
      } else if (action === 'Remove Fault') {
        /* subValue may be a device sub-name for Recycler */
        confirmAndSend(
          `Remove fault${subValue ? ' for <strong>' + subValue + '</strong>' : ''}?`,
          () => callApi(deviceKey, 'removeFault', { sub: subValue || null })
        );
      } else if (action === 'Change lpszExtra') {
        openSetLpszExtra(deviceKey, subValue);
      } else if (action === 'Clear lpszExtra') {
        openClearLpszExtra(deviceKey, subValue);
      } else if (action === 'Set Delay') {
        openDelay(deviceKey);
      } else if (action === 'Clear Delay') {
        confirmAndSend('Clear delay?',
          () => callApi(deviceKey, 'clearDelay', {}));
      } else if (action === 'Change Shutter Status') {
        openPosition(deviceKey, 'shutter');
      } else if (action === 'Change Transport') {
        openPosition(deviceKey, 'transport');
      } else if (action === 'Change Transport Status') {
        openPosition(deviceKey, 'transportStatus');
      } else if (action === 'Change Position Status') {
        openPosition(deviceKey, 'positionStatus');
      } else if (action === 'Change Present State') {
        confirmAndSend(
          `Set present state to <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'changePresentState', { state: subValue })
        );
      } else if (action === 'Set Capabilities') {
        confirmAndSend(
          `Set capability <strong>${extra.group}</strong> → <strong>${extra.value}</strong>?`,
          () => callApi(deviceKey, 'setCapabilities', { group: extra.group, value: extra.value })
        );
      } else if (action === 'Change Capabilities') {
        confirmAndSend(
          `Set capability <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'changeCapabilities', { capability: subValue })
        );
      } else if (action === 'Change CashUnit Status') {
        confirmAndSend(
          `Set cash unit <strong>${extra.group}</strong> → <strong>${extra.value}</strong>?`,
          () => callApi(deviceKey, 'changeCashUnitStatus', { unit: extra.group, status: extra.value })
        );
      } else if (action === 'CHange MediaBin Status' || action === 'Change MediaBin Status') {
        confirmAndSend(
          `Set media bin <strong>${extra.group}</strong> → <strong>${extra.value}</strong>?`,
          () => callApi(deviceKey, 'changeMediaBinStatus', { bin: extra.group, status: extra.value })
        );
      } else if (action === 'Change Encryption') {
        confirmAndSend(
          `Set encryption to <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'changeEncryption', { state: subValue })
        );
      } else if (action === 'Certificate') {
        confirmAndSend(
          `Set certificate to <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'changeCertificate', { state: subValue })
        );
      } else if (action === 'Change PINBlock') {
        openSetLpszExtra(deviceKey, null, 'PIN Block');
      } else if (action === 'ResetPinBlock') {
        confirmAndSend('Reset PIN block?',
          () => callApi(deviceKey, 'resetPinBlock', {}));
      } else if (action === 'Select Barcode') {
        openSetLpszExtra(deviceKey, null, 'Barcode value');
      } else if (action === 'Clear All Barcode') {
        confirmAndSend('Clear all barcodes?',
          () => callApi(deviceKey, 'clearAllBarcode', {}));
      } else if (action === 'Change Paper Status') {
        confirmAndSend(
          `Set paper status to <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'changePaperStatus', { status: subValue })
        );
      } else if (action === 'Change All Paper Status') {
        confirmAndSend(
          `Set ALL paper status to <strong>${subValue}</strong>?`,
          () => callApi(deviceKey, 'changeAllPaperStatus', { status: subValue })
        );
      } else if (action === 'Modify Cash') {
        openSetLpszExtra(deviceKey, null, 'Cash modification params');
      } else if (action === 'Take Cash Fault') {
        confirmAndSend('Trigger take-cash fault?',
          () => callApi(deviceKey, 'takeCashFault', {}));
      } else if (action === 'Set Doors') {
        openSetLpszExtra(deviceKey, null, 'Door configuration');
      } else if (action === 'Set Sensors') {
        openSetLpszExtra(deviceKey, null, 'Sensor configuration');
      } else if (action === 'Set Indicators') {
        openSetLpszExtra(deviceKey, null, 'Indicator configuration');
      } else {
        /* Leaf simple actions: Insert Card, Take Card, etc. */
        confirmAndSend(
          `Execute <strong>${action}</strong>${subValue ? ' (<em>' + subValue + '</em>)' : ''}?`,
          () => callApi(deviceKey, toApiAction(action), { sub: subValue || null })
        );
      }
    }
  };

  function openCardSelect(deviceKey, actionName) {
    const dlg = document.getElementById('dlg-card-select');
    const select = dlg.querySelector('#dlg-card-list');
    select.innerHTML = '<option disabled>Loading cards...</option>';
    dlg.dataset.device = deviceKey;
    dlg.dataset.action = actionName;
  
    fetchCardList(deviceKey).then(cards => {
      select.innerHTML = '';
      if (cards.length === 0) {
        select.innerHTML = '<option disabled>No cards available</option>';
      } else {
        cards.forEach(card => {
          const opt = document.createElement('option');
          opt.value = card;
          opt.textContent = card;
          select.appendChild(opt);
        });
      }
    });
  
    showDialog('dlg-card-select');
  }
  
  function openChequeSelect(deviceKey) {
    const dlg = document.getElementById('dlg-cheque-select');
    const select = dlg.querySelector('#dlg-cheque-list');
    const frontDiv = dlg.querySelector('#dlg-cheque-preview-front');
    const backDiv = dlg.querySelector('#dlg-cheque-preview-back');
    const codelineDiv = dlg.querySelector('#dlg-cheque-codeline');
    select.innerHTML = '<option disabled>Loading profiles...</option>';
    frontDiv.innerHTML = 'Loading...';
    backDiv.innerHTML = '';
    codelineDiv.innerHTML = '';
    dlg.dataset.device = deviceKey;
  
    fetchChequeProfiles(deviceKey).then(profiles => {
      select.innerHTML = '';
      if (profiles.length === 0) {
        select.innerHTML = '<option disabled>No profiles available</option>';
      } else {
        profiles.forEach(profile => {
          const opt = document.createElement('option');
          opt.value = profile.name;
          opt.textContent = profile.name;
          opt.dataset.front = profile.frontImage;
          opt.dataset.back = profile.backImage;
          opt.dataset.codeline = profile.codeLineData;
          select.appendChild(opt);
        });
        // show first profile preview
        if (select.options.length > 0) {
          select.selectedIndex = 0;
          updateChequePreview(select.options[0], frontDiv, backDiv, codelineDiv);
        }
      }
    });
  
    select.addEventListener('change', () => {
      const selected = select.selectedOptions[0];
      updateChequePreview(selected, frontDiv, backDiv, codelineDiv);
    });
  
    showDialog('dlg-cheque-select');
  }
  
  function updateChequePreview(option, frontDiv, backDiv, codelineDiv) {
    if (!option) return;
    const frontUrl = option.dataset.front;
    const backUrl = option.dataset.back;
    const code = option.dataset.codeline;
    if (frontUrl) {
      frontDiv.innerHTML = `<img src="${frontUrl}" style="max-width:100%; max-height:200px;">`;
    } else {
      frontDiv.innerHTML = 'No front image';
    }
    if (backUrl) {
      backDiv.innerHTML = `<img src="${backUrl}" style="max-width:100%; max-height:200px;">`;
    } else {
      backDiv.innerHTML = 'No back image';
    }
    codelineDiv.textContent = code || '';
  }
  
  function openCashSelect(deviceKey, actionName) {
    const dlg = document.getElementById('dlg-cash-select');
    const select = dlg.querySelector('#dlg-cash-list');
    const detailsDiv = dlg.querySelector('#dlg-cash-details');
    select.innerHTML = '<option disabled>Loading profiles...</option>';
    detailsDiv.innerHTML = 'Loading...';
    dlg.dataset.device = deviceKey;
    dlg.dataset.action = actionName;
  
    fetchCashProfiles(deviceKey).then(profiles => {
      select.innerHTML = '';
      if (profiles.length === 0) {
        select.innerHTML = '<option disabled>No profiles available</option>';
        detailsDiv.innerHTML = '<span style="color:#888;">No profiles</span>';
      } else {
        profiles.forEach(profile => {
          const opt = document.createElement('option');
          opt.value = profile.name;
          opt.textContent = profile.name;
          opt.dataset.details = JSON.stringify(profile.notes);
          select.appendChild(opt);
        });
        if (select.options.length > 0) {
          select.selectedIndex = 0;
          updateCashDetails(select.options[0], detailsDiv);
        }
      }
    });
  
    select.addEventListener('change', () => {
      const selected = select.selectedOptions[0];
      updateCashDetails(selected, detailsDiv);
    });
  
    showDialog('dlg-cash-select');
  }
  
  function updateCashDetails(option, detailsDiv) {
    if (!option) return;
    const notes = JSON.parse(option.dataset.details || '[]');
    if (notes.length === 0) {
      detailsDiv.innerHTML = '<span style="color:#888;">No note details</span>';
      return;
    }
    let html = '<table style="width:100%; border-collapse:collapse;">';
    html += '<tr><th>Currency</th><th>Denomination</th><th>Good</th><th>Suspect</th><th>Forged</th><th>Unrecognised</th></tr>';
    notes.forEach(n => {
      html += `<tr>
        <td>${n.currencyType || ''}</td>
        <td>${n.value || ''}</td>
        <td>${n.goodCount || '0'}</td>
        <td>${n.suspectCount || '0'}</td>
        <td>${n.forgedCount || '0'}</td>
        <td>${n.unrecognisedCount || '0'}</td>
      </tr>`;
    });
    html += '</table>';
    detailsDiv.innerHTML = html;
  }
  
  function openBarcodeSelect(deviceKey) {
    const dlg = document.getElementById('dlg-barcode-select');
    const select = dlg.querySelector('#dlg-barcode-list');
    select.innerHTML = '<option disabled>Loading barcodes...</option>';
    dlg.dataset.device = deviceKey;
  
    fetchBarcodeList(deviceKey).then(barcodes => {
      select.innerHTML = '';
      if (barcodes.length === 0) {
        select.innerHTML = '<option disabled>No barcodes available</option>';
      } else {
        barcodes.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b;
          opt.textContent = b;
          select.appendChild(opt);
        });
      }
    });
  
    showDialog('dlg-barcode-select');
  }

  /* ── Map display action label → backend action key ──────── */
  function toApiAction(label) {
    return label
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  /* ══════════════════════════════════════════════════════════
     BACKEND CALL
     ══════════════════════════════════════════════════════════ */
  async function callApi(deviceKey, action, params) {
    const url = `${API_BASE}/${encodeURIComponent(deviceKey)}/action`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params })
      });
      const json = await res.json().catch(() => ({ success: res.ok }));
      if (res.ok && json.success !== false) {
        showToast(`✓ ${action} executed successfully`, 'success');
      } else {
        showToast(`✗ ${action} failed: ${json.message || res.statusText}`, 'error');
      }
    } catch (err) {
      showToast(`✗ Cannot reach backend: ${err.message}`, 'error');
    }
  }

  /* ══════════════════════════════════════════════════════════
     DIALOG: Fault Creation  (FaultCreationForm.cs)
     ══════════════════════════════════════════════════════════ */
  function openFaultCreate(deviceKey, isDeviceSpecific) {
    const dlg = document.getElementById('dlg-fault-create');
    const cmdSel   = dlg.querySelector('#dlg-fc-command');
    const faultSel = dlg.querySelector('#dlg-fc-fault');
    const title    = dlg.querySelector('.dlg-title');

    title.textContent = `Create Fault — ${deviceKey}`;

    /* Populate commands */
    const cmds = DEVICE_COMMANDS[deviceKey] || [];
    populateSelect(cmdSel, cmds);

    /* Populate faults */
    const faults = isDeviceSpecific
      ? (DEVICE_SPECIFIC_CODES[deviceKey] || [])
      : GENERIC_RETURN_CODES;
    populateSelect(faultSel, faults);

    dlg.dataset.device = deviceKey;
    dlg.dataset.specific = isDeviceSpecific ? '1' : '0';
    showDialog('dlg-fault-create');
  }

  function bindFaultCreate() {
    const dlg  = document.getElementById('dlg-fault-create');
    const btn  = document.getElementById('dlg-fc-configure');
    btn.addEventListener('click', () => {
      const cmd   = dlg.querySelector('#dlg-fc-command').value;
      const fault = dlg.querySelector('#dlg-fc-fault').value;
      const statusRadio = dlg.querySelector('input[name="dlg-fc-status"]:checked');
      const deviceStatus = statusRadio ? statusRadio.value : null;

      if (!cmd || !fault) {
        showToast('Please select a command and a fault code.', 'warn');
        return;
      }
      const deviceKey = dlg.dataset.device;
      closeDialog('dlg-fault-create');
      callApi(deviceKey, 'createFault', {
        command: cmd,
        errorCode: fault,
        deviceStatus: deviceStatus
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     DIALOG: Set lpszExtra  (FormSetlpszExtra.cs)
     ══════════════════════════════════════════════════════════ */
  function openSetLpszExtra(deviceKey, subDevice, labelOverride) {
    const dlg = document.getElementById('dlg-set-lpszextra');
    dlg.querySelector('.dlg-title').textContent =
      `Set lpszExtra — ${deviceKey}${subDevice ? ' / ' + subDevice : ''}`;
    dlg.dataset.device = deviceKey;
    dlg.dataset.sub = subDevice || '';

    const lbl = dlg.querySelector('#dlg-se-lbl');
    if (labelOverride) lbl.textContent = labelOverride;
    else lbl.textContent = 'Value';

    dlg.querySelector('#dlg-se-status').value = '';
    dlg.querySelector('#dlg-se-cap').value = '';
    showDialog('dlg-set-lpszextra');
  }

  function bindSetLpszExtra() {
    const dlg = document.getElementById('dlg-set-lpszextra');
    dlg.querySelector('#dlg-se-add').addEventListener('click', () => {
      const status = dlg.querySelector('#dlg-se-status').value.trim();
      const cap    = dlg.querySelector('#dlg-se-cap').value.trim();
      if (!status && !cap) {
        showToast('Enter at least one value.', 'warn');
        return;
      }
      const deviceKey = dlg.dataset.device;
      const sub       = dlg.dataset.sub || null;
      closeDialog('dlg-set-lpszextra');
      callApi(deviceKey, 'setLpszExtra', { status, capability: cap, sub });
    });
  }

  /* ══════════════════════════════════════════════════════════
     DIALOG: Clear lpszExtra  (FormClearlpszExtra.cs)
     ══════════════════════════════════════════════════════════ */
  function openClearLpszExtra(deviceKey, subDevice) {
    const dlg = document.getElementById('dlg-clear-lpszextra');
    dlg.querySelector('.dlg-title').textContent =
      `Clear lpszExtra — ${deviceKey}${subDevice ? ' / ' + subDevice : ''}`;
    dlg.dataset.device = deviceKey;
    dlg.dataset.sub = subDevice || '';
    dlg.querySelector('#dlg-cl-status').checked   = false;
    dlg.querySelector('#dlg-cl-cap').checked      = false;
    showDialog('dlg-clear-lpszextra');
  }

  function bindClearLpszExtra() {
    const dlg = document.getElementById('dlg-clear-lpszextra');
    dlg.querySelector('#dlg-cl-clear').addEventListener('click', () => {
      const clearStatus = dlg.querySelector('#dlg-cl-status').checked;
      const clearCap    = dlg.querySelector('#dlg-cl-cap').checked;
      if (!clearStatus && !clearCap) {
        showToast('Select at least one option.', 'warn');
        return;
      }
      const deviceKey = dlg.dataset.device;
      const sub       = dlg.dataset.sub || null;
      closeDialog('dlg-clear-lpszextra');
      callApi(deviceKey, 'clearLpszExtra', { clearStatus, clearCapability: clearCap, sub });
    });
  }

  /* ══════════════════════════════════════════════════════════
     DIALOG: Set Delay  (FormDelay.cs)
     ══════════════════════════════════════════════════════════ */
  function openDelay(deviceKey) {
    const dlg = document.getElementById('dlg-delay');
    dlg.dataset.device = deviceKey;
    dlg.querySelector('#dlg-delay-ms').value = '';
    showDialog('dlg-delay');
  }

  function bindDelay() {
    const dlg = document.getElementById('dlg-delay');
    dlg.querySelector('#dlg-delay-ok').addEventListener('click', () => {
      const ms = dlg.querySelector('#dlg-delay-ms').value.trim();
      if (!ms || isNaN(Number(ms))) {
        showToast('Enter a numeric delay in milliseconds.', 'warn');
        return;
      }
      const deviceKey = dlg.dataset.device;
      closeDialog('dlg-delay');
      callApi(deviceKey, 'setDelay', { delayMs: Number(ms) });
    });
    dlg.querySelector('#dlg-delay-cancel').addEventListener('click', () =>
      closeDialog('dlg-delay'));
  }

  /* ══════════════════════════════════════════════════════════
     DIALOG: Position/Shutter/Transport  (PositionFaultsForm.cs)
     ══════════════════════════════════════════════════════════ */
  const POSITION_OPTIONS = ['INFRONT', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'CENTER', 'NOTSUPP', 'UNKNOWN'];
  const SHUTTER_OPTIONS  = ['CLOSED', 'OPEN', 'JAMMED', 'UNKNOWN', 'NOTSUPPORTED'];
  const TRANSPORT_OPTIONS = ['OK', 'INOP', 'UNKNOWN', 'NOTSUPPORTED'];
  const TRANSPORT_STATUS_OPTIONS = ['EMPTY', 'NOTEMPTY', 'NOTEMPTYCUST', 'NOTEMPTY_UNK', 'NOTSUPPORTED'];
  const POS_STATUS_OPTIONS = ['EMPTY', 'NOTEMPTY', 'UNKNOWN', 'NOTSUPPORTED'];

  function openPosition(deviceKey, mode) {
    const dlg = document.getElementById('dlg-position');
    const posSel    = dlg.querySelector('#dlg-pos-position');
    const statusSel = dlg.querySelector('#dlg-pos-status');
    const heading   = dlg.querySelector('#dlg-pos-status-lbl');

    dlg.dataset.device = deviceKey;
    dlg.dataset.mode   = mode;

    /* Position list is always the device-specific positions */
    populateSelect(posSel, POSITION_OPTIONS);

    if (mode === 'shutter') {
      heading.textContent = 'Shutter';
      dlg.querySelector('.dlg-title').textContent = `Change Shutter — ${deviceKey}`;
      populateSelect(statusSel, SHUTTER_OPTIONS);
    } else if (mode === 'transport') {
      heading.textContent = 'Transport';
      dlg.querySelector('.dlg-title').textContent = `Change Transport — ${deviceKey}`;
      populateSelect(statusSel, TRANSPORT_OPTIONS);
    } else if (mode === 'transportStatus') {
      heading.textContent = 'Transport Status';
      dlg.querySelector('.dlg-title').textContent = `Change Transport Status — ${deviceKey}`;
      populateSelect(statusSel, TRANSPORT_STATUS_OPTIONS);
    } else {
      heading.textContent = 'Position Status';
      dlg.querySelector('.dlg-title').textContent = `Change Position Status — ${deviceKey}`;
      populateSelect(statusSel, POS_STATUS_OPTIONS);
    }

    showDialog('dlg-position');
  }

  function bindPosition() {
    const dlg = document.getElementById('dlg-position');
    dlg.querySelector('#dlg-pos-set').addEventListener('click', () => {
      const pos    = dlg.querySelector('#dlg-pos-position').value;
      const status = dlg.querySelector('#dlg-pos-status').value;
      if (!pos || !status) {
        showToast('Select both position and status.', 'warn');
        return;
      }
      const deviceKey = dlg.dataset.device;
      const mode      = dlg.dataset.mode;
      const actionMap = {
        shutter:         'setShutterPosition',
        transport:       'setTransportPosition',
        transportStatus: 'setTransportPositionStatus',
        positionStatus:  'setPositionStatus'
      };
      closeDialog('dlg-position');
      callApi(deviceKey, actionMap[mode] || 'setPosition', { position: pos, status });
    });
  }

  /* ══════════════════════════════════════════════════════════
     DIALOG: Simple confirmation  (#dlg-simple-action)
     ══════════════════════════════════════════════════════════ */
  let _pendingConfirmCallback = null;

  function confirmAndSend(htmlMessage, callback) {
    const dlg = document.getElementById('dlg-simple-action');
    dlg.querySelector('.dlg-body-msg').innerHTML = htmlMessage;
    _pendingConfirmCallback = callback;
    showDialog('dlg-simple-action');
  }

  function bindSimpleAction() {
    const dlg = document.getElementById('dlg-simple-action');
    dlg.querySelector('#dlg-sa-ok').addEventListener('click', () => {
      closeDialog('dlg-simple-action');
      if (typeof _pendingConfirmCallback === 'function') _pendingConfirmCallback();
      _pendingConfirmCallback = null;
    });
    dlg.querySelector('#dlg-sa-cancel').addEventListener('click', () => {
      closeDialog('dlg-simple-action');
      _pendingConfirmCallback = null;
    });
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════ */
  function populateSelect(selectEl, options) {
    selectEl.innerHTML = '';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      selectEl.appendChild(o);
    });
  }

  function showDialog(id) {
    document.getElementById('dlg-overlay').style.display = 'flex';
    document.querySelectorAll('.dlg-box').forEach(b => b.style.display = 'none');
    const box = document.getElementById(id);
    if (box) box.style.display = 'flex';
  }

  function closeDialog(id) {
    document.getElementById('dlg-overlay').style.display = 'none';
    const box = document.getElementById(id);
    if (box) box.style.display = 'none';
  }

  function showToast(message, type) {
    const t = document.createElement('div');
    t.className = `atm-toast atm-toast-${type || 'info'}`;
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 350); }, 2800);
  }

  /* ══════════════════════════════════════════════════════════
     CLOSE OVERLAY ON BACKDROP CLICK
     ══════════════════════════════════════════════════════════ */
  function bindOverlay() {
    document.getElementById('dlg-overlay').addEventListener('mousedown', (e) => {
      if (e.target.id === 'dlg-overlay') {
        document.getElementById('dlg-overlay').style.display = 'none';
        document.querySelectorAll('.dlg-box').forEach(b => b.style.display = 'none');
        _pendingConfirmCallback = null;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('dlg-overlay').style.display = 'none';
        document.querySelectorAll('.dlg-box').forEach(b => b.style.display = 'none');
        _pendingConfirmCallback = null;
      }
    });
  }


  /* ── Fetch card list from backend ── */
async function fetchCardList(deviceKey) {
  const url = `${API_BASE}/${encodeURIComponent(deviceKey)}/cards`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.cards || [];
    }
  } catch (err) {
    console.warn(`Failed to fetch cards for ${deviceKey}`);
  }
  return [];
}

/* ── Fetch cheque profiles (with images and codeline) ── */
async function fetchChequeProfiles(deviceKey) {
  const url = `${API_BASE}/${encodeURIComponent(deviceKey)}/cheque-profiles`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.profiles || [];
    }
  } catch (err) {
    console.warn(`Failed to fetch cheque profiles for ${deviceKey}`);
  }
  return [];
}

/* ── Fetch cash/coin profiles (with note details) ── */
async function fetchCashProfiles(deviceKey) {
  const url = `${API_BASE}/${encodeURIComponent(deviceKey)}/cash-profiles`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.profiles || [];
    }
  } catch (err) {
    console.warn(`Failed to fetch cash profiles for ${deviceKey}`);
  }
  return [];
}

/* ── Fetch barcode list ── */
async function fetchBarcodeList(deviceKey) {
  const url = `${API_BASE}/${encodeURIComponent(deviceKey)}/barcodes`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.barcodes || [];
    }
  } catch (err) {
    console.warn(`Failed to fetch barcodes for ${deviceKey}`);
  }
  return [];
}

  /* ══════════════════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════════════════ */
  function init() {
    bindFaultCreate();
    bindSetLpszExtra();
    bindClearLpszExtra();
    bindDelay();
    bindPosition();
    bindSimpleAction();
    bindOverlay();
    /* Wire all X (close) buttons */
    document.querySelectorAll('.dlg-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const box = btn.closest('.dlg-box');
        if (box) { box.style.display = 'none'; }
        document.getElementById('dlg-overlay').style.display = 'none';
        _pendingConfirmCallback = null;
      });
    });
  }

  // Card selection dialog
  const cardDlg = document.getElementById('dlg-card-select');
  cardDlg.querySelector('#dlg-card-insert').addEventListener('click', () => {
    const select = cardDlg.querySelector('#dlg-card-list');
    const card = select.value;
    if (!card || card === 'No cards available') {
      showToast('Please select a card.', 'warn');
      return;
    }
    const deviceKey = cardDlg.dataset.device;
    const action = cardDlg.dataset.action; // 'insert_card' or 'tap_card'
    closeDialog('dlg-card-select');
    callApi(deviceKey, action, { card });
  });

  // Cheque selection dialog
  const chequeDlg = document.getElementById('dlg-cheque-select');
  chequeDlg.querySelector('#dlg-cheque-insert').addEventListener('click', () => {
    const select = chequeDlg.querySelector('#dlg-cheque-list');
    const profile = select.value;
    if (!profile || profile === 'No profiles available') {
      showToast('Please select a cheque profile.', 'warn');
      return;
    }
    const deviceKey = chequeDlg.dataset.device;
    closeDialog('dlg-cheque-select');
    callApi(deviceKey, 'insert_cheque', { profile });
  });

  // Cash/Coin selection dialog
  const cashDlg = document.getElementById('dlg-cash-select');
  cashDlg.querySelector('#dlg-cash-insert').addEventListener('click', () => {
    const select = cashDlg.querySelector('#dlg-cash-list');
    const profile = select.value;
    if (!profile || profile === 'No profiles available') {
      showToast('Please select a profile.', 'warn');
      return;
    }
    const deviceKey = cashDlg.dataset.device;
    const action = cashDlg.dataset.action; // 'insert_cash' or 'insert_coin'
    closeDialog('dlg-cash-select');
    callApi(deviceKey, action, { profile });
  });

  // Barcode selection dialog
  const barcodeDlg = document.getElementById('dlg-barcode-select');
  barcodeDlg.querySelector('#dlg-barcode-select-btn').addEventListener('click', () => {
    const select = barcodeDlg.querySelector('#dlg-barcode-list');
    const barcode = select.value;
    if (!barcode || barcode === 'No barcodes available') {
      showToast('Please select a barcode.', 'warn');
      return;
    }
    const deviceKey = barcodeDlg.dataset.device;
    closeDialog('dlg-barcode-select');
    callApi(deviceKey, 'select_barcode', { barcode });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();