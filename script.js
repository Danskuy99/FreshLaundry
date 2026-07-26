// DATA INITIAL (STORAGE)
let orders = JSON.parse(localStorage.getItem('fl_orders')) || [
    { id: 'LD-1001', nama: 'Budi Santoso', telepon: '081234567890', layanan: 'Cuci Komplit (Cuci + Setrika)', jumlah: 5, total: 35000, tanggal: '2026-03-28', alamat: 'Jl. Merdeka No. 12', status: 'Menunggu', paymentStatus: 'Paid' },
    { id: 'LD-1002', nama: 'Siti Aminah', telepon: '089876543210', layanan: 'Setrika saja', jumlah: 3, total: 15000, tanggal: '2026-03-29', alamat: 'Gg. Mawar No. 4', status: 'Menunggu', paymentStatus: 'Non Paid' }
];

let services = JSON.parse(localStorage.getItem('fl_services')) || [
    { id: 1, nama: 'Cuci Komplit (Cuci + Setrika)', harga: 7000 },
    { id: 2, nama: 'Cuci Kering saja', harga: 4000 },
    { id: 3, nama: 'Setrika saja', harga: 5000 },
    { id: 4, nama: 'Cuci Bedcover / Selimut', harga: 25000 }
];

let currentUser = JSON.parse(localStorage.getItem('fl_user')) || null;
let permissions = JSON.parse(localStorage.getItem('fl_permissions')) || {
    buatPesanan: true,
    kelolaStatus: true,
    rekapLaporan: true,
    dataPelanggan: true
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function saveData() {
    localStorage.setItem('fl_orders', JSON.stringify(orders));
    localStorage.setItem('fl_services', JSON.stringify(services));
    localStorage.setItem('fl_permissions', JSON.stringify(permissions));
}

// AUTHENTICATION
function checkAuth() {
    if (!currentUser) {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    } else {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        initApp();
    }
}

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    if (u === 'admin' && p === 'admin123') {
        currentUser = { name: 'Administrator', role: 'admin' };
    } else if (u === 'petugas' && p === 'petugas123') {
        currentUser = { name: 'Petugas Kasir', role: 'petugas' };
    } else {
        alert('Username atau password salah!');
        return;
    }

    localStorage.setItem('fl_user', JSON.stringify(currentUser));
    checkAuth();
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('fl_user');
    currentUser = null;
    checkAuth();
});

// INIT APP & PERMISSIONS
function initApp() {
    document.getElementById('user-name').innerText = currentUser.name;
    document.getElementById('user-role').innerText = currentUser.role.toUpperCase();
    document.getElementById('user-role').className = `role-badge role-${currentUser.role}`;
    document.getElementById('user-avatar').innerText = currentUser.name.charAt(0);

    // Tampilkan / Sembunyikan elemen khusus Admin
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = currentUser.role === 'admin' ? '' : 'none';
    });

    if (currentUser.role === 'petugas') {
        applyPetugasPermissions();
    } else {
        document.querySelectorAll('.menu-item').forEach(el => el.style.display = '');
    }

    populateServicesSelect();
    renderAllData();
    setDefaultDates();
}

function applyPetugasPermissions() {
    const menuMap = {
        'page-buat-pesanan': permissions.buatPesanan,
        'page-status': permissions.kelolaStatus,
        'page-rekap': permissions.rekapLaporan,
        'page-pelanggan': permissions.dataPelanggan
    };

    document.querySelectorAll('.menu-list .menu-item').forEach(item => {
        const target = item.getAttribute('data-target');
        if (menuMap[target] !== undefined) {
            item.style.display = menuMap[target] ? '' : 'none';
        }
    });

    // Sync Checkboxes
    if(document.getElementById('access-buat-pesanan')) {
        document.getElementById('access-buat-pesanan').checked = permissions.buatPesanan;
        document.getElementById('access-kelola-status').checked = permissions.kelolaStatus;
        document.getElementById('access-rekap-laporan').checked = permissions.rekapLaporan;
        document.getElementById('access-data-pelanggan').checked = permissions.dataPelanggan;
    }
}

function savePermissions() {
    permissions = {
        buatPesanan: document.getElementById('access-buat-pesanan').checked,
        kelolaStatus: document.getElementById('access-kelola-status').checked,
        rekapLaporan: document.getElementById('access-rekap-laporan').checked,
        dataPelanggan: document.getElementById('access-data-pelanggan').checked
    };
    saveData();
    alert('Hak akses petugas berhasil diperbarui!');
}

// NAVIGATION
function setupEventListeners() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            const target = this.getAttribute('data-target');
            if (!target) return;

            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));

            this.classList.add('active');
            const targetPage = document.getElementById(target);
            if (targetPage) targetPage.classList.add('active');

            // Set Title Header
            const titleMap = {
                'page-dashboard': 'Dashboard Utama',
                'page-buat-pesanan': 'Buat Pesanan Baru',
                'page-status': 'Kelola Status & Pembayaran',
                'page-rekap': 'Rekap Laporan Keuangan',
                'page-pelanggan': 'Data Pelanggan',
                'page-kelola-harga': 'Kelola Harga Layanan',
                'page-akses-petugas': 'Pengaturan Hak Akses'
            };
            document.getElementById('page-title').innerText = titleMap[target] || 'FreshLaundry';
        });
    });

    // Form Order Auto Calculate
    document.getElementById('input-layanan').addEventListener('change', calculateTotalOrder);
    document.getElementById('input-jumlah').addEventListener('input', calculateTotalOrder);
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    document.getElementById('input-tanggal').value = today;
    document.getElementById('filter-tanggal').value = today;
    document.getElementById('filter-bulan').value = thisMonth;
}

function populateServicesSelect() {
    const select = document.getElementById('input-layanan');
    select.innerHTML = '';
    services.forEach(s => {
        select.innerHTML += `<option value="${s.nama}" data-harga="${s.harga}">${s.nama} (Rp ${s.harga.toLocaleString()}/satuan)</option>`;
    });
    calculateTotalOrder();
}

function calculateTotalOrder() {
    const select = document.getElementById('input-layanan');
    if (!select.options.length) return;
    const harga = parseInt(select.options[select.selectedIndex].getAttribute('data-harga')) || 0;
    const jumlah = parseInt(document.getElementById('input-jumlah').value) || 1;
    document.getElementById('input-total').value = harga * jumlah;
}

// RENDER ALL DATA
function renderAllData() {
    renderStats();
    renderDashboardTable();
    renderStatusTable();
    renderRekapTable();
    renderPelangganTable();
    renderHargaTable();
}

function renderStats() {
    const totalOrder = orders.length;
    const proses = orders.filter(o => o.status !== 'Selesai').length;
    const pendapatan = orders
        .filter(o => o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + parseInt(o.total), 0);

    document.getElementById('stat-total-order').innerText = totalOrder;
    document.getElementById('stat-proses').innerText = proses;
    document.getElementById('stat-pendapatan').innerText = `Rp ${pendapatan.toLocaleString()}`;
}

// RENDER TABLES
function renderDashboardTable() {
    const tbody = document.getElementById('table-dashboard-body');
    tbody.innerHTML = '';
    
    orders.slice().reverse().slice(0, 5).forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.nama}</td>
                <td>${o.layanan}</td>
                <td>${o.jumlah} Kg/Pcs</td>
                <td>Rp ${parseInt(o.total).toLocaleString()}</td>
                <td>
                    <span class="badge ${getBadgeClass(o.status)}">${o.status}</span>
                    <span class="badge ${o.paymentStatus === 'Paid' ? 'badge-success' : 'badge-danger'}">${o.paymentStatus}</span>
                </td>
            </tr>
        `;
    });
}

function renderStatusTable() {
    const tbody = document.getElementById('table-status-body');
    tbody.innerHTML = '';

    orders.forEach((o, index) => {
        const waText = encodeURIComponent(`Halo Kak ${o.nama}, pesanan laundry Anda (${o.id}) saat ini berstatus: *${o.status}* dengan status pembayaran: *${o.paymentStatus}*. Total Tagihan: Rp ${parseInt(o.total).toLocaleString()}. Terima kasih!`);
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${o.id}</strong></td>
                <td>
                    <strong>${o.nama}</strong><br>
                    <small style="color:var(--text-muted);">${o.telepon}</small>
                </td>
                <td>${o.layanan}</td>
                <td><strong>${o.jumlah} Kg/Pcs</strong></td>
                <td><strong>Rp ${parseInt(o.total).toLocaleString()}</strong></td>
                <td>
                    <div style="display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap;">
                        <select class="status-select" onchange="updateOrderStatus(${index}, 'status', this.value)">
                            <option value="Menunggu" ${o.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
                            <option value="Proses" ${o.status === 'Proses' ? 'selected' : ''}>Proses</option>
                            <option value="Selesai" ${o.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                        </select>

                        <select class="status-select ${o.paymentStatus === 'Paid' ? 'pay-paid' : 'pay-nonpaid'}" onchange="updateOrderStatus(${index}, 'paymentStatus', this.value)">
                            <option value="Non Paid" ${o.paymentStatus === 'Non Paid' ? 'selected' : ''}>Non Paid</option>
                            <option value="Paid" ${o.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:6px;">
                        <a href="https://wa.me/${formatWA(o.telepon)}?text=${waText}" target="_blank" class="btn btn-wa" style="padding:4px 8px; font-size:12px;">
                            <i class='bx bxl-whatsapp'></i> WA
                        </a>
                        <button class="btn" style="padding:4px 8px; font-size:12px;" onclick="openModalStruk('${o.id}')">
                            <i class='bx bx-printer'></i> Struk
                        </button>
                    </div>
                </td>
                <td class="admin-only" style="${currentUser && currentUser.role === 'admin' ? '' : 'display:none;'}">
                    <button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteOrder(${index})">
                        <i class='bx bx-trash'></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    });
}

function updateOrderStatus(index, field, value) {
    orders[index][field] = value;
    saveData();
    renderAllData();
}

function deleteOrder(index) {
    if (confirm('Yakin ingin menghapus pesanan ini?')) {
        orders.splice(index, 1);
        saveData();
        renderAllData();
    }
}

// NEW ORDER SUBMIT
document.getElementById('form-order').addEventListener('submit', (e) => {
    e.preventDefault();

    const newId = 'LD-' + Math.floor(1000 + Math.random() * 9000);
    const paymentStatusInput = document.getElementById('input-payment-status') ? document.getElementById('input-payment-status').value : 'Non Paid';

    const newOrder = {
        id: newId,
        nama: document.getElementById('input-nama').value.trim(),
        telepon: document.getElementById('input-telepon').value.trim(),
        layanan: document.getElementById('input-layanan').value,
        jumlah: parseInt(document.getElementById('input-jumlah').value),
        total: parseInt(document.getElementById('input-total').value),
        tanggal: document.getElementById('input-tanggal').value,
        alamat: document.getElementById('input-alamat').value.trim(),
        status: 'Menunggu',
        paymentStatus: paymentStatusInput
    };

    orders.push(newOrder);
    saveData();
    renderAllData();

    document.getElementById('form-order').reset();
    setDefaultDates();
    calculateTotalOrder();

    alert(`Pesanan ${newId} berhasil ditambahkan!`);
});

// REKAP & FILTER
function toggleFilterMode() {
    const tipe = document.getElementById('filter-tipe').value;
    document.getElementById('filter-container-tanggal').style.display = tipe === 'harian' ? 'block' : 'none';
    document.getElementById('filter-container-bulan').style.display = tipe === 'bulanan' ? 'block' : 'none';
    applyFilter();
}

function applyFilter() {
    renderRekapTable();
}

function getFilteredOrders() {
    const tipe = document.getElementById('filter-tipe').value;
    if (tipe === 'harian') {
        const val = document.getElementById('filter-tanggal').value;
        return orders.filter(o => o.tanggal === val);
    } else {
        const val = document.getElementById('filter-bulan').value;
        return orders.filter(o => o.tanggal.startsWith(val));
    }
}

function renderRekapTable() {
    const list = getFilteredOrders();
    const tbody = document.getElementById('table-rekap-body');
    tbody.innerHTML = '';

    let totalNominalPaid = 0;

    list.forEach(o => {
        if (o.paymentStatus === 'Paid') {
            totalNominalPaid += parseInt(o.total);
        }

        tbody.innerHTML += `
            <tr>
                <td>${o.tanggal}</td>
                <td><strong>${o.id}</strong></td>
                <td>${o.nama}</td>
                <td>${o.layanan}</td>
                <td>${o.jumlah} Kg/Pcs</td>
                <td>Rp ${parseInt(o.total).toLocaleString()}</td>
                <td>
                    <span class="badge ${getBadgeClass(o.status)}">${o.status}</span>
                    <span class="badge ${o.paymentStatus === 'Paid' ? 'badge-success' : 'badge-danger'}">${o.paymentStatus}</span>
                </td>
            </tr>
        `;
    });

    document.getElementById('rekap-count').innerText = `${list.length} Transaksi`;
    document.getElementById('rekap-total').innerText = `Rp ${totalNominalPaid.toLocaleString()}`;
}

// DATA PELANGGAN
function renderPelangganTable() {
    const tbody = document.getElementById('table-pelanggan-body');
    tbody.innerHTML = '';

    const customers = {};
    orders.forEach(o => {
        if (!customers[o.telepon]) {
            customers[o.telepon] = { nama: o.nama, telepon: o.telepon, alamat: o.alamat || '-' };
        }
    });

    Object.values(customers).forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${c.nama}</strong></td>
                <td>${c.telepon}</td>
                <td>${c.alamat}</td>
                <td>
                    <a href="https://wa.me/${formatWA(c.telepon)}" target="_blank" class="btn btn-wa" style="padding:4px 8px; font-size:12px;">
                        <i class='bx bxl-whatsapp'></i> Chat WA
                    </a>
                </td>
            </tr>
        `;
    });
}

// KELOLA HARGA
function renderHargaTable() {
    const tbody = document.getElementById('table-harga-body');
    tbody.innerHTML = '';

    services.forEach((s, idx) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.nama}</strong></td>
                <td>
                    <input type="number" value="${s.harga}" id="harga-input-${idx}" style="width:100px; padding:4px 8px; border:1px solid #ccc; border-radius:4px;">
                </td>
                <td>
                    <button class="btn" style="padding:4px 8px; font-size:12px;" onclick="updateHargaService(${idx})">Simpan</button>
                </td>
            </tr>
        `;
    });
}

function updateHargaService(index) {
    const val = parseInt(document.getElementById(`harga-input-${index}`).value);
    if (val && val > 0) {
        services[index].harga = val;
        saveData();
        populateServicesSelect();
        alert('Harga layanan berhasil diperbarui!');
    }
}

// MODAL STRUK CETAK
function openModalStruk(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('struk-id').innerText = order.id;
    document.getElementById('struk-tanggal').innerText = order.tanggal;
    document.getElementById('struk-nama').innerText = order.nama;
    document.getElementById('struk-layanan').innerText = order.layanan;
    document.getElementById('struk-jumlah').innerText = `${order.jumlah} Kg/Pcs`;
    document.getElementById('struk-total').innerText = `Rp ${parseInt(order.total).toLocaleString()}`;
    
    document.getElementById('struk-pengerjaan').innerText = order.status.toUpperCase();
    
    const elPayment = document.getElementById('struk-payment');
    elPayment.innerText = order.paymentStatus.toUpperCase();
    elPayment.style.color = order.paymentStatus === 'Paid' ? '#059669' : '#dc2626';

    document.getElementById('modal-struk').style.display = 'flex';
}

function closeModalStruk() {
    document.getElementById('modal-struk').style.display = 'none';
}

// EXPORT EXCEL
function exportExcelAll() {
    const ws = XLSX.utils.json_to_sheet(orders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Semua Data");
    XLSX.writeFile(wb, "Data_FreshLaundry_All.xlsx");
}

function exportExcelFiltered() {
    const data = getFilteredOrders();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Terfilter");
    XLSX.writeFile(wb, "Rekap_FreshLaundry_Filtered.xlsx");
}

// HELPER UTILS
function formatWA(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
}

function getBadgeClass(status) {
    if (status === 'Selesai') return 'badge-success';
    if (status === 'Proses') return 'badge-process';
    return 'badge-pending';
}
