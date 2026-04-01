import * as dom from '../utils/dom.js';

let activeMessage = null;
export const currentUsers = new Map();

export function showTemporaryMessage(message, duration = 3000) {
    if (activeMessage) {
        activeMessage.element.remove();
        clearTimeout(activeMessage.timeout);
    }
    const p = document.createElement("p");
    p.innerText = message;
    p.className = 'temp-message';
    dom.messages.appendChild(p);
    
    const timeout = setTimeout(() => {
        p.classList.add('fade-out');
        setTimeout(() => {
            if (p.parentNode) p.remove();
            if (activeMessage?.element === p) activeMessage = null;
        }, 500);
    }, duration - 500);
    activeMessage = { element: p, timeout: timeout };
}

export function addUserBox(userId, userName) {
    if (!currentUsers.has(userId)) {
        const userBox = document.createElement('div');
        userBox.className = 'user-box';
        userBox.id = `user-${userId}`;
        
        const userColor = document.createElement('div');
        userColor.className = 'user-color';
        userColor.style.backgroundColor = getRandomColor();
        
        const userNameElement = document.createElement('div');
        userNameElement.className = 'user-name';
        userNameElement.textContent = userName;
        
        userBox.appendChild(userColor);
        userBox.appendChild(userNameElement);
        dom.usersList.appendChild(userBox);
        
        currentUsers.set(userId, userName);
        updateUserCount();
    }
}

export function removeUserBox(userId) {
    if (currentUsers.has(userId)) {
        const userBox = document.getElementById(`user-${userId}`);
        if (userBox) userBox.remove();
        currentUsers.delete(userId);
        updateUserCount();
    }
}

function updateUserCount() {
    dom.userCount.textContent = `${currentUsers.size} user(s) online`;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
    return color;
}

export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('notification-toast');
    const toastMessage = document.getElementById('toast-message');
    const icon = toast.querySelector('i');
    
    icon.className = 'fas';
    switch (type) {
        case 'success': icon.classList.add('fa-check-circle'); break;
        case 'error': icon.classList.add('fa-exclamation-circle'); break;
        default: icon.classList.add('fa-info-circle');
    }
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.classList.remove('show'), duration);
}

export function showUserNotification(userName, type) {
    const notification = document.getElementById('user-notification');
    const content = notification.querySelector('.user-notification-content');
    const icon = notification.querySelector('i');
    
    icon.className = 'fas';
    if (type === 'join') {
        icon.classList.add('fa-user-plus');
        notification.classList.add('join');
        notification.classList.remove('leave');
        content.innerHTML = `<span class="user-name">${userName}</span> joined the room`;
    } else {
        icon.classList.add('fa-user-minus');
        notification.classList.add('leave');
        notification.classList.remove('join');
        content.innerHTML = `<span class="user-name">${userName}</span> left the room`;
    }
    
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

export function showUploadStatus(message, type = 'info') {
    dom.uploadStatus.textContent = message;
    dom.uploadStatus.className = 'status-message';
    if (type === 'loading') {
        dom.uploadStatus.innerHTML = `<span class="loading-spinner"></span> ${message}`;
    } else if (type === 'success') {
        dom.uploadStatus.classList.add('success-message');
    } else if (type === 'error') {
        dom.uploadStatus.classList.add('error-message');
    }
    if (type !== 'loading') {
        setTimeout(() => {
            dom.uploadStatus.textContent = '';
            dom.uploadStatus.className = 'status-message';
        }, type === 'error' ? 5000 : 3000);
    }
}
