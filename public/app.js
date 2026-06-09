// State Management
let currentFolderId = null;
let currentPath = []; // Breadcrumbs path [{id, name}]
let authenticated = false;
let selectedItem = null; // For context menus / bottom sheets

// Controls State
let currentLayout = 'grid'; // 'grid' or 'list'
let currentSortField = 'createdAt';
let currentSortAsc = false;
let currentGridColumns = 7;
let multiSelectMode = false;
let selectedFileIds = new Set();
let draggedItemIds = [];
let draggedItemId = null;

// API Base URLs
const API_AUTH = '/api/auth';
const API_FILES = '/api/files';
const API_SHARE = '/api/share';
const API_SETTINGS = '/api/settings';

// DOM Elements
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginPasswordInput = document.getElementById('login-password');
const toggleLoginPassBtn = document.getElementById('toggle-login-pass');
const logoutBtn = document.getElementById('btn-logout');
const changePassBtn = document.getElementById('btn-change-pass');

const filesGrid = document.getElementById('files-grid');
const emptyState = document.getElementById('empty-state');
const breadcrumbsContainer = document.getElementById('breadcrumbs');
const searchInput = document.getElementById('search-input');

// Toolbar Elements
const sortSelect = document.getElementById('sort-select');
const gridColumnsSelect = document.getElementById('grid-columns-select');
const btnSortOrder = document.getElementById('btn-sort-order');
const btnLayoutToggle = document.getElementById('btn-layout-toggle');
const btnBulkToggle = document.getElementById('btn-bulk-toggle');
const btnBulkDelete = document.getElementById('btn-bulk-delete');

// Image/Media Preview Elements
const modalImagePreview = document.getElementById('modal-image-preview');
const previewImageTitle = document.getElementById('preview-image-title');
const previewImgElement = document.getElementById('preview-img-element');
const previewVideoElement = document.getElementById('preview-video-element');
const previewIframeElement = document.getElementById('preview-iframe-element');
const previewImageSize = document.getElementById('preview-image-size');
const btnDownloadPreviewImg = document.getElementById('btn-download-preview-img');

// Action Buttons
const btnNewFolder = document.getElementById('btn-new-folder');
const btnNewNote = document.getElementById('btn-new-note');
const btnUpload = document.getElementById('btn-upload');

// Modals
const modalUpload = document.getElementById('modal-upload');
const modalFolder = document.getElementById('modal-folder');
const modalNote = document.getElementById('modal-note');
const modalShare = document.getElementById('modal-share');
const modalRename = document.getElementById('modal-rename');
const modalChangePass = document.getElementById('modal-change-password');

// Forms & Inputs
const folderForm = document.getElementById('folder-form');
const folderNameInput = document.getElementById('folder-name');
const noteForm = document.getElementById('note-form');
const noteNameInput = document.getElementById('note-name');
const noteContentInput = document.getElementById('note-content');
const notePreview = document.getElementById('note-preview');
const btnNoteView = document.getElementById('btn-note-view');
const btnNoteEdit = document.getElementById('btn-note-edit');
const btnSaveNote = document.getElementById('btn-save-note');
const noteModalTitle = document.getElementById('note-modal-title');
const csvToolbar = document.getElementById('csv-toolbar');
const csvSeparator = document.getElementById('csv-separator');
const csvCustomSeparator = document.getElementById('csv-custom-separator');

const shareForm = document.getElementById('share-form');
const shareFileId = document.getElementById('share-file-id');
const shareFilename = document.getElementById('share-filename');
const shareIcon = document.getElementById('share-icon');
const shareCustomLink = document.getElementById('share-custom-link');
const btnRandomShareCode = document.getElementById('btn-random-share-code');
const shareLiveUrl = document.getElementById('share-live-url');
const btnCopyLiveLink = document.getElementById('btn-copy-live-link');
const sharePassword = document.getElementById('share-password');
const shareExpiry = document.getElementById('share-expiry');
const shareResultArea = document.getElementById('share-result-area');
const generatedLinkUrl = document.getElementById('generated-link-url');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnCancelShare = document.getElementById('btn-cancel-share');
const modalBulkMove = document.getElementById('modal-bulk-move');
const bulkMoveForm = document.getElementById('bulk-move-form');
const bulkMoveTree = document.getElementById('bulk-move-tree');
const bulkMoveCount = document.getElementById('bulk-move-count');
const bulkMoveSelectedTarget = document.getElementById('bulk-move-selected-target');
const btnBulkMoveRoot = document.getElementById('btn-bulk-move-root');
const btnBulkMove = document.getElementById('btn-bulk-move');


const renameForm = document.getElementById('rename-form');
const renameInput = document.getElementById('rename-input');
const renameItemId = document.getElementById('rename-item-id');

const changePassForm = document.getElementById('change-pass-form');
const oldPasswordInput = document.getElementById('old-password');
const newPasswordInput = document.getElementById('new-password');

// Upload Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const btnPickFolder = document.getElementById('btn-pick-folder');
const folderUploadMode = document.getElementById('folder-upload-mode');
const folderModeButtons = document.querySelectorAll('.folder-mode-btn');
const folderSummary = document.getElementById('folder-summary');
const folderSummaryName = document.getElementById('folder-summary-name');
const folderSummaryCount = document.getElementById('folder-summary-count');
const folderSummarySize = document.getElementById('folder-summary-size');
const folderSummaryList = document.getElementById('folder-summary-list');
const tempModeSelect = document.getElementById('temp-mode');
const uploadQueue = document.getElementById('upload-queue');
const queueItems = document.getElementById('queue-items');
const btnStartUpload = document.getElementById('btn-start-upload');
let pendingUploadFiles = [];
let pendingFolderLabel = '';
let pendingFolderMode = 'preserve';

// Mobile Bottom Sheet
const itemOptionsSheet = document.getElementById('item-options-sheet');
const sheetIcon = document.getElementById('sheet-icon');
const sheetName = document.getElementById('sheet-name');
const btnCloseSheet = document.getElementById('btn-close-sheet');
const sheetOptPin = document.getElementById('sheet-opt-pin');
const sheetOptDownload = document.getElementById('sheet-opt-download');
const sheetOptShare = document.getElementById('sheet-opt-share');
const sheetOptEdit = document.getElementById('sheet-opt-edit');
const sheetOptDelete = document.getElementById('sheet-opt-delete');

/* ==================== TOAST NOTIFICATIONS ==================== */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation';
  toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ==================== AUTHENTICATION ==================== */
async function checkAuth() {
  try {
    const res = await fetch(`${API_AUTH}/check`);
    const data = await res.json();
    if (data.authenticated) {
      setAuth(true);
    } else {
      setAuth(false);
    }
  } catch (err) {
    setAuth(false);
  }
}

function setAuth(isAuth) {
  authenticated = isAuth;
  if (isAuth) {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    loadGridSettings();
    loadFiles();
  } else {
    loginView.classList.remove('hidden');
    appView.classList.add('hidden');
  }
}

async function loadGridSettings() {
  try {
    const res = await fetch(API_SETTINGS);
    if (!res.ok) return;
    const data = await res.json();
    const savedColumns = parseInt(data?.settings?.gridColumns, 10);
    if (savedColumns >= 7 && savedColumns <= 15) {
      currentGridColumns = savedColumns;
      if (gridColumnsSelect) {
        gridColumnsSelect.value = String(savedColumns);
      }
      filterAndRender();
    }
  } catch (err) {
    // keep local default
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = loginPasswordInput.value;
  try {
    const res = await fetch(`${API_AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      loginPasswordInput.value = '';
      setAuth(true);
    } else {
      showToast(data.error || 'Gagal login', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan koneksi server', 'error');
  }
});

toggleLoginPassBtn.addEventListener('click', () => {
  const isPass = loginPasswordInput.type === 'password';
  loginPasswordInput.type = isPass ? 'text' : 'password';
  toggleLoginPassBtn.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch(`${API_AUTH}/logout`, { method: 'POST' });
    setAuth(false);
    showToast('Berhasil keluar!', 'success');
  } catch (err) {
    showToast('Gagal keluar', 'error');
  }
});

changePassBtn.addEventListener('click', () => openModal(modalChangePass));

changePassForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const oldPassword = oldPasswordInput.value;
  const newPassword = newPasswordInput.value;
  try {
    const res = await fetch(`${API_AUTH}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      closeAllModals();
      changePassForm.reset();
    } else {
      showToast(data.error || 'Gagal merubah password', 'error');
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
  }
});

/* ==================== FILE HANDLING (GRID RENDER) ==================== */
/* ==================== FILE HANDLING (GRID RENDER) ==================== */
let allFilesCache = []; // Clientside cache storage
let currentCategory = 'all'; // all, shared, document, image, video

sortSelect.value = currentSortField;
btnSortOrder.innerHTML = '<i class="fa-solid fa-sort-down"></i>';

async function loadFiles(searchQuery = '') {
  try {
    const url = searchQuery 
      ? `${API_FILES}?search=${encodeURIComponent(searchQuery)}`
      : `${API_FILES}?parentId=${currentFolderId || ''}`;
      
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[loadFiles] request failed', {
        url,
        status: res.status,
        statusText: res.statusText
      });
      if (res.status === 401) setAuth(false);
      return;
    }

    const data = await res.json();
    allFilesCache = data.files;
    
    try {
      filterAndRender();
    } catch (renderErr) {
      console.error('[loadFiles] render failed', {
        error: renderErr,
        stack: renderErr?.stack,
        filesCount: allFilesCache.length,
        currentCategory,
        currentFolderId,
        currentLayout,
        currentGridColumns,
        currentSortField,
        currentSortAsc
      });
      throw renderErr;
    }
  } catch (err) {
    console.error('[loadFiles] failed', {
      error: err,
      stack: err?.stack,
      searchQuery,
      currentFolderId,
      currentCategory
    });
    showToast('Gagal memuat daftar file', 'error');
  }
}

function filterAndRender() {
  let files = [...allFilesCache];

  // Apply category filtering
  if (currentCategory === 'shared' && currentFolderId === null) {
    files = files.filter(f => f.isShared);
  } else if (currentCategory === 'document') {
    files = files.filter(f => {
      const type = (f.type || '').toLowerCase();
      const ext = (f.name || '').toLowerCase().split('.').pop();
      return type.includes('pdf') || type.includes('text') || type.includes('word') || type.includes('office') || ['doc','docx','xls','xlsx','ppt','pptx','pdf','txt'].includes(ext);
    });
  } else if (currentCategory === 'image') {
    files = files.filter(f => (f.type || '').toLowerCase().startsWith('image/'));
  } else if (currentCategory === 'video') {
    files = files.filter(f => (f.type || '').toLowerCase().startsWith('video/'));
  }

  // Perform sorting clientside (supports pinned items first, then custom field)
  let sortedFiles = sortFilesCollection(files);
  renderFiles(sortedFiles);
}

function sortFilesCollection(files) {
  return files.sort((a, b) => {
    // 1. Pinned folders/files automatically go to the top
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned; // pinned first
    }

    // 2. Folders always go above files (within the same pin category)
    const aFolder = a.isFolder ? 1 : 0;
    const bFolder = b.isFolder ? 1 : 0;
    if (aFolder !== bFolder) {
      return bFolder - aFolder;
    }

    // 3. Custom field sorting
    let valA = a[currentSortField];
    let valB = b[currentSortField];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return currentSortAsc ? -1 : 1;
    if (valA > valB) return currentSortAsc ? 1 : -1;
    return 0;
  });
}

function getFileIconClass(item) {
  if (item.isFolder) return 'fa-solid fa-folder-closed file-icon folder';
  
  const type = item.type || '';
  if (type.startsWith('image/')) return 'fa-solid fa-file-image file-icon image';
  if (type === 'text/plain') return 'fa-solid fa-file-lines file-icon text';
  if (type.includes('pdf')) return 'fa-solid fa-file-pdf file-icon pdf';
  if (type.includes('video/')) return 'fa-solid fa-file-video file-icon video';
  if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return 'fa-solid fa-file-zipper file-icon zip';
  
  return 'fa-solid fa-file file-icon';
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function renderFiles(files) {
  filesGrid.innerHTML = '';
  
  // Set Layout class
  filesGrid.classList.toggle('list-view', currentLayout === 'list');
  filesGrid.classList.toggle('grid-cols-7', currentLayout === 'grid' && currentGridColumns === 7);
  filesGrid.classList.toggle('grid-cols-8', currentLayout === 'grid' && currentGridColumns === 8);
  filesGrid.classList.toggle('grid-cols-9', currentLayout === 'grid' && currentGridColumns === 9);
  filesGrid.classList.toggle('grid-cols-10', currentLayout === 'grid' && currentGridColumns === 10);
  
  if (files.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  files.forEach(item => {
    const card = document.createElement('div');
    card.className = `file-card ${item.pinned ? 'pinned-item' : ''}`;
    card.dataset.id = item.id;
    card.draggable = true;
    card.classList.toggle('selectable', multiSelectMode);
    card.classList.toggle('selected', selectedFileIds.has(item.id));
    
    const selectBadgeHtml = multiSelectMode ? `
      <div class="file-select-badge">
        <i class="fa-solid ${selectedFileIds.has(item.id) ? 'fa-check' : 'fa-minus'}"></i>
      </div>
    ` : '';
    
    // Check for temporary file expiration
    let expiryBadgeHtml = '';
    if (item.temporary && item.expiryTime) {
      const remainingMin = Math.round((new Date(item.expiryTime) - new Date()) / 60000);
      if (remainingMin > 0) {
        expiryBadgeHtml = `<div class="file-expiry-badge"><i class="fa-regular fa-clock"></i> ${remainingMin}m</div>`;
      } else {
        expiryBadgeHtml = `<div class="file-expiry-badge"><i class="fa-regular fa-clock"></i> Kedaluwarsa</div>`;
      }
    }

    // Pin indicator icon
    const pinBadgeHtml = item.pinned ? `<div class="pinned-badge" title="Tersemat (Pinned)"><i class="fa-solid fa-thumbtack"></i></div>` : '';

    // Shared indicator icon badge (Green icon)
    const shareBadgeHtml = item.isShared ? `<div class="share-badge" title="Tautan dibagikan aktif"><i class="fa-solid fa-share-nodes"></i></div>` : '';

    // Thumbnail render for all file types
    let thumbnailHtml = '';
    const type = (item.type || '').toLowerCase();
    const ext = (item.name || '').toLowerCase().split('.').pop();
    const isImage = !item.isFolder && type.startsWith('image/');
    const isVideo = !item.isFolder && type.startsWith('video/');
    const isPdf = !item.isFolder && (type.includes('pdf') || ext === 'pdf');
    const isWord = !item.isFolder && ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
    const isDocument = !item.isFolder && (type.includes('text') || type.includes('word') || type.includes('officedocument') || ['txt', 'rtf', 'md'].includes(ext));

    if (item.isFolder) {
      thumbnailHtml = `
        <div class="thumbnail-container folder-thumb">
          <i class="fa-solid fa-folder-open thumbnail-symbol"></i>
          <span class="thumbnail-label">Folder</span>
        </div>
      `;
    } else if (isImage) {
      const previewUrl = `${API_FILES}/${item.id}/download`;
      thumbnailHtml = `
        <div class="thumbnail-container">
          <img src="${previewUrl}" class="thumbnail-img" alt="${item.name}" loading="lazy">
        </div>
      `;
    } else if (isVideo) {
      const previewUrl = `${API_FILES}/${item.id}/view`;
      thumbnailHtml = `
        <div class="thumbnail-container media-thumb video-thumb">
          <video class="thumbnail-video" muted playsinline preload="metadata" src="${previewUrl}"></video>
          <div class="thumbnail-overlay"><i class="fa-solid fa-circle-play"></i></div>
        </div>
      `;
    } else if (isPdf) {
      thumbnailHtml = `
        <div class="thumbnail-container media-thumb pdf-thumb">
          <i class="fa-solid fa-file-pdf thumbnail-symbol"></i>
          <span class="thumbnail-label">PDF</span>
        </div>
      `;
    } else if (isWord) {
      thumbnailHtml = `
        <div class="thumbnail-container media-thumb word-thumb">
          <i class="fa-solid fa-file-word thumbnail-symbol"></i>
          <span class="thumbnail-label">Office</span>
        </div>
      `;
    } else if (isDocument) {
      thumbnailHtml = `
        <div class="thumbnail-container media-thumb doc-thumb">
          <i class="fa-solid fa-file-lines thumbnail-symbol"></i>
          <span class="thumbnail-label">Dokumen</span>
        </div>
      `;
    } else {
      thumbnailHtml = `
        <div class="thumbnail-container media-thumb other-thumb">
          <i class="fa-solid fa-file thumbnail-symbol"></i>
          <span class="thumbnail-label">File</span>
        </div>
      `;
    }

    // Dynamic header: keep menu button only
    let cardHeaderHtml = `
      <div class="file-card-header">
        ${currentLayout === 'list' ? thumbnailHtml : ''}
        <button class="btn-icon file-menu-btn">
          <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
      </div>
    `;


    card.innerHTML = `
      ${selectBadgeHtml}
      ${pinBadgeHtml}
      ${(currentLayout === 'grid') ? thumbnailHtml : ''}
      ${cardHeaderHtml}
      <div class="file-card-body">
        <div class="file-name" title="${item.name}">${item.name}</div>
        <div class="file-card-footer-row">
          ${item.isShared ? `<div class="share-status-chip"><i class="fa-solid fa-share-nodes"></i> Dibagikan</div>` : ''}
          <div class="file-info-row">
            <span class="file-size">${item.isFolder ? 'Folder' : formatBytes(item.size)}</span>
            <span class="file-date">${new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
        ${expiryBadgeHtml}
      </div>
    `;

    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.file-menu-btn')) return;
      card.classList.add('drag-hold');
    });

    card.addEventListener('pointerup', () => card.classList.remove('drag-hold'));
    card.addEventListener('pointercancel', () => card.classList.remove('drag-hold'));
    card.addEventListener('mouseleave', () => card.classList.remove('drag-hold'));

    card.addEventListener('dragstart', (e) => {
      if (multiSelectMode) {
        if (selectedFileIds.has(item.id)) {
          draggedItemIds = [...selectedFileIds];
        } else {
          draggedItemIds = [item.id];
        }
      } else {
        draggedItemIds = [item.id];
      }
      draggedItemId = item.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ ids: draggedItemIds }));
      card.classList.remove('drag-hold');
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedItemIds = [];
      draggedItemId = null;
      document.querySelectorAll('.file-card.drop-target').forEach(el => el.classList.remove('drop-target'));
    });

    if (item.isFolder) {
      card.addEventListener('dragover', (e) => {
        if (!draggedItemIds.length) return;
        if (draggedItemIds.includes(item.id)) return;
        e.preventDefault();
        card.classList.add('drop-target');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drop-target');
      });

      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        card.classList.remove('drop-target');
        const payload = (() => {
          try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; }
        })();
        const ids = Array.isArray(payload?.ids) && payload.ids.length ? payload.ids : (draggedItemIds.length ? draggedItemIds : [draggedItemId]);
        const filteredIds = [...new Set(ids)].filter(Boolean).filter(id => id !== item.id);
        if (filteredIds.length === 0) return;
        await moveSelectedItems(filteredIds, item.id);
      });
    }

    card.addEventListener('click', (e) => {
      if (e.target.closest('.file-menu-btn')) return;
      if (multiSelectMode) {
        if (selectedFileIds.has(item.id)) selectedFileIds.delete(item.id);
        else selectedFileIds.add(item.id);
        filterAndRender();
        updateBulkActionState();
        return;
      }
      
      if (item.isFolder) {
        enterFolder(item.id, item.name);
      } else {
        openMediaPreview(item);
      }
    });

    const menuBtn = card.querySelector('.file-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openOptionsSheet(item);
    });

    filesGrid.appendChild(card);
  });
  updateBulkActionState();
}

// Category filter bind listeners
document.querySelectorAll('.btn-filter').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    filterAndRender();
  });
});

// Search feature
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  loadFiles(query);
});

// Layout toggler
btnLayoutToggle.addEventListener('click', () => {
  currentLayout = currentLayout === 'grid' ? 'list' : 'grid';
  btnLayoutToggle.innerHTML = currentLayout === 'grid' ? '<i class="fa-solid fa-list"></i>' : '<i class="fa-solid fa-grip-vertical"></i>';
  filterAndRender();
});

// Grid density control
if (gridColumnsSelect) {
  gridColumnsSelect.value = String(currentGridColumns);
  gridColumnsSelect.addEventListener('change', async (e) => {
    currentGridColumns = parseInt(e.target.value, 10) || 7;
    try {
      await fetch(API_SETTINGS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridColumns: currentGridColumns })
      });
    } catch (err) {
      // ignore save failure, keep local state
    }
    filterAndRender();
  });
}

// Sort controls
sortSelect.addEventListener('change', (e) => {
  currentSortField = e.target.value;
  filterAndRender();
});

btnSortOrder.addEventListener('click', () => {
  currentSortAsc = !currentSortAsc;
  btnSortOrder.innerHTML = currentSortAsc ? '<i class="fa-solid fa-sort-down"></i>' : '<i class="fa-solid fa-sort-up"></i>';
  filterAndRender();
});

// Bulk select controls
btnBulkToggle.addEventListener('click', () => {
  multiSelectMode = !multiSelectMode;
  if (!multiSelectMode) {
    selectedFileIds.clear();
  }
  updateBulkActionState();
  filterAndRender();
});

btnBulkDelete.addEventListener('click', async () => {
  if (selectedFileIds.size === 0) return;
  const confirmDelete = confirm(`Hapus ${selectedFileIds.size} item terpilih?`);
  if (!confirmDelete) return;

  await bulkDeleteSelected();
});

btnBulkMove.addEventListener('click', () => {
  if (selectedFileIds.size === 0) return;
  openBulkMoveModal();
});

function updateBulkActionState() {
  btnBulkToggle.classList.toggle('active', multiSelectMode);
  btnBulkToggle.innerHTML = multiSelectMode
    ? '<i class="fa-solid fa-square-check"></i> <span>Batal Pilih</span>'
    : '<i class="fa-regular fa-square-check"></i> <span>Pilih Banyak</span>';

  const selectedCount = selectedFileIds.size;
  btnBulkDelete.classList.toggle('hidden', !multiSelectMode);
  btnBulkMove.classList.toggle('hidden', !multiSelectMode);
  btnBulkDelete.disabled = selectedCount === 0;
  btnBulkMove.disabled = selectedCount === 0;
  btnBulkDelete.innerHTML = selectedCount > 0
    ? `<i class="fa-solid fa-trash"></i> <span>Hapus Terpilih (${selectedCount})</span>`
    : '<i class="fa-solid fa-trash"></i> <span>Hapus Terpilih</span>';
  btnBulkMove.innerHTML = selectedCount > 0
    ? `<i class="fa-solid fa-folder-tree"></i> <span>Pindah Terpilih (${selectedCount})</span>`
    : '<i class="fa-solid fa-folder-tree"></i> <span>Pindah Terpilih</span>';
}

async function bulkDeleteSelected() {
  btnBulkDelete.disabled = true;
  btnBulkDelete.textContent = 'Menghapus...';
  try {
    const res = await fetch(`${API_FILES}/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedFileIds] })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal hapus terpilih', 'error');
      return;
    }
    selectedFileIds.clear();
    multiSelectMode = false;
    updateBulkActionState();
    filterAndRender();
    loadFiles();
    showToast(`Berhasil hapus ${data.deletedIds?.length || 0} item`, 'success');
  } catch (err) {
    console.error('[bulkDelete] failed', err);
    showToast('Gagal hapus terpilih', 'error');
  } finally {
    btnBulkDelete.disabled = false;
    btnBulkDelete.innerHTML = '<i class="fa-solid fa-trash"></i> <span>Hapus Terpilih</span>';
  }
}

async function openBulkMoveModal() {
  bulkMoveForm.reset();
  bulkMoveCount.textContent = `${selectedFileIds.size} item terpilih`;
  bulkMoveSelectedTarget.textContent = 'Beranda';
  bulkMoveTree.innerHTML = '<div class="bulk-move-tree-loading">Memuat tree folder...</div>';
  openModal(modalBulkMove);
  await populateBulkMoveTargets();
}

function normalizeParentId(value) {
  return value === undefined || value === null || value === '' || value === 'null' ? null : value;
}

function collectDescendantFolderIds(folders, folderId, result = new Set()) {
  folders
    .filter(folder => normalizeParentId(folder.parentId) === folderId)
    .forEach(folder => {
      result.add(folder.id);
      collectDescendantFolderIds(folders, folder.id, result);
    });
  return result;
}

function getFolderTreeRoots(folders, excludeIds = new Set()) {
  return folders
    .filter(folder => !excludeIds.has(folder.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderBulkMoveTreeNode(folder, folders, depth, excludeIds) {
  const nodeWrap = document.createElement('div');
  nodeWrap.className = 'bulk-tree-node';
  nodeWrap.style.setProperty('--tree-depth', String(depth));

  const childFolders = folders
    .filter(item => normalizeParentId(item.parentId) === folder.id && !excludeIds.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasChildren = childFolders.length > 0;

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'bulk-tree-row';
  row.dataset.folderId = folder.id;
  row.innerHTML = `
    <span class="bulk-tree-arrow ${hasChildren ? '' : 'invisible'}" title="Tampilkan/sembunyikan subfolder">
      <i class="fa-solid fa-chevron-right"></i>
    </span>
    <span class="bulk-tree-folder"><i class="fa-solid fa-folder"></i></span>
    <span class="bulk-tree-name">${folder.name}</span>
  `;

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'bulk-tree-children hidden';

  childFolders.forEach(child => {
    childrenWrap.appendChild(renderBulkMoveTreeNode(child, folders, depth + 1, excludeIds));
  });

  const setExpanded = (expanded) => {
    if (!hasChildren) return;
    childrenWrap.classList.toggle('hidden', !expanded);
    row.classList.toggle('expanded', expanded);
    const arrow = row.querySelector('.bulk-tree-arrow i');
    if (arrow) {
      arrow.className = expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
    }
  };

  row.addEventListener('click', () => {
    selectedBulkMoveTargetId = folder.id;
    bulkMoveSelectedTarget.textContent = folder.name;
    document.querySelectorAll('.bulk-tree-row.active').forEach(el => el.classList.remove('active'));
    row.classList.add('active');
  });

  const arrowBtn = row.querySelector('.bulk-tree-arrow');
  arrowBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setExpanded(childrenWrap.classList.contains('hidden'));
  });

  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      row.click();
    }
  });
  row.tabIndex = 0;

  nodeWrap.appendChild(row);
  nodeWrap.appendChild(childrenWrap);
  return nodeWrap;
}

let selectedBulkMoveTargetId = null;

async function populateBulkMoveTargets() {
  const selectedIds = new Set(selectedFileIds);
  bulkMoveTree.innerHTML = '';

  try {
    const res = await fetch(`${API_FILES}?allFolders=1`);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.files)) {
      bulkMoveTree.innerHTML = '<div class="bulk-move-tree-loading">Gagal memuat daftar folder</div>';
      showToast(data.error || 'Gagal memuat daftar folder', 'error');
      return;
    }

    const folders = data.files.filter(item => item.isFolder && !item.isDeleted);
    const excludeIds = new Set(selectedIds);
    folders.forEach(folder => {
      if (selectedIds.has(folder.id)) {
        collectDescendantFolderIds(folders, folder.id, excludeIds);
      }
    });

    const roots = getFolderTreeRoots(folders.filter(folder => normalizeParentId(folder.parentId) === null), excludeIds);
    if (roots.length === 0) {
      bulkMoveTree.innerHTML = '<div class="bulk-move-tree-loading">Tidak ada folder tujuan</div>';
      return;
    }

    roots.forEach(folder => {
      bulkMoveTree.appendChild(renderBulkMoveTreeNode(folder, folders, 0, excludeIds));
    });
    console.info('[bulkMoveTargets] loaded folders', folders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })));
  } catch (err) {
    console.error('[bulkMoveTargets] failed to load all folders', err);
    bulkMoveTree.innerHTML = '<div class="bulk-move-tree-loading">Gagal memuat daftar folder</div>';
    showToast('Gagal memuat daftar folder', 'error');
  }
}

async function moveSelectedItems(ids, targetParentId) {
  try {
    const res = await fetch(`${API_FILES}/bulk-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, targetParentId: targetParentId || null })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal pindah terpilih', 'error');
      return false;
    }
    if (selectedFileIds.size) {
      selectedFileIds.clear();
      multiSelectMode = false;
      updateBulkActionState();
    }
    closeAllModals();
    filterAndRender();
    loadFiles();
    showToast(`Berhasil pindah ${data.movedIds?.length || ids.length} item`, 'success');
    return true;
  } catch (err) {
    console.error('[bulkMove] failed', err);
    showToast('Gagal pindah terpilih', 'error');
    return false;
  }
}

btnBulkMoveRoot.addEventListener('click', () => {
  selectedBulkMoveTargetId = null;
  bulkMoveSelectedTarget.textContent = 'Beranda';
  document.querySelectorAll('.bulk-tree-row.active').forEach(el => el.classList.remove('active'));
});

bulkMoveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (selectedFileIds.size === 0) return;

  const confirmMove = confirm(`Pindahkan ${selectedFileIds.size} item terpilih?`);
  if (!confirmMove) return;

  await moveSelectedItems([...selectedFileIds], selectedBulkMoveTargetId);
});

function getPreviewUrl(item) {
  return `${API_FILES}/${item.id}/view`;
}

/* ==================== PREMIUM DYNAMIC MULTI-MEDIA PREVIEW ==================== */
function openMediaPreview(item) {
  if (!item) return;
  const type = (item.type || '').toLowerCase();
  const ext = item.name.toLowerCase().split('.').pop();

  // Text files → open editable note editor
  if (ext === 'txt' || ext === 'csv' || type === 'text/plain' || type.startsWith('text/')) {
    openTextNoteEditor(item);
    return;
  }

  previewImageTitle.textContent = item.name;
  previewImageSize.textContent = `Ukuran File: ${formatBytes(item.size)}`;
  
  // Hide all dynamic elements first
  previewImgElement.classList.add('hidden');
  previewVideoElement.classList.add('hidden');
  previewIframeElement.classList.add('hidden');

  // Stop video in case it was playing
  previewVideoElement.pause();
  previewVideoElement.removeAttribute('src');
  previewVideoElement.load();
  previewIframeElement.removeAttribute('src');

  const previewUrl = getPreviewUrl(item);

  console.log('[Preview] item:', item.name, '| type:', type, '| ext:', ext);
  console.log('[Preview] previewUrl (relative):', previewUrl);
  console.log('[Preview] previewUrl (absolute):', `${window.location.origin}${previewUrl}`);

  // If Office file, use Office Live Viewer
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    // Office Live Viewer requires a publicly accessible absolute URL
    const absoluteFileUrl = `${window.location.origin}${previewUrl}`;
    const officeLiveViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteFileUrl)}`;
    console.log('[Preview] Office Live URL:', officeLiveViewerUrl);
    previewIframeElement.src = officeLiveViewerUrl;
    previewIframeElement.classList.remove('hidden');
  }
  // If PDF or other document types that can be iframed directly
  else if (type.includes('pdf') || ext === 'pdf') {
    previewIframeElement.src = previewUrl;
    previewIframeElement.classList.remove('hidden');
  }
  // If Image or Video, use respective elements
  else if (type.startsWith('image/')) {
    previewImgElement.src = previewUrl;
    previewImgElement.classList.remove('hidden');
  }
  else if (type.startsWith('video/')) {
    previewVideoElement.src = previewUrl;
    previewVideoElement.classList.remove('hidden');
    previewVideoElement.load();
  }
  else {
    // Fallback for unknown types: attempt direct iframe or provide download link
    previewIframeElement.src = previewUrl; 
    previewIframeElement.classList.remove('hidden');
  }
  
  // Set download attributes for the button
  btnDownloadPreviewImg.setAttribute('download', item.name);
  btnDownloadPreviewImg.href = previewUrl;

  openModal(modalImagePreview);
}

/* ==================== BREADCRUMBS & NAVIGATION ==================== */
function enterFolder(id, name) {
  currentFolderId = id;
  currentPath.push({ id, name });
  updateBreadcrumbs();
  loadFiles();
}

function updateBreadcrumbs() {
  breadcrumbsContainer.innerHTML = '';
  
  // Home node
  const homeNode = document.createElement('span');
  homeNode.className = `breadcrumb-item ${currentPath.length === 0 ? 'active' : ''}`;
  homeNode.innerHTML = `<i class="fa-solid fa-house"></i> Beranda`;
  homeNode.addEventListener('click', () => {
    if (currentPath.length === 0) return;
    currentFolderId = null;
    currentPath = [];
    updateBreadcrumbs();
    loadFiles();
  });
  breadcrumbsContainer.appendChild(homeNode);

  currentPath.forEach((folder, idx) => {
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    breadcrumbsContainer.appendChild(separator);

    const node = document.createElement('span');
    node.className = `breadcrumb-item ${idx === currentPath.length - 1 ? 'active' : ''}`;
    node.textContent = folder.name;
    
    if (idx !== currentPath.length - 1) {
      node.addEventListener('click', () => {
        currentPath = currentPath.slice(0, idx + 1);
        currentFolderId = folder.id;
        updateBreadcrumbs();
        loadFiles();
      });
    }
    
    breadcrumbsContainer.appendChild(node);
  });
}

/* ==================== OPTION SHEET ACTIONS ==================== */
function openOptionsSheet(item) {
  selectedItem = item;
  
  sheetName.textContent = item.name;
  sheetIcon.className = getFileIconClass(item);

  const typeEl = document.getElementById('sheet-info-type');
  const sizeEl = document.getElementById('sheet-info-size');
  const pathEl = document.getElementById('sheet-info-path');
  const uploadTimeEl = document.getElementById('sheet-info-upload-time');
  const sizeRow = document.getElementById('sheet-info-size-row');
  
  const extMatch = item.name.match(/\.([^.]+)$/);
  const fileExt = extMatch ? extMatch[1].toUpperCase() + ' File' : 'File';
  typeEl.textContent = item.isFolder ? 'Folder' : fileExt;

  if (item.isFolder) {
    sizeRow.classList.add('hidden');
  } else {
    sizeRow.classList.remove('hidden');
    sizeEl.textContent = formatBytes(item.size);
  }

  uploadTimeEl.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-';
  pathEl.textContent = currentPath.map(p => p.name).join(' / ');
  
  // Pinned action label
  sheetOptPin.innerHTML = item.pinned ? '<i class="fa-solid fa-thumbtack-slash"></i> Lepas Pin Folder' : '<i class="fa-solid fa-thumbtack"></i> Pin Teratas';

  // Shared action label
  sheetOptShare.innerHTML = item.isShared
    ? '<i class="fa-solid fa-share-nodes"></i> Edit Link Bagikan'
    : '<i class="fa-solid fa-share-nodes"></i> Bagikan Link';

  if (item.isFolder) {
    sheetOptDownload.classList.add('hidden');
  } else {
    sheetOptDownload.classList.remove('hidden');
  }

  itemOptionsSheet.classList.remove('hidden');
}

function closeOptionsSheet() {
  itemOptionsSheet.classList.add('hidden');
  selectedItem = null;
}

// Option item actions
sheetOptPin.addEventListener('click', async () => {
  if (selectedItem) {
    const item = selectedItem; // Cache copy to prevent loss reference
    closeOptionsSheet();
    try {
      const res = await fetch(`${API_FILES}/${item.id}/pin`, { method: 'POST' });
      if (res.ok) {
        showToast(item.pinned ? 'Pin dilepas' : 'Berhasil disematkan ke atas', 'success');
        loadFiles();
      } else {
        showToast('Gagal memproses pin', 'error');
      }
    } catch (err) {
      showToast('Koneksi bermasalah', 'error');
    }
  }
});

sheetOptDownload.addEventListener('click', () => {
  if (selectedItem) {
    downloadFile(selectedItem.id);
    closeOptionsSheet();
  }
});

sheetOptShare.addEventListener('click', async () => {
  if (selectedItem) {
    const item = selectedItem; // Cache copy
    closeOptionsSheet();
    openShareModal(item);
  }
});

sheetOptEdit.addEventListener('click', () => {
  if (selectedItem) {
    const item = selectedItem; // Cache copy
    closeOptionsSheet();
    // Text files → open editable text editor
    const ext = (item.name || '').toLowerCase().split('.').pop();
    const type = (item.type || '').toLowerCase();
    if (!item.isFolder && (ext === 'txt' || ext === 'csv' || type === 'text/plain' || type.startsWith('text/'))) {
      openTextNoteEditor(item);
    } else {
      openRenameModal(item);
    }
  }
});

sheetOptDelete.addEventListener('click', async () => {
  if (selectedItem) {
    const item = selectedItem; // Cache copy
    const isConfirmed = confirm(`Hapus "${item.name}" secara permanen?`);
    if (isConfirmed) {
      try {
        const res = await fetch(`${API_FILES}/${item.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || 'Berhasil dihapus', 'success');
          loadFiles();
        } else {
          showToast(data.error || 'Gagal menghapus', 'error');
        }
      } catch (err) {
        showToast('Koneksi bermasalah', 'error');
      }
    }
    closeOptionsSheet();
  }
});

// Close sheet on click overlay
document.querySelector('.sheet-overlay').addEventListener('click', closeOptionsSheet);
btnCloseSheet.addEventListener('click', closeOptionsSheet);

/* ==================== DOWNLOAD FILE ==================== */
function downloadFile(id) {
  window.open(`${API_FILES}/${id}/download`, '_blank');
}

/* ==================== MODAL HELPERS ==================== */
function openModal(modal) {
  modal.classList.add('active');
  const autofocusInput = modal.querySelector('[autofocus]');
  if (autofocusInput) {
    setTimeout(() => autofocusInput.focus(), 100);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.modal.fullscreen').forEach(m => m.classList.remove('fullscreen'));
  // reset media styles back to normal if they were changed
  const previewMb = document.getElementById('modal-image-preview')?.querySelector('.modal-body');
  if (previewMb) previewMb.style.maxHeight = '80vh';
  if (previewImgElement) previewImgElement.style.maxHeight = '70vh';
  if (previewVideoElement) previewVideoElement.style.maxHeight = '70vh';
  if (previewIframeElement) previewIframeElement.style.height = '70vh';

  // Extra cleanup for media elements to prevent audio/video leaking
  if (previewVideoElement) {
    previewVideoElement.pause();
    previewVideoElement.src = '';
  }
  if (previewIframeElement) {
    previewIframeElement.src = '';
  }
}

document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

// Close modal when click backdrop
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (modal.id === 'modal-note') return;
    if (e.target === modal) closeAllModals();
  });
});

/* Fullscreen Handlers */
const btnNoteFullscreen = document.getElementById('btn-note-fullscreen');
if (btnNoteFullscreen) {
  btnNoteFullscreen.addEventListener('click', () => {
    document.getElementById('modal-note').classList.toggle('fullscreen');
  });
}
const btnMediaFullscreen = document.getElementById('btn-media-fullscreen');
if (btnMediaFullscreen) {
  btnMediaFullscreen.addEventListener('click', () => {
    document.getElementById('modal-image-preview').classList.toggle('fullscreen');
    // make sure max-height constraint goes away for preview items when fullscreen
    if (document.getElementById('modal-image-preview').classList.contains('fullscreen')) {
      const mb = document.getElementById('modal-image-preview').querySelector('.modal-body');
      if (mb) mb.style.maxHeight = '100vh';
      if (previewImgElement) previewImgElement.style.maxHeight = '100vh';
      if (previewVideoElement) previewVideoElement.style.maxHeight = '100vh';
      if (previewIframeElement) previewIframeElement.style.height = '100vh';
    } else {
      const mb = document.getElementById('modal-image-preview').querySelector('.modal-body');
      if (mb) mb.style.maxHeight = '80vh';
      if (previewImgElement) previewImgElement.style.maxHeight = '70vh';
      if (previewVideoElement) previewVideoElement.style.maxHeight = '70vh';
      if (previewIframeElement) previewIframeElement.style.height = '70vh';
    }
  });
}

/* ==================== CREATE FOLDER ==================== */
btnNewFolder.addEventListener('click', () => {
  folderForm.reset();
  openModal(modalFolder);
});

folderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = folderNameInput.value.trim();
  if (!name) return;

  try {
    const res = await fetch(`${API_FILES}/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: currentFolderId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Folder berhasil dibuat', 'success');
      closeAllModals();
      loadFiles();
    } else {
      showToast(data.error || 'Gagal membuat folder', 'error');
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
  }
});

/* ==================== CREATE & EDIT TEXT NOTE ==================== */
let editingNoteId = null;
let noteMode = 'preview';

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdownPreview(content) {
  const safeContent = escapeHtml(content || '');
  const linkedMarkdown = safeContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const linkedUrls = linkedMarkdown.replace(/(^|\s)(https?:\/\/[^\s<]+)(?=$|\s|[).,!?])/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  const linkedDomains = linkedUrls.replace(/(^|\s)((?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s<]*)?)(?=$|\s|[).,!?])/g, (match, prefix, url) => {
    if (/^https?:\/\//i.test(url)) return match;
    return `${prefix}<a href="https://${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  const paragraphs = linkedDomains
    .split(/\n{2,}/)
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return paragraphs || '<p></p>';
}

function parseCsvLine(text, separator) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"'; i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (text.substr(i, separator.length) === separator) {
        result.push(current);
        current = '';
        i += separator.length - 1;
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function renderCsvTable(content, separator) {
  if (!content) return '';
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return '';
  let html = '<div style="overflow-x: auto; max-width: 100%;"><table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; text-align: left;">';
  lines.forEach((line, index) => {
    const cols = parseCsvLine(line, separator);
    html += '<tr style="border-bottom: 1px solid var(--border-color);">';
    cols.forEach(col => {
      if (index === 0) {
        html += `<th style="padding: 10px; background: rgba(255,255,255,0.05); color: var(--text-main); font-weight: 600;">${escapeHtml(col)}</th>`;
      } else {
        html += `<td style="padding: 8px 10px; color: var(--text-muted);">${escapeHtml(col)}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</table></div>';
  return html;
}

function updatePreviewContent() {
  if (csvToolbar && !csvToolbar.classList.contains('hidden')) {
    let sep = csvSeparator.value;
    if (sep === 'custom') sep = csvCustomSeparator.value || ',';
    notePreview.innerHTML = renderCsvTable(noteContentInput.value, sep);
  } else {
    notePreview.innerHTML = renderMarkdownPreview(noteContentInput.value);
  }
}

if (csvSeparator) {
  csvSeparator.addEventListener('change', () => {
    csvCustomSeparator.classList.toggle('hidden', csvSeparator.value !== 'custom');
    if (noteMode === 'preview') updatePreviewContent();
  });
  csvCustomSeparator.addEventListener('input', () => {
    if (noteMode === 'preview') updatePreviewContent();
  });
}

function setNoteMode(mode) {
  noteMode = mode;
  const isPreview = mode === 'preview';
  btnNoteView.classList.toggle('active', isPreview);
  btnNoteEdit.classList.toggle('active', !isPreview);
  noteContentInput.classList.toggle('hidden', isPreview);
  notePreview.classList.toggle('hidden', !isPreview);
  noteNameInput.disabled = isPreview;
  if (isPreview) {
    updatePreviewContent();
  }
}

btnNewNote.addEventListener('click', () => {
  editingNoteId = null;
  noteForm.reset();
  noteModalTitle.textContent = 'Buat file Teks';
  btnSaveNote.textContent = 'Simpan';
  noteNameInput.disabled = false;
  noteContentInput.value = '';
  notePreview.innerHTML = '';
  if (csvToolbar) csvToolbar.classList.add('hidden');
  setNoteMode('edit');
  openModal(modalNote);
});

async function openTextNoteEditor(file) {
  editingNoteId = file.id;
  noteModalTitle.textContent = `Edit Catatan: ${file.name}`;
  btnSaveNote.textContent = 'Perbarui';
  noteNameInput.value = file.name.replace(/\.(txt|csv)$/i, '');
  noteContentInput.value = 'Memuat isi catatan...';
  notePreview.innerHTML = '';
  
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  if (csvToolbar) csvToolbar.classList.toggle('hidden', !isCsv);
  if (isCsv && csvSeparator) {
    csvSeparator.value = ',';
    csvCustomSeparator.classList.add('hidden');
  }

  setNoteMode('preview');

  openModal(modalNote);

  try {
    const res = await fetch(`${API_FILES}/${file.id}/content`);
    const data = await res.json();
    if (res.ok) {
      noteContentInput.value = data.content;
      updatePreviewContent();
    } else {
      showToast('Gagal memuat isi catatan', 'error');
      closeAllModals();
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
    closeAllModals();
  }
}

btnNoteView.addEventListener('click', () => setNoteMode('preview'));
btnNoteEdit.addEventListener('click', () => setNoteMode('edit'));

noteContentInput.addEventListener('input', () => {
  if (noteMode === 'preview') {
    updatePreviewContent();
  }
});

noteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = noteNameInput.value.trim();
  const content = noteContentInput.value;
  if (!name) return;

  try {
    let url, method, body;
    if (editingNoteId) {
      url = `${API_FILES}/${editingNoteId}/content`;
      method = 'PUT';
      body = JSON.stringify({ content, name });
    } else {
      url = `${API_FILES}/note`;
      method = 'POST';
      body = JSON.stringify({ name, content, parentId: currentFolderId });
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast(editingNoteId ? 'Catatan berhasil diperbarui' : 'Catatan berhasil dibuat', 'success');
      loadFiles();
      if (editingNoteId) {
        updatePreviewContent();
        setNoteMode('preview');
      } else {
        noteForm.reset();
        noteContentInput.value = '';
        notePreview.innerHTML = '';
        setNoteMode('edit');
      }
    } else {
      showToast(data.error || 'Gagal menyimpan catatan', 'error');
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
  }
});

/* ==================== SHARE LINK GENERATION ==================== */
function openShareModal(item) {
  shareForm.reset();
  shareFileId.value = item.id;
  shareFilename.textContent = item.name;
  shareIcon.className = getFileIconClass(item);
  shareCustomLink.value = item.sharedShortlink || generateRandomShareCode();
  document.getElementById('btn-generate-share').textContent = item.isShared ? 'Perbarui Tautan' : 'Buat Tautan';
  btnCancelShare.classList.toggle('hidden', !item.isShared);
  
  const host = window.location.origin;
  document.getElementById('share-base-url').textContent = `${host}/s/`;
  updateShareLiveUrl();

  shareResultArea.classList.add('hidden');
  openModal(modalShare);
}

function generateRandomShareCode() {
  const length = Math.random() < 0.5 ? 3 : 4;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function updateShareLiveUrl() {
  const base = `${window.location.origin}/s/`;
  const code = (shareCustomLink.value || '').trim();
  shareLiveUrl.value = `${base}${code}`;
}

btnRandomShareCode.addEventListener('click', () => {
  shareCustomLink.value = generateRandomShareCode();
  updateShareLiveUrl();
});

shareCustomLink.addEventListener('input', updateShareLiveUrl);

btnCopyLiveLink.addEventListener('click', () => {
  updateShareLiveUrl();
  shareLiveUrl.select();
  navigator.clipboard.writeText(shareLiveUrl.value);
  showToast('URL link disalin!', 'success');
});

shareForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const fileId = shareFileId.value;
  const customShortlink = shareCustomLink.value.trim();
  const password = sharePassword.value;
  const expiryMinutes = shareExpiry.value;

  try {
    const res = await fetch(API_SHARE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        customShortlink,
        password,
        expiryMinutes,
        existingShortlink: shareCustomLink.value.trim().toLowerCase()
      })
    });
    const data = await res.json();
    if (res.ok) {
      const fullLink = `${window.location.origin}/s/${data.shortlink}`;
      generatedLinkUrl.value = fullLink;
      shareResultArea.classList.remove('hidden');
      showToast('Tautan berhasil dibuat!', 'success');
    } else {
      showToast(data.error || 'Gagal membuat tautan share', 'error');
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
  }
});

btnCopyLink.addEventListener('click', () => {
  generatedLinkUrl.select();
  navigator.clipboard.writeText(generatedLinkUrl.value);
  showToast('Tautan berhasil disalin!', 'success');
});

btnCancelShare.addEventListener('click', async () => {
  const fileId = shareFileId.value;
  if (!fileId) return;

  const isConfirmed = confirm('Matikan link berbagi untuk item ini?');
  if (!isConfirmed) return;

  try {
    const res = await fetch(`/api/share/${fileId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Akses berbagi berhasil dimatikan', 'success');
      closeAllModals();
      loadFiles();
    } else {
      showToast(data.error || 'Gagal mematikan link', 'error');
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
  }
});

/* ==================== RENAME FILE / FOLDER ==================== */
function openRenameModal(item) {
  renameForm.reset();
  renameItemId.value = item.id;
  renameInput.value = item.isFolder ? item.name : item.name.replace(/\.[^/.]+$/, ""); // strip extension for easy editing
  openModal(modalRename);
}

renameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = renameItemId.value;
  const newName = renameInput.value.trim();
  if (!newName) return;

  try {
    const res = await fetch(`${API_FILES}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Berhasil mengubah nama!', 'success');
      closeAllModals();
      loadFiles();
    } else {
      showToast(data.error || 'Gagal mengubah nama', 'error');
    }
  } catch (err) {
    showToast('Koneksi bermasalah', 'error');
  }
});

/* ==================== MULTIPLE UPLOAD & DRAG DROP ==================== */
btnUpload.addEventListener('click', () => {
  pendingUploadFiles = [];
  pendingFolderLabel = '';
  pendingFolderMode = 'preserve';
  uploadQueue.classList.add('hidden');
  folderSummary.classList.add('hidden');
  folderSummaryList.innerHTML = '';
  folderUploadMode.classList.add('hidden');
  folderModeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.folderMode === 'preserve'));
  queueItems.innerHTML = '';
  fileInput.value = '';
  folderInput.value = '';
  btnStartUpload.disabled = false;
  btnStartUpload.textContent = 'Upload';
  openModal(modalUpload);
});

// Drag & drop listeners
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  }, false);
});

dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  stageUploadFiles(Array.from(dt.files), 'flat');
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  stageUploadFiles(Array.from(e.target.files), 'flat');
});

/* ==================== GLOBAL DRAG & DROP ==================== */
const globalDragOverlay = document.getElementById('global-drag-overlay');
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (e.dataTransfer.types.includes('Files')) {
    dragCounter++;
    globalDragOverlay.classList.remove('hidden');
    globalDragOverlay.classList.add('drag-active');
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  if (e.dataTransfer.types.includes('Files')) {
    dragCounter--;
    if (dragCounter === 0) {
      globalDragOverlay.classList.remove('drag-active');
      globalDragOverlay.classList.add('hidden');
    }
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  globalDragOverlay.classList.remove('drag-active');
  globalDragOverlay.classList.add('hidden');

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const dt = e.dataTransfer;
    // Reset upload state
    pendingUploadFiles = [];
    pendingFolderLabel = '';
    pendingFolderMode = 'preserve';
    uploadQueue.classList.add('hidden');
    folderSummary.classList.add('hidden');
    folderSummaryList.innerHTML = '';
    folderUploadMode.classList.add('hidden');
    queueItems.innerHTML = '';
    fileInput.value = '';
    folderInput.value = '';
    btnStartUpload.disabled = false;
    btnStartUpload.textContent = 'Upload';
    
    openModal(modalUpload);
    stageUploadFiles(Array.from(dt.files), 'flat');
  }
});

btnPickFolder.addEventListener('click', async () => {
  try {
    if (window.showDirectoryPicker) {
      const dirHandle = await window.showDirectoryPicker();
      const files = await collectFilesFromDirectoryHandle(dirHandle);
      stageUploadFiles(files, 'folder', dirHandle.name, 'preserve');
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
  }
  folderInput.click();
});

folderInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  stageUploadFiles(files, 'folder', inferFolderLabel(files), 'preserve');
});

folderModeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.folderMode;
    pendingFolderMode = mode;
    folderModeButtons.forEach(item => item.classList.toggle('active', item === btn));
    if (pendingUploadFiles.length > 0) {
      stageUploadFiles(pendingUploadFiles, 'folder', pendingFolderLabel, mode);
    }
  });
});

btnStartUpload.addEventListener('click', () => {
  handleFilesUpload();
});

async function collectFilesFromDirectoryHandle(dirHandle, prefix = '') {
  const files = [];
  for await (const entry of dirHandle.values()) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      Object.defineProperty(file, 'webkitRelativePath', {
        value: entryPath,
        configurable: true
      });
      files.push(file);
    } else if (entry.kind === 'directory') {
      files.push(...await collectFilesFromDirectoryHandle(entry, entryPath));
    }
  }
  return files;
}

function stageUploadFiles(files, mode = 'file', folderLabel = '', folderMode = pendingFolderMode) {
  if (!files || files.length === 0) return;

  pendingUploadFiles = files;
  pendingFolderLabel = mode === 'folder' ? (folderLabel || inferFolderLabel(files)) : '';
  pendingFolderMode = mode === 'folder' ? folderMode : 'preserve';
  folderUploadMode.classList.toggle('hidden', mode !== 'folder');
  folderModeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.folderMode === pendingFolderMode));
  const summary = buildUploadSummary(files, pendingFolderLabel, pendingFolderMode);

  folderSummary.classList.remove('hidden');
  folderSummaryName.textContent = summary.folderName;
  folderSummaryCount.textContent = `${summary.count} file` + (summary.count === 1 ? '' : 's');
  folderSummarySize.textContent = formatBytes(summary.totalSize);
  folderSummaryList.innerHTML = summary.items.map(item => `
    <div class="folder-summary-item">
      <div class="folder-summary-path">${item.path}</div>
      <div class="folder-summary-size">${formatBytes(item.size)}</div>
    </div>
  `).join('');

  uploadQueue.classList.remove('hidden');
  queueItems.innerHTML = '';
  btnStartUpload.disabled = false;
  btnStartUpload.textContent = 'Upload';
}

function buildUploadSummary(files, folderLabel, folderMode = 'preserve') {
  const items = files.map(file => {
    const path = folderMode === 'flat' ? file.name : (file.webkitRelativePath || file.name);
    return { path, size: file.size };
  });
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  return {
    folderName: folderLabel || (files.length > 1 ? 'Kumpulan file' : files[0]?.name || 'File'),
    count: files.length,
    totalSize,
    items: items.slice(0, 20)
  };
}

function inferFolderLabel(files) {
  const firstPath = files.find(f => f.webkitRelativePath)?.webkitRelativePath || files[0]?.name || '';
  const root = firstPath.split('/')[0];
  return root || 'Folder';
}

function buildUploadSummary(files, folderLabel) {
  const items = files.map(file => {
    const path = file.webkitRelativePath || file.name;
    return { path, size: file.size };
  });
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  return {
    folderName: folderLabel || (files.length > 1 ? 'Kumpulan file' : files[0]?.name || 'File'),
    count: files.length,
    totalSize,
    items: items.slice(0, 20)
  };
}

function handleFilesUpload() {
  if (pendingUploadFiles.length === 0) {
    showToast('Pilih file atau folder dulu sebelum upload', 'error');
    return;
  }
  
  queueItems.innerHTML = '';
  uploadQueue.classList.remove('hidden');
  btnStartUpload.disabled = true;
  btnStartUpload.textContent = 'Mengupload...';
  const tempMode = tempModeSelect.value;
  let uploadSuccessCount = 0;
  let uploadDoneCount = 0;

  pendingUploadFiles.forEach(file => {
    uploadSingleFile(file, tempMode, () => {
      uploadSuccessCount += 1;
    }, () => {
      uploadDoneCount += 1;
      if (uploadDoneCount === pendingUploadFiles.length) {
        btnStartUpload.disabled = false;
        btnStartUpload.textContent = 'Selesai';
        showToast(`Berhasil upload ${uploadSuccessCount} file`, 'success');
        setTimeout(() => {
          closeAllModals();
          loadFiles();
          pendingUploadFiles = [];
        }, 450);
      }
    });
  });
}

function uploadSingleFile(file, tempMode, onSuccess, onDone, conflictMode = 'ask') {
  // Create UI indicator in upload modal queue list
  const queueId = 'q-' + Math.random().toString(36).substring(2, 9);
  const itemEl = document.createElement('div');
  itemEl.className = 'queue-item';
  itemEl.id = queueId;
  itemEl.innerHTML = `
    <div class="queue-item-header">
      <span class="queue-item-name">${file.name}</span>
      <span class="queue-item-status" id="status-${queueId}">0%</span>
    </div>
    <div class="queue-progress-bar">
      <div class="queue-progress-fill" id="progress-${queueId}"></div>
    </div>
  `;
  queueItems.appendChild(itemEl);

  const sendUpload = (mode) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('files', file);
    formData.append('parentId', currentFolderId || 'null');
    formData.append('tempMode', tempMode);
    formData.append('conflictMode', mode);
    if (pendingFolderMode === 'preserve') {
      formData.append('relativePath', file.webkitRelativePath || file.name);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        document.getElementById(`progress-${queueId}`).style.width = percent + '%';
        document.getElementById(`status-${queueId}`).textContent = percent + '%';
      }
    });

    xhr.addEventListener('load', () => {
      const fill = document.getElementById(`progress-${queueId}`);
      const statusText = document.getElementById(`status-${queueId}`);

      if (xhr.status >= 200 && xhr.status < 300) {
        fill.classList.add('success');
        statusText.textContent = 'Berhasil';
        statusText.style.color = 'var(--success)';
        loadFiles();
        if (typeof onSuccess === 'function') onSuccess();
      } else if (xhr.status === 409 && mode === 'ask') {
        fill.classList.add('error');
        statusText.textContent = 'Konflik';
        statusText.style.color = 'var(--warning, #f59e0b)';
        const useReplace = confirm(`File "${file.name}" sudah ada di folder ini.\nOK = Replace\nCancel = Buat nama lain otomatis`);
        sendUpload(useReplace ? 'replace' : 'rename');
        return;
      } else {
        fill.classList.add('error');
        statusText.textContent = 'Gagal';
        statusText.style.color = 'var(--danger)';
        showToast(`Upload gagal: ${file.name}`, 'error');
      }
      if (typeof onDone === 'function') onDone();
    });

    xhr.addEventListener('error', () => {
      const fill = document.getElementById(`progress-${queueId}`);
      const statusText = document.getElementById(`status-${queueId}`);
      fill.classList.add('error');
      statusText.textContent = 'Error';
      statusText.style.color = 'var(--danger)';
      showToast(`Gangguan koneksi: ${file.name}`, 'error');
      if (typeof onDone === 'function') onDone();
    });

    xhr.open('POST', `${API_FILES}/upload`);
    xhr.send(formData);
  };

  sendUpload(conflictMode);
}

// Initial authentication verify on page render
checkAuth();
updateBreadcrumbs();

/* ==================== STYLE SETTINGS PANEL ==================== */
(function initStyleSettings() {
  const btnStyleSettings = document.getElementById('btn-style-settings');
  const stylePanel = document.getElementById('style-settings-panel');
  const toggleDate = document.getElementById('toggle-show-date');
  const toggleSize = document.getElementById('toggle-show-size');

  // Load from localStorage
  const saved = JSON.parse(localStorage.getItem('driveku_style') || '{}');
  const showDate = saved.showDate !== false; // default true
  const showSize = saved.showSize !== false; // default true

  toggleDate.checked = showDate;
  toggleSize.checked = showSize;
  applyStylePrefs(showDate, showSize);

  function applyStylePrefs(date, size) {
    document.body.classList.toggle('hide-date', !date);
    document.body.classList.toggle('hide-size', !size);
  }

  function saveStylePrefs() {
    localStorage.setItem('driveku_style', JSON.stringify({
      showDate: toggleDate.checked,
      showSize: toggleSize.checked
    }));
  }

  // Toggle panel open/close
  btnStyleSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = stylePanel.classList.toggle('open');
    btnStyleSettings.classList.toggle('active', isOpen);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#style-settings-wrap')) {
      stylePanel.classList.remove('open');
      btnStyleSettings.classList.remove('active');
    }
  });

  // Toggle listeners
  toggleDate.addEventListener('change', () => {
    applyStylePrefs(toggleDate.checked, toggleSize.checked);
    saveStylePrefs();
  });

  toggleSize.addEventListener('change', () => {
    applyStylePrefs(toggleDate.checked, toggleSize.checked);
    saveStylePrefs();
  });
})();
