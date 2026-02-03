import { login } from "../../services/authService.js";
import { supabase } from "../../services/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("loginError");

  if (!emailInput || !passwordInput || !loginBtn || !errorEl) {
    console.error("❌ Login DOM-elementen ontbreken");
    return;
  }

  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    errorEl.textContent = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Bezig...";

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    const result = await login(email, password);

    if (result.error) {
      errorEl.textContent = result.error;
      loginBtn.disabled = false;
      loginBtn.textContent = "LOG IN";
      return;
    }

    // 🔍 Haal user opnieuw op voor role-based redirect
    const { data: { user } } = await supabase.auth.getUser();

    const role = user?.user_metadata?.role;

    if (role === "admin") {
      window.location.href = "/src/pages/admin/dashboard.html";
    } else {
      window.location.href = "/src/pages/employee/dashboard.html";
    }
  });
});