document.addEventListener("DOMContentLoaded", async () => {
  const statusCard = document.getElementById("status");
  const domainEl = document.getElementById("domain-name");
  const thresholdInput = document.getElementById("threshold");

  chrome.runtime.sendMessage({ type: "GET_THRESHOLD" }, (res) => {
    if (res && res.thresholdDays) {
      thresholdInput.value = res.thresholdDays;
    }
  });

  let saveTimeout;
  thresholdInput.addEventListener("input", () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const val = parseInt(thresholdInput.value, 10);
      if (val >= 1 && val <= 365) {
        chrome.runtime.sendMessage({ type: "SET_THRESHOLD", value: val });
      }
    }, 500);
  });

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url) {
      showUnknown("Aucun onglet actif");
      return;
    }

    let url;
    try {
      url = new URL(tab.url);
    } catch {
      showUnknown("URL invalide");
      return;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      showUnknown("Page interne du navigateur");
      domainEl.textContent = url.protocol.replace(":", "");
      return;
    }

    const hostname = url.hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    const domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

    domainEl.textContent = domain;

    chrome.runtime.sendMessage(
      { type: "GET_DOMAIN_INFO", domain },
      (result) => {
        if (!result) {
          showUnknown("Erreur de vérification");
          return;
        }
        renderResult(result);
      }
    );
  } catch (err) {
    showUnknown("Erreur: " + err.message);
  }

  function renderResult(result) {
    statusCard.className = "status-card " + result.status;

    if (result.status === "danger") {
      const created = new Date(result.creationDate).toLocaleDateString(
        "fr-FR",
        { year: "numeric", month: "short", day: "numeric" }
      );

      statusCard.innerHTML = `
        <div class="status-label">⚠ Domaine récent détecté</div>
        <div class="status-domain">${result.domain}</div>
        <div class="status-details">
          <div class="detail-row">
            <span class="label">Âge</span>
            <span class="age-badge">🔴 ${result.ageDays} jour${result.ageDays > 1 ? "s" : ""}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enregistré le</span>
            <span class="value">${created}</span>
          </div>
        </div>
      `;
    } else if (result.status === "safe") {
      const ageText = formatAge(result.ageDays);
      const created = result.creationDate
        ? new Date(result.creationDate).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—";

      statusCard.innerHTML = `
        <div class="status-label">✓ Domaine vérifié</div>
        <div class="status-domain">${result.domain}</div>
        <div class="status-details">
          <div class="detail-row">
            <span class="label">Âge</span>
            <span class="age-badge">🟢 ${ageText}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enregistré le</span>
            <span class="value">${created}</span>
          </div>
        </div>
      `;
    } else {
      showUnknown("Impossible de vérifier ce domaine");
    }
  }

  function showUnknown(message) {
    statusCard.className = "status-card unknown";
    statusCard.innerHTML = `
      <div class="status-label">— Inconnu</div>
      <div class="status-domain">${domainEl.textContent || "—"}</div>
      <div class="status-details">
        <div class="detail-row">
          <span class="label">${message}</span>
        </div>
      </div>
    `;
  }

  function formatAge(days) {
    if (days == null) return "Inconnu";
    if (days < 1) return "Aujourd'hui";
    if (days < 30) return `${days} jour${days > 1 ? "s" : ""}`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} mois`;
    }
    const years = Math.floor(days / 365);
    return `${years} an${years > 1 ? "s" : ""}`;
  }
});
