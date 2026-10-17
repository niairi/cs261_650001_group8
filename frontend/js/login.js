
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".login-form");
    const accountInput = document.getElementById("account");
    const passwordInput = document.getElementById("password");
    const togglePasswordButton = document.getElementById("togglePassword");
    const rememberCheckbox = document.getElementById("rememberMe");
    const forgotPasswordLink = document.getElementById("forgotPassword");
    const messageBox = document.getElementById("formMessage");

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

    // ตรวจสอบข้อมูลก่อนส่งฟอร์ม
    form.addEventListener("submit", (event) => {
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

        // รอเชื่อมต่อ backend
        showMessage(
            "ข้อมูลถูกต้องแล้ว แต่ระบบยังไม่ได้เชื่อมต่อ Backend",
            "info"
        );

        console.log("Frontend validation passed.");
    });
});
