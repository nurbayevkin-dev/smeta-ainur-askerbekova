const rows = document.getElementById('rows');
const template = document.getElementById('row-template');
const discountInput = document.getElementById('discount');
const vatInput = document.getElementById('vat');
const currencySelect = document.getElementById('currency');

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
