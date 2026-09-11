/**
 * IGDTUW Meeting Manager API Client
 */
const API = {
  currentUserId: 'usr_sharma',

  setUserId(id) {
    this.currentUserId = id;
    localStorage.setItem('igdtuw_user_id', id);
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId || localStorage.getItem('igdtuw_user_id') || 'usr_sharma'
    };
  },

  async request(endpoint, options = {}) {
    const headers = options.isFormData ? { 'x-user-id': this.currentUserId } : { ...this.getHeaders(), ...options.headers };
    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth
  googleLogin(payload) {
    return this.request('/auth/google', { method: 'POST', body: JSON.stringify(payload) });
  },
  completeOnboarding(payload) {
    return this.request('/auth/onboard', { method: 'POST', body: JSON.stringify(payload) });
  },
  getMe() {
    return this.request('/auth/me');
  },
  switchUser(userId) {
    return this.request('/auth/switch-user', { method: 'POST', body: JSON.stringify({ userId }) });
  },

  // Users / Staff
  getStaff() {
    return this.request('/users');
  },
  getStaffDetails(id) {
    return this.request(`/users/${id}`);
  },

  // Timetable
  getTimetable(userId) {
    return this.request(`/timetable?userId=${userId || this.currentUserId}`);
  },
  uploadTimetableFile(formData) {
    return fetch('/api/timetable/upload', {
      method: 'POST',
      headers: { 'x-user-id': this.currentUserId },
      body: formData
    }).then(r => r.json());
  },
  updateTimetableEntry(entry) {
    return this.request('/timetable/entry', { method: 'POST', body: JSON.stringify(entry) });
  },

  // Calendar
  getCalendarEvents() {
    return this.request('/calendar/events');
  },
  syncCalendar() {
    return this.request('/calendar/sync', { method: 'POST' });
  },

  // Meetings & Availability Matrix
  getMeetings(status) {
    return this.request(`/meetings${status ? `?status=${status}` : ''}`);
  },
  checkAvailability(participantIds, targetDate, duration) {
    return this.request('/meetings/check-availability', {
      method: 'POST',
      body: JSON.stringify({ participantIds, targetDate, duration })
    });
  },
  createMeeting(meetingData) {
    return this.request('/meetings/create', {
      method: 'POST',
      body: JSON.stringify(meetingData)
    });
  },
  getMeetingDetails(id) {
    return this.request(`/meetings/${id}`);
  },
  cancelMeeting(id) {
    return this.request(`/meetings/${id}/cancel`, { method: 'POST' });
  },

  // MoM
  getMoMs(status) {
    return this.request(`/mom${status ? `?status=${status}` : ''}`);
  },
  getMoM(id) {
    return this.request(`/mom/${id}`);
  },
  updateMoM(id, data) {
    return this.request(`/mom/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  approveMoM(id) {
    return this.request(`/mom/${id}/approve`, { method: 'POST' });
  },
  generateMoMFromMeeting(meetingId) {
    return this.request('/mom/generate', { method: 'POST', body: JSON.stringify({ meetingId }) });
  },

  // AI Activity
  getAILogs() {
    return this.request('/ai/logs');
  },
  getAIStats() {
    return this.request('/ai/stats');
  },

  // Admin
  getAdminStats() {
    return this.request('/admin/stats');
  },
  getAdminStaff() {
    return this.request('/admin/staff');
  },
  assignRole(userId, role) {
    return this.request('/admin/assign-role', { method: 'POST', body: JSON.stringify({ userId, role }) });
  }
};
