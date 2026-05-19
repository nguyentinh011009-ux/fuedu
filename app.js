document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. LẤY CÁC PHẦN TỬ DOM (DOM ELEMENTS)
    // ==========================================
    
    // Header & Nav
    const header = document.getElementById("main-header");
    const bottomNav = document.getElementById("bottom-nav");
    const headerTitle = document.getElementById("header-title");
    const headerActions = document.getElementById("header-actions");
    
    // Tabs
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    
    // Nút chức năng Header
    const btnSearch = document.getElementById("btn-search");
    const btnAddTransaction = document.getElementById("btn-add-transaction");
    const searchFilterBar = document.getElementById("search-filter-bar");
    
    // Modals (Popups)
    const modalAddTx = document.getElementById("modal-add-transaction");
    const modalAddWallet = document.getElementById("modal-add-wallet");
    const btnAddWallet = document.getElementById("btn-add-wallet");
    const closeButtons = document.querySelectorAll(".close-modal");

    // Biến trạng thái tab hiện tại
    let currentTab = "tab-expense";


    // ==========================================
    // 2. LOGIC ẨN/HIỆN HEADER & BOTTOM NAV KHI CUỘN
    // ==========================================
    let lastScrollTop = 0;
    
    window.addEventListener("scroll", () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Nếu cuộn xuống và khoảng cách cuộn > 50px (tránh giật khi ở sát top)
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            header.classList.add("hidden");
            bottomNav.classList.add("hidden");
        } else {
            // Cuộn lên
            header.classList.remove("hidden");
            bottomNav.classList.remove("hidden");
        }
        lastScrollTop = scrollTop;
    });


    // ==========================================
    // 3. LOGIC CHUYỂN TAB (BOTTOM NAVIGATION)
    // ==========================================
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            // 1. Xóa trạng thái active của tất cả
            navItems.forEach(nav => nav.classList.remove("active"));
            tabContents.forEach(tab => tab.classList.remove("active"));

            // 2. Kích hoạt tab được bấm
            item.classList.add("active");
            currentTab = item.getAttribute("data-target");
            document.getElementById(currentTab).classList.add("active");

            // 3. Đổi tiêu đề Header
            headerTitle.textContent = item.getAttribute("data-title");

            // 4. Logic hiển thị nút (+) và Kính lúp trên Header
            // Chỉ hiển thị ở Tab Chi (tab-expense) hoặc Tab Thu (tab-income)
            if (currentTab === "tab-expense" || currentTab === "tab-income") {
                headerActions.style.display = "block";
                
                // Nếu chuyển qua tab Thu, ẩn thanh search của tab Chi (nếu đang mở)
                if (currentTab === "tab-income") {
                    searchFilterBar.classList.add("hidden");
                }
            } else {
                // Các tab khác thì ẩn các nút này đi
                headerActions.style.display = "none";
                searchFilterBar.classList.add("hidden");
            }
            
            // 5. Cuộn lên đầu trang mượt mà
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });


    // ==========================================
    // 4. LOGIC MỞ/ĐÓNG THANH TÌM KIẾM
    // ==========================================
    btnSearch.addEventListener("click", () => {
        // Chỉ cho phép mở search ở tab Giao dịch
        if (currentTab === "tab-expense" || currentTab === "tab-income") {
            searchFilterBar.classList.toggle("hidden");
        }
    });


    // ==========================================
    // 5. LOGIC MODALS (POPUP THÊM GIAO DỊCH & NGUỒN TIỀN)
    // ==========================================
    
    // Mở Modal Thêm Giao Dịch
    btnAddTransaction.addEventListener("click", () => {
        const modalTitle = document.getElementById("modal-tx-title");
        const amountInput = document.getElementById("tx-amount");

        // UI linh động: Đổi màu và tiêu đề tùy theo đang ở Tab Thu hay Chi
        if (currentTab === "tab-income") {
            modalTitle.textContent = "Thêm Thu Nhập";
            amountInput.style.color = "#00B894"; // Xanh lá
            amountInput.style.borderColor = "#00B894";
        } else {
            modalTitle.textContent = "Thêm Giao Dịch Chi";
            amountInput.style.color = "#FF416C"; // Đỏ
            amountInput.style.borderColor = "#FF416C";
        }

        modalAddTx.classList.add("active");
    });

    // Mở Modal Thêm Nguồn Tiền (Ở Tab 2)
    if(btnAddWallet) {
        btnAddWallet.addEventListener("click", () => {
            modalAddWallet.classList.add("active");
        });
    }

    // Đóng Modal khi bấm nút (X)
    closeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            modalAddTx.classList.remove("active");
            modalAddWallet.classList.remove("active");
        });
    });

    // Đóng Modal khi click ra ngoài vùng nội dung
    window.addEventListener("click", (e) => {
        if (e.target === modalAddTx) modalAddTx.classList.remove("active");
        if (e.target === modalAddWallet) modalAddWallet.classList.remove("active");
    });


    // ==========================================
    // 6. LOGIC FORM THÊM NGUỒN TIỀN (DYNAMIC UI)
    // ==========================================
    const walletTypeSelect = document.getElementById("wallet-type");
    const bankSelectGroup = document.getElementById("bank-select-group");

    if (walletTypeSelect && bankSelectGroup) {
        walletTypeSelect.addEventListener("change", (e) => {
            // Nếu chọn Ngân hàng hoặc Tiết kiệm -> Hiện ô chọn Ngân hàng
            if (e.target.value === "bank" || e.target.value === "saving") {
                bankSelectGroup.style.display = "block";
            } else {
                // Nếu chọn Tiền mặt -> Ẩn ô chọn Ngân hàng
                bankSelectGroup.style.display = "none";
            }
        });
    }

});