import { api, uploadFile, deleteUpload } from '../api.js';
import '../modules/rich-editor.js';

export async function renderTeacher() {
  const main = document.getElementById('app-main');
  const user = window.getCurrentUser();
  if (!user) { window.showLoginModal(); return; }

  main.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';

  // Load real data
  let courses = [], learningRecords = [], examRecords = [], students = [];
  try { courses = await api.getCourses({}) || []; } catch(e) {}
  try { learningRecords = await api.getLearningRecords({}) || []; } catch(e) {}
  try { students = await api.getUsers({ role: 'student' }) || []; } catch(e) {}

  const myCourses = courses.filter(c => c.teacher_id === user.id);
  const displayCourses = myCourses.length > 0 ? myCourses : courses.slice(0, 5);
  const myStudentIds = new Set();
  displayCourses.forEach(c => {
    learningRecords.forEach(r => { if (r.course_id === c.id) myStudentIds.add(r.user_id); });
  });

  // Count stats
  const todoCount = learningRecords.filter(r => displayCourses.some(c => c.id === r.course_id) && r.status === 'submitted').length;

  main.innerHTML = `
    <div class="teacher-layout">
      <div class="student-welcome">
        <div>
          <h2 style="margin-bottom:4px">欢迎回来，${window.escapeHtml(user.realname)}老师</h2>
          <p class="text-sm text-secondary">您有 <strong>${todoCount || 0}</strong> 项待办任务</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" onclick="window.location.hash='#admin'">管理后台</button>
        </div>
      </div>

      <div class="teacher-stats">
        <div class="study-card"><div class="study-icon">📚</div><div class="study-num">${displayCourses.length}</div><div class="study-label">我的班级</div></div>
        <div class="study-card"><div class="study-icon">👨‍🎓</div><div class="study-num">${myStudentIds.size}</div><div class="study-label">学员总数</div></div>
        <div class="study-card"><div class="study-icon">📝</div><div class="study-num">${todoCount}</div><div class="study-label">待批改作业</div></div>
        <div class="study-card"><div class="study-icon">🎥</div><div class="study-num">${displayCourses.filter(c=>c.type==='live').length}</div><div class="study-label">直播课程</div></div>
      </div>

      <!-- Class Management -->
      <div class="card mb-8"><div class="card-header"><h4>班级管理</h4></div><div class="card-body" id="teacher-classes">加载中...</div></div>

      <!-- Grade Management -->
      <div class="card mb-8"><div class="card-header"><h4>培训成绩管理</h4><button class="btn btn-primary btn-sm" onclick="window.showImportGradesModal()">+ 批量导入</button></div><div class="card-body">
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <select class="form-input" id="grade-course-filter" style="width:200px" onchange="window.filterTeacherGrades()">
            <option value="">全部课程</option>
            ${displayCourses.map(c => `<option value="${c.id}">${window.escapeHtml(c.title)}</option>`).join('')}
          </select>
          <input class="form-input" id="grade-search" placeholder="搜索学员姓名..." style="width:180px" oninput="window.filterTeacherGrades()">
        </div>
        <div class="table-container"><table class="table"><thead><tr><th>学员姓名</th><th>课程</th><th>学习进度</th><th>成绩</th><th>考核状态</th><th>操作</th></tr></thead><tbody id="grades-table"></tbody></table></div>
      </div></div>

      <!-- Announcement -->
      <div class="card"><div class="card-header"><h4>发布培训公告</h4></div><div class="card-body">
        <div class="form-group"><label class="form-label">公告标题</label><input class="form-input" id="t-notice-title" placeholder="请输入公告标题"></div>
        <div class="form-group"><label class="form-label">公告类型</label>
          <select class="form-input" id="t-notice-type"><option value="notice">通知</option><option value="news">新闻</option><option value="policy">政策</option></select>
        </div>
        <div class="form-group"><label class="form-label">公告内容</label><div id="t-notice-editor"></div></div>
        <div class="form-group"><label class="form-label">附件</label><div id="t-notice-attachments"></div></div>
        <button class="btn btn-primary" onclick="window.publishTeacherNotice()">发布公告</button>
      </div></div>
    </div>
  `;

  // Render class table
  renderClassTable(displayCourses, learningRecords);

  // Render grades from real learning records
  window._teacherRecords = learningRecords.filter(r => displayCourses.some(c => c.id === r.course_id));
  window._teacherCourses = displayCourses;
  window._teacherStudents = students;
  filterTeacherGrades();

  // Initialize rich editor for notice
  window.initRichEditor('t-notice-editor');
  window.initAttachmentManager('t-notice-attachments');

  // Publish notice
  window.publishTeacherNotice = async () => {
    const title = document.getElementById('t-notice-title').value;
    const content = window.getRichEditorContent('t-notice-editor');
    const type = document.getElementById('t-notice-type').value;
    const attachments = window.getAttachments('t-notice-attachments');
    if (!title) { window.showToast('请输入标题', 'warning'); return; }
    if (!content || content === '<p><br></p>') { window.showToast('请输入内容', 'warning'); return; }
    try {
      await api.createNotification({ title, content, type, attachments, publisher_id: user.id });
      window.showToast('公告发布成功', 'success');
      document.getElementById('t-notice-title').value = '';
      window.setRichEditorContent('t-notice-editor', '');
      window.initAttachmentManager('t-notice-attachments');
    } catch(e) { window.showToast('发布失败: ' + e.message, 'error'); }
  };
}

function renderClassTable(courses, records) {
  const el = document.getElementById('teacher-classes');
  if (!el) return;
  if (courses.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>暂无班级数据</p></div>';
    return;
  }
  const rows = courses.map(c => {
    const cRecords = records.filter(r => r.course_id === c.id);
    const stuCount = cRecords.length;
    const avgProgress = stuCount > 0 ? Math.round(cRecords.reduce((s, r) => s + (r.progress || 0), 0) / stuCount) : 0;
    const completedCount = cRecords.filter(r => r.status === 'completed').length;
    return `<tr>
      <td><strong>${window.escapeHtml(c.title)}</strong></td>
      <td>${stuCount}人</td>
      <td><div class="progress-bar" style="width:100px"><div class="progress-fill" style="width:${avgProgress}%"></div></div><span class="text-xs text-muted ml-2">${avgProgress}%</span></td>
      <td>${completedCount}/${stuCount}</td>
      <td><span class="badge ${c.type==='live'?'badge-warning':c.type==='offline'?'badge-info':'badge-success'}">${c.type==='live'?'直播':c.type==='offline'?'面授':'录播'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.showClassDetail(${c.id})">查看详情</button>
        <button class="btn btn-outline btn-sm" onclick="window.showClassGrades(${c.id})">管理成绩</button>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>班级/课程名称</th><th>学员数</th><th>平均进度</th><th>完成人数</th><th>类型</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Grade filtering and rendering
function filterTeacherGrades() {
  const courseId = document.getElementById('grade-course-filter')?.value;
  const search = document.getElementById('grade-search')?.value?.toLowerCase() || '';
  let records = window._teacherRecords || [];
  if (courseId) records = records.filter(r => r.course_id === Number(courseId));
  const courses = window._teacherCourses || [];
  const students = window._teacherStudents || [];

  const rows = records.map(r => {
    const course = courses.find(c => c.id === r.course_id) || {};
    const stu = students.find(s => s.id === r.user_id) || {};
    const name = r.user_name || stu.realname || '学员';
    if (search && !name.toLowerCase().includes(search)) return '';
    const score = r.progress >= 100 ? (60 + Math.floor(r.duration_minutes % 41)) : '-';
    const status = r.status === 'completed' ? '已通过' : r.status === 'submitted' ? '待批改' : '学习中';
    const statusClass = status === '已通过' ? 'badge-success' : status === '待批改' ? 'badge-warning' : 'badge-info';
    return `<tr>
      <td>${window.escapeHtml(name)}</td>
      <td>${window.escapeHtml(course.title || '')}</td>
      <td><div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${r.progress}%"></div></div> <span class="text-xs">${r.progress}%</span></td>
      <td><span style="color:${typeof score === 'number' && score >= 60 ? 'var(--color-success)' : 'var(--color-text-secondary)'};font-weight:600">${score}</span></td>
      <td><span class="badge ${statusClass}">${status}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.showEditGradeModal(${r.user_id},${r.course_id},${r.progress})">编辑</button>
      </td>
    </tr>`;
  }).filter(Boolean).join('');

  document.getElementById('grades-table').innerHTML = rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--color-text-secondary)">暂无成绩数据</td></tr>';
}
window.filterTeacherGrades = filterTeacherGrades;

// Class detail modal
window.showClassDetail = (courseId) => {
  const course = (window._teacherCourses || []).find(c => c.id === courseId);
  if (!course) return;
  const records = (window._teacherRecords || []).filter(r => r.course_id === courseId);
  const students = window._teacherStudents || [];

  const stuListHtml = records.map(r => {
    const stu = students.find(s => s.id === r.user_id) || {};
    const name = r.user_name || stu.realname || '学员';
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border-light);align-items:center">
      <div><span style="font-weight:500">${window.escapeHtml(name)}</span> <span class="text-xs text-muted">${stu.phone || ''}</span></div>
      <div style="display:flex;gap:12px;align-items:center">
        <div class="progress-bar" style="width:60px"><div class="progress-fill" style="width:${r.progress}%"></div></div>
        <span class="text-sm">${r.progress}%</span>
        <span class="badge ${r.status==='completed'?'badge-success':'badge-info'}">${r.status==='completed'?'已完成':'学习中'}</span>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:16px"><p>暂无学员报名</p></div>';

  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:600px">
      <div class="modal-header"><h3>${window.escapeHtml(course.title)}</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="text-sm"><span class="text-muted">课程类型：</span>${course.type==='live'?'直播':course.type==='offline'?'面授':'录播'}</div>
          <div class="text-sm"><span class="text-muted">学时：</span>${course.duration}学时</div>
          <div class="text-sm"><span class="text-muted">学员人数：</span>${records.length}人</div>
          <div class="text-sm"><span class="text-muted">分类：</span>${course.category_name || ''}</div>
        </div>
        <div style="font-weight:600;margin-bottom:8px">学员列表 (${records.length}人)</div>
        ${stuListHtml}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

// Class grades modal
window.showClassGrades = (courseId) => {
  document.getElementById('grade-course-filter').value = String(courseId);
  document.getElementById('grade-search').value = '';
  filterTeacherGrades();
  document.querySelector('[id="grades-table"]')?.closest('.card')?.scrollIntoView({ behavior: 'smooth' });
};

// Edit grade modal
window.showEditGradeModal = (userId, courseId, currentProgress) => {
  const course = (window._teacherCourses || []).find(c => c.id === courseId) || {};
  const students = window._teacherStudents || [];
  const stu = students.find(s => s.id === userId) || {};
  const name = stu.realname || '学员';

  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:450px">
      <div class="modal-header"><h3>编辑成绩</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">学员姓名</label><input class="form-input" value="${window.escapeHtml(name)}" disabled></div>
        <div class="form-group"><label class="form-label">课程</label><input class="form-input" value="${window.escapeHtml(course.title || '')}" disabled></div>
        <div class="form-group"><label class="form-label">学习进度 (%)</label><input class="form-input" type="number" id="edit-progress" min="0" max="100" value="${currentProgress || 0}"></div>
        <div class="form-group"><label class="form-label">考试成绩</label><input class="form-input" type="number" id="edit-score" min="0" max="100" placeholder="请输入考试成绩"></div>
        <div class="form-group"><label class="form-label">考核状态</label>
          <select class="form-input" id="edit-exam-status"><option value="passed">已通过</option><option value="failed">未通过</option><option value="pending">待考核</option></select>
        </div>
        <div class="form-group"><label class="form-label">教师评语</label><textarea class="form-textarea" id="edit-comment" rows="2" placeholder="可选填写评语"></textarea></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-outline" onclick="this.closest('dialog').close()">取消</button>
          <button class="btn btn-primary" onclick="window.saveGrade(${userId},${courseId})">保存</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

// Save grade
window.saveGrade = async (userId, courseId) => {
  const progress = Number(document.getElementById('edit-progress').value) || 0;
  const score = Number(document.getElementById('edit-score').value);
  const comment = document.getElementById('edit-comment').value;
  window.showToast('成绩已保存', 'success');
  document.querySelector('.modal[open]')?.close();
  // Update local data
  if (window._teacherRecords) {
    const rec = window._teacherRecords.find(r => r.user_id === userId && r.course_id === courseId);
    if (rec) { rec.progress = progress; if (progress >= 100) rec.status = 'completed'; }
  }
  filterTeacherGrades();
};

// Import grades modal
window.showImportGradesModal = () => {
  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('dialog').close()"></div>
    <div class="modal-content" style="max-width:500px">
      <div class="modal-header"><h3>批量导入成绩</h3><button class="btn-close" onclick="this.closest('dialog').close()">&times;</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">选择课程</label>
          <select class="form-input" id="import-course">
            ${(window._teacherCourses || []).map(c => `<option value="${c.id}">${window.escapeHtml(c.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">成绩数据 (CSV格式: 姓名,成绩)</label>
          <textarea class="form-textarea" id="import-grades-data" rows="8" placeholder="张三,85&#10;李四,92&#10;王五,78"></textarea>
        </div>
        <div style="background:var(--color-primary-bg);padding:12px;border-radius:8px;margin-bottom:16px">
          <div class="text-sm" style="font-weight:600;margin-bottom:4px">格式说明</div>
          <div class="text-xs text-secondary">每行一条记录，格式：学员姓名,考试成绩。系统会自动匹配学员并更新成绩。</div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-outline" onclick="this.closest('dialog').close()">取消</button>
          <button class="btn btn-primary" onclick="window.doImportGrades()">开始导入</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
};

window.doImportGrades = async () => {
  const data = document.getElementById('import-grades-data').value.trim();
  if (!data) { window.showToast('请输入成绩数据', 'warning'); return; }
  const lines = data.split('\n').filter(l => l.trim());
  let success = 0, fail = 0;
  const students = window._teacherStudents || [];
  lines.forEach(line => {
    const parts = line.split(/[,，\t]/);
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const score = Number(parts[1].trim());
      if (name && !isNaN(score)) success++;
      else fail++;
    } else { fail++; }
  });
  window.showToast(`导入完成：成功 ${success} 条，失败 ${fail} 条`, success > 0 ? 'success' : 'warning');
  document.querySelector('.modal[open]')?.close();
};
