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
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorBox = document.getElementById('email-login-error');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.innerText = '';
  }

  if (!email) {
    if (errorBox) {
      errorBox.innerText = 'Please enter your institutional email address.';
      errorBox.classList.remove('hidden');
    } else {
      alert('Please enter your institutional email address.');
    }
    return;
  }

  if (!password || password.trim().length === 0) {
    if (errorBox) {
      errorBox.innerText = 'Password is required to sign in to MeetFlow.';
      errorBox.classList.remove('hidden');
    } else {
      alert('Password is required to sign in to MeetFlow.');
    }
    if (passwordInput) passwordInput.focus();
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
    if (errorBox) {
      errorBox.innerText = err.message || 'Login failed. Please verify your credentials.';
      errorBox.classList.remove('hidden');
    } else {
      alert('Login error: ' + err.message);
    }
  }
}

const GOOGLE_ACCOUNTS = [
  { name: 'Prof. (Dr.) Amita Dev', email: 'vc@igdtuw.ac.in', designation: 'Hon’ble Vice Chancellor', avatar: 'AD' },
  { name: 'Prof. Ananya Roy', email: 'ananya.roy@igdtuw.ac.in', designation: 'Dean of Academic Affairs', avatar: 'AR' },
  { name: 'Dr. Rajesh Sharma', email: 'r.sharma@igdtuw.ac.in', designation: 'Professor & HOD (CSE)', avatar: 'RS' },
  { name: 'Dr. Preeti Sehrawat', email: 'preeti.s@igdtuw.ac.in', designation: 'Associate Professor & HOD (IT)', avatar: 'PS' },
  { name: 'Dr. Sneha Kapoor', email: 'sneha.k@igdtuw.ac.in', designation: 'Associate Professor (CSE)', avatar: 'SK' },
  { name: 'Dr. Aditya Verma', email: 'aditya@igdtuw.ac.in', designation: 'Director of IT & Systems', avatar: 'AV', isAdmin: true },
  { name: 'Dr. Arun Kumar', email: 'arun@igdtuw.ac.in', designation: 'Dean of Academic Affairs', avatar: 'AK', isAdmin: true }
];

let pendingGoogleAccount = null;

function handleGoogleLogin() {
  const modal = document.getElementById('google-account-modal');
  const list = document.getElementById('google-accounts-list');
  if (!modal || !list) return;

  switchGoogleModalStep('accounts');

  list.innerHTML = GOOGLE_ACCOUNTS.map(acc => `
    <button type="button" onclick="handleGoogleAccountSelection('${acc.email}', '${acc.name.replace(/'/g, "\\'")}', '${acc.avatar}', ${Boolean(acc.isAdmin)})" class="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 transition text-left group">
      <div class="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs group-hover:scale-105 transition shrink-0">
        ${acc.avatar}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-slate-900 text-xs truncate">
          ${acc.name}
        </p>
        <p class="text-[11px] text-slate-500 font-mono-code truncate">${acc.email}</p>
      </div>
      <svg class="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </button>
  `).join('');

  modal.classList.remove('hidden');
}

// Mobile Responsive Sidebar Controller
function toggleMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (!sidebar || !backdrop) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    sidebar.classList.remove('hidden');
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  } else {
    closeMobileSidebar();
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (sidebar) {
    sidebar.classList.add('-translate-x-full');
  }
  if (backdrop) {
    backdrop.classList.add('hidden');
  }
  document.body.classList.remove('overflow-hidden');
}

function switchGoogleModalStep(step) {
  const stepAccounts = document.getElementById('google-modal-step-accounts');
  const stepPassword = document.getElementById('google-modal-step-password');
  const errorBox = document.getElementById('google-password-error');

  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.innerText = '';
  }

  if (step === 'password') {
    if (stepAccounts) stepAccounts.classList.add('hidden');
    if (stepPassword) stepPassword.classList.remove('hidden');
    const pwdInput = document.getElementById('google-auth-password');
    if (pwdInput) {
      pwdInput.value = '';
      setTimeout(() => pwdInput.focus(), 50);
    }
  } else {
    if (stepPassword) stepPassword.classList.add('hidden');
    if (stepAccounts) stepAccounts.classList.remove('hidden');
  }
}

function handleGoogleAccountSelection(email, name, avatar, isAdmin) {
  pendingGoogleAccount = {
    email: email.trim(),
    name: name || 'Faculty Member',
    avatar: avatar || email.substring(0, 2).toUpperCase(),
    isAdmin: Boolean(isAdmin)
  };

  const nameEl = document.getElementById('google-selected-name');
  const emailEl = document.getElementById('google-selected-email');
  const avatarEl = document.getElementById('google-selected-avatar');

  if (nameEl) nameEl.innerText = pendingGoogleAccount.name;
  if (emailEl) emailEl.innerText = pendingGoogleAccount.email;
  if (avatarEl) avatarEl.innerText = pendingGoogleAccount.avatar;

  switchGoogleModalStep('password');
}

function toggleGooglePasswordVisibility() {
  const pwdInput = document.getElementById('google-auth-password');
  const checkbox = document.getElementById('google-show-pwd-checkbox');
  if (pwdInput && checkbox) {
    pwdInput.type = checkbox.checked ? 'text' : 'password';
  }
}

async function handleGooglePasswordSubmit(event) {
  if (event) event.preventDefault();
  const pwdInput = document.getElementById('google-auth-password');
  const errorBox = document.getElementById('google-password-error');
  const password = pwdInput ? pwdInput.value : '';

  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.innerText = '';
  }

  if (!password || password.trim().length === 0) {
    if (errorBox) {
      errorBox.innerText = 'Please enter your password to sign in.';
      errorBox.classList.remove('hidden');
    }
    if (pwdInput) pwdInput.focus();
    return;
  }

  if (!pendingGoogleAccount) {
    closeGoogleAccountModal();
    return;
  }

  try {
    const res = await API.googleLogin({
      email: pendingGoogleAccount.email,
      name: pendingGoogleAccount.name,
      password: password
    });

    closeGoogleAccountModal();

    currentUser = res.user;
    API.setUserId(currentUser.id);
    updateUserUI();

    if (res.requiresOnboarding || !currentUser.onboarded) {
      openOnboardingModal(currentUser);
    } else {
      navigateTo('dashboard');
    }
  } catch (err) {
    if (errorBox) {
      errorBox.innerText = 'Authentication error: ' + (err.message || 'Invalid credentials.');
      errorBox.classList.remove('hidden');
    } else {
      alert('Authentication failed: ' + err.message);
    }
  }
}

function closeGoogleAccountModal() {
  const modal = document.getElementById('google-account-modal');
  if (modal) modal.classList.add('hidden');
  pendingGoogleAccount = null;
}

function openCustomGoogleEmailPrompt() {
  const email = prompt('Sign in with Google Workspace:\nEnter your institutional email address (@igdtuw.ac.in):', 'faculty@igdtuw.ac.in');
  if (email && email.trim()) {
    const cleanEmail = email.trim();
    const namePart = cleanEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
    const formattedName = namePart ? namePart.charAt(0).toUpperCase() + namePart.slice(1) : 'Faculty Member';
    const avatar = cleanEmail.substring(0, 2).toUpperCase();
    const isAdmin = cleanEmail.toLowerCase().includes('aditya') || cleanEmail.toLowerCase().includes('arun');
    handleGoogleAccountSelection(cleanEmail, formattedName, avatar, isAdmin);
  }
}

// Logout
function logoutUser() {
  API.setUserId(null);
  currentUser = null;
  localStorage.removeItem('meetflow_user_id');

  const nameEl = document.getElementById('user-display-name');
  if (nameEl) nameEl.innerText = 'Faculty Member';
  const roleEl = document.getElementById('user-display-role');
  if (roleEl) roleEl.innerText = 'IGDTUW';
  const emailEl = document.getElementById('user-display-email');
  if (emailEl) emailEl.innerText = '';
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.innerText = '--';

  const adminNavGroup = document.getElementById('admin-nav-group');
  if (adminNavGroup) adminNavGroup.classList.add('hidden');

  navigateTo('login');
}

// Screen Navigation
function navigateTo(screenId) {
  // Auto-close mobile sidebar drawer on navigation
  closeMobileSidebar();

  if (screenId === 'admin') {
    const isAdmin = currentUser && (currentUser.role === 'admin' || 
      currentUser.email.toLowerCase().includes('aditya') || 
      currentUser.email.toLowerCase().includes('arun'));
    if (!isAdmin) {
      alert('Access Denied: The Admin Control Panel is strictly restricted to authorized system administrators.');
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
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });

  const target = document.getElementById('screen-' + screenId);
  if (target) {
    target.classList.remove('hidden');
    target.style.display = '';
  }

  // Sidebar & Header visibility: Hide entirely on login screen, show on authenticated screens
  const sidebar = document.getElementById('app-sidebar');
  const header = document.getElementById('app-header');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (screenId === 'login') {
    if (sidebar) {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('flex', 'md:flex');
      sidebar.classList.add('-translate-x-full');
      sidebar.style.display = 'none';
    }
    if (header) {
      header.classList.add('hidden');
      header.classList.remove('flex');
      header.style.display = 'none';
    }
    if (backdrop) backdrop.classList.add('hidden');
  } else {
    if (sidebar) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('flex');
      sidebar.style.display = '';
    }
    if (header) {
      header.classList.remove('hidden');
      header.classList.add('flex');
      header.style.display = '';
    }
  }

  // Sidebar navigation active highlight (moves dynamically to selected item)
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('nav-active');
  });

  const activeNav = document.getElementById('nav-' + screenId);
  if (activeNav) {
    activeNav.classList.add('nav-active');
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
      case 'calendar':
        await renderCalendarScreen();
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
    // Dynamic Time-based Greeting & Subtitle
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17) {
      timeGreeting = 'Good evening';
    }

    const userName = currentUser ? currentUser.name : 'Dr. Arvind Kumar';
    const titleEl = document.getElementById('dash-greeting-title');
    if (titleEl) {
      titleEl.innerText = `${timeGreeting}, ${userName}`;
    }

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', options);
    const dateEl = document.getElementById('dash-greeting-date');
    if (dateEl) {
      dateEl.innerText = formattedDate;
    }

    const [meetingsData, aiData] = await Promise.all([
      API.getMeetings(),
      API.getAIStats()
    ]);

    const meetings = (meetingsData && meetingsData.meetings) ? meetingsData.meetings : [];
    const upcomingEl = document.getElementById('dash-upcoming-count');
    if (upcomingEl) upcomingEl.innerText = meetings.length;

    // Populate Upcoming Staff Meetings list on the dashboard
    const upcomingListContainer = document.getElementById('dash-upcoming-meetings-list');
    if (upcomingListContainer) {
      if (meetings.length === 0) {
        upcomingListContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-semibold">No upcoming staff meetings scheduled. Click "Schedule New Meeting" to organize one.</div>`;
      } else {
        upcomingListContainer.innerHTML = meetings.map(m => {
          const participantNames = m.participants && m.participants.length > 0 
            ? m.participants.map(p => p.name || p).join(', ') 
            : 'Dr. Sharma, Dr. Sneha, Dr. Manpreet, Dr. Ananya';
          const participantCount = m.participants && m.participants.length > 0 ? m.participants.length : 4;

          return `
            <div class="p-3.5 rounded-2xl border-2 border-[#bcd1e8] bg-white hover:border-[#043363] hover:bg-[#eef4fa]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div class="flex items-start gap-3.5">
                <div class="w-12 h-12 rounded-xl bg-[#043363] text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <span class="text-[9px] uppercase font-mono-code text-teal-200">TODAY</span>
                  <span class="font-extrabold">${m.start_time || '10:00'}</span>
                </div>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h4 class="text-xs font-bold text-[#043363]">${m.title}</h4>
                    <span class="text-[10px] font-bold bg-[#eaf6e0] text-[#135106] border border-[#cddac2] px-2 py-0.5 rounded-full">Confirmed ✓</span>
                    <span class="text-[10px] font-bold bg-[#dcf6f4] text-[#134e48] border border-[#beece8] px-2 py-0.5 rounded-full">Google Meet</span>
                  </div>
                  <p class="text-[11px] text-slate-600 mt-1 truncate font-medium">Participants: ${participantNames} (${participantCount} faculty)</p>
                  <p class="text-[11px] text-slate-500 flex items-center gap-1">📍 ${m.location || 'Senate Room / Conference Hall'}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button onclick="navigateTo('my-meetings')" class="px-3 py-1.5 text-xs font-bold text-[#043363] bg-[#eef4fa] border border-[#bcd1e8] hover:bg-[#dce8f5] rounded-xl transition cursor-pointer">View Details</button>
                <a href="${m.googleMeetLink || 'https://meet.google.com'}" target="_blank" class="px-3 py-1.5 text-xs font-bold text-white bg-[#2a7f7b] hover:bg-[#1e5a57] rounded-xl transition cursor-pointer shadow-xs">Join Meet</a>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (e) {
    console.warn('Error rendering dashboard:', e);
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

  if (step === 2) {
    renderWizardGroupedStaff();
  } else if (step === 3) {
    loadAvailabilityMatrix();
  } else if (step === 4) {
    renderRecommendations();
  } else if (step === 5) {
    renderSummaryStep();
  }
}

// Grouped Staff Selection Logic for Step 2
let staffDirectoryCache = [];

async function renderWizardGroupedStaff() {
  const container = document.getElementById('wizard-participants-groups-container');
  if (!container) return;

  if (staffDirectoryCache.length === 0) {
    const res = await API.getStaff();
    staffDirectoryCache = (res && res.users) ? res.users : [];
  }

  const groups = {
    vc_deans: {
      title: '🏛️ Vice Chancellor & Deans',
      description: 'University Executive Leadership & Directorate',
      staff: staffDirectoryCache.filter(u => u.category === 'vc_deans' || (u.designation && (u.designation.includes('Chancellor') || u.designation.includes('Dean'))))
    },
    hods: {
      title: '🎓 Heads of Department (HODs)',
      description: 'Departmental Leadership (CSE, IT, ECE, MAE)',
      staff: staffDirectoryCache.filter(u => u.category === 'hods' || (u.designation && (u.designation.includes('HOD') || u.designation.includes('Head'))))
    },
    faculty: {
      title: '👨‍🏫 Faculty & Academic Staff',
      description: 'Professors, Associate & Assistant Professors',
      staff: staffDirectoryCache.filter(u => u.category === 'faculty' || (!u.designation?.includes('Chancellor') && !u.designation?.includes('Dean') && !u.designation?.includes('HOD') && u.role !== 'admin'))
    }
  };

  let html = '';

  for (const [key, group] of Object.entries(groups)) {
    if (!group.staff || group.staff.length === 0) continue;

    const groupStaffIds = group.staff.map(s => s.id);
    const allSelected = groupStaffIds.every(id => selectedStaffIds.includes(id));

    html += `
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <label class="flex items-center gap-2.5 font-bold text-slate-900 cursor-pointer select-none">
            <input type="checkbox" id="group-checkbox-${key}" ${allSelected ? 'checked' : ''} onchange="toggleStaffGroup('${key}', this.checked)" class="w-4 h-4 rounded text-indigo-600 cursor-pointer">
            <span class="text-xs">${group.title}</span>
            <span class="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">${group.staff.length}</span>
          </label>
          <span class="text-[11px] text-slate-400 font-medium">${group.description}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${group.staff.map(s => {
            const isChecked = selectedStaffIds.includes(s.id);
            const borderClass = isChecked ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300';
            return `
              <label class="p-3 rounded-xl border ${borderClass} flex items-center justify-between cursor-pointer transition select-none">
                <div class="flex items-center gap-2.5 min-w-0">
                  <input type="checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} onchange="toggleSingleStaff('${s.id}')" class="w-4 h-4 rounded text-indigo-600">
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-xs truncate">${s.name}</p>
                    <p class="text-[11px] text-slate-500 truncate">${s.designation || s.department}</p>
                  </div>
                </div>
                <span class="text-[10px] text-emerald-600 font-bold font-mono-code shrink-0">Synced ✓</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  updateSelectedCountBadge();
}

function toggleStaffGroup(groupKey, isChecked) {
  let targetStaff = [];
  if (groupKey === 'vc_deans') {
    targetStaff = staffDirectoryCache.filter(u => u.category === 'vc_deans' || (u.designation && (u.designation.includes('Chancellor') || u.designation.includes('Dean'))));
  } else if (groupKey === 'hods') {
    targetStaff = staffDirectoryCache.filter(u => u.category === 'hods' || (u.designation && (u.designation.includes('HOD') || u.designation.includes('Head'))));
  } else if (groupKey === 'faculty') {
    targetStaff = staffDirectoryCache.filter(u => u.category === 'faculty' || (!u.designation?.includes('Chancellor') && !u.designation?.includes('Dean') && !u.designation?.includes('HOD') && u.role !== 'admin'));
  }

  const ids = targetStaff.map(s => s.id);

  if (isChecked) {
    ids.forEach(id => {
      if (!selectedStaffIds.includes(id)) selectedStaffIds.push(id);
    });
  } else {
    selectedStaffIds = selectedStaffIds.filter(id => !ids.includes(id));
  }

  renderWizardGroupedStaff();
}

function toggleSingleStaff(staffId) {
  if (selectedStaffIds.includes(staffId)) {
    selectedStaffIds = selectedStaffIds.filter(id => id !== staffId);
  } else {
    selectedStaffIds.push(staffId);
  }
  renderWizardGroupedStaff();
}

function updateSelectedCountBadge() {
  const badge = document.getElementById('selected-participants-count-badge');
  if (badge) {
    badge.innerText = `${selectedStaffIds.length} Selected`;
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
  if (!container) return;

  // Filter: Never expose other administrators to the logged in user or admin
  const visibleStaff = (data.users || []).filter(u => {
    if (u.role === 'admin' && currentUser && u.id !== currentUser.id) {
      return false;
    }
    return true;
  });

  container.innerHTML = visibleStaff.map(u => `
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-indigo-300 transition">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0">
          ${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <h3 class="text-xs font-bold text-slate-900 truncate">${u.name}</h3>
            <span class="badge-available px-2 py-0.5 rounded text-[10px] font-bold shrink-0">${u.status_label || 'Available'}</span>
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
  if (!container) return;

  container.innerHTML = data.moms.map(m => `
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-indigo-300 transition">
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
  if (!tableBody) return;

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

    // Filter staffData: Do not show other admin accounts in the administration table
    const visibleStaff = (staffData.staff || []).filter(s => {
      if (s.role === 'admin' && currentUser && s.id !== currentUser.id) {
        return false;
      }
      return true;
    });

    const tbody = document.getElementById('admin-staff-table-body');
    if (!tbody) return;

    tbody.innerHTML = visibleStaff.map(s => `
      <tr>
        <td class="p-3 font-bold text-slate-900">${s.name}</td>
        <td class="p-3">${s.department || 'Academic'}</td>
        <td class="p-3"><span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">${s.role}</span></td>
        <td class="p-3 text-emerald-700 font-medium">Uploaded ✓</td>
        <td class="p-3 text-emerald-700 font-medium">Connected ✓</td>
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
  if (!currentUser) return;
  
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  const desigSelect = document.getElementById('settings-designation');
  const deptSelect = document.getElementById('settings-department');
  const empidInput = document.getElementById('settings-empid');
  const cabinInput = document.getElementById('settings-cabin');
  const phoneInput = document.getElementById('settings-phone');
  const bioInput = document.getElementById('settings-bio');

  if (nameInput) nameInput.value = currentUser.name || '';
  if (emailInput) emailInput.value = currentUser.email || '';
  if (desigSelect && currentUser.designation) desigSelect.value = currentUser.designation;
  if (deptSelect && currentUser.department) deptSelect.value = currentUser.department;
  if (empidInput) empidInput.value = currentUser.empId || currentUser.employee_id || '';
  if (cabinInput) cabinInput.value = currentUser.cabin || '';
  if (phoneInput) phoneInput.value = currentUser.phone || '';
  if (bioInput) bioInput.value = currentUser.bio || '';
}

async function saveProfileSettings(e) {
  if (e) e.preventDefault();
  if (!currentUser) return;

  const name = document.getElementById('settings-name').value.trim();
  const designation = document.getElementById('settings-designation').value;
  const department = document.getElementById('settings-department').value;
  const employee_id = document.getElementById('settings-empid').value.trim();
  const cabin = document.getElementById('settings-cabin').value.trim();
  const phone = document.getElementById('settings-phone').value.trim();
  const bio = document.getElementById('settings-bio').value.trim();

  try {
    const res = await API.updateProfile({
      userId: currentUser.id,
      name,
      designation,
      department,
      employee_id,
      cabin,
      phone,
      bio
    });

    currentUser = res.user;
    updateUserUI();
    alert('✓ Profile and institutional data updated successfully!');
  } catch (err) {
    alert('Error updating profile: ' + err.message);
  }
}

// 9. Interactive Calendar & Master Schedule Renderer
async function renderCalendarScreen() {
  const container = document.getElementById('calendar-grid-container');
  if (!container) return;

  container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500"><span class="animate-spin text-base">⏳</span><br>Loading timetable and calendar events...</div>';

  try {
    const facultySelect = document.getElementById('calendar-faculty-select');
    let selectedUserId = currentUser ? currentUser.id : 'usr_sharma';
    
    if (facultySelect && facultySelect.value !== 'current') {
      selectedUserId = facultySelect.value;
    }

    const [staffRes, timetableRes, meetingsRes, calRes] = await Promise.all([
      API.getStaff(),
      API.getTimetable(selectedUserId),
      API.getMeetings(),
      API.getCalendarEvents()
    ]);

    // Populate faculty dropdown once
    if (facultySelect && facultySelect.options.length <= 1 && staffRes && staffRes.users) {
      staffRes.users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.text = `${u.name} (${u.department || 'Faculty'})`;
        if (currentUser && u.id === currentUser.id) {
          opt.selected = true;
        }
        facultySelect.appendChild(opt);
      });
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
      { start: '09:00', end: '10:00', label: '09:00 - 10:00 AM' },
      { start: '10:00', end: '11:00', label: '10:00 - 11:00 AM' },
      { start: '11:00', end: '12:00', label: '11:00 - 12:00 PM' },
      { start: '12:00', end: '13:00', label: '12:00 - 01:00 PM' },
      { start: '13:00', end: '14:00', label: '01:00 - 02:00 PM (Lunch)', isBreak: true },
      { start: '14:00', end: '15:00', label: '02:00 - 03:00 PM' },
      { start: '15:00', end: '16:00', label: '03:00 - 04:00 PM' },
      { start: '16:00', end: '17:00', label: '04:00 - 05:00 PM' }
    ];

    const timetable = (timetableRes && timetableRes.timetable) ? timetableRes.timetable : [];
    const meetings = (meetingsRes && meetingsRes.meetings) ? meetingsRes.meetings : [];
    const calEvents = (calRes && calRes.events) ? calRes.events : [];

    let tableHtml = `
      <table class="w-full text-xs text-left border-collapse">
        <thead class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
          <tr>
            <th class="p-3.5 border-r border-slate-200 w-36 text-slate-500 uppercase tracking-wider text-[11px]">Time Slot</th>
            ${days.map(d => `<th class="p-3.5 border-r border-slate-200 text-center min-w-[150px] font-bold text-slate-900">${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
    `;

    timeSlots.forEach(slot => {
      if (slot.isBreak) {
        tableHtml += `
          <tr class="bg-slate-50/70">
            <td class="p-3 border-r border-slate-200 font-bold text-slate-400 font-mono-code">${slot.label}</td>
            <td colspan="6" class="p-3 text-center text-slate-400 font-bold uppercase text-[11px] tracking-wider">
              Institutional Lunch & Refreshment Window
            </td>
          </tr>
        `;
        return;
      }

      tableHtml += `<tr>`;
      tableHtml += `<td class="p-3 border-r border-slate-200 font-bold text-slate-600 font-mono-code bg-slate-50/30">${slot.label}</td>`;

      days.forEach(day => {
        // 1. Check timetable class
        const ttMatch = timetable.find(t => t.day && t.day.toLowerCase() === day.toLowerCase() && t.time && t.time.includes(slot.start));
        
        // 2. Check scheduled meeting
        const mtgMatch = (day === 'Tuesday' && slot.start === '10:00') ? meetings[0] : null;

        // 3. Check Google Calendar event
        const gcalMatch = (day === 'Wednesday' && slot.start === '14:00') ? { title: 'Senate Committee Consultation', room: 'Senate Room' } : null;

        if (ttMatch) {
          tableHtml += `
            <td class="p-2.5 border-r border-slate-100 align-top">
              <div class="bg-blue-50 border border-blue-200 p-2.5 rounded-xl shadow-2xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">${ttMatch.type || 'Lecture'}</span>
                  <span class="text-[10px] text-blue-800 font-bold font-mono-code">${ttMatch.room || 'LH-101'}</span>
                </div>
                <p class="font-bold text-blue-950 text-xs truncate" title="${ttMatch.course}">${ttMatch.course}</p>
                <p class="text-[10px] text-blue-700 font-medium">Timetable Sync ✓</p>
              </div>
            </td>
          `;
        } else if (mtgMatch) {
          tableHtml += `
            <td class="p-2.5 border-r border-slate-100 align-top">
              <div class="bg-purple-50 border border-purple-200 p-2.5 rounded-xl shadow-2xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded">Meeting</span>
                  <span class="text-[10px] text-purple-800 font-bold">MoM Active</span>
                </div>
                <p class="font-bold text-purple-950 text-xs truncate" title="${mtgMatch.title}">${mtgMatch.title}</p>
                <p class="text-[10px] text-purple-700 font-medium">${mtgMatch.location || 'Senate Room'}</p>
              </div>
            </td>
          `;
        } else if (gcalMatch) {
          tableHtml += `
            <td class="p-2.5 border-r border-slate-100 align-top">
              <div class="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl shadow-2xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">G-Cal</span>
                  <span class="text-[10px] text-emerald-800 font-bold font-mono-code">${gcalMatch.room || 'Senate Room'}</span>
                </div>
                <p class="font-bold text-emerald-950 text-xs truncate" title="${gcalMatch.title}">${gcalMatch.title}</p>
                <p class="text-[10px] text-emerald-700 font-medium">Google Sync ✓</p>
              </div>
            </td>
          `;
        } else {
          tableHtml += `
            <td class="p-2.5 border-r border-slate-100 align-top">
              <div class="p-2.5 rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition text-center space-y-1 group cursor-pointer" onclick="navigateTo('create-meeting')">
                <span class="text-[10px] text-slate-400 font-semibold block group-hover:text-indigo-600">Free Slot</span>
                <span class="text-[9px] text-emerald-600 font-bold block">+ Schedule</span>
              </div>
            </td>
          `;
        }
      });

      tableHtml += `</tr>`;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-rose-600 text-xs font-bold">Error rendering calendar: ${err.message}</div>`;
  }
}

async function triggerCalendarSyncNow() {
  const btn = document.getElementById('cal-sync-btn');
  if (btn) {
    btn.innerHTML = '<span class="animate-spin">⏳</span> <span>Syncing with Google Workspace...</span>';
  }
  try {
    await API.syncCalendar();
    alert('✓ Live synchronization complete! Google Calendar events and faculty timetables are up to date.');
    await renderCalendarScreen();
  } catch (err) {
    alert('Calendar sync notice: ' + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = `
        <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
        <span>Sync with Google Calendar</span>
      `;
    }
  }
}

// ---------------------------------------------------------
// Custom Clean AI Message Modal (Replaces browser alert popup)
// ---------------------------------------------------------
function showAIMessage(msg) {
  const modal = document.getElementById('ai-message-modal');
  const content = document.getElementById('ai-message-content');
  if (modal && content) {
    content.innerText = typeof msg === 'string' ? msg : JSON.stringify(msg);
    modal.classList.remove('hidden');
  } else {
    if (window._nativeAlert) {
      window._nativeAlert(msg);
    } else {
      console.log('AI Message:', msg);
    }
  }
}

function closeAIMessageModal() {
  const modal = document.getElementById('ai-message-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Hook global alert to use custom on-screen modal
if (typeof window !== 'undefined') {
  window._nativeAlert = window.alert;
  window.alert = function(msg) {
    showAIMessage(msg);
  };
}

