// Get the server URL dynamically
const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : `http://${window.location.hostname}:3000`;

const socket = io(serverUrl);

import { roomDetails, fileList, editorTabs, editorContainer, newFileBtn, fileUpload, uploadBtn, runCodeBtn, executionResult } from './utils/dom.js';
import { initDrawing } from './modules/drawing.js';
import { initChat, handleIncomingMessage } from './modules/chat.js';
import { showTemporaryMessage, addUserBox, removeUserBox, showToast, showUserNotification, showUploadStatus, currentUsers } from './modules/ui.js';

// Get room ID and username from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const userName = urlParams.get('userName');

// Application state
let files = {};
let activeFileId = null;

// Initialize the room
const token = sessionStorage.getItem('codab_token');

if (!token) {
    alert("Unauthorized! Please log in to access this room.");
    window.location.href = '/';
} else if (roomId && userName) {
    socket.emit('join-room', roomId, userName, token);
    roomDetails.textContent = `Room ID: ${roomId}`;

    roomDetails.addEventListener('click', () => {
        const tempInput = document.createElement('input');
        tempInput.value = roomId;
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999);
        const success = document.execCommand('copy');
        document.body.removeChild(tempInput);

        if (success) showToast("Room ID copied!", "success");
        else showToast("Failed to copy Room ID.", "error");
    });
}

// Module Initializations
initChat(socket, roomId, userName);
document.addEventListener('DOMContentLoaded', () => initDrawing(socket, roomId));

// Event listeners
newFileBtn.addEventListener('click', createNewFileHandler);
uploadBtn.addEventListener('click', () => fileUpload.click());
fileUpload.addEventListener('change', handleFileUpload);

document.querySelectorAll('.io-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.io-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.io-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetPanel = document.getElementById(tab.dataset.target);
        if (targetPanel) targetPanel.classList.add('active');
    });
});

runCodeBtn.addEventListener('click', async () => {
    if (!activeFileId) {
        executionResult.textContent = 'No active file to run.';
        return;
    }

    const code = files[activeFileId].content;
    const fileName = files[activeFileId].name;
    const lang = detectLanguageFromFile(fileName);
    const stdin = document.getElementById('custom-input')?.value || '';

    executionResult.innerHTML = '<div class="loading-spinner"></div> Running code...';
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch('/run-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ code, language: lang, stdin, timestamp: Date.now() }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const result = await res.json();
        let output = result.run?.stdout || (result.run?.stderr ? `Error: ${result.run.stderr}` : (result.error ? `Error: ${result.error}` : 'No output'));

        const pre = document.createElement('pre');
        pre.textContent = output;
        executionResult.innerHTML = '';
        executionResult.appendChild(pre);
    } catch (err) {
        if (err.name === 'AbortError') executionResult.textContent = 'Error: Code execution timed out after 10 seconds';
        else executionResult.textContent = 'Error: ' + (err.message || 'Failed to execute code');
    }
});

function detectLanguageFromFile(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const languageMap = { 'py': 'python3', 'js': 'javascript', 'java': 'java', 'cpp': 'cpp', 'cc': 'cpp', 'c': 'c', 'cs': 'csharp', 'go': 'go', 'rb': 'ruby', 'php': 'php', 'rs': 'rust', 'ts': 'typescript', 'kt': 'kotlin', 'scala': 'scala', 'swift': 'swift' };
    return languageMap[ext] || 'python3';
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['text/plain', 'application/javascript', 'text/html', 'text/css', 'application/json', 'text/markdown', 'text/x-python', 'text/x-java', 'text/x-c', 'text/x-c++', 'application/pdf', 'image/jpeg', 'image/png', 'application/octet-stream'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(js|html|css|json|md|py|java|c|cpp|h|hpp)$/)) {
        showUploadStatus(`Error: ${file.type} files are not allowed.`, 'error');
        fileUpload.value = '';
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showUploadStatus('Error: File size exceeds 10MB limit', 'error');
        fileUpload.value = '';
        return;
    }

    showUploadStatus(`Uploading ${file.name}...`, 'loading');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    
    try {
        const response = await fetch(`/upload-file?roomId=${roomId}`, { method: 'POST', body: formData });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        if (data.success) {
            showUploadStatus(`Successfully uploaded ${file.name}`, 'success');
            if (!files[data.fileId]) {
                files[data.fileId] = { id: data.fileId, name: data.fileName, content: data.content, isBinary: data.isBinary, isUploadedFile: true };
                createFileUI(data.fileId, data.fileName, data.content, true);
                switchToFile(data.fileId);
            }
        } else {
            showUploadStatus(`Upload failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (err) {
        showUploadStatus(`Upload failed: ${err.message}`, 'error');
    } finally {
        fileUpload.value = '';
    }
}

function createNewFileHandler() {
    const fileName = prompt("Enter file name (with extension):");
    if (fileName) createNewFile(fileName);
}

function createNewFile(fileName) {
    const fileId = 'file-' + Date.now();
    files[fileId] = { id: fileId, name: fileName, content: '', isUploadedFile: false };
    createFileUI(fileId, fileName);
    switchToFile(fileId);
    socket.emit('file-created', { roomId, fileId, fileName, isUploadedFile: false });
}

function createFileUI(fileId, fileName, initialContent = '', isUploadedFile = false) {
    const tab = document.createElement('div');
    tab.className = 'editor-tab';
    tab.dataset.fileId = fileId;
    
    const tabName = document.createElement('span');
    tabName.textContent = fileName;
    tab.appendChild(tabName);
    
    const tabActions = document.createElement('div');
    tabActions.className = 'tab-actions';
    
    const downloadBtn = document.createElement('span');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = '⭳';
    downloadBtn.onclick = (e) => { e.stopPropagation(); downloadFile(fileId, fileName); };
    tabActions.appendChild(downloadBtn);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close this file';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeFile(fileId); });
    tabActions.appendChild(closeBtn);
    
    tab.appendChild(tabActions);
    tab.addEventListener('click', () => switchToFile(fileId));
    editorTabs.appendChild(tab);
    
    const editorDiv = document.createElement('div');
    editorDiv.className = 'editor-content';
    editorDiv.dataset.fileId = fileId;
    editorContainer.appendChild(editorDiv);

    const isBinary = files[fileId]?.isBinary || initialContent === '[Binary file content]';
    if (isBinary) {
        const binaryMessage = document.createElement('div');
        binaryMessage.className = 'binary-file-message';
        binaryMessage.innerHTML = `<p>This is a binary file and cannot be displayed in the editor.</p><p>You can download it using the download button (⭳) in the tab.</p>`;
        editorDiv.appendChild(binaryMessage);
    } else {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs' }});
        require(['vs/editor/editor.main'], function() {
            const editor = monaco.editor.create(editorDiv, {
                value: initialContent || '',
                language: detectLanguageFromFile(fileName),
                theme: 'vs-dark',
                automaticLayout: true,
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: "'Space Mono', monospace",
                lineHeight: 1.5,
                tabSize: 4,
                renderWhitespace: 'selection',
                wordWrap: 'on',
                padding: { top: 15, bottom: 15 },
                quickSuggestions: false,
                parameterHints: { enabled: false },
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: 'off',
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                renderLineHighlight: 'none',
                occurrencesHighlight: false,
                cursorBlinking: 'solid',
                formatOnType: false,
                formatOnPaste: false,
                selectionHighlight: false,
                matchBrackets: 'never',
                renderIndentGuides: false
            });

            editorDiv.editor = editor;
            let isUpdatingContent = false;
            let updateTimeout = null;

            editor.onDidChangeModelContent((event) => {
                if (isUpdatingContent) return;
                const content = editor.getValue();
                files[fileId].content = content;
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => handleFileEdit(fileId, content), 50);
            });

            editorDiv.updateContent = (content) => {
                if (editor.getValue() === content) return;
                isUpdatingContent = true;
                const viewState = editor.saveViewState();
                editor.setValue(content);
                if (viewState) editor.restoreViewState(viewState);
                isUpdatingContent = false;
            };
        });
    }
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileId = fileId;
    
    const fileItemName = document.createElement('span');
    fileItemName.className = 'file-item-name';
    fileItemName.textContent = fileName;
    fileItem.appendChild(fileItemName);
    
    const fileActions = document.createElement('div');
    fileActions.className = 'file-actions';
    
    const downloadBtnFile = document.createElement('span');
    downloadBtnFile.className = 'file-btn download-btn';
    downloadBtnFile.innerHTML = '↓';
    downloadBtnFile.title = 'Download this file';
    downloadBtnFile.addEventListener('click', (e) => { e.stopPropagation(); downloadFile(fileId, fileName); });
    fileActions.appendChild(downloadBtnFile);
    
    const closeBtnFile = document.createElement('span');
    closeBtnFile.className = 'file-btn';
    closeBtnFile.innerHTML = '×';
    closeBtnFile.title = 'Close this file';
    closeBtnFile.addEventListener('click', (e) => { e.stopPropagation(); closeFile(fileId); });
    fileActions.appendChild(closeBtnFile);
    
    fileItem.appendChild(fileActions);
    fileItem.addEventListener('click', () => switchToFile(fileId));
    fileList.appendChild(fileItem);
}

function closeFile(fileId) {
    if (!files[fileId]) return;
    if (files[fileId]?.isUploadedFile && files[fileId]?.path) {
        const storedFilename = files[fileId].path.split('/').pop();
        fetch(`/delete-file/${roomId}/${storedFilename}`, { method: 'DELETE' }).catch(console.error);
    }
    delete files[fileId];
    document.querySelectorAll(`[data-file-id="${fileId}"]`).forEach(el => el.remove());
    if (activeFileId === fileId) {
        activeFileId = null;
        const remainingFiles = Object.keys(files);
        if (remainingFiles.length > 0) switchToFile(remainingFiles[0]);
        else { editorContainer.innerHTML = ''; editorTabs.innerHTML = ''; }
    }
    try { socket.emit('file-deleted', { roomId, fileId }); } catch (error) { console.error(error); }
}

function switchToFile(fileId) {
    document.querySelectorAll('.editor-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.fileId === fileId));
    document.querySelectorAll('.editor-content').forEach(editorDiv => {
        const isActive = editorDiv.dataset.fileId === fileId;
        editorDiv.style.display = isActive ? 'block' : 'none';
        if (isActive && editorDiv.editor) { editorDiv.editor.setValue(files[fileId].content); editorDiv.editor.layout(); }
    });
    activeFileId = fileId;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedFileEdit = debounce((fileId, content) => { socket.emit('file-update', { roomId, fileId, content }); }, 100);

function handleFileEdit(fileId, content) {
    if (!files[fileId]) return;
    files[fileId].content = content;
    debouncedFileEdit(fileId, content);
}

function downloadFile(fileId, fileName) {
    fetch(`/download-file/${roomId}/${fileId}`)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
}

// Socket event listeners
socket.on('error', (message) => {
    alert(message);
    sessionStorage.removeItem('codab_token');
    window.location.href = '/';
});

socket.on('message', showTemporaryMessage);
socket.on('chat-message', (data) => handleIncomingMessage(data, showToast));

socket.on('user-joined', ({ userId, userName }) => {
    addUserBox(userId, userName);
    showUserNotification(userName, 'join');
});

socket.on('user-left', ({ userId, userName }) => {
    removeUserBox(userId);
    showUserNotification(userName, 'leave');
});

socket.on('file-created', (data) => {
    if (!files[data.fileId]) {
      files[data.fileId] = { id: data.fileId, name: data.fileName, content: data.content || '', isUploadedFile: data.isUploadedFile || false, path: data.path || '' };
      createFileUI(data.fileId, data.fileName, data.content, data.isUploadedFile);
      switchToFile(data.fileId);
    }
});

socket.on('file-updated', (data) => {
    if (!files[data.fileId]) return;
    files[data.fileId].content = data.content;
    const editorDiv = document.querySelector(`.editor-content[data-file-id="${data.fileId}"]`);
    if (!editorDiv?.editor) return;
    const editor = editorDiv.editor;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() === data.content) return;
    
    if (activeFileId === data.fileId) {
        const position = editor.getPosition();
        const selections = editor.getSelections();
        editorDiv.updateContent(data.content);
        if (position) editor.setPosition(position);
        if (selections?.length) editor.setSelections(selections);
    } else {
        editorDiv.updateContent(data.content);
    }
});

socket.on('file-closed', (data) => {
    if (data.roomId !== roomId) return;
    if (!files[data.fileId]) return;
    
    if (files[data.fileId]?.isUploadedFile && files[data.fileId]?.path) {
        const storedFilename = files[data.fileId].path.split('/').pop();
        fetch(`/delete-file/${roomId}/${storedFilename}`, { method: 'DELETE' }).catch(console.error);
    }

    delete files[data.fileId];
    document.querySelectorAll(`[data-file-id="${data.fileId}"]`).forEach(el => el.remove());
    if (activeFileId === data.fileId) {
        activeFileId = null;
        const remainingFiles = Object.keys(files);
        if (remainingFiles.length > 0) switchToFile(remainingFiles[0]);
        else { editorContainer.innerHTML = ''; editorTabs.innerHTML = ''; }
    }
});

socket.on('room-state', (state) => {
    editorTabs.innerHTML = '';
    editorContainer.innerHTML = '';
    fileList.innerHTML = '';
    const usersList = document.getElementById('usersList');
    if (usersList) usersList.innerHTML = '';
    currentUsers.clear();
    
    files = state.files;
    Object.values(files).forEach(file => {
        createFileUI(file.id, file.name, file.content, file.isUploadedFile);
    });
    
    state.users.forEach(user => addUserBox(user.id, user.name));
    if (!activeFileId && Object.keys(files).length > 0) {
        switchToFile(Object.keys(files)[0]);
    }
});
