const API_BASE = '/api';

export async function request(url, options = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);
    xhr.open('POST', API_BASE + '/upload');
    if (onProgress) xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); });
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(data.error || '上传失败'));
        else resolve(data);
      } catch(e) { reject(new Error('上传失败')); }
    };
    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(fd);
  });
}

export function deleteUpload(url) {
  return request('/upload', { method: 'DELETE', body: JSON.stringify({ url }) });
}

export const api = {
  login: (username, password) => request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (data) => request('/register', { method: 'POST', body: JSON.stringify(data) }),

  getCourses: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    return request('/courses' + (s ? '?' + s : ''));
  },
  getCourse: (id) => request('/courses/' + id),
  createCourse: (data) => request('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => request('/courses/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id) => request('/courses/' + id, { method: 'DELETE' }),
  getCourseMedia: (id) => request('/courses/' + id + '/media'),
  updateCourseMedia: (id, data) => request('/courses/' + id + '/media', { method: 'PUT', body: JSON.stringify(data) }),

  getCourseCategories: () => request('/course-categories'),
  createCourseCategory: (data) => request('/course-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCourseCategory: (id, data) => request('/course-categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourseCategory: (id) => request('/course-categories/' + id, { method: 'DELETE' }),

  getNotifications: () => request('/notifications'),
  getNotification: (id) => request('/notifications/' + id),
  markNotificationRead: (id, userId) => request(`/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  getNotificationReadStats: (id) => request(`/notifications/${id}/read-stats`),
  createNotification: (data) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  updateNotification: (id, data) => request('/notifications/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNotification: (id) => request('/notifications/' + id, { method: 'DELETE' }),

  getUsers: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const s = qs.toString();
    return request('/users' + (s ? '?' + s : ''));
  },
  getUser: (id) => request('/users/' + id),
  updateUser: (id, data) => request('/users/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request('/users/' + id, { method: 'DELETE' }),

  getOrders: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const s = qs.toString();
    return request('/orders' + (s ? '?' + s : ''));
  },
  getOrder: (id) => request('/orders/' + id),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),

  getCertificates: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const s = qs.toString();
    return request('/certificates' + (s ? '?' + s : ''));
  },
  getCertificate: (id) => request('/certificates/' + id),
  deleteCertificate: (id) => request('/certificates/' + id, { method: 'DELETE' }),

  getDashboardOverview: () => request('/dashboard/overview'),
  getDashboardTrends: () => request('/dashboard/trends'),
  getDashboardReport: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const s = qs.toString();
    return request('/dashboard/report' + (s ? '?' + s : ''));
  },

  getTeachers: () => request('/teachers'),
  getOrganizations: () => request('/organizations'),
  createOrganization: (data) => request('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id, data) => request('/organizations/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrganization: (id) => request('/organizations/' + id, { method: 'DELETE' }),

  getLearningRecords: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const s = qs.toString();
    return request('/learning-records' + (s ? '?' + s : ''));
  },

  getSettings: () => request('/settings'),
  saveSettings: (settings) => request('/settings', { method: 'POST', body: JSON.stringify(settings) }),

  getMessageTemplates: () => request('/message-templates'),
  createMessageTemplate: (data) => request('/message-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateMessageTemplate: (id, data) => request('/message-templates/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMessageTemplate: (id) => request('/message-templates/' + id, { method: 'DELETE' }),

  getWxMenu: () => request('/wx-menu'),
  saveWxMenu: (menu) => request('/wx-menu', { method: 'POST', body: JSON.stringify(menu) }),

  getRegistrationFields: () => request('/registration-fields'),
  saveRegistrationFields: (fields) => request('/registration-fields', { method: 'POST', body: JSON.stringify(fields) }),

  getProjects: () => request('/projects'),
  getProject: (id) => request('/projects/' + id),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request('/projects/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request('/projects/' + id, { method: 'DELETE' }),

  getFaq: () => request('/faq'),
  createFaq: (data) => request('/faq', { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (id, data) => request('/faq/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaq: (id) => request('/faq/' + id, { method: 'DELETE' }),

  getContact: () => request('/contact'),
  saveContact: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),

  getClasses: () => request('/classes'),
  getClass: (id) => request('/classes/' + id),
  createClass: (data) => request('/classes', { method: 'POST', body: JSON.stringify(data) }),
  updateClass: (id, data) => request('/classes/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClass: (id) => request('/classes/' + id, { method: 'DELETE' }),

  ldapSync: (config) => request('/ldap/sync', { method: 'POST', body: JSON.stringify(config) }),
  getLdapConfig: () => request('/ldap/config'),
};
