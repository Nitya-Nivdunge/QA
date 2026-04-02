const path = require('path');
const fs = require('fs/promises');
const { app, BrowserWindow, ipcMain, screen } = require('electron');

function getDeviceMapPath() {
	return path.join(__dirname, '..', 'DeviceMap.json');
}

async function loadDeviceConfig() {
	try {
		const deviceMapPath = getDeviceMapPath();
		const raw = await fs.readFile(deviceMapPath, 'utf8');
		const parsed = JSON.parse(raw);
		const simulatorList = parsed?.SimulatorList || {};
		const vendor = simulatorList?.Vendor || 'Unknown';
		const devices = Array.isArray(simulatorList?.DeviceArray) ? simulatorList.DeviceArray : [];
		const xfsDevices = devices.filter((device) => device?.DeviceType === 'XFS');
		return { xfsDevices, vendor };
	} catch (error) {
		return {
			xfsDevices: [],
			vendor: 'Unknown',
			error: `Unable to load DeviceMap.json: ${error.message}`,
		};
	}
}

function createWindow() {
	const { workAreaSize } = screen.getPrimaryDisplay();

	const mainWindow = new BrowserWindow({
		x: 0,
		y: 0,
		// Start at full work area so layout.js sees the correct viewport on load
		width:  workAreaSize.width,
		height: workAreaSize.height,
		resizable: true,
		frame: false,
		autoHideMenuBar: true,
		fullscreenable: true,
		transparent: true,
		backgroundColor: '#00000000',
		hasShadow: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	// Maximize to fill the full work area immediately on open
	mainWindow.maximize();
	mainWindow.setIgnoreMouseEvents(false);
	mainWindow.setMenuBarVisibility(false);

	ipcMain.on('atm:ignore-mouse', (_event, ignore) => {
		mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
	});

	mainWindow.webContents.on('before-input-event', (event, input) => {
		if (input.type !== 'keyDown') return;
		if (input.key === 'F11') {
			event.preventDefault();
			mainWindow.setFullScreen(!mainWindow.isFullScreen());
		}
		if (input.key === 'Escape' && mainWindow.isFullScreen()) {
			event.preventDefault();
			mainWindow.setFullScreen(false);
		}
	});

	mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('atm:get-device-config', async () => loadDeviceConfig());

app.whenReady().then(() => {
	createWindow();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});