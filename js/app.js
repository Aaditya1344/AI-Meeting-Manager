// MeetFlow Frontend Controller — Indira Gandhi Delhi Technical University

let currentUser = null;
let currentScreen = 'login';
let currentWizardStep = 1;
let selectedStaffIds = ['usr_sharma', 'usr_sneha', 'usr_manpreet', 'usr_ananya'];
let currentAvailabilityData = null;
let currentSelectedSlot = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initSession();
});

async function initSession() {
  const savedUserId = localStorage.getItem('meetflow_user_id');
  if (savedUserId) {
    try {
      API.setUserId(savedUserId);
      const data = await API.getMe();
      if (data && data.user) {
        currentUser = data.user;
        updateUserUI();
        if (currentUser.onboarded) {
          navigateTo('dashboard');
        } else {
          openOnboardingModal(currentUser);
        }
        return;
      }
    } catch (err) {
      console.warn('Session expired or invalid, routing to login:', err);
    }
  }

  // If no active session, show Login screen
  navigateTo('login');
}

function updateUserUI() {
  if (!currentUser) return;

  document.getElementById('user-display-name').innerText = currentUser.name;
  document.getElementById('user-display-role').innerText = `${currentUser.designation || 'Faculty'} • ${currentUser.department || 'IGDTUW'}`;
  document.getElementById('user-display-email').innerText = currentUser.email;
  document.getElementById('user-avatar').innerText = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Admin access check for Aditya & Arun
  const isAdmin = currentUser.role === 'admin' || 
    currentUser.email.toLowerCase().includes('aditya') || 
    currentUser.email.toLowerCase().includes('arun') ||
    currentUser.name.toLowerCase().includes('aditya') ||
    currentUser.name.toLowerCase().includes('arun');

  const adminNavGroup = document.getElementById('admin-nav-group');
  if (adminNavGroup) {
    if (isAdmin) {
      adminNavGroup.classList.remove('hidden');
    } else {
      adminNavGroup.classList.add('hidden');
      if (currentScreen === 'admin') {
        navigateTo('dashboard');
      }
    }
  }
}

// Login Actions
async function handleEmailLogin(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!email) {
    alert('Please enter your university email address.');
    return;
  }

  try {
    const res = await API.emailLogin({ email, password });
    currentUser = res.user;
    API.setUserId(currentUser.id);
    updateUserUI();

    if (res.requiresOnboarding || !currentUser.onboarded) {
      openOnboardingModal(currentUser);
    } else {
      navigateTo('dashboard');
    }
  } catch (err) {
    alert('Login error: ' + err.message);
  }
}

async function handleGoogleLogin(directUser = null) {
  try {
    let payload = {};
    if (directUser) {
      payload = directUser;
    } else {
      payload = {
        name: "Dr. Rajesh Sharma",
        email: "r.sharma@igdtuw.ac.in"
      };
    }

    const res = await API.googleLogin(payload);
    currentUser = res.user;
    API.setUserId(currentUser.id);
    updateUserUI();

    if (res.requiresOnboarding || !currentUser.onboarded) {
      openOnboardingModal(currentUser);
    } else {
      navigateTo('dashboard');
    }
  } catch (err) {
    alert('Google login failed: ' + err.message);
  }
}

// Quick Demo Login helper
function quickFillLogin(email) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = 'igdtuw@2026';
  handleEmailLogin();
}

// Logout
function logoutUser() {
  API.setUserId(null);
  currentUser = null;
  localStorage.removeItem('meetflow_user_id');
  navigateTo('login');
}

// Screen Navigation
function navigateTo(screenId) {
  if (screenId === 'admin') {
    const isAdmin = currentUser && (currentUser.role === 'admin' || 
      currentUser.email.toLowerCase().includes('aditya') || 
      currentUser.email.toLowerCase().includes('arun'));
    if (!isAdmin) {
      alert('Access Denied: The Admin Control Panel is strictly restricted to designated administrators (Aditya & Arun).');
      return;
    }
  }

  currentScreen = screenId;
  const screens = [
    'login', 'dashboard', 'calendar', 'timetable', 'google-sync',
    'create-meeting', 'meeting-details', 'my-meetings', 'notifications',
    'ai-activity', 'mom', 'mom-editor', 'staff', 'admin', 'settings'
  ];

  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById('screen-' + screenId);
  if (target) target.classList.remove('hidden');

  // Sidebar visibility: Hide sidebar entirely on login screen
  const sidebar = document.getElementById('app-sidebar');
  const header = document.getElementById('app-header');
  if (screenId === 'login') {
    if (sidebar) sidebar.classList.add('hidden');
    if (header) header.classList.add('hidden');
  } else {
    if (sidebar) sidebar.classList.remove('hidden');
    if (header) header.classList.remove('hidden');
  }

  // Sidebar navigation active highlight
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('text-indigo-700', 'bg-indigo-50', 'font-semibold');
    btn.classList.add('text-slate-700', 'font-medium');
  });

  const activeNav = document.getElementById('nav-' + screenId);
  if (activeNav) {
    activeNav.classList.remove('text-slate-700', 'font-medium');
    activeNav.classList.add('text-indigo-700', 'bg-indigo-50', 'font-semibold');
  }

  if (screenId !== 'login') {
    loadScreenData(screenId);
  }

  const canvas = document.getElementById('main-content-canvas');
  if (canvas) canvas.scrollTop = 0;
}

// Dynamic Screen Data Loader
async function loadScreenData(screenId) {
  try {
    switch (screenId) {
      case 'dashboard':
        await renderDashboard();
        break;
      case 'my-meetings':
        await renderMeetingsList();
        break;
      case 'timetable':
        await renderTimetableScreen();
        break;
      case 'staff':
        await renderStaffDirectory();
        break;
      case 'ai-activity':
        await renderAIActivityScreen();
        break;
      case 'mom':
        await renderMoMScreen();
        break;
      case 'admin':
        await renderAdminScreen();
        break;
      case 'settings':
        renderSettingsScreen();
        break;
    }
  } catch (err) {
    console.error(`Error loading data for ${screenId}:`, err);
  }
}

// 1. Dashboard Renderer
async function renderDashboard() {
  try {
    const [meetingsData, aiData] = await Promise.all([
      API.getMeetings(),
      API.getAIStats()
    ]);
    const upcomingEl = document.getElementById('dash-upcoming-count');
    if (upcomingEl) upcomingEl.innerText = meetingsData.meetings.length;
  } catch (e) {
    console.warn(e);
  }
}

// 2. Timetable Screen & Upload Renderer
async function renderTimetableScreen() {
  try {
    const data = await API.getTimetable();
    const entries = data.timetable;
    const countEl = document.getElementById('tt-total-entries');
    if (countEl) countEl.innerText = `${entries.length} Entries`;
  } catch (e) {
    console.warn(e);
  }
}

async function handleTimetableFileUpload(inputElement) {
  if (!inputElement.files || !inputElement.files[0]) return;

  const file = inputElement.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', currentUser ? currentUser.id : 'usr_sharma');

  const statusEl = document.getElementById('tt-upload-status');
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-indigo-600 font-bold flex items-center gap-1.5"><span class="animate-spin">⏳</span> Processing ${file.name} with AI OCR & parser...</span>`;
    statusEl.classList.remove('hidden');
  }

  try {
    const res = await API.uploadTimetableFile(formData);
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          <p class="font-bold">✓ Successfully parsed ${res.summary.fileType} (${res.summary.filename})</p>
          <p class="mt-0.5 text-[11px]">Mapped <strong>${res.summary.teachingHours} lecture hours</strong> and <strong>${res.summary.freeHours} free research slots</strong> (OCR Confidence: ${res.summary.ocrConfidence}).</p>
        </div>
      `;
    }
    await renderTimetableScreen();
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-rose-600 font-bold">Upload Error: ${err.message}</span>`;
    }
  }
}

// 3. Create Meeting 5-Step Wizard Flow
function goToWizardStep(step) {
  currentWizardStep = step;
  document.getElementById('step-number-indicator').innerText = step;

  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById('wizard-step-' + i);
    const pillEl = document.getElementById('step-pill-' + i);
    if (stepEl) stepEl.classList.add('hidden');
    if (pillEl) {
      if (i <= step) {
        pillEl.className = 'border-t-4 border-indigo-600 pt-1 text-[11px] font-bold text-indigo-700';
      } else {
        pillEl.className = 'border-t-4 border-slate-200 pt-1 text-[11px] font-bold text-slate-400';
      }
    }
  }

  const activeStepEl = document.getElementById('wizard-step-' + step);
  if (activeStepEl) activeStepEl.classList.remove('hidden');

  if (step === 3) {
    loadAvailabilityMatrix();
  } else if (step === 4) {
    renderRecommendations();
  } else if (step === 5) {
    renderSummaryStep();
  }
}

async function loadAvailabilityMatrix() {
  const targetDate = document.getElementById('meet-date').value || '2026-09-15';
  const duration = document.getElementById('meet-duration').value || '60';

  const container = document.getElementById('availability-matrix-container');
  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-500"><span class="animate-spin text-lg">⏳</span><br>Overlaying faculty timetables and Google Calendar commitments for ${targetDate}...</div>`;

  try {
    const data = await API.checkAvailability(selectedStaffIds, targetDate, duration);
    currentAvailabilityData = data;
    renderMatrixTable(data);
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-rose-600 text-xs">Error loading matrix: ${err.message}</div>`;
  }
}

function renderMatrixTable(data) {
  const container = document.getElementById('availability-matrix-container');
  
  let headerHtml = `
    <div class="grid grid-cols-9 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 text-center py-2.5">
      <div class="text-left pl-3 text-slate-500">IGDTUW Faculty</div>
      ${data.slots.map(s => `<div>${s.label}</div>`).join('')}
    </div>
  `;

  let rowsHtml = data.matrix.map(row => {
    return `
      <div class="grid grid-cols-9 border-b border-slate-100 text-xs items-center text-center py-2 hover:bg-slate-50/40">
        <div class="text-left pl-3">
          <span class="font-bold text-slate-900 block truncate">${row.user.name}</span>
          <span class="text-[10px] text-slate-400 truncate block">${row.user.department}</span>
        </div>
        ${row.slots.map(slot => `
          <div class="p-1">
            <span class="${slot.badgeClass} block py-1 rounded text-[10px] font-bold truncate" title="${slot.detail}">
              ${slot.status}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  let consensusHtml = `
    <div class="grid grid-cols-9 bg-slate-100 font-bold border-t border-slate-200 py-2.5 text-center text-xs">
      <div class="text-left pl-3 text-indigo-900 font-extrabold uppercase text-[11px]">Consensus</div>
      ${data.consensus.map(c => `
        <div class="p-0.5">
          <span class="${c.badgeClass} block py-0.5 rounded text-[10px] font-black border">
            ${c.statusText}
          </span>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = headerHtml + rowsHtml + consensusHtml;
}

function renderRecommendations() {
  if (!currentAvailabilityData) return;
  const container = document.getElementById('recommendations-list-container');
  const recs = currentAvailabilityData.recommendations;

  container.innerHTML = recs.map((rec, idx) => {
    const isChecked = idx === 0 ? 'checked' : '';
    const borderClass = idx === 0 ? 'border-2 border-indigo-600 bg-indigo-50/30' : 'border border-slate-200 bg-white';
    
    return `
      <label class="p-4 rounded-xl ${borderClass} flex items-start justify-between cursor-pointer transition hover:bg-indigo-50/50">
        <div class="flex items-start gap-3.5">
          <input type="radio" name="recommended_slot" ${isChecked} value="${rec.start}" class="mt-1 w-4 h-4 text-indigo-600" onchange="currentSelectedSlot = '${rec.start}'">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-extrabold text-slate-900">${rec.timeRange}</span>
              <span class="text-xs text-amber-500 font-bold">${rec.stars}</span>
              <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">${rec.title} (Match: ${rec.matchScore})</span>
            </div>
            <div class="text-xs text-slate-600 mt-1.5 space-y-0.5">
              ${rec.reasons.map(r => `<p class="font-medium text-slate-700">✓ ${r}</p>`).join('')}
            </div>
          </div>
        </div>
        <span class="text-xs font-bold text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg">Select Slot</span>
      </label>
    `;
  }).join('');
}

function renderSummaryStep() {
  const title = document.getElementById('meet-title').value;
  const date = document.getElementById('meet-date').value;
  const location = document.getElementById('meet-location').value;
  const duration = document.getElementById('meet-duration').value;

  document.getElementById('summary-title').innerText = title;
  document.getElementById('summary-date').innerText = date;
  document.getElementById('summary-venue').innerText = location;
  document.getElementById('summary-duration').innerText = `${duration} mins`;
}

async function finalizeAndScheduleMeeting() {
  const title = document.getElementById('meet-title').value;
  const description = document.getElementById('meet-agenda').value;
  const date = document.getElementById('meet-date').value;
  const start_time = currentSelectedSlot || document.getElementById('meet-time').value || '10:00';
  const duration_minutes = document.getElementById('meet-duration').value;
  const location = document.getElementById('meet-location').value;

  try {
    await API.createMeeting({
      title,
      description,
      date,
      start_time,
      duration_minutes,
      location,
      participantIds: selectedStaffIds
    });

    alert(`✓ Success! Meeting '${title}' scheduled for ${date} at ${start_time}.\n\n• Google Calendar invites dispatched.\n• AI Agent initialized for 30m reminder & post-meeting MoM automation.`);
    navigateTo('my-meetings');
    goToWizardStep(1);
  } catch (err) {
    alert('Failed to schedule meeting: ' + err.message);
  }
}

// 4. Staff Directory
async function renderStaffDirectory() {
  const data = await API.getStaff();
  const container = document.getElementById('staff-grid-container');
  container.innerHTML = data.users.map(u => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-indigo-300 transition">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm">
          ${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-900 truncate">${u.name}</h3>
            <span class="badge-available px-2 py-0.5 rounded text-[10px] font-bold">${u.status_label}</span>
          </div>
          <p class="text-[11px] text-slate-500 truncate">${u.designation || 'Faculty'}</p>
          <p class="text-[10px] text-slate-400 font-mono-code truncate">${u.email}</p>
        </div>
      </div>
      <div class="text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
        <span>G-Cal: <strong class="text-emerald-600">Synced ✓</strong></span>
        <button onclick="navigateTo('create-meeting')" class="text-indigo-600 font-bold hover:underline">+ Schedule &rarr;</button>
      </div>
    </div>
  `).join('');
}

// 5. MoM Hub
async function renderMoMScreen() {
  const data = await API.getMoMs();
  const container = document.getElementById('mom-cards-container');
  container.innerHTML = data.moms.map(m => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-indigo-300 transition">
      <div class="flex items-start justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">${m.status.toUpperCase()}</span>
          <h3 class="text-sm font-bold text-slate-900 mt-1.5">${m.title}</h3>
          <p class="text-xs text-slate-500">${m.date} • ${m.time}</p>
        </div>
        <span class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">DOC</span>
      </div>
      <div class="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <p><span class="font-bold text-slate-800">Attendees:</span> ${m.attendees.join(', ')}</p>
        <p><span class="font-bold text-slate-800">Decisions:</span> ${m.decisions[0] || 'In Review'}</p>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-[11px] text-slate-400">Ref: ${m.reference_no}</span>
        <div class="flex items-center gap-2">
          <button onclick="openMoMEditor('${m.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">Edit MoM</button>
          <button onclick="approveMoM('${m.id}')" class="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition">Approve</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function approveMoM(momId) {
  try {
    await API.approveMoM(momId);
    alert('✓ MoM successfully approved, digitally signed, and archived.');
    renderMoMScreen();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function openMoMEditor(momId) {
  navigateTo('mom-editor');
}

// 6. AI Activity Screen
async function renderAIActivityScreen() {
  const data = await API.getAILogs();
  const tableBody = document.getElementById('ai-logs-table-body');
  tableBody.innerHTML = data.logs.map(log => `
    <tr>
      <td class="p-3 text-slate-400">${new Date(log.timestamp).toLocaleTimeString()}</td>
      <td class="font-bold text-indigo-900 font-sans">${log.task_name}</td>
      <td class="text-slate-800 font-sans">${log.meeting_id}</td>
      <td class="text-slate-600 font-sans">${log.action_taken}</td>
      <td><span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold font-sans">Executed (${log.latency_ms}ms) ✓</span></td>
    </tr>
  `).join('');
}

// 7. Admin Screen
async function renderAdminScreen() {
  try {
    const [stats, staffData] = await Promise.all([
      API.getAdminStats(),
      API.getAdminStaff()
    ]);

    document.getElementById('admin-total-staff').innerText = stats.totalStaff;
    document.getElementById('admin-gcal-pct').innerText = `${stats.connectedCalendarsPercentage}%`;
    document.getElementById('admin-tt-pct').innerText = `${stats.timetableUploadRatePercentage}%`;
    document.getElementById('admin-mtgs-count').innerText = stats.termMeetingsScheduled;

    const tbody = document.getElementById('admin-staff-table-body');
    tbody.innerHTML = staffData.staff.map(s => `
      <tr>
        <td class="p-3 font-bold text-slate-900">${s.name}</td>
        <td class="p-3">${s.department || 'Academic'}</td>
        <td class="p-3"><span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">${s.role}</span></td>
        <td class="p-3 text-emerald-700">Uploaded ✓</td>
        <td class="p-3 text-emerald-700">Connected ✓</td>
        <td class="p-3 text-right">
          <button class="text-indigo-600 hover:text-indigo-900 px-2 font-bold" onclick="promptRoleChange('${s.id}', '${s.name}')">Edit Role</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Admin access error: ' + err.message);
  }
}

async function promptRoleChange(userId, userName) {
  const newRole = prompt(`Assign new role for ${userName} (admin | organizer | faculty):`, 'organizer');
  if (newRole && ['admin', 'organizer', 'faculty'].includes(newRole.toLowerCase())) {
    try {
      await API.assignRole(userId, newRole.toLowerCase());
      alert(`Role for ${userName} updated to ${newRole}.`);
      renderAdminScreen();
    } catch (err) {
      alert('Error updating role: ' + err.message);
    }
  }
}

// 8. Meetings List
async function renderMeetingsList() {
  const data = await API.getMeetings();
  const tbody = document.getElementById('my-meetings-tbody');
  tbody.innerHTML = data.meetings.map(m => `
    <tr class="hover:bg-slate-50/60">
      <td class="p-3">
        <span class="font-bold text-slate-900 block">${m.title}</span>
        <span class="text-[11px] text-slate-400">${m.description}</span>
      </td>
      <td class="p-3">
        <span class="font-bold text-indigo-700 block">${m.date}, ${m.start_time}</span>
        <span class="text-[10px] text-slate-400">${m.duration_minutes} mins</span>
      </td>
      <td class="p-3">
        <span class="text-slate-800 font-medium">${m.participants.length} Faculty</span>
        <span class="block text-[10px] text-emerald-600">All Confirmed</span>
      </td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">${m.location}</span>
      </td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">${m.momStatus.toUpperCase()}</span>
      </td>
      <td class="p-3 text-right">
        <button onclick="navigateTo('meeting-details')" class="text-indigo-600 hover:text-indigo-800 font-bold">Details</button>
      </td>
    </tr>
  `).join('');
}

// Onboarding Modal Submission
async function submitOnboardingForm(e) {
  if (e) e.preventDefault();
  const designation = document.getElementById('onboard-designation').value;
  const department = document.getElementById('onboard-department').value;
  const employee_id = document.getElementById('onboard-empid').value;
  const cabin = document.getElementById('onboard-cabin').value;

  try {
    const res = await API.completeOnboarding({
      userId: currentUser.id,
      designation,
      department,
      employee_id,
      cabin
    });

    currentUser = res.user;
    updateUserUI();
    document.getElementById('onboarding-modal').classList.add('hidden');
    alert('✓ Onboarding completed! Welcome to MeetFlow.');
    navigateTo('dashboard');
  } catch (err) {
    alert('Onboarding failed: ' + err.message);
  }
}

function openOnboardingModal(user) {
  document.getElementById('onboard-name').value = user.name;
  document.getElementById('onboard-email').value = user.email;
  document.getElementById('onboarding-modal').classList.remove('hidden');
}

function setupEventListeners() {
  const onboardForm = document.getElementById('onboarding-form');
  if (onboardForm) {
    onboardForm.addEventListener('submit', submitOnboardingForm);
  }

  const loginForm = document.getElementById('email-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleEmailLogin);
  }
}

function renderSettingsScreen() {
  const urlInput = document.getElementById('settings-api-url');
  if (urlInput) {
    urlInput.value = localStorage.getItem('meetflow_api_url') || '';
  }
}

function saveApiUrlSetting() {
  const urlInput = document.getElementById('settings-api-url');
  if (urlInput) {
    const val = urlInput.value.trim();
    API.setApiUrl(val);
    alert(val ? `✓ Backend API URL saved to: ${val}` : '✓ Switched to Local Resilient Mode.');
  }
}
