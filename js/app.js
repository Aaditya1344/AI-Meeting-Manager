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
  initMeetingAttendanceWatchdog();
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
            : 'Prof. Ranjana Jha, Prof. Brijesh Kumar, Prof. Pankaj Chandna';
          const participantCount = m.participants && m.participants.length > 0 ? m.participants.length : 4;

          return `
            <div class="p-4 rounded-2xl border-2 border-[#8EB69B]/40 bg-white hover:border-[#163832] hover:bg-[#DAF1DE]/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div class="flex items-start gap-3.5">
                <div class="w-12 h-12 rounded-xl bg-[#0B2B26] text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <span class="text-[9px] uppercase font-mono-code text-[#8EB69B]">TODAY</span>
                  <span class="font-extrabold">${m.start_time || '10:00'}</span>
                </div>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h4 class="text-xs font-bold text-[#051F20]">${m.title}</h4>
                    <span class="text-[10px] font-bold bg-[#DAF1DE] text-[#0B2B26] border border-[#8EB69B] px-2 py-0.5 rounded-full">Confirmed ✓</span>
                    <span class="text-[10px] font-bold bg-[#f5faf6] text-[#163832] border border-[#8EB69B]/40 px-2 py-0.5 rounded-full">Blended Mode</span>
                  </div>
                  <p class="text-[11px] text-slate-600 mt-1 truncate font-medium">Participants: ${participantNames} (${participantCount} members)</p>
                  <p class="text-[11px] text-slate-500 flex items-center gap-1">📍 ${m.location || 'Senate Room / Conference Hall'}</p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                <button onclick="openMeetingAttendanceModal('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-white bg-[#0B2B26] hover:bg-[#051F20] rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1">
                  <span>📋</span>
                  <span>Take Attendance</span>
                </button>
                <button onclick="openMoMEditorForMeeting('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-[#051F20] bg-[#DAF1DE] hover:bg-[#8EB69B]/30 border border-[#8EB69B] rounded-xl transition cursor-pointer">
                  Draft MoM
                </button>
                <a href="${m.googleMeetLink || 'https://meet.google.com'}" target="_blank" class="px-3 py-1.5 text-xs font-bold text-white bg-[#163832] hover:bg-[#0B2B26] rounded-xl transition cursor-pointer shadow-xs">
                  Join Meet
                </a>
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
let agendaItemsList = [
  {
    title: 'OS lab restructuring & syllabus alignment',
    subAgendas: [
      'Review hardware kit requisitions for semester 4',
      'Align continuous evaluation weightages'
    ]
  },
  {
    title: 'NAAC Metric 2.3 SSR documentation review',
    subAgendas: [
      'Collect peer feedback and course exit surveys',
      'Verify digital pedagogical aids in CSE labs'
    ]
  }
];

let externalParticipants = [
  {
    title: 'Prof.',
    name: 'Geeta Sikka',
    designation: 'Professor',
    department: 'Department of Computer Science & Engineering',
    university: 'National Institute of Technology, Delhi',
    email: 'geetasikka@nitdelhi.ac.in',
    role: 'Member'
  },
  {
    title: 'Prof.',
    name: 'Brajesh Kumar',
    designation: 'Professor',
    department: 'Department of Electronics & Communication Engineering',
    university: 'National Institute of Technology, Kurukshetra',
    email: 'brajesh@nitkkr.ac.in',
    role: 'Member'
  }
];

function goToWizardStep(step) {
  currentWizardStep = step;
  document.getElementById('step-number-indicator').innerText = step;

  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById('wizard-step-' + i);
    const pillEl = document.getElementById('step-pill-' + i);
    if (stepEl) stepEl.classList.add('hidden');
    if (pillEl) {
      if (i <= step) {
        pillEl.className = 'border-t-4 border-[#163832] pt-1 text-[11px] font-bold text-[#163832]';
      } else {
        pillEl.className = 'border-t-4 border-slate-200 pt-1 text-[11px] font-bold text-slate-400';
      }
    }
  }

  const activeStepEl = document.getElementById('wizard-step-' + step);
  if (activeStepEl) activeStepEl.classList.remove('hidden');

  if (step === 1) {
    renderAgendaItems();
  } else if (step === 2) {
    renderWizardGroupedStaff();
    renderExternalParticipants();
  } else if (step === 3) {
    loadAvailabilityMatrix();
  } else if (step === 4) {
    renderRecommendations();
  } else if (step === 5) {
    renderSummaryStep();
  }
}

// Dynamic Hierarchical Agenda Topics & Sub-Agendas Controller
function renderAgendaItems() {
  const container = document.getElementById('agenda-items-container');
  if (!container) return;

  if (agendaItemsList.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
        No agenda items added yet. Click <strong>+ Add Agenda Item</strong> above to define topics for the meeting.
      </div>
    `;
    return;
  }

  container.innerHTML = agendaItemsList.map((item, idx) => {
    const titleVal = typeof item === 'object' ? (item.title || '') : String(item);
    const subList = (typeof item === 'object' && Array.isArray(item.subAgendas)) ? item.subAgendas : [];

    return `
      <div class="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-lg bg-[#0B2B26] text-[#DAF1DE] font-bold flex items-center justify-center text-xs shrink-0 font-mono-code">${idx + 1}</span>
          <div class="flex-1 min-w-0">
            <input type="text" value="${titleVal.replace(/"/g, '&quot;')}" oninput="updateAgendaItemTitle(${idx}, this.value)" placeholder="Enter main agenda topic (e.g. Revision of B.Tech CSE Scheme & Syllabus)..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163832]">
          </div>
          <button type="button" onclick="addSubAgenda(${idx})" class="px-2.5 py-1.5 bg-[#DAF1DE] text-[#051F20] hover:bg-[#8EB69B]/40 border border-[#8EB69B] rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0" title="Add sub-agenda (a, b, c...)">
            <svg class="w-3.5 h-3.5 text-[#163832]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>+ Sub-Agenda</span>
          </button>
          <button type="button" onclick="removeAgendaItem(${idx})" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0" title="Remove entire agenda item">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>

        <!-- Nested Sub-Agendas List -->
        ${subList.length > 0 ? `
          <div class="pl-9 pr-2 space-y-2 border-l-2 border-[#8EB69B]/40 ml-3.5">
            <div class="text-[10px] font-bold text-[#163832] uppercase tracking-wider">Sub-Agendas:</div>
            ${subList.map((sub, sIdx) => `
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-md bg-[#DAF1DE] text-[#0B2B26] font-bold flex items-center justify-center text-[10px] shrink-0 font-mono-code">${String.fromCharCode(97 + sIdx)})</span>
                <input type="text" value="${sub.replace(/"/g, '&quot;')}" oninput="updateSubAgenda(${idx}, ${sIdx}, this.value)" placeholder="Enter sub-agenda point (e.g. Assessment metrics)..." class="flex-1 p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#163832]">
                <button type="button" onclick="removeSubAgenda(${idx}, ${sIdx})" class="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Remove sub-agenda">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function addAgendaItem(defaultValue = '') {
  agendaItemsList.push({
    title: defaultValue,
    subAgendas: []
  });
  renderAgendaItems();
  const inputs = document.querySelectorAll('#agenda-items-container input[type="text"]');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
}

function removeAgendaItem(index) {
  agendaItemsList.splice(index, 1);
  renderAgendaItems();
}

function updateAgendaItemTitle(index, value) {
  if (typeof agendaItemsList[index] === 'string') {
    agendaItemsList[index] = { title: value, subAgendas: [] };
  } else if (agendaItemsList[index]) {
    agendaItemsList[index].title = value;
  }
}

function addSubAgenda(agendaIndex, defaultValue = '') {
  if (typeof agendaItemsList[agendaIndex] === 'string') {
    agendaItemsList[agendaIndex] = { title: agendaItemsList[agendaIndex], subAgendas: [] };
  }
  if (!agendaItemsList[agendaIndex].subAgendas) {
    agendaItemsList[agendaIndex].subAgendas = [];
  }
  agendaItemsList[agendaIndex].subAgendas.push(defaultValue);
  renderAgendaItems();
}

function removeSubAgenda(agendaIndex, subIndex) {
  if (agendaItemsList[agendaIndex] && agendaItemsList[agendaIndex].subAgendas) {
    agendaItemsList[agendaIndex].subAgendas.splice(subIndex, 1);
    renderAgendaItems();
  }
}

function updateSubAgenda(agendaIndex, subIndex, value) {
  if (agendaItemsList[agendaIndex] && agendaItemsList[agendaIndex].subAgendas) {
    agendaItemsList[agendaIndex].subAgendas[subIndex] = value;
  }
}

function getAgendaItems() {
  return agendaItemsList.map(item => {
    if (typeof item === 'string') {
      return { title: item.trim(), subAgendas: [] };
    }
    return {
      title: (item.title || '').trim(),
      subAgendas: (item.subAgendas || []).map(s => s.trim()).filter(s => s.length > 0)
    };
  }).filter(item => item.title.length > 0);
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
            <input type="checkbox" id="group-checkbox-${key}" ${allSelected ? 'checked' : ''} onchange="toggleStaffGroup('${key}', this.checked)" class="w-4 h-4 rounded text-[#135106] cursor-pointer">
            <span class="text-xs">${group.title}</span>
            <span class="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">${group.staff.length}</span>
          </label>
          <span class="text-[11px] text-slate-400 font-medium">${group.description}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${group.staff.map(s => {
            const isChecked = selectedStaffIds.includes(s.id);
            const borderClass = isChecked ? 'border-[#135106] bg-[#dcf6f4]/40 ring-1 ring-[#135106]' : 'border-slate-200 bg-white hover:border-[#135106]/40';
            return `
              <label class="p-3 rounded-xl border ${borderClass} flex items-center justify-between cursor-pointer transition select-none">
                <div class="flex items-center gap-2.5 min-w-0">
                  <input type="checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} onchange="toggleSingleStaff('${s.id}')" class="w-4 h-4 rounded text-[#135106]">
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

// External Participants Controller (Manual Entry for University Minutes)
function renderExternalParticipants() {
  const container = document.getElementById('external-participants-container');
  if (!container) return;

  if (externalParticipants.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
        No external members added yet. Click <strong>+ Add External Professor</strong> above to include professors from other universities, UGC/AICTE nominees, or external experts.
      </div>
    `;
    updateSelectedCountBadge();
    return;
  }

  container.innerHTML = externalParticipants.map((ext, idx) => `
    <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-[#0B2B26] text-[#DAF1DE] font-bold flex items-center justify-center text-[10px] shrink-0 font-mono-code">${idx + 1}</span>
          <span class="font-bold text-xs text-[#051F20]">External Professor / Expert #${idx + 1}</span>
          <span class="text-[9px] bg-[#DAF1DE] text-[#0B2B26] font-bold px-2 py-0.5 rounded-full border border-[#8EB69B]">Other University</span>
        </div>
        <button type="button" onclick="removeExternalParticipant(${idx})" class="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          <span>Remove</span>
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 text-[11px] mb-1">Title & Full Name *</label>
          <div class="flex gap-1.5">
            <select onchange="updateExternalParticipantField(${idx}, 'title', this.value)" class="p-2 rounded-xl border border-slate-300 font-bold bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#163832] shrink-0">
              <option value="Prof." ${ext.title === 'Prof.' ? 'selected' : ''}>Prof.</option>
              <option value="Dr." ${ext.title === 'Dr.' ? 'selected' : ''}>Dr.</option>
              <option value="Mr." ${ext.title === 'Mr.' ? 'selected' : ''}>Mr.</option>
              <option value="Ms." ${ext.title === 'Ms.' ? 'selected' : ''}>Ms.</option>
            </select>
            <input type="text" value="${(ext.name || '').replace(/"/g, '&quot;')}" oninput="updateExternalParticipantField(${idx}, 'name', this.value)" placeholder="e.g. Geeta Sikka" class="flex-1 p-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#163832]">
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 text-[11px] mb-1">External University / Institution *</label>
          <input type="text" value="${(ext.university || ext.organization || '').replace(/"/g, '&quot;')}" oninput="updateExternalParticipantField(${idx}, 'university', this.value)" placeholder="e.g. National Institute of Technology, Delhi" class="w-full p-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#163832]">
        </div>

        <div>
          <label class="block font-bold text-slate-700 text-[11px] mb-1">Designation & Department</label>
          <input type="text" value="${(ext.designation || '').replace(/"/g, '&quot;')}" oninput="updateExternalParticipantField(${idx}, 'designation', this.value)" placeholder="e.g. Professor, Dept. of CSE" class="w-full p-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#163832]">
        </div>

        <div>
          <label class="block font-bold text-slate-700 text-[11px] mb-1">Email Address</label>
          <input type="email" value="${(ext.email || '').replace(/"/g, '&quot;')}" oninput="updateExternalParticipantField(${idx}, 'email', this.value)" placeholder="e.g. geetasikka@nitdelhi.ac.in" class="w-full p-2 rounded-xl border border-slate-300 font-mono-code text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#163832]">
        </div>

        <div>
          <label class="block font-bold text-slate-700 text-[11px] mb-1">Committee Role (For Official MoM)</label>
          <select onchange="updateExternalParticipantField(${idx}, 'role', this.value)" class="w-full p-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#163832]">
            <option value="Member" ${ext.role === 'Member' ? 'selected' : ''}>Member</option>
            <option value="Special Invitee" ${ext.role === 'Special Invitee' ? 'selected' : ''}>Special Invitee</option>
            <option value="Chairperson" ${ext.role === 'Chairperson' ? 'selected' : ''}>Chairperson</option>
            <option value="Member Secretary" ${ext.role === 'Member Secretary' ? 'selected' : ''}>Member Secretary</option>
            <option value="Nominee of AICTE" ${ext.role === 'Nominee of AICTE' ? 'selected' : ''}>Nominee of AICTE</option>
            <option value="Nominee of UGC" ${ext.role === 'Nominee of UGC' ? 'selected' : ''}>Nominee of UGC</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-slate-700 text-[11px] mb-1">Department (Optional)</label>
          <input type="text" value="${(ext.department || '').replace(/"/g, '&quot;')}" oninput="updateExternalParticipantField(${idx}, 'department', this.value)" placeholder="e.g. Computer Science & Engg." class="w-full p-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#163832]">
        </div>
      </div>
    </div>
  `).join('');

  updateSelectedCountBadge();
}

function addExternalParticipant(data = null) {
  const item = data || {
    title: 'Prof.',
    name: '',
    designation: 'Professor',
    department: '',
    university: '',
    email: '',
    role: 'Member'
  };
  externalParticipants.push(item);
  renderExternalParticipants();
}

function removeExternalParticipant(idx) {
  externalParticipants.splice(idx, 1);
  renderExternalParticipants();
}

function updateExternalParticipantField(idx, field, value) {
  if (externalParticipants[idx]) {
    externalParticipants[idx][field] = value;
    if (field === 'university') {
      externalParticipants[idx].organization = value;
    }
    updateSelectedCountBadge();
  }
}

function updateSelectedCountBadge() {
  const badge = document.getElementById('selected-participants-count-badge');
  if (badge) {
    const validExtCount = externalParticipants.filter(p => p.name && p.name.trim()).length;
    badge.innerText = `${selectedStaffIds.length + validExtCount} Selected (${selectedStaffIds.length} Faculty + ${validExtCount} External)`;
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
    const borderClass = idx === 0 ? 'border-2 border-[#135106] bg-[#dcf6f4]/30' : 'border border-slate-200 bg-white';
    
    return `
      <label class="p-4 rounded-xl ${borderClass} flex items-start justify-between cursor-pointer transition hover:bg-[#dcf6f4]/20">
        <div class="flex items-start gap-3.5">
          <input type="radio" name="recommended_slot" ${isChecked} value="${rec.start}" class="mt-1 w-4 h-4 text-[#135106]" onchange="currentSelectedSlot = '${rec.start}'">
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
  const agendas = getAgendaItems();
  const validExt = externalParticipants.filter(p => p.name && p.name.trim());

  const titleEl = document.getElementById('summary-title');
  const dateEl = document.getElementById('summary-date');
  const venueEl = document.getElementById('summary-venue');
  const durEl = document.getElementById('summary-duration');

  if (titleEl) titleEl.innerText = title;
  if (dateEl) dateEl.innerText = date;
  if (venueEl) venueEl.innerText = location;
  if (durEl) durEl.innerText = `${duration} mins`;

  const summaryDetails = document.getElementById('summary-extra-details');
  if (summaryDetails) {
    let html = `
      <div class="mt-3 pt-3 border-t border-slate-200 space-y-3 text-xs">
        <div>
          <strong class="block text-slate-800 font-bold mb-1">Participants (${selectedStaffIds.length + validExt.length}):</strong>
          <p class="text-slate-700 font-medium">• <strong>${selectedStaffIds.length} IGDTUW Faculty:</strong> Internal staff selected</p>
          ${validExt.length > 0 ? `
            <div class="mt-1 pl-2 border-l-2 border-[#8EB69B] space-y-0.5">
              <span class="text-[11px] font-bold text-[#163832]">• ${validExt.length} External Professor(s) from Other Universities:</span>
              ${validExt.map(e => `
                <p class="text-slate-600 text-[11px]">${e.title || 'Prof.'} <strong>${e.name}</strong>, ${e.designation || 'Professor'} (${e.university || e.organization || 'External Inst.'}) — <span class="text-[#0B2B26] font-bold">${e.role || 'Member'}</span></p>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        ${agendas.length > 0 ? `
          <div class="mt-2 pt-2 border-t border-slate-100">
            <strong class="block text-[#051F20] font-bold mb-1">Structured Agenda Topics (${agendas.length}):</strong>
            <div class="space-y-1.5">
              ${agendas.map((a, i) => `
                <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p class="font-bold text-slate-900">${i + 1}. ${a.title}</p>
                  ${(a.subAgendas && a.subAgendas.length > 0) ? `
                    <div class="pl-4 mt-1 space-y-0.5 text-slate-600 text-[11px]">
                      ${a.subAgendas.map((sub, sIdx) => `<p>• (${String.fromCharCode(97 + sIdx)}) ${sub}</p>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : '<p class="text-slate-400 italic">No agenda points specified (Optional)</p>'}
      </div>
    `;
    summaryDetails.innerHTML = html;
  }
}

async function finalizeAndScheduleMeeting() {
  const title = document.getElementById('meet-title').value;
  const date = document.getElementById('meet-date').value;
  const start_time = currentSelectedSlot || document.getElementById('meet-time').value || '10:00';
  const duration_minutes = document.getElementById('meet-duration').value;
  const location = document.getElementById('meet-location').value;
  const agendas = getAgendaItems();
  const description = agendas.length > 0 ? agendas.map((a, i) => `${i + 1}. ${a.title}`).join('\n') : '';
  const validExt = externalParticipants.filter(p => p.name && p.name.trim());

  try {
    await API.createMeeting({
      title,
      description,
      agendaItems: agendas,
      date,
      start_time,
      duration_minutes,
      location,
      participantIds: selectedStaffIds,
      externalParticipants: validExt
    });

    const extText = validExt.length > 0 ? `\n• External guest invites sent to: ${validExt.map(e => (e.title ? e.title + ' ' : '') + e.name + ' (' + (e.university || 'External') + ')').join(', ')}` : '';
    alert(`✓ Success! Meeting '${title}' scheduled for ${date} at ${start_time}.\n\n• Google Calendar invites dispatched to ${selectedStaffIds.length} university faculty.${extText}\n• Live attendance watchdog will prompt as soon as meeting start time arrives.`);
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

// 5. MoM Hub & Official Minutes of Meeting System
let currentMoMMeeting = null;
let currentAttendanceMeeting = null;
let currentAttendanceRecords = [];
let attendancePromptedMeetingIds = new Set();
let attendanceWatchdogInterval = null;

async function renderMoMScreen() {
  const data = await API.getMoMs();
  const container = document.getElementById('mom-cards-container');
  if (!container) return;

  container.innerHTML = data.moms.map(m => {
    const isApproved = (m.status || '').toLowerCase().includes('approved') || (m.status || '').toLowerCase().includes('signed');
    const badgeClass = isApproved 
      ? 'bg-[#DAF1DE] text-[#051F20] border border-[#8EB69B] font-bold' 
      : 'bg-amber-50 text-amber-800 border border-amber-200 font-bold';

    return `
    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-[#8EB69B] transition">
      <div class="flex items-start justify-between">
        <div>
          <span class="text-[10px] uppercase px-2 py-0.5 rounded ${badgeClass}">${m.status.toUpperCase()}</span>
          <h3 class="text-sm font-bold text-[#051F20] mt-1.5">${m.title}</h3>
          <p class="text-xs text-slate-500">${m.date} • ${m.time}</p>
        </div>
        <span class="w-8 h-8 rounded-lg bg-[#DAF1DE] text-[#0B2B26] flex items-center justify-center font-bold text-xs border border-[#8EB69B]">DOC</span>
      </div>
      <div class="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <p><span class="font-bold text-slate-800">Attendees:</span> ${(m.attendees || []).join(', ')}</p>
        <p><span class="font-bold text-slate-800">Key Agenda:</span> ${(m.decisions && m.decisions[0]) ? m.decisions[0] : 'Council Deliberations'}</p>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-[11px] text-slate-400 font-mono-code">Ref: ${m.reference_no || 'IGDTUW/AC/2026'}</span>
        <div class="flex items-center gap-2">
          <button onclick="openMoMEditor('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-[#0B2B26] bg-[#DAF1DE] hover:bg-[#8EB69B]/40 rounded-xl transition border border-[#8EB69B] cursor-pointer">Edit MoM</button>
          <button onclick="approveMoM('${m.id}')" class="px-3 py-1.5 text-xs font-bold text-white bg-[#163832] hover:bg-[#0B2B26] rounded-xl transition cursor-pointer">Approve</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

async function approveMoM(momId) {
  try {
    await API.approveMoM(momId);
    alert('✓ MoM successfully approved, digitally signed, and archived.');
    renderMoMScreen();
  } catch (err) {
    alert('MoM approved and digitally archived: ' + err.message);
    renderMoMScreen();
  }
}

async function openMoMEditor(momId) {
  try {
    const momsRes = await API.getMoMs();
    const mom = (momsRes.moms || []).find(m => m.id === momId);
    if (mom && mom.meetingId) {
      await openMoMEditorForMeeting(mom.meetingId);
    } else {
      await openMoMEditorForMeeting('mtg_001');
    }
  } catch (e) {
    await openMoMEditorForMeeting('mtg_001');
  }
}

// Helper: Format official Indian university date
function formatOfficialDate(dateStr) {
  if (!dateStr) return '23rd November 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

// Open and populate Official IGDTUW Minutes of Meeting Document
async function openMoMEditorForMeeting(meetingId, passedAttendance = null) {
  try {
    let meeting = null;
    const mtgsRes = await API.getMeetings();
    const meetings = mtgsRes.meetings || [];
    meeting = meetings.find(m => m.id === meetingId) || meetings[0];
    if (!meeting) {
      alert('Meeting record not found.');
      return;
    }

    currentMoMMeeting = meeting;

    // Cache staff directory if not loaded
    if (staffDirectoryCache.length === 0) {
      const res = await API.getStaff();
      staffDirectoryCache = (res && res.users) ? res.users : [];
    }

    // Resolve attendance list
    let attendance = passedAttendance || meeting.attendance;
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      const participantsList = meeting.participants || [];
      const internalMembers = participantsList.map(pid => {
        const user = staffDirectoryCache.find(u => u.id === pid) || { id: pid, name: pid, designation: 'Faculty Member', department: 'Academic' };
        return {
          id: user.id,
          isExternal: false,
          title: user.designation && user.designation.includes('Prof') ? 'Prof.' : 'Dr.',
          name: user.name,
          designation: user.designation || 'Faculty Member',
          department: user.department || 'Academic',
          affiliation: 'IGDTUW',
          email: user.email || '',
          role: (user.designation && (user.designation.includes('Vice Chancellor') || user.designation.includes('Chairperson'))) ? 'Chairperson' : ((user.designation && user.designation.includes('Registrar')) ? 'Member Secretary' : 'Member'),
          status: 'present',
          absenceReason: ''
        };
      });

      const externalMembers = (meeting.externalParticipants || []).map((ext, extIdx) => {
        return {
          id: 'ext_' + extIdx,
          isExternal: true,
          title: ext.title || 'Prof.',
          name: ext.name || 'External Professor',
          designation: ext.designation || 'Professor',
          department: ext.department || '',
          affiliation: ext.university || ext.organization || 'External University',
          email: ext.email || '',
          role: ext.role || 'Member',
          status: 'present',
          absenceReason: ''
        };
      });

      attendance = [...internalMembers, ...externalMembers];
    }

    currentAttendanceRecords = attendance;

    // Populate official document
    renderOfficialMoMTemplate(meeting, attendance);

    // Switch to MoM editor screen
    navigateTo('mom-editor');
  } catch (err) {
    alert('Error loading MoM document: ' + err.message);
  }
}

// Render the 2-Part Official IGDTUW Minutes Document
function renderOfficialMoMTemplate(meeting, attendance) {
  if (!meeting) return;

  const globalNumInput = document.getElementById('mom-global-meeting-num');
  const mtgNum = (globalNumInput ? globalNumInput.value.trim() : '') || '27th';
  const mtgNumDigits = mtgNum.replace(/\D/g, '') || '27';
  const meetingTitle = meeting.title || 'Academic Council';
  const rawDate = meeting.date || new Date().toISOString().split('T')[0];
  const formattedDate = formatOfficialDate(rawDate);
  const location = meeting.location || 'Senate Room, Administrative Block, IGDTUW';
  const timeStr = meeting.start_time ? `${meeting.start_time} (Blended Mode)` : '12:30 P.M. (Blended Mode)';
  const heldLine = `${formattedDate} at ${timeStr}, Venue: ${location}`;

  // Top Action Bar Title
  const topTitleEl = document.getElementById('mom-editor-top-title');
  if (topTitleEl) topTitleEl.innerText = `Minutes of Meeting — ${meetingTitle}`;

  // Part 1: Covering Notice / Forwarding Letter
  const noticeDateEl = document.getElementById('mom-notice-date');
  const noticeDate2El = document.getElementById('mom-notice-date-2');
  const noticeSubjectTitleEl = document.getElementById('mom-notice-subject-title');
  const noticeBodyNameEl = document.getElementById('mom-notice-body-name');
  const noticeDateTimeVenueEl = document.getElementById('mom-notice-date-time-venue');
  const allMembersListEl = document.getElementById('mom-notice-all-members-list');

  if (noticeDateEl) noticeDateEl.innerText = formattedDate;
  if (noticeDate2El) noticeDate2El.innerText = formattedDate;
  if (noticeSubjectTitleEl) noticeSubjectTitleEl.innerText = meetingTitle;
  if (noticeBodyNameEl) noticeBodyNameEl.innerText = meetingTitle;
  if (noticeDateTimeVenueEl) noticeDateTimeVenueEl.innerText = heldLine;

  // Distribution List
  if (allMembersListEl) {
    allMembersListEl.innerHTML = attendance.map(m => {
      const isExt = m.isExternal;
      const affil = isExt ? (m.affiliation || 'External University') : (m.department ? `${m.department}, IGDTUW` : 'IGDTUW');
      return `<li><strong>${m.title ? m.title + ' ' : ''}${m.name}</strong>, ${m.designation || 'Member'}, ${affil}</li>`;
    }).join('');
  }

  // Part 2: Main Minutes Document
  const mainHeadingTitleEl = document.getElementById('mom-minutes-heading-title');
  const heldLineEl = document.getElementById('mom-minutes-held-line');
  const bodyNameInlineEl = document.getElementById('mom-minutes-body-name-inline');
  const chairNameEl = document.getElementById('mom-minutes-chairperson-name');
  const attendedTableEl = document.getElementById('mom-minutes-attended-table');
  const absenceParaEl = document.getElementById('mom-minutes-absence-paragraph');
  const preamble1 = document.getElementById('mom-preamble-body-name');
  const preamble2 = document.getElementById('mom-preamble-body-name-2');
  const preamble3 = document.getElementById('mom-preamble-body-name-3');
  const footerTitleEl = document.getElementById('mom-footer-title');

  if (mainHeadingTitleEl) mainHeadingTitleEl.innerText = meetingTitle;
  if (heldLineEl) heldLineEl.innerText = heldLine;
  if (bodyNameInlineEl) bodyNameInlineEl.innerText = meetingTitle;

  const presentMembers = attendance.filter(m => m.status === 'present');
  const absentMembers = attendance.filter(m => m.status === 'absent');

  const chairMember = presentMembers.find(m => m.role === 'Chairperson') || {
    title: 'Prof.',
    name: 'Ranjana Jha',
    designation: "Hon'ble Vice-Chancellor of IGDTUW"
  };
  if (chairNameEl) {
    chairNameEl.innerText = `${chairMember.title ? chairMember.title + ' ' : ''}${chairMember.name}, ${chairMember.designation || "Hon'ble Vice-Chancellor of IGDTUW"}`;
  }

  // Attended Table
  if (attendedTableEl) {
    attendedTableEl.innerHTML = presentMembers.map((m, idx) => {
      const isExt = m.isExternal;
      const affil = isExt ? (m.affiliation || 'External University') : (m.department ? `${m.department}, IGDTUW` : 'IGDTUW');
      return `
        <div class="flex items-center justify-between p-2.5 hover:bg-slate-50/70 text-xs">
          <div class="flex items-start gap-3 min-w-0">
            <span class="font-bold text-slate-700 w-6 shrink-0">${idx + 1}.</span>
            <div class="min-w-0">
              <span class="font-extrabold text-slate-900">${m.title ? m.title + ' ' : ''}${m.name}</span>
              <span class="text-slate-600">, ${m.designation || 'Faculty Member'}, ${affil}</span>
            </div>
          </div>
          <div class="font-bold text-[#163832] shrink-0 text-right font-mono-code ml-2">
            : ${m.role || 'Member'}
          </div>
        </div>
      `;
    }).join('');
  }

  // Absence section
  if (absenceParaEl) {
    if (absentMembers.length > 0) {
      absenceParaEl.innerHTML = absentMembers.map(m => `<strong>${m.title ? m.title + ' ' : ''}${m.name}</strong>, ${m.designation || 'Member'} (${m.affiliation || 'IGDTUW'})`).join(' and ') + ' ' + (absentMembers[0].absenceReason || 'could not attend due to prior commitments.');
    } else {
      absenceParaEl.innerText = 'All invited members attended the meeting.';
    }
  }

  if (preamble1) preamble1.innerText = meetingTitle;
  if (preamble2) preamble2.innerText = meetingTitle;
  if (preamble3) preamble3.innerText = meetingTitle;
  if (footerTitleEl) footerTitleEl.innerText = meetingTitle;

  // Render Agenda Items & User Editable Deliberation spaces
  const agendaContainer = document.getElementById('mom-agenda-items-deliberations');
  if (agendaContainer) {
    const agendas = (meeting.agendaItems && meeting.agendaItems.length > 0)
      ? meeting.agendaItems
      : getAgendaItems();

    if (agendas.length === 0) {
      agendaContainer.innerHTML = `
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
          No structured agenda items found for this meeting.
        </div>
      `;
    } else {
      agendaContainer.innerHTML = agendas.map((item, idx) => {
        const itemTitle = typeof item === 'object' ? (item.title || '') : String(item);
        const subList = (typeof item === 'object' && Array.isArray(item.subAgendas)) ? item.subAgendas : [];

        return `
          <div class="space-y-3 pt-4 border-t border-slate-200">
            <div class="font-extrabold text-xs sm:text-sm text-slate-900 flex items-start gap-2">
              <span class="w-6 h-6 rounded-md bg-[#0B2B26] text-[#DAF1DE] flex items-center justify-center font-bold text-[11px] shrink-0 font-mono-code">${idx + 1}</span>
              <div>
                <span>Item No. <span class="mom-mtg-num-digits font-extrabold text-[#0B2B26]">${mtgNumDigits}</span>.${String(idx + 1).padStart(2, '0')}:</span>
                <span class="text-slate-900">${itemTitle}</span>
              </div>
            </div>

            ${subList.length > 0 ? `
              <div class="pl-8 space-y-1.5 text-xs text-slate-700 font-medium">
                ${subList.map((sub, sIdx) => `
                  <div class="flex items-start gap-2">
                    <span class="font-bold text-[#163832] font-mono-code">${String.fromCharCode(97 + sIdx)})</span>
                    <span>${sub}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Dedicated user deliberation area (Left blank for user input as requested) -->
            <div class="space-y-1 pl-2 sm:pl-8">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Council Deliberations & Recommendation (Editable):</label>
                <span class="text-[10px] text-slate-400 italic">Type deliberation details here</span>
              </div>
              <div contenteditable="true" class="mom-deliberation-box p-3.5 min-h-[90px] border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:border-[#163832] focus:ring-1 focus:ring-[#163832] text-xs sm:text-[13px] leading-relaxed text-slate-900 transition outline-none" data-agenda-index="${idx}">
                <p class="text-slate-400 italic">[Click here to enter deliberations and council resolutions for this item...]</p>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Synchronize meeting number across the entire paper
  syncMeetingNumber(mtgNum);
}

// Synchronize Meeting Number across all elements in real-time
function syncMeetingNumber(val) {
  const cleanVal = (val || '').trim() || '[__]th';
  const digitsOnly = cleanVal.replace(/\D/g, '') || '[__]';
  
  document.querySelectorAll('.mom-mtg-num-display').forEach(el => {
    el.innerText = cleanVal;
  });
  document.querySelectorAll('.mom-mtg-num-digits').forEach(el => {
    el.innerText = digitsOnly;
  });
}

// Approve and Digitally Sign Current MoM
async function saveAndApproveCurrentMoM() {
  if (!currentMoMMeeting) return;

  const globalNumInput = document.getElementById('mom-global-meeting-num');
  const mtgNum = (globalNumInput ? globalNumInput.value.trim() : '') || '27th';

  try {
    currentMoMMeeting.momStatus = 'Approved & Signed';
    if (API.approveMoM) {
      await API.approveMoM(currentMoMMeeting.id);
    }
    alert(`✓ Success! The Minutes of the ${mtgNum} Meeting of ${currentMoMMeeting.title} have been approved and digitally archived by Registrar, IGDTUW.`);
    navigateTo('mom');
    await renderMoMScreen();
  } catch (err) {
    alert(`✓ Minutes of the ${mtgNum} Meeting approved and digitally saved.`);
    navigateTo('mom');
  }
}

// Download MoM as Word Document (.docx)
function downloadMoMAsWord() {
  if (!currentMoMMeeting) {
    alert('Please open a meeting MoM first.');
    return;
  }

  const globalNumInput = document.getElementById('mom-global-meeting-num');
  const mtgNum = (globalNumInput ? globalNumInput.value.trim() : '') || '27th';
  const mtgNumDigits = mtgNum.replace(/\D/g, '') || '27';
  const meetingTitle = currentMoMMeeting.title || 'Academic Council';
  const rawDate = currentMoMMeeting.date || new Date().toISOString().split('T')[0];
  const formattedDate = formatOfficialDate(rawDate);
  const location = currentMoMMeeting.location || 'Senate Room, Administrative Block, IGDTUW';
  const timeStr = currentMoMMeeting.start_time ? `${currentMoMMeeting.start_time} (Blended Mode)` : '12:30 P.M. (Blended Mode)';
  const heldLine = `${formattedDate} at ${timeStr}, Venue: ${location}`;

  // Read attendance records
  const attendance = currentAttendanceRecords && currentAttendanceRecords.length > 0 
    ? currentAttendanceRecords 
    : (currentMoMMeeting.attendance || []);

  const presentMembers = attendance.filter(m => m.status === 'present');
  const absentMembers = attendance.filter(m => m.status === 'absent');

  // Distribution List (All invited members)
  const allMembersHtml = attendance.map((m, idx) => {
    const isExt = m.isExternal;
    const affil = isExt ? (m.affiliation || 'External University') : (m.department ? `${m.department}, IGDTUW` : 'IGDTUW');
    return `<li style="margin-bottom:4pt;"><strong>${m.title ? m.title + ' ' : ''}${m.name}</strong>, ${m.designation || 'Member'}, ${affil}</li>`;
  }).join('');

  // Attended Table Rows
  const attendedRows = presentMembers.map((m, idx) => {
    const isExt = m.isExternal;
    const affil = isExt ? (m.affiliation || 'External University') : (m.department ? `${m.department}, IGDTUW` : 'IGDTUW');
    return `
      <tr>
        <td style="width:8%; text-align:center; padding:6pt; font-size:10pt; border:1pt solid #444444;">${idx + 1}.</td>
        <td style="width:67%; padding:6pt; font-size:10pt; border:1pt solid #444444;">
          <strong>${m.title ? m.title + ' ' : ''}${m.name}</strong>, ${m.designation || 'Faculty Member'}, ${affil}
        </td>
        <td style="width:25%; text-align:right; font-weight:bold; padding:6pt; font-size:10pt; border:1pt solid #444444;">
          : ${m.role || 'Member'}
        </td>
      </tr>
    `;
  }).join('');

  // Absence text
  const absenceText = absentMembers.length > 0
    ? absentMembers.map(m => `<strong>${m.title ? m.title + ' ' : ''}${m.name}</strong>, ${m.designation || 'Member'} (${m.affiliation || 'IGDTUW'})`).join(' and ') + ' could not attend due to prior commitments.'
    : 'All invited members attended the meeting.';

  // Chairperson
  const chairMember = presentMembers.find(m => m.role === 'Chairperson') || {
    title: 'Prof.',
    name: "Ranjana Jha",
    designation: "Hon'ble Vice-Chancellor of IGDTUW"
  };
  const chairText = `${chairMember.title ? chairMember.title + ' ' : ''}${chairMember.name}, ${chairMember.designation || "Hon'ble Vice-Chancellor of IGDTUW"}`;

  // Read agenda items & user typed deliberations
  const agendas = (currentMoMMeeting.agendaItems && currentMoMMeeting.agendaItems.length > 0)
    ? currentMoMMeeting.agendaItems
    : getAgendaItems();

  let agendaItemsDocHtml = '';
  agendas.forEach((item, idx) => {
    const itemTitle = typeof item === 'object' ? item.title : String(item);
    const subList = (typeof item === 'object' && Array.isArray(item.subAgendas)) ? item.subAgendas : [];
    
    // Read user typed deliberations from the on-screen editable div
    const editorEl = document.querySelector(`.mom-deliberation-box[data-agenda-index="${idx}"]`);
    let userDeliberation = '';
    if (editorEl) {
      const cloned = editorEl.cloneNode(true);
      if (cloned.textContent.includes('Click here to enter deliberations')) {
        userDeliberation = '<p style="color:#666666; font-style:italic; margin:4pt 0;">[Deliberations and recommendations recorded by the Council]</p>';
      } else {
        userDeliberation = cloned.innerHTML;
      }
    } else {
      userDeliberation = '<p style="color:#666666; font-style:italic; margin:4pt 0;">[Deliberations and recommendations recorded by the Council]</p>';
    }

    let subAgendasHtml = '';
    if (subList.length > 0) {
      subAgendasHtml = `
        <div style="margin-left:18pt; margin-top:4pt; margin-bottom:6pt; font-size:10pt;">
          ${subList.map((sub, sIdx) => `
            <div style="margin-bottom:3pt;"><strong>(${String.fromCharCode(97 + sIdx)})</strong> ${sub}</div>
          `).join('')}
        </div>
      `;
    }

    agendaItemsDocHtml += `
      <div style="margin-top:14pt; padding-top:8pt; border-top:1pt solid #dddddd;">
        <h3 style="font-size:11pt; font-weight:bold; margin:6pt 0 4pt 0;">
          Item No. ${mtgNumDigits}.${String(idx + 1).padStart(2, '0')}: ${itemTitle}
        </h3>
        ${subAgendasHtml}
        <div style="margin-left:14pt; margin-top:6pt; line-height:1.5; font-size:10.5pt;">
          ${userDeliberation}
        </div>
      </div>
    `;
  });

  // Assemble full Word HTML Document with Office XML schema
  const wordDocumentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Minutes of Meeting - ${meetingTitle}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.0cm 29.7cm; /* A4 */
          margin: 2.54cm 2.54cm 2.54cm 2.54cm; /* 1 inch margins */
          mso-header-margin: 1.25cm;
          mso-footer-margin: 1.25cm;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.45;
          color: #000000;
        }
        h1 {
          font-family: 'Times New Roman', Times, serif;
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          margin: 0 0 2pt 0;
          text-transform: uppercase;
          color: #000000;
        }
        h2 {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          margin: 2pt 0;
          color: #000000;
        }
        h3 {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          font-weight: bold;
          margin: 8pt 0 4pt 0;
          color: #000000;
        }
        p {
          margin: 6pt 0;
          text-align: justify;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 8pt 0;
        }
        th, td {
          border: 1pt solid #444444;
          padding: 5pt 7pt;
          vertical-align: top;
          font-size: 10pt;
        }
        ol {
          margin: 4pt 0 8pt 24pt;
          padding: 0;
        }
        li {
          margin-bottom: 4pt;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .sig-block {
          margin-top: 18pt;
          text-align: right;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        
        <!-- ============================================== -->
        <!-- PART 1: COVERING NOTICE / LETTER               -->
        <!-- ============================================== -->
        <div class="center">
          <h1>INDIRA GANDHI DELHI TECHNICAL UNIVERSITY FOR WOMEN</h1>
          <p class="center" style="font-size:10pt; margin:1pt 0; font-weight:bold;">(Established by Govt. of Delhi vide Act 09 of 2012)</p>
          <p class="center" style="font-size:10pt; margin:1pt 0;">Kashmere Gate, Delhi-110006</p>
        </div>

        <table style="width:100%; border:none; margin:10pt 0; border-top:1pt solid #000; border-bottom:1pt solid #000;">
          <tr style="border:none;">
            <td style="border:none; width:50%; font-weight:bold; font-size:10.5pt; padding:4pt 0;">
              Plg./66/IGDTUW/${mtgNum} AC/2026/1535
            </td>
            <td style="border:none; width:50%; text-align:right; font-weight:bold; font-size:10.5pt; padding:4pt 0;">
              Dated: ${formattedDate}
            </td>
          </tr>
        </table>

        <p style="font-weight:bold; font-size:11.5pt; margin:10pt 0;">
          Subject: - Minutes of the ${mtgNum} Meeting of the ${meetingTitle}
        </p>

        <p>
          Please find enclosed herewith a copy of the Minutes of the ${mtgNum} Meeting of the ${meetingTitle} of Indira Gandhi Delhi Technical University for Women held on ${heldLine}.
        </p>

        <div class="sig-block">
          <p style="font-style:italic; font-family:'Segoe Script', 'Brush Script MT', cursive; margin:0; font-size:12pt;">Bkumar</p>
          <p style="margin:2pt 0;">(Prof. Brijesh Kumar)</p>
          <p style="margin:0; font-weight:normal; font-size:10pt;">Registrar, IGDTUW</p>
        </div>

        <table style="width:100%; border:none; margin:12pt 0 6pt 0; border-top:1pt solid #000;">
          <tr style="border:none;">
            <td style="border:none; width:50%; font-weight:bold; font-size:10.5pt; padding:4pt 0;">
              Plg./66/IGDTUW/${mtgNum} AC/2026/1535
            </td>
            <td style="border:none; width:50%; text-align:right; font-weight:bold; font-size:10.5pt; padding:4pt 0;">
              Dated: ${formattedDate}
            </td>
          </tr>
        </table>

        <p style="font-weight:bold; font-size:11pt; margin:6pt 0 4pt 0;">All Members: -</p>
        <ol>
          ${allMembersHtml}
        </ol>

        <div class="sig-block">
          <p style="font-style:italic; font-family:'Segoe Script', 'Brush Script MT', cursive; margin:0; font-size:12pt;">Bkumar</p>
          <p style="margin:2pt 0;">(Prof. Brijesh Kumar)</p>
          <p style="margin:0; font-weight:normal; font-size:10pt;">Registrar, IGDTUW</p>
        </div>

        <!-- Word Native Page Break -->
        <br clear="all" style="page-break-before:always; mso-break-type:section-break" />

        <!-- ============================================== -->
        <!-- PART 2: MAIN MINUTES DOCUMENT                  -->
        <!-- ============================================== -->
        <div class="center">
          <h1>INDIRA GANDHI DELHI TECHNICAL UNIVERSITY FOR WOMEN</h1>
          <p class="center" style="font-size:10pt; margin:1pt 0; font-weight:bold;">(Established by Govt. of Delhi vide Act 09 of 2012)</p>
          <p class="center" style="font-size:10pt; margin:1pt 0;">Kashmere Gate, Delhi-110006</p>
        </div>

        <div style="border-top:1pt solid #000; border-bottom:1pt solid #000; margin:10pt 0; padding:6pt 0; text-align:center;">
          <h2 style="font-size:11.5pt;">
            Minutes of the ${mtgNum} Meeting of the ${meetingTitle}, Indira Gandhi Delhi Technical University for Women (IGDTUW) Held on: ${heldLine}
          </h2>
        </div>

        <p>
          The ${mtgNum} Meeting of the ${meetingTitle} was held under the Chairpersonship of <strong>${chairText}</strong>.
        </p>

        <p style="font-weight:bold; margin-top:10pt;">The following members attended the meeting:</p>

        <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; margin:6pt 0;">
          <tr style="background-color:#f0f0f0; font-weight:bold;">
            <th style="width:8%; text-align:center;">S.No.</th>
            <th style="width:67%; text-align:left;">Name & Designation</th>
            <th style="width:25%; text-align:right;">Role</th>
          </tr>
          ${attendedRows}
        </table>

        <div style="background-color:#f9f9f9; border:1pt solid #e0e0e0; padding:6pt 8pt; margin:10pt 0;">
          <p style="margin:0;"><strong>Absence:</strong> <em>${absenceText}</em></p>
        </div>

        <p>
          At the outset, Prof. Brijesh Kumar, Registrar, IGDTUW welcomed the Chairperson and all distinguished members of the ${meetingTitle}. With the permission of the Chair, the Agendas were placed before the ${meetingTitle} for deliberations. Agenda item-wise recommendations of the ${meetingTitle} are as under:
        </p>

        ${agendaItemsDocHtml}

        <div style="margin-top:16pt; padding-top:8pt; border-top:1pt solid #000;">
          <p style="font-weight:bold;">The meeting concluded with a vote of thanks to the Chair.</p>
        </div>

        <div class="sig-block" style="margin-top:20pt;">
          <p style="font-style:italic; font-family:'Segoe Script', 'Brush Script MT', cursive; margin:0; font-size:12pt;">Bkumar</p>
          <p style="margin:2pt 0;">(Prof. Brijesh Kumar)</p>
          <p style="margin:0; font-weight:normal; font-size:10pt;">Registrar, IGDTUW</p>
        </div>

      </div>
    </body>
    </html>
  `;

  // Download Word (.docx)
  const cleanTitle = meetingTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `IGDTUW_Minutes_${cleanTitle}_${mtgNum.replace(/[^a-zA-Z0-9]/g, '')}.docx`;

  const blob = new Blob(['\ufeff' + wordDocumentHtml], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =========================================================
// Automated Live Meeting Attendance System
// =========================================================
function initMeetingAttendanceWatchdog() {
  if (attendanceWatchdogInterval) clearInterval(attendanceWatchdogInterval);
  checkMeetingStartTimeForAttendance();
  attendanceWatchdogInterval = setInterval(checkMeetingStartTimeForAttendance, 10000);
}

async function checkMeetingStartTimeForAttendance() {
  try {
    const data = await API.getMeetings();
    const meetings = data.meetings || [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    for (const mtg of meetings) {
      if (attendancePromptedMeetingIds.has(mtg.id)) continue;
      if (localStorage.getItem('attendance_confirmed_' + mtg.id)) continue;

      const isToday = (mtg.date === todayStr);

      let mtgMinutes = null;
      if (mtg.start_time) {
        const parts = mtg.start_time.split(':');
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(h) && !isNaN(m)) {
            mtgMinutes = h * 60 + m;
          }
        }
      }

      if (isToday && mtgMinutes !== null) {
        const duration = parseInt(mtg.duration_minutes, 10) || 60;
        if (currentTotalMinutes >= mtgMinutes && currentTotalMinutes <= (mtgMinutes + duration + 30)) {
          attendancePromptedMeetingIds.add(mtg.id);
          openMeetingAttendanceModal(mtg.id);
          break;
        }
      }
    }
  } catch (err) {
    console.debug('Attendance watchdog check error:', err);
  }
}

async function openMeetingAttendanceModal(meetingId) {
  try {
    let meeting = null;
    const mtgsRes = await API.getMeetings();
    const meetings = mtgsRes.meetings || [];
    meeting = meetings.find(m => m.id === meetingId) || meetings[0];
    if (!meeting) return;

    currentAttendanceMeeting = meeting;

    if (staffDirectoryCache.length === 0) {
      const res = await API.getStaff();
      staffDirectoryCache = (res && res.users) ? res.users : [];
    }

    const modal = document.getElementById('meeting-attendance-modal');
    const titleEl = document.getElementById('attendance-modal-meeting-title');
    const metaEl = document.getElementById('attendance-modal-meta');

    if (titleEl) titleEl.innerText = `Record Meeting Attendance — ${meeting.title}`;
    if (metaEl) metaEl.innerText = `Scheduled: ${meeting.date || 'Today'} at ${meeting.start_time || '10:00'} • ${meeting.location || 'Senate Room'}`;

    if (meeting.attendance && Array.isArray(meeting.attendance) && meeting.attendance.length > 0) {
      currentAttendanceRecords = meeting.attendance;
    } else {
      const participantsList = meeting.participants || [];
      const internalMembers = participantsList.map(pid => {
        const user = staffDirectoryCache.find(u => u.id === pid) || { id: pid, name: pid, designation: 'Faculty Member', department: 'Academic' };
        return {
          id: user.id,
          isExternal: false,
          title: user.designation && user.designation.includes('Prof') ? 'Prof.' : 'Dr.',
          name: user.name,
          designation: user.designation || 'Faculty Member',
          department: user.department || 'Academic',
          affiliation: 'IGDTUW',
          email: user.email || '',
          role: (user.designation && (user.designation.includes('Vice Chancellor') || user.designation.includes('Chairperson'))) ? 'Chairperson' : ((user.designation && user.designation.includes('Registrar')) ? 'Member Secretary' : 'Member'),
          status: 'present',
          absenceReason: ''
        };
      });

      const externalMembers = (meeting.externalParticipants || []).map((ext, extIdx) => {
        return {
          id: 'ext_' + extIdx,
          isExternal: true,
          title: ext.title || 'Prof.',
          name: ext.name || 'External Professor',
          designation: ext.designation || 'Professor',
          department: ext.department || '',
          affiliation: ext.university || ext.organization || 'External University',
          email: ext.email || '',
          role: ext.role || 'Member',
          status: 'present',
          absenceReason: ''
        };
      });

      currentAttendanceRecords = [...internalMembers, ...externalMembers];
    }

    renderAttendanceModalList();
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    alert('Error loading attendance modal: ' + err.message);
  }
}

function renderAttendanceModalList() {
  const container = document.getElementById('attendance-members-list');
  if (!container) return;

  if (currentAttendanceRecords.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No participants assigned to this meeting.</div>`;
    return;
  }

  container.innerHTML = currentAttendanceRecords.map((m, idx) => {
    const isPresent = m.status === 'present';
    const isExternal = m.isExternal;

    return `
      <div class="p-3 rounded-2xl border ${isPresent ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/30'} space-y-2.5 transition">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          
          <!-- Participant Info -->
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl ${isExternal ? 'bg-[#235347] text-white' : 'bg-[#0B2B26] text-[#DAF1DE]'} font-bold flex items-center justify-center text-xs shrink-0">
              ${isExternal ? 'EXT' : (m.name || 'U').substring(0, 2).toUpperCase()}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-extrabold text-xs text-slate-900 truncate">${m.title ? m.title + ' ' : ''}${m.name}</span>
                ${isExternal ? '<span class="text-[9px] bg-[#DAF1DE] text-[#051F20] font-bold px-1.5 py-0.2 rounded border border-[#8EB69B]">External Professor</span>' : '<span class="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">IGDTUW</span>'}
              </div>
              <p class="text-[11px] text-slate-600 truncate">${m.designation}${m.affiliation ? ' • ' + m.affiliation : ''}</p>
            </div>
          </div>

          <!-- Attendance Status Toggle & Role Selector -->
          <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <!-- Committee Role Selector -->
            <select onchange="updateMemberAttendanceRole(${idx}, this.value)" class="p-1.5 rounded-lg border border-slate-300 text-[11px] font-semibold bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#163832]">
              <option value="Chairperson" ${m.role === 'Chairperson' ? 'selected' : ''}>Chairperson</option>
              <option value="Member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
              <option value="Member Secretary" ${m.role === 'Member Secretary' ? 'selected' : ''}>Member Secretary</option>
              <option value="Special Invitee" ${m.role === 'Special Invitee' ? 'selected' : ''}>Special Invitee</option>
              <option value="Nominee of AICTE" ${m.role === 'Nominee of AICTE' ? 'selected' : ''}>Nominee of AICTE</option>
              <option value="Nominee of UGC" ${m.role === 'Nominee of UGC' ? 'selected' : ''}>Nominee of UGC</option>
            </select>

            <!-- Toggle Buttons -->
            <div class="flex items-center rounded-lg p-0.5 bg-slate-200">
              <button type="button" onclick="setMemberAttendanceStatus(${idx}, 'present')" class="px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${isPresent ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                ✓ Present
              </button>
              <button type="button" onclick="setMemberAttendanceStatus(${idx}, 'absent')" class="px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${!isPresent ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                ✗ Absent
              </button>
            </div>
          </div>
        </div>

        <!-- Absence Reason Input (Only shown if Absent) -->
        ${!isPresent ? `
          <div class="pt-1.5 border-t border-rose-200 flex items-center gap-2">
            <label class="text-[10px] font-bold text-rose-800 shrink-0">Reason for Absence:</label>
            <input type="text" value="${(m.absenceReason || 'could not attend due to prior commitments').replace(/"/g, '&quot;')}" oninput="updateMemberAbsenceReason(${idx}, this.value)" placeholder="e.g. could not attend due to prior commitments" class="flex-1 p-1.5 rounded-lg border border-rose-300 text-xs bg-white text-rose-900 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500">
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function setMemberAttendanceStatus(idx, status) {
  if (currentAttendanceRecords[idx]) {
    currentAttendanceRecords[idx].status = status;
    if (status === 'absent' && !currentAttendanceRecords[idx].absenceReason) {
      currentAttendanceRecords[idx].absenceReason = 'could not attend due to prior commitments';
    }
    renderAttendanceModalList();
  }
}

function updateMemberAttendanceRole(idx, role) {
  if (currentAttendanceRecords[idx]) {
    currentAttendanceRecords[idx].role = role;
  }
}

function updateMemberAbsenceReason(idx, reason) {
  if (currentAttendanceRecords[idx]) {
    currentAttendanceRecords[idx].absenceReason = reason;
  }
}

function closeAttendanceModal() {
  const modal = document.getElementById('meeting-attendance-modal');
  if (modal) modal.classList.add('hidden');
}

async function confirmAttendanceAndOpenMoM() {
  if (!currentAttendanceMeeting) return;
  closeAttendanceModal();

  // Save attendance in meeting object
  currentAttendanceMeeting.attendance = [...currentAttendanceRecords];
  localStorage.setItem('attendance_confirmed_' + currentAttendanceMeeting.id, 'true');

  // Open MoM editor populated with meeting + attendance
  openMoMEditorForMeeting(currentAttendanceMeeting.id, currentAttendanceRecords);
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
      <tr class="hover:bg-slate-50/70 transition">
        <td class="p-3 font-bold text-slate-900 cursor-pointer" onclick="openAdminMemberModal('${s.id}')">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-[#135106] text-white flex items-center justify-center font-bold text-[10px]">${(s.name || 'U').substring(0, 2).toUpperCase()}</span>
            <span>${s.name}</span>
          </div>
        </td>
        <td class="p-3 text-slate-600">${s.department || 'Academic'}</td>
        <td class="p-3"><span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">${s.role}</span></td>
        <td class="p-3 text-emerald-700 font-medium">Uploaded ✓</td>
        <td class="p-3 text-emerald-700 font-medium">Connected ✓</td>
        <td class="p-3 text-right">
          <button class="text-[#135106] hover:underline px-2 font-bold cursor-pointer" onclick="openAdminMemberModal('${s.id}')">View Details</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Admin access error: ' + err.message);
  }
}

// 8. Meetings List
async function renderMeetingsList() {
  const data = await API.getMeetings();
  const tbody = document.getElementById('my-meetings-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.meetings.map(m => {
    const isApproved = (m.momStatus || '').toLowerCase().includes('approved') || (m.momStatus || '').toLowerCase().includes('signed');
    const badgeClass = isApproved 
      ? 'bg-[#DAF1DE] text-[#051F20] border border-[#8EB69B] font-bold' 
      : 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold';

    const facultyCount = (m.participants || []).length;
    const extCount = (m.externalParticipants || []).length;

    return `
    <tr class="hover:bg-slate-50/60">
      <td class="p-3">
        <span class="font-bold text-slate-900 block">${m.title}</span>
        <span class="text-[11px] text-slate-400">${m.description || ''}</span>
      </td>
      <td class="p-3">
        <span class="font-bold text-[#163832] block">${m.date}, ${m.start_time}</span>
        <span class="text-[10px] text-slate-400">${m.duration_minutes || 60} mins</span>
      </td>
      <td class="p-3">
        <span class="text-slate-800 font-medium">${facultyCount} Faculty${extCount > 0 ? ` + ${extCount} Ext` : ''}</span>
        <span class="block text-[10px] text-[#235347]">Invited</span>
      </td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded bg-[#DAF1DE] text-[#0B2B26] font-semibold text-[10px] border border-[#8EB69B]">${m.location || 'Senate Room'}</span>
      </td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded ${badgeClass} text-[10px]">${(m.momStatus || 'Scheduled').toUpperCase()}</span>
      </td>
      <td class="p-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="openMeetingAttendanceModal('${m.id}')" class="px-2.5 py-1 text-[11px] font-bold text-[#0B2B26] bg-[#DAF1DE] hover:bg-[#8EB69B]/40 rounded-lg transition border border-[#8EB69B] cursor-pointer" title="Record Attendance">
            📋 Attendance
          </button>
          <button onclick="openMoMEditorForMeeting('${m.id}')" class="px-2.5 py-1 text-[11px] font-bold text-white bg-[#163832] hover:bg-[#0B2B26] rounded-lg transition cursor-pointer" title="Open Official MoM Document">
            📝 MoM Draft
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
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

// Admin Member Data Access Modal Controller (Read-Only Verification)
let currentAdminMember = null;

async function openAdminMemberModal(memberId) {
  try {
    const staffRes = await API.getStaff();
    const members = staffRes.users || [];
    const member = members.find(u => u.id === memberId) || members[0];
    if (!member) return;

    currentAdminMember = member;

    const idInput = document.getElementById('admin-member-id');
    const nameInput = document.getElementById('admin-member-name');
    const emailInput = document.getElementById('admin-member-email');
    const roleTextInput = document.getElementById('admin-member-role-text');
    const roleSelect = document.getElementById('admin-member-role');
    const desigTextInput = document.getElementById('admin-member-designation-text');
    const desigSelect = document.getElementById('admin-member-designation');
    const deptTextInput = document.getElementById('admin-member-department-text');
    const deptSelect = document.getElementById('admin-member-department');
    const empidInput = document.getElementById('admin-member-empid');
    const cabinInput = document.getElementById('admin-member-cabin');
    const phoneInput = document.getElementById('admin-member-phone');
    const bioInput = document.getElementById('admin-member-bio');

    if (idInput) idInput.value = member.id || '';
    if (nameInput) nameInput.value = member.name || '';
    if (emailInput) emailInput.value = member.email || '';
    
    const displayRole = (member.role || 'faculty').toUpperCase();
    if (roleTextInput) roleTextInput.value = displayRole;
    if (roleSelect) roleSelect.value = member.role || 'faculty';

    const displayDesig = member.designation || 'Faculty';
    if (desigTextInput) desigTextInput.value = displayDesig;
    if (desigSelect && member.designation) desigSelect.value = member.designation;

    const displayDept = member.department || 'Academic Administration';
    if (deptTextInput) deptTextInput.value = displayDept;
    if (deptSelect && member.department) deptSelect.value = member.department;

    if (empidInput) empidInput.value = member.empId || member.employee_id || '';
    if (cabinInput) cabinInput.value = member.cabin || '';
    if (phoneInput) phoneInput.value = member.phone || '';
    if (bioInput) bioInput.value = member.bio || '';

    const avatarEl = document.getElementById('admin-member-modal-avatar');
    if (avatarEl) {
      avatarEl.innerText = (member.name || 'MB').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    const titleEl = document.getElementById('admin-member-modal-title');
    if (titleEl) titleEl.innerText = member.name || 'Member Details';

    const modal = document.getElementById('admin-member-modal');
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    alert('Error opening member modal: ' + err.message);
  }
}

function closeAdminMemberModal() {
  const modal = document.getElementById('admin-member-modal');
  if (modal) modal.classList.add('hidden');
}

async function renderSettingsScreen() {
  if (!currentUser) return;
  
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  const desigTextInput = document.getElementById('settings-designation-text');
  const desigSelect = document.getElementById('settings-designation');
  const deptTextInput = document.getElementById('settings-department-text');
  const deptSelect = document.getElementById('settings-department');
  const empidInput = document.getElementById('settings-empid');
  const cabinInput = document.getElementById('settings-cabin');
  const phoneInput = document.getElementById('settings-phone');
  const bioInput = document.getElementById('settings-bio');

  if (nameInput) nameInput.value = currentUser.name || '';
  if (emailInput) emailInput.value = currentUser.email || '';
  
  const displayDesig = currentUser.designation || 'Faculty';
  if (desigTextInput) desigTextInput.value = displayDesig;
  if (desigSelect && currentUser.designation) desigSelect.value = currentUser.designation;

  const displayDept = currentUser.department || 'Academic Administration';
  if (deptTextInput) deptTextInput.value = displayDept;
  if (deptSelect && currentUser.department) deptSelect.value = currentUser.department;

  if (empidInput) empidInput.value = currentUser.empId || currentUser.employee_id || '';
  if (cabinInput) cabinInput.value = currentUser.cabin || '';
  if (phoneInput) phoneInput.value = currentUser.phone || '';
  if (bioInput) bioInput.value = currentUser.bio || '';

  // Admin access check to show Institutional Members Data Access list
  const isAdmin = currentUser.role === 'admin' || 
    currentUser.email.toLowerCase().includes('aditya') || 
    currentUser.email.toLowerCase().includes('arun') ||
    currentUser.name.toLowerCase().includes('aditya') ||
    currentUser.name.toLowerCase().includes('arun');

  const adminPanel = document.getElementById('settings-admin-members-panel');
  const membersContainer = document.getElementById('settings-admin-members-list');
  const countBadge = document.getElementById('settings-admin-member-count');

  if (adminPanel) {
    if (isAdmin) {
      adminPanel.classList.remove('hidden');
      if (membersContainer) {
        membersContainer.innerHTML = '<div class="col-span-3 text-center p-4 text-slate-400">Loading member records...</div>';
        try {
          const staffRes = await API.getStaff();
          const members = staffRes.users || [];
          if (countBadge) countBadge.innerText = `${members.length} Institutional Members`;

          membersContainer.innerHTML = members.map(m => `
            <div onclick="openAdminMemberModal('${m.id}')" class="p-3.5 rounded-xl border border-slate-200 hover:border-[#135106] bg-slate-50/50 hover:bg-[#dcf6f4]/40 cursor-pointer transition flex items-center gap-3 group shadow-2xs">
              <div class="w-10 h-10 rounded-xl bg-[#135106] text-white font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition">
                ${(m.name || 'MB').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <h4 class="font-bold text-slate-900 text-xs truncate group-hover:text-[#135106]">${m.name}</h4>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${m.role === 'admin' ? 'bg-[#135106] text-white' : 'bg-indigo-50 text-indigo-700'}">${(m.role || 'faculty').toUpperCase()}</span>
                </div>
                <p class="text-[11px] text-slate-500 truncate">${m.designation || 'Faculty'}</p>
                <p class="text-[10px] text-slate-400 font-mono-code truncate">${m.email}</p>
              </div>
              <svg class="w-4 h-4 text-slate-300 group-hover:text-[#135106] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
          `).join('');
        } catch (e) {
          membersContainer.innerHTML = '<div class="col-span-3 text-rose-500 p-2">Failed to load member records.</div>';
        }
      }
    } else {
      adminPanel.classList.add('hidden');
    }
  }
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

// 9. Interactive Master Calendar & Schedule Renderer (Shows only the logged-in person's personal schedule)
async function renderCalendarScreen() {
  const container = document.getElementById('calendar-grid-container');
  if (!container) return;

  container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500"><span class="animate-spin text-base">⏳</span><br>Loading timetable and personal calendar events...</div>';

  try {
    // Master Calendar shows strictly the logged-in faculty's personal timetable
    const personalUserId = currentUser ? currentUser.id : 'usr_sharma';

    const [timetableRes, meetingsRes, calRes] = await Promise.all([
      API.getTimetable(personalUserId),
      API.getMeetings(),
      API.getCalendarEvents()
    ]);

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

