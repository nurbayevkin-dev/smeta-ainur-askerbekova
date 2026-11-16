const rows = document.getElementById('rows');
const template = document.getElementById('row-template');
const totalEl = document.getElementById('total');

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

function formatMoney(n) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₸';
}

function recalc() {
  let total = 0;
  rows.querySelectorAll('tr').forEach((row) => {
    const sum = toNumber(row.querySelector('.qty').value) * toNumber(row.querySelector('.price').value);
    row.querySelector('.sum').textContent = formatMoney(sum);
    total += sum;
  });
  totalEl.textContent = formatMoney(total);
}

function addRow() {
  const row = template.content.firstElementChild.cloneNode(true);
  rows.appendChild(row);
  row.querySelector('.name').focus();
  recalc();
}

// Ввод в любое поле — сразу пересчёт
rows.addEventListener('input', recalc);

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
