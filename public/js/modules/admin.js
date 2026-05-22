import { api, uploadFile, deleteUpload } from '../api.js';
import { renderDashboard } from './dashboard.js';
import '../modules/rich-editor.js';

export async function renderAdmin(section) {
  const main = document.getElementById('app-main');
  if (!window.isLoggedIn()) { window.showLoginModal(); return; }

  const menuGroups = [
    { label: '数据概览', items: [{ id: 'dashboard', label: '数据看板', icon: '📊' }] },
    { label: '教学管理', items: [
      { id: 'users', label: '用户管理', icon: '👥' }, { id: 'roles', label: '角色权限', icon: '🔑' },
      { id: 'projects', label: '项目管理', icon: '📋' }, { id: 'students', label: '学员管理', icon: '🎓' },
      { id: 'classes', label: '班级管理', icon: '🏫' }, { id: 'content', label: '内容管理', icon: '📝' },
    ]},
    { label: '资源管理', items: [
      { id: 'categories', label: '课程分类', icon: '📂' }, { id: 'courses-list', label: '课程列表', icon: '📚' },
      { id: 'records', label: '学习记录', icon: '📈' },
    ]},
    { label: '财务管理', items: [
      { id: 'orders', label: '订单管理', icon: '💰' }, { id: 'invoices', label: '发票管理', icon: '🧾' },
      { id: 'settlement', label: '课程结算', icon: '📊' },
    ]},
    { label: '基础数据管理', items: [
      { id: 'message-config', label: '消息配置', icon: '✉️' }, { id: 'ldap', label: 'LDAP管理', icon: '🔗' },
      { id: 'notifications-config', label: '通知公告', icon: '🔔' }, { id: 'learning-config', label: '学习设置', icon: '⚙️' },
      { id: 'home-config', label: '首页设置', icon: '🏠' }, { id: 'registration-config', label: '报名设置', icon: '📝' },
      { id: 'learning-mode', label: '学习模式', icon: '🔄' }, { id: 'data-report', label: '数据报表', icon: '📈' },
      { id: 'wx-menu', label: '微信菜单', icon: '💬' }, { id: 'site-style', label: '网站风格', icon: '🎨' },
    ]},
    { label: '组织管理', items: [{ id: 'organizations', label: '组织机构', icon: '🏢' }] },
  ];

  const sidebar = menuGroups.map(g => `
    <div class="sidebar-group">
      <div class="sidebar-group-label">${g.label}</div>
      ${g.items.map(i => `<div class="sidebar-nav-item${section===i.id?' active':''}" onclick="window.location.hash='#admin/${i.id}'">${i.icon} <span>${i.label}</span></div>`).join('')}
    </div>
  `).join('');

  main.innerHTML = `<div class="admin-layout"><nav class="sidebar">${sidebar}</nav><div class="admin-content"><div class="skeleton skeleton-card"></div></div></div>`;
  const content = main.querySelector('.admin-content');

  try {
    switch (section) {
      case 'dashboard': await renderDashboard(); return;
      case 'data-report': await renderDataReportPage(content); break;
      case 'message-config': case 'ldap': case 'notifications-config': case 'learning-config':
      case 'home-config': case 'registration-config': case 'learning-mode': case 'wx-menu': case 'site-style':
        const { renderSettings } = await import('./settings.js');
        await renderSettings(section);
        return;
      default: await renderAdminSection(content, section);
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>加载失败</h4><p>${window.escapeHtml(e.message)}</p></div>`;
    console.error(e);
  }
}

async function renderAdminSection(content, section) {
  switch (section) {
    case 'users': await renderUsers(content); break;
    case 'roles': renderRoles(content); break;
    case 'projects': await renderProjects(content); break;
    case 'students': await renderStudents(content); break;
    case 'classes': await renderClasses(content); break;
    case 'content': await renderContentMgmt(content); break;
    case 'categories': await renderCategories(content); break;
    case 'courses-list': await renderCoursesList(content); break;
    case 'records': await renderRecords(content); break;
    case 'orders': await renderOrders(content); break;
    case 'invoices': renderInvoices(content); break;
    case 'settlement': renderSettlement(content); break;
    case 'organizations': await renderOrganizations(content); break;
    default: await renderDashboard();
  }
}

/* ===== 用户管理 ===== */
async function renderUsers(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>用户管理</h2><div class="flex gap-2"><input class="form-input" id="user-search" placeholder="搜索用户..." style="width:200px" oninput="window.renderUsersSearch()"><button class="btn btn-primary btn-sm" onclick="window.showUserEditModal()">+ 新建用户</button></div></div><div id="users-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const users = await api.getUsers({});
    renderUsersTable(users);
  } catch(e) { document.getElementById('users-table').innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h4>暂无用户数据</h4></div>`; }
}

window.renderUsersSearch = async () => {
  const q = document.getElementById('user-search')?.value || '';
  try { const users = await api.getUsers({ q }); renderUsersTable(users); } catch(e) {}
};

function renderUsersTable(users) {
  const rows = users.map(u => `<tr>
    <td>${window.escapeHtml(u.username)}</td><td>${window.escapeHtml(u.realname||'')}</td>
    <td><span class="badge ${u.role==='admin'?'badge-error':u.role==='teacher'?'badge-warning':'badge-info'}">${u.role==='admin'?'管理员':u.role==='teacher'?'教师':'学员'}</span></td>
    <td>${u.phone||'-'}</td><td>${u.email||'-'}</td><td>${u.org_name||'-'}</td>
    <td><span class="badge ${u.status==='active'?'badge-success':'badge-error'}">${u.status==='active'?'正常':'禁用'}</span></td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showUserEditModal(${u.id})">编辑</button>
      <button class="btn btn-outline btn-sm ml-1" style="color:var(--color-error)" onclick="window.confirmDeleteUser(${u.id},'${window.escapeHtml(u.realname||u.username)}')">删除</button>
    </td>
  </tr>`).join('');
  document.getElementById('users-table').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>用户名</th><th>姓名</th><th>角色</th><th>手机</th><th>邮箱</th><th>机构</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

window.showUserEditModal = async (id) => {
  const isNew = !id;
  let u = { realname:'', phone:'', email:'', role:'student', status:'active' };
  if (!isNew) { try { u = await api.getUser(id); } catch(e) {} }
  window.showModal({
    title: isNew ? '新建用户' : '编辑用户', width: '460px',
    content: `<div class="form-group"><label class="form-label">姓名</label><input class="form-input" id="edit-realname" value="${window.escapeHtml(u.realname||'')}"></div>
    ${isNew?`<div class="form-group"><label class="form-label">用户名</label><input class="form-input" id="edit-username"></div>
    <div class="form-group"><label class="form-label">密码</label><input class="form-input" type="password" id="edit-password"></div>`:''}
    <div class="form-group"><label class="form-label">手机号</label><input class="form-input" id="edit-phone" value="${window.escapeHtml(u.phone||'')}"></div>
    <div class="form-group"><label class="form-label">邮箱</label><input class="form-input" id="edit-email" value="${window.escapeHtml(u.email||'')}"></div>
    <div class="form-group"><label class="form-label">角色</label><select class="form-select" id="edit-role">
      <option value="student" ${u.role==='student'?'selected':''}>学员</option>
      <option value="teacher" ${u.role==='teacher'?'selected':''}>教师</option>
      <option value="admin" ${u.role==='admin'?'selected':''}>管理员</option>
    </select></div>
    <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="edit-status">
      <option value="active" ${u.status==='active'?'selected':''}>正常</option>
      <option value="disabled" ${u.status!=='active'?'selected':''}>禁用</option>
    </select></div>`,
    confirmText: '保存',
    onConfirm: async () => {
      const data = {
        realname: document.getElementById('edit-realname').value,
        phone: document.getElementById('edit-phone').value,
        email: document.getElementById('edit-email').value,
        role: document.getElementById('edit-role').value,
        status: document.getElementById('edit-status').value
      };
      try {
        if (isNew) {
          data.username = document.getElementById('edit-username').value;
          data.password = document.getElementById('edit-password').value;
          if (!data.username) { window.showToast('请输入用户名','warning'); return; }
          await api.register(data);
        } else {
          await api.updateUser(id, data);
        }
        window.showToast('保存成功', 'success');
        const users = await api.getUsers({});
        renderUsersTable(users);
      } catch(e) { window.showToast(e.message || '保存失败', 'error'); }
    }
  });
};

window.confirmDeleteUser = (id, name) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定要删除用户 <strong>${window.escapeHtml(name)}</strong> 吗？此操作不可恢复。</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try {
        await api.deleteUser(id);
        window.showToast('用户已删除', 'success');
        const users = await api.getUsers({});
        renderUsersTable(users);
      } catch(e) { window.showToast(e.message || '删除失败', 'error'); }
    }
  });
};

/* ===== 角色权限 ===== */
function renderRoles(content) {
  const roles = [
    { id:1, name: '系统管理员', desc: '拥有所有功能的管理权限', users: 1, color: '#C0392B', perms: ['教学管理','资源管理','财务管理','基础数据管理','组织管理'] },
    { id:2, name: '教师', desc: '可管理课程、学员成绩、发布公告', users: 5, color: '#D4782A', perms: ['教学管理','资源管理'] },
    { id:3, name: '学员', desc: '可浏览课程、参与学习、查看证书', users: 20, color: '#2B6CB0', perms: [] },
    { id:4, name: '教学秘书', desc: '可管理学员、课程、成绩', users: 2, color: '#2D8C4E', perms: ['教学管理','资源管理'] },
  ];
  content.innerHTML = `<div class="admin-content-header"><h2>角色权限管理</h2><button class="btn btn-primary btn-sm" onclick="window.showRoleCreateModal()">+ 新建角色</button></div>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">
  ${roles.map(r => `<div class="card" id="role-card-${r.id}"><div class="card-body">
    <div class="flex justify-between items-center mb-3">
      <div class="flex items-center gap-2"><div style="width:12px;height:12px;border-radius:50%;background:${r.color}"></div><h4>${r.name}</h4></div>
      <div class="flex gap-2"><span class="badge badge-info">${r.users}人</span><button class="btn btn-outline btn-sm" onclick="window.showRoleEditModal(${r.id},'${r.name}','${r.desc}')">编辑</button></div>
    </div>
    <p class="text-sm text-secondary mb-3">${r.desc}</p>
    <div style="font-size:0.8rem">
      ${['教学管理','资源管理','财务管理','基础数据管理','组织管理'].map(m => `
        <label style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;margin-bottom:4px;cursor:pointer">
          <input type="checkbox" ${r.name==='系统管理员'||r.perms.includes(m)?'checked':''} onchange="window.showToast('权限修改已保存','success')"> ${m}
        </label>`).join('')}
    </div>
  </div></div>`).join('')}
  </div>`;
}

window.showRoleCreateModal = () => {
  window.showModal({
    title: '新建角色', width: '420px',
    content: `<div class="form-group"><label class="form-label">角色名称</label><input class="form-input" id="new-role-name" placeholder="请输入角色名称"></div>
    <div class="form-group"><label class="form-label">角色描述</label><textarea class="form-textarea" id="new-role-desc" rows="3" placeholder="请输入角色描述"></textarea></div>
    <div class="form-group"><label class="form-label">权限分配</label>
    ${['教学管理','资源管理','财务管理','基础数据管理','组织管理'].map(m => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer"><input type="checkbox" name="perm" value="${m}"> ${m}</label>`).join('')}
    </div>`,
    confirmText: '创建',
    onConfirm: () => {
      const name = document.getElementById('new-role-name').value;
      if (!name) { window.showToast('请输入角色名称','warning'); return; }
      window.showToast('角色"'+name+'"创建成功', 'success');
    }
  });
};

window.showRoleEditModal = (id, name, desc) => {
  window.showModal({
    title: '编辑角色', width: '420px',
    content: `<div class="form-group"><label class="form-label">角色名称</label><input class="form-input" id="edit-role-name" value="${window.escapeHtml(name)}"></div>
    <div class="form-group"><label class="form-label">角色描述</label><textarea class="form-textarea" id="edit-role-desc" rows="3">${window.escapeHtml(desc)}</textarea></div>`,
    confirmText: '保存',
    onConfirm: () => { window.showToast('角色信息已更新','success'); }
  });
};

/* ===== 项目管理 ===== */
async function renderProjects(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>项目管理</h2><button class="btn btn-primary btn-sm" onclick="window.showProjectEditModal()">+ 新建项目</button></div><div id="projects-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const projects = await api.getProjects();
    renderProjectsTable(projects);
  } catch(e) {
    document.getElementById('projects-table').innerHTML = `<div class="empty-state"><h4>暂无项目</h4></div>`;
  }
}

function renderProjectsTable(projects) {
  if (!projects.length) { document.getElementById('projects-table').innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h4>暂无项目，点击右上角新建</h4></div>`; return; }
  const rows = projects.map(p => `<tr>
    <td><strong>${window.escapeHtml(p.name)}</strong><div class="text-xs text-muted mt-1">${window.escapeHtml(p.description||'')}</div></td>
    <td>${p.start_date||'-'} ~ ${p.end_date||'-'}</td>
    <td>${p.students||0}人</td>
    <td>${Number(p.fee)===0?'<span class="badge badge-success">免费</span>':'¥'+p.fee}</td>
    <td>${window.escapeHtml(p.exam_type||'-')}</td>
    <td><span class="badge ${p.status==='active'?'badge-success':p.status==='finished'?'badge-info':'badge-warning'}">${p.status==='active'?'进行中':p.status==='finished'?'已结束':'未开始'}</span></td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showProjectEditModal(${p.id})">编辑</button>
      <button class="btn btn-outline btn-sm ml-1" style="color:var(--color-error)" onclick="window.confirmDeleteProject(${p.id},'${window.escapeHtml(p.name)}')">删除</button>
    </td>
  </tr>`).join('');
  document.getElementById('projects-table').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>项目名称</th><th>培训时间</th><th>报名人数</th><th>费用</th><th>考核方式</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

window.showProjectEditModal = async (id) => {
  const isNew = !id;
  let p = { name:'', start_date:'', end_date:'', fee:0, exam_type:'在线考试', description:'', status:'active' };
  if (!isNew) { try { p = await api.getProject(id); } catch(e) {} }
  window.showModal({
    title: isNew ? '新建项目' : '编辑项目', width: '540px',
    content: `<div class="settings-grid">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">项目名称 <span style="color:red">*</span></label><input class="form-input" id="proj-name" value="${window.escapeHtml(p.name||'')}"></div>
      <div class="form-group"><label class="form-label">开始日期</label><input class="form-input" type="date" id="proj-start" value="${p.start_date||''}"></div>
      <div class="form-group"><label class="form-label">结束日期</label><input class="form-input" type="date" id="proj-end" value="${p.end_date||''}"></div>
      <div class="form-group"><label class="form-label">培训费用（元，0为免费）</label><input class="form-input" type="number" id="proj-fee" value="${p.fee||0}"></div>
      <div class="form-group"><label class="form-label">考核方式</label><select class="form-select" id="proj-exam">
        <option value="在线考试" ${p.exam_type==='在线考试'?'selected':''}>在线考试</option>
        <option value="线上+线下" ${p.exam_type==='线上+线下'?'selected':''}>线上+线下</option>
        <option value="线上直播" ${p.exam_type==='线上直播'?'selected':''}>线上直播</option>
        <option value="面授考核" ${p.exam_type==='面授考核'?'selected':''}>面授考核</option>
      </select></div>
      <div class="form-group"><label class="form-label">项目状态</label><select class="form-select" id="proj-status">
        <option value="pending" ${p.status==='pending'?'selected':''}>未开始</option>
        <option value="active" ${p.status==='active'?'selected':''}>进行中</option>
        <option value="finished" ${p.status==='finished'?'selected':''}>已结束</option>
      </select></div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">项目描述</label><textarea class="form-textarea" id="proj-desc" rows="3">${window.escapeHtml(p.description||'')}</textarea></div>
    </div>`,
    confirmText: '保存',
    onConfirm: async () => {
      const name = document.getElementById('proj-name').value.trim();
      if (!name) { window.showToast('请输入项目名称','warning'); return; }
      const data = {
        name, start_date: document.getElementById('proj-start').value,
        end_date: document.getElementById('proj-end').value,
        fee: Number(document.getElementById('proj-fee').value)||0,
        exam_type: document.getElementById('proj-exam').value,
        status: document.getElementById('proj-status').value,
        description: document.getElementById('proj-desc').value,
      };
      try {
        if (isNew) await api.createProject(data); else await api.updateProject(id, data);
        window.showToast(isNew?'项目创建成功':'项目更新成功', 'success');
        const projects = await api.getProjects();
        renderProjectsTable(projects);
      } catch(e) { window.showToast(e.message||'保存失败','error'); }
    }
  });
};

window.confirmDeleteProject = (id, name) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定要删除项目 <strong>${window.escapeHtml(name)}</strong> 吗？</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try {
        await api.deleteProject(id);
        window.showToast('项目已删除','success');
        const projects = await api.getProjects();
        renderProjectsTable(projects);
      } catch(e) { window.showToast(e.message||'删除失败','error'); }
    }
  });
};

/* ===== 学员管理 ===== */
async function renderStudents(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>学员管理</h2><div class="flex gap-2"><input class="form-input" id="student-search" placeholder="搜索姓名/手机号..." style="width:200px" oninput="window.renderStudentsSearch()"></div></div><div id="students-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const users = await api.getUsers({ role: 'student' });
    renderStudentsTable(users);
  } catch(e) { document.getElementById('students-table').innerHTML = `<div class="empty-state"><h4>暂无学员数据</h4></div>`; }
}

window.renderStudentsSearch = async () => {
  const q = document.getElementById('student-search')?.value || '';
  try { const users = await api.getUsers({ role: 'student', q }); renderStudentsTable(users); } catch(e) {}
};

function renderStudentsTable(students) {
  if (!students.length) { document.getElementById('students-table').innerHTML = `<div class="empty-state"><div class="empty-icon">🎓</div><h4>暂无学员</h4></div>`; return; }
  const rows = students.map(s => `<tr>
    <td><strong>${window.escapeHtml(s.realname||'')}</strong></td>
    <td>${s.phone||'-'}</td>
    <td>${s.email||'-'}</td>
    <td>${s.org_name||'个人注册'}</td>
    <td><span class="badge ${s.status==='active'?'badge-success':'badge-error'}">${s.status==='active'?'正常':'禁用'}</span></td>
    <td>${window.formatDate(s.created_at)}</td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showStudentDetail(${s.id})">详情</button>
      <button class="btn btn-outline btn-sm ml-1" onclick="window.showUserEditModal(${s.id})">编辑</button>
    </td>
  </tr>`).join('');
  document.getElementById('students-table').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>姓名</th><th>手机</th><th>邮箱</th><th>机构</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

window.showStudentDetail = async (userId) => {
  try {
    const [user, records, certs] = await Promise.all([
      api.getUser(userId),
      api.getLearningRecords({ user_id: userId }),
      api.getCertificates({ user_id: userId })
    ]);
    const recordRows = records.map(r => `<tr><td>${window.escapeHtml(r.course_title||'')}</td><td>${r.progress}%</td><td>${r.duration_minutes||0}分钟</td><td>${window.formatDate(r.last_study_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted">暂无学习记录</td></tr>';
    const certRows = certs.map(c => `<tr><td>${c.cert_no}</td><td>${window.escapeHtml(c.course_title||'')}</td><td>${window.escapeHtml(c.status||'')}</td><td>${window.formatDate(c.issued_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted">暂无证书记录</td></tr>';
    window.showModal({
      title: `学员详情 - ${window.escapeHtml(user.realname||user.username)}`, width: '660px',
      content: `<div class="settings-grid mb-4" style="grid-template-columns:repeat(2,1fr)">
        <div><span class="text-sm text-muted">用户名：</span><strong>${window.escapeHtml(user.username||'')}</strong></div>
        <div><span class="text-sm text-muted">姓名：</span><strong>${window.escapeHtml(user.realname||'-')}</strong></div>
        <div><span class="text-sm text-muted">手机：</span>${user.phone||'-'}</div>
        <div><span class="text-sm text-muted">邮箱：</span>${user.email||'-'}</div>
        <div><span class="text-sm text-muted">机构：</span>${user.org_name||'-'}</div>
        <div><span class="text-sm text-muted">注册：</span>${window.formatDate(user.created_at)}</div>
      </div>
      <h4 class="mb-2">学习记录（${records.length}条）</h4>
      <div class="table-container mb-4"><table class="table" style="font-size:0.8rem"><thead><tr><th>课程</th><th>进度</th><th>时长</th><th>最后学习</th></tr></thead><tbody>${recordRows}</tbody></table></div>
      <h4 class="mb-2">证书记录（${certs.length}张）</h4>
      <div class="table-container"><table class="table" style="font-size:0.8rem"><thead><tr><th>证书编号</th><th>课程</th><th>状态</th><th>颁发时间</th></tr></thead><tbody>${certRows}</tbody></table></div>`,
      confirmText: '关闭'
    });
  } catch(e) { window.showToast('加载详情失败','error'); }
};

/* ===== 内容管理 ===== */
async function renderContentMgmt(content) {
  let notifications = [];
  try { notifications = await api.getNotifications(); } catch(e) {}

  const renderList = (notifs) => {
    if (!notifs.length) return '<div class="empty-state"><div class="empty-icon">📝</div><h4>暂无内容</h4></div>';
    const rows = notifs.map(n => `<tr>
      <td><strong>${window.escapeHtml(n.title)}</strong>${window.renderAttachmentBadge(n.attachments)}</td>
      <td><span class="badge ${n.type==='notice'?'badge-info':n.type==='policy'?'badge-warning':'badge-success'}">${n.type==='notice'?'培训通知':n.type==='policy'?'政策法规':'新闻动态'}</span></td>
      <td>${window.formatDate(n.created_at)}</td>
      <td><span class="badge badge-success">已发布</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.showEditNotifModal(${n.id})">编辑</button>
        <button class="btn btn-outline btn-sm ml-1" onclick="window.showReadStats(${n.id},'${window.escapeHtml(n.title)}')">阅读统计</button>
        <button class="btn btn-outline btn-sm ml-1" style="color:var(--color-error)" onclick="window.confirmDeleteNotif(${n.id},'${window.escapeHtml(n.title)}')">删除</button>
      </td>
    </tr>`).join('');
    return `<div class="table-container"><table class="table"><thead><tr><th>标题</th><th>类型</th><th>发布时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };

  content.innerHTML = `<div class="admin-content-header"><h2>内容管理</h2><button class="btn btn-primary btn-sm" onclick="window.showCreateNotifModal()">+ 新建内容</button></div>
  <div class="card mb-4"><div class="card-body"><p class="text-sm text-muted">管理平台内的通知公告、政策法规、新闻动态等内容，支持发布审核与统计。</p></div></div>
  <div id="content-list">${renderList(notifications)}</div>`;

  window._refreshContentList = async () => {
    try { const n = await api.getNotifications(); document.getElementById('content-list').innerHTML = renderList(n); } catch(e) {}
  };

  window.showCreateNotifModal = () => {
    window.showModal({
      title: '新建内容', width: '780px',
      content: `<div class="form-group"><label class="form-label">标题 <span style="color:red">*</span></label><input class="form-input" id="notif-title"></div>
      <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="notif-type">
        <option value="notice">培训通知</option><option value="policy">政策法规</option><option value="news">新闻动态</option>
      </select></div>
      <div class="form-group"><label class="form-label">正文内容</label><div id="notif-editor"></div></div>
      <div class="form-group"><label class="form-label">附件</label><div id="notif-attachments"></div></div>`,
      confirmText: '发布',
      onConfirm: async () => {
        const title = document.getElementById('notif-title').value.trim();
        if (!title) { window.showToast('请输入标题','warning'); return; }
        try {
          await api.createNotification({ title, type: document.getElementById('notif-type').value, content: window.getRichEditorContent('notif-editor'), attachments: window.getAttachments('notif-attachments'), publisher_id: window.getCurrentUser()?.id||1 });
          window.showToast('发布成功','success'); window._refreshContentList();
          window.destroyRichEditor('notif-editor');
        } catch(e) { window.showToast(e.message||'发布失败','error'); }
      },
      afterRender: () => {
        window.initRichEditor('notif-editor');
        window.initAttachmentManager('notif-attachments');
      }
    });
  };

  window.showEditNotifModal = async (id) => {
    let n = {};
    try { n = await api.getNotification(id); } catch(e) {}
    window.showModal({
      title: '编辑内容', width: '780px',
      content: `<div class="form-group"><label class="form-label">标题</label><input class="form-input" id="edit-notif-title" value="${window.escapeHtml(n.title||'')}"></div>
      <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="edit-notif-type">
        <option value="notice" ${n.type==='notice'?'selected':''}>培训通知</option>
        <option value="policy" ${n.type==='policy'?'selected':''}>政策法规</option>
        <option value="news" ${n.type==='news'?'selected':''}>新闻动态</option>
      </select></div>
      <div class="form-group"><label class="form-label">正文内容</label><div id="edit-notif-editor"></div></div>
      <div class="form-group"><label class="form-label">附件</label><div id="edit-notif-attachments"></div></div>`,
      confirmText: '保存',
      onConfirm: async () => {
        try {
          await api.updateNotification(id, { title: document.getElementById('edit-notif-title').value, type: document.getElementById('edit-notif-type').value, content: window.getRichEditorContent('edit-notif-editor'), attachments: window.getAttachments('edit-notif-attachments') });
          window.showToast('内容已更新','success'); window._refreshContentList();
          window.destroyRichEditor('edit-notif-editor');
        } catch(e) { window.showToast(e.message||'保存失败','error'); }
      },
      afterRender: () => {
        window.initRichEditor('edit-notif-editor', n.content || '');
        window.initAttachmentManager('edit-notif-attachments', n.attachments || []);
      }
    });
  };

  window.confirmDeleteNotif = (id, title) => {
    window.showModal({
      title: '确认删除', width: '360px',
      content: `<p>确定要删除内容 <strong>${window.escapeHtml(title)}</strong> 吗？</p>`,
      confirmText: '删除', confirmClass: 'btn-error',
      onConfirm: async () => {
        try { await api.deleteNotification(id); window.showToast('已删除','success'); window._refreshContentList(); } catch(e) { window.showToast('删除失败','error'); }
      }
    });
  };
}

/* ===== 课程分类 ===== */
async function renderCategories(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>课程分类管理</h2><button class="btn btn-primary btn-sm" onclick="window.showAddCategoryModal()">+ 新增分类</button></div><div id="cats-container"><div class="skeleton skeleton-card"></div></div>`;
  await loadCategoryTree();
}

async function loadCategoryTree() {
  try {
    const cats = await api.getCourseCategories();
    window._allCats = cats;
    const tree = buildCategoryTree(cats);
    document.getElementById('cats-container').innerHTML = `<div class="org-tree">${tree || '<div class="empty-state"><h4>暂无分类</h4></div>'}</div>`;
  } catch(e) { document.getElementById('cats-container').innerHTML = `<p class="text-muted">加载失败</p>`; }
}

function buildCategoryTree(cats, parentId = 0) {
  const children = cats.filter(c => c.parent_id === parentId);
  if (!children.length) return '';
  return `<div class="org-children">${children.map(c => `
    <div class="org-node">
      📁 <strong>${window.escapeHtml(c.name)}</strong> <span class="text-xs text-muted ml-2">排序:${c.sort_order}</span>
      <button class="drag-btn ml-2" onclick="window.showEditCategoryModal(${c.id},'${window.escapeHtml(c.name)}',${c.parent_id},${c.sort_order})">编辑</button>
      <button class="drag-btn" style="color:var(--color-error)" onclick="window.confirmDeleteCategory(${c.id},'${window.escapeHtml(c.name)}')">删除</button>
    </div>${buildCategoryTree(cats, c.id)}`).join('')}</div>`;
}

window.showAddCategoryModal = () => {
  const parentOpts = (window._allCats||[]).filter(c=>c.parent_id===0).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  window.showModal({
    title: '新增分类', width: '400px',
    content: `<div class="form-group"><label class="form-label">分类名称 <span style="color:red">*</span></label><input class="form-input" id="cat-name"></div>
    <div class="form-group"><label class="form-label">上级分类（留空为一级分类）</label><select class="form-select" id="cat-parent"><option value="0">（一级分类）</option>${parentOpts}</select></div>
    <div class="form-group"><label class="form-label">排序号</label><input class="form-input" type="number" id="cat-sort" value="0"></div>`,
    confirmText: '创建',
    onConfirm: async () => {
      const name = document.getElementById('cat-name').value.trim();
      if (!name) { window.showToast('请输入分类名称','warning'); return; }
      try {
        await api.createCourseCategory({ name, parent_id: Number(document.getElementById('cat-parent').value), sort_order: Number(document.getElementById('cat-sort').value)||0 });
        window.showToast('分类创建成功','success'); await loadCategoryTree();
      } catch(e) { window.showToast(e.message||'创建失败','error'); }
    }
  });
};

window.showEditCategoryModal = (id, name, parentId, sortOrder) => {
  const parentOpts = (window._allCats||[]).filter(c=>c.parent_id===0&&c.id!==id).map(c=>`<option value="${c.id}" ${c.id===parentId?'selected':''}>${c.name}</option>`).join('');
  window.showModal({
    title: '编辑分类', width: '400px',
    content: `<div class="form-group"><label class="form-label">分类名称</label><input class="form-input" id="edit-cat-name" value="${window.escapeHtml(name)}"></div>
    <div class="form-group"><label class="form-label">上级分类</label><select class="form-select" id="edit-cat-parent"><option value="0" ${parentId===0?'selected':''}>（一级分类）</option>${parentOpts}</select></div>
    <div class="form-group"><label class="form-label">排序号</label><input class="form-input" type="number" id="edit-cat-sort" value="${sortOrder}"></div>`,
    confirmText: '保存',
    onConfirm: async () => {
      try {
        await api.updateCourseCategory(id, { name: document.getElementById('edit-cat-name').value, parent_id: Number(document.getElementById('edit-cat-parent').value), sort_order: Number(document.getElementById('edit-cat-sort').value) });
        window.showToast('分类已更新','success'); await loadCategoryTree();
      } catch(e) { window.showToast(e.message||'更新失败','error'); }
    }
  });
};

window.confirmDeleteCategory = (id, name) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定删除分类 <strong>${window.escapeHtml(name)}</strong> 吗？其下子分类也将被删除。</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try { await api.deleteCourseCategory(id); window.showToast('分类已删除','success'); await loadCategoryTree(); } catch(e) { window.showToast('删除失败','error'); }
    }
  });
};

/* ===== 课程列表 ===== */
async function renderCoursesList(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>课程列表</h2><div class="flex gap-2"><input class="form-input" id="course-search" placeholder="搜索课程名..." style="width:200px" oninput="window.renderCoursesSearch()"><button class="btn btn-primary btn-sm" onclick="window.showCourseEditModal()">+ 新增课程</button></div></div><div id="courses-list-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const courses = await api.getCourses({});
    window._allCats = window._allCats || await api.getCourseCategories();
    renderCoursesTable(courses);
  } catch(e) { document.getElementById('courses-list-table').innerHTML = `<div class="empty-state"><h4>暂无课程</h4></div>`; }
}

window.renderCoursesSearch = async () => {
  const q = document.getElementById('course-search')?.value || '';
  try { const courses = await api.getCourses({ q }); renderCoursesTable(courses); } catch(e) {}
};

function renderCoursesTable(courses) {
  if (!courses.length) { document.getElementById('courses-list-table').innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><h4>暂无课程</h4></div>`; return; }
  const rows = courses.map(c => `<tr>
    <td><div style="width:60px;height:36px;background:var(--color-primary-bg);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--color-primary)">${c.type==='video'?'录播':c.type==='live'?'直播':'面授'}</div></td>
    <td><strong>${window.escapeHtml(c.title)}</strong></td>
    <td>${c.category_name||'-'}</td><td>${c.teacher_name||'-'}</td>
    <td>${c.duration}学时</td>
    <td>${c.price===0?'<span class="badge badge-success">免费</span>':'¥'+c.price}</td>
    <td><span class="badge ${c.status==='published'?'badge-success':'badge-warning'}">${c.status==='published'?'已发布':'草稿'}</span></td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showCourseEditModal(${c.id})">编辑</button>
      <button class="btn btn-outline btn-sm ml-1" style="color:var(--color-error)" onclick="window.confirmDeleteCourse(${c.id},'${window.escapeHtml(c.title)}')">删除</button>
    </td>
  </tr>`).join('');
  document.getElementById('courses-list-table').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>封面</th><th>课程名</th><th>分类</th><th>教师</th><th>学时</th><th>价格</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

window.showCourseEditModal = async (id) => {
  const isNew = !id;
  let c = { title:'', category_id:0, teacher_id:0, type:'video', duration:0, price:0, description:'', status:'published', sort_order:0 };
  if (!isNew) { try { c = await api.getCourse(id); } catch(e) {} }
  let cats = [], teachers = [];
  try { [cats, teachers] = await Promise.all([api.getCourseCategories(), api.getTeachers()]); } catch(e){}
  const catOpts = cats.map(cat => `<option value="${cat.id}" ${cat.id===c.category_id?'selected':''}>${cat.name}</option>`).join('');
  const teacherOpts = teachers.map(t => `<option value="${t.id}" ${t.id===c.teacher_id?'selected':''}>${t.realname||t.username}</option>`).join('');

  // Load media data for existing courses
  let media = { audio: [], video: [], materials: [], trailer: '', preview: '' };
  if (!isNew) { try { media = await api.getCourseMedia(id); } catch(e) {} }

  const courseId = id;
  const mediaData = { ...media };

  const mediaTabHtml = buildCourseMediaTabHtml(mediaData);

  window.showModal({
    title: isNew?'新增课程':'编辑课程', width:'680px',
    content: `<div class="modal-tabs" id="course-modal-tabs">
      <button class="modal-tab active" onclick="switchCourseModalTab('basic',this)">基本信息</button>
      ${!isNew ? '<button class="modal-tab" onclick="switchCourseModalTab(\'media\',this)">媒体设置</button>' : ''}
    </div>
    <div id="course-tab-basic" class="modal-tab-content"><div class="settings-grid">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">课程名称 <span style="color:red">*</span></label><input class="form-input" id="c-title" value="${window.escapeHtml(c.title||'')}"></div>
      <div class="form-group"><label class="form-label">课程分类</label><select class="form-select" id="c-cat"><option value="0">请选择分类</option>${catOpts}</select></div>
      <div class="form-group"><label class="form-label">授课教师</label><select class="form-select" id="c-teacher"><option value="0">请选择教师</option>${teacherOpts}</select></div>
      <div class="form-group"><label class="form-label">课程类型</label><select class="form-select" id="c-type">
        <option value="video" ${c.type==='video'?'selected':''}>录播视频</option>
        <option value="live" ${c.type==='live'?'selected':''}>直播课程</option>
        <option value="offline" ${c.type==='offline'?'selected':''}>面授课程</option>
      </select></div>
      <div class="form-group"><label class="form-label">课程学时</label><input class="form-input" type="number" id="c-duration" value="${c.duration||0}"></div>
      <div class="form-group"><label class="form-label">课程价格（0为免费）</label><input class="form-input" type="number" id="c-price" value="${c.price||0}"></div>
      <div class="form-group"><label class="form-label">排序号</label><input class="form-input" type="number" id="c-sort" value="${c.sort_order||0}"></div>
      <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="c-status">
        <option value="published" ${c.status==='published'?'selected':''}>已发布</option>
        <option value="draft" ${c.status==='draft'?'selected':''}>草稿</option>
      </select></div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">课程描述</label><textarea class="form-textarea" id="c-desc" rows="3">${window.escapeHtml(c.description||'')}</textarea></div>
    </div></div>
    <div id="course-tab-media" class="modal-tab-content" style="display:none">${mediaTabHtml}</div>`,
    confirmText: '保存',
    onConfirm: async () => {
      const title = document.getElementById('c-title').value.trim();
      if (!title) { window.showToast('请输入课程名称','warning'); return; }
      const data = { title, category_id: Number(document.getElementById('c-cat').value), teacher_id: Number(document.getElementById('c-teacher').value), type: document.getElementById('c-type').value, duration: Number(document.getElementById('c-duration').value), price: Number(document.getElementById('c-price').value), description: document.getElementById('c-desc').value, status: document.getElementById('c-status').value, sort_order: Number(document.getElementById('c-sort').value) };
      try {
        let savedId = courseId;
        if (isNew) { const newCourse = await api.createCourse(data); savedId = newCourse.id; } else { await api.updateCourse(courseId, data); }
        // Save media data
        if (!isNew) {
          collectAndSaveMedia(savedId);
        }
        window.showToast(isNew?'课程创建成功':'课程已更新','success');
        const courses = await api.getCourses({});
        renderCoursesTable(courses);
      } catch(e) { window.showToast(e.message||'保存失败','error'); }
    }
  });

  // Store media data globally for the modal
  window._courseEditMedia = { courseId, data: mediaData };
};

function buildCourseMediaTabHtml(media) {
  const mediaItem = (item, idx, listKey) => `
    <div class="media-item" data-idx="${idx}">
      <div class="media-item-icon">${getFileIcon(item.type || item.url || '')}</div>
      <div class="media-item-info">
        <div class="media-item-name">${window.escapeHtml(item.name || '未命名')}</div>
        <div class="media-item-meta">${item.url ? '<span class="media-item-type">本地文件</span>' : '<span class="media-item-type">外部链接</span>'}${item.size ? ' · ' + formatFileSize(item.size) : ''}</div>
      </div>
      <div class="media-item-actions">
        ${item.url && isMediaFile(item.url) ? `<button class="btn btn-outline btn-xs" onclick="previewMediaFile('${item.url}')">预览</button>` : ''}
        ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-outline btn-xs">打开</a>` : ''}
        <button class="btn btn-outline btn-xs" style="color:var(--color-error)" onclick="removeMediaItem('${listKey}',${idx})">删除</button>
      </div>
    </div>`;

  const audioItems = (media.audio || []).map((a, i) => mediaItem(a, i, 'audio')).join('');
  const videoItems = (media.video || []).map((v, i) => mediaItem(v, i, 'video')).join('');
  const materialItems = (media.materials || []).map((m, i) => mediaItem(m, i, 'materials')).join('');

  return `
    <div class="media-section">
      <div class="media-section-header">
        <h4 class="media-section-title">🎬 课程视频</h4>
        <div class="media-section-actions">
          <button class="btn btn-outline btn-sm" onclick="showAddMediaLinkForm('video')">+ 添加链接</button>
          <label class="btn btn-primary btn-sm" style="cursor:pointer">
            上传文件
            <input type="file" accept="video/*" style="display:none" onchange="handleMediaUpload(this,'video')">
          </label>
        </div>
      </div>
      <div class="media-list" id="media-list-video">${videoItems || '<div class="media-empty">暂无视频，请上传或添加链接</div>'}</div>
    </div>

    <div class="media-section">
      <div class="media-section-header">
        <h4 class="media-section-title">🎵 课程音频</h4>
        <div class="media-section-actions">
          <button class="btn btn-outline btn-sm" onclick="showAddMediaLinkForm('audio')">+ 添加链接</button>
          <label class="btn btn-primary btn-sm" style="cursor:pointer">
            上传文件
            <input type="file" accept="audio/*" style="display:none" onchange="handleMediaUpload(this,'audio')">
          </label>
        </div>
      </div>
      <div class="media-list" id="media-list-audio">${audioItems || '<div class="media-empty">暂无音频，请上传或添加链接</div>'}</div>
    </div>

    <div class="media-section">
      <div class="media-section-header">
        <h4 class="media-section-title">📁 学习资料</h4>
        <div class="media-section-actions">
          <button class="btn btn-outline btn-sm" onclick="showAddMediaLinkForm('materials')">+ 添加链接</button>
          <label class="btn btn-primary btn-sm" style="cursor:pointer">
            上传文件
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.txt" style="display:none" onchange="handleMediaUpload(this,'materials')">
          </label>
        </div>
      </div>
      <div class="media-list" id="media-list-materials">${materialItems || '<div class="media-empty">暂无资料，请上传或添加链接</div>'}</div>
    </div>

    <div class="media-section">
      <div class="media-section-header">
        <h4 class="media-section-title">🎞️ 课程片花</h4>
      </div>
      <div class="media-single">
        <div class="form-group">
          <label class="form-label">片花链接（视频URL）</label>
          <div class="flex gap-2">
            <input class="form-input" id="media-trailer-link" value="${window.escapeHtml(media.trailer||'')}" placeholder="输入视频链接地址，如 https://...">
            <button class="btn btn-outline btn-sm" onclick="saveTrailerLink()" style="white-space:nowrap">保存链接</button>
          </div>
        </div>
        <div class="form-group mt-2">
          <label class="form-label">或上传片花文件</label>
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            选择视频文件
            <input type="file" accept="video/*" style="display:none" onchange="handleTrailerUpload(this)">
          </label>
          ${media.trailer ? `<div class="media-trailer-preview mt-2"><video src="${media.trailer}" controls style="max-width:100%;max-height:200px;border-radius:6px"></video></div>` : ''}
        </div>
      </div>
    </div>

    <div class="media-section">
      <div class="media-section-header">
        <h4 class="media-section-title">👁️ 试看内容</h4>
      </div>
      <div class="media-single">
        <div class="form-group">
          <label class="form-label">试看链接（视频URL）</label>
          <div class="flex gap-2">
            <input class="form-input" id="media-preview-link" value="${window.escapeHtml(media.preview||'')}" placeholder="输入试看视频链接地址">
            <button class="btn btn-outline btn-sm" onclick="savePreviewLink()" style="white-space:nowrap">保存链接</button>
          </div>
        </div>
        <div class="form-group mt-2">
          <label class="form-label">或上传试看文件</label>
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            选择视频文件
            <input type="file" accept="video/*" style="display:none" onchange="handlePreviewUpload(this)">
          </label>
          ${media.preview ? `<div class="media-trailer-preview mt-2"><video src="${media.preview}" controls style="max-width:100%;max-height:200px;border-radius:6px"></video></div>` : ''}
        </div>
      </div>
    </div>`;
}

function getFileIcon(urlOrType) {
  if (!urlOrType) return '📄';
  const s = urlOrType.toLowerCase();
  if (s.includes('video') || /\.(mp4|avi|mov|mkv|flv|wmv)/.test(s)) return '🎬';
  if (s.includes('audio') || /\.(mp3|wav|flac|aac|ogg)/.test(s)) return '🎵';
  if (/\.pdf/.test(s)) return '📕';
  if (/\.(doc|docx)/.test(s)) return '📘';
  if (/\.(ppt|pptx)/.test(s)) return '📙';
  if (/\.(xls|xlsx)/.test(s)) return '📗';
  if (/\.(zip|rar)/.test(s)) return '🗜️';
  if (/\.(jpg|jpeg|png|gif)/.test(s)) return '🖼️';
  return '📄';
}

function isMediaFile(url) {
  if (!url) return false;
  return /\.(mp4|avi|mov|mkv|mp3|wav|pdf|jpg|jpeg|png|gif|ppt|pptx|doc|docx)$/i.test(url);
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Tab switching
window.switchCourseModalTab = (tab, btn) => {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.style.display = 'none');
  btn.classList.add('active');
  const panel = document.getElementById('course-tab-' + tab);
  if (panel) panel.style.display = 'block';
};

// Add media link form
window.showAddMediaLinkForm = (listKey) => {
  const typeLabels = { video: '视频', audio: '音频', materials: '资料' };
  window.showModal({
    title: '添加' + typeLabels[listKey] + '链接', width: '440px',
    content: `
      <div class="form-group"><label class="form-label">名称</label><input class="form-input" id="media-link-name" placeholder="如：第一章 导论"></div>
      <div class="form-group"><label class="form-label">链接地址</label><input class="form-input" id="media-link-url" placeholder="输入文件URL地址"></div>
      <div class="form-group"><label class="form-label">说明（可选）</label><input class="form-input" id="media-link-desc" placeholder="简要说明"></div>`,
    confirmText: '添加',
    onConfirm: () => {
      const name = document.getElementById('media-link-name').value.trim();
      const url = document.getElementById('media-link-url').value.trim();
      const desc = document.getElementById('media-link-desc').value.trim();
      if (!url) { window.showToast('请输入链接地址', 'warning'); return; }
      if (!window._courseEditMedia) return;
      const item = { name: name || url.split('/').pop() || '未命名', link: url, desc, type: listKey };
      if (!window._courseEditMedia.data[listKey]) window._courseEditMedia.data[listKey] = [];
      window._courseEditMedia.data[listKey].push(item);
      refreshMediaList(listKey);
      window.showToast('链接已添加', 'success');
    }
  });
};

// Upload media file
window.handleMediaUpload = async (input, listKey) => {
  const file = input.files[0];
  if (!file) return;
  if (!window._courseEditMedia) return;
  try {
    window.showToast('正在上传...', 'info');
    const result = await uploadFile(file);
    const item = { name: file.name, url: result.url, size: result.size, type: result.mimetype };
    if (!window._courseEditMedia.data[listKey]) window._courseEditMedia.data[listKey] = [];
    window._courseEditMedia.data[listKey].push(item);
    refreshMediaList(listKey);
    window.showToast('上传成功', 'success');
  } catch(e) {
    window.showToast(e.message || '上传失败', 'error');
  }
  input.value = '';
};

// Remove media item
window.removeMediaItem = (listKey, idx) => {
  if (!window._courseEditMedia) return;
  const list = window._courseEditMedia.data[listKey];
  if (!list || !list[idx]) return;
  const item = list[idx];
  // Delete uploaded file from server
  if (item.url && item.url.startsWith('/uploads/')) {
    deleteUpload(item.url).catch(() => {});
  }
  list.splice(idx, 1);
  refreshMediaList(listKey);
};

// Preview media file
window.previewMediaFile = (url) => {
  window.showModal({
    title: '文件预览', width: '600px',
    content: `<div style="text-align:center">
      ${/\.(mp4|webm|ogg)/i.test(url) ? `<video src="${url}" controls style="max-width:100%;max-height:400px;border-radius:6px"></video>` :
        /\.(mp3|wav|ogg|aac)/i.test(url) ? `<audio src="${url}" controls style="width:100%"></audio>` :
        /\.(pdf)/i.test(url) ? `<iframe src="${url}" style="width:100%;height:400px;border:none;border-radius:6px"></iframe>` :
        /\.(jpg|jpeg|png|gif)/i.test(url) ? `<img src="${url}" style="max-width:100%;max-height:400px;border-radius:6px">` :
        `<p>无法预览此文件类型</p><p><a href="${url}" target="_blank" class="btn btn-outline btn-sm">下载文件</a></p>`}
    </div>`,
    confirmText: '关闭'
  });
};

// Trailer / Preview upload
window.handleTrailerUpload = async (input) => {
  const file = input.files[0];
  if (!file) return;
  if (!window._courseEditMedia) return;
  try {
    window.showToast('正在上传片花...', 'info');
    const result = await uploadFile(file);
    window._courseEditMedia.data.trailer = result.url;
    const linkInput = document.getElementById('media-trailer-link');
    if (linkInput) linkInput.value = result.url;
    // Show video preview
    let preview = document.querySelector('.media-trailer-preview');
    if (!preview) {
      const section = document.getElementById('media-trailer-link')?.closest('.media-single');
      if (section) { preview = document.createElement('div'); preview.className = 'media-trailer-preview mt-2'; section.appendChild(preview); }
    }
    if (preview) preview.innerHTML = `<video src="${result.url}" controls style="max-width:100%;max-height:200px;border-radius:6px"></video>`;
    window.showToast('片花上传成功', 'success');
  } catch(e) { window.showToast(e.message || '上传失败', 'error'); }
  input.value = '';
};

window.saveTrailerLink = () => {
  const linkInput = document.getElementById('media-trailer-link');
  if (!linkInput || !window._courseEditMedia) return;
  window._courseEditMedia.data.trailer = linkInput.value.trim();
  window.showToast('片花链接已保存', 'success');
};

window.handlePreviewUpload = async (input) => {
  const file = input.files[0];
  if (!file) return;
  if (!window._courseEditMedia) return;
  try {
    window.showToast('正在上传试看内容...', 'info');
    const result = await uploadFile(file);
    window._courseEditMedia.data.preview = result.url;
    const linkInput = document.getElementById('media-preview-link');
    if (linkInput) linkInput.value = result.url;
    let preview = document.querySelector('#course-tab-media .media-section:last-child .media-trailer-preview');
    if (!preview) {
      const section = document.getElementById('media-preview-link')?.closest('.media-single');
      if (section) { preview = document.createElement('div'); preview.className = 'media-trailer-preview mt-2'; section.appendChild(preview); }
    }
    if (preview) preview.innerHTML = `<video src="${result.url}" controls style="max-width:100%;max-height:200px;border-radius:6px"></video>`;
    window.showToast('试看内容上传成功', 'success');
  } catch(e) { window.showToast(e.message || '上传失败', 'error'); }
  input.value = '';
};

window.savePreviewLink = () => {
  const linkInput = document.getElementById('media-preview-link');
  if (!linkInput || !window._courseEditMedia) return;
  window._courseEditMedia.data.preview = linkInput.value.trim();
  window.showToast('试看链接已保存', 'success');
};

// Refresh a media list section
function refreshMediaList(listKey) {
  const container = document.getElementById('media-list-' + listKey);
  if (!container || !window._courseEditMedia) return;
  const items = window._courseEditMedia.data[listKey] || [];
  if (!items.length) {
    container.innerHTML = '<div class="media-empty">暂无内容，请上传或添加链接</div>';
    return;
  }
  container.innerHTML = items.map((item, idx) => {
    return `<div class="media-item" data-idx="${idx}">
      <div class="media-item-icon">${getFileIcon(item.type || item.url || '')}</div>
      <div class="media-item-info">
        <div class="media-item-name">${window.escapeHtml(item.name || '未命名')}</div>
        <div class="media-item-meta">${item.url ? '<span class="media-item-type">本地文件</span>' : '<span class="media-item-type">外部链接</span>'}${item.size ? ' · ' + formatFileSize(item.size) : ''}</div>
      </div>
      <div class="media-item-actions">
        ${item.url && isMediaFile(item.url) ? `<button class="btn btn-outline btn-xs" onclick="previewMediaFile('${item.url}')">预览</button>` : ''}
        ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-outline btn-xs">打开</a>` : ''}
        <button class="btn btn-outline btn-xs" style="color:var(--color-error)" onclick="removeMediaItem('${listKey}',${idx})">删除</button>
      </div>
    </div>`;
  }).join('');
}

// Collect and save all media data
async function collectAndSaveMedia(courseId) {
  if (!window._courseEditMedia) return;
  const { data } = window._courseEditMedia;
  // Sync trailer/preview link input values
  const trailerInput = document.getElementById('media-trailer-link');
  const previewInput = document.getElementById('media-preview-link');
  if (trailerInput && !data.trailer) data.trailer = trailerInput.value.trim();
  if (previewInput && !data.preview) data.preview = previewInput.value.trim();
  try {
    await api.updateCourseMedia(courseId, {
      audio: data.audio || [],
      video: data.video || [],
      materials: data.materials || [],
      trailer: data.trailer || '',
      preview: data.preview || ''
    });
  } catch(e) { console.error('Save media failed:', e); }
}

window.confirmDeleteCourse = (id, title) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定要删除课程 <strong>${window.escapeHtml(title)}</strong> 吗？</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try {
        await api.deleteCourse(id); window.showToast('课程已删除','success');
        const courses = await api.getCourses({}); renderCoursesTable(courses);
      } catch(e) { window.showToast('删除失败','error'); }
    }
  });
};

/* ===== 学习记录 ===== */
async function renderRecords(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>学习记录</h2></div><div id="records-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const records = await api.getLearningRecords({});
    const rows = records.map(r => `<tr>
      <td>${window.escapeHtml(r.user_name||'')}</td>
      <td>${window.escapeHtml(r.course_title||'')}</td>
      <td>${window.formatDate(r.started_at)}</td>
      <td>${window.formatDate(r.last_study_at)}</td>
      <td>${r.duration_minutes||0}分钟</td>
      <td>
        <div class="flex items-center gap-2">
          <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${r.progress}%"></div></div>
          <span class="text-sm">${r.progress}%</span>
        </div>
      </td>
      <td><span class="badge ${r.status==='completed'?'badge-success':'badge-info'}">${r.status==='completed'?'已完成':'学习中'}</span></td>
    </tr>`).join('');
    document.getElementById('records-table').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>学员</th><th>课程</th><th>开始时间</th><th>最后学习</th><th>学习时长</th><th>进度</th><th>状态</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="text-center text-muted">暂无记录</td></tr>'}</tbody></table></div>`;
  } catch(e) { document.getElementById('records-table').innerHTML = `<div class="empty-state"><h4>暂无记录</h4></div>`; }
}

/* ===== 订单管理 ===== */
async function renderOrders(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>订单管理</h2><button class="btn btn-outline btn-sm" onclick="window.showToast('导出功能开发中','info')">导出Excel</button></div><div id="orders-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const orders = await api.getOrders({});
    const rows = orders.map(o => `<tr>
      <td>#${o.id}</td>
      <td>${window.escapeHtml(o.user_name||'')}</td>
      <td>${window.escapeHtml(o.course_title||'')}</td>
      <td><strong>${window.formatMoney(o.amount)}</strong></td>
      <td><span class="badge ${o.status==='paid'?'badge-success':o.status==='unpaid'?'badge-warning':'badge-error'}">${o.status==='paid'?'已支付':o.status==='unpaid'?'未支付':'已退款'}</span></td>
      <td>${o.pay_method||'-'}</td>
      <td>${window.formatDate(o.created_at)}</td>
      <td>${o.status==='paid'?`<button class="btn btn-outline btn-sm" onclick="window.applyRefund(${o.id})">退款</button>`:'-'}</td>
    </tr>`).join('');
    document.getElementById('orders-table').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>订单号</th><th>学员</th><th>课程</th><th>金额</th><th>状态</th><th>支付方式</th><th>时间</th><th>操作</th></tr></thead><tbody>${rows||'<tr><td colspan="8" class="text-center text-muted">暂无订单</td></tr>'}</tbody></table></div>`;
  } catch(e) { document.getElementById('orders-table').innerHTML = `<div class="empty-state"><h4>暂无订单</h4></div>`; }
}

window.applyRefund = (id) => {
  window.showModal({
    title: '申请退款', width: '360px',
    content: `<p>确认对订单 <strong>#${id}</strong> 发起退款申请吗？</p><div class="form-group mt-3"><label class="form-label">退款原因</label><textarea class="form-textarea" id="refund-reason" rows="3" placeholder="请填写退款原因"></textarea></div>`,
    confirmText: '确认退款',
    onConfirm: () => { window.showToast('退款申请已提交，处理中...','success'); }
  });
};

/* ===== 发票管理 ===== */
function renderInvoices(content) {
  const invoices = [
    { no: 'FP20250001', title: '扬州职业大学', taxId: '12310000456123456X', amount: 299, status: '已开具', time: '2025-03-16' },
    { no: 'FP20250002', title: '信息工程学院', taxId: '12310000456123457Y', amount: 399, status: '已开具', time: '2025-04-11' },
    { no: 'FP20250003', title: '机电工程学院', taxId: '12310000456123458Z', amount: 259, status: '待开具', time: '2025-04-06' },
    { no: 'FP20250004', title: '建筑工程学院', taxId: '12310000456123459A', amount: 199, status: '已开具', time: '2025-04-16' },
  ];
  const rows = invoices.map(i => `<tr>
    <td>${i.no}</td><td>${i.title}</td><td>${i.taxId}</td>
    <td>${window.formatMoney(i.amount)}</td>
    <td><span class="badge ${i.status==='已开具'?'badge-success':'badge-warning'}">${i.status}</span></td>
    <td>${i.time}</td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showToast('下载发票','info')">下载</button>
      ${i.status==='待开具'?`<button class="btn btn-outline btn-sm ml-1" onclick="window.showToast('发票已开具','success')">开具</button>`:''}
    </td>
  </tr>`).join('');
  content.innerHTML = `<div class="admin-content-header"><h2>发票管理</h2><button class="btn btn-primary btn-sm" onclick="window.showUploadInvoiceModal()">+ 导入发票</button></div>
  <div class="table-container"><table class="table"><thead><tr><th>发票号</th><th>抬头</th><th>纳税人识别号</th><th>金额</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

window.showUploadInvoiceModal = () => {
  window.showModal({
    title: '导入发票信息', width: '440px',
    content: `<div class="form-group"><label class="form-label">发票号码</label><input class="form-input" id="inv-no" placeholder="请输入发票号码"></div>
    <div class="form-group"><label class="form-label">发票抬头</label><input class="form-input" id="inv-title"></div>
    <div class="form-group"><label class="form-label">纳税人识别号</label><input class="form-input" id="inv-taxid"></div>
    <div class="form-group"><label class="form-label">金额</label><input class="form-input" type="number" id="inv-amount"></div>
    <div class="form-group"><label class="form-label">电子票据代码</label><input class="form-input" id="inv-code" placeholder="电子票据代码"></div>
    <div class="form-group"><label class="form-label">校验码</label><input class="form-input" id="inv-check" placeholder="校验码"></div>`,
    confirmText: '保存',
    onConfirm: () => { window.showToast('发票信息已导入','success'); }
  });
};

/* ===== 课程结算 ===== */
function renderSettlement(content) {
  const settlements = [
    { course: 'Python程序设计', tasks: 8, hours: 64, teacher: '张教授', amount: 1280 },
    { course: '人工智能基础', tasks: 6, hours: 48, teacher: '王博', amount: 960 },
    { course: '大数据技术', tasks: 7, hours: 56, teacher: '刘教授', amount: 1120 },
    { course: '机械设计基础', tasks: 6, hours: 48, teacher: '赵工', amount: 960 },
    { course: '建筑力学', tasks: 7, hours: 56, teacher: '刘教授', amount: 1120 },
  ];
  const rows = settlements.map(s => `<tr>
    <td>${s.course}</td><td>${s.tasks}</td><td>${s.hours}</td><td>${s.teacher}</td>
    <td><strong>${window.formatMoney(s.amount)}</strong></td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showSettlementDetail('${s.course}','${s.teacher}',${s.amount})">账单明细</button>
    </td>
  </tr>`).join('');
  content.innerHTML = `<div class="admin-content-header"><h2>课程结算</h2><button class="btn btn-outline btn-sm" onclick="window.showToast('导出结算账单','info')">导出账单</button></div>
  <div class="table-container mt-4"><table class="table"><thead><tr><th>课程名称</th><th>总任务数</th><th>总学时</th><th>教师</th><th>结算金额</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

window.showSettlementDetail = (course, teacher, amount) => {
  window.showModal({
    title: `账单明细 - ${course}`, width: '480px',
    content: `<div class="settings-grid mb-4" style="grid-template-columns:repeat(2,1fr)">
      <div><span class="text-sm text-muted">课程：</span><strong>${window.escapeHtml(course)}</strong></div>
      <div><span class="text-sm text-muted">教师：</span><strong>${window.escapeHtml(teacher)}</strong></div>
      <div><span class="text-sm text-muted">结算金额：</span><strong style="color:var(--color-success)">${window.formatMoney(amount)}</strong></div>
      <div><span class="text-sm text-muted">分成比例：</span><strong>70%</strong></div>
    </div>
    <div class="table-container"><table class="table" style="font-size:0.8rem"><thead><tr><th>学员</th><th>缴费金额</th><th>教师分成</th><th>平台分成</th></tr></thead><tbody>
      <tr><td>李明</td><td>¥299</td><td>¥209</td><td>¥90</td></tr>
      <tr><td>王华</td><td>¥299</td><td>¥209</td><td>¥90</td></tr>
      <tr><td>陈强</td><td>¥299</td><td>¥209</td><td>¥90</td></tr>
    </tbody></table></div>`,
    confirmText: '关闭'
  });
};

/* ===== 组织机构 ===== */
async function renderOrganizations(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>组织机构管理</h2><button class="btn btn-primary btn-sm" onclick="window.showAddOrgModal()">+ 新增机构</button></div><div id="org-container"><div class="skeleton skeleton-card"></div></div>`;
  await loadOrgTree();
}

async function loadOrgTree() {
  try {
    const orgs = await api.getOrganizations();
    window._allOrgs = orgs;
    const tree = buildOrgTree(orgs);
    document.getElementById('org-container').innerHTML = `<div class="org-tree">${tree || '<div class="empty-state"><h4>暂无机构</h4></div>'}</div>`;
  } catch(e) { document.getElementById('org-container').innerHTML = `<p class="text-muted">加载失败</p>`; }
}

function buildOrgTree(orgs, parentId = 0) {
  const children = orgs.filter(o => o.parent_id === parentId);
  if (!children.length) return '';
  return `<div class="org-children">${children.map(o => `
    <div class="org-node">
      🏢 <strong>${window.escapeHtml(o.name)}</strong> <span class="badge badge-info ml-2">${o.level}级</span>
      <button class="drag-btn ml-2" onclick="window.showEditOrgModal(${o.id},'${window.escapeHtml(o.name)}',${o.parent_id},${o.level})">编辑</button>
      <button class="drag-btn" style="color:var(--color-error)" onclick="window.confirmDeleteOrg(${o.id},'${window.escapeHtml(o.name)}')">删除</button>
    </div>${buildOrgTree(orgs, o.id)}`).join('')}</div>`;
}

window.showAddOrgModal = () => {
  const parentOpts = (window._allOrgs||[]).map(o=>`<option value="${o.id}" data-level="${o.level}">${o.name}</option>`).join('');
  window.showModal({
    title: '新增机构', width: '400px',
    content: `<div class="form-group"><label class="form-label">机构名称 <span style="color:red">*</span></label><input class="form-input" id="org-name"></div>
    <div class="form-group"><label class="form-label">上级机构（留空为顶级）</label><select class="form-select" id="org-parent"><option value="0">（顶级机构）</option>${parentOpts}</select></div>
    <div class="form-group"><label class="form-label">层级</label><input class="form-input" type="number" id="org-level" value="2" min="1" max="5"></div>`,
    confirmText: '创建',
    onConfirm: async () => {
      const name = document.getElementById('org-name').value.trim();
      if (!name) { window.showToast('请输入机构名称','warning'); return; }
      try {
        await api.createOrganization({ name, parent_id: Number(document.getElementById('org-parent').value), level: Number(document.getElementById('org-level').value)||2 });
        window.showToast('机构创建成功','success'); await loadOrgTree();
      } catch(e) { window.showToast(e.message||'创建失败','error'); }
    }
  });
};

window.showEditOrgModal = (id, name, parentId, level) => {
  window.showModal({
    title: '编辑机构', width: '400px',
    content: `<div class="form-group"><label class="form-label">机构名称</label><input class="form-input" id="edit-org-name" value="${window.escapeHtml(name)}"></div>
    <div class="form-group"><label class="form-label">层级</label><input class="form-input" type="number" id="edit-org-level" value="${level}" min="1" max="5"></div>`,
    confirmText: '保存',
    onConfirm: async () => {
      try {
        await api.updateOrganization(id, { name: document.getElementById('edit-org-name').value, parent_id: parentId, level: Number(document.getElementById('edit-org-level').value) });
        window.showToast('机构已更新','success'); await loadOrgTree();
      } catch(e) { window.showToast(e.message||'更新失败','error'); }
    }
  });
};

window.confirmDeleteOrg = (id, name) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定删除机构 <strong>${window.escapeHtml(name)}</strong> 吗？</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try { await api.deleteOrganization(id); window.showToast('机构已删除','success'); await loadOrgTree(); } catch(e) { window.showToast('删除失败','error'); }
    }
  });
};

/* ===== 综合数据报表 ===== */
// Store chart instances for destroy/recreate
let reportCharts = [];

async function renderDataReportPage(content, startDate, endDate) {
  // Default: last 6 months
  if (!startDate && !endDate) {
    const now = new Date();
    const ago = new Date();
    ago.setMonth(ago.getMonth() - 5);
    ago.setDate(1);
    startDate = ago.toISOString().slice(0, 10);
    endDate = now.toISOString().slice(0, 10);
  }

  // Build quick filter buttons
  const quickFilters = buildQuickFilterButtons(startDate, endDate);

  content.innerHTML = `<div class="admin-content-header"><h2>综合数据报表</h2></div>` +
    `<div class="card mb-4"><div class="card-body">` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">` +
    `<span class="text-sm" style="font-weight:600;color:var(--color-text-secondary)">时间范围：</span>` +
    `<input type="date" id="rpt-start" class="form-input" style="width:auto;padding:6px 10px;font-size:0.85rem" value="${startDate}" onchange="window.onReportDateChange()">` +
    `<span style="color:var(--color-text-muted)">~</span>` +
    `<input type="date" id="rpt-end" class="form-input" style="width:auto;padding:6px 10px;font-size:0.85rem" value="${endDate}" onchange="window.onReportDateChange()">` +
    `<button class="btn btn-primary btn-sm" onclick="window.onReportDateChange()">查询</button>` +
    `<button class="btn btn-outline btn-sm" onclick="window.onReportQuickFilter('all')">全部</button>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">` + quickFilters + `</div>` +
    `</div></div>` +
    `<div id="report-body"><div class="skeleton skeleton-card" style="height:200px"></div></div>`;

  await loadReportData(startDate, endDate);
}

function buildQuickFilterButtons(startDate, endDate) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const filters = [
    { label: '本月', key: 'month', start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), end: today },
    { label: '近3月', key: 'quarter', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1); return d.toISOString().slice(0, 10); })(), end: today },
    { label: '近6月', key: 'half', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return d.toISOString().slice(0, 10); })(), end: today },
    { label: '近1年', key: 'year', start: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10), end: today },
  ];
  return filters.map(f => {
    const isActive = startDate === f.start && endDate === f.end;
    return '<button class="btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-outline') + '" onclick="window.onReportQuickFilter(\'' + f.key + '\')">' + f.label + '</button>';
  }).join('');
}

window.onReportQuickFilter = (key) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  let start, end = today;
  switch(key) {
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); break;
    case 'quarter': { const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1); start = d.toISOString().slice(0, 10); break; }
    case 'half': { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); start = d.toISOString().slice(0, 10); break; }
    case 'year': start = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10); break;
    case 'all': start = ''; end = ''; break;
    default: return;
  }
  const el = document.getElementById('rpt-start');
  const el2 = document.getElementById('rpt-end');
  if (el) el.value = start;
  if (el2) el2.value = end;
  loadReportData(start, end);
  // Update quick filter button styles
  document.querySelectorAll('.card-body .btn-sm').forEach(btn => {
    if (btn.textContent.includes(key === 'all' ? '全部' : key === 'month' ? '本月' : key === 'quarter' ? '近3月' : key === 'half' ? '近6月' : '近1年')) {
      btn.className = 'btn btn-sm btn-primary';
    } else if (!btn.textContent.includes('查询') && !btn.textContent.includes('全部')) {
      btn.className = 'btn btn-sm btn-outline';
    }
  });
};

window.onReportDateChange = () => {
  const start = document.getElementById('rpt-start')?.value || '';
  const end = document.getElementById('rpt-end')?.value || '';
  loadReportData(start, end);
};

async function loadReportData(startDate, endDate) {
  const body = document.getElementById('report-body');
  if (!body) return;

  // Destroy previous charts
  reportCharts.forEach(c => { try { c.destroy(); } catch(e) {} });
  reportCharts = [];

  try {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const report = await api.getDashboardReport(params);

    const hasFilter = report.hasFilter;
    const labels = report.monthLabels || ['1月','2月','3月','4月','5月','6月'];

    // Summary cards - show filtered or total based on filter status
    const studentsLabel = hasFilter ? '筛选期内新增学员' : '学员总数';
    const revenueLabel = hasFilter ? '筛选期内收入' : '总收入';
    const certsLabel = hasFilter ? '筛选期内证书' : '颁发证书';
    const hoursLabel = hasFilter ? '筛选期内学时(h)' : '学习总学时(h)';

    const sVal = hasFilter ? report.filteredStudents : report.totalStudents;
    const rVal = hasFilter ? report.filteredRevenue : report.totalRevenue;
    const cVal = hasFilter ? report.filteredCertificates : report.totalCertificates;
    const hVal = hasFilter ? report.filteredHours : Math.round(report.monthlyHours.reduce((a,b) => a + b, 0));

    body.innerHTML = `
      <div class="data-cards-grid">
        <div class="stat-card"><div class="stat-value">${sVal.toLocaleString()}</div><div class="stat-label">${studentsLabel}</div>${hasFilter ? '<div class="stat-change text-muted">总计 ' + report.totalStudents + ' 人</div>' : '<div class="stat-change text-success">本月 ' + report.newStudentsThisMonth + ' 人</div>'}</div>
        <div class="stat-card"><div class="stat-value">${window.formatMoney(rVal)}</div><div class="stat-label">${revenueLabel}</div>${hasFilter ? '<div class="stat-change text-muted">总计 ' + window.formatMoney(report.totalRevenue) + '</div>' : '<div class="stat-change text-success">持续增长</div>'}</div>
        <div class="stat-card"><div class="stat-value">${cVal}</div><div class="stat-label">${certsLabel}</div>${hasFilter ? '<div class="stat-change text-muted">总计 ' + report.totalCertificates + '</div>' : '<div class="stat-change text-success">正常运行</div>'}</div>
        <div class="stat-card"><div class="stat-value">${hVal.toLocaleString()}</div><div class="stat-label">${hoursLabel}</div>${hasFilter ? '<div class="stat-change text-muted">全部学时</div>' : '<div class="stat-change text-success">累计统计</div>'}</div>
      </div>
      <div class="charts-grid">
        <div class="chart-card"><h4>${hasFilter ? '新增学员趋势' : '月度新增学员趋势'}</h4><div class="chart-wrap"><canvas id="rpt-students"></canvas></div></div>
        <div class="chart-card"><h4>${hasFilter ? '证书趋势' : '月度生成证书趋势'}</h4><div class="chart-wrap"><canvas id="rpt-certs"></canvas></div></div>
        <div class="chart-card"><h4>${hasFilter ? '学时趋势' : '月度学习总学时趋势'}</h4><div class="chart-wrap"><canvas id="rpt-hours"></canvas></div></div>
        <div class="chart-card"><h4>${hasFilter ? '收入趋势' : '月度缴费金额趋势'}</h4><div class="chart-wrap"><canvas id="rpt-revenue"></canvas></div></div>
      </div>
      ${hasFilter ? '<div style="text-align:center;margin-top:8px"><span class="text-xs text-muted">筛选范围：' + (report.startDate || '不限') + ' ~ ' + (report.endDate || '不限') + '</span></div>' : ''}`;

    // Create charts
    setTimeout(() => {
      const cfg = (type, label, data, color) => ({
        type, data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: type === 'bar' ? color + '30' : color + '15', fill: type === 'line', tension: 0.4, pointRadius: 4, pointBackgroundColor: color }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: '#E5E0D8' } }, x: { grid: { display: false } } } }
      });
      try {
        reportCharts.push(new Chart(document.getElementById('rpt-students'), cfg('line', '新增学员', report.monthlyStudents, '#1E4D8C')));
        reportCharts.push(new Chart(document.getElementById('rpt-certs'), cfg('line', '生成证书', report.monthlyCertificates, '#C8842A')));
        reportCharts.push(new Chart(document.getElementById('rpt-hours'), cfg('bar', '学习总学时', report.monthlyHours, '#2D8C4E')));
        reportCharts.push(new Chart(document.getElementById('rpt-revenue'), cfg('bar', '缴费金额', report.monthlyRevenue, '#D4782A')));
      } catch(e) { console.log(e); }
    }, 200);
  } catch(e) {
    body.innerHTML = '<p class="text-muted">加载报表失败：' + (e.message || '未知错误') + '</p>';
  }
}

/* ===== 班级管理 ===== */
async function renderClasses(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>培训班级管理</h2><button class="btn btn-primary btn-sm" onclick="window.showClassEditModal()">+ 新建班级</button></div><div id="classes-table"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const classes = await api.getClasses();
    renderClassesTable(classes);
  } catch(e) {
    document.getElementById('classes-table').innerHTML = `<div class="empty-state"><h4>暂无班级数据</h4></div>`;
  }
}

function renderClassesTable(classes) {
  if (!classes || !classes.length) {
    document.getElementById('classes-table').innerHTML = `<div class="empty-state"><div class="empty-icon">🏫</div><h4>暂无班级，点击右上角新建</h4></div>`;
    return;
  }
  const rows = classes.map(c => {
    const courseCount = (c.courses || c.course_ids || []).length;
    const studentCount = (c.students || c.student_ids || []).length;
    const statusBadge = c.status === 'active' ? 'badge-success' : c.status === 'finished' ? 'badge-info' : 'badge-warning';
    const statusText = c.status === 'active' ? '进行中' : c.status === 'finished' ? '已结束' : '未开始';
    return '<tr>' +
      '<td><strong>' + window.escapeHtml(c.name) + '</strong>' +
      '<div class="text-xs text-muted mt-1">' + window.escapeHtml(c.description || '').slice(0, 60) + '</div></td>' +
      '<td>' + (c.start_date || '-') + ' ~ ' + (c.end_date || '-') + '</td>' +
      '<td><span class="badge badge-primary">' + courseCount + ' 门课程</span></td>' +
      '<td><span class="badge badge-info">' + studentCount + ' 名学员</span></td>' +
      '<td><span class="badge ' + statusBadge + '">' + statusText + '</span></td>' +
      '<td><div class="flex gap-1">' +
        '<button class="btn btn-outline btn-sm" onclick="window.showClassDetail(' + c.id + ')">详情</button>' +
        '<button class="btn btn-outline btn-sm" onclick="window.showClassEditModal(' + c.id + ')">编辑</button>' +
        '<button class="btn btn-outline btn-sm" style="color:var(--color-error)" onclick="window.confirmDeleteClass(' + c.id + ',\'' + window.escapeHtml(c.name) + '\')">删除</button>' +
      '</div></td></tr>';
  }).join('');
  document.getElementById('classes-table').innerHTML =
    '<div class="table-container"><table class="table"><thead><tr><th>班级名称</th><th>培训时间</th><th>课程数</th><th>学员数</th><th>状态</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

window.showClassDetail = async (id) => {
  try {
    const cls = await api.getClass(id);
    if (!cls) { window.showToast('班级不存在', 'warning'); return; }
    const courseRows = (cls.courses || []).map(c =>
      '<tr><td>' + window.escapeHtml(c.title || '未命名') + '</td><td>' + (c.teacher_name || '-') + '</td><td>' + (c.duration || 0) + '学时</td><td>' + (c.category_name || '-') + '</td></tr>'
    ).join('') || '<tr><td colspan="4" class="text-center text-muted">暂无课程</td></tr>';
    const studentRows = (cls.students || []).map(s =>
      '<tr><td>' + window.escapeHtml(s.realname || s.username || '') + '</td><td>' + (s.phone || '-') + '</td><td>' + (s.org_name || '-') + '</td></tr>'
    ).join('') || '<tr><td colspan="3" class="text-center text-muted">暂无学员</td></tr>';
    window.showModal({
      title: '班级详情 - ' + window.escapeHtml(cls.name),
      width: '680px',
      content: '<div class="settings-grid mb-4" style="grid-template-columns:repeat(2,1fr)">' +
        '<div><span class="text-sm text-muted">班级名称：</span><strong>' + window.escapeHtml(cls.name) + '</strong></div>' +
        '<div><span class="text-sm text-muted">状态：</span><span class="badge ' + (cls.status==='active'?'badge-success':'badge-info') + '">' + (cls.status==='active'?'进行中':cls.status==='finished'?'已结束':'未开始') + '</span></div>' +
        '<div><span class="text-sm text-muted">开始时间：</span>' + (cls.start_date || '-') + '</div>' +
        '<div><span class="text-sm text-muted">结束时间：</span>' + (cls.end_date || '-') + '</div>' +
        '</div>' +
        (cls.description ? '<p class="text-sm text-secondary mb-4">' + window.escapeHtml(cls.description) + '</p>' : '') +
        '<h4 class="mb-2">班级课程（' + (cls.courses||[]).length + '门）</h4>' +
        '<div class="table-container mb-4"><table class="table" style="font-size:0.8rem"><thead><tr><th>课程名称</th><th>教师</th><th>学时</th><th>分类</th></tr></thead><tbody>' + courseRows + '</tbody></table></div>' +
        '<h4 class="mb-2">班级学员（' + (cls.students||[]).length + '人）</h4>' +
        '<div class="table-container"><table class="table" style="font-size:0.8rem"><thead><tr><th>姓名</th><th>手机</th><th>机构</th></tr></thead><tbody>' + studentRows + '</tbody></table></div>',
      confirmText: '关闭'
    });
  } catch(e) { window.showToast('加载班级详情失败', 'error'); }
};

window.showClassEditModal = async (id) => {
  const isNew = !id;
  let cls = { name: '', description: '', start_date: '', end_date: '', status: 'active', course_ids: [], student_ids: [] };
  if (!isNew) {
    try { cls = await api.getClass(id); } catch(e) {}
  }

  // Load all courses and students for multi-select
  let allCourses = [], allStudents = [];
  try { allCourses = await api.getCourses({}) || []; } catch(e) {}
  try { allStudents = await api.getUsers({ role: 'student' }) || []; } catch(e) {}

  const selectedCourseIds = new Set(cls.course_ids || []);
  const selectedStudentIds = new Set(cls.student_ids || []);

  const courseCheckboxes = allCourses.map(c => {
    const checked = selectedCourseIds.has(c.id) ? 'checked' : '';
    return '<label style="display:inline-flex;align-items:center;gap:4px;margin:0 12px 8px 0;cursor:pointer;font-size:0.85rem">' +
      '<input type="checkbox" class="class-course-cb" value="' + c.id + '" ' + checked + '> ' + window.escapeHtml(c.title) +
      '</label>';
  }).join('');

  const studentCheckboxes = allStudents.map(s => {
    const checked = selectedStudentIds.has(s.id) ? 'checked' : '';
    return '<label style="display:inline-flex;align-items:center;gap:4px;margin:0 12px 8px 0;cursor:pointer;font-size:0.85rem">' +
      '<input type="checkbox" class="class-student-cb" value="' + s.id + '" ' + checked + '> ' + window.escapeHtml(s.realname || s.username) +
      '</label>';
  }).join('');

  window.showModal({
    title: isNew ? '新建班级' : '编辑班级',
    width: '600px',
    content: '<div class="form-group"><label class="form-label">班级名称 <span style="color:red">*</span></label>' +
      '<input class="form-input" id="class-name" value="' + window.escapeHtml(cls.name || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">班级描述</label>' +
      '<textarea class="form-textarea" id="class-desc" rows="2">' + window.escapeHtml(cls.description || '') + '</textarea></div>' +
      '<div class="settings-grid">' +
      '<div class="form-group"><label class="form-label">开始日期</label><input class="form-input" type="date" id="class-start" value="' + (cls.start_date || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">结束日期</label><input class="form-input" type="date" id="class-end" value="' + (cls.end_date || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">班级状态</label><select class="form-select" id="class-status">' +
      '<option value="pending" ' + (cls.status==='pending'?'selected':'') + '>未开始</option>' +
      '<option value="active" ' + (cls.status==='active'?'selected':'') + '>进行中</option>' +
      '<option value="finished" ' + (cls.status==='finished'?'selected':'') + '>已结束</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">关联课程 <span class="text-xs text-muted">（勾选）</span></label>' +
      '<div style="max-height:140px;overflow-y:auto;padding:8px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg)">' +
      (courseCheckboxes || '<span class="text-muted">暂无课程</span>') +
      '</div></div>' +
      '<div class="form-group"><label class="form-label">关联学员 <span class="text-xs text-muted">（勾选）</span></label>' +
      '<div style="max-height:140px;overflow-y:auto;padding:8px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg)">' +
      (studentCheckboxes || '<span class="text-muted">暂无学员</span>') +
      '</div></div>',
    confirmText: '保存',
    onConfirm: async () => {
      const name = document.getElementById('class-name').value.trim();
      if (!name) { window.showToast('请输入班级名称', 'warning'); return; }
      const course_ids = Array.from(document.querySelectorAll('.class-course-cb:checked')).map(cb => Number(cb.value));
      const student_ids = Array.from(document.querySelectorAll('.class-student-cb:checked')).map(cb => Number(cb.value));
      const data = {
        name,
        description: document.getElementById('class-desc').value,
        start_date: document.getElementById('class-start').value,
        end_date: document.getElementById('class-end').value,
        status: document.getElementById('class-status').value,
        course_ids,
        student_ids,
      };
      try {
        if (isNew) { await api.createClass(data); } else { await api.updateClass(id, data); }
        window.showToast(isNew ? '班级创建成功' : '班级更新成功', 'success');
        const classes = await api.getClasses();
        renderClassesTable(classes);
      } catch(e) { window.showToast(e.message || '保存失败', 'error'); }
    }
  });
};

window.confirmDeleteClass = (id, name) => {
  window.showModal({
    title: '确认删除',
    width: '360px',
    content: '<p>确定要删除班级 <strong>' + window.escapeHtml(name) + '</strong> 吗？此操作不可恢复。</p>',
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try {
        await api.deleteClass(id);
        window.showToast('班级已删除', 'success');
        const classes = await api.getClasses();
        renderClassesTable(classes);
      } catch(e) { window.showToast(e.message || '删除失败', 'error'); }
    }
  });
};

/* showReadStats (used by notifications-config) */
window.showReadStats = async (id, title) => {
  try {
    const stats = await api.getNotificationReadStats(id);
    const rows = stats.reads.map(r => `<tr><td>${window.escapeHtml(r.realname)}</td><td><span class="badge badge-success">已阅</span></td><td>${r.read_at||'-'}</td></tr>`).join('');
    window.showModal({
      title: `查阅统计 - ${title}`, width: '500px',
      content: `<div class="alert alert-info">已阅 <strong>${stats.read_count}</strong> 人 / 未阅 <strong>${stats.total - stats.read_count}</strong> 人 / 总计 <strong>${stats.total}</strong> 人</div>
      <div class="table-container"><table class="table"><thead><tr><th>学员姓名</th><th>状态</th><th>阅读时间</th></tr></thead><tbody>${rows||'<tr><td colspan="3" class="text-center text-muted">暂无阅读记录</td></tr>'}</tbody></table></div>`,
      confirmText: '关闭'
    });
  } catch(e) { window.showToast('获取统计失败', 'error'); }
};
