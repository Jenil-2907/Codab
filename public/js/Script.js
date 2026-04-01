document.addEventListener('DOMContentLoaded', () => {
    const joinRoomForm = document.getElementById('joinRoomForm');
    const generateRoomBtn = document.getElementById('generateRoomId');
    const errorMsg = document.getElementById('error-message');

    // Handle form submission (Join Room)
    joinRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const roomId = document.getElementById('roomId').value.trim();
        const userName = document.getElementById('userName').value.trim();
        const password = document.getElementById('password').value;

        if (!roomId || !userName || !password) {
            errorMsg.innerText = "Please fill all fields.";
            return;
        }

        try {
            const res = await fetch('/join-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, userName, password })
            });
            const data = await res.json();

            if (res.ok) {
                sessionStorage.setItem('codab_token', data.token);
                window.location.href = `/room.html?roomId=${roomId}&userName=${userName}`;
            } else {
                errorMsg.innerText = data.error || "Failed to join room.";
            }
        } catch (err) {
            errorMsg.innerText = "Network error. Server might be down.";
        }
    });

    // Handle Create New Room
    generateRoomBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const userName = document.getElementById('userName').value.trim();
        const password = document.getElementById('password').value;

        if (!userName || !password) {
            errorMsg.innerText = "Enter Username & Password to create a room.";
            return;
        }

        try {
            const res = await fetch('/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName, password })
            });
            const data = await res.json();

            if (res.ok) {
                sessionStorage.setItem('codab_token', data.token);
                window.location.href = `/room.html?roomId=${data.roomId}&userName=${userName}`;
            } else {
                errorMsg.innerText = data.error || "Failed to create room.";
            }
        } catch (err) {
            errorMsg.innerText = "Network error. Server might be down.";
        }
    });
});
