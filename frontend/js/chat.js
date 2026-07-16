(async function () {
  const user = await requireTeam();
  if (!user) return;

  const teamId = new URLSearchParams(location.search).get("team") || user.team_id;
  document.getElementById("kanban-link").href = `kanban.html?team=${teamId}`;
  document.getElementById("kanban-link-desktop").href = `kanban.html?team=${teamId}`;

  const container = document.getElementById("messages-container");
  const emptyState = document.getElementById("empty-state");
  const input = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const charCounter = document.getElementById("char-counter");
  const connectionStatus = document.getElementById("connection-status");
  const mobileConnectionStatus = document.getElementById("mobile-connection-status");

  const MAX_LEN = 1000;
  const BACKOFF_STEPS = [5000, 10000, 20000, 40000, 60000];
  let lastMessageTime = null;
  let pollTimer = null;
  let backoffIndex = -1; // -1 = healthy, polling at base interval
  let pollIntervalMs = 5000;
  let members = [];
  let offlineQueue = [];
  let isFocused = false;

  async function loadTeamInfo() {
    const team = await api.getTeam(teamId);
    document.getElementById("team-name").textContent = `${team.name} 팀`;
    members = await api.getMembers(teamId);
    renderMembers();
  }

  function renderMembers() {
    const list = document.getElementById("members-list");
    list.innerHTML = members
      .map(
        (m) => `
      <li class="flex items-center gap-2 text-sm">
        <div class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">${m.email[0].toUpperCase()}</div>
        <div class="flex-1">${m.email}${m.id === user.id ? " (나)" : ""}</div>
        ${m.role === "owner" ? '<span class="text-xs text-amber-600 dark:text-amber-400 font-semibold">★</span>' : ""}
      </li>`
      )
      .join("");
  }

  function bubbleHtml(msg) {
    const isMine = msg.user_id === user.id;
    const time = new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="flex ${isMine ? "justify-end" : "justify-start"} group" data-msg-id="${msg.id}">
        <div class="max-w-[75%]">
          ${!isMine ? `<div class="text-xs text-gray-400 dark:text-gray-500 mb-1">${msg.user_email.split("@")[0]}</div>` : ""}
          <div class="flex items-center gap-1 ${isMine ? "flex-row-reverse" : ""}">
            <div class="${isMine ? "bg-teal-700 text-white" : "bg-white dark:bg-gray-800 border dark:border-gray-700"} rounded-lg px-3 py-2 text-sm break-words">
              ${escapeHtml(msg.content)}
            </div>
            ${
              isMine
                ? `<button class="delete-msg-btn opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 text-xs" data-msg-id="${msg.id}">🗑️</button>`
                : ""
            }
          </div>
          <div class="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 ${isMine ? "text-right" : ""}">${time}</div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function appendMessages(msgs) {
    if (msgs.length === 0) return;
    msgs.forEach((m) => {
      container.insertAdjacentHTML("beforeend", bubbleHtml(m));
      lastMessageTime = m.created_at;
    });
    container.querySelectorAll(".delete-msg-btn").forEach((btn) => {
      btn.onclick = () => deleteMessage(Number(btn.dataset.msgId));
    });
    container.scrollTop = container.scrollHeight;
    updateEmptyState();
  }

  function updateEmptyState() {
    const hasMessages = container.children.length > 0;
    emptyState.classList.toggle("hidden", hasMessages);
    container.classList.toggle("hidden", !hasMessages);
  }

  async function deleteMessage(id) {
    try {
      await api.deleteMessage(id);
      const el = container.querySelector(`[data-msg-id="${id}"]`);
      if (el) el.remove();
      updateEmptyState();
    } catch (err) {
      alert(err.message || "삭제에 실패했습니다");
    }
  }

  // --- Polling with since=, exponential backoff on failure (6.8, 6.9) ---
  async function pollOnce() {
    const wasDown = backoffIndex >= 0;
    try {
      const msgs = await api.listMessages(teamId, lastMessageTime || undefined);
      appendMessages(msgs);
      if (wasDown) {
        // Recovered: since= already caught up missed messages above.
        backoffIndex = -1;
        setConnectionStatus(true);
        await flushOfflineQueue();
      }
      pollIntervalMs = isFocused ? 2000 : 5000;
    } catch (err) {
      backoffIndex = Math.min(backoffIndex + 1, BACKOFF_STEPS.length - 1);
      pollIntervalMs = BACKOFF_STEPS[backoffIndex];
      setConnectionStatus(false);
    }
    pollTimer = setTimeout(pollOnce, pollIntervalMs);
  }

  function setConnectionStatus(ok) {
    if (ok) {
      connectionStatus.textContent = isFocused ? "● 2초마다 새로고침" : "● 5초마다 새로고침";
      connectionStatus.className = "text-emerald-600";
      mobileConnectionStatus.classList.add("hidden");
    } else {
      const seconds = BACKOFF_STEPS[backoffIndex] / 1000;
      connectionStatus.textContent = `⚠ 연결 끊김 · ${seconds}초 후 재시도`;
      connectionStatus.className = "text-red-600";
      mobileConnectionStatus.textContent = `⚠ 연결 끊김 · ${seconds}초 후 재시도`;
      mobileConnectionStatus.classList.remove("hidden");
    }
  }

  // --- Composer: char counter + validation (6.5) ---
  function updateComposerState() {
    const len = input.value.length;
    charCounter.textContent = `${len} / ${MAX_LEN}`;
    const overLimit = len > MAX_LEN;
    charCounter.classList.toggle("text-red-600", overLimit);
    charCounter.classList.toggle("text-gray-400", !overLimit);
    sendBtn.disabled = overLimit || len === 0;
  }
  input.addEventListener("input", updateComposerState);
  updateComposerState();

  async function sendMessage() {
    const content = input.value;
    if (!content || content.length > MAX_LEN) return;

    if (backoffIndex >= 0) {
      // Offline: queue and flush automatically once polling recovers.
      offlineQueue.push(content);
      input.value = "";
      updateComposerState();
      return;
    }

    input.value = "";
    updateComposerState();
    try {
      const msg = await api.sendMessage(teamId, content);
      appendMessages([msg]);
    } catch (err) {
      if (err.code === "TOO_LONG") {
        alert(err.message);
      } else {
        // Network-ish failure: requeue and let backoff/reconnect flush it.
        offlineQueue.push(content);
      }
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  async function flushOfflineQueue() {
    if (offlineQueue.length === 0) return;
    const queued = offlineQueue;
    offlineQueue = [];
    for (const content of queued) {
      try {
        const msg = await api.sendMessage(teamId, content);
        appendMessages([msg]);
      } catch {
        offlineQueue.push(content); // retry on next recovery
      }
    }
  }

  // --- Mobile: keyboard-aware composer + focus-driven poll speed (7.3, 7.4) ---
  input.addEventListener("focus", () => {
    isFocused = true;
  });
  input.addEventListener("blur", () => {
    isFocused = false;
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      const composer = document.getElementById("composer");
      const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
      composer.style.paddingBottom = keyboardOpen ? "4px" : "12px";
      container.style.maxHeight = keyboardOpen ? "40vh" : "";
      if (keyboardOpen) container.scrollTop = container.scrollHeight;
    });
  }

  // --- Pull-to-refresh (7.5) ---
  let touchStartY = null;
  container.addEventListener("touchstart", (e) => {
    if (container.scrollTop === 0) touchStartY = e.touches[0].clientY;
  });
  container.addEventListener("touchend", async (e) => {
    if (touchStartY === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy > 80) {
      clearTimeout(pollTimer);
      await pollOnce();
    }
    touchStartY = null;
  });

  // --- Hamburger / members / logout (shared) ---
  const hamburgerBtn = document.getElementById("hamburger-btn");
  hamburgerBtn?.addEventListener("click", () => {
    location.href = `kanban.html?team=${teamId}`;
  });
  const membersPanel = document.getElementById("members-panel");
  document.getElementById("members-btn").addEventListener("click", () => membersPanel.classList.remove("hidden"));
  document.getElementById("close-members-btn").addEventListener("click", () => membersPanel.classList.add("hidden"));
  document.getElementById("members-backdrop").addEventListener("click", () => membersPanel.classList.add("hidden"));
  document.getElementById("logout-btn").addEventListener("click", doLogout);

  await loadTeamInfo();
  updateEmptyState();
  await pollOnce();
})();
