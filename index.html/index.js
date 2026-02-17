import { supabase } from "/src/services/supabase.js";

document.addEventListener("DOMContentLoaded", () => {

  const emailInput   = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn     = document.getElementById("loginBtn");
  const errorEl      = document.getElementById("loginError");

  // Veiligheidscheck
  if (!emailInput || !passwordInput || !loginBtn || !errorEl) {
    console.error("❌ Login DOM-elementen ontbreken");
    return;
  }

  /* =========================
     LOGIN BUTTON CLICK
  ========================= */
  loginBtn.addEventListener("click", async () => {

    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showError("Vul email en wachtwoord in");
      return;
    }

    setLoadingState(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showError("Ongeldige inloggegevens");
      setLoadingState(false);
      return;
    }

    // ✅ Succes → dashboard
    window.location.href = "/src/pages/employee/dashboard.html";
  });

  /* =========================
     HELPERS
  ========================= */

  function showError(message) {
    errorEl.textContent = message;
  }

  function clearError() {
    errorEl.textContent = "";
  }

  function setLoadingState(isLoading) {
    loginBtn.disabled = isLoading;
    loginBtn.textContent = isLoading ? "Bezig..." : "LOG IN";
  }

});