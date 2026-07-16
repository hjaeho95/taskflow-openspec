(async function () {
  const user = await requireTeam();
  if (!user) return;

  const teamId = new URLSearchParams(location.search).get("team") || user.team_id;
  document.getElementById("chat-link").href = `chat.html?team=${teamId}`;
  document.getElementById("mobile-chat-link").href = `chat.html?team=${teamId}`;
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("mobile-user-email").textContent = user.email;
  document.getElementById("mobile-avatar").textContent = user.email[0].toUpperCase();

  let team = null;
  let members = [];
  let tasks = [];
  let currentFilter = "";
  let activeMobileStatus = "TODO";
  let editingTaskId = null;
  let pendingDeleteTaskId = null;

  async function loadTeamAndMembers() {
    team = await api.getTeam(teamId);
    members = await api.getMembers(teamId);
    document.getElementById("team-name").textContent = `${team.name} 팀`;
    document.getElementById("mobile-team-name").textContent = `${team.name} 팀`;
    renderMembers();
    populateAssigneeSelect();
  }

  function renderMembers() {
    const list = document.getElementById("members-list");
    list.innerHTML = "";
    members.forEach((m) => {
      const li = document.createElement("li");
      li.className = "flex items-center gap-2 text-sm";
      li.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">${m.email[0].toUpperCase()}</div>
        <div class="flex-1">
          <div>${m.email}${m.id === user.id ? " (나)" : ""}</div>
        </div>
        ${m.role === "owner" ? '<span class="text-xs text-amber-600 font-semibold">★ owner</span>' : '<span class="text-xs text-gray-400">member</span>'}
      `;
      list.appendChild(li);
    });
  }

  function populateAssigneeSelect() {
    const sel = document.getElementById("modal-assignee-select");
    sel.innerHTML = `<option value="">미할당</option>`;
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.id === user.id ? `@me (${m.email})` : m.email;
      sel.appendChild(opt);
    });
  }

  async function loadTasks() {
    tasks = await api.listTasks(teamId, currentFilter || undefined);
    renderBoard();
  }

  function taskCardHtml(task) {
    const assignee = members.find((m) => m.id === task.assignee_id);
    const badge =
      task.assignee_id === null
        ? '<span class="text-xs bg-amber-100 text-amber-700 px-1 rounded">미할당</span>'
        : `<span class="text-xs text-gray-400">@${assignee ? assignee.email.split("@")[0] : task.assignee_id}</span>`;
    return `
      <div class="task-card bg-white border rounded p-2 cursor-pointer shadow-sm hover:shadow" draggable="true" data-id="${task.id}">
        <div class="text-sm font-medium">${escapeHtml(task.title)}</div>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-gray-400">#${task.id}</span>
          ${badge}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderBoard() {
    ["TODO", "DOING", "DONE"].forEach((status) => {
      const body = document.querySelector(`.col-body[data-status="${status}"]`);
      const colTasks = tasks.filter((t) => t.status === status);
      const countEl = body
        .closest(".kanban-col")
        .querySelector(".col-count");
      countEl.textContent = colTasks.length;

      if (colTasks.length === 0) {
        const ctaHtml =
          status === "TODO"
            ? `<button class="empty-add-btn text-teal-700 font-semibold text-sm mt-2" data-status="TODO">+ 첫 태스크 만들기</button>`
            : `<p class="text-xs text-gray-300 mt-2">드래그로 이동</p>`;
        body.innerHTML = `
          <div class="flex flex-col items-center justify-center text-center py-8 text-gray-400">
            <div class="text-2xl mb-2">📋</div>
            <p class="text-sm">카드 없음</p>
            ${ctaHtml}
          </div>`;
      } else {
        body.innerHTML = colTasks.map(taskCardHtml).join("");
      }
    });

    document.querySelectorAll(".task-card").forEach((el) => {
      el.addEventListener("click", () => openTaskModal(Number(el.dataset.id)));
      el.addEventListener("dragstart", onDragStart);
      attachLongPress(el);
    });
    document.querySelectorAll(".empty-add-btn").forEach((el) => {
      el.addEventListener("click", () => startInlineCreate(el.dataset.status));
    });

    // Mobile: only show the active column
    document.querySelectorAll(".kanban-col").forEach((col) => {
      col.classList.toggle("hidden", window.innerWidth < 1024 && col.dataset.status !== activeMobileStatus);
    });
  }

  // --- Filters ---
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("bg-gray-900", "text-white");
        b.classList.add("border");
      });
      btn.classList.add("bg-gray-900", "text-white");
      btn.classList.remove("border");
      currentFilter = btn.dataset.filter;
      loadTasks();
    });
  });

  // --- Mobile column tabs (7.2 swipe substitute: tap tabs) ---
  document.querySelectorAll(".mobile-col-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeMobileStatus = tab.dataset.status;
      document.querySelectorAll(".mobile-col-tab").forEach((t) => {
        t.classList.toggle("border-teal-700", t === tab);
        t.classList.toggle("text-gray-400", t !== tab);
        t.classList.toggle("border-transparent", t !== tab);
      });
      renderBoard();
    });
  });

  // Basic swipe gesture support on the board area
  let touchStartX = null;
  document.getElementById("board").addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });
  document.getElementById("board").addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const order = ["TODO", "DOING", "DONE"];
    const idx = order.indexOf(activeMobileStatus);
    if (dx < -60 && idx < order.length - 1) {
      document.querySelector(`.mobile-col-tab[data-status="${order[idx + 1]}"]`).click();
    } else if (dx > 60 && idx > 0) {
      document.querySelector(`.mobile-col-tab[data-status="${order[idx - 1]}"]`).click();
    }
    touchStartX = null;
  });

  // --- Inline task creation (5.9) ---
  document.querySelectorAll(".add-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => startInlineCreate(btn.dataset.status));
  });

  function startInlineCreate(status) {
    if (status !== "TODO") {
      // Cards are always created as TODO per spec; redirect focus there.
      document.querySelector('.mobile-col-tab[data-status="TODO"]')?.click();
      status = "TODO";
    }
    const body = document.querySelector('.col-body[data-status="TODO"]');
    if (body.querySelector(".inline-create-form")) return;

    const form = document.createElement("div");
    form.className = "inline-create-form border-2 border-teal-600 rounded p-2 bg-teal-50";
    form.innerHTML = `
      <input class="inline-title w-full border rounded px-2 py-1 text-sm mb-1" placeholder="태스크 제목" autofocus />
      <select class="inline-assignee w-full border rounded px-2 py-1 text-xs mb-1"></select>
      <p class="text-xs text-gray-400">Enter: 저장 · Esc: 취소</p>
    `;
    body.prepend(form);

    const assigneeSel = form.querySelector(".inline-assignee");
    assigneeSel.innerHTML = `<option value="">미할당</option>`;
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.id === user.id ? "@me" : m.email;
      if (m.id === user.id) opt.selected = true;
      assigneeSel.appendChild(opt);
    });

    const titleInput = form.querySelector(".inline-title");
    titleInput.focus();

    titleInput.addEventListener("keydown", async (e) => {
      if (e.key === "Escape") {
        form.remove();
      } else if (e.key === "Enter" && titleInput.value.trim()) {
        const assigneeVal = assigneeSel.value ? Number(assigneeSel.value) : null;
        try {
          await api.createTask(teamId, titleInput.value.trim(), assigneeVal);
          form.remove();
          await loadTasks();
        } catch (err) {
          alert(err.message || "생성에 실패했습니다");
        }
      }
    });
  }

  // --- Drag & drop (desktop, 5.10) ---
  let draggedTaskId = null;

  function onDragStart(e) {
    draggedTaskId = Number(e.currentTarget.dataset.id);
    e.currentTarget.classList.add("opacity-40");
  }

  document.querySelectorAll(".col-body").forEach((body) => {
    body.addEventListener("dragover", (e) => {
      e.preventDefault();
      body.classList.add("ring-2", "ring-teal-400");
    });
    body.addEventListener("dragleave", () => body.classList.remove("ring-2", "ring-teal-400"));
    body.addEventListener("drop", async (e) => {
      e.preventDefault();
      body.classList.remove("ring-2", "ring-teal-400");
      if (draggedTaskId === null) return;
      const newStatus = body.dataset.status;
      try {
        await api.updateTaskStatus(draggedTaskId, newStatus);
        await loadTasks();
      } catch (err) {
        alert(err.message || "상태 변경에 실패했습니다");
      }
      draggedTaskId = null;
    });
  });

  // --- Mobile long-press → status menu (7.2, replaces drag) ---
  function attachLongPress(cardEl) {
    let timer = null;
    cardEl.addEventListener("touchstart", () => {
      timer = setTimeout(() => showMobileStatusMenu(Number(cardEl.dataset.id)), 500);
    });
    ["touchend", "touchmove"].forEach((evt) =>
      cardEl.addEventListener(evt, () => clearTimeout(timer))
    );
  }

  function showMobileStatusMenu(taskId) {
    const choice = prompt("상태 변경: TODO / DOING / DONE", "");
    const normalized = (choice || "").trim().toUpperCase();
    if (["TODO", "DOING", "DONE"].includes(normalized)) {
      api.updateTaskStatus(taskId, normalized).then(loadTasks).catch((err) => alert(err.message));
    }
  }

  // --- Card detail modal (5.11, 5.12) ---
  async function openTaskModal(taskId) {
    const task = tasks.find((t) => t.id === taskId) || (await api.getTask(taskId));
    editingTaskId = taskId;

    document.getElementById("modal-task-id").textContent = `#${task.id}`;
    document.getElementById("modal-task-title-display").textContent = task.title;
    document.getElementById("modal-title-input").value = task.title;
    document.getElementById("modal-assignee-select").value = task.assignee_id ?? "";

    document.querySelectorAll(".modal-status-btn").forEach((btn) => {
      btn.classList.toggle("bg-teal-700", btn.dataset.status === task.status);
      btn.classList.toggle("text-white", btn.dataset.status === task.status);
    });

    const creator = members.find((m) => m.id === task.creator_id);
    document.getElementById("modal-meta").textContent = `생성자: ${creator ? creator.email : task.creator_id} · 생성 시각: ${new Date(task.created_at).toLocaleString("ko-KR")}`;

    const isOwner = team.owner_id === user.id;
    const isCreator = task.creator_id === user.id;
    document.getElementById("modal-delete-btn").classList.toggle("hidden", !(isOwner || isCreator));

    document.getElementById("task-modal").classList.remove("hidden");
  }

  document.getElementById("modal-close-btn").addEventListener("click", () => {
    document.getElementById("task-modal").classList.add("hidden");
  });

  document.querySelectorAll(".modal-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-status-btn").forEach((b) => {
        b.classList.remove("bg-teal-700", "text-white");
      });
      btn.classList.add("bg-teal-700", "text-white");
    });
  });

  document.getElementById("modal-save-btn").addEventListener("click", async () => {
    const title = document.getElementById("modal-title-input").value.trim();
    const assigneeVal = document.getElementById("modal-assignee-select").value;
    const status = document.querySelector(".modal-status-btn.bg-teal-700")?.dataset.status;
    try {
      await api.updateTask(editingTaskId, {
        title,
        assignee_id: assigneeVal ? Number(assigneeVal) : null,
      });
      const currentTask = tasks.find((t) => t.id === editingTaskId);
      if (currentTask && status && status !== currentTask.status) {
        await api.updateTaskStatus(editingTaskId, status);
      }
      document.getElementById("task-modal").classList.add("hidden");
      await loadTasks();
    } catch (err) {
      alert(err.message || "저장에 실패했습니다");
    }
  });

  document.getElementById("modal-delete-btn").addEventListener("click", () => {
    const task = tasks.find((t) => t.id === editingTaskId);
    pendingDeleteTaskId = editingTaskId;
    document.getElementById("delete-confirm-detail").textContent = task
      ? `'#${task.id} ${task.title}' — 되돌릴 수 없습니다`
      : "되돌릴 수 없습니다";
    document.getElementById("task-modal").classList.add("hidden");
    document.getElementById("delete-confirm-modal").classList.remove("hidden");
  });

  document.getElementById("delete-cancel-btn").addEventListener("click", () => {
    document.getElementById("delete-confirm-modal").classList.add("hidden");
  });

  document.getElementById("delete-confirm-btn").addEventListener("click", async () => {
    try {
      await api.deleteTask(pendingDeleteTaskId);
      document.getElementById("delete-confirm-modal").classList.add("hidden");
      await loadTasks();
    } catch (err) {
      alert(err.message || "삭제에 실패했습니다");
    }
  });

  // --- Mobile FAB quick-add ---
  document.getElementById("mobile-fab").addEventListener("click", () => {
    document.querySelector('.mobile-col-tab[data-status="TODO"]').click();
    startInlineCreate("TODO");
  });

  // --- Hamburger / members panel / logout ---
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  hamburgerBtn.addEventListener("click", () => mobileMenu.classList.remove("hidden"));
  document.getElementById("mobile-menu-backdrop").addEventListener("click", () => mobileMenu.classList.add("hidden"));

  const membersPanel = document.getElementById("members-panel");
  function openMembersPanel() {
    mobileMenu.classList.add("hidden");
    membersPanel.classList.remove("hidden");
  }
  document.getElementById("members-btn").addEventListener("click", openMembersPanel);
  document.getElementById("mobile-members-btn").addEventListener("click", openMembersPanel);
  document.getElementById("close-members-btn").addEventListener("click", () => membersPanel.classList.add("hidden"));
  document.getElementById("members-backdrop").addEventListener("click", () => membersPanel.classList.add("hidden"));

  document.getElementById("logout-btn").addEventListener("click", doLogout);
  document.getElementById("mobile-logout-btn").addEventListener("click", doLogout);

  // --- Leave team (owner cascade warning, 4.9) ---
  document.getElementById("leave-team-btn").addEventListener("click", () => {
    const isOwner = team.owner_id === user.id;
    document.getElementById("leave-warning-detail").textContent = isOwner
      ? "당신은 이 팀의 owner입니다. 나가면 팀이 삭제되고 모든 태스크와 채팅 이력이 사라집니다."
      : "팀에서 나가면 다시 초대코드로 합류해야 합니다.";
    membersPanel.classList.add("hidden");
    document.getElementById("leave-warning-modal").classList.remove("hidden");
  });
  document.getElementById("leave-cancel-btn").addEventListener("click", () => {
    document.getElementById("leave-warning-modal").classList.add("hidden");
  });
  document.getElementById("leave-confirm-btn").addEventListener("click", async () => {
    try {
      await api.leaveTeam(teamId);
      location.href = "team-select.html";
    } catch (err) {
      alert(err.message || "팀 나가기에 실패했습니다");
    }
  });

  window.addEventListener("resize", renderBoard);

  await loadTeamAndMembers();
  await loadTasks();
})();
