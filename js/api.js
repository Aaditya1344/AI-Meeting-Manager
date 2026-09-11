/**
 * MeetFlow API Client — Configured for Vercel Frontend + Render Backend
 */
const API = {
  currentUserId: localStorage.getItem('meetflow_user_id') || null,
  
  // Custom Render Backend URL if hosted separately on Vercel
  baseUrl: localStorage.getItem('meetflow_api_url') || '',

  setApiUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem('meetflow_api_url', this.baseUrl);
  },

  setUserId(id) {
    this.currentUserId = id;
    if (id) {
      localStorage.setItem('meetflow_user_id', id);
    } else {
      localStorage.removeItem('meetflow_user_id');
    }
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId || ''
    };
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    const headers = options.isFormData ? { 'x-user-id': this.currentUserId || '' } : { ...this.getHeaders(), ...options.headers };
    
    try {
      const response = await fetch(url, {
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
  emailLogin(payload) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  },
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

  // Users
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
    const url = `${this.baseUrl}/api/timetable/upload`;
    return fetch(url, {
      method: 'POST',
      headers: { 'x-user-id': this.currentUserId || '' },
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

  // Meetings
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

  // Admin (Gated)
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
