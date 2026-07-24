// ================= SCRIPT.JS (INTEGRASI GOOGLE SHEETS) =================

// ⚠️ PASTE URL WEB APP APPS SCRIPT KAMU DI SINI:
const SPREADSHEET_API_URL = "https://script.google.com/macros/s/AKfycbwejxWU6sdh7Zobspj7gqNR4QrguHHZLYH_9BnFEREQ7jWIymiFG1yD8Jvgxw_Ya2_9zA/exec";

// --- DATA USER ---
const USERS = {
    'admin': { password: 'admin123', name: 'Administrator', role: 'admin' },
    'petugas': { password: 'petugas123', name: 'Petugas Kasir', role: 'petugas' }
};

let currentUser = JSON.parse(localStorage.getItem('laundry_current_user')) || null;
let orders = [];
let filteredOrders = [];

// --- AUTENTIKASI ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const formLogin = document.getElementById('form-login');

function checkAuth() {
    if (currentUser) {
        loginScreen.style.display = 'none';
        appScreen.style.display = 'block';
        setupUserUI();
        loadDataFromSheet(); // Ambil data dari Spreadsheet saat pertama kali load
    } else {
        loginScreen.style.display = 'flex';
        appScreen.style.display = 'none';
    }
}

formLogin.addEventListener('submit', function(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value;
    const passwordInput = document.getElementById('login-password').value;

    const user = USERS[usernameInput];
    if (user && user.password === passwordInput) {
        currentUser = { username: usernameInput, name: user.name, role: user.role };
        localStorage.setItem('laundry_current_user', JSON.stringify(currentUser));
        checkAuth();
    } else {
        alert('Username atau Password salah!');
    }
});

document.getElementById('btn-logout').addEventListener('click', function() {
    if (confirm('Yakin ingin keluar?')) {
        currentUser = null;
        localStorage.removeItem('laundry_current_user');
        checkAuth();
    }
});

function setupUserUI() {
    document.getElementById('user-name').innerText = currentUser.name;
    const roleBadge = document.getElementById('user-role');
    const avatar = document.getElementById('user-avatar');

    roleBadge.innerText = currentUser.role.toUpperCase();
    avatar.innerText = currentUser.name.charAt(0);

    if (currentUser.role === 'admin') {
        roleBadge.className = 'role-badge role-admin';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'table-cell');
    } else {
        roleBadge.className = 'role-badge role-petugas';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

// --- AMBIL DATA DARI SPREADSHEET (READ FIXED) ---
async function loadDataFromSheet() {
    try {
        const response = await fetch(SPREADSHEET_API_URL);
        const rawData = await response.json();
        
        // Normalisasi data agar nama properti pasti huruf kecil & angka dibaca sebagai nomor
        orders = rawData.map(item => {
            // Mengambil nilai tanpa peduli huruf besar/kecil pada header
            const getVal = (key) => item[key] || item[key.toLowerCase()] || item[key.toUpperCase()] || '';

            return {
                id: String(getVal('id')),
                nama: String(getVal('nama')),
                telepon: String(getVal('telepon')),
                layanan: String(getVal('layanan')),
                jumlah: parseInt(getVal('jumlah')) || 0,
                total: parseInt(getVal('total')) || 0,
                tanggal: String(getVal('tanggal')),
                alamat: String(getVal('alamat')),
                status: String(getVal('status')) || 'Menunggu'
            };
        });

        renderAll();
    } catch (error) {
        console.error("Gagal mengambil data dari Spreadsheet:", error);
        alert("Gagal memuat data dari Spreadsheet. Cek jaringan atau URL API.");
    }
}


// --- FORMAT & RENDER ---
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
};

function renderAll() {
    renderStats();
    renderDashboardTable();
    renderStatusTable();
    renderPelangganTable();
    applyFilter();
}

function renderStats() {
    let totalPendapatan = orders
        .filter(o => o.status === 'Selesai')
        .reduce((sum, o) => sum + parseInt(o.total || 0), 0);
    
    let totalOrder = orders.length;
    let prosesCount = orders.filter(o => o.status === 'Proses' || o.status === 'Menunggu').length;

    document.getElementById('stat-pendapatan').innerText = formatRupiah(totalPendapatan);
    document.getElementById('stat-total-order').innerText = totalOrder;
    document.getElementById('stat-proses').innerText = prosesCount;
}

function getBadgeClass(status) {
    if (status === 'Selesai') return 'badge-success';
    if (status === 'Proses') return 'badge-process';
    return 'badge-pending';
}

function renderDashboardTable() {
    const tbody = document.getElementById('table-dashboard-body');
    tbody.innerHTML = '';
    
    orders.slice().reverse().forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.nama}</td>
                <td>${o.layanan} (${o.jumlah})</td>
                <td>${formatRupiah(o.total)}</td>
                <td><span class="badge ${getBadgeClass(o.status)}">${o.status}</span></td>
            </tr>
        `;
    });
}

function renderStatusTable() {
    const tbody = document.getElementById('table-status-body');
    tbody.innerHTML = '';

    orders.slice().reverse().forEach(o => {
        let deleteBtnHtml = '';
        if (currentUser && currentUser.role === 'admin') {
            deleteBtnHtml = `
                <td class="admin-only">
                    <button class="btn btn-danger" style="padding: 6px 10px; font-size:12px;" onclick="deleteOrder('${o.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.nama}<br><small style="color:var(--text-muted)">${o.telepon}</small></td>
                <td>${o.layanan}<br><strong>${formatRupiah(o.total)}</strong></td>
                <td>
                    <select class="status-select" onchange="updateStatus('${o.id}', this.value)">
                        <option value="Menunggu" ${o.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
                        <option value="Proses" ${o.status === 'Proses' ? 'selected' : ''}>Proses</option>
                        <option value="Selesai" ${o.status === 'Selesai' ? 'selected' : ''}>Selesai / Lunas</option>
                    </select>
                </td>
                ${deleteBtnHtml}
            </tr>
        `;
    });

    if (currentUser && currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'table-cell');
    }
}

function renderPelangganTable() {
    const tbody = document.getElementById('table-pelanggan-body');
    tbody.innerHTML = '';

    const uniqueCustomers = [];
    const map = new Map();
    for (const item of orders) {
        if(!map.has(item.telepon)){
            map.set(item.telepon, true);
            uniqueCustomers.push({
                nama: item.nama,
                telepon: item.telepon,
                alamat: item.alamat
            });
        }
    }

    uniqueCustomers.forEach(c => {
        let waNumber = String(c.telepon).startsWith('0') ? '62' + String(c.telepon).slice(1) : c.telepon;
        tbody.innerHTML += `
            <tr>
                <td><strong>${c.nama}</strong></td>
                <td>${c.telepon}</td>
                <td>${c.alamat}</td>
                <td>
                    <a href="https://wa.me/${waNumber}" target="_blank" class="btn" style="background:#25D366; padding: 6px 12px; font-size: 12px; text-decoration:none;">
                        <i class='bx bxl-whatsapp'></i> Chat WA
                    </a>
                </td>
            </tr>
        `;
    });
}

// --- REKAP & FILTER LOGIC ---
function toggleFilterMode() {
    const tipe = document.getElementById('filter-tipe').value;
    if (tipe === 'harian') {
        document.getElementById('filter-container-tanggal').style.display = 'block';
        document.getElementById('filter-container-bulan').style.display = 'none';
    } else {
        document.getElementById('filter-container-tanggal').style.display = 'none';
        document.getElementById('filter-container-bulan').style.display = 'block';
    }
}

function applyFilter() {
    const tipe = document.getElementById('filter-tipe').value;
    const selectedTanggal = document.getElementById('filter-tanggal').value;
    const selectedBulan = document.getElementById('filter-bulan').value;

    if (tipe === 'harian') {
        if (!selectedTanggal) {
            filteredOrders = [...orders];
        } else {
            filteredOrders = orders.filter(o => String(o.tanggal) === selectedTanggal);
        }
    } else {
        if (!selectedBulan) {
            filteredOrders = [...orders];
        } else {
            filteredOrders = orders.filter(o => String(o.tanggal).startsWith(selectedBulan));
        }
    }

    renderRekapTable();
}

function renderRekapTable() {
    const tbody = document.getElementById('table-rekap-body');
    tbody.innerHTML = '';

    let totalOmset = 0;

    filteredOrders.forEach(o => {
        if (o.status === 'Selesai') totalOmset += parseInt(o.total || 0);

        tbody.innerHTML += `
            <tr>
                <td>${o.tanggal}</td>
                <td><strong>${o.id}</strong></td>
                <td>${o.nama}</td>
                <td>${o.layanan} (${o.jumlah})</td>
                <td>${formatRupiah(o.total)}</td>
                <td><span class="badge ${getBadgeClass(o.status)}">${o.status}</span></td>
            </tr>
        `;
    });

    document.getElementById('rekap-count').innerText = `${filteredOrders.length} Transaksi`;
    document.getElementById('rekap-total').innerText = formatRupiah(totalOmset);
}

// --- FITUR EXPORT EXCEL ---
function generateExcel(data, fileName) {
    if (data.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    const excelRows = data.map(o => ({
        'ID Order': o.id,
        'Tanggal': o.tanggal,
        'Nama Pelanggan': o.nama,
        'No WhatsApp': o.telepon,
        'Layanan': o.layanan,
        'Jumlah': o.jumlah,
        'Total Biaya (Rp)': o.total,
        'Alamat': o.alamat,
        'Status': o.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Laundry");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

function exportExcelAll() {
    generateExcel(orders, `Laporan_Semua_Transaksi_${new Date().toISOString().slice(0,10)}`);
}

function exportExcelFiltered() {
    generateExcel(filteredOrders, `Rekap_Laporan_Laundry_${new Date().toISOString().slice(0,10)}`);
}

// --- INTERAKSI SIMPAN, UPDATE, DELETE (POST KE API) ---
async function updateStatus(id, newStatus) {
    try {
        await fetch(SPREADSHEET_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateStatus', id: id, status: newStatus })
        });
        loadDataFromSheet(); // Reload data
    } catch (err) {
        alert("Gagal mengupdate status!");
    }
}

async function deleteOrder(id) {
    if (currentUser.role !== 'admin') {
        alert('Akses Ditolak!');
        return;
    }

    if(confirm(`Yakin ingin menghapus pesanan ${id}?`)) {
        try {
            await fetch(SPREADSHEET_API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id: id })
            });
            loadDataFromSheet(); // Reload data
        } catch (err) {
            alert("Gagal menghapus data!");
        }
    }
}

const selectLayanan = document.getElementById('input-layanan');
const inputJumlah = document.getElementById('input-jumlah');
const inputTotal = document.getElementById('input-total');

function calculateTotal() {
    const selectedOption = selectLayanan.options[selectLayanan.selectedIndex];
    const harga = parseFloat(selectedOption.getAttribute('data-harga')) || 0;
    const jumlah = parseFloat(inputJumlah.value) || 0;
    inputTotal.value = harga * jumlah;
}

selectLayanan.addEventListener('change', calculateTotal);
inputJumlah.addEventListener('input', calculateTotal);

document.getElementById('form-order').addEventListener('submit', async function(e) {
    e.preventDefault();

    const newOrder = {
        id: 'LD-' + Math.floor(1000 + Math.random() * 9000),
        nama: document.getElementById('input-nama').value,
        telepon: document.getElementById('input-telepon').value,
        layanan: selectLayanan.value,
        jumlah: parseInt(inputJumlah.value),
        total: parseInt(inputTotal.value),
        tanggal: document.getElementById('input-tanggal').value,
        alamat: document.getElementById('input-alamat').value,
        status: 'Menunggu'
    };

    try {
        await fetch(SPREADSHEET_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'create', data: newOrder })
        });

        alert('Transaksi Berhasil Disimpan ke Spreadsheet!');
        this.reset();
        calculateTotal();
        loadDataFromSheet(); // Sync data terbaru
        document.querySelector('[data-target="page-dashboard"]').click();
    } catch (err) {
        alert("Gagal menyimpan transaksi!");
    }
});

// Tab Navigasi
const menuItems = document.querySelectorAll('.menu-item');
const pageSections = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('page-title');

const titleMap = {
    'page-dashboard': 'Dashboard Utama',
    'page-buat-pesanan': 'Form Input Transaksi',
    'page-status': 'Manajemen Pengerjaan Laundry',
    'page-rekap': 'Rekapitulasi Laporan Keuangan',
    'page-pelanggan': 'Data Pelanggan'
};

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetPage = item.getAttribute('data-target');

        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        pageSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetPage) {
                section.classList.add('active');
            }
        });

        pageTitle.innerText = titleMap[targetPage];
    });
});

// Default Date Inputs
const today = new Date().toISOString().slice(0, 10);
const thisMonth = new Date().toISOString().slice(0, 7);
document.getElementById('input-tanggal').value = today;
document.getElementById('filter-tanggal').value = today;
document.getElementById('filter-bulan').value = thisMonth;

// Inisialisasi
checkAuth();