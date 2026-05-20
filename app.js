// IMPORT CÁC THƯ VIỆN CẦN THIẾT
import { auth, db } from './auth.js';
import { banks } from './banks.js';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- LẤY CÁC DOM ELEMENTS ---
    // (Giữ nguyên các biến const của bạn)
    const header = document.getElementById("main-header");
    // ... và các biến const khác
    let allTransactions = []; // Biến lưu toàn bộ giao dịch để tìm kiếm

    // === HÀM RENDER DỮ LIỆU ===

    // 1. Render các ô tóm tắt số dư (Tab 1)
    function renderWalletSummary(wallets) {
        const container = document.getElementById("wallet-summary-container");
        let total = 0;
        let html = '';
        wallets.forEach(w => {
            total += w.balance;
            html += `<div class="summary-card"><p>${w.name}</p><h4>${w.balance.toLocaleString('vi-VN')}đ</h4></div>`;
        });
        html += `<div class="summary-card total"><p>Tổng tài sản</p><h4>${total.toLocaleString('vi-VN')}đ</h4></div>`;
        container.innerHTML = html;
    }

    // 2. Render danh sách nguồn tiền chi tiết (Tab 2)
    function renderWalletsList(wallets) {
        const container = document.getElementById("wallet-list-container");
        let html = '';
        wallets.forEach(w => {
            const iconClass = w.type === 'cash' ? 'cash' : 'bank';
            const icon = w.type === 'cash' ? 'fa-money-bill-wave' : 'fa-university';
            html += `
                <div class="wallet-item">
                    <div class="wallet-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                    <div class="wallet-info"><h4>${w.name}</h4><p>${w.type === 'saving' ? 'Tài khoản tiết kiệm' : 'Tài khoản thanh toán'}</p></div>
                    <div class="wallet-balance">${w.balance.toLocaleString('vi-VN')}đ</div>
                    <div class="wallet-actions"><i class="fas fa-edit text-blue"></i><i class="fas fa-trash text-red"></i></div>
                </div>`;
        });
        container.innerHTML = wallets.length > 0 ? html : `<p class="loading-text">Bạn chưa có nguồn tiền nào.</p>`;
    }

    // 3. Render danh sách giao dịch (Tab 1)
    function renderTransactions(transactions) {
        const container = document.getElementById("transaction-list-container");
        let html = '';
        transactions.forEach(tx => {
            const isExpense = tx.type === 'expense';
            const sign = isExpense ? '-' : '+';
            const colorClass = isExpense ? 'expense' : 'income';
            const icon = tx.icon || (isExpense ? 'fa-shopping-bag' : 'fa-hand-holding-usd');
            const date = tx.createdAt ? new Date(tx.createdAt.toDate()).toLocaleDateString('vi-VN') : 'Vừa xong';

            html += `
                <div class="tx-item ${colorClass}">
                    <div class="tx-icon"><i class="fas ${icon}"></i></div>
                    <div class="tx-info">
                        <h4>${tx.tag}</h4>
                        <p>${tx.note || 'Không có ghi chú'} • ${date}</p>
                    </div>
                    <div class="tx-amount">${sign}${tx.amount.toLocaleString('vi-VN')}đ</div>
                </div>`;
        });
        container.innerHTML = transactions.length > 0 ? html : `<p class="loading-text">Không có giao dịch nào.</p>`;
    }

    // === HÀM TẢI DỮ LIỆU TỪ FIREBASE (REALTIME) ===

    function startRealtimeListeners(userId) {
        // Lắng nghe Nguồn tiền
        const walletsQuery = query(collection(db, "wallets"), where("userId", "==", userId));
        onSnapshot(walletsQuery, (snapshot) => {
            const wallets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWalletSummary(wallets);
            renderWalletsList(wallets);
        });

        // Lắng nghe Giao dịch
        const txQuery = query(collection(db, "transactions"), where("userId", "==", userId), orderBy("createdAt", "desc"));
        onSnapshot(txQuery, (snapshot) => {
            allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRenderTransactions(); // Lọc và render theo nút gạt
        });
    }

    // === XỬ LÝ TƯƠNG TÁC (EVENTS) ===

    // Lọc và render giao dịch theo nút gạt và ô tìm kiếm
    function filterAndRenderTransactions() {
        const typeFilter = document.querySelector(".toggle-btn.active").getAttribute("data-type");
        const searchKeyword = document.querySelector(".search-input").value.toLowerCase();
        
        let filtered = allTransactions.filter(tx => tx.type === typeFilter);

        if (searchKeyword) {
            filtered = filtered.filter(tx => 
                (tx.note && tx.note.toLowerCase().includes(searchKeyword)) || 
                (tx.tag && tx.tag.toLowerCase().includes(searchKeyword))
            );
        }
        renderTransactions(filtered);
    }
    document.querySelectorAll(".toggle-btn").forEach(btn => btn.addEventListener("click", () => {
        document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filterAndRenderTransactions();
    }));
    document.querySelector(".search-input").addEventListener("input", filterAndRenderTransactions);

    // Xử lý Thêm Nguồn tiền
    document.getElementById("btn-save-wallet").addEventListener("click", async () => { /* ... giữ nguyên code cũ ... */ });
    
    // Xử lý Thêm Giao dịch
    document.getElementById("btn-save-tx").addEventListener("click", async () => {
        const user = auth.currentUser;
        const amount = Number(document.getElementById("tx-amount").value);
        const tag = document.getElementById("tx-tag").value.trim();
        const walletId = document.getElementById("tx-wallet").value;
        const note = document.getElementById("tx-note").value.trim();
        const txType = document.getElementById("tx-type-select").value;

        if (!user || !amount || !tag || !walletId) return alert("Vui lòng nhập đủ thông tin!");
        
        // Logic lưu Tag mới
        const tagsQuery = query(collection(db, "users", user.uid, "tags"), where("name", "==", tag));
        const existingTags = await getDocs(tagsQuery);
        if (existingTags.empty) {
            await addDoc(collection(db, "users", user.uid, "tags"), { name: tag });
        }
        
        // Logic lưu giao dịch và cập nhật số dư (tương tự code cũ)
        // ...
    });
    
    // === KHỞI TẠO ỨNG DỤNG ===
    
    // Tải danh sách ngân hàng vào popup
    function populateBankList() {
        const select = document.getElementById("wallet-bank-name");
        select.innerHTML = banks.map(b => `<option value="${b.name}">${b.shortName} - ${b.name}</option>`).join('');
    }

    // Tải tag của người dùng vào popup
    async function loadUserTags() {
        // (Sẽ code ở phần sau để làm DataList cho phép gõ tag mới)
    }

    // Lắng nghe trạng thái đăng nhập
    auth.onAuthStateChanged((user) => {
        if (user) {
            startRealtimeListeners(user.uid);
            populateBankList();
            loadUserTags();
        }
    });

    // Các logic UI khác (cuộn, chuyển tab...) giữ nguyên
    // ...
});
