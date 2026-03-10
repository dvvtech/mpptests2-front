/**
 * canvas.js — Работа с canvas: рисование, поворот, масштаб, undo/redo, pan
 */

const CanvasModule = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panStartOffsetX: 0,
    panStartOffsetY: 0,

    init() {
        const canvas = App.canvas;
        if (!canvas) return;

        // Mouse events
        canvas.addEventListener('mousedown',  e => this.onPointerDown(e));
        canvas.addEventListener('mousemove',  e => this.onPointerMove(e));
        canvas.addEventListener('mouseup',    e => this.onPointerUp(e));
        canvas.addEventListener('mouseleave', e => this.onPointerUp(e));

        // Touch events
        canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove',  e => this.onTouchMove(e),  { passive: false });
        canvas.addEventListener('touchend',   e => this.onTouchEnd(e));

        // Wheel zoom
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            wrapper.addEventListener('wheel', e => this.onWheel(e), { passive: false });
        }

        this.applyTransform();
    },

    // ─── Pointer position (canvas coordinates) ────────────────────
    getCanvasPos(e) {
        const canvas = App.canvas;
        const rect   = canvas.getBoundingClientRect();

        // Center of transformed canvas on screen
        const screenCenterX = rect.left + rect.width / 2;
        const screenCenterY = rect.top + rect.height / 2;

        // Offset from screen center
        let dx = e.clientX - screenCenterX;
        let dy = e.clientY - screenCenterY;

        // Inverse rotation (opposite direction)
        const angle = App.state.rotation % 360;
        if (angle !== 0) {
            const rad = -angle * Math.PI / 180;
            const rdx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rdy = dx * Math.sin(rad) + dy * Math.cos(rad);
            dx = rdx;
            dy = rdy;
        }

        // Inverse scale
        const s = App.state.scale;
        dx /= s;
        dy /= s;

        // Convert to canvas coordinates
        const x = canvas.width / 2 + dx;
        const y = canvas.height / 2 + dy;

        return { x, y };
    },

    // ─── Mouse events ─────────────────────────────────────────────
    onPointerDown(e) {
        e.preventDefault();
        if (App.state.isPanMode) {
            this.isPanning  = true;
            this.panStartX  = e.clientX;
            this.panStartY  = e.clientY;
            this.panStartOffsetX = App.state.offsetX;
            this.panStartOffsetY = App.state.offsetY;
        } else {
            this.isDrawing = true;
            const pos = this.getCanvasPos(e);
            this.lastX = pos.x;
            this.lastY = pos.y;
            this.drawDot(pos.x, pos.y);
        }
    },

    onPointerMove(e) {
        e.preventDefault();
        if (App.state.isPanMode && this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            App.state.offsetX = this.panStartOffsetX + dx;
            App.state.offsetY = this.panStartOffsetY + dy;
            this.applyTransform();
        } else if (this.isDrawing) {
            const pos = this.getCanvasPos(e);
            this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
            this.lastX = pos.x;
            this.lastY = pos.y;
        }
    },

    onPointerUp(e) {
        if (this.isDrawing) {
            this.isDrawing = false;
            App.saveState();
        }
        this.isPanning = false;
    },

    // ─── Touch events ─────────────────────────────────────────────
    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (App.state.isPanMode) {
                this.isPanning  = true;
                this.panStartX  = touch.clientX;
                this.panStartY  = touch.clientY;
                this.panStartOffsetX = App.state.offsetX;
                this.panStartOffsetY = App.state.offsetY;
            } else {
                this.isDrawing = true;
                const pos = this.getTouchCanvasPos(touch);
                this.lastX = pos.x;
                this.lastY = pos.y;
                this.drawDot(pos.x, pos.y);
            }
        }
    },

    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (App.state.isPanMode && this.isPanning) {
                const dx = touch.clientX - this.panStartX;
                const dy = touch.clientY - this.panStartY;
                App.state.offsetX = this.panStartOffsetX + dx;
                App.state.offsetY = this.panStartOffsetY + dy;
                this.applyTransform();
            } else if (this.isDrawing) {
                const pos = this.getTouchCanvasPos(touch);
                this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
                this.lastX = pos.x;
                this.lastY = pos.y;
            }
        }
    },

    onTouchEnd(e) {
        if (this.isDrawing) {
            this.isDrawing = false;
            App.saveState();
        }
        this.isPanning = false;
    },

    getTouchCanvasPos(touch) {
        const canvas = App.canvas;
        const rect   = canvas.getBoundingClientRect();

        // Center of transformed canvas on screen
        const screenCenterX = rect.left + rect.width / 2;
        const screenCenterY = rect.top + rect.height / 2;

        // Offset from screen center
        let dx = touch.clientX - screenCenterX;
        let dy = touch.clientY - screenCenterY;

        // Inverse rotation (opposite direction)
        const angle = App.state.rotation % 360;
        if (angle !== 0) {
            const rad = -angle * Math.PI / 180;
            const rdx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rdy = dx * Math.sin(rad) + dy * Math.cos(rad);
            dx = rdx;
            dy = rdy;
        }

        // Inverse scale
        const s = App.state.scale;
        dx /= s;
        dy /= s;

        // Convert to canvas coordinates
        const x = canvas.width / 2 + dx;
        const y = canvas.height / 2 + dy;

        return { x, y };
    },

    // ─── Wheel zoom ────────────────────────────────────────────────
    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        App.zoomBy(delta);
    },

    // ─── Drawing primitives ────────────────────────────────────────
    drawDot(x, y) {
        const ctx  = App.ctx;
        const size = App.state.brushSize;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = App.state.currentColor;
        ctx.fill();
    },

    drawLine(x1, y1, x2, y2) {
        const ctx  = App.ctx;
        const size = App.state.brushSize;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = App.state.currentColor;
        ctx.lineWidth   = size;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.stroke();
    },

    // ─── Transform ────────────────────────────────────────────────
    applyTransform() {
        const canvas = App.canvas;
        if (!canvas) return;
        const s   = App.state.scale;
        const ox  = App.state.offsetX;
        const oy  = App.state.offsetY;
        const rot = App.state.rotation;
        canvas.style.transform       = `translate(${ox}px, ${oy}px) rotate(${rot}deg) scale(${s})`;
        canvas.style.transformOrigin = 'center center';
        // Update zoom label
        const zoomLabel = document.getElementById('zoomLevel');
        if (zoomLabel) zoomLabel.textContent = Math.round(s * 100) + '%';
    }
};

// ─── App methods for canvas operations ──────────────────────────────
App.loadImageFromFile = function(image) {
    this.showLoading('Загрузка теста...');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        this.state.loadedImages[image.filename] = img;
        this.state.rotation = 0;
        this.state.scale    = 1;
        this.state.offsetX  = 0;
        this.state.offsetY  = 0;

        CanvasModule.applyTransform();
        this.drawImageOnCanvas(img);
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.saveState();
        this.updateUndoRedoButtons();

        const rotEl = document.getElementById('rotationAngle');
        if (rotEl) rotEl.textContent = '0°';

        this.hideLoading();
    };

    img.onerror = () => {
        console.error('Не удалось загрузить изображение:', image.filename);
        this.drawPlaceholderImage();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.saveState();
        this.updateUndoRedoButtons();
        this.hideLoading();
        this.showError('Не удалось загрузить изображение');
    };

    img.src = image.filename;
};

App.drawImageOnCanvas = function(img) {
    const ctx    = this.ctx;
    const canvas = this.canvas;

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale      = canvas.height / img.height;
    const drawWidth  = img.width * scale;
    const drawHeight = canvas.height;
    const offsetX    = (canvas.width - drawWidth) / 2;

    ctx.drawImage(img, offsetX, 0, drawWidth, drawHeight);

    if (offsetX > 0) {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, offsetX, canvas.height);
        ctx.fillRect(offsetX + drawWidth, 0, canvas.width - (offsetX + drawWidth), canvas.height);
    }
};

App.drawPlaceholderImage = function() {
    const ctx    = this.ctx;
    const canvas = this.canvas;

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font      = 'bold 40px Arial';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Изображение не выбрано', canvas.width / 2, canvas.height / 2 - 30);

    ctx.font      = '20px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Вернитесь на страницу настроек', canvas.width / 2, canvas.height / 2 + 30);
};

App.saveState = function() {
    this.state.undoStack.push(this.canvas.toDataURL());
    if (this.state.undoStack.length > 20) {
        this.state.undoStack.shift();
    }
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

App.undo = function() {
    if (this.state.undoStack.length > 1) {
        this.state.redoStack.push(this.state.undoStack.pop());
        const prevState = this.state.undoStack[this.state.undoStack.length - 1];
        this.restoreState(prevState);
    }
};

App.redo = function() {
    if (this.state.redoStack.length > 0) {
        const nextState = this.state.redoStack.pop();
        this.state.undoStack.push(nextState);
        this.restoreState(nextState);
    }
};

App.restoreState = function(dataURL) {
    const img = new Image();
    img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        this.updateUndoRedoButtons();
    };
    img.src = dataURL;
};

App.updateUndoRedoButtons = function() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (!undoBtn || !redoBtn) return;

    const canUndo = this.state.undoStack.length > 1;
    const canRedo = this.state.redoStack.length > 0;

    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
    undoBtn.classList.toggle('opacity-50', !canUndo);
    undoBtn.classList.toggle('cursor-not-allowed', !canUndo);
    redoBtn.classList.toggle('opacity-50', !canRedo);
    redoBtn.classList.toggle('cursor-not-allowed', !canRedo);
};

App.rotateLeft = function() {
    this.state.rotation = (this.state.rotation - 90 + 360) % 360;
    CanvasModule.applyTransform();
    const rotEl = document.getElementById('rotationAngle');
    if (rotEl) rotEl.textContent = this.state.rotation + '°';
};

App.rotateRight = function() {
    this.state.rotation = (this.state.rotation + 90) % 360;
    CanvasModule.applyTransform();
    const rotEl = document.getElementById('rotationAngle');
    if (rotEl) rotEl.textContent = this.state.rotation + '°';
};

App.zoomIn = function() {
    this.zoomBy(0.1);
};

App.zoomOut = function() {
    this.zoomBy(-0.1);
};

App.zoomBy = function(delta) {
    const newScale = Math.min(Math.max(this.state.scale + delta, 0.2), 5);
    this.state.scale = Math.round(newScale * 10) / 10;
    CanvasModule.applyTransform();
};

App.centerCanvas = function() {
    this.state.scale   = 1;
    this.state.offsetX = 0;
    this.state.offsetY = 0;
    this.state.rotation = 0;
    CanvasModule.applyTransform();
    const rotEl = document.getElementById('rotationAngle');
    if (rotEl) rotEl.textContent = '0°';
};

App.togglePanMode = function() {
    this.state.isPanMode = !this.state.isPanMode;
    const container = document.getElementById('canvas-container');
    const btn       = document.getElementById('panModeBtn');
    if (container) container.classList.toggle('pan-mode', this.state.isPanMode);
    if (btn)       btn.classList.toggle('active', this.state.isPanMode);
};

App.clearCanvas = function() {
    App.showModal(
        'Очистить раскраску? Все изменения будут потеряны. Это действие нельзя отменить.',
        'Очистить',
        'Отмена',
        () => {
            if (this.state.selectedTest) {
                this.loadImageFromFile(this.state.selectedTest);
            } else {
                this.drawPlaceholderImage();
                this.state.undoStack = [];
                this.state.redoStack = [];
                this.saveState();
                this.updateUndoRedoButtons();
            }
            this.hideResults();
        }
    );
};

App.hideResults = function() {
    const panel = document.getElementById('results-panel');
    if (panel) panel.style.display = 'none';
    this.state.resultsVisible = false;
};

// ─── Toolbar initialization ──────────────────────────────────────────
App.initToolbar = function() {
    // Home button
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            App.showModal(
                'Вы действительно хотите перейти на главную? В этом случае ваши данные не сохранятся.',
                'Перейти',
                'Отмена',
                () => {
                    App.hideResults();
                    App.showSettings();
                    App.initSettings();
                }
            );
        });
    }

    // Color palette
    const palette = document.getElementById('color-palette');
    if (palette) {
        palette.innerHTML = '';
        appConfig.colors.forEach(color => {
            const swatch = document.createElement('button');
            swatch.className = 'color-swatch';
            swatch.title     = color.name;
            swatch.dataset.hex = color.hex;
            swatch.style.backgroundColor = color.hex;
            if (color.hex === App.state.currentColor) swatch.classList.add('selected');
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                App.state.currentColor = color.hex;
                // Exit pan mode on color select
                if (App.state.isPanMode) App.togglePanMode();
            });
            palette.appendChild(swatch);
        });
    }

    // Brush sizes
    const brushSizes = [4, 12, 24, 40];
    const brushContainer = document.getElementById('brush-sizes');
    if (brushContainer) {
        brushContainer.innerHTML = '';
        brushSizes.forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'brush-size-btn';
            btn.title = `Размер кисти: ${size}px`;
            const visual = Math.max(8, Math.min(32, size));
            btn.style.width  = visual + 'px';
            btn.style.height = visual + 'px';
            if (size === App.state.brushSize) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                document.querySelectorAll('.brush-size-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                App.state.brushSize = size;
                if (App.state.isPanMode) App.togglePanMode();
            });
            brushContainer.appendChild(btn);
        });
    }

    // Rotate buttons
    const rotLeftBtn  = document.getElementById('rotateLeftBtn');
    const rotRightBtn = document.getElementById('rotateRightBtn');
    if (rotLeftBtn)  rotLeftBtn.addEventListener('click',  () => App.rotateLeft());
    if (rotRightBtn) rotRightBtn.addEventListener('click', () => App.rotateRight());

    // Zoom buttons
    const zoomInBtn  = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomInBtn)  zoomInBtn.addEventListener('click',  () => App.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => App.zoomOut());

    // Undo/Redo
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.addEventListener('click', () => App.undo());
    if (redoBtn) redoBtn.addEventListener('click', () => App.redo());

    // Pan mode
    const panBtn = document.getElementById('panModeBtn');
    if (panBtn) panBtn.addEventListener('click', () => App.togglePanMode());

    // Center
    const centerBtn = document.getElementById('centerBtn');
    if (centerBtn) centerBtn.addEventListener('click', () => App.centerCanvas());

    // Calculate
    const calcBtn = document.getElementById('calculateBtn');
    if (calcBtn) calcBtn.addEventListener('click', () => Statistics.calculate());

    // Clear
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => App.clearCanvas());

    // Send email
    const emailBtn = document.getElementById('sendEmailBtn');
    if (emailBtn) emailBtn.addEventListener('click', () => ApiModule.sendEmail());

    this.updateUndoRedoButtons();
};
