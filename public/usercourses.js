window.onload = function () {
  fetch("/courses", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener los cursos del usuario");
      }
      return response.json();
    })
    .then((courses) => {
      const coursesContainer = document.getElementById("coursesContainer");
      courses.forEach((course) => {
        const courseElement = document.createElement("p");
        courseElement.textContent = course.name;
        coursesContainer.appendChild(courseElement);
      });
    })
    .catch((error) => {
      console.error("Error al obtener los cursos del usuario:", error);
    });
};
