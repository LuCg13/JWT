document.getElementById("loginForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (response.ok) {
        // Extraer el token de la respuesta
        return response.json();
      } else {
        document.getElementById("errorMessage").textContent = "Credenciales incorrectas";
        throw new Error("Credenciales incorrectas");
      }
    })
    .then((data) => {
      // Guardar el token en localStorage
      localStorage.setItem("token", data.token);
      // Redireccionar al dashboard
      window.location.href = "/dashboard";
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});
