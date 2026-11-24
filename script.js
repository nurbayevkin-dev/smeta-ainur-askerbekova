const rows = document.getElementById('rows');
const template = document.getElementById('row-template');
const discountInput = document.getElementById('discount');
const vatInput = document.getElementById('vat');
const currencySelect = document.getElementById('currency');
const fromInput = document.getElementById('from');
const draftKey = 'smeta.draft';

function readDraft() {
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) return JSON.parse(saved);
    // Поддерживаем прежнее сохранение поля «От кого».
    return { from: localStorage.getItem('smeta.from') || '' };
  } catch (error) {
    return null;
  }
}

function saveDraft() {
  try {
    const draft = {
      from: document.getElementById('from').value,
      to: document.getElementById('to').value,
      number: document.getElementById('number').value,
      date: document.getElementById('date').value,
      discount: discountInput.value,
      vat: vatInput.value,
      currency: currencySelect.value,
      rows: Array.from(rows.querySelectorAll('tr'), (row) => ({
        name: row.querySelector('.name').value,
        qty: row.querySelector('.qty').value,
        unit: row.querySelector('.unit').value,
        price: row.querySelector('.price').value,
      })),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch (error) {
    // Недоступное хранилище не мешает работе сметы.
  }
}

const savedDraft = readDraft();
if (savedDraft) {
  ['from', 'to', 'number', 'date'].forEach((id) => {
    if (savedDraft[id] !== undefined) document.getElementById(id).value = savedDraft[id];
  });
  if (savedDraft.discount !== undefined) discountInput.value = savedDraft.discount;
  if (savedDraft.vat !== undefined) vatInput.value = savedDraft.vat;
  if (savedDraft.currency) currencySelect.value = savedDraft.currency;
}

/* Старое отдельное сохранение поддерживаем для совместимости. */
try {
  if (!savedDraft) fromInput.value = localStorage.getItem('smeta.from') || '';
} catch (error) {
  // Если localStorage недоступен, поле работает как обычный ввод.
}

fromInput.addEventListener('input', () => {
  try {
    localStorage.setItem('smeta.from', fromInput.value);
  } catch (error) {
    // Ошибка сохранения не мешает работе сметы.
  }
});

// Дата по умолчанию — сегодня
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
if (!document.getElementById('date').value) {
  document.getElementById('date').value =
    now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
}

// Пустое или неверное поле = 0, чтобы не было NaN
function toNumber(value) {
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

const WORDS_ONES = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const WORDS_FEMININE = ['ноль', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const WORDS_TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const WORDS_TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const WORDS_HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
const WORDS_SCALES = [
  null,
  { forms: ['тысяча', 'тысячи', 'тысяч'], feminine: true },
  { forms: ['миллион', 'миллиона', 'миллионов'] },
  { forms: ['миллиард', 'миллиарда', 'миллиардов'] },
  { forms: ['триллион', 'триллиона', 'триллионов'] },
  { forms: ['квадриллион', 'квадриллиона', 'квадриллионов'] },
];

function pluralForm(value, forms) {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  const last = value % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function tripletInWords(value, feminine) {
  const parts = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds) parts.push(WORDS_HUNDREDS[hundreds]);
  if (rest >= 10 && rest <= 19) {
    parts.push(WORDS_TEENS[rest - 10]);
  } else {
    const tens = Math.floor(rest / 10);
    const ones = rest % 10;
    if (tens) parts.push(WORDS_TENS[tens]);
    if (ones) parts.push((feminine ? WORDS_FEMININE : WORDS_ONES)[ones]);
  }
  return parts;
}

function integerInWords(value) {
  if (value === 0) return 'ноль';
  const parts = [];
  let groupIndex = 0;
  while (value > 0) {
    const group = value % 1000;
    if (group) {
      const scale = WORDS_SCALES[groupIndex];
      parts.unshift(...tripletInWords(group, Boolean(scale && scale.feminine)));
      if (scale) parts.push(pluralForm(group, scale.forms));
    }
    value = Math.floor(value / 1000);
    groupIndex += 1;
  }
  return parts.join(' ');
}

function amountInWords(amount) {
  const centsTotal = Math.round(amount * 100);
  const whole = Math.floor(centsTotal / 100);
  const cents = centsTotal % 100;
  let text = integerInWords(whole) + ' тенге';
  if (cents) text += ' ' + String(cents).padStart(2, '0') + ' тиын';
  return text[0].toLocaleUpperCase('ru-RU') + text.slice(1);
}

function formatMoney(n) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + currencySelect.value;
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function recalc() {
  // 1. Сумма позиций
  let subtotal = 0;
  rows.querySelectorAll('tr').forEach((row) => {
    const sum = toNumber(row.querySelector('.qty').value) * toNumber(row.querySelector('.price').value);
    row.querySelector('.sum').textContent = formatMoney(round(sum));
    subtotal += sum;
  });
  subtotal = round(subtotal);

  // 2. Скидка (от 0 до 100 %)
  const discountPercent = Math.min(Math.max(toNumber(discountInput.value), 0), 100);
  const discount = round(subtotal * discountPercent / 100);
  const afterDiscount = round(subtotal - discount);

  // 3. НДС считается от суммы со скидкой
  const vatPercent = Math.max(toNumber(vatInput.value), 0);
  const vat = round(afterDiscount * vatPercent / 100);
  const total = round(afterDiscount + vat);

  setText('subtotal', formatMoney(subtotal));
  setText('discount-label', discountPercent + ' %');
  setText('discount-amount', '−' + formatMoney(discount));
  setText('after-discount', formatMoney(afterDiscount));
  setText('vat-label', vatPercent + ' %');
  setText('vat-amount', '+' + formatMoney(vat));
  setText('total', formatMoney(total));

  const totalWordsRow = document.getElementById('total-words-row');
  const showTotalWords = currencySelect.value === '₸' && total > 0;
  totalWordsRow.hidden = !showTotalWords;
  if (showTotalWords) setText('total-words', amountInWords(total));

  // Скидка 0 — строки скидки скрыты; НДС 0 — строка НДС скрыта
  document.getElementById('discount-row').hidden = discountPercent === 0;
  document.getElementById('after-discount-row').hidden = discountPercent === 0;
  document.getElementById('vat-row').hidden = vatPercent === 0;
  saveDraft();
}

function addRow() {
  const row = template.content.firstElementChild.cloneNode(true);
  rows.appendChild(row);
  saveDraft();
  row.querySelector('.name').focus();
  recalc();
}

// Ввод в любое поле — сразу пересчёт
rows.addEventListener('input', recalc);
discountInput.addEventListener('input', recalc);
vatInput.addEventListener('input', recalc);
currencySelect.addEventListener('change', recalc);
['from', 'to', 'number', 'date'].forEach((id) => {
  document.getElementById(id).addEventListener('input', saveDraft);
  document.getElementById(id).addEventListener('change', saveDraft);
});

// Кнопка ✕ удаляет строку
rows.addEventListener('click', (event) => {
  if (event.target.classList.contains('remove')) {
    event.target.closest('tr').remove();
    recalc();
  }
});

// Enter в строке — новая позиция
rows.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
    event.preventDefault();
    addRow();
  }
});

document.getElementById('add').addEventListener('click', addRow);

if (savedDraft && Array.isArray(savedDraft.rows) && savedDraft.rows.length) {
  savedDraft.rows.forEach((item) => {
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector('.name').value = item.name || '';
    row.querySelector('.qty').value = item.qty || '';
    row.querySelector('.unit').value = item.unit || 'шт';
    row.querySelector('.price').value = item.price || '';
    rows.appendChild(row);
  });
  recalc();
} else {
  addRow();
}

document.getElementById('clear').addEventListener('click', () => {
  if (!window.confirm('Очистить все позиции, скидку и НДС?')) return;
  rows.replaceChildren();
  discountInput.value = '0';
  vatInput.value = '0';
  addRow();
  recalc();
});

// ===== Функция 3: документ в PDF =====
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function buildPrintDoc() {
  recalc();
  const doc = document.getElementById('print-doc');
  doc.innerHTML = '';

  const number = document.getElementById('number').value.trim() || '1';
  const dateValue = document.getElementById('date').value;
  const date = dateValue ? dateValue.split('-').reverse().join('.') : '';
  const from = document.getElementById('from').value.trim() || '—';
  const to = document.getElementById('to').value.trim() || '—';

  doc.appendChild(el('h1', 'Смета № ' + number + ' от ' + date));
  doc.appendChild(el('p', 'От кого: ' + from));
  doc.appendChild(el('p', 'Для кого: ' + to));

  // Таблица позиций с рамками
  const table = el('table');
  const head = el('tr');
  ['№', 'Название', 'Кол-во', 'Ед.', 'Цена', 'Сумма'].forEach((title) => head.appendChild(el('th', title)));
  table.appendChild(head);

  let index = 0;
  rows.querySelectorAll('tr').forEach((row) => {
    const name = row.querySelector('.name').value.trim();
    const qty = row.querySelector('.qty').value;
    const price = row.querySelector('.price').value;
    if (!name && !qty && !price) return; // пустые строки не печатаем
    index += 1;
    const tr = el('tr');
    tr.appendChild(el('td', String(index)));
    tr.appendChild(el('td', name || '—'));
    tr.appendChild(el('td', String(toNumber(qty)), 'num'));
    tr.appendChild(el('td', row.querySelector('.unit').value));
    tr.appendChild(el('td', formatMoney(toNumber(price)), 'num'));
    tr.appendChild(el('td', row.querySelector('.sum').textContent, 'num'));
    table.appendChild(tr);
  });
  doc.appendChild(table);

  // Итоги — те же цифры, что на экране
  const totals = el('div', undefined, 'totals');
  document.querySelectorAll('.summary > div').forEach((line) => {
    if (line.hidden) return;
    const p = el('p');
    p.appendChild(el('span', line.querySelector('dt').textContent));
    p.appendChild(el('strong', line.querySelector('dd').textContent));
    totals.appendChild(p);
  });
  doc.appendChild(totals);

  // Строка для подписи
  const sign = el('div', undefined, 'sign');
  sign.appendChild(el('p', 'Исполнитель: ____________ / ' + from));
  sign.appendChild(el('p', 'Заказчик: ____________ / ' + to));
  doc.appendChild(sign);
}

document.getElementById('print').addEventListener('click', () => {
  buildPrintDoc();
  window.print();
});

function buildWhatsAppText() {
  recalc();
  const number = document.getElementById('number').value.trim() || '1';
  const dateValue = document.getElementById('date').value;
  const date = dateValue ? dateValue.split('-').reverse().join('.') : '';
  const from = document.getElementById('from').value.trim() || '—';
  const to = document.getElementById('to').value.trim() || '—';
  const numberFormat = (value) => toNumber(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  const lines = ['Смета № ' + number + ' от ' + date, 'От кого: ' + from, 'Для кого: ' + to];

  let index = 0;
  rows.querySelectorAll('tr').forEach((row) => {
    const name = row.querySelector('.name').value.trim();
    const qty = row.querySelector('.qty').value;
    const price = row.querySelector('.price').value;
    if (!name && !qty && !price) return;
    index += 1;
    const unit = row.querySelector('.unit').value.trim();
    lines.push(index + '. ' + (name || '—') + ' — ' + numberFormat(qty) + (unit ? ' ' + unit : '') +
      ' × ' + formatMoney(toNumber(price)) + ' = ' + row.querySelector('.sum').textContent);
  });

  document.querySelectorAll('.summary > div').forEach((line) => {
    if (line.hidden || line.classList.contains('grand') || line.id === 'after-discount-row' || line.id === 'total-words-row') return;
    const label = line.querySelector('dt').textContent.trim();
    const amount = line.querySelector('dd').textContent.trim();
    lines.push(label + ': ' + amount);
  });
  const total = document.querySelector('.summary .grand');
  lines.push(total.querySelector('dt').textContent + ': ' + total.querySelector('dd').textContent);
  const totalWordsRow = document.getElementById('total-words-row');
  if (!totalWordsRow.hidden) lines.push(totalWordsRow.querySelector('dd').textContent);
  return lines.join('\n');
}

const copyButton = document.getElementById('copy-whatsapp');
const copyFallback = document.getElementById('copy-fallback');
let copyLabelTimer;
copyButton.addEventListener('click', async () => {
  const text = buildWhatsAppText();
  copyFallback.hidden = true;
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    copyButton.textContent = 'Скопировано ✓';
    clearTimeout(copyLabelTimer);
    copyLabelTimer = setTimeout(() => { copyButton.textContent = 'Скопировать для WhatsApp'; }, 2000);
  } catch (error) {
    copyFallback.value = text;
    copyFallback.hidden = false;
    copyFallback.focus();
    copyFallback.select();
  }
});

// Если печатают через Cmd+P — документ тоже соберётся
window.addEventListener('beforeprint', buildPrintDoc);

// ===== Шаблоны услуг: выпадающий список =====
// Цены примерные — замените на свои
const SERVICES = [
  { name: 'Покраска стен', unit: 'м²', price: 2500 },
  { name: 'Грунтовка', unit: 'м²', price: 800 },
  { name: 'Шпаклёвка', unit: 'м²', price: 2000 },
  { name: 'Штукатурка', unit: 'м²', price: 3000 },
  { name: 'Поклейка обоев', unit: 'м²', price: 2000 },
  { name: 'Укладка ламината', unit: 'м²', price: 3000 },
  { name: 'Укладка плитки', unit: 'м²', price: 7000 },
  { name: 'Демонтаж', unit: 'м²', price: 1500 },
  { name: 'Установка розетки', unit: 'шт', price: 3000 },
  { name: 'Вывоз мусора', unit: 'рейс', price: 15000 },
];

// Создаём список подсказок
const datalist = document.createElement('datalist');
datalist.id = 'services';
SERVICES.forEach((service) => {
  const option = document.createElement('option');
  option.value = service.name;
  datalist.appendChild(option);
});
document.body.appendChild(datalist);

// Подключаем список к полю «Название» — в новых и уже существующих строках
template.content.querySelector('.name').setAttribute('list', 'services');
rows.querySelectorAll('.name').forEach((input) => input.setAttribute('list', 'services'));

// Выбрали услугу из списка — подставляем единицу и цену
rows.addEventListener('input', (event) => {
  if (!event.target.classList.contains('name')) return;
  const service = SERVICES.find((s) => s.name === event.target.value);
  if (!service) return;
  const row = event.target.closest('tr');
  row.querySelector('.unit').value = service.unit;
  row.querySelector('.price').value = service.price;
  recalc();
});
