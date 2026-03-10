/**
 * utils.js — Утилиты: знак зодиака, rgbToHex, возраст
 */

/**
 * Определяет знак зодиака по дате рождения
 * @param {string} birthdate — формат YYYY-MM-DD
 * @returns {string} — английское название знака (для API)
 */
function getZodiacSign(birthdate) {
    if (!birthdate) return 'unknown';
    const date = new Date(birthdate);
    const month = date.getMonth() + 1; // 1-12
    const day   = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';
    return 'unknown';
}

/**
 * Русское название знака зодиака
 */
function getZodiacNameRu(sign) {
    const map = {
        aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы',
        cancer: 'Рак', leo: 'Лев', virgo: 'Дева',
        libra: 'Весы', scorpio: 'Скорпион', sagittarius: 'Стрелец',
        capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
        unknown: 'Неизвестно'
    };
    return map[sign] || 'Неизвестно';
}

/**
 * Вычисляет возраст по дате рождения
 * @param {string} birthdate — формат YYYY-MM-DD
 * @returns {number}
 */
function getAge(birthdate) {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

/**
 * Конвертирует RGB значения в HEX строку
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} — #rrggbb
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => {
        const hex = Math.round(v).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Конвертирует HEX в RGB объект
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

/**
 * Цветовое расстояние между двумя RGB цветами
 */
function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
        (r1 - r2) ** 2 +
        (g1 - g2) ** 2 +
        (b1 - b2) ** 2
    );
}

/**
 * Находит ближайший цвет из палитры appConfig.colors
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} — название цвета
 */
function findClosestColorName(r, g, b) {
    let minDist = Infinity;
    let closestName = null;

    for (const c of appConfig.colors) {
        const rgb = hexToRgb(c.hex);
        const dist = colorDistance(r, g, b, rgb.r, rgb.g, rgb.b);
        if (dist < minDist) {
            minDist = dist;
            closestName = c.name;
        }
    }
    return closestName;
}

/**
 * Форматирует дату в читаемый вид (DD.MM.YYYY)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
}
