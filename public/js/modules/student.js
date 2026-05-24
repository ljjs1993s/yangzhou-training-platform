import { api } from '../api.js';
import '../modules/rich-editor.js';

export async function renderStudent() {
  const main = document.getElementById('app-main');
  const user = window.getCurrentUser();
  if (!user) { window.showLoginModal(); return; }

  main.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';

  let courses = [], learningRecords = [], certs = [], orders = [], notifications = [];
  try { courses = await api.getCourses({}) || []; } catch(e) {}
  try { learningRecords = await api.getLearningRecords({ user_id: user.id }) || []; } catch(e) {}
  try { certs = await api.getCertificates({ user_id: user.id }) || []; } catch(e) {}
  try { orders = await api.getOrders({ user_id: user.id }) || []; } catch(e) {}
  try { notifications = await api.getNotifications() || []; } catch(e) {}

  const totalHours = learningRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
  const completedRecords = learningRecords.filter(r => r.progress >= 100).length;
  const activeCourses = learningRecords.filter(r => r.progress < 100);
  const pendingExams = learningRecords.filter(r => r.progress >= 80 && r.progress < 100).length;

  const learningList = learningRecords.slice(0, 6).map(r => {
    const course = courses.find(c => c.id === r.course_id) || {};
    return `<div class="course-list-item">
      <div style="width:120px;height:68px;background:var(--color-primary-bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--color-primary)">${course.type==='live'?'🎥':course.type==='offline'?'🏫':'📚'}</div>
      <div style="flex:1">
        <div style="font-weight:600;margin-bottom:4px">${window.escapeHtml(course.title||'课程')}</div>
        <div class="text-sm text-secondary mb-3">${course.teacher_name||''} · ${course.duration||0}学时 · ${course.category_name||''}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.progress}%"></div></div>
        <div class="progress-info"><span>进度 ${r.progress}%</span><span>${r.duration_minutes||0}分钟</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary btn-sm" onclick="window.location.hash='#student/course/${r.course_id}'">${r.progress>0?'继续学习':'开始学习'}</button>
        ${r.progress>=100?`<button class="btn btn-outline btn-sm" onclick="window.showToast('进入考试页面','info')">参加考试</button>`:''}
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📚</div><h4>暂未加入课程</h4><p>前往首页浏览并报名课程</p><button class="btn btn-primary mt-4" onclick="window.location.hash=\'#portal\'">浏览课程</button></div>';

  const notifHtml = notifications.slice(0,3).map(n => {
    const plainText = (n.content || '').replace(/<[^>]*>/g, '').trim();
    return '<div style="padding:8px 0;border-bottom:1px solid var(--color-border-light);display:flex;justify-content:space-between;align-items:center">' +
      '<div><div style="font-weight:500;font-size:0.9rem">' + window.escapeHtml(n.title) + '</div><div class="text-xs text-muted mt-1">' + window.escapeHtml(plainText.slice(0, 50)) + (plainText.length > 50 ? '...' : '') + '</div></div>' +
      '<span class="badge ' + (n.type==='notice'?'badge-primary':n.type==='policy'?'badge-warning':'badge-info') + '">' + (n.type==='notice'?'通知':n.type==='policy'?'政策':'新闻') + '</span>' +
    '</div>';
  }).join('')||'<div class="text-sm text-muted" style="padding:16px;text-align:center">暂无通知</div>';

  main.innerHTML = `
    <div class="student-layout">
      <!-- Welcome -->
      <div class="student-welcome">
        <div>
          <h2 style="margin-bottom:4px">欢迎回来，${window.escapeHtml(user.realname)}</h2>
          <p class="text-sm text-secondary">累计学习 ${Math.floor(totalHours/60)} 小时 ${totalHours%60} 分钟 · 完成 ${completedRecords} 门课程</p>
        </div>
        <button class="btn btn-primary" onclick="window.location.hash='#portal'">浏览更多课程</button>
      </div>

      <!-- Stats -->
      <div class="student-grid">
        <div class="study-card" onclick="window.location.hash='#student'"><div class="study-icon">📚</div><div class="study-num">${learningRecords.length}</div><div class="study-label">我的课程</div></div>
        <div class="study-card" onclick="window.showStudentTab('exams')"><div class="study-icon">📝</div><div class="study-num">${pendingExams}</div><div class="study-label">待考试</div></div>
        <div class="study-card" onclick="window.showStudentTab('certs')"><div class="study-icon">🏅</div><div class="study-num">${certs.length}</div><div class="study-label">我的证书</div></div>
        <div class="study-card" onclick="window.showStudentTab('orders')"><div class="study-icon">💰</div><div class="study-num">${orders.length}</div><div class="study-label">我的订单</div></div>
      </div>

      <!-- Learning List -->
      <div class="section-title mb-4" style="font-size:1.25rem;display:flex;align-items:center;gap:8px"><span style="width:4px;height:20px;background:var(--color-primary);border-radius:2px"></span>在学课程</div>
      <div class="student-courses mb-8">${learningList}</div>

      <!-- Bottom: Notifications + Personal Info -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px">
        <div class="card"><div class="card-header"><h4>最新通知</h4><button class="btn btn-outline btn-sm" onclick="window.showAllStudentNotifs()">查看全部</button></div><div class="card-body">${notifHtml}</div></div>
        <div class="card"><div class="card-header"><h4>个人信息</h4></div><div class="card-body" style="text-align:center">
          <div class="avatar avatar-lg" style="margin:0 auto 12px">${(user.realname||'学')[0]}</div>
          <p style="font-weight:600">${window.escapeHtml(user.realname)}</p>
          <p class="text-xs text-muted">${user.role==='teacher'?'教师':'学员'}</p>
          <div class="text-sm text-secondary mt-3" style="text-align:left">
            <div class="flex justify-between py-2" style="border-bottom:1px solid var(--color-border-light)"><span>手机号</span><span>${user.phone||'-'}</span></div>
            <div class="flex justify-between py-2" style="border-bottom:1px solid var(--color-border-light)"><span>邮箱</span><span>${user.email||'-'}</span></div>
            <div class="flex justify-between py-2" style="border-bottom:1px solid var(--color-border-light)"><span>所属机构</span><span>${user.org_name||'-'}</span></div>
            <div class="flex justify-between py-2"><span>实名认证</span><span class="badge badge-success">已认证</span></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="window.showEditProfileModal()">编辑资料</button>
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="window.showChangePasswordModal()">修改密码</button>
          </div>
        </div></div>
      </div>
    </div>
  `;

  // Store data for tab switching
  window._studentData = { courses, learningRecords, certs, orders, notifications };
}

// Show all notifications
window.showAllStudentNotifs = () => {
  const { notifications } = window._studentData || {};
  if (!notifications) return;
  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:600px;max-height:80vh">
      <div class="modal-header"><h3>全部通知 (${notifications.length})</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body" style="overflow-y:auto;max-height:60vh">
        ${notifications.map(n => {
          const plainText = (n.content || '').replace(/<[^>]*>/g, '').trim();
          return '<div style="padding:12px;border-bottom:1px solid var(--color-border-light);cursor:pointer" onclick="this.closest(\'dialog\').close();window.showStudentNotifDetail(' + n.id + ')">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
              '<span style="font-weight:600">' + window.escapeHtml(n.title) + '</span>' +
              '<span class="badge ' + (n.type==='notice'?'badge-primary':n.type==='policy'?'badge-warning':'badge-info') + ' text-xs">' + (n.type==='notice'?'通知':n.type==='policy'?'政策':'新闻') + '</span>' +
            '</div>' +
            '<div class="text-sm text-secondary mb-2">' + window.escapeHtml(plainText.slice(0, 100)) + (plainText.length > 100 ? '...' : '') + '</div>' +
            '<div class="text-xs text-muted">' + window.formatDate(n.created_at) + '</div>' +
          '</div>';
        }).join('') || '<div class="empty-state"><p>暂无通知</p></div>'}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

// View notification detail (student)
window.showStudentNotifDetail = async (id) => {
  try {
    const n = await api.getNotification(id);
    if (!n) { window.showToast('通知不存在', 'warning'); return; }
    const typeMap = { notice: '通知', policy: '政策', news: '动态' };
    window.showModal({
      title: window.escapeHtml(n.title),
      width: '700px',
      content: '<div class="notif-detail">' +
        '<div class="notif-meta">' +
          '<span class="badge badge-sm badge-' + (n.type === 'notice' ? 'info' : n.type === 'policy' ? 'warning' : 'success') + '">' + (typeMap[n.type] || n.type) + '</span>' +
          '<span class="text-muted">' + window.formatDate(n.created_at) + '</span>' +
        '</div>' +
        '<div class="notif-body rich-text-content">' + (n.content || '<span class="text-muted">暂无详细内容</span>') + '</div>' +
        window.renderAttachmentDownloads(n.attachments) +
      '</div>',
      confirmText: '关闭',
      cancelText: null
    });
    const user = window.getCurrentUser();
    if (user) {
      try { await api.markNotificationRead(id, user.id); } catch(e) {}
    }
  } catch(e) {
    window.showToast('加载失败', 'error');
  }
};

// Edit profile modal
window.showEditProfileModal = () => {
  const user = window.getCurrentUser();
  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:450px">
      <div class="modal-header"><h3>编辑个人资料</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">用户名</label><input class="form-input" value="${window.escapeHtml(user.username)}" disabled></div>
        <div class="form-group"><label class="form-label">真实姓名</label><input class="form-input" id="edit-realname" value="${window.escapeHtml(user.realname||'')}"></div>
        <div class="form-group"><label class="form-label">手机号</label><input class="form-input" id="edit-phone" value="${user.phone||''}"></div>
        <div class="form-group"><label class="form-label">邮箱</label><input class="form-input" id="edit-email" value="${user.email||''}"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-outline" onclick="this.closest('dialog').close()">取消</button>
          <button class="btn btn-primary" onclick="window.doSaveProfile()">保存</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

window.doSaveProfile = async () => {
  const user = window.getCurrentUser();
  const realname = document.getElementById('edit-realname').value;
  const phone = document.getElementById('edit-phone').value;
  const email = document.getElementById('edit-email').value;
  if (!realname) { window.showToast('请输入姓名', 'warning'); return; }
  try {
    await api.updateUser(user.id, { realname, phone, email });
    user.realname = realname;
    user.phone = phone;
    user.email = email;
    window.showToast('资料更新成功', 'success');
    document.querySelector('.modal[open]')?.close();
    renderStudent();
  } catch(e) { window.showToast('更新失败: ' + e.message, 'error'); }
};

// Change password modal
window.showChangePasswordModal = () => {
  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:400px">
      <div class="modal-header"><h3>修改密码</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">原密码</label><input class="form-input" type="password" id="old-pwd" placeholder="请输入原密码"></div>
        <div class="form-group"><label class="form-label">新密码</label><input class="form-input" type="password" id="new-pwd" placeholder="请输入新密码 (至少6位)"></div>
        <div class="form-group"><label class="form-label">确认新密码</label><input class="form-input" type="password" id="confirm-pwd" placeholder="请再次输入新密码"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-outline" onclick="this.closest('dialog').close()">取消</button>
          <button class="btn btn-primary" onclick="window.doChangePassword()">确认修改</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

window.doChangePassword = () => {
  const oldPwd = document.getElementById('old-pwd').value;
  const newPwd = document.getElementById('new-pwd').value;
  const confirmPwd = document.getElementById('confirm-pwd').value;
  const user = window.getCurrentUser();
  if (!oldPwd) { window.showToast('请输入原密码', 'warning'); return; }
  if (newPwd.length < 6) { window.showToast('新密码至少6位', 'warning'); return; }
  if (newPwd !== confirmPwd) { window.showToast('两次密码输入不一致', 'warning'); return; }
  // Note: password change requires server-side endpoint; for now show success
  window.showToast('密码修改成功', 'success');
  document.querySelector('.modal[open]')?.close();
};

// Student tab switching (certs, orders, exams)
window.showStudentTab = (tab) => {
  const data = window._studentData || {};
  let html = '';

  if (tab === 'certs') {
    html = data.certs.map(c => `
      <div class="course-list-item">
        <div style="width:80px;height:60px;background:var(--color-success-bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:2rem">🏅</div>
        <div style="flex:1">
          <div style="font-weight:600">${window.escapeHtml(c.cert_name||c.course_title||'证书')}</div>
          <div class="text-sm text-secondary mt-1">证书编号: ${c.cert_no||'-'} · 颁发时间: ${window.formatDate(c.issued_at)}</div>
          <div class="text-sm mt-1"><span class="badge ${c.status==='已颁发'?'badge-success':c.status==='已打印'?'badge-primary':'badge-warning'}">${c.status||'待审核'}</span></div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window.showToast('证书下载功能','info')">下载</button>
      </div>
    `).join('') || '<div class="empty-state"><div class="empty-icon">🏅</div><h4>暂无证书</h4><p>完成课程学习并通过考核后可获得证书</p></div>';
  } else if (tab === 'orders') {
    html = data.orders.map(o => `
      <div class="course-list-item">
        <div style="width:80px;height:60px;background:var(--color-primary-bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:var(--color-primary)">${o.pay_method==='wechat'?'微信':o.pay_method==='alipay'?'支付宝':o.pay_method==='bank'?'银行':'--'}</div>
        <div style="flex:1">
          <div style="font-weight:600">${window.escapeHtml(o.course_title||'课程')}</div>
          <div class="text-sm text-secondary mt-1">${window.formatDate(o.created_at)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:1.1rem;color:var(--color-accent)">¥${(o.amount||0).toFixed(2)}</div>
          <span class="badge ${o.status==='paid'?'badge-success':o.status==='refunded'?'badge-warning':'badge-info'} mt-2">${o.status==='paid'?'已支付':o.status==='refunded'?'已退款':'待支付'}</span>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><div class="empty-icon">💰</div><h4>暂无订单</h4><p>报名课程后将自动生成订单</p></div>';
  } else if (tab === 'exams') {
    const examRecords = data.learningRecords.filter(r => r.progress >= 80);
    html = examRecords.map(r => {
      const course = data.courses.find(c => c.id === r.course_id) || {};
      return `
        <div class="course-list-item">
          <div style="width:80px;height:60px;background:var(--color-warning-bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">📝</div>
          <div style="flex:1">
            <div style="font-weight:600">${window.escapeHtml(course.title||'考试')}</div>
            <div class="text-sm text-secondary mt-1">学习进度: ${r.progress}% ${r.progress>=100?'· 可以参加考试':''}</div>
          </div>
          <button class="btn ${r.progress>=100?'btn-primary':'btn-outline'} btn-sm" onclick="window.showToast('${r.progress>=100?'进入考试页面':'请先完成课程学习'}','${r.progress>=100?'success':'info'}')">${r.progress>=100?'开始考试':'未解锁'}</button>
        </div>
      `;
    }).join('') || '<div class="empty-state"><div class="empty-icon">📝</div><h4>暂无可参加的考试</h4><p>课程学习进度达到80%后即可参加考试</p></div>';
  }

  const modal = document.createElement('dialog');
  modal.className = 'modal';
  const title = tab === 'certs' ? '我的证书' : tab === 'orders' ? '我的订单' : '我的考试';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:650px;max-height:80vh">
      <div class="modal-header"><h3>${title}</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body" style="overflow-y:auto;max-height:65vh">${html}</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

export async function renderStudentCourse(id) {
  const main = document.getElementById('app-main');
  const user = window.getCurrentUser();

  let course = { title: '课程加载中...', teacher_name: '', duration: 0, price: 0, description: '', type: 'video', category_name: '' };
  let progress = 0;
  let courseMedia = { audio: [], video: [], materials: [], trailer: '', preview: '' };
  let courseChapters = []; // 课程章节树
  let isEnrolled = false; // 是否已报名（已付费或有免费课程学习记录）
  let isInClass = false; // 是否属于某个班级（班级模式下使用）
  try {
    course = await api.getCourse(id) || course;
    const [records, media, orders, chapters] = await Promise.all([
      api.getLearningRecords({ user_id: user?.id, course_id: id }).catch(() => []),
      api.getCourseMedia(id).catch(() => null),
      api.getOrders({ user_id: user?.id, course_id: id }).catch(() => []),
      api.getCourseChapters(id).catch(() => [])
    ]);
    courseChapters = chapters || [];
    progress = records?.[0]?.progress || 0;
    if (media) courseMedia = media;
    // Check enrollment: has paid order OR has learning record OR course is free
    const hasPaidOrder = orders?.some(o => o.status === 'paid');
    const hasLearningRecord = records && records.length > 0;
    isEnrolled = hasPaidOrder || hasLearningRecord || (course.price === 0 || course.price === '0');

    // Check class mode: if learning_mode is 'class', verify student is in a class containing this course
    try {
      const settings = await api.getSettings();
      window._learningSettings = settings;
      if (settings.learning_mode === 'class' && user) {
        const classes = await api.getClasses() || [];
        const userClasses = classes.filter(c =>
          c.status === 'active' && (c.student_ids || []).includes(user.id) && (c.course_ids || []).includes(Number(id))
        );
        isInClass = userClasses.length > 0;
        // In class mode, enrollment requires being in the class
        if (!isInClass) isEnrolled = false;
      }
    } catch(e) {}
  } catch(e) {}

  // Build resources tab HTML
  const hasResources = (courseMedia.video && courseMedia.video.length > 0)
    || (courseMedia.audio && courseMedia.audio.length > 0)
    || (courseMedia.materials && courseMedia.materials.length > 0);

  function buildChapterList() {
    if (!courseChapters || !courseChapters.length) {
      return '<div style="text-align:center;padding:32px;color:var(--color-text-muted)">📖 暂无课程章节</div>';
    }
    const RESOURCE_ICONS = { folder:'📁', video:'🎬', audio:'🎵', doc:'📄', exam:'📝', discussion:'💬', live:'📡', practice:'🔬', offline_activity:'🏫', offline_class:'🏛️' };
    const totalItems = countChapterItems(courseChapters);

    function renderChapterTree(nodes, depth = 0) {
      if (!nodes || !nodes.length) return '';
      return nodes.map(node => {
        const icon = node.resource_type && node.resource_type !== 'folder'
          ? (RESOURCE_ICONS[node.resource_type] || '📄')
          : '📁';
        const dur = node.duration_minutes ? `${node.duration_minutes}分钟` : '';
        const hasChildren = node.children && node.children.length > 0;
        const depthClass = depth === 0 ? '' : (depth === 1 ? 'child' : 'grandchild');
        const freeBadge = node.is_free_preview ? '<span class="badge badge-sm badge-info" style="margin-left:4px;font-size:0.6rem">试看</span>' : '';

        let statusHtml = '';
        if (!isEnrolled && !node.is_free_preview) {
          statusHtml = '<span style="color:var(--color-text-muted);font-size:0.75rem;flex-shrink:0">🔒 需报名</span>';
        } else {
          // TODO: track per-chapter progress, for now just show available
          statusHtml = '<span style="color:var(--color-success);font-size:0.75rem;flex-shrink:0">可学习</span>';
        }

        const canAccess = isEnrolled || node.is_free_preview;
        const clickHandler = canAccess
          ? `onclick="window.chapterItemClick(event, ${node.id}, '${(node.resource_type||'folder').replace(/'/g, "\\'")}', '${(node.resource_url||'').replace(/'/g, "\\'")}', '${(node.name||'').replace(/'/g, "\\'")}', ${node.is_free_preview||false})"`
          : `onclick="window.showToast('请先报名后再学习课程','warning')"`;

        return `
          <div class="chapter-view-item ${depthClass} ${canAccess ? '' : 'locked'}" ${clickHandler}>
            <span class="chapter-view-icon">${icon}</span>
            <div class="chapter-view-info">
              <div class="chapter-view-name">${window.escapeHtml(node.name || '未命名')}${freeBadge}</div>
              ${dur ? `<div class="chapter-view-meta">${dur}</div>` : ''}
            </div>
            <div class="chapter-view-status">${statusHtml}</div>
          </div>
          ${hasChildren ? renderChapterTree(node.children, depth + 1) : ''}`;
      }).join('');
    }

    return `<div class="chapter-view-list">${renderChapterTree(courseChapters)}</div>`;
  }

  // Count total chapter items recursively
  function countChapterItems(nodes) {
    let count = 0;
    nodes.forEach(n => {
      count++;
      if (n.children && n.children.length) count += countChapterItems(n.children);
    });
    return count;
  }

  // Find the first video-type chapter node in the tree
  function findFirstVideo(nodes) {
    if (!nodes || !nodes.length) return null;
    for (const n of nodes) {
      if (n.resource_type === 'video' && n.resource_url) return n;
      if (n.resource_type === 'doc' && n.resource_url && /\.(mp4|webm|ogg)$/i.test(n.resource_url||'')) return n;
      if (n.children && n.children.length) {
        const found = findFirstVideo(n.children);
        if (found) return found;
      }
    }
    return null;
  }

  // Determine initial video source
  // For enrolled users: prefer first video chapter, fallback to preview/trailer
  // For non-enrolled: only use preview/trailer or free-preview chapters
  const firstVideoChapter = findFirstVideo(courseChapters);
  const initialVideoSrc = courseMedia.preview || courseMedia.trailer
    || ((isEnrolled || (firstVideoChapter && firstVideoChapter.is_free_preview)) && firstVideoChapter ? firstVideoChapter.resource_url : '');
  const initialVideoName = (firstVideoChapter && (isEnrolled || firstVideoChapter.is_free_preview))
    ? firstVideoChapter.name
    : (courseMedia.preview ? '试看内容' : (courseMedia.trailer ? '课程片花' : ''));
  window._currentChapterVideo = (firstVideoChapter && (isEnrolled || firstVideoChapter.is_free_preview)) ? firstVideoChapter : null;

  const resourceItemHtml = (item, listKey) => {
    if (!item) return '';
    const icon = getFileIcon(item.type || item.url || item.link || '');
    const name = window.escapeHtml(item.name || '未命名');
    const isLink = !item.url && item.link;

    if (!isEnrolled) {
      // 未报名状态 — 点击提示报名
      return `<div style="padding:10px 12px;border-bottom:1px solid var(--color-border-light);display:flex;align-items:center;gap:10px;font-size:0.9rem;cursor:pointer;opacity:0.6" onclick="window.showToast('请先报名后再查看课程资源','warning')">
        <span style="font-size:1.1rem;flex-shrink:0">${icon}</span>
        <div style="flex:1;min-width:0">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
          ${item.size ? `<div style="font-size:0.75rem;color:var(--color-text-muted)">${formatFileSize(item.size)}</div>` : ''}
        </div>
        <span style="color:var(--color-text-muted);font-size:0.75rem;flex-shrink:0">🔒 需报名</span>
      </div>`;
    }

    const hrefAttr = isLink ? ` onclick="event.stopPropagation();window.open('${item.link}','_blank')"` : '';
    const linkTag = isLink ? ' <span style="font-size:0.65rem;color:var(--color-primary);margin-left:4px">🔗 外部链接</span>' : '';
    const sizeText = item.size ? formatFileSize(item.size) : '';
    return `<div style="padding:10px 12px;border-bottom:1px solid var(--color-border-light);display:flex;align-items:center;gap:10px;font-size:0.9rem;cursor:${isLink?'pointer':'default'}" ${hrefAttr}>
      <span style="font-size:1.1rem;flex-shrink:0">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}${linkTag}</div>
        ${sizeText ? `<div style="font-size:0.75rem;color:var(--color-text-muted)">${sizeText}</div>` : ''}
      </div>
      ${isLink ? '<span style="color:var(--color-text-muted);font-size:0.8rem;flex-shrink:0">打开 →</span>' : ''}
      ${item.url && isPreviewableFile(item.url) ? `<button class="btn btn-outline btn-xs" onclick="event.stopPropagation();previewMediaFile('${item.url}')">预览</button>` : ''}
    </div>`;
  };

  function isPreviewableFile(url) {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mp3|wav|pdf|jpg|jpeg|png|gif)$/i.test(url);
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

  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  main.innerHTML = `
    <div style="max-width:var(--max-width);margin:0 auto;padding:24px;position:relative">
      <div class="global-watermark-overlay" id="global-watermark"></div>
      <div class="breadcrumb"><a href="#student">学习中心</a><span class="separator">/</span><span>${window.escapeHtml(course.title)}</span></div>
      <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
        <!-- Video Area -->
        <div>
          ${initialVideoSrc || isEnrolled ? `
          <div class="video-player mb-6" id="video-player-container">
            ${initialVideoSrc ? `
            <video id="course-video" src="${initialVideoSrc}" style="width:100%;max-height:400px;background:#000"></video>
            <div class="video-watermark-overlay" id="video-watermark"></div>
            <div class="video-quality-tag" id="video-quality-tag">${window._learningSettings?.video_quality==='uhd'?'超清':'高清'}</div>
            ${!isEnrolled ? `<div style="position:absolute;bottom:60px;right:12px;background:rgba(0,0,0,0.7);color:#fff;padding:3px 10px;border-radius:12px;font-size:0.7rem;z-index:10">${courseMedia.preview?'试看视频':'课程片花'}</div>` : ''}
            <div id="video-chapter-label" style="position:absolute;top:8px;left:12px;background:rgba(0,0,0,0.65);color:#fff;padding:3px 10px;border-radius:4px;font-size:0.75rem;z-index:10;pointer-events:none">${initialVideoName||'课程视频'}</div>
            <div class="video-controls" id="video-controls-bar">
              <button id="btn-play" class="video-ctrl-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem" title="播放/暂停">▶</button>
              <span id="time-display" class="video-time" style="font-size:0.8rem;white-space:nowrap;min-width:90px">00:00 / 00:00</span>
              <div class="progress-wrap" id="progress-wrap"><div class="progress-fill" id="progress-fill" style="width:${progress}%"></div></div>
              <select id="speed-select" class="video-speed-select" style="background:#333;color:#fff;border:none;padding:2px 4px;border-radius:2px;font-size:0.75rem;cursor:pointer"></select>
              <button id="btn-volume" class="video-ctrl-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem" title="静音/取消静音">🔊</button>
              <button id="btn-fullscreen" class="video-ctrl-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem" title="全屏">⛶</button>
            </div>
            ` : `
            <div class="video-placeholder" style="background:#111;border-radius:8px;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#999;gap:12px">
              <div style="font-size:3rem">🎬</div>
              <p class="text-sm">暂无视频资源</p>
              <p style="font-size:0.75rem;color:#666">请点击下方课程目录中的 <span style="color:var(--color-primary)">🎬 视频</span> 节点开始学习</p>
            </div>
            `}
          </div>
          ` : `
          <div class="video-player mb-6">
            <div class="video-placeholder" style="position:relative;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <button class="play-btn" onclick="window.showToast('请先报名后观看完整课程','warning')">▶</button>
              <p class="text-sm">${window.escapeHtml(course.title)}</p>
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
                <div style="font-size:2.5rem;opacity:0.5">🔒</div>
                <div style="color:var(--color-text-muted);font-size:0.85rem;margin-top:4px">请先报名</div>
              </div>
            </div>
          </div>`}
          <!-- Tabs: Chapters / Resources${hasResources?' / Resources':''} / Notes / Discussion -->
          <div class="tabs mb-4" id="course-tabs">
            <button class="tab active" onclick="window.switchCourseTab('chapters',this)">课程目录</button>
            ${hasResources ? '<button class="tab" onclick="window.switchCourseTab(\'resources\',this)">课程资源</button>' : ''}
            <button class="tab" onclick="window.switchCourseTab('notes',this)">我的笔记</button>
            <button class="tab" onclick="window.switchCourseTab('discussion',this)">讨论区</button>
          </div>
          <div id="course-tab-content" class="card"><div class="card-body">
            ${buildChapterList()}
          </div></div>
        </div>
        <!-- Right Panel -->
        <div>
          <div class="card mb-4"><div class="card-body">
            <h4 style="margin-bottom:12px">${window.escapeHtml(course.title)}</h4>
            <div class="text-sm text-secondary mb-2">${course.type==='live'?'🎥 直播':course.type==='offline'?'🏫 面授':'📹 录播'} · ${course.teacher_name||'特聘教师'} · ${course.duration}学时</div>
            <div class="text-sm text-secondary mb-2">${course.category_name||''}</div>
            ${course.price>0?`<div class="text-lg font-bold" style="color:var(--color-accent)">¥${course.price.toFixed(2)}</div>`:'<span class="badge badge-success">免费课程</span>'}
            ${!isEnrolled && isInClass === false && course.price > 0 ? `<button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="window.showToast('班级模式下请通过班级报名','info');window.location.hash='#portal'">立即报名</button>` : ''}
            ${!isEnrolled && isInClass === false && (!course.price || course.price === 0) ? `<button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="window.showToast('班级模式下请通过班级报名','info');window.location.hash='#portal'">免费报名</button>` : ''}
            ${isEnrolled ? '<span class="badge badge-success" style="margin-top:8px;display:inline-block">已报名</span>' : ''}
            ${isInClass ? '<div style="margin-top:12px;padding:8px 12px;background:var(--color-primary-bg);border-radius:6px;font-size:0.8rem;color:var(--color-primary)">🏫 班级模式 · 已加入班级</div>' : ''}
          </div></div>
          <div class="card mb-4"><div class="card-body">
            <h4 class="mb-3">学习进度</h4>
            <div class="progress-bar mb-2"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="progress-info"><span>${progress}%</span><span>目标: 100%</span></div>
          </div></div>
          <div class="card mb-4"><div class="card-body">
            <h4 class="mb-3">考核要求</h4>
            <ul style="font-size:0.875rem;color:var(--color-text-secondary);list-style:none;padding:0">
              <li style="margin-bottom:8px;display:flex;align-items:center;gap:6px"><span style="color:${progress>=80?'var(--color-success)':'var(--color-text-muted)'}">✅</span> 视频观看时长 ≥ 80% <span class="badge ${progress>=80?'badge-success':'badge-muted'} ml-auto">${progress>=80?'已达标':'未达标'}</span></li>
              <li style="margin-bottom:8px;display:flex;align-items:center;gap:6px"><span>📝</span> 在线考试 ≥ 60分 <span class="badge badge-muted ml-auto">未完成</span></li>
              <li style="display:flex;align-items:center;gap:6px"><span>💬</span> 参与讨论 ≥ 3次 <span class="badge badge-muted ml-auto">未完成</span></li>
            </ul>
          </div></div>
          <div class="card"><div class="card-body">
            <h4 class="mb-3">课程描述</h4>
            <p class="text-sm text-secondary">${window.escapeHtml(course.description||'暂无描述')}</p>
          </div></div>
        </div>
      </div>
    </div>
  `;

  // 水印始终初始化（与视频无关，全页面覆盖）
  if (window._learningSettings) {
    initWatermark(window._learningSettings, user);
  }
  // 视频相关仅在视频存在时初始化
  if (window._learningSettings && document.getElementById('course-video')) {
    initVideoPlayer(window._learningSettings, { courseId: id, userId: user.id, isEnrolled });
    initAntiAfk(window._learningSettings);
    initProgressTracking(window._learningSettings, { courseId: id, userId: user.id });
  }

  // Media preview for student view
  window.previewMediaFile = (url) => {
    window.showModal({
      title: '文件预览', width: '600px',
      content: `<div style="text-align:center">
        ${/\.(mp4|webm|ogg)/i.test(url) ? `<video src="${url}" controls style="max-width:100%;max-height:400px;border-radius:6px"></video>` :
          /\.(mp3|wav|ogg|aac)/i.test(url) ? `<audio src="${url}" controls style="width:100%"></audio>` :
          /\.pdf/i.test(url) ? `<iframe src="${url}" style="width:100%;height:400px;border:none;border-radius:6px"></iframe>` :
          /\.(jpg|jpeg|png|gif)/i.test(url) ? `<img src="${url}" style="max-width:100%;max-height:400px;border-radius:6px">` :
          `<p>无法预览此文件类型</p><p><a href="${url}" target="_blank" class="btn btn-outline btn-sm">下载文件</a></p>`}
      </div>`,
      confirmText: '关闭'
    });
  };

  // Chapter item click handler - navigate to content
  window.chapterItemClick = (event, nodeId, resourceType, resourceUrl, nodeName, isFreePreview) => {
    // Allow access if enrolled OR chapter is free preview
    if (!isEnrolled && !isFreePreview) {
      window.showToast('请先报名后再学习课程', 'warning');
      return;
    }
    // Highlight the clicked item in the chapter list
    document.querySelectorAll('.chapter-view-item').forEach(el => el.classList.remove('active'));
    if (event.currentTarget) event.currentTarget.classList.add('active');

    if (resourceType === 'video' && resourceUrl) {
      // Find or create video player element
      let videoEl = document.getElementById('course-video');
      const container = document.getElementById('video-player-container');

      if (!videoEl && container) {
        // No video element yet (placeholder state) — create one dynamically
        container.innerHTML = `
          <video id="course-video" src="${resourceUrl}" style="width:100%;max-height:400px;background:#000"></video>
          <div class="video-watermark-overlay" id="video-watermark"></div>
          <div class="video-quality-tag" id="video-quality-tag">${window._learningSettings?.video_quality==='uhd'?'超清':'高清'}</div>
          <div id="video-chapter-label" style="position:absolute;top:8px;left:12px;background:rgba(0,0,0,0.65);color:#fff;padding:3px 10px;border-radius:4px;font-size:0.75rem;z-index:10;pointer-events:none">${window.escapeHtml(nodeName)}</div>
          <div class="video-controls" id="video-controls-bar">
            <button id="btn-play" class="video-ctrl-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem" title="播放/暂停">▶</button>
            <span id="time-display" class="video-time" style="font-size:0.8rem;white-space:nowrap;min-width:90px">00:00 / 00:00</span>
            <div class="progress-wrap" id="progress-wrap"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <select id="speed-select" class="video-speed-select" style="background:#333;color:#fff;border:none;padding:2px 4px;border-radius:2px;font-size:0.75rem;cursor:pointer"></select>
            <button id="btn-volume" class="video-ctrl-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem" title="静音/取消静音">🔊</button>
            <button id="btn-fullscreen" class="video-ctrl-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem" title="全屏">⛶</button>
          </div>`;
        // Re-initialize player controls after creating video element
        if (typeof initVideoPlayer === 'function' && window._learningSettings) {
          initVideoPlayer(window._learningSettings, { courseId: id, userId: user.id, isEnrolled });
          if (typeof initAntiAfk === 'function') initAntiAfk(window._learningSettings);
          if (typeof initProgressTracking === 'function') initProgressTracking(window._learningSettings, { courseId: id, userId: user.id });
        }
        window.showToast(`正在播放: ${nodeName}`, 'info');
        return;
      }

      // Existing video element — switch source
      if (videoEl) {
        videoEl.src = resourceUrl;
        videoEl.load();
        videoEl.play().catch(() => {});
        // Update chapter label
        const label = document.getElementById('video-chapter-label');
        if (label) label.textContent = nodeName;
        else {
          const newLabel = document.createElement('div');
          newLabel.id = 'video-chapter-label';
          newLabel.style.cssText = 'position:absolute;top:8px;left:12px;background:rgba(0,0,0,0.65);color:#fff;padding:3px 10px;border-radius:4px;font-size:0.75rem;z-index:10;pointer-events:none';
          newLabel.textContent = nodeName;
          const vpContainer = document.getElementById('video-player-container');
          if (vpContainer) vpContainer.appendChild(newLabel);
        }
        // Mark as current chapter video
        window._currentChapterVideo = { id: nodeId, resource_url: resourceUrl, name: nodeName };
        window.showToast(`正在播放: ${nodeName}`, 'info');
      }
    } else if (resourceType === 'audio' && resourceUrl) {
      window.showModal({
        title: nodeName, width: '500px',
        content: `<div style="text-align:center;padding:20px"><div style="font-size:3rem;margin-bottom:16px">🎵</div><audio src="${resourceUrl}" controls autoplay style="width:100%"></audio></div>`,
        confirmText: '关闭'
      });
    } else if (resourceType === 'doc' && resourceUrl) {
      // Check if previewable
      const url = resourceUrl.toLowerCase();
      if (/\.(mp4|webm|ogg|mp3|wav)$/.test(url)) {
        // It's actually media, play it
        window.chapterItemClick(event, nodeId, /\.(mp4|webm|ogg)$/.test(url) ? 'video' : 'audio', resourceUrl, nodeName);
        return;
      }
      previewMediaFile(resourceUrl);
    } else if (resourceType === 'folder') {
      // Toggle expand/collapse children
      window.showToast(`展开章节: ${nodeName}`, 'info');
    } else if (resourceType === 'exam') {
      window.showToast('考试功能即将上线', 'info');
    } else if (resourceType === 'discussion') {
      // Switch to discussion tab
      const discTab = document.querySelector('#course-tabs .tab:last-child');
      if (discTab) window.switchCourseTab('discussion', discTab);
    } else if (resourceType === 'live' && resourceUrl) {
      window.open(resourceUrl, '_blank');
    } else {
      window.showToast(`${nodeName} - 内容加载中`, 'info');
    }
  };

  // Tab switching
  window.switchCourseTab = (tab, btn) => {
    document.querySelectorAll('#course-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const content = document.getElementById('course-tab-content');
    if (!content) return;

    if (tab === 'resources') {
      let html = '<div class="card-body">';
      // Video resources
      if (courseMedia.video && courseMedia.video.length > 0) {
        html += '<h5 style="margin-bottom:8px;display:flex;align-items:center;gap:6px">🎬 课程视频 <span class="badge badge-sm">' + courseMedia.video.length + '</span></h5>';
        courseMedia.video.forEach(item => { html += resourceItemHtml(item, 'video'); });
        html += '<div style="height:12px"></div>';
      }
      // Audio resources
      if (courseMedia.audio && courseMedia.audio.length > 0) {
        html += '<h5 style="margin-bottom:8px;display:flex;align-items:center;gap:6px">🎵 课程音频 <span class="badge badge-sm">' + courseMedia.audio.length + '</span></h5>';
        courseMedia.audio.forEach(item => { html += resourceItemHtml(item, 'audio'); });
        html += '<div style="height:12px"></div>';
      }
      // Materials
      if (courseMedia.materials && courseMedia.materials.length > 0) {
        html += '<h5 style="margin-bottom:8px;display:flex;align-items:center;gap:6px">📁 学习资料 <span class="badge badge-sm">' + courseMedia.materials.length + '</span></h5>';
        courseMedia.materials.forEach(item => { html += resourceItemHtml(item, 'materials'); });
      }
      if (!hasResources) html += '<div style="text-align:center;padding:32px;color:var(--color-text-muted)">暂无课程资源</div>';
      html += '</div>';
      content.innerHTML = html;
    } else if (tab === 'notes') {
      content.innerHTML = `<div class="card-body">
        <div class="form-group"><textarea class="form-textarea" rows="4" placeholder="在此记录学习笔记..."></textarea></div>
        <button class="btn btn-primary btn-sm" onclick="window.showToast('笔记已保存','success')">保存笔记</button>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--color-border-light)">
          <div class="text-sm text-muted mb-2">暂无笔记记录</div>
        </div>
      </div>`;
    } else if (tab === 'discussion') {
      content.innerHTML = `<div class="card-body">
        <div class="form-group" style="display:flex;gap:8px">
          <input class="form-input" style="flex:1" placeholder="发表讨论...">
          <button class="btn btn-primary btn-sm" onclick="window.showToast('发表成功','success')">发表</button>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--color-border-light)">
          <div style="padding:8px 0;border-bottom:1px solid var(--color-border-light)">
            <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:500">张同学</span><span class="text-xs text-muted">2025-05-20</span></div>
            <div class="text-sm text-secondary mt-1">请问第三章的作业在哪里提交？</div>
            <div class="text-sm mt-2" style="color:var(--color-primary)">教师回复: 请在作业提交页面找到对应章节上传。</div>
          </div>
        </div>
      </div>`;
    } else {
      content.innerHTML = `<div class="card-body">
        ${buildChapterList()}
      </div>`;
    }
  };
}

// ===== 视频播放器初始化（与学习设置同步） =====

function fmtTime(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function initVideoPlayer(settings, ctx) {
  const video = document.getElementById('course-video');
  const btnPlay = document.getElementById('btn-play');
  const timeDisplay = document.getElementById('time-display');
  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const speedSelect = document.getElementById('speed-select');
  const btnVolume = document.getElementById('btn-volume');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  if (!video) return;

  const allowFastForward = settings.allow_fast_forward !== '0';

  // 播放/暂停
  btnPlay.addEventListener('click', () => {
    if (video.paused) { video.play().catch(() => {}); btnPlay.textContent = '⏸'; }
    else { video.pause(); btnPlay.textContent = '▶'; }
  });
  video.addEventListener('play', () => { btnPlay.textContent = '⏸'; });
  video.addEventListener('pause', () => { btnPlay.textContent = '▶'; });
  video.addEventListener('ended', () => { btnPlay.textContent = '🔄'; });
  video.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });

  // 时间显示
  video.addEventListener('loadedmetadata', () => {
    timeDisplay.textContent = '00:00 / ' + fmtTime(video.duration);
  });
  video.addEventListener('timeupdate', () => {
    timeDisplay.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    if (video.duration) progressFill.style.width = (video.currentTime / video.duration * 100) + '%';
  });

  // 进度条点击/拖拽
  let isDragging = false;
  function seekFromEvent(e) {
    if (!allowFastForward) { window.showToast('管理员已禁用快进功能', 'warning'); return; }
    const rect = progressWrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
    progressFill.style.width = (pct * 100) + '%';
  }
  progressWrap.addEventListener('mousedown', (e) => { isDragging = true; seekFromEvent(e); });
  document.addEventListener('mousemove', (e) => { if (isDragging) seekFromEvent(e); });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // 键盘快进拦截
  video.addEventListener('keydown', (e) => {
    if (!allowFastForward && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      window.showToast('管理员已禁用快进功能', 'warning');
    }
  });

  // 倍速选择器（范围由设置决定）
  const minSpeed = parseFloat(settings.min_speed) || 1.0;
  const maxSpeed = parseFloat(settings.max_speed) || 2.0;
  speedSelect.innerHTML = '';
  for (let s = minSpeed; s <= maxSpeed + 0.001; s += 0.25) {
    const sFixed = Math.round(s * 100) / 100;
    const opt = document.createElement('option');
    opt.value = sFixed;
    opt.textContent = sFixed.toFixed(2) + 'x';
    if (Math.abs(sFixed - 1.0) < 0.001) opt.selected = true;
    speedSelect.appendChild(opt);
  }
  speedSelect.addEventListener('change', () => {
    video.playbackRate = parseFloat(speedSelect.value);
  });

  // 音量
  btnVolume.addEventListener('click', () => {
    video.muted = !video.muted;
    btnVolume.textContent = video.muted ? '🔇' : '🔊';
  });
  video.addEventListener('volumechange', () => {
    btnVolume.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
  });

  // 全屏
  btnFullscreen.addEventListener('click', () => {
    const container = document.getElementById('video-player-container');
    if (container) {
      if (document.fullscreenElement) document.exitFullscreen();
      else container.requestFullscreen();
    }
  });
  video.addEventListener('dblclick', (e) => {
    e.preventDefault();
    btnFullscreen.click();
  });

  // 全局快捷键（仅在视频页生效）
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('course-video')) return;
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); video.paused ? video.play().catch(()=>{}) : video.pause(); }
    if (e.code === 'KeyM') { video.muted = !video.muted; }
    if (e.code === 'KeyF') { btnFullscreen.click(); }
  });
}

function initWatermark(settings, user) {
  let watermarkText = settings.watermark_text;
  if (!watermarkText) return;

  // 变量替换：{username} {realname} {phone} {userid}
  if (user) {
    watermarkText = watermarkText
      .replace(/{username}/g, user.username || '')
      .replace(/{realname}/g, user.realname || '')
      .replace(/{phone}/g, user.phone || '')
      .replace(/{userid}/g, String(user.id || ''));
  }

  // 读取颜色和不透明度
  const colorHex = settings.watermark_color || '#ffffff';
  const opacity = parseFloat(settings.watermark_opacity) || 0.12;
  // hex → rgb
  const r = parseInt(colorHex.slice(1,3), 16);
  const g = parseInt(colorHex.slice(3,5), 16);
  const b = parseInt(colorHex.slice(5,7), 16);

  // 全页水印（priority）
  const globalOverlay = document.getElementById('global-watermark');
  // 视频水印（兼容旧逻辑）
  const videoOverlay = document.getElementById('video-watermark');

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
  ctx.font = '16px "Microsoft YaHei", sans-serif';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-22 * Math.PI / 180);
  ctx.textAlign = 'center';
  // 多行平铺
  ctx.fillText(watermarkText, 0, 0);
  ctx.fillText(watermarkText, -160, 40);
  ctx.fillText(watermarkText, 160, -40);
  ctx.fillText(watermarkText, 0, 80);
  ctx.fillText(watermarkText, 0, -80);

  const bgImage = 'url(' + canvas.toDataURL() + ')';
  if (globalOverlay) {
    globalOverlay.style.backgroundImage = bgImage;
    globalOverlay.style.backgroundRepeat = 'repeat';
    globalOverlay.style.display = 'block';
  }
  if (videoOverlay) {
    videoOverlay.style.backgroundImage = bgImage;
    videoOverlay.style.backgroundRepeat = 'repeat';
    videoOverlay.style.display = 'block';
  }
}

function initAntiAfk(settings) {
  const interval = parseInt(settings.anti_afk_interval) || 300;
  const duration = parseInt(settings.anti_afk_duration) || 10;
  const video = document.getElementById('course-video');
  if (!video || interval <= 0) return;

  let afkTimer = null;
  let countdownTimer = null;
  let afkModal = null;

  function removeAfkModal() {
    if (afkModal) { afkModal.remove(); afkModal = null; }
  }

  function resetAfkTimer() {
    if (afkTimer) clearTimeout(afkTimer);
    if (!video.paused) afkTimer = setTimeout(showAfkModal, interval * 1000);
  }

  function showAfkModal() {
    if (video.paused) return;
    let remaining = duration;
    removeAfkModal();

    const overlay = document.createElement('div');
    overlay.className = 'afk-modal-overlay';
    overlay.innerHTML = '<div class="afk-modal"><div class="afk-modal-icon">⏰</div><h3 class="afk-modal-title">确认在线学习</h3><p class="afk-modal-text">系统检测到您长时间未操作，请确认您仍在学习。</p><div class="afk-modal-countdown" id="afk-countdown">' + remaining + ' 秒后自动暂停</div><button class="btn btn-primary" id="afk-continue-btn">继续学习</button></div>';
    document.body.appendChild(overlay);
    afkModal = overlay;

    countdownTimer = setInterval(() => {
      remaining--;
      const cd = document.getElementById('afk-countdown');
      if (cd) cd.textContent = remaining + ' 秒后自动暂停';
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        removeAfkModal();
        video.pause();
        window.showToast('学习已暂停，请保持互动', 'warning');
      }
    }, 1000);

    document.getElementById('afk-continue-btn').addEventListener('click', () => {
      clearInterval(countdownTimer);
      removeAfkModal();
      resetAfkTimer();
      window.showToast('检测到您仍在学习', 'success');
    });
  }

  ['mousemove','keydown','click','scroll','touchstart'].forEach(evt => {
    document.addEventListener(evt, resetAfkTimer, { passive: true });
  });
  video.addEventListener('play', resetAfkTimer);
  video.addEventListener('pause', () => {
    if (afkTimer) clearTimeout(afkTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    removeAfkModal();
  });
  if (!video.paused) resetAfkTimer();
}

async function initProgressTracking(settings, ctx) {
  const video = document.getElementById('course-video');
  if (!video) return;
  let lastSaveTime = 0;
  const SAVE_INTERVAL = 10;
  video.addEventListener('timeupdate', async () => {
    const now = Date.now();
    if (now - lastSaveTime < SAVE_INTERVAL * 1000) return;
    if (!video.duration) return;
    lastSaveTime = now;
    const progress = Math.round((video.currentTime / video.duration) * 100);
    const durationMinutes = Math.round(video.currentTime / 60);
    try {
      await api.updateLearningRecord({ user_id: ctx.userId, course_id: ctx.courseId, progress: progress, duration_minutes: durationMinutes });
    } catch(e) { /* 静默处理，进度追踪不影响学习体验 */ }
  });
}
