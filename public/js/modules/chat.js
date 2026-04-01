import * as dom from '../utils/dom.js';

let isChatOpen = false;
let unreadMessages = 0;
let socketRef = null;
let roomIdRef = null;
let userNameRef = null;

export function initChat(socket, roomId, userName) {
    socketRef = socket;
    roomIdRef = roomId;
    userNameRef = userName;

    dom.openChatBtn.addEventListener('click', () => {
        isChatOpen = true;
        unreadMessages = 0;
        document.querySelector('.notification-dot')?.classList.remove('active');
        dom.chatContainer.classList.add('active');
        dom.sidebarContent.style.display = 'none';
        if (dom.chatMessages) dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    });

    dom.backFromChatBtn.addEventListener('click', () => {
        isChatOpen = false;
        dom.chatContainer.classList.remove('active');
        dom.sidebarContent.style.display = 'flex';
    });

    dom.sendBtn.addEventListener('click', sendMessage);

    dom.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function sendMessage() {
    const message = dom.messageInput.value.trim();
    if (message && roomIdRef && userNameRef) {
        socketRef.emit('chat-message', {
            roomId: roomIdRef,
            message: message,
            sender: userNameRef
        });
        dom.messageInput.value = '';
        dom.messageInput.focus();
    }
}

export function handleIncomingMessage(data, showToast) {
    if (!dom.chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';

    const senderSpan = document.createElement('span');
    senderSpan.className = 'sender';
    senderSpan.textContent = `${data.sender}: `;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'message-text';
    messageSpan.textContent = data.message;

    messageElement.appendChild(senderSpan);
    messageElement.appendChild(messageSpan);
    dom.chatMessages.appendChild(messageElement);

    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    
    if (!isChatOpen) {
        unreadMessages++;
        document.querySelector('.notification-dot')?.classList.add('active');
        if (showToast) showToast(`New message from ${data.sender}`, 'info');
    }
}
