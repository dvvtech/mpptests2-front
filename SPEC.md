# Спецификация проекта: Раскраска "Медико-педагого-психологические тесты Яшара Ибадова"

## Общая информация
- **Тип проекта**: Веб-приложение для раскрашивания психологических тестов
- **Технологии**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Адаптивность**: Полная поддержка всех устройств (Android, iOS, Windows, macOS)
- **Структура**: SPA с динамической загрузкой компонентов

## Архитектура приложения

### Основной файл `index.html`
```javascript
// Механизм загрузки компонентов
async function loadComponent(id, file) {
    const response = await fetch(file);
    const content = await response.text();
    document.getElementById(id).innerHTML = content;
}

// Последовательность загрузки: сначала settings.html, потом coloring.html
document.addEventListener("DOMContentLoaded", () => {
    loadComponent("settings", "settings.html");
    loadComponent("coloring", "coloring.html");
});
```
**Примечания:**
- JavaScript скрипты должны находиться в отдельных файлах
- Начальная страница — `settings.html` (в `index.html` сначала показывается блок из `settings.html`)

## Конфигурация приложения

### Глобальные константы
```javascript

// Подключение Font Awesome (добавить в index.html)
// <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

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
        { name: "Красный", hex: "#ef4444" },
        { name: "Оранжевый", hex: "#f97316" },
        { name: "Желтый", hex: "#eab308" },
        { name: "Розовый", hex: "#ec4899" },
        { name: "Коричневый", hex: "#92400e" },
        { name: "Зеленый", hex: "#22c55e" },
        { name: "Голубой", hex: "#0ea5e9" },
        { name: "Синий", hex: "#3b82f6" },
        { name: "Фиолетовый", hex: "#8b5cf6" },
        { name: "Бирюзовый", hex: "#06b6d4" },
        { name: "Черный", hex: "#000000" },
        { name: "Белый", hex: "#ffffff" }
    ],
    backgroundColor: "#EDEDED"
};
```
## Страница настроек (settings.html)

### UI Компоненты
- **Заголовок: "Медико-педагого-психологические тесты Яшара Ибадова"**
- **Подзаголовок: "Для анализа тестов требуется заполнить поля"**
- **Поле "Пол"**: Выпадающий список (Мужской/Женский)
- **Поле "Дата рождения"**: Input type="date"
- **Блок выбора теста:**
  - Сетка 2 колонки
  - Каждый тест: превью (с индикатором загрузки) + название
  - Ленивая загрузка превью через IntersectionObserver
  - Фон превью: серый (#EDEDED) для прозрачных PNG

```html
<div class="bg-white rounded-xl shadow-md p-6 mb-6">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Выбор теста</h2>
    <div class="grid grid-cols-2 gap-3" id="image-selector">
        <!-- Тесты будут добавлены динамически -->
    </div>
</div>
```
- **Кнопка "Далее"**

### Функциональность настроек
- Валидация полей при нажатии "Далее". Если пользователь не заполнил и/или не выбрал поля, выводить сообщения
- Сохранение данных (пол, дата рождения, выбранный тест) в localStorage
- Восстановление данных из localStorage при загрузке страницы настроек
- Переключение на блок coloring (скрыть settings, показать coloring)
- Определение знака зодиака по дате рождения

### Выбор тестов
- Тест представляет собой черно-белое изображение в формате PNG в вертикальном формате. Изображения прозрачные, фон у них должен быть чуть сероватым цвета #EDEDED.
- У каждого теста должен быть индикатор загрузки.

```javascript

const BACKGROUND_COLOR = '#EDEDED';

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initImageSelector();
}

// Инициализация выбора изображений с ленивой загрузкой
function initImageSelector() {
    const imageSelector = document.getElementById('image-selector');
    if (!imageSelector) {
        console.error('image-selector не найден');
        return;
    }

    imageSelector.innerHTML = '';
    
    appConfig.images.forEach((image, index) => {
        const imgElement = document.createElement('div');
        imgElement.className = 'image-item border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition duration-200 relative';
        imgElement.dataset.imageId = image.id;
        imgElement.innerHTML = `
            <div class="h-48 bg-gray-100 flex items-center justify-center image-preview" 
                 data-filename="${image.filename}" 
                 data-thumbnail="${image.thumbnail}"
                 data-index="${index}">
                <i class="fas fa-spinner fa-spin text-gray-400"></i>
            </div>
            <div class="p-2 text-center text-sm font-medium text-gray-700 border-t border-gray-200">
                ${image.name}
            </div>
        `;
        
        // Добавляем ленивую загрузку
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const preview = entry.target;
                        const thumbnail = preview.dataset.thumbnail;
                        loadImagePreview(thumbnail, preview, true);
                        observer.unobserve(preview);
                    }
                });
            }, { rootMargin: '50px' });
            
            observer.observe(imgElement.querySelector('.image-preview'));
        } else {
            // Fallback для старых браузеров
            setTimeout(() => {
                loadImagePreview(image.thumbnail, imgElement.querySelector('.image-preview'), true);
            }, index * 100);
        }
        
        imgElement.addEventListener('click', () => {
            document.querySelectorAll('.image-item').forEach(item => {
                item.classList.remove('selected');
            });
            imgElement.classList.add('selected');
            // Сохраняем выбранный тест
            selectedTest = image;
        });
        
        imageSelector.appendChild(imgElement);
    });
}

// Загрузка превью изображения
App.loadImageFromFile = function loadImagePreview(filename, container, isThumbnail = false) {
    const img = new Image();
    img.onload = function() {
        container.style.backgroundImage = `url('${filename}')`;
        container.style.backgroundSize = 'contain';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
        container.innerHTML = '';
        
        // Добавляем небольшую анимацию появления
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);
    };
    img.onerror = function() {
        // Если не удалось загрузить превью, пробуем загрузить оригинал
        if (!isThumbnail) {
            container.innerHTML = `
                <div class="text-center text-gray-400">
                    <i class="fas fa-image text-4xl"></i>
                </div>
            `;
        } else {
            // Пробуем загрузить оригинал
            const originalFilename = container.dataset.filename;
            if (originalFilename) {
                loadImagePreview(originalFilename, container, false);
            }
        }
    };
    img.src = filename;
}
// Загрузка изображения из файла
App.loadImageFromFile = function (image) {
    // Показываем индикатор загрузки
    this.showLoading('Загрузка теста...');

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        this.state.loadedImages[image.filename] = img;
        this.state.rotation = 0;
        this.state.scale = 1;

        // Сбрасываем трансформации
        this.canvas.style.transform = '';
        this.canvas.style.transformOrigin = '';

        this.drawImageOnCanvas(img);
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();

        // Обновляем отображение масштаба
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) zoomLevel.textContent = '100%';

        // Обновляем отображение угла
        const rotationAngle = document.getElementById('rotationAngle');
        if (rotationAngle) rotationAngle.textContent = '0°';

        // Скрываем индикатор загрузки
        this.hideLoading();
    };

    img.onerror = () => {
        console.error(`Не удалось загрузить изображение: ${image.filename}`);
        this.drawPlaceholderImage();
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();

        // Скрываем индикатор загрузки даже при ошибке
        this.hideLoading();

        // Показываем сообщение об ошибке
        this.showError('Не удалось загрузить изображение');
    };

    img.src = image.filename;
};        

        // Рисование изображения на canvas
App.drawImageOnCanvas = function (img) {
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Вычисляем масштабирование для заполнения canvas по высоте
    const scale = this.canvas.height / img.height;
    const drawWidth = img.width * scale;
    const drawHeight = this.canvas.height;
    const offsetX = (this.canvas.width - drawWidth) / 2;
    const offsetY = 0;

    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Если изображение слишком узкое, заполняем фон по бокам белым
    if (offsetX > 0) {
        this.ctx.fillStyle = BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, offsetX, this.canvas.height);
        this.ctx.fillRect(offsetX + drawWidth, 0, this.canvas.width - (offsetX + drawWidth), this.canvas.height);
    }
};

        // Рисование заглушки
App.drawPlaceholderImage = function () {
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 40px Arial';
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Изображение не выбрано', this.canvas.width / 2, this.canvas.height / 2 - 30);

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#6b7280';
    this.ctx.fillText('Вернитесь на страницу настроек', this.canvas.width / 2, this.canvas.height / 2 + 30);

    // Скрываем индикатор загрузки, если он вдруг еще висит
    this.hideImageLoading();
};		
		
		// Сохранение состояния
App.saveState = function () {
    this.state.undoStack.push(this.canvas.toDataURL());
    if (this.state.undoStack.length > 20) {
        this.state.undoStack.shift();
    }
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

        // Отмена действия
        function undo() {
            if (state.undoStack.length > 1) {
                state.redoStack.push(state.undoStack.pop());
                const prevState = state.undoStack[state.undoStack.length - 1];
                restoreState(prevState);
                updateUndoRedoButtons();
            }
        }

        // Повтор действия
        function redo() {
            if (state.redoStack.length > 0) {
                const nextState = state.redoStack.pop();
                state.undoStack.push(nextState);
                restoreState(nextState);
                updateUndoRedoButtons();
            }
        }

        // Восстановление состояния холста
        function restoreState(dataURL) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = dataURL;
        }

        // Обновление состояния кнопок отмены/повтора
        function updateUndoRedoButtons() {
            undoBtn.disabled = state.undoStack.length <= 1;
            redoBtn.disabled = state.redoStack.length === 0;
            
            undoBtn.classList.toggle('opacity-50', state.undoStack.length <= 1);
            undoBtn.classList.toggle('cursor-not-allowed', state.undoStack.length <= 1);
            redoBtn.classList.toggle('opacity-50', state.redoStack.length === 0);
            redoBtn.classList.toggle('cursor-not-allowed', state.redoStack.length === 0);
        }				
```

## Страница раскрашивания (coloring.html)

### UI Верхняя панель инструментов (на всю ширину)

- **Кнопка "Главная" - переход на settings с подтверждением**
- **Выбор цветов - палитра из appConfig.colors**
- **Размер кисти - слайдер или выбор фиксированных размеров**
- **Поворот - кнопки влево/вправо на 90°**
- **Масштаб - кнопки +/-**
- **Undo/Redo - кнопки отмены/повтора**
- **Режим перемещения - кнопка с иконкой ладони (toggle)**
- **Центрировать - восстановить начальную позицию и масштаб**
- **Кнопка "Рассчитать" - анализ раскраски**
- **Кнопка "Очистить" - сброс раскраски (с подтверждением)**

### UI Основная область
- **Холст (canvas) для раскрашивания (785x1080)**
- **Блок результатов (появляется после расчета)**:
  - Скролл внутри блока
  - Текст результатов справа от уменьшенного холста
  - Кнопка "Отправить результаты на почту"


## Математика и логика

### Расчет статистики цветов
**Функция должна:**
1. Анализировать пиксели на canvas
2. Игнорировать прозрачные пиксели (a < 100)
3. Игнорировать фоновый цвет (#9ca3af)
4. Группировать по названиям цветов
5. Фильтровать цвета с count < 10 пикселей
6. Считать проценты
7. Отображать горизонтальную диаграмму

### Определение знака зодиака
- Функция определения знака зодиака по дате рождения
- Формат для API: zodiac_sign (например: "aries", "taurus", etc.)

### API запрос
```javascript
// Эндпоинт: https://api.cloud-platform.pro/mpp-tests/v1/color-analysis/analyze-lusher
// Метод: POST
// Заголовки: Content-Type: application/json

// Тело запроса:
{
    user_color: {
        colors: [
            { color: "Красный", percentage: 25 },
            { color: "Синий", percentage: 75 }
        ],
        age: 30,              // возраст, вычисленный из даты рождения
        gender: "male",        // "male" или "female"
        zodiac_sign: "gemini"  // знак зодиака
    },
    version: 1
}
```

### Отправка на почту (бэкенд C#)
**Подготовка данных:**
1. Текст результатов (main_characteristic, strengths, recommendations)
2. Изображение canvas в формате PNG (toDataURL())

**Эндпоинт:** `/api/send-results` (будет реализован позже)

## Поведение приложения

### Навигация
- При переходе с coloring на settings - подтверждение: "Вы действительно хотите перейти на главную? В этом случае ваши данные не сохранятся."

### Очистка
- Подтверждение при нажатии "Очистить": "Очистить раскраску? Все изменения будут потеряны. Это действие нельзя отменить."
- Две кнопки: "Очистить" и "Отмена"

### Расчет
- Проверка, использованы ли цвета
- Если не использованы - предупреждение
- Показ индикатора загрузки во время запроса
- Обработка ошибок с демо-данными при недоступности API

### Результаты
- Уменьшение холста после расчета
- Отображение результатов справа
- Возможность скролла в блоке результатов
- Скрытие результатов при очистке или уходе со страницы

### Адаптивность
- Flexbox/Grid для всех раскладок
- Медиа-запросы для мобильных устройств
- Панель инструментов адаптируется под ширину экрана
- На мобильных: возможно перестроение интерфейса в колонку

### Запрет скролла
- body { overflow: hidden; } на всех страницах
- Только блок результатов может иметь overflow-y: auto

### Структура файлов
project/
├── index.html              # Главная страница с загрузчиком
├── settings.html           # Страница настроек
├── coloring.html           # Страница раскрашивания
├── css/
│   └── styles.css         # Дополнительные стили (если нужно)
├── js/
│   ├── app.js             # Основной модуль приложения
│   ├── canvas.js          # Работа с canvas
│   ├── statistics.js      # Расчет статистики
│   ├── api.js             # API запросы
│   └── utils.js           # Утилиты (знак зодиака, rgbToHex, и т.д.)
├── images/
│   ├── test1.png
│   ├── test2.png
│   ├── test3.png
│   ├── test4.png
│   ├── test5.png
│   └── thumbnails/
│       ├── test1_thumb.png
│       ├── test2_thumb.png
│       ├── test3_thumb.png
│       ├── test4_thumb.png
│       └── test5_thumb.png
└── SPEC.md                # Этот файл

## Чеклист реализации для агента

### Этап 1: Базовая структура
- Создать index.html с загрузчиком компонентов
- Создать settings.html с UI
- Создать coloring.html с UI
- Подключить Tailwind CSS
- Настроить базовые стили и запрет скролла

### Этап 2: Страница настроек
- Реализовать форму с полами, датой рождения
- Реализовать выбор теста с ленивой загрузкой
- Добавить валидацию
- Сохранять/загружать из localStorage

### Этап 3: Холст и раскрашивание
- Инициализировать canvas с размерами
- Загружать выбранный тест
- Реализовать рисование кистью
- Реализовать выбор цвета
- Реализовать размер кисти

### Этап 4: Инструменты
- Поворот изображения
- Масштабирование
- Undo/Redo (история)
- Режим перемещения (рука)
- Центрирование

### Этап 5: Анализ
- Расчет статистики цветов
- Определение знака зодиака
- Формирование API запроса
- Отправка запроса и обработка ответа
- Отображение результатов

### Этап 6: UI/UX
- Модальные окна подтверждения
- Индикаторы загрузки
- Адаптивная верстка
- Кнопка "Очистить" с подтверждением
- Кнопка "Отправить на почту" (заглушка)

## Дизайн-референсы
- Цвет фона для тестов: #9ca3af
- Использовать тени и скругления (Tailwind по умолчанию)
- Современный, минималистичный дизайн
- Хорошая контрастность для читаемости