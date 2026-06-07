const STORAGE_KEY = 'avJitenRecords.v1';
const AGE_KEY = 'avJitenAgeOK.v1';

const state = {
  records: [],
  filter: 'all',
  codeQuery: '',
  actressQuery: '',
  editingId: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  ageGate: $('#ageGate'),
  confirmAgeBtn: $('#confirmAgeBtn'),
  openPrivacyFromGate: $('#openPrivacyFromGate'),
  privacyDialog: $('#privacyDialog'),
  openPrivacyBtn: $('#openPrivacyBtn'),
  closePrivacyBtn: $('#closePrivacyBtn'),
  codeSearchForm: $('#codeSearchForm'),
  actressSearchForm: $('#actressSearchForm'),
  codeSearch: $('#codeSearch'),
  actressSearch: $('#actressSearch'),
  clearSearchBtn: $('#clearSearchBtn'),
  manualForm: $('#manualForm'),
  resetFormBtn: $('#resetFormBtn'),
  saveBtn: $('#saveBtn'),
  cards: $('#cards'),
  emptyState: $('#emptyState'),
  resultInfo: $('#resultInfo'),
  exportBtn: $('#exportBtn'),
  importInput: $('#importInput'),
  template: $('#cardTemplate'),
  itemCode: $('#itemCode'),
  itemTitle: $('#itemTitle'),
  itemActresses: $('#itemActresses'),
  itemUrl: $('#itemUrl'),
  itemThumb: $('#itemThumb'),
  itemMemo: $('#itemMemo'),
  itemFavorite: $('#itemFavorite'),
  itemWatched: $('#itemWatched'),
};

function normalizeCode(value) {
  return (value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function normalizeText(value) {
  return (value || '').trim();
}

function splitActresses(value) {
  return normalizeText(value)
    .split(/[、,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.records = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.records)) state.records = [];
  } catch (error) {
    console.warn('Failed to load records', error);
    state.records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function showAgeGateIfNeeded() {
  if (localStorage.getItem(AGE_KEY) !== 'yes') {
    els.ageGate.hidden = false;
    els.ageGate.removeAttribute('hidden');
    els.ageGate.style.display = 'grid';
  } else {
    els.ageGate.hidden = true;
    els.ageGate.style.display = 'none';
  }
}

function openPrivacy() {
  if (typeof els.privacyDialog.showModal === 'function') {
    els.privacyDialog.showModal();
  } else {
    alert('プライバシーポリシーは画面下部の本文をご確認ください。');
  }
}

function closePrivacy() {
  if (els.privacyDialog.open) els.privacyDialog.close();
}

function buildExternalUrl(site, query) {
  const q = normalizeText(query);
  const encoded = encodeURIComponent(q);
  if (!q) return '';

  switch (site) {
    case 'fanza':
      return `https://www.dmm.co.jp/search/=/searchstr=${encoded}/`;
    case 'x':
      return `https://x.com/search?q=${encoded}&src=typed_query`;
    case 'google':
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`${q} FANZA`)}`;
  }
}

function openExternalSearch(kind, site) {
  const query = kind === 'actress' ? els.actressSearch.value : els.codeSearch.value;
  const url = buildExternalUrl(site, query);
  if (!url) {
    alert(kind === 'actress' ? '女優名を入力してください。' : '品番を入力してください。');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function applySearchFromForms() {
  state.codeQuery = normalizeCode(els.codeSearch.value);
  state.actressQuery = normalizeText(els.actressSearch.value).toLowerCase();
  render();
}

function clearSearch() {
  els.codeSearch.value = '';
  els.actressSearch.value = '';
  state.codeQuery = '';
  state.actressQuery = '';
  state.filter = 'all';
  $$('.filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
  render();
}

function matchesSearch(record) {
  const code = normalizeCode(record.code);
  const actresses = (record.actresses || []).join(' ').toLowerCase();
  const title = (record.title || '').toLowerCase();

  const codeOk = !state.codeQuery || code.includes(state.codeQuery);
  const actressOk = !state.actressQuery || actresses.includes(state.actressQuery) || title.includes(state.actressQuery);

  if (!codeOk || !actressOk) return false;

  if (state.filter === 'favorite') return Boolean(record.favorite);
  if (state.filter === 'watched') return Boolean(record.watched);
  if (state.filter === 'unwatched') return !record.watched;
  return true;
}

function getFilteredRecords() {
  return state.records
    .filter(matchesSearch)
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

function resetManualForm() {
  state.editingId = null;
  els.manualForm.reset();
  els.saveBtn.textContent = '登録する';
}

function fillManualForm(record) {
  state.editingId = record.id;
  els.itemCode.value = record.code || '';
  els.itemTitle.value = record.title || '';
  els.itemActresses.value = (record.actresses || []).join(', ');
  els.itemUrl.value = record.url || '';
  els.itemThumb.value = record.thumb || '';
  els.itemMemo.value = record.memo || '';
  els.itemFavorite.checked = Boolean(record.favorite);
  els.itemWatched.checked = Boolean(record.watched);
  els.saveBtn.textContent = '更新する';
  els.manualForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function recordFromForm() {
  const code = normalizeCode(els.itemCode.value);
  if (!code) throw new Error('品番を入力してください。');

  return {
    code,
    title: normalizeText(els.itemTitle.value),
    actresses: splitActresses(els.itemActresses.value),
    url: normalizeText(els.itemUrl.value),
    thumb: normalizeText(els.itemThumb.value),
    memo: normalizeText(els.itemMemo.value),
    favorite: els.itemFavorite.checked,
    watched: els.itemWatched.checked,
  };
}

function upsertRecord(event) {
  event.preventDefault();

  try {
    const now = Date.now();
    const formRecord = recordFromForm();

    if (state.editingId) {
      const index = state.records.findIndex((record) => record.id === state.editingId);
      if (index >= 0) {
        state.records[index] = {
          ...state.records[index],
          ...formRecord,
          updatedAt: now,
        };
      }
    } else {
      const existingIndex = state.records.findIndex((record) => normalizeCode(record.code) === formRecord.code);
      if (existingIndex >= 0) {
        const ok = confirm('同じ品番がすでに登録されています。上書きしますか？');
        if (!ok) return;
        state.records[existingIndex] = {
          ...state.records[existingIndex],
          ...formRecord,
          updatedAt: now,
        };
      } else {
        state.records.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`,
          ...formRecord,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    saveRecords();
    resetManualForm();
    render();
  } catch (error) {
    alert(error.message || '登録できませんでした。');
  }
}

function toggleRecord(id, key) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  record[key] = !record[key];
  record.updatedAt = Date.now();
  saveRecords();
  render();
}

function deleteRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const ok = confirm(`${record.code || 'この作品'}を削除しますか？`);
  if (!ok) return;
  state.records = state.records.filter((item) => item.id !== id);
  saveRecords();
  render();
}

function renderCard(record) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  const thumb = node.querySelector('.thumb');
  const code = node.querySelector('.code');
  const title = node.querySelector('.title');
  const actresses = node.querySelector('.actresses');
  const memo = node.querySelector('.memo');
  const badges = node.querySelector('.status-badges');
  const favButton = node.querySelector('.toggle-fav');
  const watchedButton = node.querySelector('.toggle-watched');
  const openUrl = node.querySelector('.open-url');

  code.textContent = record.code || 'NO-CODE';
  title.textContent = record.title || 'タイトル未入力';
  actresses.textContent = (record.actresses && record.actresses.length) ? `女優：${record.actresses.join(' / ')}` : '女優：未入力';
  memo.textContent = record.memo || '';

  if (record.thumb) {
    thumb.src = record.thumb;
    thumb.alt = `${record.code || ''} サムネイル`;
    thumb.classList.add('has-image');
    thumb.onerror = () => {
      thumb.classList.remove('has-image');
      thumb.removeAttribute('src');
    };
  }

  if (record.favorite) badges.insertAdjacentHTML('beforeend', '<span class="badge favorite">★ お気に入り</span>');
  if (record.watched) badges.insertAdjacentHTML('beforeend', '<span class="badge watched">✓ 視聴済み</span>');

  favButton.textContent = record.favorite ? '★ お気に入り解除' : '☆ お気に入り';
  watchedButton.textContent = record.watched ? '視聴済み解除' : '未視聴→視聴済み';

  if (record.url) {
    openUrl.href = record.url;
    openUrl.hidden = false;
  } else {
    openUrl.hidden = true;
  }

  favButton.addEventListener('click', () => toggleRecord(record.id, 'favorite'));
  watchedButton.addEventListener('click', () => toggleRecord(record.id, 'watched'));
  node.querySelector('.edit-item').addEventListener('click', () => fillManualForm(record));
  node.querySelector('.delete-item').addEventListener('click', () => deleteRecord(record.id));

  return node;
}

function render() {
  const records = getFilteredRecords();
  els.cards.innerHTML = '';
  const fragment = document.createDocumentFragment();
  records.forEach((record) => fragment.appendChild(renderCard(record)));
  els.cards.appendChild(fragment);

  const total = state.records.length;
  els.emptyState.hidden = total !== 0;
  els.cards.hidden = total === 0;

  const conditions = [];
  if (state.codeQuery) conditions.push(`品番：${escapeHtml(state.codeQuery)}`);
  if (state.actressQuery) conditions.push(`女優名・タイトル：${escapeHtml(state.actressQuery)}`);
  if (state.filter !== 'all') conditions.push(`表示：${filterLabel(state.filter)}`);
  els.resultInfo.innerHTML = `${records.length}件表示 / 全${total}件${conditions.length ? `（${conditions.join('、')}）` : ''}`;
}

function filterLabel(filter) {
  return {
    all: '全部',
    favorite: 'お気に入り',
    watched: '視聴済み',
    unwatched: '未視聴',
  }[filter] || '全部';
}

function exportRecords() {
  const data = {
    app: 'AV辞典',
    version: 1,
    exportedAt: new Date().toISOString(),
    records: state.records,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `av-jiten-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importRecords(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const incoming = Array.isArray(data) ? data : data.records;
      if (!Array.isArray(incoming)) throw new Error('records が見つかりません。');

      const cleaned = incoming.map((record) => ({
        id: record.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        code: normalizeCode(record.code),
        title: normalizeText(record.title),
        actresses: Array.isArray(record.actresses) ? record.actresses.map(normalizeText).filter(Boolean) : splitActresses(record.actresses),
        url: normalizeText(record.url),
        thumb: normalizeText(record.thumb),
        memo: normalizeText(record.memo),
        favorite: Boolean(record.favorite),
        watched: Boolean(record.watched),
        createdAt: record.createdAt || Date.now(),
        updatedAt: Date.now(),
      })).filter((record) => record.code);

      const ok = confirm(`${cleaned.length}件を読み込みます。現在のデータに追加しますか？\n「キャンセル」を押すと現在のデータを置き換えます。`);
      state.records = ok ? mergeRecords(state.records, cleaned) : cleaned;
      saveRecords();
      render();
    } catch (error) {
      alert(`読み込みに失敗しました：${error.message}`);
    } finally {
      els.importInput.value = '';
    }
  };
  reader.readAsText(file);
}

function mergeRecords(current, incoming) {
  const map = new Map();
  current.forEach((record) => map.set(normalizeCode(record.code), record));
  incoming.forEach((record) => map.set(normalizeCode(record.code), { ...map.get(normalizeCode(record.code)), ...record }));
  return Array.from(map.values());
}

function bindEvents() {
  els.confirmAgeBtn.addEventListener('click', () => {
    localStorage.setItem(AGE_KEY, 'yes');
    els.ageGate.hidden = true;
    els.ageGate.setAttribute('hidden', '');
    els.ageGate.style.display = 'none';
  });
  els.openPrivacyFromGate.addEventListener('click', openPrivacy);
  els.openPrivacyBtn.addEventListener('click', openPrivacy);
  els.closePrivacyBtn.addEventListener('click', closePrivacy);
  els.privacyDialog.addEventListener('click', (event) => {
    if (event.target === els.privacyDialog) closePrivacy();
  });

  els.codeSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.codeQuery = normalizeCode(els.codeSearch.value);
    render();
    if (state.codeQuery && !els.itemCode.value) els.itemCode.value = state.codeQuery;
  });
  els.actressSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.actressQuery = normalizeText(els.actressSearch.value).toLowerCase();
    render();
    if (state.actressQuery && !els.itemActresses.value) els.itemActresses.value = els.actressSearch.value;
  });
  els.codeSearch.addEventListener('input', applySearchFromForms);
  els.actressSearch.addEventListener('input', applySearchFromForms);
  els.clearSearchBtn.addEventListener('click', clearSearch);

  $$('.external-search').forEach((button) => {
    button.addEventListener('click', () => openExternalSearch(button.dataset.kind, button.dataset.site));
  });

  $$('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      $$('.filter').forEach((item) => item.classList.toggle('active', item === button));
      render();
    });
  });

  els.manualForm.addEventListener('submit', upsertRecord);
  els.resetFormBtn.addEventListener('click', resetManualForm);
  els.exportBtn.addEventListener('click', exportRecords);
  els.importInput.addEventListener('change', () => importRecords(els.importInput.files[0]));
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Service worker registration failed', error));
  }
}

function init() {
  loadRecords();
  bindEvents();
  render();
  showAgeGateIfNeeded();
  registerServiceWorker();
}

init();
