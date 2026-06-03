const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Default database structure
const DEFAULT_PASSWORD = 'admin'; // Default password if none set
const initDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, salt);
    const initialDb = {
      passwordHash: hashedPassword,
      files: [],
      shares: [],
      settings: {
        gridColumns: 7
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  }
};
initDb();

// Database helpers
const readDb = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { passwordHash: '', files: [], shares: [], settings: { gridColumns: 7 } };
  }
};

const writeDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const ensureSettings = (db) => {
  if (!db.settings || typeof db.settings !== 'object') {
    db.settings = { gridColumns: 7 };
  }
  if (typeof db.settings.gridColumns !== 'number') {
    db.settings.gridColumns = 7;
  }
  return db;
};

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('bagikan-secret-key-12345'));
app.use(express.static(path.join(__dirname, 'public')));

// Simple custom cookie-based session auth
const AUTH_COOKIE_NAME = 'bagikan_session';
const sessionStore = new Set(); // Simple in-memory session token store

const requireAuth = (req, res, next) => {
  const token = req.cookies[AUTH_COOKIE_NAME];
  if (token && sessionStore.has(token)) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
  }
};

app.get('/api/settings', requireAuth, (req, res) => {
  const db = ensureSettings(readDb());
  writeDb(db);
  res.json({ settings: db.settings });
});

app.put('/api/settings', requireAuth, (req, res) => {
  const { gridColumns } = req.body;
  const parsed = parseInt(gridColumns, 10);
  if (Number.isNaN(parsed) || parsed < 7 || parsed > 15) {
    return res.status(400).json({ error: 'Jumlah kolom grid tidak valid.' });
  }

  const db = ensureSettings(readDb());
  db.settings.gridColumns = parsed;
  writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Save with unique id but keep track of extension to keep it clean
    const ext = path.extname(file.originalname);
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}${ext}`);
  }
});
const upload = multer({ storage });

// API: Auth Login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password wajib diisi.' });
  }

  const db = readDb();
  if (bcrypt.compareSync(password, db.passwordHash)) {
    const token = uuidv4();
    sessionStore.add(token);
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    return res.json({ success: true, message: 'Login berhasil!' });
  } else {
    return res.status(401).json({ error: 'Password salah!' });
  }
});

// API: Auth Check
app.get('/api/auth/check', (req, res) => {
  const token = req.cookies[AUTH_COOKIE_NAME];
  if (token && sessionStore.has(token)) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// API: Auth Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies[AUTH_COOKIE_NAME];
  if (token) {
    sessionStore.delete(token);
  }
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
});

// API: Auth Change Password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
  }

  const db = readDb();
  if (!bcrypt.compareSync(oldPassword, db.passwordHash)) {
    return res.status(400).json({ error: 'Password lama salah!' });
  }

  const salt = bcrypt.genSaltSync(10);
  db.passwordHash = bcrypt.hashSync(newPassword, salt);
  writeDb(db);
  res.json({ success: true, message: 'Password berhasil diubah!' });
});

// API: Get Files & Folders
app.get('/api/files', requireAuth, (req, res) => {
  const parentId = req.query.parentId || null;
  const search = req.query.search || '';
  const allFolders = req.query.allFolders === '1';

  const db = readDb();
  let files = db.files.filter(f => !f.isDeleted);

  if (allFolders) {
    files = files.filter(f => f.isFolder);
  } else if (search) {
    files = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  } else {
    files = files.filter(f => f.parentId === parentId);
  }

  const activeShares = db.shares.filter(s => !s.isExpired);
  const activeSharesFileIds = new Set(activeShares.map(s => s.fileId));
  const activeShareByFileId = new Map(activeShares.map(s => [s.fileId, s]));
  const filesWithShareFlags = files.map(f => ({
    ...f,
    isShared: activeSharesFileIds.has(f.id),
    sharedShortlink: activeShareByFileId.get(f.id)?.shortlink || ''
  }));

  res.json({ files: filesWithShareFlags });
});

// API: Toggle Pin status of File/Folder
app.post('/api/files/:id/pin', requireAuth, (req, res) => {
  const db = readDb();
  const fileIndex = db.files.findIndex(f => f.id === req.params.id && !f.isDeleted);
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File atau folder tidak ditemukan.' });
  }

  db.files[fileIndex].pinned = !db.files[fileIndex].pinned;
  writeDb(db);
  res.json(db.files[fileIndex]);
});

// API: Toggle/Delete share links (cancel share)
app.delete('/api/share/:fileId', requireAuth, (req, res) => {
  const db = readDb();
  const initialCount = db.shares.length;
  // Filter out any active shares for this file/folder
  db.shares = db.shares.filter(s => s.fileId !== req.params.fileId);
  
  if (db.shares.length < initialCount) {
    writeDb(db);
    return res.json({ success: true, message: 'Akses berbagi berhasil dibatalkan!' });
  } else {
    return res.status(404).json({ error: 'Item ini belum pernah dibagikan.' });
  }
});

// API: Create Folder
app.post('/api/files/folder', requireAuth, (req, res) => {
  const { name, parentId } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nama folder tidak boleh kosong.' });
  }

  const db = readDb();
  const newFolder = {
    id: uuidv4(),
    name: name.trim(),
    type: 'folder',
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
    isFolder: true,
    pinned: false
  };

  db.files.push(newFolder);
  writeDb(db);
  res.json(newFolder);
});

// API: Create New Note (.txt)
app.post('/api/files/note', requireAuth, (req, res) => {
  const { name, content, parentId } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nama file tidak boleh kosong.' });
  }

  const fileName = name.endsWith('.txt') ? name : `${name}.txt`;
  const fileId = uuidv4();
  const storageName = `${fileId}.txt`;
  const filePath = path.join(UPLOADS_DIR, storageName);

  fs.writeFileSync(filePath, content || '', 'utf8');

  const db = readDb();
  const newFile = {
    id: fileId,
    name: fileName,
    type: 'text/plain',
    size: Buffer.byteLength(content || ''),
    storagePath: storageName,
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
    isFolder: false,
    temporary: false,
    expiryTime: null,
    pinned: false
  };

  db.files.push(newFile);
  writeDb(db);
  res.json(newFile);
});

// API: Upload Files (supports Drag-Drop & Multiple)
app.post('/api/files/upload', requireAuth, upload.array('files'), (req, res) => {
  const parentId = req.body.parentId || null;
  const tempMode = req.body.tempMode; // duration in minutes: 3, 5, 30, 60
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Tidak ada file yang diupload.' });
  }

  const db = readDb();
  const uploadedFiles = [];
  const relativePath = req.body.relativePath || null;

  let expiryTime = null;
  if (tempMode && tempMode !== 'permanent') {
    const minutes = parseInt(tempMode);
    if (!isNaN(minutes)) {
      expiryTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    }
  }

  req.files.forEach(file => {
    const newFile = {
      id: path.basename(file.filename, path.extname(file.filename)),
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      storagePath: file.filename,
      originalRelativePath: relativePath && relativePath !== file.originalname ? relativePath : null,
      parentId: parentId === 'null' ? null : (parentId || null),
      createdAt: new Date().toISOString(),
      isFolder: false,
      temporary: expiryTime !== null,
      expiryTime: expiryTime,
      pinned: false
    };
    db.files.push(newFile);
    uploadedFiles.push(newFile);
  });

  writeDb(db);
  res.json({ success: true, files: uploadedFiles });
});

// API: Rename File/Folder
app.put('/api/files/:id', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nama baru wajib diisi.' });
  }

  const db = readDb();
  const fileIndex = db.files.findIndex(f => f.id === req.params.id && !f.isDeleted);
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File atau folder tidak ditemukan.' });
  }

  let finalName = name.trim();
  // Ensure .txt is preserved if renamed text note
  if (!db.files[fileIndex].isFolder && db.files[fileIndex].type === 'text/plain' && !finalName.endsWith('.txt')) {
    finalName += '.txt';
  }

  db.files[fileIndex].name = finalName;
  writeDb(db);
  res.json(db.files[fileIndex]);
});

// Helper function to recursively delete items from DB and disk
const deleteItem = (db, itemId) => {
  const item = db.files.find(f => f.id === itemId);
  if (!item) return;

  item.isDeleted = true;

  if (item.isFolder) {
    // Find all children
    const children = db.files.filter(f => f.parentId === itemId && !f.isDeleted);
    children.forEach(child => {
      deleteItem(db, child.id);
    });
  } else {
    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, item.storagePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Gagal menghapus file ${filePath}:`, err);
      }
    }
  }
};

// API: Delete File/Folder
app.delete('/api/files/:id', requireAuth, (req, res) => {
  const db = readDb();
  const item = db.files.find(f => f.id === req.params.id && !f.isDeleted);
  if (!item) {
    return res.status(404).json({ error: 'File atau folder tidak ditemukan.' });
  }

  deleteItem(db, item.id);
  writeDb(db);
  res.json({ success: true, message: 'Berhasil dihapus!' });
});

app.post('/api/files/bulk-delete', requireAuth, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Tidak ada item terpilih.' });
  }

  const db = readDb();
  const deletedIds = [];
  const failedIds = [];

  ids.forEach(id => {
    const item = db.files.find(f => f.id === id && !f.isDeleted);
    if (!item) {
      failedIds.push(id);
      return;
    }
    deleteItem(db, item.id);
    deletedIds.push(id);
  });

  writeDb(db);
  res.json({ success: true, deletedIds, failedIds });
});

const isDescendantFolder = (db, folderId, maybeDescendantId) => {
  let current = db.files.find(f => f.id === maybeDescendantId && !f.isDeleted);
  let limit = 100;

  while (current && current.parentId && limit > 0) {
    if (current.parentId === folderId) return true;
    current = db.files.find(f => f.id === current.parentId && !f.isDeleted);
    limit -= 1;
  }

  return false;
};

app.post('/api/files/bulk-move', requireAuth, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const targetParentId = req.body.targetParentId === '' || req.body.targetParentId === null || req.body.targetParentId === undefined || req.body.targetParentId === 'null'
    ? null
    : req.body.targetParentId;

  if (ids.length === 0) {
    return res.status(400).json({ error: 'Tidak ada item terpilih.' });
  }

  const db = readDb();
  if (targetParentId) {
    const targetFolder = db.files.find(f => f.id === targetParentId && !f.isDeleted && f.isFolder);
    if (!targetFolder) {
      return res.status(404).json({ error: 'Folder tujuan tidak ditemukan.' });
    }
  }

  const movedIds = [];
  const failedIds = [];

  ids.forEach(id => {
    const item = db.files.find(f => f.id === id && !f.isDeleted);
    if (!item) {
      failedIds.push(id);
      return;
    }

    if (item.id === targetParentId) {
      failedIds.push(id);
      return;
    }

    if (item.isFolder && targetParentId && isDescendantFolder(db, item.id, targetParentId)) {
      failedIds.push(id);
      return;
    }

    item.parentId = targetParentId;
    movedIds.push(id);
  });

  writeDb(db);
  res.json({ success: true, movedIds, failedIds });
});

// API: Download File (Authenticated)
app.get('/api/files/:id/download', requireAuth, (req, res) => {
  const db = readDb();
  const fileInfo = db.files.find(f => f.id === req.params.id && !f.isFolder && !f.isDeleted);
  if (!fileInfo) {
    return res.status(404).json({ error: 'File tidak ditemukan.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileInfo.storagePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File di disk tidak ditemukan.' });
  }

  res.download(filePath, fileInfo.name);
});

// API: Inline Preview File (Authenticated)
app.get('/api/files/:id/view', requireAuth, (req, res) => {
  const db = readDb();
  const fileInfo = db.files.find(f => f.id === req.params.id && !f.isDeleted && !f.isFolder);
  if (!fileInfo) {
    return res.status(404).json({ error: 'File tidak ditemukan.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileInfo.storagePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File di disk tidak ditemukan.' });
  }

  res.setHeader('Content-Type', fileInfo.type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.name)}"`);
  fs.createReadStream(filePath).pipe(res);
});

// API: Read Text Note Content
app.get('/api/files/:id/content', requireAuth, (req, res) => {
  const db = readDb();
  const fileInfo = db.files.find(f => f.id === req.params.id && !f.isFolder && !f.isDeleted && f.type === 'text/plain');
  if (!fileInfo) {
    return res.status(404).json({ error: 'File catatan tidak ditemukan.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileInfo.storagePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File di disk tidak ditemukan.' });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ content });
});

// API: Update Text Note Content
app.put('/api/files/:id/content', requireAuth, (req, res) => {
  const { content } = req.body;
  const db = readDb();
  const fileInfo = db.files.find(f => f.id === req.params.id && !f.isFolder && !f.isDeleted && f.type === 'text/plain');
  if (!fileInfo) {
    return res.status(404).json({ error: 'File catatan tidak ditemukan.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileInfo.storagePath);
  fs.writeFileSync(filePath, content || '', 'utf8');

  // Update size in DB
  fileInfo.size = Buffer.byteLength(content || '');
  writeDb(db);

  res.json({ success: true, file: fileInfo });
});

// API: Create Share Link
app.post('/api/share', requireAuth, (req, res) => {
  const { fileId, customShortlink, password, expiryMinutes, existingShortlink } = req.body;

  const db = readDb();
  const fileInfo = db.files.find(f => f.id === fileId && !f.isDeleted);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Item yang akan dibagikan tidak ditemukan.' });
  }

  const currentShare = db.shares.find(s => s.fileId === fileId && !s.isExpired);
  const currentShortlink = currentShare?.shortlink || '';

  // Generate or validate shortlink
  let shortlink = customShortlink ? customShortlink.trim().toLowerCase() : '';
  const isUpdatingExistingShare = Boolean(existingShortlink || currentShare);
  const shareShortlinkToKeep = existingShortlink ? existingShortlink.trim().toLowerCase() : currentShortlink;
  
  if (shortlink) {
    // Check regex to prevent bad characters in shortlink
    if (!/^[a-z0-9-_]+$/.test(shortlink)) {
      return res.status(400).json({ error: 'Shortlink kustom hanya boleh berisi huruf, angka, strip (-), dan underscore (_).' });
    }
    // Check if shortlink already exists on another active share
    const exists = db.shares.some(s => s.shortlink === shortlink && !s.isExpired && s.fileId !== fileId);
    if (exists) {
      return res.status(400).json({ error: 'Shortlink kustom sudah digunakan. Silakan gunakan nama lain.' });
    }
  } else if (shareShortlinkToKeep) {
    shortlink = shareShortlinkToKeep;
  } else {
    // Generate a random 6 char code
    do {
      shortlink = Math.random().toString(36).substring(2, 8);
    } while (db.shares.some(s => s.shortlink === shortlink));
  }

  let hashedPassword = null;
  if (password && password.trim() !== '') {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(password, salt);
  }

  let expiryTime = null;
  if (expiryMinutes) {
    const minutes = parseInt(expiryMinutes);
    if (!isNaN(minutes)) {
      expiryTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    }
  }

  // Clean old share for this file first
  db.shares = db.shares.filter(s => s.fileId !== fileId);

  const newShare = {
    id: uuidv4(),
    fileId,
    shortlink,
    passwordHash: hashedPassword,
    hasPassword: hashedPassword !== null,
    expiryTime,
    createdAt: new Date().toISOString(),
    downloadsCount: 0
  };

  db.shares.push(newShare);
  writeDb(db);

  res.json({
    success: true,
    shortlink,
    hasPassword: newShare.hasPassword,
    expiryTime
  });
});

// PUBLIC API: Get Share Information (No password required at first, just metadata)
app.get('/api/public/share/:shortlink', (req, res) => {
  const db = readDb();
  const share = db.shares.find(s => s.shortlink === req.params.shortlink.toLowerCase());

  if (!share) {
    return res.status(404).json({ error: 'Link tautkan tidak ditemukan.' });
  }

  // Check expiry
  if (share.expiryTime && new Date() > new Date(share.expiryTime)) {
    share.isExpired = true;
    writeDb(db);
    return res.status(410).json({ error: 'Link ini sudah kedaluwarsa!' });
  }

  const fileInfo = db.files.find(f => f.id === share.fileId && !f.isDeleted);
  if (!fileInfo) {
    return res.status(404).json({ error: 'File atau folder yang dibagikan sudah tidak ada.' });
  }

  // Return public metadata (do not send the real password hash!)
  res.json({
    shortlink: share.shortlink,
    name: fileInfo.name,
    isFolder: fileInfo.isFolder,
    size: fileInfo.size,
    type: fileInfo.type,
    hasPassword: share.hasPassword,
    expiryTime: share.expiryTime
  });
});

// PUBLIC API: Download Share Link (Requires verification if password protected)
app.post('/api/public/share/:shortlink/download', (req, res) => {
  const { password, subFileId } = req.body;
  const db = readDb();
  const share = db.shares.find(s => s.shortlink === req.params.shortlink.toLowerCase());

  if (!share) {
    return res.status(404).json({ error: 'Link tidak ditemukan.' });
  }

  // Check expiry
  if (share.expiryTime && new Date() > new Date(share.expiryTime)) {
    return res.status(410).json({ error: 'Link ini sudah kedaluwarsa.' });
  }

  const fileInfo = db.files.find(f => f.id === share.fileId && !f.isDeleted);
  if (!fileInfo) {
    return res.status(404).json({ error: 'File tidak ditemukan.' });
  }

  // Verify password if set
  if (share.hasPassword) {
    if (!password || !bcrypt.compareSync(password, share.passwordHash)) {
      return res.status(401).json({ error: 'Password salah!' });
    }
  }

  let targetFile = fileInfo;

  if (fileInfo.isFolder) {
    if (!subFileId) {
      return res.status(400).json({ error: 'Untuk folder, silakan unduh file satu per satu melalui antarmuka folder.' });
    }
    // Find specific subfile inside database
    const subFile = db.files.find(f => f.id === subFileId && !f.isFolder && !f.isDeleted);
    if (!subFile) {
      return res.status(404).json({ error: 'File tidak ditemukan di folder.' });
    }
    // Verify descendant check for security
    let current = subFile;
    let isDescendant = false;
    let limit = 20;
    while (current && current.parentId && limit > 0) {
      if (current.parentId === fileInfo.id) {
        isDescendant = true;
        break;
      }
      current = db.files.find(f => f.id === current.parentId && !f.isDeleted);
      limit--;
    }
    if (!isDescendant) {
      return res.status(403).json({ error: 'Akses tidak sah ke file.' });
    }
    targetFile = subFile;
  }

  const filePath = path.join(UPLOADS_DIR, targetFile.storagePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File di disk tidak ditemukan.' });
  }

  // Increment download count
  share.downloadsCount++;
  writeDb(db);

  res.download(filePath, targetFile.name);
});

// PUBLIC API: Get Folder contents inside a Shared Folder
app.post('/api/public/share/:shortlink/folder', (req, res) => {
  const { password, subFolderId } = req.body;
  const db = readDb();
  const share = db.shares.find(s => s.shortlink === req.params.shortlink.toLowerCase());

  if (!share) {
    return res.status(404).json({ error: 'Link tidak ditemukan.' });
  }

  // Check expiry
  if (share.expiryTime && new Date() > new Date(share.expiryTime)) {
    return res.status(410).json({ error: 'Link ini sudah kedaluwarsa.' });
  }

  // Verify password
  if (share.hasPassword) {
    if (!password || !bcrypt.compareSync(password, share.passwordHash)) {
      return res.status(401).json({ error: 'Password salah!' });
    }
  }

  const rootFolder = db.files.find(f => f.id === share.fileId && !f.isDeleted && f.isFolder);
  if (!rootFolder) {
    return res.status(404).json({ error: 'Folder tidak ditemukan.' });
  }

  // Target folder to list is either the root shared folder or a subfolder within it
  let targetFolderId = rootFolder.id;
  if (subFolderId && subFolderId !== rootFolder.id) {
    // Validate that subFolderId is actually a descendant of rootFolder to prevent sandbox escaping
    let current = db.files.find(f => f.id === subFolderId && !f.isDeleted);
    let isDescendant = false;
    let limit = 20; // safety limit to prevent circular loops
    while (current && current.parentId && limit > 0) {
      if (current.parentId === rootFolder.id) {
        isDescendant = true;
        break;
      }
      current = db.files.find(f => f.id === current.parentId && !f.isDeleted);
      limit--;
    }
    if (isDescendant) {
      targetFolderId = subFolderId;
    }
  }

  const filesInFolder = db.files.filter(f => f.parentId === targetFolderId && !f.isDeleted).map(f => ({
    id: f.id,
    name: f.name,
    isFolder: f.isFolder,
    size: f.size,
    type: f.type,
    createdAt: f.createdAt
  }));

  res.json({
    folderName: db.files.find(f => f.id === targetFolderId).name,
    parentFolderId: db.files.find(f => f.id === targetFolderId).parentId,
    files: filesInFolder
  });
});

// HTML Routing fallback: serve public share page
app.get('/s/:shortlink', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

// Periodic background job: Cleanup expired files & temporary files (Runs every 10 seconds)
setInterval(() => {
  const db = readDb();
  let changed = false;
  const now = new Date();

  // 1. Cleanup temporary uploaded files
  db.files.forEach(file => {
    if (file.temporary && !file.isDeleted && file.expiryTime && now > new Date(file.expiryTime)) {
      console.log(`Menghapus file sementara kedaluwarsa: ${file.name}`);
      deleteItem(db, file.id);
      changed = true;
    }
  });

  // 2. Mark expired share links
  db.shares.forEach(share => {
    if (share.expiryTime && !share.isExpired && now > new Date(share.expiryTime)) {
      share.isExpired = true;
      changed = true;
    }
  });

  if (changed) {
    writeDb(db);
  }
}, 10000);

// Start server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Server Bagikan running on port ${PORT}`);
  console.log(`🔑 Default Password: admin`);
  console.log(`========================================`);
});
