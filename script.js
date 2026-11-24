const rows = document.getElementById('rows');
const template = document.getElementById('row-template');
const discountInput = document.getElementById('discount');
const vatInput = document.getElementById('vat');
const currencySelect = document.getElementById('currency');
const fromInput = document.getElementById('from');

// Запоминаем только поле «От кого» в этом браузере.
try {
  fromInput.value = localStorage.getItem('smeta.from') || '';
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
document.getElementById('date').value =
  now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

// Пустое или неверное поле = 0, чтобы не было NaN
function toNumber(value) {
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function round(n) {
  return Math.round(n * 100) / 100;
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

  // Скидка 0 — строки скидки скрыты; НДС 0 — строка НДС скрыта
  document.getElementById('discount-row').hidden = discountPercent === 0;
  document.getElementById('after-discount-row').hidden = discountPercent === 0;
  document.getElementById('vat-row').hidden = vatPercent === 0;
}

function addRow() {
  const row = template.content.firstElementChild.cloneNode(true);
  rows.appendChild(row);
  row.querySelector('.name').focus();
  recalc();
}

// Ввод в любое поле — сразу пересчёт
rows.addEventListener('input', recalc);
discountInput.addEventListener('input', recalc);
vatInput.addEventListener('input', recalc);
currencySelect.addEventListener('change', recalc);

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

addRow();

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
