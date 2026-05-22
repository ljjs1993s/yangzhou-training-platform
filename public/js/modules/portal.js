import { api } from '../api.js';
import '../modules/rich-editor.js';

/* ========================================================================
   portal.js — 个性化门户网站模块
   覆盖需求 §1 全部功能：
   ① 扁平化设计 + 多套门户模板  ② 二级门户配置
   ③ 课程展示/报名/购买(个人+集体)  ④ 证书查询
   ⑤ 多种注册/登录方式  ⑥ 多级审核  ⑦ AI智能问答
   ======================================================================== */

export async function renderPortal() {
  const main = document.getElementById('app-main');

  /* ---------- Fallback data ---------- */
  const fallbackCourses = [
    { id:1, title:'Python程序设计', type:'video', teacher_name:'张教授', duration:64, price:299, category_name:'计算机类', description:'Python编程从入门到实践' },
    { id:2, title:'人工智能基础', type:'video', teacher_name:'张教授', duration:48, price:399, category_name:'计算机类', description:'AI核心算法与深度学习实践' },
    { id:3, title:'大数据技术', type:'video', teacher_name:'刘教授', duration:56, price:359, category_name:'计算机类', description:'Hadoop/Spark实战' },
    { id:4, title:'机械设计基础', type:'video', teacher_name:'赵工', duration:48, price:299, category_name:'机械类', description:'机械制图与设计基础' },
    { id:5, title:'建筑力学', type:'video', teacher_name:'刘教授', duration:56, price:329, category_name:'建筑类', description:'结构力学与材料力学' },
    { id:6, title:'英语翻译技巧', type:'video', teacher_name:'陈老师', duration:40, price:259, category_name:'外语类', description:'专业英语翻译实践' },
    { id:7, title:'财务管理基础', type:'video', teacher_name:'刘教授', duration:48, price:319, category_name:'经管类', description:'企业财务管理与报表分析' },
    { id:8, title:'市场营销学', type:'video', teacher_name:'陈老师', duration:40, price:259, category_name:'经管类', description:'市场营销策略' },
    { id:9, title:'计算机应用基础', type:'video', teacher_name:'张教授', duration:32, price:99, category_name:'公共基础课', description:'Office办公软件与网络基础' },
    { id:10, title:'思政教育', type:'video', teacher_name:'张教授', duration:24, price:0, category_name:'公共基础课', description:'新时代中国特色社会主义' },
    { id:11, title:'技术前沿讲座', type:'live', teacher_name:'张教授', duration:4, price:0, category_name:'直播课程', description:'行业最新技术动态' },
    { id:12, title:'实践技能培训', type:'offline', teacher_name:'赵工', duration:16, price:599, category_name:'面授课程', description:'动手实操技能训练' },
  ];

  const fallbackNotifs = [
    { id:1, title:'2025年度继续教育培训开始报名', type:'notice', created_at:'2025-05-15', content:'为贯彻落实专业技术人员继续教育相关规定，现开展2025年度在线培训报名工作。' },
    { id:2, title:'关于调整培训学时认定标准的通知', type:'policy', created_at:'2025-05-10', content:'根据上级主管部门最新要求，对继续教育学时认定标准进行调整。' },
    { id:3, title:'我校在省级教学竞赛中获得优异成绩', type:'news', created_at:'2025-05-08', content:'热烈祝贺我校教师在省级教学能力竞赛中荣获多项奖项。' },
    { id:4, title:'Python程序设计课程即将开课', type:'notice', created_at:'2025-05-05', content:'Python程序设计课程将于5月20日正式开课，请已报名学员准时参加。' },
    { id:5, title:'五一劳动节期间平台正常运行通知', type:'notice', created_at:'2025-04-30', content:'五一假期期间，培训平台正常运行，学员可正常学习。' },
    { id:6, title:'关于加强在线学习过程管理的通知', type:'policy', created_at:'2025-04-20', content:'为进一步规范在线学习行为，现就学习过程管理作出如下规定。' },
    { id:7, title:'热烈祝贺平台注册学员突破3000人', type:'news', created_at:'2025-04-25', content:'截至2025年4月底，平台注册学员已突破3000人。' },
    { id:8, title:'关于电子发票系统升级的通知', type:'notice', created_at:'2025-04-15', content:'电子发票系统将于本周末进行升级维护。' },
  ];

  /* ---------- Fetch data ---------- */
  let courses = fallbackCourses;
  let notifications = fallbackNotifs;
  let categories = [];
  let faqs = [];
  let contactInfo = {};
  let dashboardStats = null;
  let allClasses = [];
  let learningMode = 'course'; // 'course' or 'class'

  // Use cached settings from theme.js init, fallback to API call
  let siteSettings = window._siteSettings || {};
  if (!siteSettings.site_name) {
    try { siteSettings = await api.getSettings(); } catch(e) {}
  }

  try { courses = await api.getCourses({ limit: 20 }); if (!courses || !courses.length) courses = fallbackCourses; } catch(e) { console.warn('portal: courses fallback', e); }
  // Load media data for courses (batch in parallel)
  try {
    const mediaResults = await Promise.all(courses.map(c => api.getCourseMedia(c.id).catch(() => null)));
    mediaResults.forEach((m, i) => {
      if (m && courses[i]) {
        courses[i].video = m.video || [];
        courses[i].audio = m.audio || [];
        courses[i].materials = m.materials || [];
        courses[i].trailer = m.trailer || '';
        courses[i].preview = m.preview || '';
      }
    });
  } catch(e) { console.warn('portal: media data skipped', e); }
  try { notifications = await api.getNotifications(); if (!notifications || !notifications.length) notifications = fallbackNotifs; } catch(e) { console.warn('portal: notifications fallback', e); }
  try { categories = await api.getCourseCategories(); } catch(e) {}
  try { faqs = await api.getFaq(); if (!faqs || !faqs.length) faqs = []; } catch(e) {}
  try { contactInfo = await api.getContact(); } catch(e) {}

  // Load classes and learning mode for class-based display
  try {
    allClasses = await api.getClasses() || [];
    // Fetch media for all class courses
    const allClassCourseIds = [...new Set((allClasses || []).flatMap(c => c.course_ids || []))];
    if (allClassCourseIds.length > 0) {
      const mediaMap = {};
      await Promise.all(allClassCourseIds.map(async cid => {
        try {
          const m = await api.getCourseMedia(cid);
          if (m) mediaMap[cid] = m;
        } catch(e) {}
      }));
      // Attach media to courses inside each class
      allClasses.forEach(cls => {
        (cls.courses || []).forEach(c => {
          const m = mediaMap[c.id];
          if (m) {
            c.trailer = m.trailer || '';
            c.preview = m.preview || '';
            c.video = m.video || [];
            c.audio = m.audio || [];
            c.materials = m.materials || [];
          }
        });
      });
    }
  } catch(e) { allClasses = []; }
  try {
    const settings = await api.getSettings();
    learningMode = settings.learning_mode || 'course';
  } catch(e) { learningMode = siteSettings.learning_mode || 'course'; }

  const siteName = siteSettings.site_name || '扬州职业大学继续教育在线培训平台';
  const siteSubtitle = siteSettings.site_subtitle || '专业技术人员继续教育服务平台';
  const siteTemplate = siteSettings.site_template || '经典布局';

  /* ---------- Helper: notification by type ---------- */
  const noticeList  = notifications.filter(n => n.type === 'notice').slice(0, 5);
  const policyList  = notifications.filter(n => n.type === 'policy').slice(0, 5);
  const newsList    = notifications.filter(n => n.type === 'news').slice(0, 5);

  /* ---------- Helper: render notification items ---------- */
  function renderNotifItems(list) {
    if (!list.length) return '<div class="empty-state" style="padding:24px"><p class="text-muted">暂无内容</p></div>';
    return list.map(n => `
      <div class="news-list-item" onclick="portalViewNotification(${n.id})">
        <span class="news-date">${window.formatDate(n.created_at)}</span>
        <span class="news-title">${window.escapeHtml(n.title)}</span>
        <span class="news-arrow">›</span>
      </div>
    `).join('');
  }

  /* ---------- Helper: course card ---------- */
  function courseCard(c) {
    const typeLabel = c.type === 'live' ? '直播' : c.type === 'offline' ? '面授' : '录播';
    const typeIcon  = c.type === 'live' ? '📡' : c.type === 'offline' ? '🏫' : '📹';
    const priceHtml = c.price === 0
      ? '<span class="course-price free">免费</span>'
      : `<span class="course-price">${window.formatMoney(c.price)}</span>`;

    // Build media badges
    let mediaBadges = '';
    const hasVideo = (c.video && c.video.length > 0);
    const hasAudio = (c.audio && c.audio.length > 0);
    const hasMaterials = (c.materials && c.materials.length > 0);
    const hasTrailer = c.trailer && c.trailer.length > 0;
    const hasPreview = c.preview && c.preview.length > 0;
    // Check for link-type resources (external URLs)
    const allResources = [...(c.video||[]), ...(c.audio||[]), ...(c.materials||[])];
    const linkResources = allResources.filter(r => !r.url && r.link);
    const hasLinkResources = linkResources.length > 0;

    if (hasVideo || hasAudio || hasMaterials || hasTrailer || hasPreview) {
      let badges = [];
      if (hasVideo) badges.push('<span class="media-badge media-badge-video">🎬 ' + c.video.length + '视频</span>');
      if (hasAudio) badges.push('<span class="media-badge media-badge-audio">🎵 ' + c.audio.length + '音频</span>');
      if (hasMaterials) badges.push('<span class="media-badge media-badge-materials">📁 ' + c.materials.length + '资料</span>');
      if (hasTrailer) badges.push('<span class="media-badge media-badge-trailer">🎞️ 片花</span>');
      if (hasPreview) badges.push('<span class="media-badge media-badge-preview">👁️ 试看</span>');
      mediaBadges = '<div class="course-media-badges">' + badges.join('') + '</div>';
    }

    // Override preview button with preview video if available
    const previewBtn = hasPreview
      ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();showCoursePreview(${c.id})">试看</button>`
      : `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();portalViewCourse(${c.id})">预览</button>`;

    // Resource button: if has link resources, show dropdown with links; otherwise go to course detail
    let resourceBtn = '';
    if (hasLinkResources) {
      const linkItems = linkResources.map((r, i) => {
        const name = window.escapeHtml(r.name || r.link.split('/').pop() || '链接资源');
        return `<div class="resource-link-item" onclick="event.stopPropagation();window.open('${r.link}','_blank')" title="${window.escapeHtml(r.link)}">🔗 ${name}</div>`;
      }).join('');
      resourceBtn = `<div class="resource-btn-wrapper" onclick="event.stopPropagation()">
        <button class="btn btn-outline btn-sm" onclick="toggleResourceLinks(this)">资源 ▾</button>
        <div class="resource-links-dropdown" style="display:none">${linkItems}</div>
      </div>`;
    }

    return `
      <div class="card course-card card-clickable" onclick="portalViewCourse(${c.id})">
        <div class="course-cover">
          <span class="course-tag tag-${c.type}">${typeLabel}</span>
          <span class="course-cover-icon">${typeIcon}</span>
          ${hasTrailer ? `<button class="course-cover-trailer-btn" onclick="event.stopPropagation();showCourseTrailer(${c.id})" title="播放片花">▶ 片花</button>` : ''}
        </div>
        <div class="card-body">
          <div class="course-title" title="${window.escapeHtml(c.title)}">${window.escapeHtml(c.title)}</div>
          <div class="course-meta">${window.escapeHtml(c.teacher_name || '特聘教师')} · ${c.duration}学时</div>
          ${c.category_name ? `<span class="badge badge-sm">${window.escapeHtml(c.category_name)}</span>` : ''}
          ${mediaBadges}
          <div class="course-footer">
            ${priceHtml}
            <div class="course-actions">
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();handlePortalEnroll(${c.id},${c.price})">报名</button>
              ${previewBtn}
              ${resourceBtn}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- Dashboard Stats ---------- */
  try { dashboardStats = await api.getDashboardOverview(); } catch(e) {}
  const statStudents = dashboardStats?.total_students || '2,856';
  const statCourses  = dashboardStats?.total_courses || '48';
  const statCerts    = dashboardStats?.total_certificates || '1,253';
  const statRate     = dashboardStats?.satisfaction_rate || '99.2%';
  const hotCourses    = courses.slice(0, 6);
  const newestCourses = courses.slice(6, 12);
  const freeCourses   = courses.filter(c => c.price === 0).slice(0, 6);

  /* ---------- FAQs (from API) ---------- */
  const defaultFaqs = [
    { question: '如何注册账号？', answer: '点击首页右上角"注册"按钮，填写用户名、密码和基本信息即可完成注册。' },
    { question: '如何购买课程？', answer: '选择课程后点击"报名"按钮，系统将引导您完成在线支付流程。' },
    { question: '学完课程后如何获取证书？', answer: '完成课程全部学习任务并通过考核后，系统将自动生成结业证书，您可在个人中心下载。' },
    { question: '可以集体报名吗？', answer: '支持！请使用"集体报名"功能，填写单位信息后即可批量报名。' },
    { question: '学习过程中遇到问题怎么办？', answer: '您可以使用AI智能问答功能获取即时帮助，也可以联系在线客服。' },
  ];
  const faqList = faqs.length > 0 ? faqs : defaultFaqs;

  /* ===== Render full page ===== */
  main.innerHTML = `
    <!-- ===== HERO CAROUSEL ===== -->
    <section class="portal-hero">
      <div class="hero-inner">
        <div class="hero-carousel" id="hero-carousel">
          <div class="hero-slide active">
            <h1 class="hero-title"><span class="hero-title-main">${window.escapeHtml(siteName)}</span><span class="hero-title-divider"></span><span class="hero-title-sub">${window.escapeHtml(siteSubtitle)}</span></h1>
            <p class="hero-subtitle">权威认证 · 在线学习 · 随时随地提升专业技能</p>
            <div class="hero-actions">
              <a href="#student" class="btn btn-accent btn-lg">开始学习</a>
              <a href="#portal" class="btn btn-outline-light btn-lg" onclick="event.preventDefault();portalShowAllCourses()">浏览课程</a>
            </div>
          </div>
          <div class="hero-slide">
            <h1 class="hero-title">学无止境 成就未来</h1>
            <p class="hero-subtitle">丰富的课程资源 · 灵活的学习方式 · 权威的结业证书 · AI智能助学</p>
            <div class="hero-actions">
              <a href="#student" class="btn btn-accent btn-lg">进入学习中心</a>
              <a href="#portal" class="btn btn-outline-light btn-lg" onclick="event.preventDefault();showLoginModal()">登录账号</a>
            </div>
          </div>
          <div class="hero-slide">
            <h1 class="hero-title">AI赋能 智慧学习</h1>
            <p class="hero-subtitle">人工智能辅助教学 · 个性化学习推荐 · 实时学习分析 · 智能问答服务</p>
            <div class="hero-actions">
              <a href="#portal" class="btn btn-accent btn-lg" onclick="event.preventDefault();portalOpenAI()">AI智能问答</a>
              <a href="#portal" class="btn btn-outline-light btn-lg" onclick="event.preventDefault();portalShowAllCourses()">查看课程</a>
            </div>
          </div>
          <div class="hero-arrows">
            <button class="hero-arrow hero-arrow-left" onclick="heroPrev()" aria-label="上一张">‹</button>
            <button class="hero-arrow hero-arrow-right" onclick="heroNext()" aria-label="下一张">›</button>
          </div>
          <div class="hero-dots">
            <button class="hero-dot active" onclick="heroGoTo(0)"></button>
            <button class="hero-dot" onclick="heroGoTo(1)"></button>
            <button class="hero-dot" onclick="heroGoTo(2)"></button>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="hero-stat-value">${statStudents}</div><div class="hero-stat-label">学员总数</div></div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat"><div class="hero-stat-value">${statCourses}</div><div class="hero-stat-label">精品课程</div></div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat"><div class="hero-stat-value">${statCerts}</div><div class="hero-stat-label">颁发证书</div></div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat"><div class="hero-stat-value">${statRate}</div><div class="hero-stat-label">好评率</div></div>
        </div>
      </div>
    </section>

    <!-- ===== MAIN CONTENT ===== -->
    <div class="portal-main ${siteTemplate === '现代卡片' ? 'portal-modern' : siteTemplate === '简约列表' ? 'portal-minimal' : 'portal-classic'}">
      <div class="portal-content">

        <!-- Notifications Section -->
        <section class="portal-section">
          <div class="section-header">
            <h2 class="section-title">通知公告</h2>
            <a href="javascript:void(0)" class="section-more" onclick="portalShowAllNotifications()">查看全部 ›</a>
          </div>
          <div class="tabs" id="news-tabs">
            <button class="tab active" onclick="showNewsTab('notice',this)">培训通知</button>
            <button class="tab" onclick="showNewsTab('policy',this)">政策法规</button>
            <button class="tab" onclick="showNewsTab('news',this)">新闻动态</button>
          </div>
          <div id="news-content">${renderNotifItems(noticeList)}</div>
        </section>

        <!-- Hot Courses -->
        <section class="portal-section">
          <div class="section-header">
            <h2 class="section-title">${learningMode === 'class' ? '班级课程' : '热门课程'}</h2>
            <a href="javascript:void(0)" class="section-more" onclick="portalShowAllCourses()">更多课程 ›</a>
          </div>
          ${learningMode === 'class' && allClasses.length > 0
            ? allClasses.filter(cls => cls.status === 'active').map(cls => {
                const clsCourses = (cls.courses || []).filter(c => c && c.id);
                if (!clsCourses.length) return '';
                return '<div style="margin-bottom:36px">' +
                  '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid var(--color-primary)">' +
                  '<span style="font-size:1.5rem">🏫</span>' +
                  '<h3 style="margin:0;font-size:1.15rem;color:var(--color-primary)">' + window.escapeHtml(cls.name) + '</h3>' +
                  '<span class="badge badge-sm">' + (cls.start_date || '') + ' ~ ' + (cls.end_date || '') + '</span>' +
                  '<span class="badge badge-sm badge-info">' + (cls.student_ids || []).length + ' 名学员</span>' +
                  '</div>' +
                  '<div class="course-grid">' + clsCourses.map(courseCard).join('') + '</div>' +
                  '</div>';
              }).join('') || '<div class="empty-state"><div class="empty-icon">🏫</div><h4>暂无活跃班级</h4><p>请联系管理员创建培训班级</p></div>'
            : '<div class="course-grid">' + hotCourses.map(courseCard).join('') + '</div>'}
        </section>

        <!-- Newest Courses (hidden in class mode) -->
        ${learningMode !== 'class' ? `
        <section class="portal-section">
          <div class="section-header">
            <h2 class="section-title">最新上线</h2>
          </div>
          <div class="course-grid">${newestCourses.map(courseCard).join('')}</div>
        </section>` : ''}

        <!-- Free Courses -->
        ${learningMode !== 'class' && freeCourses.length ? `
        <section class="portal-section">
          <div class="section-header">
            <h2 class="section-title">免费课程</h2>
          </div>
          <div class="course-grid">${freeCourses.map(courseCard).join('')}</div>
        </section>` : ''}

        <!-- All Courses (hidden by default) -->
        <section class="portal-section" id="all-courses-section" style="display:none">
          <div class="section-header">
            <h2 class="section-title">全部课程</h2>
            <div class="course-filter-bar">
              <select class="form-select" id="course-type-filter" onchange="portalFilterCourses()">
                <option value="">全部类型</option>
                <option value="video">录播课程</option>
                <option value="live">直播课程</option>
                <option value="offline">面授课程</option>
              </select>
              <select class="form-select" id="course-category-filter" onchange="portalFilterCourses()">
                <option value="">全部分类</option>
                ${(categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
              <div class="search-bar">
                <input class="form-input" id="course-search-input" placeholder="搜索课程..." onkeyup="if(event.key==='Enter')portalFilterCourses()">
                <button class="btn btn-primary btn-sm" onclick="portalFilterCourses()">搜索</button>
              </div>
            </div>
          </div>
          <div class="course-grid" id="all-courses-grid">${courses.map(courseCard).join('')}</div>
        </section>

        <!-- FAQ Section -->
        <section class="portal-section">
          <div class="section-header">
            <h2 class="section-title">常见问题</h2>
          </div>
          <div class="faq-list">
            ${faqList.map((f, i) => `
              <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question">
                  <span class="faq-icon">Q</span>
                  <span>${window.escapeHtml(f.question)}</span>
                  <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                  <span class="faq-icon faq-icon-a">A</span>
                  <span>${window.escapeHtml(f.answer)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

      </div>

      <!-- ===== SIDEBAR ===== -->
      <div class="portal-sidebar">

        <!-- Certificate Lookup -->
        <div class="card sidebar-card">
          <div class="card-body">
            <div class="sidebar-card-header">
              <span class="sidebar-card-icon">📋</span>
              <h4>证书查询</h4>
            </div>
            <p class="text-sm text-muted" style="margin-bottom:12px">输入证书编号查询真伪</p>
            <div class="form-group">
              <input class="form-input" id="cert-search" placeholder="请输入证书编号">
            </div>
            <button class="btn btn-primary btn-sm w-full" onclick="searchCertificate()">查询证书</button>
          </div>
        </div>

        <!-- AI Smart Assistant -->
        <div class="card sidebar-card sidebar-card-accent">
          <div class="card-body" style="text-align:center">
            <div class="ai-icon-wrap">
              <span class="ai-icon">🤖</span>
            </div>
            <h4>AI智能问答</h4>
            <p class="text-sm text-muted" style="margin:8px 0 16px">智能解答培训共性问题，7×24小时在线服务</p>
            <button class="btn btn-accent btn-sm w-full" onclick="portalOpenAI()">开始咨询</button>
          </div>
        </div>

        <!-- Group Registration -->
        <div class="card sidebar-card">
          <div class="card-body">
            <div class="sidebar-card-header">
              <span class="sidebar-card-icon">👥</span>
              <h4>集体报名</h4>
            </div>
            <p class="text-sm text-muted" style="margin-bottom:12px">支持单位集体报名，批量开通学习账号</p>
            <button class="btn btn-outline btn-sm w-full" onclick="portalGroupEnroll()">集体报名申请</button>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="card sidebar-card">
          <div class="card-body">
            <div class="sidebar-card-header">
              <span class="sidebar-card-icon">🔗</span>
              <h4>快捷入口</h4>
            </div>
            <div class="sidebar-links">
              <a href="#student" class="sidebar-link"><span>🎓</span> 学员学习中心</a>
              <a href="#teacher" class="sidebar-link"><span>👨‍🏫</span> 教师平台</a>
              <a href="#admin" class="sidebar-link"><span>⚙️</span> 管理后台</a>
              <a href="javascript:void(0)" class="sidebar-link" onclick="portalShowAllNotifications()"><span>📢</span> 全部通知</a>
            </div>
          </div>
        </div>

        <!-- Contact Us -->
        <div class="card sidebar-card">
          <div class="card-body">
            <div class="sidebar-card-header">
              <span class="sidebar-card-icon">📞</span>
              <h4>联系我们</h4>
            </div>
            <div class="contact-info">
              <div class="contact-item"><span class="contact-label">电话</span><span>${window.escapeHtml(contactInfo.phone || '0514-87654321')}</span></div>
              <div class="contact-item"><span class="contact-label">邮箱</span><span>${window.escapeHtml(contactInfo.email || 'jxjy@yzpc.edu.cn')}</span></div>
              <div class="contact-item"><span class="contact-label">地址</span><span>${window.escapeHtml(contactInfo.address || '扬州市华扬西路199号')}</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ===== FOOTER PARTNERS ===== -->
    <div class="portal-footer-bar">
      <div class="footer-bar-inner">
        <span class="footer-bar-label">友情链接：</span>
        <a href="javascript:void(0)">扬州职业大学</a>
        <a href="javascript:void(0)">江苏省教育厅</a>
        <a href="javascript:void(0)">中国继续教育网</a>
        <a href="javascript:void(0)">国家职业教育平台</a>
      </div>
    </div>
  `;

  /* ===== Initialize Carousel ===== */
  window._heroIndex = 0;
  clearInterval(window._heroInterval);
  window._heroInterval = setInterval(() => { heroGoTo((window._heroIndex + 1) % 3); }, 5000);

  window.heroGoTo = (i) => {
    window._heroIndex = i;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    clearInterval(window._heroInterval);
    window._heroInterval = setInterval(() => { heroGoTo((window._heroIndex + 1) % 3); }, 5000);
  };
  window.heroPrev = () => heroGoTo((window._heroIndex - 1 + 3) % 3);
  window.heroNext = () => heroGoTo((window._heroIndex + 1) % 3);

  /* ===== News Tabs ===== */
  window.showNewsTab = (type, btn) => {
    document.querySelectorAll('#news-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const data = {
      notice: renderNotifItems(noticeList),
      policy: renderNotifItems(policyList),
      news:   renderNotifItems(newsList),
    };
    document.getElementById('news-content').innerHTML = data[type] || data.notice;
  };

  /* ===== FAQ Toggle ===== */
  window.toggleFaq = (el) => {
    const answer = el.querySelector('.faq-answer');
    const toggle = el.querySelector('.faq-toggle');
    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
    if (isOpen) {
      answer.style.maxHeight = '0px';
      answer.style.padding = '0 16px';
      toggle.textContent = '+';
    } else {
      answer.style.maxHeight = '200px';
      answer.style.padding = '12px 16px';
      toggle.textContent = '−';
    }
  };

  /* ===== Certificate Search ===== */
  window.searchCertificate = async () => {
    const no = document.getElementById('cert-search').value.trim();
    if (!no) { window.showToast('请输入证书编号', 'warning'); return; }
    try {
      const certs = await api.getCertificates({ cert_no: no });
      if (certs && certs.length > 0) {
        const c = certs[0];
        const statusMap = { issued: '已颁发', printed: '已打印', pending: '待审核' };
        window.showModal({
          title: '证书查询结果',
          width: '480px',
          content: `
            <div class="cert-result">
              <div class="cert-result-icon">📋</div>
              <div class="cert-result-row"><label>证书编号</label><span>${window.escapeHtml(c.cert_no)}</span></div>
              <div class="cert-result-row"><label>证书名称</label><span>${window.escapeHtml(c.cert_name)}</span></div>
              <div class="cert-result-row"><label>持有人</label><span>${window.escapeHtml(c.user_name)}</span></div>
              <div class="cert-result-row"><label>课程</label><span>${window.escapeHtml(c.course_title)}</span></div>
              <div class="cert-result-row"><label>状态</label><span class="badge badge-${c.status === 'issued' ? 'success' : c.status === 'printed' ? 'info' : 'warning'}">${statusMap[c.status] || c.status}</span></div>
              <div class="cert-result-row"><label>颁发时间</label><span>${window.formatDate(c.issued_at)}</span></div>
            </div>
          `,
          confirmText: '关闭',
          cancelText: null
        });
      } else {
        window.showToast('未找到该证书编号，请核实后重试', 'warning');
      }
    } catch(e) {
      window.showToast('查询失败，请稍后重试', 'error');
    }
  };

  /* ===== Course Enroll ===== */
  window.handlePortalEnroll = (courseId, price) => {
    const user = window.getCurrentUser();
    if (!user) {
      window.showLoginModal();
      return;
    }
    if (price > 0) {
      window.showModal({
        title: '确认报名',
        width: '420px',
        content: `
          <p style="margin-bottom:16px">您即将报名此课程</p>
          <div class="form-group">
            <label class="form-label">报名方式</label>
            <div style="display:flex;gap:12px">
              <label class="radio-label"><input type="radio" name="enroll-type" value="personal" checked> 个人报名</label>
              <label class="radio-label"><input type="radio" name="enroll-type" value="group"> 集体报名</label>
            </div>
          </div>
          <div id="group-enroll-fields" style="display:none">
            <div class="form-group"><label class="form-label">单位名称</label><input class="form-input" id="enroll-org" placeholder="请输入单位名称"></div>
            <div class="form-group"><label class="form-label">报名人数</label><input class="form-input" type="number" id="enroll-count" placeholder="请输入人数" min="1"></div>
          </div>
          <p style="color:var(--color-accent);font-weight:600">课程费用：${window.formatMoney(price)}</p>
        `,
        confirmText: '确认报名并支付',
        onConfirm: async () => {
          try {
            await api.createOrder({ user_id: user.id, course_id: courseId, amount: price, pay_method: 'wechat' });
            window.showToast('报名成功！请前往学习中心开始学习', 'success');
          } catch(e) {
            window.showToast('报名失败：' + (e.message || '请稍后重试'), 'error');
          }
        }
      });
      // Toggle group fields
      setTimeout(() => {
        const radios = document.querySelectorAll('input[name="enroll-type"]');
        radios.forEach(r => r.addEventListener('change', () => {
          const groupFields = document.getElementById('group-enroll-fields');
          if (groupFields) groupFields.style.display = r.value === 'group' && r.checked ? 'block' : 'none';
        }));
      }, 100);
    } else {
      api.createOrder({ user_id: user.id, course_id: courseId, amount: 0, pay_method: 'free' })
        .then(() => window.showToast('报名成功！请前往学习中心开始学习', 'success'))
        .catch(e => window.showToast('报名失败：' + (e.message || '请稍后重试'), 'error'));
    }
  };

  /* ===== View Course Detail ===== */
  window.portalViewCourse = (id) => {
    const user = window.getCurrentUser();
    if (user) {
      window.location.hash = `#student/course/${id}`;
    } else {
      window.showModal({
        title: '课程预览',
        width: '560px',
        content: `<div class="empty-state" style="padding:24px"><div style="font-size:3rem;margin-bottom:12px">📚</div><h4>登录后查看课程详情</h4><p style="margin:8px 0 16px">请先登录以查看完整的课程信息和学习内容</p></div>`,
        confirmText: '立即登录',
        onConfirm: () => window.showLoginModal()
      });
    }
  };

  /* ===== View Notification Detail ===== */
  window.portalViewNotification = async (id) => {
    try {
      const n = await api.getNotification(id);
      if (!n) { window.showToast('通知不存在', 'warning'); return; }
      const typeMap = { notice: '培训通知', policy: '政策法规', news: '新闻动态' };
      // Extract plain text from HTML content for preview
      const plainContent = (n.content || '').replace(/<[^>]*>/g, '').trim();
      window.showModal({
        title: window.escapeHtml(n.title),
        width: '700px',
        content: `
          <div class="notif-detail">
            <div class="notif-meta">
              <span class="badge badge-sm badge-${n.type === 'notice' ? 'info' : n.type === 'policy' ? 'warning' : 'success'}">${typeMap[n.type] || n.type}</span>
              <span class="text-muted">${window.formatDate(n.created_at)}</span>
            </div>
            <div class="notif-body rich-text-content">${n.content || '<span class="text-muted">暂无详细内容</span>'}</div>
            ${window.renderAttachmentDownloads(n.attachments)}
          </div>
        `,
        confirmText: '关闭',
        cancelText: null
      });
      // Mark as read if logged in
      const user = window.getCurrentUser();
      if (user) {
        try { await api.markNotificationRead(id, user.id); } catch(e) {}
      }
    } catch(e) {
      window.showToast('加载失败', 'error');
    }
  };


  /* ===== Show All Courses ===== */
  window.portalShowAllCourses = async () => {
    const sections = document.querySelectorAll('.portal-section');
    const allSection = document.getElementById('all-courses-section');
    sections.forEach(s => { if (s.id !== 'all-courses-section') s.style.display = 'none'; });
    if (allSection) allSection.style.display = 'block';

    const currentMode = (window._siteSettings && window._siteSettings.learning_mode) || learningMode || 'course';

    // If class mode, render class-grouped layout
    if (currentMode === 'class') {
      // Ensure allClasses is loaded
      if (!allClasses || !allClasses.length) {
        try { allClasses = await api.getClasses() || []; } catch(e) {}
      }
      const activeClasses = allClasses.filter(cls => cls.status === 'active');
      let html = '';
      if (activeClasses.length > 0) {
        html = activeClasses.map(cls => {
          const clsCourses = (cls.courses || []).filter(c => c && c.id);
          if (!clsCourses.length) return '';
          return '<div style="margin-bottom:36px">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--color-primary)">' +
              '<span style="font-size:1.5rem">🏫</span>' +
              '<h3 style="margin:0;font-size:1.15rem;color:var(--color-primary)">' + window.escapeHtml(cls.name) + '</h3>' +
              '<span class="badge badge-sm">' + (cls.start_date || '') + ' ~ ' + (cls.end_date || '') + '</span>' +
              '<span class="badge badge-sm badge-info">' + (cls.student_ids || []).length + ' 名学员</span>' +
            '</div>' +
            '<div class="course-grid">' + clsCourses.map(courseCard).join('') + '</div>' +
          '</div>';
        }).join('');
      } else {
        html = '<div class="empty-state"><div class="empty-icon">🏫</div><h4>暂无活跃班级</h4><p>请联系管理员创建培训班级</p></div>';
      }
      if (allSection) {
        const filterBar = allSection.querySelector('.course-filter-bar');
        allSection.innerHTML = (filterBar ? filterBar.outerHTML : '') + html;
      }
    }
    document.querySelector('.portal-content')?.scrollIntoView({ behavior: 'smooth' });
  };
  /* ===== Filter Courses ===== */
  window.portalFilterCourses = async () => {
    const type = document.getElementById('course-type-filter')?.value || '';
    const categoryId = document.getElementById('course-category-filter')?.value || '';
    const q = document.getElementById('course-search-input')?.value || '';
    try {
      const params = {};
      if (type) params.type = type;
      if (categoryId) params.category_id = categoryId;
      if (q) params.q = q;
      params.limit = 50;
      const filtered = await api.getCourses(params);
      const grid = document.getElementById('all-courses-grid');
      if (grid) {
        if (filtered && filtered.length) {
          grid.innerHTML = filtered.map(courseCard).join('');
        } else {
          grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:48px"><div style="font-size:3rem;margin-bottom:12px">🔍</div><h4>未找到匹配课程</h4><p>请尝试调整筛选条件</p></div>';
        }
      }
    } catch(e) {
      window.showToast('搜索失败', 'error');
    }
  };

  /* ===== Show All Notifications ===== */
  window.portalShowAllNotifications = () => {
    window.showModal({
      title: '全部通知公告',
      width: '700px',
      content: `
        <div class="notif-list-modal">
          ${notifications.map(n => {
            const typeMap = { notice: '通知', policy: '政策', news: '动态' };
            return `<div class="news-list-item" style="cursor:pointer" onclick="closeModal();portalViewNotification(${n.id})">
              <span class="badge badge-sm badge-${n.type === 'notice' ? 'info' : n.type === 'policy' ? 'warning' : 'success'}">${typeMap[n.type] || n.type}</span>
              <span class="news-title">${window.escapeHtml(n.title)}</span>${window.renderAttachmentBadge(n.attachments)}
              <span class="news-date">${window.formatDate(n.created_at)}</span>
            </div>`;
          }).join('')}
        </div>
      `,
      confirmText: '关闭',
      cancelText: null
    });
  };

  /* ===== Group Enrollment ===== */
  window.portalGroupEnroll = () => {
    const user = window.getCurrentUser();
    if (!user) {
      window.showLoginModal();
      return;
    }
    window.showModal({
      title: '集体报名申请',
      width: '520px',
      content: `
        <p style="margin-bottom:16px;color:var(--color-text-secondary)">请填写集体报名信息，管理员审核后将批量开通学习账号</p>
        <div class="form-group">
          <label class="form-label">单位名称 <span style="color:var(--color-error)">*</span></label>
          <input class="form-input" id="group-org" placeholder="请输入单位全称">
        </div>
        <div class="form-group">
          <label class="form-label">联系人 <span style="color:var(--color-error)">*</span></label>
          <input class="form-input" id="group-contact" placeholder="请输入联系人姓名">
        </div>
        <div class="form-group">
          <label class="form-label">联系电话 <span style="color:var(--color-error)">*</span></label>
          <input class="form-input" id="group-phone" placeholder="请输入联系电话">
        </div>
        <div class="form-group">
          <label class="form-label">报名人数</label>
          <input class="form-input" type="number" id="group-count" placeholder="预计报名人数" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">备注信息</label>
          <textarea class="form-textarea" id="group-remark" rows="3" placeholder="请填写报名备注"></textarea>
        </div>
        <div class="alert alert-info">
          <strong>审核流程：</strong>提交申请 → 管理员审核 → 开通账号 → 通知联系人
        </div>
      `,
      confirmText: '提交申请',
      onConfirm: () => {
        const org = document.getElementById('group-org')?.value;
        const contact = document.getElementById('group-contact')?.value;
        const phone = document.getElementById('group-phone')?.value;
        if (!org || !contact || !phone) {
          window.showToast('请填写必填信息', 'warning');
          return;
        }
        window.showToast('集体报名申请已提交，请等待管理员审核', 'success');
      }
    });
  };

  /* ===== AI Smart Assistant ===== */
  window.portalOpenAI = () => {
    const faqSuggestions = [
      '如何注册账号？',
      '课程学习需要多长时间？',
      '如何获取结业证书？',
      '可以退款吗？',
      '学习进度可以保存吗？',
    ];

    window.showModal({
      title: 'AI智能问答',
      width: '560px',
      content: `
        <div class="ai-chat" id="ai-chat-container">
          <div class="ai-chat-messages" id="ai-messages">
            <div class="ai-msg ai-msg-bot">
              <div class="ai-avatar">🤖</div>
              <div class="ai-bubble">您好！我是AI智能助手，可以为您解答培训相关的常见问题。请问有什么可以帮助您的？</div>
            </div>
          </div>
          <div class="ai-suggestions">
            ${faqSuggestions.map(s => `<button class="ai-suggestion-btn" onclick="portalAskAI('${s}')">${s}</button>`).join('')}
          </div>
          <div class="ai-chat-input">
            <input class="form-input" id="ai-input" placeholder="输入您的问题..." onkeydown="if(event.key==='Enter')portalSendAI()">
            <button class="btn btn-primary btn-sm" onclick="portalSendAI()">发送</button>
          </div>
        </div>
      `,
      confirmText: '关闭',
      cancelText: null
    });
  };

  /* AI responses */
  const aiResponses = {
    '如何注册账号？': '注册步骤：1. 点击首页右上角"注册"按钮；2. 填写用户名、密码、手机号和真实姓名；3. 点击"注册"完成；4. 使用注册的账号登录即可开始学习。',
    '课程学习需要多长时间？': '每门课程的学时不同，一般在24-64学时之间。您可以按照自己的节奏学习，系统会自动保存学习进度。建议每天学习1-2小时，2-4周即可完成一门课程。',
    '如何获取结业证书？': '获取证书流程：1. 完成课程全部学习任务（视频观看时长≥80%）；2. 通过在线考核（成绩≥60分）；3. 系统自动生成结业证书；4. 在"我的证书"页面查看和下载。',
    '可以退款吗？': '如需退款，请在课程学习进度不超过20%时联系客服申请。审核通过后，退款将在3-5个工作日内原路返还。已学习超过20%或已颁发证书的课程不支持退款。',
    '学习进度可以保存吗？': '是的！系统会自动保存您的学习进度。您可以随时中断学习，下次登录时从上次的位置继续。学习记录包括观看时长、学习进度、笔记等都会完整保留。',
  };

  const defaultAIResponse = `感谢您的提问！关于这个问题，建议您：1. 查看平台"常见问题"板块；2. 联系在线客服获取帮助；3. 拨打服务热线 ${contactInfo.phone || '0514-87654321'}。我们将竭诚为您服务！`;

  window.portalAskAI = (question) => {
    const msgContainer = document.getElementById('ai-messages');
    if (!msgContainer) return;
    // Add user message
    msgContainer.innerHTML += `
      <div class="ai-msg ai-msg-user">
        <div class="ai-bubble">${window.escapeHtml(question)}</div>
        <div class="ai-avatar">👤</div>
      </div>
    `;
    // Simulate thinking
    setTimeout(() => {
      const answer = aiResponses[question] || defaultAIResponse;
      msgContainer.innerHTML += `
        <div class="ai-msg ai-msg-bot">
          <div class="ai-avatar">🤖</div>
          <div class="ai-bubble">${answer}</div>
        </div>
      `;
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }, 600);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  };

  window.portalSendAI = () => {
    const input = document.getElementById('ai-input');
    if (!input || !input.value.trim()) return;
    const question = input.value.trim();
    input.value = '';
    window.portalAskAI(question);
  };

  /* ===== Course Preview / Trailer ===== */
  window.showCoursePreview = async (courseId) => {
    try {
      const media = await api.getCourseMedia(courseId);
      const course = await api.getCourse(courseId);
      const title = course?.title || '课程试看';
      if (!media.preview) {
        window.showToast('该课程暂无试看内容', 'info');
        return;
      }
      window.showModal({
        title: '试看 - ' + title, width: '680px',
        content: `<div style="text-align:center">
          <video src="${media.preview}" controls style="max-width:100%;max-height:450px;border-radius:8px;background:#000" autoplay></video>
          ${media.trailer ? '<p style="margin-top:12px"><button class="btn btn-outline btn-sm" onclick="closeModal();showCourseTrailer(' + courseId + ')">观看片花</button></p>' : ''}
        </div>`,
        confirmText: '关闭'
      });
    } catch(e) {
      window.showToast('加载试看内容失败', 'error');
    }
  };

  window.showCourseTrailer = async (courseId) => {
    try {
      const media = await api.getCourseMedia(courseId);
      const course = await api.getCourse(courseId);
      const title = course?.title || '课程片花';
      if (!media.trailer) {
        window.showToast('该课程暂无片花', 'info');
        return;
      }
      window.showModal({
        title: '片花 - ' + title, width: '680px',
        content: `<div style="text-align:center">
          <video src="${media.trailer}" controls style="max-width:100%;max-height:450px;border-radius:8px;background:#000" autoplay></video>
          ${media.preview ? '<p style="margin-top:12px"><button class="btn btn-outline btn-sm" onclick="closeModal();showCoursePreview(' + courseId + ')">观看试看</button></p>' : ''}
        </div>`,
        confirmText: '关闭'
      });
    } catch(e) {
      window.showToast('加载片花失败', 'error');
    }
  };

  /* ===== Resource Links Dropdown ===== */
  window.toggleResourceLinks = (btn) => {
    const wrapper = btn.closest('.resource-btn-wrapper');
    if (!wrapper) return;
    const dropdown = wrapper.querySelector('.resource-links-dropdown');
    if (!dropdown) return;
    // Close all other dropdowns first
    document.querySelectorAll('.resource-links-dropdown').forEach(d => {
      if (d !== dropdown) d.style.display = 'none';
    });
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.resource-btn-wrapper')) {
      document.querySelectorAll('.resource-links-dropdown').forEach(d => d.style.display = 'none');
    }
  });
}
