const statusEl = document.getElementById("status-message");
const listEl = document.getElementById("project-list");
const formEl = document.getElementById("project-form");
const refreshBtn = document.getElementById("refresh");
const metricsEl = document.getElementById("metrics");
const searchEl = document.getElementById("search");
const filterStatusEl = document.getElementById("filter-status");
const filterPriorityEl = document.getElementById("filter-priority");
const filterEnvEl = document.getElementById("filter-environment");
const clearFiltersEl = document.getElementById("clear-filters");

const setStatus = (message) => {
  statusEl.textContent = message;
};

const normalizeStatus = (value) => {
  const allowed = ["planning", "in-progress", "done"];
  return allowed.includes(value) ? value : "planning";
};

const normalizePriority = (value) => {
  const allowed = ["low", "medium", "high"];
  return allowed.includes(value) ? value : "medium";
};

const updateMetrics = (projects) => {
  if (!metricsEl) {
    return;
  }
  const counts = {
    planning: 0,
    "in-progress": 0,
    done: 0,
  };
  projects.forEach((project) => {
    const status = normalizeStatus(project.status);
    counts[status] += 1;
  });

  metricsEl.innerHTML = `
    <span class="metric"><strong>${counts.planning}</strong> Planning</span>
    <span class="metric"><strong>${counts["in-progress"]}</strong> In Progress</span>
    <span class="metric"><strong>${counts.done}</strong> Done</span>
  `;
};

const renderProjects = (projects) => {
  listEl.innerHTML = "";
  if (!projects.length) {
    setStatus("No projects yet. Add one above.");
    return;
  }

  setStatus("");
  projects.forEach((project) => {
    const status = normalizeStatus(project.status);
    const priority = normalizePriority(project.priority);
    const environment = project.environment || "n/a";
    const description = project.description || "No description";
    const li = document.createElement("li");
    li.className = "card fade-in";

    li.innerHTML = `
      <h3>${project.name}</h3>
      <div class="card-meta">
        <span class="pill status-${status}">${status.replace("-", " ")}</span>
        <span class="pill priority-${priority}">${priority}</span>
        <span class="pill">Env: ${environment}</span>
      </div>
      <p>${description}</p>
      <p><strong>Created:</strong> ${new Date(project.created_at).toLocaleString()}</p>
      <div class="grid-two">
        <label>
          Status
          <select data-id="${project.id}" data-field="status">
            <option value="planning" ${status === "planning" ? "selected" : ""}>Planning</option>
            <option value="in-progress" ${status === "in-progress" ? "selected" : ""}>In Progress</option>
            <option value="done" ${status === "done" ? "selected" : ""}>Done</option>
          </select>
        </label>
        <label>
          Priority
          <select data-id="${project.id}" data-field="priority">
            <option value="low" ${priority === "low" ? "selected" : ""}>Low</option>
            <option value="medium" ${priority === "medium" ? "selected" : ""}>Medium</option>
            <option value="high" ${priority === "high" ? "selected" : ""}>High</option>
          </select>
        </label>
      </div>
      <div class="card-actions">
        <button class="ghost save" data-id="${project.id}">Save</button>
        <button class="delete" data-id="${project.id}">Delete</button>
      </div>
    `;

    listEl.appendChild(li);
  });
};

const buildQuery = () => {
  const params = new URLSearchParams();
  if (searchEl?.value) params.set("search", searchEl.value.trim());
  if (filterStatusEl?.value) params.set("status", filterStatusEl.value);
  if (filterPriorityEl?.value) params.set("priority", filterPriorityEl.value);
  if (filterEnvEl?.value) params.set("environment", filterEnvEl.value);
  return params.toString();
};

const fetchProjects = async () => {
  setStatus("Loading...");
  try {
    const query = buildQuery();
    const response = await fetch(`/api/projects${query ? `?${query}` : ""}`);
    if (!response.ok) {
      throw new Error("Unable to load projects");
    }
    const data = await response.json();
    renderProjects(data);
    updateMetrics(data);
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
    status: document.getElementById("status").value,
    priority: document.getElementById("priority").value,
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

listEl.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.classList.contains("delete")) {
    const projectId = target.dataset.id;
    if (!projectId) return;
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete project");
      }
      await fetchProjects();
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (target.classList.contains("save")) {
    const projectId = target.dataset.id;
    if (!projectId) return;
    const selects = listEl.querySelectorAll(`select[data-id="${projectId}"]`);
    const payload = {};
    selects.forEach((select) => {
      payload[select.dataset.field] = select.value;
    });
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to update project");
      }
      await fetchProjects();
    } catch (err) {
      setStatus(err.message);
    }
  }
});

const handleFilterChange = () => {
  fetchProjects();
};

searchEl?.addEventListener("input", handleFilterChange);
filterStatusEl?.addEventListener("change", handleFilterChange);
filterPriorityEl?.addEventListener("change", handleFilterChange);
filterEnvEl?.addEventListener("change", handleFilterChange);
clearFiltersEl?.addEventListener("click", () => {
  searchEl.value = "";
  filterStatusEl.value = "";
  filterPriorityEl.value = "";
  filterEnvEl.value = "";
  fetchProjects();
});

refreshBtn.addEventListener("click", fetchProjects);

fetchProjects();
