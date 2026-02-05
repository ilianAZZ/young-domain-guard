interface DomainResult {
  domain: string;
  creationDate: string | null;
  ageDays: number | null;
  isRecent: boolean;
  status: "danger" | "safe" | "unknown";
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusCard = document.getElementById("status")!;
  const domainEl = document.getElementById("domain-name")!;
  const thresholdInput = document.getElementById("threshold") as HTMLInputElement;

  chrome.runtime.sendMessage({ type: "GET_THRESHOLD" }, (res) => {
    if (res && res.thresholdDays) {
      thresholdInput.value = res.thresholdDays;
    }
  });

  let saveTimeout: ReturnType<typeof setTimeout>;
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

    let url: URL;
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
      (result: DomainResult | undefined) => {
        if (!result) {
          showUnknown("Erreur de v\u00e9rification");
          return;
        }
        renderResult(result);
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showUnknown("Erreur: " + message);
  }

  function renderResult(result: DomainResult): void {
    statusCard.className = "status-card " + result.status;

    if (result.status === "danger") {
      const created = new Date(result.creationDate!).toLocaleDateString(
        "fr-FR",
        { year: "numeric", month: "short", day: "numeric" }
      );

      statusCard.innerHTML = `
        <div class="status-label">\u26a0 Domaine r\u00e9cent d\u00e9tect\u00e9</div>
        <div class="status-domain">${result.domain}</div>
        <div class="status-details">
          <div class="detail-row">
            <span class="label">\u00c2ge</span>
            <span class="age-badge">\ud83d\udd34 ${result.ageDays} jour${result.ageDays! > 1 ? "s" : ""}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enregistr\u00e9 le</span>
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
        : "\u2014";

      statusCard.innerHTML = `
        <div class="status-label">\u2713 Domaine v\u00e9rifi\u00e9</div>
        <div class="status-domain">${result.domain}</div>
        <div class="status-details">
          <div class="detail-row">
            <span class="label">\u00c2ge</span>
            <span class="age-badge">\ud83d\udfe2 ${ageText}</span>
          </div>
          <div class="detail-row">
            <span class="label">Enregistr\u00e9 le</span>
            <span class="value">${created}</span>
          </div>
        </div>
      `;
    } else {
      showUnknown("Impossible de v\u00e9rifier ce domaine");
    }
  }

  function showUnknown(message: string): void {
    statusCard.className = "status-card unknown";
    statusCard.innerHTML = `
      <div class="status-label">\u2014 Inconnu</div>
      <div class="status-domain">${domainEl.textContent || "\u2014"}</div>
      <div class="status-details">
        <div class="detail-row">
          <span class="label">${message}</span>
        </div>
      </div>
    `;
  }

  function formatAge(days: number | null): string {
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
