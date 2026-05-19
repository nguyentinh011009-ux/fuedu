// 1. IMPORT FIREBASE VÀ CÁC BIẾN TỪ AUTH.JS
import { auth, db } from './auth.js';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- LẤY CÁC DOM ELEMENTS NHƯ CŨ ---
    const header = document.getElementById("main-header");
    const bottomNav = document.getElementById("bottom-nav");
    const headerTitle = document.getElementById("header-title");
    const headerActions = document.getElementById("header-actions");
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const btnSearch = document.getElementById("btn-search");
    const btnAddTransaction = document.getElementById("btn-add-transaction");
    const searchFilterBar = document.getElementById("search-filter-bar");
    const modalAddTx = document.getElementById("modal-add-transaction");
    const modalAddWallet = document.getElementById("modal-add-wallet");
    const btnAddWallet = document.getElementById("btn-add-wallet");
    const closeButtons = document.querySelectorAll(".close-modal");

    let currentTab = "tab-expense";

    // ==========================================
    // LOGIC UI: CUỘN, CHUYỂN TAB, ĐÓNG MỞ POPUP (GIỮ NGUYÊN)
    // ==========================================
    let lastScrollTop = 0;
    window.addEventListener("scroll", () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            header.classList.add("hidden"); bottomNav.classList.add("hidden");
        } else {
            header.classList.remove("hidden"); bottomNav.classList.remove("hidden");
        }
        lastScrollTop = scrollTop;
    });

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(nav => nav.classList.remove("active"));
            tabContents.forEach(tab => tab.classList.remove("active"));
            item.classList.add("active");
            currentTab = item.getAttribute("data-target");
            document.getElementById(currentTab).classList.add("active");
            headerTitle.textContent = item.getAttribute("data-title");

            if (currentTab === "tab-expense" || currentTab === "tab-income") {
                headerActions.style.display = "block";
                if (currentTab === "tab-income") searchFilterBar.classList.add("hidden");
            } else {
                headerActions.style.display = "none";
                searchFilterBar.classList.add("hidden");
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    btnSearch.addEventListener("click", () => {
        if (currentTab === "tab-expense" || currentTab === "tab-income") {
            searchFilterBar.classList.toggle("hidden");
        }
    });

    btnAddTransaction.addEventListener("click", () => {
        const modalTitle = document.getElementById("modal-tx-title");
        const amountInput = document.getElementById("tx-amount");
        if (currentTab === "tab-income") {
            modalTitle.textContent = "Thêm Thu Nhập";
            amountInput.style.color = "#00B894"; amountInput.style.borderColor = "#00B894";
        } else {
            modalTitle.textContent = "Thêm Giao Dịch Chi";
            amountInput.style.color = "#FF416C"; amountInput.style.borderColor = "#FF416C";
        }
        loadWalletsToDropdown(); // Tải danh sách ví thật vào Dropdown
        modalAddTx.classList.add("active");
    });

    if(btnAddWallet) btnAddWallet.addEventListener("click", () => modalAddWallet.classList.add("active"));
    
    closeButtons.forEach(btn => btn.addEventListener("click", () => {
        modalAddTx.classList.remove("active"); modalAddWallet.classList.remove("active");
    }));

    const walletTypeSelect = document.getElementById("wallet-type");
    const bankSelectGroup = document.getElementById("bank-select-group");
    if (walletTypeSelect && bankSelectGroup) {
        walletTypeSelect.addEventListener("change", (e) => {
            bankSelectGroup.style.display = (e.target.value === "bank" || e.target.value === "saving") ? "block" : "none";
        });
    }


    // ==========================================
    // LOGIC FIREBASE: 1. THÊM NGUỒN TIỀN
    // ==========================================
    const btnSaveWallet = document.getElementById("btn-save-wallet");
    btnSaveWallet.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) return alert("Vui lòng đăng nhập!");

        // Lấy dữ liệu từ form
        const type = document.getElementById("wallet-type").value;
        const bankName = document.getElementById("wallet-bank-name").value;
        const amount = Number(document.getElementById("wallet-amount").value);

        if (amount < 0) return alert("Số tiền không được âm!");

        // Khóa nút để tránh bấm 2 lần
        btnSaveWallet.disabled = true;
        btnSaveWallet.textContent = "Đang lưu...";

        try {
            await addDoc(collection(db, "wallets"), {
                userId: user.uid,
                type: type, // cash, bank, saving
                name: type === 'cash' ? 'Tiền mặt' : bankName,
                balance: amount,
                createdAt: serverTimestamp()
            });

            alert("Thêm nguồn tiền thành công!");
            modalAddWallet.classList.remove("active");
            document.getElementById("wallet-amount").value = ""; // Xóa trắng ô nhập
            
            // TODO: Gọi hàm render danh sách nguồn tiền ở Tab 2 tại đây
        } catch (error) {
            console.error("Lỗi thêm ví:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
            btnSaveWallet.disabled = false;
            btnSaveWallet.textContent = "Lưu Nguồn Tiền";
        }
    });


    // ==========================================
    // LOGIC FIREBASE: 2. TẢI VÍ VÀO DROPDOWN GIAO DỊCH
    // ==========================================
    async function loadWalletsToDropdown() {
        const user = auth.currentUser;
        if (!user) return;

        const txWalletSelect = document.getElementById("tx-wallet");
        txWalletSelect.innerHTML = "<option value=''>Đang tải...</option>";

        try {
            const q = query(collection(db, "wallets"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            txWalletSelect.innerHTML = ""; // Xóa chữ "Đang tải..."
            
            if (querySnapshot.empty) {
                txWalletSelect.innerHTML = "<option value=''>Bạn chưa có nguồn tiền nào</option>";
                return;
            }

            querySnapshot.forEach((doc) => {
                const wallet = doc.data();
                const option = document.createElement("option");
                option.value = doc.id; // Lấy ID của ví làm value
                // Format số tiền: 1500000 -> 1.500.000đ
                const balanceFormatted = wallet.balance.toLocaleString('vi-VN') + "đ";
                option.textContent = `${wallet.name} (${balanceFormatted})`;
                txWalletSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Lỗi tải ví:", error);
        }
    }


    // ==========================================
    // LOGIC FIREBASE: 3. THÊM GIAO DỊCH VÀ CẬP NHẬT SỐ DƯ
    // ==========================================
    const btnSaveTx = document.getElementById("btn-save-tx");
    btnSaveTx.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) return alert("Vui lòng đăng nhập!");

        const amount = Number(document.getElementById("tx-amount").value);
        const tag = document.getElementById("tx-tag").value;
        const walletId = document.getElementById("tx-wallet").value;
        const note = document.getElementById("tx-note").value;
        const txType = (currentTab === "tab-income") ? "income" : "expense";

        if (!amount || amount <= 0) return alert("Vui lòng nhập số tiền hợp lệ!");
        if (!walletId) return alert("Vui lòng chọn nguồn tiền!");

        btnSaveTx.disabled = true;
        btnSaveTx.textContent = "Đang xử lý...";

        try {
            // Lấy thông tin ví hiện tại để tính toán số dư mới
            let currentBalance = 0;
            // Ở đây mình lấy số dư từ text của Option dropdown cho nhanh, thực tế nên query lại DB cho chắc,
            // Nhưng để hiệu năng nhanh, ta có thể query trực tiếp document đó
            const walletRef = doc(db, "wallets", walletId);
            
            // Bước 1: Lưu lịch sử giao dịch vào collection 'transactions'
            await addDoc(collection(db, "transactions"), {
                userId: user.uid,
                type: txType,
                amount: amount,
                tag: tag,
                walletId: walletId,
                note: note,
                createdAt: serverTimestamp()
            });

            // Bước 2: Cập nhật số dư của Ví. (Nếu là app lớn nên dùng Firestore Transaction)
            // Lấy text của Option để bóc tách số dư (chỉ là trick Frontend)
            const optionText = document.querySelector(`#tx-wallet option[value="${walletId}"]`).textContent;
            const balanceString = optionText.match(/\(([^)]+)\)/)[1].replace(/\./g, '').replace('đ', '');
            currentBalance = Number(balanceString);

            let newBalance = txType === "income" ? currentBalance + amount : currentBalance - amount;

            await updateDoc(walletRef, {
                balance: newBalance
            });

            alert("Đã ghi nhận giao dịch!");
            modalAddTx.classList.remove("active");
            
            // Reset form
            document.getElementById("tx-amount").value = "";
            document.getElementById("tx-note").value = "";
            
            // TODO: Gọi hàm render lại danh sách lịch sử giao dịch
        } catch (error) {
            console.error("Lỗi thêm giao dịch:", error);
            alert("Lỗi khi thêm giao dịch.");
        } finally {
            btnSaveTx.disabled = false;
            btnSaveTx.textContent = "Thêm giao dịch";
        }
    });

});