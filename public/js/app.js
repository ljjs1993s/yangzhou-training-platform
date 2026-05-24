import { api } from './api.js';
import { initTheme } from './modules/theme.js';

/* ===== Global State ===== */
const USER_KEY = 'yzpc_currentUser';
window.getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};
window.setCurrentUser = (u) => {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
};
window.isLoggedIn = () => !!window.getCurrentUser();
window.logout = () => {
  localStorage.removeItem(USER_KEY);
  window._studentData = null;
  // Close any open dropdown
  document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
  window.location.hash = '#portal';
  // Force full page reload to clear all state
  window.location.replace(window.location.pathname + '#portal');
  setTimeout(() => window.location.reload(), 50);
};

/* ===== Toast ===== */
window.showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
};

/* ===== Modal ===== */
window.showModal = ({ title, content, onConfirm, onCancel, confirmText = '确定', cancelText = '取消', width = '500px', confirmClass, afterRender }) => {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `<div class="modal" style="max-width:${width}">
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">${content}</div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
      <button class="btn ${confirmClass || 'btn-primary'}" id="modal-confirm">${confirmText}</button>
    </div>
  </div>`;
  overlay.style.display = 'flex';
  // Call afterRender after DOM is ready (for Quill init etc.)
  if (afterRender) {
    try { afterRender(); } catch(e) { console.error('Modal afterRender error:', e); }
  }
  // IMPORTANT: Call onConfirm/onCancel BEFORE closeModal, because they may need to read
  // form values from the modal DOM (e.g., login inputs). closeModal() clears the DOM.
  document.getElementById('modal-confirm').onclick = async () => {
    if (onConfirm) {
      try { await onConfirm(); } catch (e) { console.error('Modal onConfirm error:', e); }
    }
    closeModal();
  };
  document.getElementById('modal-cancel').onclick = () => {
    if (onCancel) onCancel();
    closeModal();
  };
  overlay.onclick = (e) => { if (e.target === overlay) { if (onCancel) onCancel(); closeModal(); } };
};
window.closeModal = () => {
  if (window.destroyAllRichEditors) window.destroyAllRichEditors();
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-overlay').innerHTML = '';
};

/* ===== Format helpers ===== */
window.formatDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
window.formatMoney = (n) => '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
window.escapeHtml = (s) => {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

/* ===== Header ===== */
function renderHeader() {
  const header = document.getElementById('app-header');
  const hash = window.location.hash.slice(1) || 'portal';
  const user = window.getCurrentUser();
  const s = window._siteSettings || {};
  const logoMain = s.site_name ? s.site_name.replace(/继续教育.*$/, '') : '扬州职业大学';
  const logoSub = s.site_subtitle || '继续教育';

  if (hash.startsWith('admin')) {
    // Admin header — 与其他角色统一使用 header-inner / header-actions 结构
    header.innerHTML = `<div class="header-inner">
      <a href="#portal" class="header-logo">&#9679; 返回首页</a>
      <div class="header-actions">
        ${window._siteSettings?.external_system_url ? `<a href="${window._siteSettings.external_system_url}" target="_blank" rel="noopener" class="header-external-link">🔗 综合系统</a>` : ''}
        <span style="font-size:0.875rem">${user ? user.realname : '管理员'}</span>
        <div class="dropdown" id="user-dropdown-admin">
          <button class="btn btn-sm btn-outline" onclick="document.getElementById('user-dropdown-admin').classList.toggle('open')">菜单</button>
          <div class="dropdown-menu">
            <a class="dropdown-item" onclick="document.getElementById('user-dropdown-admin').classList.remove('open');window.location.hash='#portal'">返回首页</a>
            <a class="dropdown-item" onclick="event.stopPropagation();document.getElementById('user-dropdown-admin').classList.remove('open');logout()">退出登录</a>
          </div>
        </div>
      </div>
    </div>`;
    header.className = '';
  } else if (hash.startsWith('teacher') || hash === 'teacher') {
    header.innerHTML = `<div class="header-inner">
      <a href="#portal" class="header-logo">&#9679; ${window.escapeHtml(logoMain)}<span>${window.escapeHtml(logoSub)}</span></a>
      <div class="header-nav">
        <a href="#teacher" class="${hash==='teacher'?'active':''}">班级管理</a>
        <a href="#teacher" class="">成绩管理</a>
        <a href="#teacher" class="">直播教学</a>
      </div>
      <div class="header-actions">
        <span style="font-size:0.875rem">${user?user.realname:'教师'}</span>
        <div class="dropdown" id="user-dropdown-teacher">
          <button class="btn btn-sm btn-outline" onclick="document.getElementById('user-dropdown-teacher').classList.toggle('open')">菜单</button>
          <div class="dropdown-menu">
            <a class="dropdown-item" onclick="document.getElementById('user-dropdown-teacher').classList.remove('open');window.location.hash='#portal'">返回首页</a>
            <a class="dropdown-item" onclick="event.stopPropagation();document.getElementById('user-dropdown-teacher').classList.remove('open');logout()">退出登录</a>
          </div>
        </div>
      </div>
    </div>`;
    header.className = '';
  } else if (hash.startsWith('student') || hash === 'student') {
    header.innerHTML = `<div class="header-inner">
      <a href="#portal" class="header-logo">&#9679; ${window.escapeHtml(logoMain)}<span>${window.escapeHtml(logoSub)}</span></a>
      <div class="header-nav">
        <a href="#student" class="${hash==='student'?'active':''}">学习中心</a>
        <a href="#student" class="">我的课程</a>
        <a href="#student" class="">考试</a>
        <a href="#student" class="">证书</a>
      </div>
      <div class="header-actions">
        <span style="font-size:0.875rem">${user?user.realname:'学员'}</span>
        <div class="dropdown" id="user-dropdown-student">
          <button class="btn btn-sm btn-outline" onclick="document.getElementById('user-dropdown-student').classList.toggle('open')">菜单</button>
          <div class="dropdown-menu">
            <a class="dropdown-item" onclick="document.getElementById('user-dropdown-student').classList.remove('open');window.location.hash='#portal'">返回首页</a>
            <a class="dropdown-item" onclick="event.stopPropagation();document.getElementById('user-dropdown-student').classList.remove('open');logout()">退出登录</a>
          </div>
        </div>
      </div>
    </div>`;
    header.className = '';
  } else {
    // Portal header
    header.innerHTML = `<div class="header-inner">
      <a href="#portal" class="header-logo">&#9679; ${window.escapeHtml(logoMain)}<span>${window.escapeHtml(logoSub)}</span></a>
      <div class="header-nav">
        <a href="#portal" class="${hash===''||hash==='portal'?'active':''}">首页</a>
        <a href="#student">课程中心</a>
        <a href="#portal">通知公告</a>
        <a href="#portal">关于我们</a>
      </div>
      <div class="header-actions">
        ${user ? `<span style="font-size:0.875rem">${user.realname}</span>
        <div class="dropdown" id="user-dropdown-portal">
          <button class="btn btn-sm btn-outline" onclick="document.getElementById('user-dropdown-portal').classList.toggle('open')">菜单</button>
          <div class="dropdown-menu">
            ${user.role==='admin'?`<a class="dropdown-item" href="#admin">管理后台</a>`:''}
            ${user.role==='teacher'?`<a class="dropdown-item" href="#teacher">教师平台</a>`:''}
            <a class="dropdown-item" href="#student">学习中心</a>
            <a class="dropdown-item" onclick="event.stopPropagation();document.getElementById('user-dropdown-portal').classList.remove('open');logout()">退出登录</a>
          </div>
        </div>` : `<button class="btn btn-primary btn-sm" onclick="showLoginModal()">登录</button>
        <button class="btn btn-outline btn-sm" onclick="showRegisterModal()">注册</button>`}
      </div>
    </div>`;
    header.className = '';
  }
}

/* ===== Footer ===== */
function renderFooter() {
  const s = window._siteSettings || {};
  const copyright = s.site_copyright || '\u00A9 2025 扬州职业大学继续教育学院 版权所有';
  document.getElementById('app-footer').innerHTML = `<div class="footer-inner">
    <span>${window.escapeHtml(copyright)}</span>
    <div class="footer-links" id="footer-links">
      <a href="#portal">关于我们</a>
      <a href="javascript:void(0)" class="footer-contact-link">联系方式</a>
      <a href="#portal">帮助中心</a>
      <a href="#portal">隐私政策</a>
    </div>
  </div>`;

  // Bind contact link via event delegation
  const footerLinks = document.getElementById('footer-links');
  if (footerLinks) {
    footerLinks.addEventListener('click', (e) => {
      if (e.target.classList.contains('footer-contact-link')) {
        e.preventDefault();
        showContactModal();
      }
    });
  }
}

/* ===== Contact Modal ===== */
function showContactModal() {
  const c = window._contactInfo || {};
  const items = [];
  const add = (icon, label, value) => { if (value) items.push({ icon, label, value }); };
  add('📞', '电话', c.phone || '0514-87654321');
  add('📧', '邮箱', c.email || 'jxjy@yzpc.edu.cn');
  add('📍', '地址', c.address || '扬州市邗江区文昌西路458号');
  if (c.work_hours) add('🕐', '工作时间', c.work_hours);
  if (c.qq) add('💬', 'QQ', c.qq);
  if (c.wechat) add('💚', '微信', c.wechat);

  window.showModal({
    title: '联系我们',
    width: '460px',
    content: `<div style="padding:8px 0"><div class="contact-info-detail">${items.map(item => `
      <div class="contact-detail-item">
        <span class="contact-detail-icon">${item.icon}</span>
        <div><div class="contact-detail-label">${item.label}</div><div class="contact-detail-value">${window.escapeHtml(item.value)}</div></div>
      </div>`).join('')}</div></div>`,
    confirmText: '关闭',
    cancelText: '',
  });
}

/* ===== Login/Register Modals ===== */
window.showLoginModal = () => {
  window.showModal({
    title: '用户登录',
    width: '420px',
    content: `<div class="form-group"><label class="form-label">用户名</label><input class="form-input" id="login-username" placeholder="请输入用户名"></div>
    <div class="form-group"><label class="form-label">密码</label><input class="form-input" type="password" id="login-password" placeholder="请输入密码"></div>
    <p style="font-size:0.8rem;color:var(--color-text-muted)">测试账号：admin/admin123 | teacher/teacher123 | student/student123</p>
    <p style="margin-top:8px;font-size:0.875rem">没有账号？ <a href="javascript:void(0)" onclick="closeModal();showRegisterModal()">立即注册</a></p>`,
    confirmText: '登录',
    onConfirm: async () => {
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      try {
        const user = await api.login(u, p);
        window.setCurrentUser(user);
        window.showToast('登录成功！', 'success');
        // Determine target hash based on role
        const targetHash = user.role === 'admin' ? '#admin' : user.role === 'teacher' ? '#teacher' : '#student';
        if (window.location.hash === targetHash) {
          // Already on the target page — hashchange won't fire, so manually render
          renderAll();
        } else {
          // Navigate to target — hashchange will trigger renderHeader() + route()
          window.location.hash = targetHash;
        }
      } catch (e) {
        window.showToast(e.message || '登录失败', 'error');
      }
    }
  });
};

window.showRegisterModal = () => {
  window.showModal({
    title: '用户注册',
    width: '460px',
    content: `<div class="form-group"><label class="form-label">用户名</label><input class="form-input" id="reg-username" placeholder="请输入用户名"></div>
    <div class="form-group"><label class="form-label">密码</label><input class="form-input" type="password" id="reg-password" placeholder="请输入密码"></div>
    <div class="form-group"><label class="form-label">姓名</label><input class="form-input" id="reg-realname" placeholder="请输入真实姓名"></div>
    <div class="form-group"><label class="form-label">手机号</label><input class="form-input" id="reg-phone" placeholder="请输入手机号"></div>
    <div class="form-group"><label class="form-label">邮箱</label><input class="form-input" id="reg-email" placeholder="请输入邮箱"></div>
    <p style="margin-top:8px;font-size:0.875rem">已有账号？ <a href="javascript:void(0)" onclick="closeModal();showLoginModal()">立即登录</a></p>`,
    confirmText: '注册',
    onConfirm: async () => {
      const data = {
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value,
        realname: document.getElementById('reg-realname').value,
        phone: document.getElementById('reg-phone').value,
        email: document.getElementById('reg-email').value
      };
      try {
        await api.register(data);
        window.showToast('注册成功！请登录', 'success');
        setTimeout(() => window.showLoginModal(), 1500);
      } catch (e) {
        window.showToast(e.message || '注册失败', 'error');
      }
    }
  });
};

/* ===== Route Handler ===== */
async function route() {
  const hash = window.location.hash.slice(1) || 'portal';
  const main = document.getElementById('app-main');
  main.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';

  // Re-check login state from storage on every route
  const user = window.getCurrentUser();

  try {
    if (hash === 'portal') {
      const { renderPortal } = await import('./modules/portal.js');
      await renderPortal();
    } else if (hash === 'student') {
      if (!user) { window.showLoginModal(); return; }
      const { renderStudent } = await import('./modules/student.js');
      await renderStudent();
    } else if (hash.startsWith('student/course/')) {
      if (!user) { window.showLoginModal(); return; }
      const courseId = hash.split('/')[2];
      const { renderStudentCourse } = await import('./modules/student.js');
      await renderStudentCourse(courseId);
    } else if (hash === 'teacher') {
      if (!user) { window.showLoginModal(); return; }
      const { renderTeacher } = await import('./modules/teacher.js');
      await renderTeacher();
    } else if (hash.startsWith('admin')) {
      if (!user) { window.showLoginModal(); return; }
      const section = hash.split('/')[1] || 'dashboard';
      const mod = await import('./modules/admin.js');
      await mod.renderAdmin(section);
    } else {
      window.location.hash = '#portal';
    }
  } catch (e) {
    console.error('Route error:', e);
    const stack = e.stack ? `<pre style="font-size:0.75rem;text-align:left;max-height:200px;overflow:auto;margin-top:8px">${window.escapeHtml(e.stack)}</pre>` : '';
    main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>页面加载失败</h4><p style="color:var(--color-error)">${window.escapeHtml(e.message)}</p>${stack}</div>`;
  }
}

function renderAll() {
  renderHeader();
  renderFooter();
  route();
}

/* ===== Init ===== */
window.addEventListener('DOMContentLoaded', async () => {
  // Load theme FIRST so CSS variables are set before rendering anything
  await initTheme();
  // Pre-load contact info for footer modal
  try { window._contactInfo = await api.getContact(); } catch(e) { window._contactInfo = {}; }
  renderAll();
  window.addEventListener('hashchange', () => {
    renderHeader();
    renderFooter();
    route();
  });
});
