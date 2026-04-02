const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('atmApi', {
  getDeviceConfig: async () => ipcRenderer.invoke('atm:get-device-config'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('atm:ignore-mouse', ignore),
});