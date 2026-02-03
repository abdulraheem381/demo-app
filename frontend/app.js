const statusEl = document.getElementById("status");
const listEl = document.getElementById("project-list");
const formEl = document.getElementById("project-form");
const refreshBtn = document.getElementById("refresh");

const setStatus = (message) => {
  statusEl.textContent = message;
};

const renderProjects = (projects) => {
  listEl.innerHTML = "";
  if (!projects.length) {
    setStatus("No projects yet. Add one above.");
    return;
  }

  setStatus("");
  projects.forEach((project) => {
    const li = document.createElement("li");
    li.className = "card";

    li.innerHTML = `
      <h3>${project.name}</h3>
      <p>${project.description || "No description"}</p>
      <p><strong>Environment:</strong> ${project.environment || "n/a"}</p>
      <p><strong>Created:</strong> ${new Date(project.created_at).toLocaleString()}</p>
    `;

    listEl.appendChild(li);
  });
};

const fetchProjects = async () => {
  setStatus("Loading...");
  try {
    const response = await fetch("/api/projects");
    if (!response.ok) {
      throw new Error("Unable to load projects");
    }
    const data = await response.json();
    renderProjects(data);
  } catch (err) {
    setStatus(err.message);
  }
};

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: document.getElementById("name").value.trim(),
    environment: document.getElementById("environment").value.trim(),
    description: document.getElementById("description").value.trim(),
  };

  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save project");
    }

    formEl.reset();
    await fetchProjects();
  } catch (err) {
    setStatus(err.message);
  }
});

refreshBtn.addEventListener("click", fetchProjects);

fetchProjects();