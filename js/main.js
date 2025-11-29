/* main.js — FitCRM functionality (fitness-themed)
   - Works across index.html, clients.html, client-view.html
   - localStorage persistence, add, edit, delete, search, view
   - Fetches suggested exercises (Wger) with graceful fallback
*/

const STORAGE_KEY = 'fitcrm_clients_v2';
const SELECT_KEY = 'fitcrm_selected';
const OPEN_EDIT_KEY = 'fitcrm_open_edit';

// ---------- small utilities ----------
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const uid = () => String(Date.now()) + Math.floor(Math.random()*1000);
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
const loadClients = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    console.error('parse error', e);
    return [];
  }
};
const saveClients = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

// escape to prevent XSS when injecting into tables
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showError(inputEl, message){
  if (!inputEl) return;
  const id = inputEl.id;
  const small = document.querySelector(`.error[data-for="${id}"]`);
  if (small) small.textContent = message || '';
}
function clearErrors(form){
  if (!form) return;
  form.querySelectorAll('.error').forEach(e => e.textContent = '');
}

// ---------- page detection ----------
const page = document.body.dataset.page || '';

// ---------- INDEX: add client ----------
if (page === 'index') {
  const form = $('#client-form');

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    clearErrors(form);

    const data = {
      id: uid(),
      fullName: form.fullName.value.trim(),
      age: form.age.value,
      gender: form.gender.value,
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      goal: form.goal.value.trim(),
      startDate: form.startDate.value,
      history: []
    };

    let ok = true;
    if (!data.fullName) { showError(form.fullName, 'Full name required'); ok=false; }
    if (!data.email || !isEmail(data.email)) { showError(form.email, 'Valid email required'); ok=false; }
    if (!data.phone || data.phone.length < 6) { showError(form.phone, 'Enter a valid phone'); ok=false; }
    if (!data.goal) { showError(form.goal, 'Fitness goal required'); ok=false; }
    if (!data.startDate) { showError(form.startDate, 'Start date required'); ok=false; }
    if (!ok) return;

    const clients = loadClients();
    clients.unshift(data);
    saveClients(clients);

    // nice feedback: temporarily flash a message (alert fallback)
    try {
      localStorage.setItem('fitcrm_last_added', data.id);
    } catch(e){}
    window.location.href = 'clients.html';
  });
}

// ---------- CLIENTS: render, search, edit, delete, view ----------
if (page === 'clients') {
  const tbody = $('#clients-table tbody');
  const searchInput = $('#search');
  const editModal = $('#edit-modal');
  const editForm = $('#edit-form');
  const closeEditBtn = $('#close-edit');
  let currentEditId = null;

  function renderTable(filter='') {
    const clients = loadClients();
    const q = (filter || '').toLowerCase().trim();
    tbody.innerHTML = '';

    clients.forEach(client => {
      if (q && !client.fullName.toLowerCase().includes(q)) return;
      const tr = document.createElement('tr');
      tr.dataset.id = client.id;
      tr.innerHTML = `
        <td>${escapeHtml(client.fullName)}</td>
        <td>${escapeHtml(client.email)}</td>
        <td>${escapeHtml(client.phone)}</td>
        <td>${escapeHtml(client.goal)}</td>
        <td>${escapeHtml(client.startDate || '-')}</td>
        <td class="actions-col">
          <button class="btn small view-btn">View</button>
          <button class="btn small edit-btn">Edit</button>
          <button class="btn small danger delete-btn">Delete</button>
        </td>
      `;
      // row click (not when clicking a button) -> view
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        localStorage.setItem(SELECT_KEY, client.id);
        window.location.href = 'client-view.html';
      });
      tbody.appendChild(tr);
    });

    // attach actions
    $$('.delete-btn', tbody).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('tr').dataset.id;
        confirmDelete(id);
      });
    });
    $$('.edit-btn', tbody).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('tr').dataset.id;
        openEditModal(id);
      });
    });
    $$('.view-btn', tbody).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('tr').dataset.id;
        localStorage.setItem(SELECT_KEY, id);
        window.location.href = 'client-view.html';
      });
    });
  }

  function confirmDelete(id) {
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete ${c.fullName}? This action cannot be undone.`)) return;
    const filtered = clients.filter(x => x.id !== id);
    saveClients(filtered);
    renderTable(searchInput.value);
  }

  // open modal and populate
  function openEditModal(id) {
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    currentEditId = id;
    editForm['edit-fullName'].value = c.fullName;
    editForm['edit-email'].value = c.email;
    editForm['edit-phone'].value = c.phone;
    editForm['edit-goal'].value = c.goal;
    editForm['edit-startDate'].value = c.startDate;
    clearErrors(editForm);
    editModal.classList.remove('hidden');
    editModal.setAttribute('aria-hidden','false');
  }
  function closeEditModal() {
    currentEditId = null;
    editModal.classList.add('hidden');
    editModal.setAttribute('aria-hidden','true');
  }

  closeEditBtn.addEventListener('click', closeEditModal);

  editForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    clearErrors(editForm);
    if (!currentEditId) return;
    const updated = {
      fullName: editForm['edit-fullName'].value.trim(),
      email: editForm['edit-email'].value.trim(),
      phone: editForm['edit-phone'].value.trim(),
      goal: editForm['edit-goal'].value.trim(),
      startDate: editForm['edit-startDate'].value
    };
    let ok = true;
    if (!updated.fullName) { showError(editForm['edit-fullName'], 'Required'); ok=false; }
    if (!updated.email || !isEmail(updated.email)) { showError(editForm['edit-email'],'Valid email required'); ok=false; }
    if (!updated.phone || updated.phone.length < 6) { showError(editForm['edit-phone'],'Valid phone required'); ok=false; }
    if (!updated.goal) { showError(editForm['edit-goal'],'Goal required'); ok=false; }
    if (!updated.startDate) { showError(editForm['edit-startDate'],'Start date required'); ok=false; }
    if (!ok) return;

    const clients = loadClients();
    const idx = clients.findIndex(x => x.id === currentEditId);
    if (idx === -1) return;
    clients[idx] = {...clients[idx], ...updated};
    saveClients(clients);
    closeEditModal();
    renderTable(searchInput.value);
  });

  searchInput.addEventListener('input', () => renderTable(searchInput.value));

  // show flash if redirected from add
  const justAddedId = localStorage.getItem('fitcrm_last_added');
  if (justAddedId) {
    localStorage.removeItem('fitcrm_last_added');
    // optionally, highlight new row
    setTimeout(()=> {
      const row = document.querySelector(`tr[data-id="${justAddedId}"]`);
      if (row) {
        row.style.transition = 'background 0.6s';
        row.style.background = 'linear-gradient(90deg,#fff8e8,#fff)';
        setTimeout(()=> row.style.background = '', 1600);
      }
    }, 300);
  }

  // initial render
  renderTable();

  // if we were instructed to open an edit (from client-view)
  const preOpen = localStorage.getItem(OPEN_EDIT_KEY);
  if (preOpen) {
    localStorage.removeItem(OPEN_EDIT_KEY);
    setTimeout(()=> {
      const btn = document.querySelector(`tr[data-id="${preOpen}"] .edit-btn`);
      if (btn) btn.click();
    }, 250);
  }
}

// ---------- CLIENT VIEW: show client + fetch exercises ----------
if (page === 'view') {
  const selected = localStorage.getItem(SELECT_KEY);
  const nameEl = $('#cv-name');
  const emailEl = $('#cv-email');
  const phoneEl = $('#cv-phone');
  const goalEl = $('#cv-goal');
  const startEl = $('#cv-start');
  const historyEl = $('#cv-history');
  const exerciseListEl = $('#exercise-list');
  const editBtn = $('#cv-edit');

  const clients = loadClients();
  const c = clients.find(x => x.id === selected);
  if (!c) {
    nameEl.textContent = 'Client not found';
    exerciseListEl.innerHTML = '<p class="muted">No client selected.</p>';
  } else {
    nameEl.textContent = c.fullName;
    emailEl.textContent = c.email;
    phoneEl.textContent = c.phone;
    goalEl.textContent = c.goal;
    startEl.textContent = c.startDate || '-';
    if (Array.isArray(c.history) && c.history.length) {
      historyEl.innerHTML = c.history.map(h => `<li>${escapeHtml(h)}</li>`).join('');
    } else {
      historyEl.innerHTML = '<li class="muted">No training history yet.</li>';
    }

    // go to clients page and open edit for this id
    editBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      localStorage.setItem(OPEN_EDIT_KEY, c.id);
      window.location.href = 'clients.html';
    });

    fetchExercises(exerciseListEl);
  }

  // Fetch exercises from Wger; handle CORS / network errors gracefully
  async function fetchExercises(container) {
    container.innerHTML = '<p class="muted">Fetching suggested exercises…</p>';
    try {
      // fetch a large list and sample 5 (language=2 -> English)
      const res = await fetch('https://wger.de/api/v2/exercise/?language=2&limit=150');
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      const items = (json.results || []).filter(it => it.name);
      if (!items.length) throw new Error('no items');
      const picks = sample(items, 5);
      container.innerHTML = '';
      picks.forEach(p => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.innerHTML = `<strong>${escapeHtml(p.name)}</strong><p class="muted small">${stripHtml(p.description || '').slice(0,180)}${(p.description||'').length>180?'…':''}</p>`;
        container.appendChild(card);
      });
    } catch (err) {
      console.warn('Exercise fetch failed', err);
      container.innerHTML = `<p class="muted">Could not load external exercises (network or CORS). You can still use the client details offline.</p>`;
    }
  }
  function stripHtml(s='') { return s.replace(/<[^>]*>/g, ''); }
  function sample(arr, n) {
    const out=[]; const copy=arr.slice();
    while(out.length<n && copy.length){
      const i=Math.floor(Math.random()*copy.length);
      out.push(copy.splice(i,1)[0]);
    }
    return out;
  }
}

