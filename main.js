const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      partition: 'persist:meetalarm', // ★ 추가 1: 로컬 스토리지를 하드디스크에 영구 보존
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'MeetAlarm',
    backgroundColor: '#f4f5f7',
    show: false
  });

  // 앱 로드
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 로딩 완료 후 표시 (흰 화면 방지)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 외부 링크는 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// OS 알림
ipcMain.on('send-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'icon.png') }).show();
  }
});

// 외부 링크 열기
ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// Slack Webhook 호출
ipcMain.handle('slack-webhook', async (event, { webhookUrl, text }) => {
  try {
    const https = require('https');
    const url = new URL(webhookUrl);
    const body = JSON.stringify({ text });
    return await new Promise((resolve) => {
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res) => resolve(res.statusCode));
      req.write(body);
      req.end();
    });
  } catch (e) { return 500; }
});

// ★ 추가 2: 윈도우 OS에 앱 고유 ID를 각인시켜 영구 저장소 경로를 확실히 고정
app.setAppUserModelId('com.meetalarm.app'); 

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});