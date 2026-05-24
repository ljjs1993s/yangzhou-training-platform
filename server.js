const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const store = require('./database/store');

store.loadData();

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// ===== Health Check (for cloud deployment) =====
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ===== Auth =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = store.findOne('users', u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  if (user.status !== 'active') return res.status(403).json({ error: '账号已被禁用' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

app.post('/api/register', (req, res) => {
  const { username, password, realname, phone, email } = req.body;
  if (store.findOne('users', u => u.username === username)) return res.status(400).json({ error: '用户名已存在' });
  const id = store.nextId('users');
  const user = { id, username, password, realname: realname || '', phone: phone || '', email: email || '', role: 'student', org_id: null, status: 'active', created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') };
  store.insertOne('users', user);
  const { password: _, ...safe } = user;
  res.json(safe);
});

// ===== Course Categories (CRUD) =====
app.post('/api/course-categories', (req, res) => {
  const { name, parent_id, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  const id = store.nextId('course_categories');
  const cat = { id, name, parent_id: parent_id || 0, sort_order: sort_order || 0 };
  store.insertOne('course_categories', cat);
  res.json(cat);
});
app.put('/api/course-categories/:id', (req, res) => {
  const { name, parent_id, sort_order } = req.body;
  store.updateOne('course_categories', c => c.id === Number(req.params.id), { name, parent_id, sort_order });
  res.json({ success: true });
});
app.delete('/api/course-categories/:id', (req, res) => {
  store.deleteMany('course_categories', c => c.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== Courses =====
app.get('/api/courses', (req, res) => {
  const { category_id, type, limit, q, include_draft } = req.query;
  let courses = store.findMany('courses', c => include_draft === '1' ? true : c.status === 'published');
  if (category_id) courses = courses.filter(c => c.category_id === Number(category_id));
  if (type) courses = courses.filter(c => c.type === type);
  if (q) courses = courses.filter(c => c.title.includes(q));
  courses = courses.map(c => {
    const cat = store.findOne('course_categories', cc => cc.id === c.category_id);
    const teacher = store.findOne('users', u => u.id === c.teacher_id);
    const courseType = store.findOne('course_types', t => t.id === c.course_type_id);
    return { ...c, category_name: cat ? cat.name : '', teacher_name: teacher ? teacher.realname : '', course_type_name: courseType ? courseType.name : (c.type === 'live' ? '直播课程' : c.type === 'offline' ? '面授课程' : '录播视频') };
  });
  courses.sort((a, b) => a.sort_order - b.sort_order || new Date(b.created_at) - new Date(a.created_at));
  if (limit) courses = courses.slice(0, Number(limit));
  res.json(courses);
});

app.get('/api/courses/:id', (req, res) => {
  const c = store.findOne('courses', c => c.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: '课程不存在' });
  const cat = store.findOne('course_categories', cc => cc.id === c.category_id);
  const teacher = store.findOne('users', u => u.id === c.teacher_id);
  const courseType = store.findOne('course_types', t => t.id === c.course_type_id);
  res.json({ ...c, category_name: cat ? cat.name : '', teacher_name: teacher ? teacher.realname : '', course_type_name: courseType ? courseType.name : '' });
});

app.post('/api/courses', (req, res) => {
  const { title, category_id, teacher_id, type, course_type_id, duration, price, description, status, sort_order, trailer, preview } = req.body;
  if (!title) return res.status(400).json({ error: '课程名称不能为空' });
  const id = store.nextId('courses');
  const course = { id, title, category_id: Number(category_id)||0, teacher_id: Number(teacher_id)||0, type: type||'video', course_type_id: Number(course_type_id)||1, duration: Number(duration)||0, price: Number(price)||0, cover: '', description: description||'', status: status||'published', sort_order: Number(sort_order)||id, audio: [], video: [], materials: [], trailer: trailer||'', preview: preview||'', created_at: new Date().toISOString().slice(0,19).replace('T',' ') };
  store.insertOne('courses', course);
  res.json(course);
});

app.put('/api/courses/:id', (req, res) => {
  const { title, category_id, teacher_id, type, course_type_id, duration, price, description, status, sort_order, trailer, preview } = req.body;
  const updates = { title, category_id: Number(category_id), teacher_id: Number(teacher_id), type, course_type_id: Number(course_type_id)||1, duration: Number(duration), price: Number(price), description, status, sort_order: Number(sort_order), trailer: trailer||'', preview: preview||'' };
  store.updateOne('courses', c => c.id === Number(req.params.id), updates);
  res.json({ success: true });
});

app.delete('/api/courses/:id', (req, res) => {
  const cid = Number(req.params.id);
  store.deleteMany('courses', c => c.id === cid);
  // Also delete associated chapters
  store.deleteMany('course_chapters', ch => ch.course_id === cid);
  res.json({ success: true });
});

// ===== Course Types =====
app.get('/api/course-types', (req, res) => {
  const types = store.findMany('course_types', () => true);
  types.sort((a, b) => a.sort_order - b.sort_order);
  res.json(types);
});
app.post('/api/course-types', (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '类型名称不能为空' });
  const id = store.nextId('course_types');
  const t = { id, name, sort_order: Number(sort_order) || id };
  store.insertOne('course_types', t);
  res.json(t);
});
app.put('/api/course-types/:id', (req, res) => {
  const { name, sort_order } = req.body;
  store.updateOne('course_types', t => t.id === Number(req.params.id), { name, sort_order: Number(sort_order) });
  res.json({ success: true });
});
app.delete('/api/course-types/:id', (req, res) => {
  store.deleteMany('course_types', t => t.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== Course Chapters (tree) =====
// Helper: build tree from flat list
function buildChapterTree(flat) {
  const map = {};
  flat.forEach(n => { map[n.id] = { ...n, children: [] }; });
  const roots = [];
  flat.forEach(n => {
    if (n.parent_id === 0) roots.push(map[n.id]);
    else if (map[n.parent_id]) map[n.parent_id].children.push(map[n.id]);
  });
  const sortChildren = (nodes) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(n => sortChildren(n.children));
  };
  sortChildren(roots);
  return roots;
}

app.get('/api/courses/:id/chapters', (req, res) => {
  const cid = Number(req.params.id);
  const flat = store.findMany('course_chapters', ch => ch.course_id === cid);
  res.json(buildChapterTree(flat));
});

app.post('/api/courses/:id/chapters', (req, res) => {
  const cid = Number(req.params.id);
  const { parent_id, name, sort_order, resource_type, resource_url, resource_name, duration_minutes, is_free_preview, extra } = req.body;
  if (!name) return res.status(400).json({ error: '章节名称不能为空' });
  const id = store.nextId('course_chapters');
  const ch = { id, course_id: cid, parent_id: Number(parent_id)||0, name, sort_order: Number(sort_order)||id, resource_type: resource_type||'folder', resource_url: resource_url||'', resource_name: resource_name||'', duration_minutes: Number(duration_minutes)||0, is_free_preview: !!is_free_preview, extra: extra||'', created_at: new Date().toISOString().slice(0,19).replace('T',' ') };
  store.insertOne('course_chapters', ch);
  res.json(ch);
});

app.put('/api/courses/:id/chapters/:cid', (req, res) => {
  const { parent_id, name, sort_order, resource_type, resource_url, resource_name, duration_minutes, is_free_preview, extra } = req.body;
  store.updateOne('course_chapters', ch => ch.id === Number(req.params.cid), { parent_id: Number(parent_id)||0, name, sort_order: Number(sort_order)||0, resource_type: resource_type||'folder', resource_url: resource_url||'', resource_name: resource_name||'', duration_minutes: Number(duration_minutes)||0, is_free_preview: !!is_free_preview, extra: extra||'' });
  res.json({ success: true });
});

app.delete('/api/courses/:id/chapters/:cid', (req, res) => {
  const chId = Number(req.params.cid);
  // Recursively collect all descendant ids
  function collectIds(id) {
    const ids = [id];
    store.findMany('course_chapters', ch => ch.parent_id === id).forEach(ch => ids.push(...collectIds(ch.id)));
    return ids;
  }
  const toDelete = new Set(collectIds(chId));
  store.deleteMany('course_chapters', ch => toDelete.has(ch.id));
  res.json({ success: true });
});

// Batch save entire chapter tree (replaces all chapters for a course)
app.put('/api/courses/:id/chapters', (req, res) => {
  const cid = Number(req.params.id);
  const { chapters } = req.body; // flat array of chapters with temp ids
  if (!Array.isArray(chapters)) return res.status(400).json({ error: 'chapters must be array' });
  // Delete all existing chapters for this course
  store.deleteMany('course_chapters', ch => ch.course_id === cid);
  // Re-insert with new ids (preserve client-side id mapping for parent_id resolution)
  const idMap = {}; // oldId -> newId
  const toInsert = [];
  // Sort by sort_order to maintain hierarchy
  chapters.sort((a, b) => a.sort_order - b.sort_order);
  chapters.forEach(ch => {
    const newId = store.nextId('course_chapters');
    idMap[ch.id] = newId;
    toInsert.push({ ...ch, id: newId, course_id: cid });
  });
  // Fix parent_ids using id map
  toInsert.forEach(ch => {
    if (ch.parent_id && ch.parent_id !== 0 && idMap[ch.parent_id]) {
      ch.parent_id = idMap[ch.parent_id];
    }
  });
  toInsert.forEach(ch => store.insertOne('course_chapters', ch));
  const flat = store.findMany('course_chapters', ch => ch.course_id === cid);
  res.json({ success: true, chapters: buildChapterTree(flat) });
});

// ===== Notifications =====
app.get('/api/notifications', (req, res) => {
  const notifs = store.findMany('notifications', () => true);
  notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(notifs);
});

app.get('/api/notifications/:id', (req, res) => {
  res.json(store.findOne('notifications', n => n.id === Number(req.params.id)) || {});
});

app.post('/api/notifications', (req, res) => {
  const { title, content, type, publisher_id, attachments } = req.body;
  const id = store.nextId('notifications');
  store.insertOne('notifications', { id, title, content, type: type || 'notice', publisher_id: publisher_id || 1, status: 'published', attachments: attachments || [], created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
  res.json({ id });
});

app.put('/api/notifications/:id', (req, res) => {
  const { title, content, type, attachments } = req.body;
  store.updateOne('notifications', n => n.id === Number(req.params.id), { title, content, type, attachments });
  res.json({ success: true });
});

app.delete('/api/notifications/:id', (req, res) => {
  store.deleteMany('notifications', n => n.id === Number(req.params.id));
  res.json({ success: true });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const { user_id } = req.body;
  const nId = Number(req.params.id);
  const exist = store.findOne('notification_reads', r => r.notification_id === nId && r.user_id === user_id);
  if (!exist) {
    const id = store.nextId('notification_reads');
    store.insertOne('notification_reads', { id, notification_id: nId, user_id, read_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
  }
  res.json({ success: true });
});

app.get('/api/notifications/:id/read-stats', (req, res) => {
  const nId = Number(req.params.id);
  const reads = store.findMany('notification_reads', r => r.notification_id === nId)
    .map(r => {
      const u = store.findOne('users', u => u.id === r.user_id);
      return { realname: u ? u.realname : '未知', username: u ? u.username : '', read_at: r.read_at };
    });
  const students = store.findMany('users', u => u.role === 'student');
  res.json({ reads, total: students.length, read_count: reads.length });
});

// ===== Users =====
app.get('/api/users', (req, res) => {
  const { role, q } = req.query;
  let users = store.findMany('users', () => true);
  if (role) users = users.filter(u => u.role === role);
  if (q) users = users.filter(u => (u.realname || '').includes(q) || (u.username || '').includes(q) || (u.phone || '').includes(q));
  users = users.map(u => {
    const org = store.findOne('organizations', o => o.id === u.org_id);
    return { ...u, org_name: org ? org.name : '' };
  });
  users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(users);
});

// Enhanced user search for recipient selection (must be before /api/users/:id)
app.get('/api/users/search', (req, res) => {
  const { q, role, org_id, status, limit } = req.query;
  let users = store.findMany('users', () => true);
  if (q) {
    const kw = q.toLowerCase();
    users = users.filter(u =>
      (u.username||'').toLowerCase().includes(kw) ||
      (u.realname||'').toLowerCase().includes(kw) ||
      (u.phone||'').includes(kw)
    );
  }
  if (role) users = users.filter(u => u.role === role);
  if (org_id) users = users.filter(u => u.org_id === Number(org_id));
  if (status) users = users.filter(u => u.status === status);
  users.sort((a, b) => a.id - b.id);
  if (limit) users = users.slice(0, Number(limit));
  res.json(users.map(u => ({ id: u.id, username: u.username, realname: u.realname, phone: u.phone, email: u.email, role: u.role, org_id: u.org_id, org_name: u.org_name, status: u.status })));
});

app.get('/api/users/:id', (req, res) => {
  const u = store.findOne('users', u => u.id === Number(req.params.id));
  if (!u) return res.json({});
  const org = store.findOne('organizations', o => o.id === u.org_id);
  res.json({ ...u, org_name: org ? org.name : '' });
});

app.put('/api/users/:id', (req, res) => {
  const { realname, phone, email, status, role } = req.body;
  store.updateOne('users', u => u.id === Number(req.params.id), { realname, phone, email, status, role });
  res.json({ success: true });
});

// ===== Orders =====
app.get('/api/orders', (req, res) => {
  const { status, user_id } = req.query;
  let orders = store.findMany('orders', () => true);
  if (status) orders = orders.filter(o => o.status === status);
  if (user_id) orders = orders.filter(o => o.user_id === Number(user_id));
  orders = orders.map(o => {
    const u = store.findOne('users', u => u.id === o.user_id);
    const c = store.findOne('courses', c => c.id === o.course_id);
    return { ...o, user_name: u ? u.realname : '', course_title: c ? c.title : '' };
  });
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const o = store.findOne('orders', o => o.id === Number(req.params.id));
  if (!o) return res.json({});
  const u = store.findOne('users', u => u.id === o.user_id);
  const c = store.findOne('courses', c => c.id === o.course_id);
  res.json({ ...o, user_name: u ? u.realname : '', course_title: c ? c.title : '' });
});

app.post('/api/orders', (req, res) => {
  const { user_id, course_id, amount, pay_method, registration_data } = req.body;
  const id = store.nextId('orders');
  const user = store.findOne('users', u => u.id === user_id);
  store.insertOne('orders', {
    id, user_id, course_id, amount: amount || 0, status: 'paid', pay_method: pay_method || 'wechat',
    registration_data: registration_data || null,
    user_name: user ? user.realname : '',
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
  });
  res.json({ id });
});

// ===== Class Enrollment =====
app.post('/api/class-enroll', (req, res) => {
  const { user_id, class_id, amount, pay_method, registration_data } = req.body;
  if (!user_id || !class_id) return res.status(400).json({ error: '缺少user_id或class_id' });
  const cls = store.findOne('classes', c => c.id === Number(class_id));
  if (!cls) return res.status(404).json({ error: '班级不存在' });
  const user = store.findOne('users', u => u.id === user_id);

  // Add student to class if not already
  if (!cls.student_ids) cls.student_ids = [];
  if (!cls.student_ids.includes(Number(user_id))) {
    cls.student_ids.push(Number(user_id));
    store.saveData();
  }

  // Create orders for each course in the class
  const orderIds = [];
  const courses = cls.course_ids || [];
  courses.forEach(cid => {
    const course = store.findOne('courses', c => c.id === cid);
    const id = store.nextId('orders');
    store.insertOne('orders', {
      id, user_id, course_id: cid, class_id: Number(class_id),
      amount: 0, // class fee handled separately or total amount
      status: 'paid', pay_method: pay_method || 'wechat',
      registration_data: registration_data || null,
      user_name: user ? user.realname : '',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    orderIds.push(id);
  });
  res.json({ success: true, order_ids: orderIds, student_added: true });
});

// ===== Certificates =====
app.get('/api/certificates', (req, res) => {
  const { status, user_id, cert_no } = req.query;
  let certs = store.findMany('certificates', () => true);
  if (status) certs = certs.filter(c => c.status === status);
  if (user_id) certs = certs.filter(c => c.user_id === Number(user_id));
  if (cert_no) certs = certs.filter(c => c.cert_no === cert_no);
  certs = certs.map(c => {
    const u = store.findOne('users', u => u.id === c.user_id);
    const cr = store.findOne('courses', cr => cr.id === c.course_id);
    return { ...c, user_name: u ? u.realname : '', course_title: cr ? cr.title : '' };
  });
  certs.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
  res.json(certs);
});

app.get('/api/certificates/:id', (req, res) => {
  const c = store.findOne('certificates', c => c.id === Number(req.params.id));
  if (!c) return res.json({});
  const u = store.findOne('users', u => u.id === c.user_id);
  const cr = store.findOne('courses', cr => cr.id === c.course_id);
  res.json({ ...c, user_name: u ? u.realname : '', course_title: cr ? cr.title : '' });
});

// ===== Dashboard =====
app.get('/api/dashboard/overview', (req, res) => {
  const students = store.findMany('users', u => u.role === 'student');
  const courses = store.findMany('courses', c => c.status === 'published');
  const paidOrders = store.findMany('orders', o => o.status === 'paid');
  const certs = store.findMany('certificates', () => true);
  res.json({
    totalStudents: students.length,
    totalCourses: courses.length,
    totalRevenue: paidOrders.reduce((s, o) => s + (o.amount || 0), 0),
    newStudentsThisMonth: Math.floor(students.length * 0.1),
    totalCertificates: certs.length
  });
});

app.get('/api/dashboard/trends', (req, res) => {
  res.json({
    monthlyStudents: [45, 52, 38, 65, 48],
    monthlyCertificates: [32, 28, 41, 35, 52],
    monthlyHours: [1820, 2100, 1650, 2450, 1980],
    monthlyRevenue: [28000, 32000, 25000, 38000, 31000]
  });
});

app.get('/api/dashboard/report', (req, res) => {
  const { start_date, end_date } = req.query;
  const students = store.findMany('users', u => u.role === 'student');
  const courses = store.findMany('courses', () => true);
  const paidOrders = store.findMany('orders', o => o.status === 'paid');
  const certs = store.findMany('certificates', () => true);
  const learningRecords = store.findMany('learning_records', () => true);

  // Filter by date range
  const inRange = (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (start_date && d < new Date(start_date)) return false;
    if (end_date) {
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      if (d > endDate) return false;
    }
    return true;
  };

  const filteredStudents = start_date || end_date ? students.filter(u => inRange(u.created_at)) : students;
  const filteredOrders = paidOrders.filter(o => inRange(o.created_at));
  const filteredCerts = certs.filter(c => inRange(c.issued_at || c.created_at));
  const filteredRecords = learningRecords.filter(r => inRange(r.last_study_at || r.started_at));

  // Determine month labels based on date range
  let startDate, endDate;
  if (start_date || end_date) {
    startDate = start_date ? new Date(start_date) : new Date(filteredStudents.length ? filteredStudents[0].created_at : '2025-01-01');
    endDate = end_date ? new Date(end_date) : new Date();
  } else {
    // Default: last 6 months
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
  }

  // Generate month buckets
  const monthBuckets = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= endCursor) {
    monthBuckets.push({
      key: cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0'),
      label: (cursor.getMonth() + 1) + '月',
      start: new Date(cursor),
      end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999)
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Aggregate data by month
  const inMonth = (dateStr, bucket) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= bucket.start && d <= bucket.end;
  };

  const monthlyStudents = monthBuckets.map(b =>
    students.filter(u => inMonth(u.created_at, b)).length
  );
  const monthlyCertificates = monthBuckets.map(b =>
    certs.filter(c => inMonth(c.issued_at || c.created_at, b)).length
  );
  const monthlyHours = monthBuckets.map(b =>
    Math.round(filteredRecords.filter(r => inMonth(r.last_study_at || r.started_at, b))
      .reduce((s, r) => s + (r.duration_minutes || 0), 0) / 60)
  );
  const monthlyRevenue = monthBuckets.map(b =>
    paidOrders.filter(o => inMonth(o.created_at, b)).reduce((s, o) => s + (o.amount || 0), 0)
  );

  // New students in range
  const newStudents = (start_date || end_date) ? filteredStudents.length : students.filter(u => {
    const d = new Date(u.created_at);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    return d >= monthAgo;
  }).length;

  res.json({
    totalStudents: students.length,
    totalCourses: courses.length,
    totalRevenue: paidOrders.reduce((s, o) => s + (o.amount || 0), 0),
    totalCertificates: certs.length,
    // Filtered stats
    filteredStudents: filteredStudents.length,
    filteredRevenue: filteredOrders.reduce((s, o) => s + (o.amount || 0), 0),
    filteredCertificates: filteredCerts.length,
    filteredHours: Math.round(filteredRecords.reduce((s, r) => s + (r.duration_minutes || 0), 0) / 60),
    newStudentsThisMonth: newStudents,
    // Time series
    monthlyStudents,
    monthlyCertificates,
    monthlyHours,
    monthlyRevenue,
    monthLabels: monthBuckets.map(b => b.label),
    hasFilter: !!(start_date || end_date),
    startDate: start_date || '',
    endDate: end_date || ''
  });
});

// ===== Other APIs =====
app.get('/api/teachers', (req, res) => {
  res.json(store.findMany('users', u => u.role === 'teacher'));
});

app.get('/api/organizations', (req, res) => {
  res.json(store.findMany('organizations', () => true));
});

app.get('/api/learning-records', (req, res) => {
  const { user_id, course_id } = req.query;
  let records = store.findMany('learning_records', () => true);
  if (user_id) records = records.filter(r => r.user_id === Number(user_id));
  if (course_id) records = records.filter(r => r.course_id === Number(course_id));
  records = records.map(r => {
    const u = store.findOne('users', u => u.id === r.user_id);
    const c = store.findOne('courses', c => c.id === r.course_id);
    return { ...r, user_name: u ? u.realname : '', course_title: c ? c.title : '' };
  });
  records.sort((a, b) => new Date(b.last_study_at) - new Date(a.last_study_at));
  res.json(records);
});

app.post('/api/learning-records', (req, res) => {
  const { user_id, course_id, progress, duration_minutes } = req.body;
  if (!user_id || !course_id) return res.status(400).json({ error: '缺少user_id或course_id' });
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const exist = store.findOne('learning_records', r => r.user_id === user_id && r.course_id === course_id);
  if (exist) {
    const updates = { last_study_at: now };
    if (progress !== undefined) updates.progress = Math.min(100, Math.max(0, Number(progress)));
    if (duration_minutes !== undefined) updates.duration_minutes = Number(duration_minutes);
    if (updates.progress >= 100) updates.status = 'completed';
    store.updateOne('learning_records', r => r.user_id === user_id && r.course_id === course_id, updates);
    const updated = store.findOne('learning_records', r => r.user_id === user_id && r.course_id === course_id);
    return res.json(updated);
  }
  const newRecord = {
    id: store.nextId('learning_records'),
    user_id, course_id,
    progress: Math.min(100, Math.max(0, Number(progress || 0))),
    duration_minutes: Number(duration_minutes || 0),
    status: 'learning',
    started_at: now,
    last_study_at: now
  };
  store.insertOne('learning_records', newRecord);
  res.json(newRecord);
});

app.get('/api/settings', (req, res) => {
  const settings = store.findMany('settings', () => true);
  const result = {};
  settings.forEach(s => { result[s.key] = s.value; });
  res.json(result);
});

app.post('/api/settings', (req, res) => {
  const settings = req.body;
  if (Array.isArray(settings)) {
    settings.forEach(item => {
      const exist = store.findOne('settings', s => s.key === item.key);
      if (exist) { store.updateOne('settings', s => s.key === item.key, { value: String(item.value) }); }
      else { store.insertOne('settings', { key: item.key, value: String(item.value) }); }
    });
  }
  res.json({ success: true });
});

app.get('/api/message-templates', (req, res) => {
  res.json(store.findMany('message_templates', () => true));
});

app.post('/api/message-templates', (req, res) => {
  const { name, type, title, content } = req.body;
  const id = store.nextId('message_templates');
  store.insertOne('message_templates', { id, name, type, title, content, status: 'active' });
  res.json({ id });
});

app.put('/api/message-templates/:id', (req, res) => {
  const { name, type, title, content, status } = req.body;
  store.updateOne('message_templates', t => t.id === Number(req.params.id), { name, type, title, content, status });
  res.json({ success: true });
});

app.get('/api/wx-menu', (req, res) => {
  res.json(store.findMany('wx_menu', () => true));
});

app.post('/api/wx-menu', (req, res) => {
  const menu = req.body;
  store.deleteMany('wx_menu', () => true);
  if (Array.isArray(menu)) {
    menu.forEach((item, i) => {
      const id = store.nextId('wx_menu');
      store.insertOne('wx_menu', { id, parent_id: item.parent_id || 0, name: item.name, type: item.type || 'view', url: item.url || '', sort_order: i });
    });
  }
  res.json({ success: true });
});

app.get('/api/registration-fields', (req, res) => {
  res.json(store.findMany('registration_fields', () => true));
});

app.post('/api/registration-fields', (req, res) => {
  const fields = req.body;
  store.deleteMany('registration_fields', () => true);
  if (Array.isArray(fields)) {
    fields.forEach((item, i) => {
      const id = store.nextId('registration_fields');
      store.insertOne('registration_fields', { id, field_name: item.field_name, display_name: item.display_name, field_type: item.field_type, is_visible: item.is_visible ? 1 : 0, is_required: item.is_required ? 1 : 0, sort_order: i, options: item.options ? JSON.stringify(item.options) : null, remark: item.remark || '' });
    });
  }
  res.json({ success: true });
});

app.get('/api/course-categories', (req, res) => {
  res.json(store.findMany('course_categories', () => true));
});

app.get('/api/ldap/config', (req, res) => {
  res.json({ server_url: 'ldap://ldap.yzpc.edu.cn:389', base_dn: 'dc=yzpc,dc=edu,dc=cn', admin_dn: 'cn=admin,dc=yzpc,dc=edu,dc=cn', sync_enabled: true });
});

app.post('/api/ldap/sync', (req, res) => {
  res.json({ success: true, synced: 156, message: '同步完成：新增12用户，更新144用户' });
});

// ===== Projects =====
app.get('/api/projects', (req, res) => {
  const projects = store.findMany('projects', () => true);
  projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const p = store.findOne('projects', p => p.id === Number(req.params.id));
  if (!p) return res.json({});
  res.json(p);
});

app.post('/api/projects', (req, res) => {
  const { name, start_date, end_date, fee, exam_type, description, status } = req.body;
  if (!name) return res.status(400).json({ error: '项目名称不能为空' });
  if (!store.data().projects) store.data().projects = [];
  const id = store.nextId('projects');
  const project = { id, name, start_date: start_date||'', end_date: end_date||'', fee: fee||0, exam_type: exam_type||'在线考试', description: description||'', status: status||'active', students: 0, created_at: new Date().toISOString().slice(0,19).replace('T',' ') };
  store.data().projects.push(project);
  store.saveData();
  res.json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const { name, start_date, end_date, fee, exam_type, description, status } = req.body;
  const p = store.findOne('projects', p => p.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: '项目不存在' });
  Object.assign(p, { name, start_date, end_date, fee, exam_type, description, status });
  store.saveData();
  res.json({ success: true });
});

app.delete('/api/projects/:id', (req, res) => {
  if (!store.data().projects) return res.json({ success: true });
  store.data().projects = store.data().projects.filter(p => p.id !== Number(req.params.id));
  store.saveData();
  res.json({ success: true });
});

// ===== Organizations =====
app.post('/api/organizations', (req, res) => {
  const { name, parent_id, level } = req.body;
  if (!name) return res.status(400).json({ error: '机构名称不能为空' });
  const id = store.nextId('organizations');
  const org = { id, name, parent_id: Number(parent_id)||0, level: Number(level)||1 };
  store.insertOne('organizations', org);
  res.json(org);
});

app.put('/api/organizations/:id', (req, res) => {
  const { name, parent_id, level } = req.body;
  store.updateOne('organizations', o => o.id === Number(req.params.id), { name, parent_id: Number(parent_id), level: Number(level) });
  res.json({ success: true });
});

app.delete('/api/organizations/:id', (req, res) => {
  store.deleteMany('organizations', o => o.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== FAQ/Content Items =====
app.get('/api/faq', (req, res) => {
  if (!store.data().faq) store.data().faq = [
    { id:1, question:'如何报名课程？', answer:'登录平台后，在课程列表中选择心仪课程，点击"报名"按钮即可完成报名。', sort_order:0 },
    { id:2, question:'学习完成后如何获取证书？', answer:'完成课程学习并通过考核后，系统将自动生成电子证书，可在"我的证书"中下载。', sort_order:1 },
    { id:3, question:'如何修改个人信息？', answer:'登录后进入"个人中心"，点击"编辑资料"即可修改姓名、手机号等个人信息。', sort_order:2 },
    { id:4, question:'平台支持哪些支付方式？', answer:'平台支持微信支付、支付宝、银联等在线支付方式，也支持线下转账缴费。', sort_order:3 },
    { id:5, question:'课程学习有时间限制吗？', answer:'课程学习期限以项目设置为准，具体请查看课程详情页面中的"学习有效期"说明。', sort_order:4 },
  ];
  res.json(store.data().faq.sort((a,b) => a.sort_order - b.sort_order));
});

app.post('/api/faq', (req, res) => {
  const { question, answer } = req.body;
  if (!store.data().faq) store.data().faq = [];
  const id = (store.data()._nextIds.faq || 0) + 1;
  store.data()._nextIds.faq = id;
  const item = { id, question, answer: answer||'', sort_order: store.data().faq.length };
  store.data().faq.push(item);
  store.saveData();
  res.json(item);
});

app.put('/api/faq/:id', (req, res) => {
  const { question, answer, sort_order } = req.body;
  const item = store.data().faq && store.data().faq.find(f => f.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '未找到' });
  Object.assign(item, { question, answer, sort_order });
  store.saveData();
  res.json({ success: true });
});

app.delete('/api/faq/:id', (req, res) => {
  if (store.data().faq) store.data().faq = store.data().faq.filter(f => f.id !== Number(req.params.id));
  store.saveData();
  res.json({ success: true });
});

// ===== Certificates (delete) =====
app.delete('/api/certificates/:id', (req, res) => {
  store.deleteMany('certificates', c => c.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== Users delete =====
app.delete('/api/users/:id', (req, res) => {
  store.deleteMany('users', u => u.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== Message templates delete =====
app.delete('/api/message-templates/:id', (req, res) => {
  store.deleteMany('message_templates', t => t.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== Contact settings =====
app.get('/api/contact', (req, res) => {
  const s = store.findMany('settings', () => true).reduce((r, s) => { r[s.key] = s.value; return r; }, {});
  res.json({ phone: s.contact_phone||'0514-87654321', email: s.contact_email||'jxjy@yzpc.edu.cn', address: s.contact_address||'扬州市邗江区文昌西路458号' });
});

app.post('/api/contact', (req, res) => {
  const { phone, email, address } = req.body;
  [['contact_phone', phone], ['contact_email', email], ['contact_address', address]].forEach(([k, v]) => {
    const exist = store.findOne('settings', s => s.key === k);
    if (exist) store.updateOne('settings', s => s.key === k, { value: v||'' });
    else store.insertOne('settings', { key: k, value: v||'' });
  });
  res.json({ success: true });
});

// ===== Multer config for file uploads =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp4|mp3|wav|avi|mov|mkv|flv|wmv|pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|jpg|jpeg|png|gif|txt)$/i;
    if (allowed.test(path.extname(file.originalname))) return cb(null, true);
    cb(new Error('不支持的文件类型'));
  }
});

// ===== File Upload =====
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  res.json({
    url: '/uploads/' + req.file.filename,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: '未上传文件' });
  const files = req.files.map(f => ({
    url: '/uploads/' + f.filename,
    filename: f.originalname,
    size: f.size,
    mimetype: f.mimetype
  }));
  res.json({ files });
});

// ===== Course Media =====
app.get('/api/courses/:id/media', (req, res) => {
  const c = store.findOne('courses', c => c.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: '课程不存在' });
  res.json({
    audio: c.audio || [],
    video: c.video || [],
    materials: c.materials || [],
    trailer: c.trailer || '',
    preview: c.preview || ''
  });
});

app.put('/api/courses/:id/media', (req, res) => {
  const c = store.findOne('courses', c => c.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: '课程不存在' });
  const { audio, video, materials, trailer, preview } = req.body;
  store.updateOne('courses', c => c.id === Number(req.params.id), {
    audio: audio || [],
    video: video || [],
    materials: materials || [],
    trailer: trailer || '',
    preview: preview || ''
  });
  res.json({ success: true });
});

// ===== Classes =====
app.get('/api/classes', (req, res) => {
  let classes = store.findMany('classes', () => true);
  classes = classes.map(cls => {
    const courseList = (cls.course_ids || []).map(cid => store.findOne('courses', c => c.id === cid)).filter(Boolean);
    const studentList = (cls.student_ids || []).map(sid => store.findOne('users', u => u.id === sid)).filter(Boolean);
    return { ...cls, courses: courseList, students: studentList.map(s => ({ id: s.id, realname: s.realname, username: s.username })) };
  });
  classes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(classes);
});

app.get('/api/classes/:id', (req, res) => {
  const cls = store.findOne('classes', c => c.id === Number(req.params.id));
  if (!cls) return res.status(404).json({ error: '班级不存在' });
  const courseList = (cls.course_ids || []).map(cid => store.findOne('courses', c => c.id === cid)).filter(Boolean);
  const studentList = (cls.student_ids || []).map(sid => store.findOne('users', u => u.id === sid)).filter(Boolean);
  res.json({ ...cls, courses: courseList, students: studentList.map(s => ({ id: s.id, realname: s.realname, username: s.username })) });
});

app.post('/api/classes', (req, res) => {
  const { name, description, start_date, end_date, status, course_ids, student_ids } = req.body;
  if (!name) return res.status(400).json({ error: '班级名称不能为空' });
  const id = store.nextId('classes');
  const cls = { id, name, description: description||'', start_date: start_date||'', end_date: end_date||'', status: status||'active', course_ids: course_ids||[], student_ids: student_ids||[], created_at: new Date().toISOString().slice(0,19).replace('T',' ') };
  store.insertOne('classes', cls);
  res.json(cls);
});

app.put('/api/classes/:id', (req, res) => {
  const { name, description, start_date, end_date, status, course_ids, student_ids } = req.body;
  const cls = store.findOne('classes', c => c.id === Number(req.params.id));
  if (!cls) return res.status(404).json({ error: '班级不存在' });
  store.updateOne('classes', c => c.id === Number(req.params.id), { name, description, start_date, end_date, status, course_ids: course_ids||[], student_ids: student_ids||[] });
  res.json({ success: true });
});

app.delete('/api/classes/:id', (req, res) => {
  store.deleteMany('classes', c => c.id === Number(req.params.id));
  res.json({ success: true });
});

// ===== Delete uploaded file =====
app.delete('/api/upload', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '缺少文件路径' });
  const filePath = path.join(__dirname, url);
  if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.json({ success: true }); // File may not exist, that's ok
  }
});

// ===== Message Center =====
// Get message config
app.get('/api/message-config', (req, res) => {
  res.json(store.data().message_config || {});
});

// Save message config (full replace)
app.post('/api/message-config', (req, res) => {
  const data = store.data();
  data.message_config = req.body;
  store.saveData();
  res.json({ success: true });
});

// List message queues
app.get('/api/message-queues', (req, res) => {
  const { status, q } = req.query;
  let items = store.findMany('message_queues', () => true);
  if (status) items = items.filter(m => m.status === status);
  if (q) {
    const kw = q.toLowerCase();
    items = items.filter(m => (m.title||'').toLowerCase().includes(kw) || (m.content||'').toLowerCase().includes(kw));
  }
  items.sort((a, b) => (b.id || 0) - (a.id || 0));
  res.json(items);
});

// Get single message queue
app.get('/api/message-queues/:id', (req, res) => {
  const m = store.findOne('message_queues', m => m.id === Number(req.params.id));
  if (!m) return res.status(404).json({ error: '消息不存在' });
  // Enrich with user names
  if (m.send_results && m.send_results.length) {
    m.send_results = m.send_results.map(r => {
      const u = store.findOne('users', u => u.id === r.user_id);
      return { ...r, user_name: u ? u.realname : '未知用户', user_phone: u ? u.phone : '' };
    });
  }
  res.json(m);
});

// Create message queue
app.post('/api/message-queues', (req, res) => {
  const { title, content, template_id, push_methods, target_user_ids, strategy, strategy_rule, scheduled_at } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  if (!target_user_ids || !target_user_ids.length) return res.status(400).json({ error: '至少选择一个收件人' });
  if (!push_methods || !push_methods.length) return res.status(400).json({ error: '至少选择一种推送方式' });

  const id = store.nextId('message_queues');
  const msg = {
    id, title, content, template_id: template_id || null,
    push_methods: push_methods || [],
    target_type: 'manual',
    target_user_ids: target_user_ids || [],
    target_filter: null,
    status: scheduled_at ? 'pending' : 'sending',
    strategy: strategy || 'once',
    strategy_rule: strategy_rule || null,
    scheduled_at: scheduled_at || null,
    sent_at: null,
    total_count: (target_user_ids || []).length * (push_methods || []).length,
    sent_count: 0,
    failed_count: 0,
    read_count: 0,
    send_results: [],
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  // If immediate send, simulate sending
  if (!scheduled_at) {
    const results = [];
    let sent = 0, failed = 0;
    (target_user_ids || []).forEach(uid => {
      (push_methods || []).forEach(method => {
        const ok = Math.random() > 0.05; // 95% success rate simulation
        results.push({
          user_id: uid, method, status: ok ? 'sent' : 'failed',
          sent_at: ok ? msg.created_at : null,
          error: ok ? null : '模拟发送失败: 网络超时'
        });
        if (ok) sent++; else failed++;
      });
    });
    msg.send_results = results;
    msg.sent_count = sent;
    msg.failed_count = failed;
    msg.status = failed === 0 ? 'sent' : (sent > 0 ? 'partial' : 'failed');
    msg.sent_at = msg.created_at;
  }

  store.insertOne('message_queues', msg);
  res.json(msg);
});

// Execute send for a pending message
app.post('/api/message-queues/:id/send', (req, res) => {
  const msg = store.findOne('message_queues', m => m.id === Number(req.params.id));
  if (!msg) return res.status(404).json({ error: '消息不存在' });
  if (msg.status !== 'pending') return res.status(400).json({ error: '消息状态不允许发送' });

  const results = [];
  let sent = 0, failed = 0;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  (msg.target_user_ids || []).forEach(uid => {
    (msg.push_methods || []).forEach(method => {
      const ok = Math.random() > 0.05;
      results.push({
        user_id: uid, method, status: ok ? 'sent' : 'failed',
        sent_at: ok ? now : null,
        error: ok ? null : '模拟发送失败: 服务不可用'
      });
      if (ok) sent++; else failed++;
    });
  });
  store.updateOne('message_queues', m => m.id === Number(req.params.id), {
    send_results: results,
    sent_count: sent,
    failed_count: failed,
    status: failed === 0 ? 'sent' : (sent > 0 ? 'partial' : 'failed'),
    sent_at: now
  });
  res.json({ success: true, sent_count: sent, failed_count: failed });
});

// Update message queue (only pending messages)
app.put('/api/message-queues/:id', (req, res) => {
  const msg = store.findOne('message_queues', m => m.id === Number(req.params.id));
  if (!msg) return res.status(404).json({ error: '消息不存在' });
  if (msg.status !== 'pending') return res.status(400).json({ error: '仅可修改待发送的消息' });
  const { title, content, push_methods, target_user_ids, scheduled_at, strategy, strategy_rule } = req.body;
  store.updateOne('message_queues', m => m.id === Number(req.params.id), {
    title, content, push_methods, target_user_ids, scheduled_at, strategy, strategy_rule
  });
  res.json({ success: true });
});

// Delete / Cancel message queue
app.delete('/api/message-queues/:id', (req, res) => {
  store.deleteMany('message_queues', m => m.id === Number(req.params.id));
  res.json({ success: true });
});

// Get delivery detail for a message
app.get('/api/message-queues/:id/delivery', (req, res) => {
  const msg = store.findOne('message_queues', m => m.id === Number(req.params.id));
  if (!msg) return res.status(404).json({ error: '消息不存在' });
  const results = (msg.send_results || []).map(r => {
    const u = store.findOne('users', u => u.id === r.user_id);
    return { ...r, user_name: u ? u.realname : '未知用户', user_phone: u ? u.phone : '', user_role: u ? u.role : '' };
  });
  res.json({
    id: msg.id, title: msg.title, status: msg.status,
    total_count: msg.total_count, sent_count: msg.sent_count, failed_count: msg.failed_count, read_count: msg.read_count,
    push_methods: msg.push_methods, scheduled_at: msg.scheduled_at, sent_at: msg.sent_at,
    results
  });
});

// SPA catch-all
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ===== Start =====
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(' 扬州职业培训平台已启动');
  console.log(' 地址: http://localhost:' + PORT);
  console.log(' 测试账号: admin/admin123');
  console.log('           teacher/teacher123');
  console.log('           student/student123');
  console.log('=================================\n');
});
