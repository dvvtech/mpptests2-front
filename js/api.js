/**
 * api.js — API запросы к бэкенду
 */

const ApiModule = {
    ANALYZE_URL: 'https://api.cloud-platform.pro/mpp-tests/v1/color-analysis/analyze-lusher',
    SEND_EMAIL_URL: '/api/send-results',

    /**
     * Отправляет данные на анализ
     * @param {Object} payload
     * @returns {Promise<Object>}
     */
    async analyzeColors(payload) {
        const response = await fetch(this.ANALYZE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Отправка результатов на почту (заглушка)
     */
    async sendEmail() {
        if (!App.state.resultsVisible || !App.state.lastStats) {
            App.showError('Нет результатов для отправки. Сначала выполните расчет.');
            return;
        }

        const emailBtn = document.getElementById('sendEmailBtn');
        if (emailBtn) {
            emailBtn.disabled = true;
            emailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        }

        try {
            // Prepare canvas image
            const canvasDataUrl = App.canvas.toDataURL('image/png');

            // Prepare text results
            const result = App.state.lastResult || {};
            const textResults = [
                result.main_characteristic,
                result.strengths ? 'Сильные стороны: ' + result.strengths.join(', ') : '',
                result.recommendations ? 'Рекомендации: ' + result.recommendations.join(', ') : ''
            ].filter(Boolean).join('\n\n');

            const payload = {
                image: canvasDataUrl,
                text: textResults,
                stats: App.state.lastStats
            };

            const response = await fetch(this.SEND_EMAIL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                App.showSuccess('Результаты успешно отправлены на почту!');
            } else {
                throw new Error('Server error: ' + response.status);
            }
        } catch (e) {
            // Endpoint not implemented yet
            console.warn('Email endpoint not available:', e);
            App.showError('Функция отправки на почту будет доступна позже.');
        } finally {
            if (emailBtn) {
                emailBtn.disabled = false;
                emailBtn.innerHTML = '<i class="fas fa-envelope"></i> Отправить на почту';
            }
        }
    }
};
