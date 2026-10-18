
// ===== ตั้งค่าการเชื่อมต่อ Backend =====
const API_URL = "http://localhost:3000";
const TOKEN_KEY = "token"; // ต้องตรงกับที่ booking.js อ่าน
const USER_KEY = "user";   // ข้อมูลผู้ใช้ (ชื่อ, รหัสนักศึกษา) ไว้แสดงในหน้าจอง

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".login-form");
    const accountInput = document.getElementById("account");
    const passwordInput = document.getElementById("password");
    const togglePasswordButton = document.getElementById("togglePassword");
    const rememberCheckbox = document.getElementById("rememberMe");
    const forgotPasswordLink = document.getElementById("forgotPassword");
    const messageBox = document.getElementById("formMessage");
    const submitButton = form ? form.querySelector(".login-button") : null;

    if (
        !form ||
        !accountInput ||
        !passwordInput ||
        !togglePasswordButton ||
        !messageBox
    ) {
        console.error("Login form elements are missing.");
        return;
    }

    function showMessage(message, type = "info") {
        messageBox.textContent = message;
        messageBox.className = `form-message ${type}`;
        messageBox.hidden = false;
    }

    function hideMessage() {
        messageBox.textContent = "";
        messageBox.className = "form-message";
        messageBox.hidden = true;
    }

    togglePasswordButton.addEventListener("click", () => {
        const isPasswordHidden = passwordInput.type === "password";

        passwordInput.type = isPasswordHidden ? "text" : "password";

        togglePasswordButton.innerHTML = isPasswordHidden
            ? '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>'
            : '<i class="fa-regular fa-eye" aria-hidden="true"></i>';

        togglePasswordButton.setAttribute(
            "aria-label",
            isPasswordHidden ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
        );

        togglePasswordButton.setAttribute(
            "aria-pressed",
            String(isPasswordHidden)
        );
    });

    function isValidAccount(value) {
        const account = value.trim();

        const studentIdPattern = /^\d{10}$/;

        const tuEmailPattern =
            /^[^\s@]+@(?:dome\.tu\.ac\.th|tu\.ac\.th)$/i;

        return (
            studentIdPattern.test(account) ||
            tuEmailPattern.test(account)
        );
    }

    accountInput.addEventListener("input", () => {
        accountInput.removeAttribute("aria-invalid");
        hideMessage();
    });

    passwordInput.addEventListener("input", () => {
        passwordInput.removeAttribute("aria-invalid");
        hideMessage();
    });

    // ตรวจสอบข้อมูล แล้วส่งไปเข้าสู่ระบบที่ Backend (POST /login)
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideMessage();

        const account = accountInput.value.trim();
        const password = passwordInput.value;

        accountInput.value = account;

        if (!account) {
            showMessage("กรุณากรอกรหัสนักศึกษาหรืออีเมล TU", "error");
            accountInput.setAttribute("aria-invalid", "true");
            accountInput.focus();
            return;
        }

        if (!isValidAccount(account)) {
            showMessage(
                "กรุณากรอกรหัสนักศึกษา 10 หลัก หรืออีเมล @dome.tu.ac.th / @tu.ac.th ให้ถูกต้อง",
                "error"
            );

            accountInput.setAttribute("aria-invalid", "true");
            accountInput.focus();
            return;
        }

        if (!password) {
            showMessage("กรุณากรอกรหัสผ่าน", "error");
            passwordInput.setAttribute("aria-invalid", "true");
            passwordInput.focus();
            return;
        }

        if (submitButton) submitButton.disabled = true;
        showMessage("กำลังเข้าสู่ระบบ...", "info");

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: account,
                    password,
                    remember: Boolean(rememberCheckbox && rememberCheckbox.checked)
                })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // 400 ไม่กรอก / 401 รหัสผิด / 502 ระบบ TU ล่ม — backend ส่งข้อความภาษาไทยมาให้
                showMessage(data.error || "เข้าสู่ระบบไม่สำเร็จ", "error");
                passwordInput.value = "";
                passwordInput.focus();
                return;
            }

            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            showMessage("เข้าสู่ระบบสำเร็จ กำลังไปหน้าจองห้อง...", "success");
            window.location.href = "./booking.html";
        } catch {
            showMessage("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Backend รันอยู่หรือไม่", "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
});