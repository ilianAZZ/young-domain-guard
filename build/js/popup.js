"use strict";
const msg = chrome.i18n.getMessage;
const dateLocale = chrome.i18n.getUILanguage();
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
            showUnknown(msg("noActiveTab"));
            return;
        }
        let url;
        try {
            url = new URL(tab.url);
        }
        catch {
            showUnknown(msg("invalidUrl"));
            return;
        }
        if (!["http:", "https:"].includes(url.protocol)) {
            showUnknown(msg("browserInternalPage"));
            domainEl.textContent = url.protocol.replace(":", "");
            return;
        }
        const hostname = url.hostname.replace(/^www\./, "");
        const parts = hostname.split(".");
        const domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
        domainEl.textContent = domain;
        chrome.runtime.sendMessage({ type: "GET_DOMAIN_INFO", domain }, (result) => {
            if (!result) {
                showUnknown(msg("verificationError"));
                return;
            }
            renderResult(result);
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showUnknown(msg("errorPrefix", [message]));
    }
    function renderResult(result) {
        statusCard.className = "status-card " + result.status;
        if (result.status === "danger") {
            const created = new Date(result.creationDate).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" });
            statusCard.innerHTML = `
        <div class="status-label">${msg("recentDomainDetected")}</div>
        <div class="status-domain">${result.domain}</div>
        <div class="status-details">
          <div class="detail-row">
            <span class="label">${msg("age")}</span>
            <span class="age-badge">🔴 ${formatAge(result.ageDays)}</span>
          </div>
          <div class="detail-row">
            <span class="label">${msg("registeredOn")}</span>
            <span class="value">${created}</span>
          </div>
        </div>
      `;
        }
        else if (result.status === "safe") {
            const ageText = formatAge(result.ageDays);
            const created = result.creationDate
                ? new Date(result.creationDate).toLocaleDateString(dateLocale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })
                : "\u2014";
            statusCard.innerHTML = `
        <div class="status-label">${msg("domainVerified")}</div>
        <div class="status-domain">${result.domain}</div>
        <div class="status-details">
          <div class="detail-row">
            <span class="label">${msg("age")}</span>
            <span class="age-badge">🟢 ${ageText}</span>
          </div>
          <div class="detail-row">
            <span class="label">${msg("registeredOn")}</span>
            <span class="value">${created}</span>
          </div>
        </div>
      `;
        }
        else {
            showUnknown(msg("cannotVerify"));
        }
    }
    function showUnknown(message) {
        statusCard.className = "status-card unknown";
        statusCard.innerHTML = `
      <div class="status-label">${msg("unknownStatus")}</div>
      <div class="status-domain">${domainEl.textContent || "\u2014"}</div>
      <div class="status-details">
        <div class="detail-row">
          <span class="label">${message}</span>
        </div>
      </div>
    `;
    }
    function formatAge(days) {
        if (days == null)
            return msg("unknown");
        if (days < 1)
            return msg("today");
        if (days < 30)
            return days === 1 ? msg("dayCount", [String(days)]) : msg("dayCountPlural", [String(days)]);
        if (days < 365) {
            const months = Math.floor(days / 30);
            return months === 1 ? msg("monthCount", [String(months)]) : msg("monthCountPlural", [String(months)]);
        }
        const years = Math.floor(days / 365);
        return years === 1 ? msg("yearCount", [String(years)]) : msg("yearCountPlural", [String(years)]);
    }
});
