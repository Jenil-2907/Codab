import * as dom from '../utils/dom.js';

let isDrawing = false;
let currentColor = 'black';
let currentPenSize = 2;
let lastX = 0;
let lastY = 0;
let currentTool = 'pen';
let socketRef = null;
let roomIdRef = null;

export function initDrawing(socket, roomId) {
    socketRef = socket;
    roomIdRef = roomId;
    
    dom.drawboardBtn.addEventListener('click', openDrawingBoard);
    dom.closeModalBtn.addEventListener('click', closeDrawingBoard);
    dom.clearCanvasBtn.addEventListener('click', clearCanvas);

    window.addEventListener('resize', resizeCanvas);
    dom.drawingCanvas.addEventListener('mousedown', startDrawing);
    dom.drawingCanvas.addEventListener('mousemove', draw);
    dom.drawingCanvas.addEventListener('mouseup', endDrawing);
    dom.drawingCanvas.addEventListener('mouseout', endDrawing);

    dom.colorPicker.forEach(color => {
        color.addEventListener('click', () => {
            currentColor = color.dataset.color;
            document.querySelector('.color.selected')?.classList.remove('selected');
            color.classList.add('selected');
        });
    });

    dom.penTypes.forEach(pen => {
        pen.addEventListener('click', () => {
            currentPenSize = parseInt(pen.dataset.size);
            document.querySelector('.pen-type.selected')?.classList.remove('selected');
            pen.classList.add('selected');
        });
    });

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = btn.dataset.tool;
            document.querySelector('.tool-btn.selected')?.classList.remove('selected');
            btn.classList.add('selected');
            if (currentTool === 'eraser') {
                dom.drawingCanvas.classList.add('eraser-mode');
            } else {
                dom.drawingCanvas.classList.remove('eraser-mode');
            }
        });
    });
}

function resizeCanvas() {
    const canvas = dom.drawingCanvas;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getCanvasPosition(e);
    [lastX, lastY] = [pos.x, pos.y];
}

function draw(e) {
    if (!isDrawing) return;
    const ctx = dom.drawingCanvas.getContext('2d');
    const pos = getCanvasPosition(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
    }
    
    ctx.lineWidth = currentPenSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    if (socketRef) {
        socketRef.emit('drawing', {
            roomId: roomIdRef,
            startX: lastX,
            startY: lastY,
            endX: pos.x,
            endY: pos.y,
            color: currentTool === 'eraser' ? 'eraser' : currentColor,
            size: currentPenSize,
            tool: currentTool
        });
    }
    [lastX, lastY] = [pos.x, pos.y];
}

function endDrawing() { isDrawing = false; }

function getCanvasPosition(e) {
    const rect = dom.drawingCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function clearCanvas() {
    const ctx = dom.drawingCanvas.getContext('2d');
    ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
    if (socketRef) socketRef.emit('clear-canvas', { roomId: roomIdRef });
}

function openDrawingBoard() {
    dom.drawboardModal.style.display = 'block';
    resizeCanvas();
    if (socketRef) socketRef.emit('request-canvas-state', roomIdRef);
}

export function closeDrawingBoard() {
    dom.drawboardModal.style.display = 'none';
}
