(function () {
  "use strict";

  let bannerInjected = false;

  function injectBanner(data) {
    if (bannerInjected) return;
    bannerInjected = true;

    const host = document.createElement("div");
    host.id = "young-domain-guard-host";
    host.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 2147483647 !important;
      height: auto !important;
      pointer-events: auto !important;
    `;

    const shadow = host.attachShadow({ mode: "closed" });

    const ageDays = data.ageDays;
    const creationDate = new Date(data.creationDate).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    shadow.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700&display=swap');

        :host {
          all: initial;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .dg-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #1a0005 0%, #450a0a 30%, #7f1d1d 70%, #991b1b 100%);
          color: #fef2f2;
          font-size: 14px;
          line-height: 1.4;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.2);
          border-bottom: 2px solid #ef4444;
          animation: dg-slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes dg-slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .dg-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          background: rgba(239, 68, 68, 0.25);
          border: 1.5px solid rgba(239, 68, 68, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          animation: dg-pulse 2s ease-in-out infinite;
        }

        @keyframes dg-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }

        .dg-text strong {
          color: #fca5a5;
          font-weight: 700;
        }

        .dg-text .dg-domain {
          color: #fbbf24;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-style: wavy;
          text-underline-offset: 3px;
        }

        .dg-close {
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fef2f2;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .dg-close:hover {
          background: rgba(239, 68, 68, 0.4);
          border-color: rgba(239, 68, 68, 0.6);
        }
      </style>

      <div class="dg-banner">
        <div class="dg-icon">🛡️</div>
        <div class="dg-text">
          <strong>⚠ Domaine récent !</strong>
          <span class="dg-domain">${data.domain}</span>
          a été enregistré il y a <strong>${ageDays} jour${ageDays > 1 ? "s" : ""}</strong>
          (le ${creationDate}).
          Soyez vigilant — les sites très récents peuvent être frauduleux.
        </div>
        <button class="dg-close" title="Fermer">✕</button>
      </div>
    `;

    shadow.querySelector(".dg-close").addEventListener("click", () => {
      host.style.transition = "transform 0.3s ease, opacity 0.3s ease";
      host.style.transform = "translateY(-100%)";
      host.style.opacity = "0";
      setTimeout(() => host.remove(), 300);
      document.documentElement.style.marginTop = "";
    });

    function insert() {
      if (document.body) {
        document.body.prepend(host);
        const bannerEl = shadow.querySelector(".dg-banner");
        if (bannerEl) {
          const h = bannerEl.offsetHeight;
          document.documentElement.style.marginTop = h + "px";
        }
      } else {
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
