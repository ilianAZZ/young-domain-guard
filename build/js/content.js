"use strict";
(function () {
    "use strict";
    const i18n = chrome.i18n.getMessage;
    const dateLocale = chrome.i18n.getUILanguage();
    let bannerInjected = false;
    function injectBanner(data) {
        if (bannerInjected)
            return;
        bannerInjected = true;
        const host = document.createElement("div");
        host.id = "young-domain-guard-host";
        host.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
    `;
        const shadow = host.attachShadow({ mode: "closed" });
        const ageDays = data.ageDays;
        const daysText = ageDays === 1
            ? i18n("dayCount", [String(ageDays)])
            : i18n("dayCountPlural", [String(ageDays)]);
        const creationDate = new Date(data.creationDate).toLocaleDateString(dateLocale, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        shadow.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;900&display=swap');

        :host {
          all: initial;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .dg-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          animation: dg-fadeIn 0.3s ease;
        }

        @keyframes dg-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes dg-scaleIn {
          from {
            transform: scale(0.85);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .dg-popup {
          background: linear-gradient(160deg, #1a0005 0%, #450a0a 30%, #7f1d1d 70%, #991b1b 100%);
          border: 2px solid #ef4444;
          border-radius: 16px;
          padding: 40px 48px;
          max-width: 520px;
          width: 90vw;
          box-shadow:
            0 0 60px rgba(239, 68, 68, 0.3),
            0 0 120px rgba(239, 68, 68, 0.1),
            0 24px 48px rgba(0, 0, 0, 0.5);
          text-align: center;
          color: #fef2f2;
          animation: dg-scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .dg-warning-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 20px;
          background: rgba(239, 68, 68, 0.2);
          border: 2px solid rgba(239, 68, 68, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          animation: dg-pulse 2s ease-in-out infinite;
        }

        @keyframes dg-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0); }
        }

        .dg-title {
          font-size: 26px;
          font-weight: 900;
          color: #fca5a5;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }

        .dg-domain {
          font-size: 20px;
          font-weight: 700;
          color: #fbbf24;
          text-decoration: underline;
          text-decoration-style: wavy;
          text-underline-offset: 4px;
          word-break: break-all;
          margin: 12px 0;
        }

        .dg-details {
          font-size: 15px;
          line-height: 1.6;
          color: #fecaca;
          margin: 16px 0 24px;
        }

        .dg-details strong {
          color: #ffffff;
          font-weight: 700;
        }

        .dg-warning-text {
          font-size: 13px;
          color: rgba(254, 202, 202, 0.7);
          line-height: 1.5;
          margin: 0 0 28px;
        }

        .dg-close {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fef2f2;
          padding: 10px 32px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          transition: all 0.2s ease;
          letter-spacing: 0.3px;
        }

        .dg-close:hover {
          background: rgba(239, 68, 68, 0.4);
          border-color: rgba(239, 68, 68, 0.6);
          transform: translateY(-1px);
        }
      </style>

      <div class="dg-overlay">
        <div class="dg-popup">
          <div class="dg-warning-icon">⚠️</div>
          <div class="dg-title">${i18n("bannerTitle")}</div>
          <div class="dg-domain">${data.domain}</div>
          <div class="dg-details">
            ${i18n("bannerDetails", [`<strong>${daysText}</strong>`, creationDate])}
          </div>
          <div class="dg-warning-text">
            ${i18n("bannerWarning")}<br>
            ${i18n("bannerVerify")}
          </div>
          <button class="dg-close" title="${i18n("close")}">${i18n("bannerDismiss")}</button>
        </div>
      </div>
    `;
        shadow.querySelector(".dg-close").addEventListener("click", () => {
            const overlay = shadow.querySelector(".dg-overlay");
            overlay.style.transition = "opacity 0.3s ease";
            overlay.style.opacity = "0";
            setTimeout(() => host.remove(), 300);
        });
        function insert() {
            if (document.body) {
                document.body.prepend(host);
            }
            else {
                requestAnimationFrame(insert);
            }
        }
        insert();
    }
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "DOMAIN_GUARD_ALERT" && msg.data) {
            injectBanner(msg.data);
        }
    });
})();
