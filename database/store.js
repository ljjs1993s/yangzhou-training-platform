/**
 * Pure JSON-based data store — no native/WASM dependencies, zero crash risk.
 * All data lives in database/data.json, loaded at startup, written after each mutation.
 */
const fs = require('fs');
const path = require('path');
// 支持 DATA_DIR 环境变量用于云端持久卷挂载
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_PATH = path.join(DATA_DIR, 'data.json');

let data = null;

function loadData() {
  if (fs.existsSync(DATA_PATH)) {
    try { data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch(e) { data = createSeedData(); }
  } else {
    data = createSeedData();
  }
  // Migrate: ensure new tables exist for older data files
  if (!data.projects) {
    data.projects = [
      { id:1, name:'2025年度Python程序设计培训', start_date:'2025-03-01', end_date:'2025-06-30', fee:299, exam_type:'在线考试', description:'面向专业技术人员的Python编程继续教育课程', status:'active', students:86, created_at:'2025-03-01 08:00:00' },
      { id:2, name:'2025年度机电工程继续教育', start_date:'2025-04-01', end_date:'2025-08-31', fee:359, exam_type:'线上+线下', description:'机电工程专业继续教育年度培训项目', status:'active', students:52, created_at:'2025-04-01 08:00:00' },
      { id:3, name:'2025春季建筑类培训班', start_date:'2025-02-15', end_date:'2025-05-15', fee:329, exam_type:'在线考试', description:'建筑工程专业人员继续教育春季培训', status:'finished', students:38, created_at:'2025-02-15 08:00:00' },
      { id:4, name:'2025夏季公共基础课培训', start_date:'2025-06-01', end_date:'2025-08-31', fee:199, exam_type:'在线考试', description:'公共基础课程夏季专项培训', status:'pending', students:0, created_at:'2025-05-01 08:00:00' },
      { id:5, name:'2025年度安全生产培训', start_date:'2025-05-01', end_date:'2025-07-31', fee:0, exam_type:'线上直播', description:'年度安全生产专项培训，全员必修', status:'active', students:45, created_at:'2025-05-01 08:00:00' },
    ];
    if (!data._nextIds) data._nextIds = {};
    data._nextIds.projects = 6;
  }
  if (!data.faq) {
    data.faq = [
      { id:1, question:'如何报名课程？', answer:'登录平台后，在课程列表中选择心仪课程，点击"报名"按钮即可完成报名。', sort_order:0 },
      { id:2, question:'学习完成后如何获取证书？', answer:'完成课程学习并通过考核后，系统将自动生成电子证书，可在"我的证书"中下载。', sort_order:1 },
      { id:3, question:'如何修改个人信息？', answer:'登录后进入"个人中心"，点击"编辑资料"即可修改姓名、手机号等个人信息。', sort_order:2 },
      { id:4, question:'平台支持哪些支付方式？', answer:'平台支持微信支付、支付宝、银联等在线支付方式，也支持线下转账缴费。', sort_order:3 },
      { id:5, question:'课程学习有时间限制吗？', answer:'课程学习期限以项目设置为准，具体请查看课程详情页面中的"学习有效期"说明。', sort_order:4 },
    ];
    if (!data._nextIds) data._nextIds = {};
    data._nextIds.faq = 6;
  }
  if (!data.classes) {
    data.classes = [
      { id:1, name:'2025春季计算机培训班', description:'面向计算机专业人员的春季培训', start_date:'2025-03-01', end_date:'2025-06-30', status:'active', course_ids:[1,2,3,7,11], student_ids:[4,5,6,7,8,9,10], created_at:'2025-03-01 08:00:00' },
      { id:2, name:'2025春季机械工程班', description:'机械工程专业继续教育', start_date:'2025-04-01', end_date:'2025-08-31', status:'active', course_ids:[4,5,12], student_ids:[11,12,13,14,15], created_at:'2025-04-01 08:00:00' },
      { id:3, name:'2025建筑类培训班', description:'建筑工程专业人员培训', start_date:'2025-02-15', end_date:'2025-05-15', status:'finished', course_ids:[6,7], student_ids:[16,17,18,19,20], created_at:'2025-02-15 08:00:00' },
      { id:4, name:'2025公共基础课班', description:'公共基础课程培训', start_date:'2025-06-01', end_date:'2025-08-31', status:'pending', course_ids:[11,12,13,14,15], student_ids:[21,22,23,24], created_at:'2025-05-01 08:00:00' },
    ];
    if (!data._nextIds) data._nextIds = {};
    data._nextIds.classes = 5;
  }
  if (!data._nextIds) data._nextIds = {};
  saveData();
}

function saveData() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function createSeedData() {
  const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

  const organizations = [
    { id: 1, name: '扬州职业大学', parent_id: 0, level: 1 },
    { id: 2, name: '信息工程学院', parent_id: 1, level: 2 },
    { id: 3, name: '机电工程学院', parent_id: 1, level: 2 },
    { id: 4, name: '建筑工程学院', parent_id: 1, level: 2 },
    { id: 5, name: '外语学院', parent_id: 1, level: 2 },
    { id: 6, name: '经济管理学院', parent_id: 1, level: 2 },
  ];

  const users = [
    { id: 1, username: 'admin', password: 'admin123', realname: '系统管理员', phone: '13800000001', email: 'admin@yzpc.edu.cn', role: 'admin', org_id: 1, status: 'active', created_at: '2025-01-01 00:00:00' },
    { id: 2, username: 'teacher', password: 'teacher123', realname: '张教授', phone: '13800000002', email: 'zhang@yzpc.edu.cn', role: 'teacher', org_id: 2, status: 'active', created_at: '2025-01-02 00:00:00' },
    { id: 3, username: 'teacher2', password: 'teacher123', realname: '王博', phone: '13800000003', email: 'wang@yzpc.edu.cn', role: 'teacher', org_id: 3, status: 'active', created_at: '2025-01-03 00:00:00' },
    { id: 4, username: 'student', password: 'student123', realname: '李明', phone: '13900000001', email: 'liming@example.com', role: 'student', org_id: 2, status: 'active', created_at: '2025-01-05 00:00:00' },
  ];
  // Add 20 more students
  const surnames = ['王','刘','陈','杨','赵','黄','周','吴','徐','孙','朱','马','胡','郭','林','何','高','罗','郑','梁'];
  for (let i = 0; i < 20; i++) {
    users.push({
      id: 5 + i, username: `student${i+1}`, password: '123456',
      realname: surnames[i] + ['华','强','伟','芳','敏','丽','军','杰','磊','涛'][i % 10],
      phone: `1390000${String(1001 + i)}`, email: `stu${i+1}@example.com`,
      role: 'student', org_id: 2 + (i % 5), status: 'active', created_at: `2025-0${1 + (i % 5)}-${10 + i} 08:00:00`
    });
  }

  const course_categories = [
    { id: 1, name: '计算机类', parent_id: 0, sort_order: 1 },
    { id: 2, name: '机械类', parent_id: 0, sort_order: 2 },
    { id: 3, name: '建筑类', parent_id: 0, sort_order: 3 },
    { id: 4, name: '外语类', parent_id: 0, sort_order: 4 },
    { id: 5, name: '经管类', parent_id: 0, sort_order: 5 },
    { id: 6, name: '公共基础课', parent_id: 0, sort_order: 6 },
    { id: 7, name: '直播课程', parent_id: 0, sort_order: 7 },
    { id: 8, name: '面授课程', parent_id: 0, sort_order: 8 },
  ];

  const courses = [
    { id: 1, title: 'Python程序设计', category_id: 1, teacher_id: 2, type: 'video', duration: 64, price: 299, cover: '', description: '系统学习Python编程语言，从基础语法到高级应用', status: 'published', sort_order: 1, created_at: '2025-01-10 00:00:00' },
    { id: 2, title: '人工智能基础', category_id: 1, teacher_id: 2, type: 'video', duration: 48, price: 359, cover: '', description: '人工智能核心概念与实用技术', status: 'published', sort_order: 2, created_at: '2025-01-12 00:00:00' },
    { id: 3, title: '大数据技术', category_id: 1, teacher_id: 3, type: 'video', duration: 56, price: 259, cover: '', description: '大数据生态系统与处理技术', status: 'published', sort_order: 3, created_at: '2025-01-15 00:00:00' },
    { id: 4, title: '机械设计基础', category_id: 2, teacher_id: 3, type: 'video', duration: 48, price: 199, cover: '', description: '机械设计原理与工程应用', status: 'published', sort_order: 4, created_at: '2025-02-01 00:00:00' },
    { id: 5, title: '电气控制技术', category_id: 2, teacher_id: 3, type: 'video', duration: 40, price: 199, cover: '', description: '电气控制原理与PLC应用', status: 'published', sort_order: 5, created_at: '2025-02-05 00:00:00' },
    { id: 6, title: '建筑力学', category_id: 3, teacher_id: 2, type: 'video', duration: 56, price: 329, cover: '', description: '建筑力学基本原理与计算方法', status: 'published', sort_order: 6, created_at: '2025-02-10 00:00:00' },
    { id: 7, title: '土木工程概论', category_id: 3, teacher_id: 2, type: 'video', duration: 32, price: 0, cover: '', description: '土木工程基础知识导论', status: 'published', sort_order: 7, created_at: '2025-02-15 00:00:00' },
    { id: 8, title: '英语翻译技巧', category_id: 4, teacher_id: 2, type: 'video', duration: 40, price: 159, cover: '', description: '实用英语翻译方法与技巧', status: 'published', sort_order: 8, created_at: '2025-03-01 00:00:00' },
    { id: 9, title: '财务管理', category_id: 5, teacher_id: 3, type: 'video', duration: 48, price: 259, cover: '', description: '企业财务管理与实务操作', status: 'published', sort_order: 9, created_at: '2025-03-05 00:00:00' },
    { id: 10, title: '市场营销学', category_id: 5, teacher_id: 3, type: 'video', duration: 40, price: 0, cover: '', description: '现代市场营销理论与实践', status: 'published', sort_order: 10, created_at: '2025-03-10 00:00:00' },
    { id: 11, title: '计算机应用基础', category_id: 6, teacher_id: 2, type: 'video', duration: 32, price: 0, cover: '', description: '计算机基础知识与Office应用', status: 'published', sort_order: 11, created_at: '2025-03-15 00:00:00' },
    { id: 12, title: '高等数学', category_id: 6, teacher_id: 3, type: 'video', duration: 48, price: 0, cover: '', description: '高等数学微积分与线性代数', status: 'published', sort_order: 12, created_at: '2025-03-20 00:00:00' },
    { id: 13, title: '大学英语', category_id: 6, teacher_id: 2, type: 'video', duration: 40, price: 0, cover: '', description: '大学英语综合能力提升', status: 'published', sort_order: 13, created_at: '2025-04-01 00:00:00' },
    { id: 14, title: '思政教育', category_id: 6, teacher_id: 2, type: 'video', duration: 24, price: 0, cover: '', description: '思想政治理论教育', status: 'published', sort_order: 14, created_at: '2025-04-05 00:00:00' },
    { id: 15, title: '创新创业', category_id: 6, teacher_id: 3, type: 'video', duration: 32, price: 0, cover: '', description: '创新创业思维与实践', status: 'published', sort_order: 15, created_at: '2025-04-10 00:00:00' },
    { id: 16, title: '最新技术前沿讲座', category_id: 7, teacher_id: 2, type: 'live', duration: 8, price: 0, cover: '', description: 'AI/大数据/云计算技术前沿分享', status: 'published', sort_order: 16, created_at: '2025-04-15 00:00:00' },
    { id: 17, title: '行业专家分享', category_id: 7, teacher_id: 3, type: 'live', duration: 8, price: 0, cover: '', description: '行业专家实战经验分享', status: 'published', sort_order: 17, created_at: '2025-04-20 00:00:00' },
    { id: 18, title: '安全教育专题', category_id: 7, teacher_id: 2, type: 'live', duration: 4, price: 0, cover: '', description: '安全生产教育专题讲座', status: 'published', sort_order: 18, created_at: '2025-04-25 00:00:00' },
    { id: 19, title: '实践技能培训', category_id: 8, teacher_id: 3, type: 'offline', duration: 24, price: 399, cover: '', description: '线下实践技能操作培训', status: 'published', sort_order: 19, created_at: '2025-05-01 00:00:00' },
    { id: 20, title: '团队协作实训', category_id: 8, teacher_id: 2, type: 'offline', duration: 16, price: 299, cover: '', description: '团队协作与沟通能力实训', status: 'published', sort_order: 20, created_at: '2025-05-05 00:00:00' },
  ];

  const orders = [
    { id: 1, user_id: 4, course_id: 1, amount: 299, status: 'paid', pay_method: 'wechat', created_at: '2025-02-15 10:30:00' },
    { id: 2, user_id: 5, course_id: 2, amount: 359, status: 'paid', pay_method: 'alipay', created_at: '2025-02-18 14:20:00' },
    { id: 3, user_id: 6, course_id: 6, amount: 329, status: 'paid', pay_method: 'wechat', created_at: '2025-03-01 09:15:00' },
    { id: 4, user_id: 7, course_id: 9, amount: 259, status: 'paid', pay_method: 'bank', created_at: '2025-03-05 11:45:00' },
    { id: 5, user_id: 8, course_id: 1, amount: 299, status: 'unpaid', pay_method: null, created_at: '2025-03-10 16:00:00' },
    { id: 6, user_id: 9, course_id: 4, amount: 199, status: 'paid', pay_method: 'wechat', created_at: '2025-03-12 08:30:00' },
    { id: 7, user_id: 10, course_id: 19, amount: 399, status: 'paid', pay_method: 'alipay', created_at: '2025-03-15 10:00:00' },
    { id: 8, user_id: 11, course_id: 8, amount: 159, status: 'refunded', pay_method: 'wechat', created_at: '2025-03-18 13:20:00' },
    { id: 9, user_id: 12, course_id: 2, amount: 359, status: 'paid', pay_method: 'wechat', created_at: '2025-03-20 15:30:00' },
    { id: 10, user_id: 13, course_id: 5, amount: 199, status: 'paid', pay_method: 'alipay', created_at: '2025-03-22 09:10:00' },
    { id: 11, user_id: 14, course_id: 20, amount: 299, status: 'paid', pay_method: 'wechat', created_at: '2025-03-25 11:00:00' },
    { id: 12, user_id: 15, course_id: 9, amount: 259, status: 'unpaid', pay_method: null, created_at: '2025-04-01 08:00:00' },
    { id: 13, user_id: 16, course_id: 1, amount: 299, status: 'paid', pay_method: 'bank', created_at: '2025-04-05 14:30:00' },
    { id: 14, user_id: 17, course_id: 6, amount: 329, status: 'paid', pay_method: 'wechat', created_at: '2025-04-10 10:20:00' },
    { id: 15, user_id: 18, course_id: 3, amount: 259, status: 'paid', pay_method: 'alipay', created_at: '2025-04-15 16:45:00' },
  ];

  const certStatuses = ['已颁发', '待审核', '已打印'];
  const certificates = [];
  for (let i = 0; i < 20; i++) {
    const stu = users[3 + (i % 20)];
    const crs = courses[i % 20];
    certificates.push({
      id: i + 1, user_id: stu.id, course_id: crs.id,
      cert_no: `YZ${String(2025)}${String(i + 1).padStart(4, '0')}`,
      cert_name: crs.title + '结业证书',
      status: certStatuses[i % 3],
      issued_at: `2025-0${2 + (i % 4)}-${10 + (i % 20)} 00:00:00`
    });
  }

  const notifications = [
    { id: 1, title: '2025年度继续教育报名通知', content: '各位学员，2025年度继续教育课程已开放报名，请登录平台选择课程并完成缴费。报名截止日期为6月30日。', type: 'notice', publisher_id: 1, status: 'published', created_at: '2025-01-15 09:00:00' },
    { id: 2, title: '关于专业技术人员继续教育学时认定的通知', content: '根据《专业技术人员继续教育规定》，继续教育学时认定标准如下...', type: 'policy', publisher_id: 1, status: 'published', created_at: '2025-02-01 10:00:00' },
    { id: 3, title: '平台系统升级公告', content: '为提升用户体验，平台将于本周末进行系统升级维护，届时可能影响正常使用。', type: 'news', publisher_id: 1, status: 'published', created_at: '2025-02-20 14:00:00' },
    { id: 4, title: '安全生产培训专项通知', content: '根据省厅要求，所有专业技术人员需完成年度安全生产培训，具体安排如下...', type: 'notice', publisher_id: 1, status: 'published', created_at: '2025-03-01 08:00:00' },
    { id: 5, title: '在线学习规范及考试纪律要求', content: '为确保学习质量和公平性，现就在线学习规范及考试纪律做出如下要求...', type: 'policy', publisher_id: 1, status: 'published', created_at: '2025-03-10 09:00:00' },
    { id: 6, title: '新增AI辅助学习功能上线', content: '平台新增AI智能问答辅助功能，学员在学习过程中可随时向AI助手提问。', type: 'news', publisher_id: 1, status: 'published', created_at: '2025-04-01 10:00:00' },
    { id: 7, title: '2025年第二季度培训计划发布', content: '第二季度培训计划已发布，包含20门精品课程，涵盖计算机、机械、建筑等领域。', type: 'notice', publisher_id: 1, status: 'published', created_at: '2025-04-15 08:00:00' },
    { id: 8, title: '证书电子化改革通知', content: '自2025年起，结业证书全面实行电子化，学员可在平台在线查看和下载电子证书。', type: 'policy', publisher_id: 1, status: 'published', created_at: '2025-05-01 09:00:00' },
  ];

  const notification_reads = [];
  // Simulate some reads for first 3 notifications
  for (let nId = 1; nId <= 3; nId++) {
    for (let uId = 4; uId <= 14; uId++) {
      if (Math.random() > 0.3) {
        notification_reads.push({
          id: notification_reads.length + 1,
          notification_id: nId, user_id: uId,
          read_at: `2025-0${1 + nId}-${10 + uId} ${8 + uId}:00:00`
        });
      }
    }
  }

  const learning_records = [];
  for (let i = 0; i < 15; i++) {
    const stu = users[3 + (i % 20)];
    const crs = courses[i % 20];
    learning_records.push({
      id: i + 1, user_id: stu.id, course_id: crs.id,
      progress: Math.floor(Math.random() * 100),
      duration_minutes: Math.floor(Math.random() * 600) + 60,
      status: i < 5 ? 'completed' : 'learning',
      started_at: `2025-0${2 + (i % 4)}-${5 + i} 08:00:00`,
      last_study_at: `2025-05-${1 + i} ${10 + i}:00:00`
    });
  }

  const settings = [
    { key: 'video_quality', value: 'hd' },
    { key: 'hour_minutes', value: '45' },
    { key: 'watermark_text', value: '扬州职业大学继续教育' },
    { key: 'min_speed', value: '1.0' },
    { key: 'max_speed', value: '2.0' },
    { key: 'allow_fast_forward', value: '1' },
    { key: 'accumulate_hours', value: '0' },
    { key: 'show_task_status', value: '1' },
    { key: 'anti_afk_interval', value: '300' },
    { key: 'anti_afk_duration', value: '10' },
    { key: 'learning_mode', value: 'course' },
    { key: 'home_course_count', value: '12' },
    { key: 'home_display_mode', value: 'course_list' },
  ];

  const message_templates = [
    { id: 1, name: '课程开课通知', type: 'wechat', title: '课程开课提醒', content: '尊敬的{name}，您报名的{course}将于{start_time}开课，请准时参加。', status: 'active' },
    { id: 2, name: '缴费成功通知', type: 'sms', title: '缴费成功', content: '您已成功缴纳{course}费用{cost}元。', status: 'active' },
    { id: 3, name: '证书颁发通知', type: 'email', title: '证书颁发', content: '尊敬的{name}，您已完成{course}的学习，结业证书已颁发。', status: 'active' },
    { id: 4, name: '学习进度提醒', type: 'wechat', title: '学习进度提醒', content: '{name}，您的{course}学习进度为{progress}%，请继续加油！', status: 'active' },
  ];

  const wx_menu = [
    { id: 1, parent_id: 0, name: '学习中心', type: 'view', url: '/student', sort_order: 0 },
    { id: 2, parent_id: 0, name: '我的服务', type: 'view', url: '/services', sort_order: 1 },
    { id: 3, parent_id: 0, name: '更多', type: 'view', url: '/more', sort_order: 2 },
    { id: 4, parent_id: 1, name: '我的课程', type: 'view', url: '/student', sort_order: 0 },
    { id: 5, parent_id: 1, name: '在线考试', type: 'view', url: '/exam', sort_order: 1 },
    { id: 6, parent_id: 2, name: '证书查询', type: 'view', url: '/certificates', sort_order: 0 },
    { id: 7, parent_id: 2, name: '个人中心', type: 'view', url: '/profile', sort_order: 1 },
    { id: 8, parent_id: 3, name: '联系我们', type: 'view', url: '/contact', sort_order: 0 },
    { id: 9, parent_id: 3, name: '帮助中心', type: 'view', url: '/help', sort_order: 1 },
  ];

  const registration_fields = [
    { id: 1, field_name: 'realname', display_name: '姓名', field_type: 'text', is_visible: 1, is_required: 1, sort_order: 0, options: null, remark: '' },
    { id: 2, field_name: 'phone', display_name: '手机号', field_type: 'text', is_visible: 1, is_required: 1, sort_order: 1, options: null, remark: '' },
    { id: 3, field_name: 'id_card', display_name: '身份证号', field_type: 'text', is_visible: 1, is_required: 1, sort_order: 2, options: null, remark: '' },
    { id: 4, field_name: 'org_name', display_name: '工作单位', field_type: 'text', is_visible: 1, is_required: 0, sort_order: 3, options: null, remark: '' },
    { id: 5, field_name: 'email', display_name: '邮箱', field_type: 'text', is_visible: 1, is_required: 0, sort_order: 4, options: null, remark: '' },
  ];

  const exam_records = [];
  for (let i = 0; i < 10; i++) {
    exam_records.push({
      id: i + 1, user_id: users[3 + i].id, course_id: courses[i % 20].id,
      score: 55 + Math.floor(Math.random() * 45), total_score: 100,
      status: Math.random() > 0.3 ? 'passed' : 'failed',
      exam_time: `2025-0${3 + (i % 3)}-${10 + i} 10:00:00`
    });
  }

  return {
    organizations, users, course_categories, courses, orders,
    certificates, notifications, notification_reads, learning_records,
    settings, message_templates, wx_menu, registration_fields, exam_records,
    projects: [
      { id:1, name:'2025年度Python程序设计培训', start_date:'2025-03-01', end_date:'2025-06-30', fee:299, exam_type:'在线考试', description:'面向专业技术人员的Python编程继续教育课程', status:'active', students:86, created_at:'2025-03-01 08:00:00' },
      { id:2, name:'2025年度机电工程继续教育', start_date:'2025-04-01', end_date:'2025-08-31', fee:359, exam_type:'线上+线下', description:'机电工程专业继续教育年度培训项目', status:'active', students:52, created_at:'2025-04-01 08:00:00' },
      { id:3, name:'2025春季建筑类培训班', start_date:'2025-02-15', end_date:'2025-05-15', fee:329, exam_type:'在线考试', description:'建筑工程专业人员继续教育春季培训', status:'finished', students:38, created_at:'2025-02-15 08:00:00' },
      { id:4, name:'2025夏季公共基础课培训', start_date:'2025-06-01', end_date:'2025-08-31', fee:199, exam_type:'在线考试', description:'公共基础课程夏季专项培训', status:'pending', students:0, created_at:'2025-05-01 08:00:00' },
      { id:5, name:'2025年度安全生产培训', start_date:'2025-05-01', end_date:'2025-07-31', fee:0, exam_type:'线上直播', description:'年度安全生产专项培训，全员必修', status:'active', students:45, created_at:'2025-05-01 08:00:00' },
    ],
    faq: [
      { id:1, question:'如何报名课程？', answer:'登录平台后，在课程列表中选择心仪课程，点击"报名"按钮即可完成报名。', sort_order:0 },
      { id:2, question:'学习完成后如何获取证书？', answer:'完成课程学习并通过考核后，系统将自动生成电子证书，可在"我的证书"中下载。', sort_order:1 },
      { id:3, question:'如何修改个人信息？', answer:'登录后进入"个人中心"，点击"编辑资料"即可修改姓名、手机号等个人信息。', sort_order:2 },
      { id:4, question:'平台支持哪些支付方式？', answer:'平台支持微信支付、支付宝、银联等在线支付方式，也支持线下转账缴费。', sort_order:3 },
      { id:5, question:'课程学习有时间限制吗？', answer:'课程学习期限以项目设置为准，具体请查看课程详情页面中的"学习有效期"说明。', sort_order:4 },
    ],
    _nextIds: { users: 25, courses: 21, orders: 16, certificates: 21, notifications: 9, notification_reads: 50, learning_records: 16, message_templates: 5, wx_menu: 10, registration_fields: 6, exam_records: 11, course_categories: 9, organizations: 7, projects: 6, faq: 6, classes: 5 }
  };
}

function nextId(table) {
  const key = table.replace('_', '_');
  if (!data._nextIds[key]) data._nextIds[key] = 1;
  return ++data._nextIds[key];
}

// ===== Query helpers =====
function findMany(table, filterFn) {
  return (data[table] || []).filter(filterFn || (() => true));
}
function findOne(table, filterFn) {
  return (data[table] || []).find(filterFn) || null;
}
function insertOne(table, record) {
  data[table].push(record);
  saveData();
  return record;
}
function updateOne(table, filterFn, updates) {
  const item = findOne(table, filterFn);
  if (item) { Object.assign(item, updates); saveData(); }
  return item;
}
function deleteMany(table, filterFn) {
  data[table] = data[table].filter(filterFn ? (r => !filterFn(r)) : (() => false));
  saveData();
}

module.exports = { loadData, saveData, findMany, findOne, insertOne, updateOne, deleteMany, nextId, data: () => data };
