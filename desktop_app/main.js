const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');
const net = require('net');

let backendProcess;
let frontendProcess;
let mainWindow;
let isQuitting = false;

// ── Kill specific PIDs on a port ──
function killByPort(port) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve();

    exec(`netstat -ano | findstr LISTENING | findstr :${port}`, (err, stdout) => {
      if (!stdout || !stdout.trim()) {
        console.log(`Port ${port}: already free.`);
        return resolve();
      }

      const pids = new Set();
      for (const line of stdout.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        const addr = parts[1] || '';
        const pid = parts[parts.length - 1];
        if (addr.endsWith(`:${port}`) && pid && pid !== '0') {
          pids.add(pid);
        }
      }

      if (pids.size === 0) return resolve();

      console.log(`Port ${port} busy — killing PIDs: ${[...pids].join(', ')}`);
      let done = 0;
      for (const pid of pids) {
        exec(`taskkill /PID ${pid} /F /T`, () => {
          done++;
          if (done === pids.size) resolve();
        });
      }
    });
  });
}

// ── Wait until TCP port is actually free ──
function waitForPortFree(port, retries = 15) {
  return new Promise((resolve) => {
    const check = (remaining) => {
      if (remaining <= 0) {
        console.log(`Port ${port} timeout — continuing anyway.`);
        return resolve();
      }
      const tester = net.createServer();
      tester.once('error', () => {
        console.log(`Port ${port} still occupied (${remaining} retries left)...`);
        setTimeout(() => check(remaining - 1), 1000);
      });
      tester.once('listening', () => {
        tester.close(() => {
          console.log(`Port ${port} is now free.`);
          resolve();
        });
      });
      tester.listen(port, '127.0.0.1');
    };
    check(retries);
  });
}

// ── Kill ports then wait for them to be free ──
async function prepareports() {
  console.log('Checking ports 3000 and 8000...');
  await Promise.all([killByPort(3000), killByPort(8000)]);
  console.log('Waiting for ports to be fully released...');
  await Promise.all([waitForPortFree(3000), waitForPortFree(8000)]);
}

// ── Start Backend + Frontend ──
function startServers() {
  const rootDir = path.join(__dirname, '..');
  const backendDir = path.join(rootDir, 'backend');
  const frontendDir = path.join(rootDir, 'frontend');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const pythonExe = path.join(backendDir, 'venv', 'Scripts', 'python.exe');

  // Backend — no --reload, single clean process
  backendProcess = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    { cwd: backendDir, windowsHide: true }
  );
  backendProcess.stdout.on('data', (d) => console.log(`Backend: ${d.toString().trim()}`));
  backendProcess.stderr.on('data', (d) => console.error(`Backend Err: ${d.toString().trim()}`));
  backendProcess.on('error', (e) => console.error('Backend failed:', e));
  backendProcess.on('close', (code) => console.log(`Backend exited: ${code}`));

  // Frontend
  frontendProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: frontendDir,
    windowsHide: true,
    shell: true
  });
  frontendProcess.stdout.on('data', (d) => console.log(`Frontend: ${d.toString().trim()}`));
  frontendProcess.stderr.on('data', (d) => console.error(`Frontend Err: ${d.toString().trim()}`));
  frontendProcess.on('error', (e) => console.error('Frontend failed:', e));
  frontendProcess.on('close', (code) => console.log(`Frontend exited: ${code}`));
}

// ── Poll until localhost:3000 responds ──
function waitForFrontend(win) {
  http.get('http://localhost:3000', (res) => {
    res.resume();
    win.loadURL('http://localhost:3000');
  }).on('error', () => {
    setTimeout(() => waitForFrontend(win), 1000);
  });
}

// ── Show Save dialog and download PDF ──
function handlePdfDownload(url) {
  let suggestedName = 'report.pdf';
  try {
    const urlObj = new URL(url);
    const nameParam = urlObj.searchParams.get('name');
    if (nameParam) suggestedName = nameParam;
  } catch (e) {}

  dialog.showSaveDialog(mainWindow, {
    title: 'Save PDF',
    defaultPath: path.join(app.getPath('downloads'), suggestedName),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  }).then(({ canceled, filePath }) => {
    if (canceled || !filePath) return;

    mainWindow.webContents.session.once('will-download', (event, item) => {
      item.setSavePath(filePath);
      item.once('done', (e, state) => {
        if (state === 'completed') {
          console.log('PDF saved:', filePath);
          shell.showItemInFolder(filePath);
        } else {
          console.error('Download failed:', state);
        }
      });
    });

    mainWindow.webContents.downloadURL(url);
  });
}

// ── Create the ONE main window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    title: 'জীবন জিজ্ঞাসা',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.center();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/api/download-pdf/') || url.includes('.pdf')) {
      handlePdfDownload(url);
    }
    return { action: 'deny' };
  });

  waitForFrontend(mainWindow);
}

// ── Kill both servers on exit ──
function cleanup() {
  if (isQuitting) return;
  isQuitting = true;
  console.log('Shutting down servers...');

  if (process.platform === 'win32') {
    if (backendProcess?.pid) exec(`taskkill /PID ${backendProcess.pid} /F /T`);
    if (frontendProcess?.pid) exec(`taskkill /PID ${frontendProcess.pid} /F /T`);
    exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr LISTENING ^| findstr :8000') do @taskkill /PID %a /F /T 2>nul`);
    exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr LISTENING ^| findstr :3000') do @taskkill /PID %a /F /T 2>nul`);
  } else {
    backendProcess?.kill('SIGTERM');
    frontendProcess?.kill('SIGTERM');
  }
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  await prepareports();
  console.log('Starting servers...');
  startServers();
  createWindow();
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/api/download-pdf/') || url.includes('.pdf')) {
      handlePdfDownload(url);
    }
    return { action: 'deny' };
  });
});

app.on('before-quit', cleanup);
app.on('will-quit', cleanup);
app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});