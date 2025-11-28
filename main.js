/* main.js — FitCRM functionality (localStorage + UI glue)
   - Supports index.html, clients.html, client-view.html
   - Author: FitCRM student prototype
*/

/* ---------- Utilities ---------- */
const STORAGE_KEY = 'fitcrm_clients_v1';

function uid() {
  return String(Date.now()) + Math.floor(Math.random()*1000);
}

function loadClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    console.error('Failed to parse clients from localStorage', e);
    return [];
  }
}
function saveClients(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ---------- Validation helpers ---------- */
function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function showError(inputEl, message) {
  const sel = inputEl.id;
  const small = document.querySelector(`.error[data-for="${sel}"]`);
  if (small) small.textContent = message || '';
}
function clearErrors(form) {
  form.querySelectorAll('.error').forEach(e => e.textContent = '');
}

/* ---------- Page detection ---------- */
const page = document.body.dataset.page || '';

/* ------------- INDEX (New Client) -------------- */
if (page === 'index') {
  const form = document.getElementById('client-form');

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
      history: [] // placeholder for training history
    };

    // Validation
    let ok = true;
    if (!data.fullName) {
      showError(form.fullName, 'Full name is required');
      ok = false;
    }
    if (!data.email || !isEmail(data.email)) {
      showError(form.email, 'Enter a valid email');
      ok = false;
    }
    if (!data.phone || data.phone.length < 6) {
      showError(form.phone, 'Enter a valid phone');
      ok = false;
    }
    if (!data.goal) {
      showError(form.goal, 'Fitness goal is required');
      ok = false;
    }
    if (!data.startDate) {
      showError(form.startDate, 'Start date is required');
      ok = false;
    }

    if (!ok) return;

    const clients = loadClients();
    clients.unshift(data); // newest first
    saveClients(clients);

    // UX feedback — redirect to list
    window.location.href = 'clients.html';
  });
}

/* -------------- CLIENTS (list + edit + delete + search) ------------- */
if (page === 'clients') {
  const tbody = document.querySelector('#clients-table tbody');
  const searchInput = document.getElementById('search');
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  let currentEditId = null;

  function renderTable(filter = '') {
    const clients = loadClients();
    const q = filter.trim().toLowerCase();
    tbody.innerHTML = '';

    clients.forEach(client => {
      if (q && !client.fullName.toLowerCase().includes(q)) return;

      const tr = document.createElement('tr');
      tr.setAttribute('data-id', client.id);
      tr.innerHTML = `
        <td>${escapeHtml(client.fullName)}</td>
        <td>${escapeHtml(client.email)}</td>
        <td>${escapeHtml(client.phone)}</td>
        <td>${escapeHtml(client.goal)}</td>
        <td>${escapeHtml(client.startDate)}</td>
        <td class="actions-col">
          <button class="btn small view-btn">View</button>
          <button class="btn small edit-btn">Edit</button>
          <button class="btn small danger delete-btn">Delete</button>
        </td>
      `;
      // row click navigates to view (except when clicking a button)
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        // store selected id and go to detail page
        localStorage.setItem('fitcrm_selected', client.id);
        window.location.href = 'client-view.html';
      });

      tbody.appendChild(tr);
    });

    // add event listeners for action buttons
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.target.closest('tr').dataset.id;
        confirmDelete(id);
      });
    });

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.target.closest('tr').dataset.id;
        openEditModal(id);
      });
    });

    tbody.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.target.closest('tr').dataset.id;
        localStorage.setItem('fitcrm_selected', id);
        window.location.href = 'client-view.html';
      });
    });
  }

  function confirmDelete(id) {
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Are you sure you want to delete ${c.fullName}? This action cannot be undone.`)) return;
    const filtered = clients.filter(x => x.id !== id);
    saveClients(filtered);
    renderTable(searchInput.value);
  }

  // edit modal helpers
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
  }

  function closeEditModal() {
    currentEditId = null;
    editModal.classList.add('hidden');
  }

  document.getElementById('close-edit').addEventListener('click', closeEditModal);

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

    // validation
    let ok = true;
    if (!updated.fullName) { showError(editForm['edit-fullName'], 'Full name required'); ok = false; }
    if (!updated.email || !isEmail(updated.email)) { showError(editForm['edit-email'], 'Valid email required'); ok = false; }
    if (!updated.phone || updated.phone.length < 6) { showError(editForm['edit-phone'], 'Valid phone required'); ok = false; }
    if (!updated.goal) { showError(editForm['edit-goal'], 'Goal required'); ok = false; }
    if (!updated.startDate) { showError(editForm['edit-startDate'], 'Start date required'); ok = false; }
    if (!ok) return;

    const clients = loadClients();
    const idx = clients.findIndex(x => x.id === currentEditId);
    if (idx === -1) return;
    clients[idx] = {...clients[idx], ...updated};
    saveClients(clients);
    closeEditModal();
    renderTable(searchInput.value);
  });

  // search
  searchInput.addEventListener('input', () => {
    renderTable(searchInput.value);
  });

  // initial render
  renderTable();

  // small util: escape HTML for safety
  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}

/* ------------- CLIENT VIEW (client-view.html) -------------- */
if (page === 'view') {
  const selectedId = localStorage.getItem('fitcrm_selected');
  const nameEl = document.getElementById('cv-name');
  const emailEl = document.getElementById('cv-email');
  const phoneEl = document.getElementById('cv-phone');
  const goalEl = document.getElementById('cv-goal');
  const startEl = document.getElementById('cv-start');
  const historyEl = document.getElementById('cv-history');
  const exerciseListEl = document.getElementById('exercise-list');
  const editFromView = document.getElementById('edit-from-view');

  const clients = loadClients();
  const c = clients.find(x => x.id === selectedId);
  if (!c) {
    nameEl.textContent = 'Client not found';
    exerciseListEl.innerHTML = '<p class="muted">No client selected.</p>';
  } else {
    nameEl.textContent = c.fullName;
    emailEl.textContent = c.email;
    phoneEl.textContent = c.phone;
    goalEl.textContent = c.goal;
    startEl.textContent = c.startDate || '-';
    // training history (if present)
    if (Array.isArray(c.history) && c.history.length) {
      historyEl.innerHTML = c.history.map(h => `<li>${escapeHtml(h)}</li>`).join('');
    } else {
      historyEl.innerHTML = '<li class="muted">No training history yet.</li>';
    }
    // edit link - go to edit modal on clients page
    editFromView.addEventListener('click', (ev) => {
      ev.preventDefault();
      // store id and navigate to clients page; the clients page will open modal if find param
      localStorage.setItem('fitcrm_open_edit', selectedId);
      window.location.href = 'clients.html';
    });

    // Fetch exercises (Wger) - get a list then pick 5
    fetchExercisesForSession(exerciseListEl);
  }

  // fetch exercises from Wger API (language=2 => English)
  async function fetchExercisesForSession(containerEl) {
    containerEl.innerHTML = '<p class="muted">Fetching suggested exercises…</p>';
    try {
      // We'll request a larger page of exercises then pick 5 random ones.
      const resp = await fetch('https://wger.de/api/v2/exercise/?language=2&limit=100');
      if (!resp.ok) throw new Error('API not available');
      const data = await resp.json();
      const list = Array.isArray(data.results) ? data.results.filter(e => e.description && e.name) : [];
      if (!list.length) throw new Error('No exercises found');

      // pick 5 random unique exercises
      const picks = pickRandom(list, 5);
      containerEl.innerHTML = '';
      picks.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'exercise-card';
        div.innerHTML = `<strong>${escapeHtml(ex.name)}</strong><p class="muted small">${stripHtml(ex.description).slice(0,220)}${ex.description.length>220?'…':''}</p>`;
        containerEl.appendChild(div);
      });
    } catch (err) {
      console.warn('Exercise fetch failed:', err);
      containerEl.innerHTML = '<p class="muted">Could not fetch external exercises. Try again later.</p>';
    }
  }

  function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (out.length < n && copy.length) {
      const i = Math.floor(Math.random()*copy.length);
      out.push(copy.splice(i,1)[0]);
    }
    return out;
  }

  function stripHtml(input) {
    return input ? input.replace(/<[^>]*>/g, '') : '';
  }

  // small util: escape HTML
  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}

/* ---------- Extra: when navigating from view to clients, open edit automatically ---------- */
if (page === 'clients') {
  const preOpenId = localStorage.getItem('fitcrm_open_edit');
  if (preOpenId) {
    // small timeout to allow UI to initialize
    setTimeout(() => {
      localStorage.removeItem('fitcrm_open_edit');
      const ev = new Event('open-edit');
      document.dispatchEvent(ev);
      // Find function openEditModal is in the closure above; instead, we trigger a click on row edit button:
      const row = document.querySelector(`tr[data-id="${preOpenId}"]`);
      if (row) {
        const btn = row.querySelector('.edit-btn');
        if (btn) btn.click();
      }
    }, 300);
  }
}
