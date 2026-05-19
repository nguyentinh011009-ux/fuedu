// Nhập các thư viện Firebase từ CDN (Vì dùng vanilla JS)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyADFk75bvScT28rj8AukdvFeY0UhcgPVtM",
  authDomain: "alex-3dee0.firebaseapp.com",
  projectId: "alex-3dee0",
  storageBucket: "alex-3dee0.firebasestorage.app",
  messagingSenderId: "754491161459",
  appId: "1:754491161459:web:6437f3b6168290974b6306",
  measurementId: "G-NFED8NHYJN"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Lấy các element UI
const authOverlay = document.getElementById("auth-overlay");
const screenLogin = document.getElementById("screen-login");
const screenPasscode = document.getElementById("screen-passcode");
const screenBiometrics = document.getElementById("screen-biometrics");

const btnGoogleLogin = document.getElementById("btn-google-login");
const inputPasscode = document.getElementById("input-passcode");
const btnSubmitPasscode = document.getElementById("btn-submit-passcode");
const passcodeTitle = document.getElementById("passcode-title");
const passcodeDesc = document.getElementById("passcode-desc");

// Biến lưu trữ trạng thái tạm thời
let currentUser = null;
let isNewUser = false;
let tempPasscode = "";

// Hàm chuyển màn hình trong Auth Overlay
function showScreen(screenElement) {
    document.querySelectorAll(".auth-screen").forEach(s => s.classList.remove("active"));
    screenElement.classList.add("active");
}

// -----------------------------------------
// 1. LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
// -----------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        checkUserInDatabase(user);
    } else {
        showScreen(screenLogin);
        authOverlay.classList.remove("hidden");
    }
});

// -----------------------------------------
// 2. XỬ LÝ ĐĂNG NHẬP GOOGLE
// -----------------------------------------
btnGoogleLogin.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
        // Sau khi popup xong, onAuthStateChanged sẽ tự động chạy
    } catch (error) {
        console.error("Lỗi đăng nhập Google:", error);
        alert("Đăng nhập thất bại: " + error.message);
    }
});

// -----------------------------------------
// 3. KIỂM TRA DATABASE (User Mới hay Cũ?)
// -----------------------------------------
async function checkUserInDatabase(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // TÀI KHOẢN MỚI
        isNewUser = true;
        passcodeTitle.textContent = "Tạo Passcode";
        passcodeDesc.textContent = "Nhập 6 số để bảo mật ứng dụng (Bước 1/2)";
        showScreen(screenPasscode);
    } else {
        // TÀI KHOẢN CŨ
        isNewUser = false;
        const userData = userSnap.data();
        
        // Giả lập hỏi Sinh trắc học nếu đã bật
        if (userData.useBiometrics) {
            // (Thực tế trên Web cần dùng WebAuthn, ở đây giả lập confirm để tiện test)
            const bioConfirm = confirm("Quét Sinh trắc học (FaceID/TouchID) để vào app?");
            if (bioConfirm) {
                enterApp();
                return;
            }
        }
        
        // Nếu không có sinh trắc, hoặc hủy sinh trắc -> Bắt nhập Passcode
        passcodeTitle.textContent = "Nhập Passcode";
        passcodeDesc.textContent = "Vui lòng nhập mã PIN 6 số";
        showScreen(screenPasscode);
    }
}

// -----------------------------------------
// 4. XỬ LÝ NHẬP PASSCODE
// -----------------------------------------
btnSubmitPasscode.addEventListener("click", async () => {
    const code = inputPasscode.value;
    if (code.length !== 6) {
        alert("Passcode phải gồm đủ 6 số!");
        return;
    }

    if (isNewUser) {
        if (tempPasscode === "") {
            // Bước 1: Nhập lần 1
            tempPasscode = code;
            inputPasscode.value = "";
            passcodeTitle.textContent = "Xác nhận Passcode";
            passcodeDesc.textContent = "Nhập lại mã PIN 6 số vừa tạo (Bước 2/2)";
        } else {
            // Bước 2: Xác nhận lần 2
            if (code === tempPasscode) {
                showScreen(screenBiometrics); // Chuyển sang hỏi sinh trắc học
            } else {
                alert("Passcode không khớp! Vui lòng làm lại.");
                tempPasscode = "";
                inputPasscode.value = "";
                passcodeTitle.textContent = "Tạo Passcode";
            }
        }
    } else {
        // User cũ -> Kiểm tra passcode có đúng với DB không
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData.passcode === code) {
            enterApp();
        } else {
            alert("Passcode sai! Vui lòng thử lại.");
            inputPasscode.value = "";
        }
    }
});

// -----------------------------------------
// 5. XỬ LÝ CÀI ĐẶT SINH TRẮC HỌC (CHỈ USER MỚI)
// -----------------------------------------
document.getElementById("btn-enable-bio").addEventListener("click", () => finishSetup(true));
document.getElementById("btn-skip-bio").addEventListener("click", () => finishSetup(false));

async function finishSetup(useBio) {
    try {
        // Lưu data user mới lên Firebase Firestore
        await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            name: currentUser.displayName,
            photoURL: currentUser.photoURL,
            passcode: tempPasscode, // Lưu ý: App thực tế nên Hash (Mã hóa) passcode
            useBiometrics: useBio,
            createdAt: new Date()
        });
        enterApp();
    } catch (error) {
        console.error("Lỗi lưu DB:", error);
        alert("Có lỗi xảy ra, thử lại sau.");
    }
}

// -----------------------------------------
// 6. VÀO ỨNG DỤNG THÀNH CÔNG
// -----------------------------------------
function enterApp() {
    inputPasscode.value = ""; // Xóa trắng pass
    authOverlay.classList.add("hidden"); // Ẩn màn hình khóa, hiện app chính
    console.log("Đăng nhập thành công, vào ứng dụng!");
}

// Gán logic Đăng xuất tạm thời vào Nút "Đăng xuất" trong app.js
document.querySelector(".danger").addEventListener("click", async () => {
    await signOut(auth);
    location.reload(); // Reset lại trang
});