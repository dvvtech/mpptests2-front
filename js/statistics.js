/**
 * statistics.js — Анализ пикселей canvas, расчет статистики цветов
 */

const Statistics = {
    // Фоновые/игнорируемые цвета (hex)
    ignoredColors: [
        '#ededed', '#9ca3af', '#ffffff'
    ],

    /**
     * Анализирует пиксели на canvas и возвращает статистику цветов
     * @returns {Array<{name: string, hex: string, count: number, percentage: number}>}
     */
    analyzeCanvas() {
        const canvas = App.canvas;
        const ctx    = App.ctx;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data      = imageData.data;

        const colorCounts = {};

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Ignore transparent pixels
            if (a < 100) continue;

            const hex = rgbToHex(r, g, b).toLowerCase();

            // Ignore background colors
            if (this.isIgnoredColor(r, g, b)) continue;

            // Find closest palette color
            const colorName = findClosestColorName(r, g, b);
            if (!colorName) continue;

            // Find the palette entry to get hex
            const paletteColor = appConfig.colors.find(c => c.name === colorName);
            if (!paletteColor) continue;

            if (!colorCounts[colorName]) {
                colorCounts[colorName] = { name: colorName, hex: paletteColor.hex, count: 0 };
            }
            colorCounts[colorName].count++;
        }

        // Convert to array, filter < 10 pixels
        const result = Object.values(colorCounts).filter(c => c.count >= 10);

        // Total pixels counted
        const total = result.reduce((sum, c) => sum + c.count, 0);

        // Calculate percentages
        result.forEach(c => {
            c.percentage = total > 0 ? Math.round((c.count / total) * 100) : 0;
        });

        // Sort by count desc
        result.sort((a, b) => b.count - a.count);

        return result;
    },

    /**
     * Проверяет, является ли цвет фоновым/игнорируемым
     */
    isIgnoredColor(r, g, b) {
        // Background #EDEDED
        if (r >= 230 && g >= 230 && b >= 230) return true;
        // #9ca3af (gray placeholder)
        if (this.colorNearHex(r, g, b, '#9ca3af', 30)) return true;
        // Very near white
        if (r > 240 && g > 240 && b > 240) return true;
        return false;
    },

    colorNearHex(r, g, b, hex, threshold) {
        const ref = hexToRgb(hex);
        return colorDistance(r, g, b, ref.r, ref.g, ref.b) < threshold;
    },

    /**
     * Запускает расчет и отображает результаты
     */
    async calculate() {
        const stats = this.analyzeCanvas();

        if (stats.length === 0) {
            App.showError('Нет закрашенных областей. Пожалуйста, раскрасьте тест перед анализом.');
            return;
        }

        // Prepare API payload
        const gender    = App.state.gender    || localStorage.getItem('mpp_gender');
        const birthdate = App.state.birthdate || localStorage.getItem('mpp_birthdate');
        const zodiac    = getZodiacSign(birthdate);
        const age       = getAge(birthdate);
        const genderApi = gender === 'male' ? 'male' : 'female';

        const colors = stats.map(c => ({
            color: c.name,
            percentage: c.percentage
        }));

        const payload = {
            user_color: {
                colors,
                age,
                gender: genderApi,
                zodiac_sign: zodiac
            },
            version: 1
        };

        // Show loading
        App.showLoading('Анализ результатов...');

        let resultData = null;
        try {
            resultData = await ApiModule.analyzeColors(payload);
        } catch (e) {
            console.warn('API недоступен, используем демо-данные:', e);
            resultData = this.getDemoResult(stats, gender, birthdate);
        }

        App.hideLoading();

        this.showResults(stats, resultData, { age, gender: genderApi, zodiac, birthdate });
    },

    getDemoResult(stats, gender, birthdate) {
        return {
            main_characteristic: 'Анализ показывает гармоничное сочетание цветов, отражающее внутренний баланс и стремление к самовыражению.',
            strengths: [
                'Развитый эмоциональный интеллект',
                'Способность к творческому мышлению',
                'Стремление к гармонии в отношениях'
            ],
            recommendations: [
                'Уделяйте больше времени творческим занятиям',
                'Практикуйте осознанность и медитацию',
                'Развивайте коммуникативные навыки'
            ]
        };
    },

    showResults(stats, data, meta) {
        const panel = document.getElementById('results-panel');
        const scroll = document.getElementById('results-scroll');
        if (!panel || !scroll) return;

        // Build color bar chart HTML
        const chartHtml = stats.map(c => `
            <div class="color-bar-row">
                <span class="color-bar-label">${c.name}</span>
                <div class="color-bar-track">
                    <div class="color-bar-fill" style="width:${c.percentage}%; background-color:${c.hex};"></div>
                </div>
                <span class="color-bar-pct">${c.percentage}%</span>
            </div>
        `).join('');

        const strengthsHtml = Array.isArray(data.strengths)
            ? data.strengths.map(s => `<li class="text-sm text-gray-700">${s}</li>`).join('')
            : '';

        const recsHtml = Array.isArray(data.recommendations)
            ? data.recommendations.map(r => `<li class="text-sm text-gray-700">${r}</li>`).join('')
            : '';

        const zodiacRu  = getZodiacNameRu(getZodiacSign(meta.birthdate));
        const genderRu  = meta.gender === 'male' ? 'Мужской' : 'Женский';

        scroll.innerHTML = `
            <div class="mb-4">
                <h3 class="text-base font-semibold text-gray-800 mb-2">Данные пользователя</h3>
                <div class="text-sm text-gray-600 space-y-1">
                    <div><span class="font-medium">Пол:</span> ${genderRu}</div>
                    <div><span class="font-medium">Возраст:</span> ${meta.age} лет</div>
                    <div><span class="font-medium">Знак зодиака:</span> ${zodiacRu}</div>
                    <div><span class="font-medium">Тест:</span> ${App.state.selectedTest ? App.state.selectedTest.name : '—'}</div>
                </div>
            </div>

            <div class="mb-4">
                <h3 class="text-base font-semibold text-gray-800 mb-2">Использованные цвета</h3>
                ${chartHtml}
            </div>

            ${data.main_characteristic ? `
            <div class="mb-4">
                <h3 class="text-base font-semibold text-gray-800 mb-2">Характеристика</h3>
                <p class="text-sm text-gray-700 leading-relaxed">${data.main_characteristic}</p>
            </div>` : ''}

            ${strengthsHtml ? `
            <div class="mb-4">
                <h3 class="text-base font-semibold text-gray-800 mb-2">Сильные стороны</h3>
                <ul class="list-disc list-inside space-y-1">${strengthsHtml}</ul>
            </div>` : ''}

            ${recsHtml ? `
            <div class="mb-4">
                <h3 class="text-base font-semibold text-gray-800 mb-2">Рекомендации</h3>
                <ul class="list-disc list-inside space-y-1">${recsHtml}</ul>
            </div>` : ''}

            <button id="sendEmailBtn"
                class="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2">
                <i class="fas fa-envelope"></i> Отправить на почту
            </button>
        `;

        // Re-bind email button
        const emailBtn = document.getElementById('sendEmailBtn');
        if (emailBtn) emailBtn.addEventListener('click', () => ApiModule.sendEmail());

        panel.style.display = 'flex';
        App.state.resultsVisible = true;
        App.state.lastStats = stats;
        App.state.lastResult = data;
    }
};
