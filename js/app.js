/**
 * app.js — Основной модуль приложения
 * Глобальная конфигурация, навигация, модальные окна
 */

const BACKGROUND_COLOR = '#EDEDED';

const appConfig = {
    canvasWidth: 785,
    canvasHeight: 1080,
    images: [
        { id: 1, name: "Тест 1", filename: "images/test1.png", thumbnail: "images/thumbnails/test1_thumb.png" },
        { id: 2, name: "Тест 2", filename: "images/test2.png", thumbnail: "images/thumbnails/test2_thumb.png" },
        { id: 3, name: "Тест 3", filename: "images/test3.png", thumbnail: "images/thumbnails/test3_thumb.png" },
        { id: 4, name: "Тест 4", filename: "images/test4.png", thumbnail: "images/thumbnails/test4_thumb.png" },
        { id: 5, name: "Тест 5", filename: "images/test5.png", thumbnail: "images/thumbnails/test5_thumb.png" }
    ],
    colors: [
        { name: "Красный",    hex: "#ef4444" },
        { name: "Оранжевый", hex: "#f97316" },
        { name: "Желтый",     hex: "#eab308" },
        { name: "Розовый",    hex: "#ec4899" },
        { name: "Коричневый", hex: "#92400e" },
        { name: "Зеленый",    hex: "#22c55e" },
        { name: "Голубой",    hex: "#0ea5e9" },
        { name: "Синий",      hex: "#3b82f6" },
        { name: "Фиолетовый", hex: "#8b5cf6" },
        { name: "Бирюзовый",  hex: "#06b6d4" },
        { name: "Черный",     hex: "#000000" },
        { name: "Белый",      hex: "#ffffff" }
    ],
    backgroundColor: "#EDEDED"
};

// Global App namespace
const App = {
    // Current state
    state: {
        selectedTest: null,
        gender: null,
        birthdate: null,
        currentColor: '#ef4444',
        brushSize: 12,
        isPanMode: false,
        rotation: 0,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        undoStack: [],
        redoStack: [],
        loadedImages: {},
        resultsVisible: false
    },

    // DOM refs (populated after HTML loaded)
    canvas: null,
    ctx: null,

    init() {
        this.initSettings();
        // Подключаем обработчики адаптивности
        window.addEventListener('resize', () => {
            // Пересчитать размер холста, если активна страница раскрашивания
            const coloringEl = document.getElementById('coloring');
            if (coloringEl && coloringEl.style.display !== 'none') {
                this.fitCanvasToScreen();
            }
        });
    },

    // Масштабирование холста под экран устройства
    fitCanvasToScreen() {
        if (!this.canvas) return;
        const baseW = appConfig.canvasWidth;
        const baseH = appConfig.canvasHeight;
        // Доступная площадь: учитываем небольшие отступы
        const availableW = Math.max(320, window.innerWidth - 40);
        const availableH = Math.max(240, window.innerHeight - 240);

        const scale = Math.min(availableW / baseW, availableH / baseH, 1);
        const w = Math.floor(baseW * scale);
        const h = Math.floor(baseH * scale);

        // Привязать физические размеры канваса к вычисленному размеру
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w;
        this.canvas.height = h;

        // Обнуляем трансформации и заново применяем
        this.state.offsetX = 0;
        this.state.offsetY = 0;
        this.state.scale = 1;
        // Используем внешний модуль CanvasModule для применения трансформаций
        CanvasModule.applyTransform();
    },

    // ─── Navigation ────────────────────────────────────────────────
    showSettings() {
        document.getElementById('settings').style.display = '';
        document.getElementById('coloring').style.display = 'none';
        this.state.resultsVisible = false;
    },

    showColoring() {
        document.getElementById('settings').style.display = 'none';
        document.getElementById('coloring').style.display = '';
        this.initColoring();
    },

    // ─── Modal ─────────────────────────────────────────────────────
    showModal(text, confirmText, cancelText, onConfirm, onCancel) {
        const backdrop = document.getElementById('modal-backdrop');
        const msgEl    = document.getElementById('modal-text');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn  = document.getElementById('modal-cancel');

        msgEl.textContent = text;
        confirmBtn.textContent = confirmText || 'Подтвердить';
        cancelBtn.textContent  = cancelText  || 'Отмена';

        backdrop.classList.add('active');

        const handleConfirm = () => {
            backdrop.classList.remove('active');
            cleanup();
            if (onConfirm) onConfirm();
        };
        const handleCancel = () => {
            backdrop.classList.remove('active');
            cleanup();
            if (onCancel) onCancel();
        };
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    },

    // ─── Loading indicator (canvas overlay) ────────────────────────
    showLoading(text) {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        const msg = overlay.querySelector('#loading-text');
        if (msg) msg.textContent = text || 'Загрузка...';
        overlay.style.display = 'flex';
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    showError(msg) {
        // Simple toast-style error
        const el = document.createElement('div');
        el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg z-50 text-sm';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    },

    showSuccess(msg) {
        const el = document.createElement('div');
        el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg z-50 text-sm';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    },

    // ─── Settings page ─────────────────────────────────────────────
    initSettings() {
        // Restore from localStorage
        const savedGender    = localStorage.getItem('mpp_gender');
        const savedBirthdate = localStorage.getItem('mpp_birthdate');
        const savedTestId    = localStorage.getItem('mpp_test_id');

        const genderSelect   = document.getElementById('gender-select');
        const birthdateInput = document.getElementById('birthdate-input');

        if (genderSelect && savedGender)       genderSelect.value = savedGender;
        if (birthdateInput && savedBirthdate)  birthdateInput.value = savedBirthdate;

        // Init image selector
        this.initImageSelector();

        // Restore selected test visual
        if (savedTestId) {
            setTimeout(() => {
                const item = document.querySelector(`.image-item[data-image-id="${savedTestId}"]`);
                if (item) item.click();
            }, 200);
        }

        // Next button
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.onNextClick());
        }
    },

    initImageSelector() {
        const imageSelector = document.getElementById('image-selector');
        if (!imageSelector) {
            console.error('image-selector не найден');
            return;
        }

        imageSelector.innerHTML = '';

        appConfig.images.forEach((image, index) => {
            const imgElement = document.createElement('div');
            imgElement.className = 'image-item border-2 border-gray-200 rounded-xl overflow-hidden cursor-pointer transition duration-200 relative bg-white';
            imgElement.dataset.imageId = image.id;
            imgElement.innerHTML = `
                <div class="h-40 image-preview flex items-center justify-center"
                     data-filename="${image.filename}"
                     data-thumbnail="${image.thumbnail}"
                     data-index="${index}"
                     style="background-color:#EDEDED;">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-xl"></i>
                </div>
                <div class="p-2 text-center text-sm font-medium text-gray-700 border-t border-gray-100">
                    ${image.name}
                </div>
            `;

            // Lazy load via IntersectionObserver
            const previewEl = imgElement.querySelector('.image-preview');
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadImagePreview(image.thumbnail, previewEl, true, image.filename);
                            observer.unobserve(previewEl);
                        }
                    });
                }, { rootMargin: '50px' });
                observer.observe(previewEl);
            } else {
                setTimeout(() => {
                    this.loadImagePreview(image.thumbnail, previewEl, true, image.filename);
                }, index * 100);
            }

            imgElement.addEventListener('click', () => {
                document.querySelectorAll('.image-item').forEach(item => item.classList.remove('selected'));
                imgElement.classList.add('selected');
                this.state.selectedTest = image;
                // Clear error
                const err = document.getElementById('test-error');
                if (err) err.style.display = 'none';
            });

            imageSelector.appendChild(imgElement);
        });
    },

    loadImagePreview(filename, container, isThumbnail, originalFilename) {
        const img = new Image();
        img.onload = () => {
            container.style.backgroundImage = `url('${filename}')`;
            container.style.backgroundSize = 'contain';
            container.style.backgroundPosition = 'center';
            container.style.backgroundRepeat = 'no-repeat';
            container.innerHTML = '';
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.3s ease';
            requestAnimationFrame(() => {
                container.style.opacity = '1';
            });
        };
        img.onerror = () => {
            if (isThumbnail && originalFilename) {
                // Try original
                this.loadImagePreview(originalFilename, container, false, null);
            } else {
                container.innerHTML = `<div class="text-center text-gray-400"><i class="fas fa-image text-4xl"></i></div>`;
            }
        };
        img.src = filename;
    },

    onNextClick() {
        const genderSelect   = document.getElementById('gender-select');
        const birthdateInput = document.getElementById('birthdate-input');
        let valid = true;

        // Validate gender
        const genderErr = document.getElementById('gender-error');
        if (!genderSelect || !genderSelect.value) {
            if (genderErr) { genderErr.style.display = ''; }
            if (genderSelect) genderSelect.classList.add('field-error');
            valid = false;
        } else {
            if (genderErr) genderErr.style.display = 'none';
            if (genderSelect) genderSelect.classList.remove('field-error');
        }

        // Validate birthdate
        const bdErr = document.getElementById('birthdate-error');
        if (!birthdateInput || !birthdateInput.value) {
            if (bdErr) { bdErr.style.display = ''; }
            if (birthdateInput) birthdateInput.classList.add('field-error');
            valid = false;
        } else {
            if (bdErr) bdErr.style.display = 'none';
            if (birthdateInput) birthdateInput.classList.remove('field-error');
        }

        // Validate test selection
        const testErr = document.getElementById('test-error');
        if (!this.state.selectedTest) {
            if (testErr) { testErr.style.display = ''; }
            valid = false;
        } else {
            if (testErr) testErr.style.display = 'none';
        }

        if (!valid) return;

        // Save to localStorage
        this.state.gender    = genderSelect.value;
        this.state.birthdate = birthdateInput.value;
        localStorage.setItem('mpp_gender',    this.state.gender);
        localStorage.setItem('mpp_birthdate', this.state.birthdate);
        localStorage.setItem('mpp_test_id',   this.state.selectedTest.id);

        this.showColoring();
    },

    // ─── Coloring page init ────────────────────────────────────────
    initColoring() {
        this.canvas = document.getElementById('main-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        // Подогнать холст под экран устройства
        this.fitCanvasToScreen();

        // Reset state
        this.state.rotation  = 0;
        this.state.scale     = 1;
        this.state.offsetX   = 0;
        this.state.offsetY   = 0;
        this.state.isPanMode = false;
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.state.resultsVisible = false;

        this.hideResults();
        this.initToolbar();
        CanvasModule.init();

        // Load test image
        if (this.state.selectedTest) {
            this.loadImageFromFile(this.state.selectedTest);
        } else {
            this.drawPlaceholderImage();
            this.saveState();
        }
    }
};
