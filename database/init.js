const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'training.db');
let _SQL = null;

async function initDatabase() {
  if (!_SQL) _SQL = await initSqlJs();

  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new _SQL.Database(buffer);
  } else {
    db = new _SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    realname TEXT, phone TEXT, email TEXT, role TEXT DEFAULT 'student', org_id INTEGER,
    status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS organizations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parent_id INTEGER DEFAULT 0, level INTEGER DEFAULT 1, created_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS course_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parent_id INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category_id INTEGER, teacher_id INTEGER, type TEXT DEFAULT 'video', duration INTEGER DEFAULT 40, price REAL DEFAULT 0, cover TEXT, description TEXT, status TEXT DEFAULT 'published', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, course_id INTEGER, amount REAL, status TEXT DEFAULT 'unpaid', pay_method TEXT, created_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS certificates (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, course_id INTEGER, cert_no TEXT, cert_name TEXT, status TEXT DEFAULT 'issued', issued_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT, type TEXT DEFAULT 'notice', publisher_id INTEGER, status TEXT DEFAULT 'published', created_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS notification_reads (id INTEGER PRIMARY KEY AUTOINCREMENT, notification_id INTEGER, user_id INTEGER, read_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS learning_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, course_id INTEGER, progress INTEGER DEFAULT 0, duration_minutes INTEGER DEFAULT 0, status TEXT DEFAULT 'studying', started_at DATETIME DEFAULT (datetime('now','localtime')), last_study_at DATETIME DEFAULT (datetime('now','localtime')))`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, value TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS message_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, title TEXT, content TEXT, status TEXT DEFAULT 'active')`);
  db.run(`CREATE TABLE IF NOT EXISTS wx_menu (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER DEFAULT 0, name TEXT, type TEXT DEFAULT 'view', url TEXT, sort_order INTEGER DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS registration_fields (id INTEGER PRIMARY KEY AUTOINCREMENT, field_name TEXT, display_name TEXT, field_type TEXT DEFAULT 'text', is_visible INTEGER DEFAULT 1, is_required INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, options TEXT, remark TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS exam_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, course_id INTEGER, score REAL, total_score REAL DEFAULT 100, status TEXT DEFAULT 'completed', exam_time DATETIME DEFAULT (datetime('now','localtime')))`);

  // Check if data exists
  const cnt = queryOne(db, 'SELECT COUNT(*) as cnt FROM users');
  if (cnt && cnt.cnt > 0) { saveDb(db); return db; }

  // Seed data
  const run = (sql, params = []) => db.run(sql, params);

  run('INSERT INTO organizations VALUES (1,"扬州职业大学",0,1,datetime("now","localtime"))');
  run('INSERT INTO organizations VALUES (2,"信息工程学院",1,2,datetime("now","localtime"))');
  run('INSERT INTO organizations VALUES (3,"机电工程学院",1,2,datetime("now","localtime"))');
  run('INSERT INTO organizations VALUES (4,"建筑工程学院",1,2,datetime("now","localtime"))');
  run('INSERT INTO organizations VALUES (5,"经济管理学院",1,2,datetime("now","localtime"))');
  run('INSERT INTO organizations VALUES (6,"外国语学院",1,2,datetime("now","localtime"))');

  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("admin","admin123","系统管理员","13800000001","admin@yzpc.edu.cn","admin",1)');
  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("teacher","teacher123","张教授","13800000002","zhang@yzpc.edu.cn","teacher",2)');
  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("student","student123","李同学","13800000003","li@stu.yzpc.edu.cn","student",2)');
  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("t2","pass123","王博","1380000011","wang@yzpc.edu.cn","teacher",3)');
  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("t3","pass123","赵工","1380000012","zhao@yzpc.edu.cn","teacher",4)');
  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("t4","pass123","刘教授","1380000013","liu@yzpc.edu.cn","teacher",5)');
  run('INSERT INTO users (username,password,realname,phone,email,role,org_id) VALUES ("t5","pass123","陈老师","1380000014","chen@yzpc.edu.cn","teacher",6)');

  const students = [
    ['s1','pass123','陈明','1381000001','student',2],['s2','pass123','刘洋','1381000002','student',2],
    ['s3','pass123','王芳','1381000003','student',3],['s4','pass123','张伟','1381000004','student',3],
    ['s5','pass123','赵丽','1381000005','student',4],['s6','pass123','孙强','1381000006','student',4],
    ['s7','pass123','周敏','1381000007','student',5],['s8','pass123','吴鹏','1381000008','student',5],
    ['s9','pass123','黄蕾','1381000009','student',6],['s10','pass123','林浩','1381000010','student',6],
    ['s11','pass123','徐静','1381000011','student',2],['s12','pass123','马超','1381000012','student',3],
    ['s13','pass123','朱婷','1381000013','student',2],['s14','pass123','胡波','1381000014','student',3],
    ['s15','pass123','郭雨','1381000015','student',4],['s16','pass123','沈涛','1381000016','student',5],
    ['s17','pass123','韩雪','1381000017','student',2],['s18','pass123','杨帆','1381000018','student',3],
    ['s19','pass123','秦岚','1381000019','student',4],['s20','pass123','邓文','1381000020','student',5],
  ];
  students.forEach(s => run('INSERT INTO users (username,password,realname,phone,role,org_id) VALUES (?,?,?,?,?,?)', s));

  // Categories
  ['计算机类','机械类','建筑类','外语类','经管类','公共基础课','直播课程','面授课程'].forEach((n,i) => run('INSERT INTO course_categories VALUES (?,?,?,?)',[i+1,n,0,i+1]));

  // Courses
  const courses = [
    [1,'Python程序设计',1,2,'video',64,299,'Python编程从入门到实践',1],[2,'人工智能基础',1,2,'video',48,399,'AI核心算法与深度学习实践',2],
    [3,'大数据技术',1,4,'video',56,359,'Hadoop/Spark实战',3],[4,'机械设计基础',2,3,'video',48,299,'机械制图与设计基础',4],
    [5,'电气控制技术',2,3,'video',40,259,'PLC编程与自动化控制',5],[6,'建筑力学',3,5,'video',56,329,'结构力学与材料力学',6],
    [7,'土木工程概论',3,5,'video',32,199,'土木工程基础知识',7],[8,'英语翻译技巧',4,6,'video',40,259,'专业英语翻译实践',8],
    [9,'财务管理基础',5,6,'video',48,319,'企业财务管理与报表分析',9],[10,'市场营销学',5,6,'video',40,259,'市场营销策略',10],
    [11,'计算机应用基础',6,2,'video',32,99,'Office办公软件与网络基础',1],[12,'高等数学',6,2,'video',64,199,'微积分与线性代数',2],
    [13,'大学英语',6,6,'video',48,199,'综合英语听说读写',3],[14,'思政教育',6,2,'video',24,0,'新时代中国特色社会主义',4],
    [15,'创新创业',6,5,'video',24,0,'创业基础知识',5],[16,'技术前沿讲座',7,2,'live',4,0,'行业最新技术动态',6],
    [17,'行业专家分享',7,3,'live',4,0,'一线专家实践经验',7],[18,'安全生产教育',7,3,'live',2,0,'安全生产规范',8],
    [19,'实践技能培训',8,4,'offline',16,599,'动手实操技能训练',9],[20,'团队协作实训',8,5,'offline',8,399,'团队项目协作',10],
  ];
  courses.forEach(c => run('INSERT INTO courses (id,title,category_id,teacher_id,type,duration,price,description,sort_order) VALUES (?,?,?,?,?,?,?,?,?)', c));

  // Orders
  [[3,1,299,'paid','wechat','2025-01-15'],[3,2,399,'paid','alipay','2025-01-20'],[4,1,299,'paid','wechat','2025-02-01'],
   [4,3,359,'paid','alipay','2025-02-10'],[5,4,299,'paid','unionpay','2025-01-25'],[6,5,259,'paid','wechat','2025-02-15'],
   [7,6,329,'unpaid',null,'2025-03-01'],[8,7,199,'paid','alipay','2025-01-30'],[9,8,259,'paid','wechat','2025-02-20'],
   [10,9,319,'paid','wechat','2025-03-05'],[11,10,259,'paid','alipay','2025-02-28'],[12,11,99,'paid','wechat','2025-03-10'],
   [13,12,199,'refunded','wechat','2025-03-15'],[14,13,199,'paid','alipay','2025-03-20'],[15,15,0,'paid',null,'2025-01-10']
  ].forEach(o => run('INSERT INTO orders (user_id,course_id,amount,status,pay_method,created_at) VALUES (?,?,?,?,?,?)', o));

  // Certificates
  [[3,1,'YZ202500001','Python程序设计结业证书','issued','2025-03-15'],[3,2,'YZ202500002','人工智能基础结业证书','issued','2025-04-10'],
   [4,1,'YZ202500003','Python程序设计结业证书','issued','2025-03-20'],[4,3,'YZ202500004','大数据技术结业证书','issued','2025-04-25'],
   [5,4,'YZ202500005','机械设计基础结业证书','issued','2025-03-30'],[6,5,'YZ202500006','电气控制技术结业证书','printed','2025-04-05'],
   [8,7,'YZ202500007','土木工程概论结业证书','issued','2025-04-15'],[9,8,'YZ202500008','英语翻译技巧结业证书','issued','2025-04-20'],
   [10,9,'YZ202500009','财务管理基础结业证书','pending','2025-05-01'],[11,10,'YZ202500010','市场营销学结业证书','issued','2025-05-10'],
   [12,11,'YZ202500011','计算机应用基础结业证书','issued','2025-05-15'],[14,13,'YZ202500012','大学英语结业证书','issued','2025-05-18'],
   [3,14,'YZ202500013','思政教育结业证书','issued','2025-05-20'],[6,14,'YZ202500014','思政教育结业证书','issued','2025-05-22']
  ].forEach(c => run('INSERT INTO certificates (user_id,course_id,cert_no,cert_name,status,issued_at) VALUES (?,?,?,?,?,?)', c));

  // Notifications
  [['2025年度专业技术人员继续教育培训开始报名','相关通知内容','notice'],
   ['关于调整培训学时认定标准的通知','根据上级要求调整','policy'],
   ['我校在省级教学竞赛中获得优异成绩','获奖详情','news'],
   ['Python程序设计课程即将开课','开课通知','notice'],
   ['五一劳动节期间平台正常运行通知','正常运行','notice'],
   ['关于加强在线学习过程管理的通知','管理细则','policy'],
   ['热烈祝贺我校培训平台注册学员突破3000人','突破3000人','news'],
   ['关于电子发票系统升级的通知','系统升级','notice']
  ].forEach(n => run('INSERT INTO notifications (title,content,type,publisher_id,status) VALUES (?,?,?,1,"published")', n));

  // Read records
  for (let i = 1; i <= 5; i++) for (let j = 3; j <= 12; j++) run('INSERT INTO notification_reads (notification_id,user_id) VALUES (?,?)', [i, j]);

  // Learning records
  [[3,1,85,3200,'2025-01-16','2025-05-15'],[3,2,60,1800,'2025-01-21','2025-04-10'],[4,1,100,3840,'2025-02-02','2025-05-20'],
   [4,3,45,1500,'2025-02-11','2025-05-10'],[5,4,90,2600,'2025-01-26','2025-05-12'],[6,5,100,2400,'2025-02-16','2025-05-18'],
   [8,7,100,1920,'2025-01-31','2025-03-20'],[9,8,75,1800,'2025-02-21','2025-05-15'],[10,9,80,2300,'2025-03-06','2025-05-18'],
   [11,10,100,2400,'2025-03-01','2025-05-20'],[12,11,95,1820,'2025-03-11','2025-05-16'],[14,13,70,2000,'2025-03-21','2025-05-12']
  ].forEach(l => run('INSERT INTO learning_records (user_id,course_id,progress,duration_minutes,started_at,last_study_at) VALUES (?,?,?,?,?,?)', l));

  // Settings
  [['site_name','扬州职业大学继续教育在线培训平台'],['video_quality','hd'],['allow_fast_forward','1'],
   ['accumulate_hours','1'],['show_task_status','1'],['hour_minutes','45'],['watermark_text','扬州职业大学继续教育'],
   ['min_speed','1.0'],['max_speed','2.0'],['anti_afk_interval','300'],['anti_afk_duration','10'],
   ['home_course_count','12'],['home_display_mode','course_list'],['learning_mode','course'],['template','classic'],['theme','default']
  ].forEach(s => run('INSERT INTO settings (key,value) VALUES (?,?)', s));

  // Message templates
  [['报名成功通知','wechat','报名成功','您好{name}，您已成功报名{course}课程。'],['报名成功通知','sms','报名成功','【扬州职大】{name}，您已报名{course}。'],
   ['缴费提醒','email','缴费通知','尊敬的{name}：课程{course}尚未缴费，金额{cost}元。'],['证书发放通知','wechat','证书已发放','{name}，{course}证书已发放。'],
   ['课程开课提醒','sms','开课提醒','【扬州职大】{course}将于{start_time}开课。']
  ].forEach(t => run('INSERT INTO message_templates (name,type,title,content) VALUES (?,?,?,?)', t));

  // WX Menu
  [[0,'学习中心','view','https://wx.yzpc.edu.cn/study',1],[0,'我的服务','view','https://wx.yzpc.edu.cn/my',2],
   [0,'更多','view','https://wx.yzpc.edu.cn/more',3],[1,'我的课程','view','','4'],[1,'在线考试','view','','5'],
   [2,'证书查询','view','','6'],[2,'个人中心','view','','7']
  ].forEach(m => run('INSERT INTO wx_menu (parent_id,name,type,url,sort_order) VALUES (?,?,?,?,?)', m));

  // Registration fields
  [['realname','姓名','text',1,1,0,''],['phone','手机号','text',1,1,1,''],['id_card','身份证号','text',1,1,2,''],
   ['org_name','工作单位','text',1,0,3,''],['email','邮箱','text',1,0,4,'']
  ].forEach(f => run('INSERT INTO registration_fields (field_name,display_name,field_type,is_visible,is_required,sort_order,remark) VALUES (?,?,?,?,?,?,?)', f));

  saveDb(db);
  console.log('数据库初始化完成，种子数据已写入');
  return db;
}

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: query single row
function queryOne(db, sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
  } catch(e) { console.error('queryOne error:', sql, e.message); }
  return null;
}

// Helper: query all rows
function queryAll(db, sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch(e) { console.error('queryAll error:', sql, e.message); }
  return [];
}

// Helper: run statement
function dbRun(db, sql, params = []) {
  try {
    if (params.length) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }
    // Get last insert rowid
    const r = queryOne(db, 'SELECT last_insert_rowid() as id');
    return r ? r.id : 0;
  } catch(e) { console.error('dbRun error:', sql, e.message); }
  return 0;
}

module.exports = initDatabase;
module.exports.queryOne = queryOne;
module.exports.queryAll = queryAll;
module.exports.dbRun = dbRun;
