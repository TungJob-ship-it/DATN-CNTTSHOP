// =======================================
// 1. HELPER
// =======================================
function fmtVND(n) {
    if (!n || n == 0) return '0đ';
    n = parseFloat(n);
    if (n >= 1000000000) return (n/1000000000).toFixed(1) + ' tỷ';
    if (n >= 1000000)    return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000)       return (n/1000).toFixed(0) + 'K';
    return n.toLocaleString('vi-VN') + 'đ';
}
function statusBadge(s) {
    const m = {
        pending:    ['badge-yellow','Chờ xác nhận'],
        confirmed:  ['badge-blue',  'Đã xác nhận'],
        processing: ['badge-blue',  'Đang xử lý'],
        shipped:    ['badge-blue',  'Đang giao'],
        delivered:  ['badge-green', 'Đã giao'],
        cancelled:  ['badge-red',   'Đã huỷ'],
        refunded:   ['badge-gray',  'Hoàn hàng']
    };
    const [c,l] = m[s] || ['badge-gray', s];
    return `<span class="badge-meta ${c}">${l}</span>`;
}
function exportCSV(filename, headers, rows) {
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename + '_' + new Date().toLocaleDateString('vi-VN').replace(/\//g,'-') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =======================================
// 2. THÔNG BÁO (khai báo sớm vì DOMContentLoaded cần)
// =======================================
var notifData = [
    { id:1, title:'Flash Sale cuối tuần — giảm đến 30%', content:'Giảm giá toàn bộ sản phẩm lên đến 30%', type:'Khuyến mãi', target:'Tất cả khách hàng', time:'01/06/2025 09:00', status:'sent' },
    { id:2, title:'Bảo trì hệ thống 00:00 – 02:00 ngày 05/06', content:'Hệ thống sẽ tạm ngưng để nâng cấp', type:'Cảnh báo', target:'Tất cả', time:'04/06/2025 20:00', status:'scheduled' }
];
var notifNextId = 3;
var isEditingNotif = false; // biến cờ để biết đang sửa hay gửi mới
var ntIcons = {'Thông tin':'bi-info-circle','Khuyến mãi':'bi-megaphone','Cảnh báo':'bi-exclamation-triangle','Quan trọng':'bi-bell'};
var ntBgc   = {'Thông tin':'#e7f3ff','Khuyến mãi':'#d4edda','Cảnh báo':'#fff3cd','Quan trọng':'#f8d7da'};
var ntIc    = {'Thông tin':'#1877f2','Khuyến mãi':'#155724','Cảnh báo':'#856404','Quan trọng':'#721c24'};

function renderNotifList() {
    var list = document.getElementById('notifList');
    if (!list) return;
    if (notifData.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#65676b;">Chưa có thông báo nào</div>';
        return;
    }
    list.innerHTML = notifData.map(function(n) {
        return '<div class="notif-item" id="notif-' + n.id + '">' +
            '<div class="notif-icon" style="background:' + (ntBgc[n.type]||'#e7f3ff') + ';color:' + (ntIc[n.type]||'#1877f2') + ';">' +
            '<i class="bi ' + (ntIcons[n.type]||'bi-bell') + '"></i></div>' +
            '<div class="notif-content" style="flex:1;">' +
            '<div class="notif-title">' + n.title + '</div>' +
            // Hiển thị nội dung nếu có
            (n.content ? '<div style="font-size:12px;color:#444;margin-top:2px;">' + n.content + '</div>' : '') +
            '<div class="notif-meta">' + n.type + ' · ' + n.target + ' · ' + n.time + '</div></div>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
            '<span class="badge-meta badge-' + (n.status==='sent'?'green':'blue') + '">' + (n.status==='sent'?'Đã gửi':'Lên lịch') + '</span>' +
            '<button class="btn-outline-meta" style="padding:4px 8px;" onclick="editNotif(' + n.id + ')" title="Sửa"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn-outline-meta" style="padding:4px 8px;color:#fa3e3e;border-color:#fcc;" onclick="deleteNotif(' + n.id + ')" title="Xóa"><i class="bi bi-trash"></i></button>' +
            '</div></div>';
    }).join('');
}

function resetNotifForm() {
    document.getElementById('ntTitle').value   = '';
    document.getElementById('ntContent').value = '';
    document.getElementById('ntTitle').removeAttribute('data-editing-id');
    isEditingNotif = false;
    var btn = document.getElementById('btnSendNotif');
    if (btn) btn.innerHTML = '<i class="bi bi-send"></i> Gửi thông báo';
    var cancel = document.getElementById('btnCancelNotif');
    if (cancel) cancel.style.display = 'none';
}

function sendNotif() {
    var title   = document.getElementById('ntTitle').value.trim();
    var content = document.getElementById('ntContent').value.trim();
    if (!title) { alert('Vui lòng nhập tiêu đề'); return; }
    var target = document.getElementById('ntTarget').value;
    var type   = document.getElementById('ntType').value;
    var sched  = document.getElementById('ntTime').value === 'Lên lịch';
    var now    = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    var editId = document.getElementById('ntTitle').getAttribute('data-editing-id');

    if (editId && isEditingNotif) {
        // Chế độ SỬA — chỉ cập nhật, không tạo mới
        var idx = notifData.findIndex(function(n){ return n.id == editId; });
        if (idx > -1) {
            notifData[idx] = Object.assign({}, notifData[idx], {
                title:title, content:content, type:type, target:target,
                status:sched?'scheduled':'sent'
            });
        }
        resetNotifForm();
    } else {
        // Chế độ GỬI MỚI
        notifData.unshift({
            id:notifNextId++, title:title, content:content,
            type:type, target:target, time:now,
            status:sched?'scheduled':'sent'
        });
        resetNotifForm();
    }
    renderNotifList();
}

function editNotif(id) {
    var n = notifData.find(function(n){ return n.id === id; });
    if (!n) return;
    document.getElementById('ntTitle').value   = n.title;
    document.getElementById('ntContent').value = n.content || '';
    document.getElementById('ntType').value    = n.type;
    document.getElementById('ntTarget').value  = n.target;
    document.getElementById('ntTitle').setAttribute('data-editing-id', id);
    isEditingNotif = true;
    var btn = document.getElementById('btnSendNotif');
    if (btn) btn.innerHTML = '<i class="bi bi-save"></i> Cập nhật thông báo';
    var cancel = document.getElementById('btnCancelNotif');
    if (cancel) cancel.style.display = 'inline-flex';
    document.getElementById('ntTitle').scrollIntoView({ behavior:'smooth' });
    document.getElementById('ntTitle').focus();
}

function cancelEditNotif() {
    resetNotifForm();
}

function deleteNotif(id) {
    if (!confirm('Xóa thông báo này?')) return;
    notifData = notifData.filter(function(n){ return n.id !== id; });
    // Nếu đang sửa thông báo này thì reset form
    var editId = document.getElementById('ntTitle').getAttribute('data-editing-id');
    if (editId == id) resetNotifForm();
    renderNotifList();
}

function exportNotifs() {
    var rows = notifData.map(function(n){ return [n.title, n.content||'', n.type, n.target, n.time, n.status==='sent'?'Đã gửi':'Lên lịch']; });
    exportCSV('lich_su_thong_bao', ['Tiêu đề','Nội dung','Loại','Đối tượng','Thời gian','Trạng thái'], rows);
}

// =======================================
// 3. KHỞI TẠO KHI DOM READY
// =======================================
document.addEventListener('DOMContentLoaded', function() {
    renderNotifList();
    loadStats();
});

// =======================================
// 4. PAGE NAV
// =======================================
var pageTitles = {
    overview:'Tổng quan', ketqua:'Kết quả',
    doanhthu:'Doanh thu', sanpham:'Sản phẩm hàng đầu',
    shipping:'Phí giao hàng', coupon:'Khuyến mãi', notif:'Thông báo'
};
function showPage(id, btn) {
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.remove('active'); });
    document.getElementById('page-' + id).classList.add('active');
    btn.classList.add('active');
    document.getElementById('page-title').textContent = pageTitles[id] || id;
    if (id==='doanhthu' && !window._revInited)  { initRevCharts(); setDefaultDates(); window._revInited=true; }
    if (id==='shipping' && !window._shipInited) { loadShippingZones(); window._shipInited=true; }
    if (id==='coupon'   && !window._cpInited)   { loadCoupons(); window._cpInited=true; }
    if (id==='ketqua'   && !window._kqInited)   { initKqChart(); loadTopProducts(); window._kqInited=true; }
    if (id==='sanpham'  && !window._spInited)   { loadProductTable(); window._spInited=true; }
}

// =======================================
// 5. DATE PICKER
// =======================================
var datePickerOpen = false;
var datePresets = [
    {label:'Hôm nay', days:0},
    {label:'7 ngày qua', days:7},
    {label:'28 ngày qua', days:28},
    {label:'Tháng này', days:-1},
    {label:'3 tháng qua', days:90}
];
function toggleDatePicker() {
    datePickerOpen = !datePickerOpen;
    var picker = document.getElementById('datePicker');
    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'datePicker';
        picker.style.cssText = 'position:absolute;top:48px;right:0;background:#fff;border:1px solid #e4e6eb;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:9999;min-width:220px;overflow:hidden;';
        picker.innerHTML = datePresets.map(function(p){
            return '<button onclick="applyDatePreset(\'' + p.label + '\',' + p.days + ')" style="display:block;width:100%;padding:10px 16px;border:none;background:transparent;text-align:left;font-size:13px;cursor:pointer;font-family:inherit;" onmouseover="this.style.background=\'#f0f2f5\'" onmouseout="this.style.background=\'transparent\'">' + p.label + '</button>';
        }).join('') +
        '<div style="border-top:1px solid #e4e6eb;padding:10px 16px;">' +
        '<div style="font-size:11px;font-weight:600;color:#65676b;margin-bottom:6px;">Tùy chỉnh</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
        '<input type="date" id="dpFrom" style="flex:1;padding:5px;border:1px solid #e4e6eb;border-radius:4px;font-size:12px;">' +
        '<span style="color:#65676b;">→</span>' +
        '<input type="date" id="dpTo" style="flex:1;padding:5px;border:1px solid #e4e6eb;border-radius:4px;font-size:12px;">' +
        '</div>' +
        '<button onclick="applyCustomDate()" style="margin-top:8px;width:100%;padding:6px;background:#1877f2;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;">Áp dụng</button>' +
        '</div>';
        var topbarRight = document.querySelector('.topbar-right');
        topbarRight.style.position = 'relative';
        topbarRight.appendChild(picker);
        var today = new Date();
        var ago28 = new Date(today - 28*864e5);
        document.getElementById('dpFrom').value = ago28.toISOString().split('T')[0];
        document.getElementById('dpTo').value   = today.toISOString().split('T')[0];
        setTimeout(function(){ document.addEventListener('click', closeDatePickerOutside); }, 100);
    }
    picker.style.display = datePickerOpen ? 'block' : 'none';
}
function closeDatePickerOutside(e) {
    var picker = document.getElementById('datePicker');
    if (picker && !picker.contains(e.target) && !e.target.closest('.date-badge')) {
        picker.style.display = 'none';
        datePickerOpen = false;
        document.removeEventListener('click', closeDatePickerOutside);
    }
}
function applyDatePreset(label, days) {
    var today = new Date(), from;
    if (days === 0)       from = new Date(today);
    else if (days === -1) from = new Date(today.getFullYear(), today.getMonth(), 1);
    else                  from = new Date(today - days*864e5);
    document.getElementById('date-label').textContent = label;
    var fromStr = from.toISOString().split('T')[0];
    var toStr   = today.toISOString().split('T')[0];
    var fd = document.getElementById('fromDate');
    var td = document.getElementById('toDate');
    if (fd) fd.value = fromStr;
    if (td) td.value = toStr;
    var picker = document.getElementById('datePicker');
    if (picker) picker.style.display = 'none';
    datePickerOpen = false;
    document.removeEventListener('click', closeDatePickerOutside);
}
function applyCustomDate() {
    var from = document.getElementById('dpFrom').value;
    var to   = document.getElementById('dpTo').value;
    if (!from || !to) { alert('Vui lòng chọn đủ ngày'); return; }
    if (from > to)    { alert('Ngày bắt đầu phải nhỏ hơn ngày kết thúc'); return; }
    document.getElementById('date-label').textContent = from.split('-').reverse().join('/') + ' – ' + to.split('-').reverse().join('/');
    var fd = document.getElementById('fromDate');
    var td = document.getElementById('toDate');
    if (fd) fd.value = from;
    if (td) td.value = to;
    var picker = document.getElementById('datePicker');
    if (picker) picker.style.display = 'none';
    datePickerOpen = false;
    document.removeEventListener('click', closeDatePickerOutside);
}

// =======================================
// 6. THỐNG KÊ
// =======================================
var mainChartInstance = null;
var mainChartData = {};
var currentChartType = 'line';

function loadStats() {
    fetch('/admin/api/stats')
        .then(function(r){ return r.json(); })
        .then(function(data) {
            document.getElementById('st-orders').textContent    = data.todayOrders ?? 0;
            document.getElementById('st-revenue').textContent   = fmtVND(data.todayRevenue);
            document.getElementById('st-newcust').textContent   = data.newCustomers ?? 0;
            document.getElementById('st-totalcust').textContent = data.totalCustomers ?? 0;

            var tbody  = document.getElementById('recent-orders');
            var orders = data.recentOrders || [];
            tbody.innerHTML = orders.length === 0
                ? '<tr><td colspan="5" style="text-align:center;padding:20px;color:#65676b;">Chưa có đơn hàng</td></tr>'
                : orders.map(function(o){ return '<tr><td><strong>#'+o[0]+'</strong></td><td>'+o[1]+'</td><td style="color:#1877f2;font-weight:600;">'+fmtVND(o[2])+'</td><td>'+statusBadge(o[3])+'</td><td style="color:#65676b;">'+o[4]+'</td></tr>'; }).join('');

            var days7 = data.last7Days || [];
            mainChartData = { labels: days7.map(function(d){return d[0];}), values: days7.map(function(d){return d[1];}) };
            drawMainChart('Đơn hàng', mainChartData.labels, mainChartData.values, '#1877f2');

            document.getElementById('kq-views').textContent  = (parseInt(data.todayOrders)||0) * 8;
            document.getElementById('kq-return').textContent = Math.round((parseInt(data.totalCustomers)||0) * 0.3);
            document.getElementById('kq-conv').textContent   = (data.todayOrders > 0) ? (100/8).toFixed(1)+'%' : '0%';
        })
        .catch(function(e){ console.error('Lỗi thống kê:', e); });
}

function drawMainChart(title, labels, values, color) {
    document.getElementById('main-chart-title').textContent = title;
    if (mainChartInstance) mainChartInstance.destroy();
    mainChartInstance = new Chart(document.getElementById('mainChart'), {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [{
                label: title, data: values,
                borderColor: color,
                backgroundColor: currentChartType==='line' ? 'rgba(24,119,242,0.08)' : color+'99',
                tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: color,
                borderRadius: currentChartType==='bar' ? 4 : 0
            }]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,grid:{color:'#f0f2f5'}},x:{grid:{display:false}}} }
    });
}

function selectMetric(card, chartId, title) {
    document.querySelectorAll('.metric-card').forEach(function(c){ c.classList.remove('selected'); });
    card.classList.add('selected');
    var colors = {'Đơn hàng':'#1877f2','Doanh thu':'#42b72a','Khách hàng':'#f0b429','Tổng khách':'#9b59b6'};
    if (mainChartData.labels) drawMainChart(title, mainChartData.labels, mainChartData.values, colors[title]||'#1877f2');
}

function switchChartView(type, btn) {
    document.querySelectorAll('.chart-tab').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active');
    currentChartType = type;
    if (mainChartData.labels) drawMainChart(document.getElementById('main-chart-title').textContent, mainChartData.labels, mainChartData.values, '#1877f2');
}

function exportChart() {
    fetch('/admin/api/stats').then(function(r){return r.json();}).then(function(data){
        exportCSV('don_hang_7_ngay', ['Ngày','Số đơn'], (data.last7Days||[]).map(function(d){return [d[0],d[1]];}));
    });
}
function exportOrders() {
    fetch('/admin/api/stats').then(function(r){return r.json();}).then(function(data){
        exportCSV('don_hang_gan_nhat', ['Mã đơn','Khách hàng','Tổng tiền','Trạng thái','Ngày'], (data.recentOrders||[]).map(function(o){return [o[0],o[1],o[2],o[3],o[4]];}));
    });
}

// =======================================
// 7. KẾT QUẢ
// =======================================
function initKqChart() {
    new Chart(document.getElementById('kqChart'), {
        type:'line',
        data:{ labels:['T2','T3','T4','T5','T6','T7','CN'], datasets:[
            {label:'Lượt xem',data:[250,310,280,420,380,290,340],borderColor:'#1877f2',backgroundColor:'rgba(24,119,242,0.05)',tension:0.4,fill:true,pointRadius:3},
            {label:'Đơn hàng',data:[32,38,28,52,45,35,47],borderColor:'#42b72a',backgroundColor:'rgba(66,183,42,0.05)',tension:0.4,fill:true,pointRadius:3}
        ]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:12}}}},scales:{y:{beginAtZero:true,grid:{color:'#f0f2f5'}},x:{grid:{display:false}}}}
    });
}
function loadTopProducts() {
    var data = [['RTX 4060 Ti 8GB','Linh kiện',28,'266M','badge-green','Bán chạy'],['Core i9-13900K','Linh kiện',21,'252M','badge-green','Bán chạy'],['Laptop ASUS ROG','Laptop',15,'225M','badge-blue','Tốt'],['RAM 32GB DDR5','Linh kiện',44,'167M','badge-green','Bán chạy'],['SSD 2TB NVMe','Linh kiện',37,'107M','badge-blue','Tốt']];
    document.getElementById('top-products').innerHTML = data.map(function(r){return '<tr><td style="font-weight:500;">'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td style="color:#1877f2;font-weight:600;">'+r[3]+'</td><td><span class="badge-meta '+r[4]+'">'+r[5]+'</span></td></tr>';}).join('');
}
function loadProductTable() {
    var data = [['RTX 4060 Ti 8GB',28,'266M',224,'12.5%','badge-green','Đang bán'],['Core i9-13900K',21,'252M',168,'12.5%','badge-green','Đang bán'],['Laptop ASUS ROG',15,'225M',130,'11.5%','badge-blue','Đang bán'],['RAM 32GB DDR5',44,'167M',320,'13.8%','badge-green','Đang bán'],['SSD 2TB NVMe',37,'107M',260,'14.2%','badge-blue','Đang bán']];
    document.getElementById('product-table').innerHTML = data.map(function(r){return '<tr><td style="font-weight:500;">'+r[0]+'</td><td>'+r[1]+'</td><td style="color:#1877f2;font-weight:600;">'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td><td><span class="badge-meta '+r[5]+'">'+r[6]+'</span></td></tr>';}).join('');
}

// =======================================
// 8. DOANH THU
// =======================================
var revChart, catChart;
function initRevCharts() {
    revChart = new Chart(document.getElementById('revenueChart'), {
        type:'bar', data:{labels:[],datasets:[{data:[],backgroundColor:'#1877f2',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return fmtVND(v);}},grid:{color:'#f0f2f5'}},x:{grid:{display:false}}}}
    });
    catChart = new Chart(document.getElementById('catChart'), {
        type:'doughnut', data:{labels:[],datasets:[{data:[],backgroundColor:['#1877f2','#42b72a','#f0b429','#e94235','#9b59b6'],borderWidth:0}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}
    });
}
function setDefaultDates() {
    var today = new Date();
    var first = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('fromDate').value = first.toISOString().split('T')[0];
    document.getElementById('toDate').value   = today.toISOString().split('T')[0];
}
function loadRevenue() {
    var from = document.getElementById('fromDate').value;
    var to   = document.getElementById('toDate').value;
    if (!from || !to) { alert('Vui lòng chọn đủ ngày'); return; }
    if (from > to)    { alert('Ngày bắt đầu phải nhỏ hơn ngày kết thúc'); return; }
    fetch('/admin/api/revenue?from='+from+'&to='+to)
        .then(function(r){return r.json();})
        .then(function(data){
            document.getElementById('rv-total').textContent  = fmtVND(data.totalRevenue);
            document.getElementById('rv-orders').textContent = data.successOrders ?? 0;
            document.getElementById('rv-avg').textContent    = fmtVND(data.avgOrder);
            document.getElementById('rv-refund').textContent = data.refundedOrders ?? 0;
            var weekly = data.weeklyRevenue || [];
            revChart.data.labels = weekly.map(function(w){return w[0];});
            revChart.data.datasets[0].data = weekly.map(function(w){return parseFloat(w[1]);});
            revChart.update();
            var cats = data.categoryRevenue || [];
            var colors = ['#1877f2','#42b72a','#f0b429','#e94235','#9b59b6'];
            catChart.data.labels = cats.map(function(c){return c[0];});
            catChart.data.datasets[0].data = cats.map(function(c){return parseFloat(c[1]);});
            catChart.data.datasets[0].backgroundColor = colors.slice(0, cats.length);
            catChart.update();
            var total = cats.reduce(function(s,c){return s+parseFloat(c[1]);}, 0);
            document.getElementById('cat-legend').innerHTML = cats.map(function(c,i){
                return '<span style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="width:8px;height:8px;border-radius:50%;background:'+colors[i]+';display:inline-block;"></span>'+c[0]+' — '+(total>0?((parseFloat(c[1])/total)*100).toFixed(0):0)+'%</span>';
            }).join('');
        }).catch(function(e){console.error('Lỗi doanh thu:',e);});
}
function exportRevenue() {
    var from = document.getElementById('fromDate').value;
    var to   = document.getElementById('toDate').value;
    if (!from || !to) { alert('Vui lòng chọn khoảng ngày trước'); return; }
    fetch('/admin/api/revenue?from='+from+'&to='+to).then(function(r){return r.json();}).then(function(data){
        var rows = (data.weeklyRevenue||[]).map(function(w){return [w[0], w[1]];});
        if (!rows.length) rows = [['Tổng',data.totalRevenue||0]];
        exportCSV('doanh_thu', ['Tuần/Kỳ','Doanh thu'], rows);
    });
}

// =======================================
// 9. PHÍ GIAO HÀNG
// =======================================
var zonesData = [];
function loadShippingZones() {
    fetch('/admin/api/shipping')
        .then(function(r){ return r.json(); })
        .then(function(res){
            var list = res.data || (Array.isArray(res) ? res : []);
            zonesData = list.map(function(z){ return {id:z[0],name:z[1],key:z[2],base:z[3],kg:z[4],free:z[5]}; });
            renderZoneTable();
        }).catch(function(e){ console.error('Lỗi vùng:',e); });
}
function renderZoneTable() {
    var sel = document.getElementById('shpCity');
    var cur = sel.value;
    sel.innerHTML = zonesData.map(function(z){return '<option value="'+z.key+'">'+z.name+'</option>';}).join('');
    if (zonesData.find(function(z){return z.key===cur;})) sel.value = cur;
    document.getElementById('zoneTbody').innerHTML = zonesData.length === 0
        ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:#65676b;">Chưa có vùng nào</td></tr>'
        : zonesData.map(function(z){
            return '<tr>' +
                '<td style="font-weight:500;">'+z.name+'</td>' +
                '<td>'+parseInt(z.base).toLocaleString('vi-VN')+'đ</td>' +
                '<td>'+parseInt(z.kg).toLocaleString('vi-VN')+'đ</td>' +
                '<td>'+parseInt(z.free).toLocaleString('vi-VN')+'đ</td>' +
                '<td><span class="badge-meta badge-green">Hoạt động</span></td>' +
                '<td style="display:flex;gap:6px;">' +
                '<button class="btn-outline-meta" style="padding:4px 8px;" onclick="openZoneModal('+z.id+')"><i class="bi bi-pencil"></i></button>' +
                '<button class="btn-outline-meta" style="padding:4px 8px;color:#fa3e3e;border-color:#fcc;" onclick="deleteZone('+z.id+',\''+z.name+'\')"><i class="bi bi-trash"></i></button>' +
                '</td></tr>';
          }).join('');
    calcShip();
}
function calcShip() {
    var key = document.getElementById('shpCity').value;
    var z   = zonesData.find(function(z){return z.key===key;});
    if (!z) return;
    var w = parseFloat(document.getElementById('shpWeight').value) || 1;
    var v = parseFloat(document.getElementById('shpValue').value)  || 0;
    var kgFee = Math.max(0, w-1) * parseInt(z.kg);
    var total = v >= parseInt(z.free) ? 0 : parseInt(z.base) + kgFee;
    document.getElementById('shp-base').textContent  = parseInt(z.base).toLocaleString('vi-VN') + 'đ';
    document.getElementById('shp-kg').textContent    = kgFee.toLocaleString('vi-VN') + 'đ';
    document.getElementById('shp-total').textContent = total===0 ? 'Miễn phí' : total.toLocaleString('vi-VN')+'đ';
    document.getElementById('shp-note').textContent  = '✓ Miễn phí nếu đơn ≥ ' + parseInt(z.free).toLocaleString('vi-VN') + 'đ';
}
function openZoneModal(id) {
    var z = zonesData.find(function(z){return z.id===id;});
    document.getElementById('zoneModalTitle').textContent = z ? 'Sửa vùng: '+z.name : 'Thêm vùng mới';
    document.getElementById('zId').value   = z ? z.id   : '';
    document.getElementById('zName').value = z ? z.name : '';
    document.getElementById('zBase').value = z ? z.base : 30000;
    document.getElementById('zKg').value   = z ? z.kg   : 8000;
    document.getElementById('zFree').value = z ? z.free : 1500000;
    document.getElementById('zoneModal').style.display = 'flex';
}
function closeZoneModal() { document.getElementById('zoneModal').style.display = 'none'; }
function saveZone() {
    var id   = document.getElementById('zId').value;
    var name = document.getElementById('zName').value.trim();
    if (!name) { alert('Vui lòng nhập tên vùng'); return; }
    var base = parseInt(document.getElementById('zBase').value) || 0;
    var kg   = parseInt(document.getElementById('zKg').value)   || 0;
    var free = parseInt(document.getElementById('zFree').value) || 0;
    if (base <= 0) { alert('Phí cơ bản phải lớn hơn 0'); return; }
    var body = JSON.stringify({ name:name, base:base, kg:kg, free:free, key:name.toLowerCase().replace(/[\s\W]+/g,'_')+'_'+Date.now() });
    var url    = id ? '/admin/api/shipping/'+id : '/admin/api/shipping';
    var method = id ? 'PUT' : 'POST';
    fetch(url, { method:method, headers:{'Content-Type':'application/json'}, body:body })
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(function(res){
            if (res.success) { closeZoneModal(); loadShippingZones(); }
            else alert('Lỗi: ' + (res.error||'Không xác định'));
        })
        .catch(function(e){ alert('Lỗi kết nối: '+e.message); console.error(e); });
}
function deleteZone(id, name) {
    if (!confirm('Xoá vùng "'+name+'"?')) return;
    fetch('/admin/api/shipping/'+id, {method:'DELETE'})
        .then(function(r){return r.json();})
        .then(function(res){ if(res.success) loadShippingZones(); else alert('Lỗi: '+res.error); });
}
function exportZones() {
    fetch('/admin/api/shipping').then(function(r){return r.json();}).then(function(res){
        var list = res.data || (Array.isArray(res) ? res : []);
        exportCSV('vung_giao_hang', ['Vùng','Phí cơ bản','Phí/kg','Miễn phí từ'], list.map(function(z){return [z[1],z[3],z[4],z[5]];}));
    });
}

// =======================================
// 10. KHUYẾN MÃI
// =======================================
function loadCoupons() {
    fetch('/admin/api/coupon')
        .then(function(r){ return r.json(); })
        .then(function(res){
            var list = res.data || (Array.isArray(res) ? res : []);
            var tbody = document.getElementById('couponTbody');
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#65676b;">Chưa có mã nào</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(function(c){
                var exp  = c[7] ? String(c[7]).substring(0,10).split('-').reverse().join('/') : '—';
                var used = c[6]||0; var max = c[5]||'∞';
                var ok   = c[8]==1;
                return '<tr>' +
                    '<td><code style="background:#f0f2f5;padding:2px 6px;border-radius:4px;">'+c[1]+'</code></td>' +
                    '<td>'+(c[2]==='percent'?'%':'Cố định')+'</td>' +
                    '<td>'+(c[2]==='percent'?c[3]+'%':parseInt(c[3]).toLocaleString('vi-VN')+'đ')+'</td>' +
                    '<td>'+used+'/'+max+'</td><td>'+exp+'</td>' +
                    '<td><span class="badge-meta '+(ok?'badge-green':'badge-gray')+'">'+(ok?'Hoạt động':'Tắt')+'</span></td>' +
                    '<td><button class="btn-outline-meta" style="padding:4px 8px;color:#fa3e3e;border-color:#fcc;" onclick="deleteCoupon('+c[0]+',\''+c[1]+'\')"><i class="bi bi-trash"></i></button></td>' +
                    '</tr>';
            }).join('');
        }).catch(function(e){ console.error('Lỗi coupon:', e); });
}
function toggleCpType() {
    document.getElementById('cpValueLabel').textContent = document.getElementById('cpType').value==='percent' ? 'Giá trị giảm (%)' : 'Số tiền giảm (đ)';
}
function addCoupon() {
    var code = document.getElementById('cpCode').value.trim().toUpperCase();
    if (!code) { alert('Vui lòng nhập mã coupon'); return; }
    var value = parseFloat(document.getElementById('cpValue').value);
    if (!value || value <= 0) { alert('Vui lòng nhập giá trị giảm hợp lệ'); return; }
    var body = JSON.stringify({
        code:code, type:document.getElementById('cpType').value,
        value:value, min:parseFloat(document.getElementById('cpMin').value)||0,
        maxUse:document.getElementById('cpMaxUse').value||null,
        expiry:document.getElementById('cpExpiry').value||null,
        condAll:document.getElementById('condAll').checked,
        condNew:document.getElementById('condNew').checked,
        condCust:document.getElementById('condCust').checked,
        condNoSale:document.getElementById('condNoSale').checked
    });
    fetch('/admin/api/coupon', {method:'POST', headers:{'Content-Type':'application/json'}, body:body})
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(function(res){
            if (res.success) { document.getElementById('cpCode').value=''; loadCoupons(); }
            else alert('Lỗi: '+(res.error||'Không xác định'));
        })
        .catch(function(e){ alert('Lỗi kết nối: '+e.message); console.error(e); });
}
function deleteCoupon(id, code) {
    if (!confirm('Xoá mã "'+code+'"?')) return;
    fetch('/admin/api/coupon/'+id, {method:'DELETE'})
        .then(function(r){return r.json();})
        .then(function(res){ if(res.success) loadCoupons(); else alert('Lỗi: '+res.error); });
}
function exportCoupons() {
    fetch('/admin/api/coupon').then(function(r){return r.json();}).then(function(res){
        var list = res.data || (Array.isArray(res) ? res : []);
        exportCSV('ma_khuyen_mai', ['Mã','Loại','Giá trị','Đã dùng','Tối đa','Hạn','Trạng thái'],
            list.map(function(c){return [c[1],c[2],c[3],c[6]||0,c[5]||'∞',c[7]?String(c[7]).substring(0,10):'',c[8]==1?'Hoạt động':'Tắt'];}));
    });
}
