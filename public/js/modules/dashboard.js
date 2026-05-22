import { api } from '../api.js';

export async function renderDashboard() {
  // Find the admin-content area created by admin.js
  let adminContent = document.querySelector('.admin-content');
  if (!adminContent) {
    // Fallback: create full layout if called directly
    const main = document.getElementById('app-main');
    if (main) {
      main.innerHTML = '<div class="admin-layout"><nav class="sidebar"></nav><div class="admin-content"></div></div>';
      adminContent = document.querySelector('.admin-content');
    }
  }
  if (!adminContent) {
    console.error('Dashboard: cannot find .admin-content element');
    return;
  }

  let overview = { totalStudents: 2856, totalCourses: 48, newStudentsThisMonth: 126, totalRevenue: 356800, totalCertificates: 1253 };
  let trends = { monthlyStudents: [45, 52, 38, 65, 48], monthlyCertificates: [32, 28, 41, 35, 52], monthlyHours: [1820, 2100, 1650, 2450, 1980], monthlyRevenue: [28000, 32000, 25000, 38000, 31000] };

  try {
    const o = await api.getDashboardOverview();
    if (o) Object.assign(overview, o);
    const t = await api.getDashboardTrends();
    if (t) trends = t;
  } catch (e) { console.log('Dashboard data fallback:', e.message); }

  adminContent.innerHTML = `
    <div class="admin-content-header"><h2>数据看板</h2><span class="text-sm text-muted">实时更新</span></div>
    <div class="data-cards-grid">
      <div class="stat-card"><div class="stat-value">${overview.totalStudents.toLocaleString()}</div><div class="stat-label">学员总数</div><div class="stat-change text-success">▲ 12% 较上月</div></div>
      <div class="stat-card"><div class="stat-value">${overview.totalCourses}</div><div class="stat-label">课程总数</div><div class="stat-change text-muted">正常运行</div></div>
      <div class="stat-card"><div class="stat-value">${overview.newStudentsThisMonth}</div><div class="stat-label">本月新增学员</div><div class="stat-change text-success">▲ 8%</div></div>
      <div class="stat-card"><div class="stat-value">${window.formatMoney(overview.totalRevenue)}</div><div class="stat-label">总收入</div><div class="stat-change text-success">▲ 15%</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><h4>月度新增学员趋势</h4><div class="chart-wrap"><canvas id="chart-students"></canvas></div></div>
      <div class="chart-card"><h4>月度生成证书趋势</h4><div class="chart-wrap"><canvas id="chart-certificates"></canvas></div></div>
      <div class="chart-card"><h4>月度学习总学时趋势</h4><div class="chart-wrap"><canvas id="chart-hours"></canvas></div></div>
      <div class="chart-card"><h4>月度缴费金额趋势</h4><div class="chart-wrap"><canvas id="chart-revenue"></canvas></div></div>
    </div>
    <div class="dashboard-bottom">
      <div class="card"><div class="card-header"><h4>最新订单</h4></div><div class="card-body" id="recent-orders">加载中...</div></div>
      <div class="card"><div class="card-header"><h4>最新学员</h4></div><div class="card-body" id="recent-students">加载中...</div></div>
    </div>
  `;

  // Init charts after DOM update
  setTimeout(() => {
    const months = ['1月', '2月', '3月', '4月', '5月'];
    const chartConfig = (type, label, data, color) => ({
      type, data: { labels: months, datasets: [{ label, data, borderColor: color, backgroundColor: type === 'bar' ? color + '30' : color + '15', fill: type === 'line', tension: 0.4, pointRadius: 4, pointBackgroundColor: color }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: '#E5E0D8' } }, x: { grid: { display: false } } } }
    });
    try {
      new Chart(document.getElementById('chart-students'), chartConfig('line', '新增学员', trends.monthlyStudents, '#1E4D8C'));
      new Chart(document.getElementById('chart-certificates'), chartConfig('line', '生成证书', trends.monthlyCertificates, '#C8842A'));
      new Chart(document.getElementById('chart-hours'), chartConfig('bar', '学习总学时', trends.monthlyHours, '#2D8C4E'));
      new Chart(document.getElementById('chart-revenue'), chartConfig('bar', '缴费金额', trends.monthlyRevenue, '#D4782A'));
    } catch (e) { console.log('Chart init error:', e); }
  }, 200);

  // Load recent data
  try {
    const orders = await api.getOrders({});
    const rOrders = orders.slice(0, 5).map(o => `<tr><td>${o.id}</td><td>${window.escapeHtml(o.user_name || '')}</td><td>${window.formatMoney(o.amount)}</td><td><span class="badge ${o.status === 'paid' ? 'badge-success' : o.status === 'unpaid' ? 'badge-warning' : 'badge-error'}">${o.status === 'paid' ? '已支付' : o.status === 'unpaid' ? '未支付' : '已退款'}</span></td><td>${window.formatDate(o.created_at)}</td></tr>`).join('');
    document.getElementById('recent-orders').innerHTML = `<table class="table"><thead><tr><th>ID</th><th>学员</th><th>金额</th><th>状态</th><th>时间</th></tr></thead><tbody>${rOrders}</tbody></table>`;
  } catch (e) { document.getElementById('recent-orders').innerHTML = '<div class="empty-state"><p>暂无数据</p></div>'; }

  try {
    const users = await api.getUsers({ role: 'student' });
    const rUsers = users.slice(0, 5).map(u => `<tr><td>${window.escapeHtml(u.realname)}</td><td>${u.phone || '-'}</td><td>${u.org_name || '-'}</td><td>${window.formatDate(u.created_at)}</td></tr>`).join('');
    document.getElementById('recent-students').innerHTML = `<table class="table"><thead><tr><th>姓名</th><th>手机</th><th>机构</th><th>注册时间</th></tr></thead><tbody>${rUsers}</tbody></table>`;
  } catch (e) { document.getElementById('recent-students').innerHTML = '<div class="empty-state"><p>暂无数据</p></div>'; }
}
