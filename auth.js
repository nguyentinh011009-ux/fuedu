import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADFk75bvScT28rj8AukdvFeY0UhcgPVtM",
  authDomain: "alex-3dee0.firebaseapp.com",
  projectId: "alex-3dee0",
  storageBucket: "alex-3dee0.firebasestorage.app",
  messagingSenderId: "754491161459",
  appId: "1:754491161459:web:6437f3b6168290974b6306",
  measurementId: "G-NFED8NHYJN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Lấy các element UI
const authOverlay = document.getElementById("auth-overlay");
const screenLogin = document.getElementById("screen-login");
const screenConfirmInfo = document.getElementById("screen-confirm-info"); // Thêm màn hình xác nhận
const screenPasscode = document.getElementById("screen-passcode");
const screenBiometrics = document.getElementById("screen-biometrics");

const btnGoogleLogin = document.getElementById("btn-google-login");
const btnConfirmInfo = document.getElementById("btn-confirm-info"); // Nút xác nhận thông tin
const inputPasscode = document.getElementById("input-passcode");
const btnSubmitPasscode = document.getElementById("btn-submit-passcode");
const passcodeTitle = document.getElementById("passcode-title");
const passcodeDesc = document.getElementById("passcode-desc");

let currentUser = null;
let isNewUser = false;
let tempPasscode = "";

function showScreen(screenElement) {
    document.querySelectorAll(".auth-screen").forEach(s => s.classList.remove("active"));
    screenElement.classList.add("active");
}

// 1. LẮNG NGHE TRẠNG THÁI
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await checkUserInDatabase(user);
    } else {
        showScreen(screenLogin);
        authOverlay.classList.remove("hidden");
    }
});

// 2. ĐĂNG NHẬP GOOGLE
btnGoogleLogin.addEventListener("click", async () => {
    try {
        btnGoogleLogin.textContent = "Đang kết nối...";
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Lỗi đăng nhập Google:", error);
        alert("Đăng nhập thất bại: " + error.message);
        btnGoogleLogin.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/1280px-Google_Favicon_2025.svg.png" width="24"> Đăng nhập bằng Google`;
    }
});

// 3. KIỂM TRA DATABASE (User Mới hay Cũ?)
async function checkUserInDatabase(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // TÀI KHOẢN MỚI -> Hiện bước xác nhận thông tin
            isNewUser = true;
            document.getElementById("confirm-avatar").src = user.photoURL || "https://res.cloudinary.com/dsnlbzjby/image/upload/q_auto/f_auto/v1779194252/ChatGPT_Image_19_26_47_19_thg_5_2026_x7nng0.png";
            document.getElementById("confirm-name").textContent = user.displayName;
            document.getElementById("confirm-email").textContent = user.email;
            showScreen(screenConfirmInfo);
        } else {
            // TÀI KHOẢN CŨ
            isNewUser = false;
            const userData = userSnap.data();
            
            if (userData.useBiometrics) {
                const bioConfirm = confirm("Quét Sinh trắc học (FaceID/TouchID) để vào app?");
                if (bioConfirm) {
                    enterApp();
                    return;
                }
            }
            passcodeTitle.textContent = "Nhập Passcode";
            passcodeDesc.textContent = "Vui lòng nhập mã PIN 6 số";
            showScreen(screenPasscode);
        }
    } catch (error) {
        console.error("Lỗi Firestore:", error);
        alert("Lỗi kết nối cơ sở dữ liệu! Vui lòng kiểm tra quyền Firestore Rules trên Firebase.");
    }
}

// 4. XÁC NHẬN THÔNG TIN (CHUYỂN SANG NHẬP PASSCODE)
btnConfirmInfo.addEventListener("click", () => {
    passcodeTitle.textContent = "Tạo Passcode";
    passcodeDesc.textContent = "Nhập 6 số để bảo mật (Bước 1/2)";
    showScreen(screenPasscode);
});

// 5. NHẬP PASSCODE
btnSubmitPasscode.addEventListener("click", async () => {
    const code = inputPasscode.value;
    if (code.length !== 6) return alert("Passcode phải gồm đủ 6 số!");

    if (isNewUser) {
        if (tempPasscode === "") {
            tempPasscode = code;
            inputPasscode.value = "";
            passcodeTitle.textContent = "Xác nhận Passcode";
            passcodeDesc.textContent = "Nhập lại mã PIN 6 số vừa tạo (Bước 2/2)";
        } else {
            if (code === tempPasscode) {
                showScreen(screenBiometrics);
            } else {
                alert("Passcode không khớp! Vui lòng làm lại.");
                tempPasscode = ""; inputPasscode.value = "";
                passcodeTitle.textContent = "Tạo Passcode";
            }
        }
    } else {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData.passcode === code) enterApp();
        else { alert("Passcode sai!"); inputPasscode.value = ""; }
    }
});

// 6. SETUP SINH TRẮC HỌC
document.getElementById("btn-enable-bio").addEventListener("click", () => finishSetup(true));
document.getElementById("btn-skip-bio").addEventListener("click", () => finishSetup(false));

async function finishSetup(useBio) {
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            name: currentUser.displayName,
            photoURL: currentUser.photoURL,
            passcode: tempPasscode,
            useBiometrics: useBio,
            createdAt: new Date()
        });
        enterApp();
    } catch (error) {
        console.error("Lỗi lưu DB:", error);
        alert("Có lỗi xảy ra khi tạo tài khoản!");
    }
}

// 7. VÀO APP & ĐĂNG XUẤT
function enterApp() {
    inputPasscode.value = "";
    authOverlay.classList.add("hidden");
    // Load ảnh avatar vào tab Tài khoản
    document.getElementById("profile-avatar").src = currentUser.photoURL;
    document.getElementById("profile-name").textContent = currentUser.displayName;
    document.getElementById("profile-email").textContent = currentUser.email;
}

document.getElementById("btn-logout").addEventListener("click", async () => {
    await signOut(auth);
    location.reload();
});

export { auth, db };
