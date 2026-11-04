(() => {
  const WIDGET_SCRIPT_SRC =
    document.currentScript?.src ||
    document.querySelector('script[src*="/widget.js"]')?.src;
  const STORAGE_KEY = 'shiplog:anonymous-id';
  const ROOT_ID = 'shiplog-widget-root';
  const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  const boundTriggers = new WeakSet();
  let activeControls = null;
  let pendingOpen = false;
  let cleanupListeners = null;

  const generateAnonymousId = () => 'anon_' + Math.random().toString(36).slice(2, 12);

  const ensureAnonymousId = () => {
    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      const generated = generateAnonymousId();
      window.localStorage.setItem(STORAGE_KEY, generated);
      return generated;
    } catch {
      return generateAnonymousId();
    }
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const createStyles = () => {
    if (document.getElementById('shiplog-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'shiplog-widget-styles';
    style.textContent =
      '#shiplog-widget-root{--sl-accent:#111827;position:fixed;bottom:24px;right:24px;z-index:9999;font-family:Inter,ui-sans-serif,system-ui,sans-serif}' +
      '#shiplog-widget-root.shiplog-left{right:auto;left:24px}' +
      '.shiplog-button{display:flex;align-items:center;gap:8px;border:none;border-radius:999px;background:var(--sl-accent);color:#fff;padding:14px 18px;box-shadow:0 16px 40px rgba(0,0,0,.18);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}' +
      '.shiplog-button:hover{transform:translateY(-2px);box-shadow:0 20px 48px rgba(0,0,0,.22)}' +
      '.shiplog-button:active{transform:translateY(0)}' +
      '.shiplog-badge{min-width:20px;height:20px;border-radius:999px;background:#ef4444;color:#fff;font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}' +
      '.shiplog-panel{position:absolute;bottom:64px;right:0;width:360px;max-width:calc(100vw - 32px);max-height:70vh;overflow:auto;overscroll-behavior:contain;background:#fff;color:#111827;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.18);border:1px solid rgba(17,24,39,.08);opacity:0;transform:translateY(8px) scale(.98);transform-origin:100% 100%;transition:opacity .18s ease-out,transform .18s cubic-bezier(.16,1,.3,1);scrollbar-width:thin;scrollbar-color:rgba(17,24,39,.28) transparent}' +
      '.shiplog-left .shiplog-panel{right:auto;left:0;transform-origin:0% 100%}' +
      '.shiplog-panel.shiplog-open{opacity:1;transform:none}' +
      '.shiplog-panel::-webkit-scrollbar{width:6px}' +
      '.shiplog-panel::-webkit-scrollbar-track{background:transparent}' +
      '.shiplog-panel::-webkit-scrollbar-thumb{background:rgba(17,24,39,.18);border-radius:99px}' +
      '.shiplog-panel::-webkit-scrollbar-thumb:hover{background:rgba(17,24,39,.3)}' +
      '.shiplog-hidden{display:none}' +
      '.shiplog-header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(17,24,39,.08);background:rgba(255,255,255,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}' +
      '.shiplog-brand{display:flex;align-items:center;gap:10px;min-width:0}' +
      '.shiplog-powered{font-size:12px;color:#6b7280;text-align:center}' +
      '.shiplog-powered a{color:inherit;text-decoration:none}' +
      '.shiplog-powered a:hover{color:var(--sl-accent);text-decoration:underline}' +
      '.shiplog-app-logo{width:28px;height:28px;border-radius:8px;object-fit:contain;background:#fff}' +
      '.shiplog-list{display:flex;flex-direction:column;gap:12px;padding:12px}' +
      '.shiplog-item{position:relative;display:block;padding:16px;border-radius:12px;border:1px solid rgba(17,24,39,.08);color:inherit;text-decoration:none;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}' +
      '.shiplog-item::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:99px;background:transparent}' +
      '.shiplog-item:not(.shiplog-read)::before{background:var(--sl-accent)}' +
      '.shiplog-item:hover{background:#f8fafc;border-color:rgba(17,24,39,.16)}' +
      '.shiplog-item.shiplog-read{opacity:.66}' +
      '.shiplog-title{font-size:15px;font-weight:700;line-height:1.35;letter-spacing:-0.01em;margin-bottom:6px}' +
      '.shiplog-summary{font-size:14px;color:#4b5563;line-height:1.5}' +
      '.shiplog-meta{display:flex;gap:8px;align-items:center;font-size:12px;color:#9ca3af;margin-bottom:8px}' +
      '.shiplog-chip{display:inline-flex;align-items:center;border-radius:999px;background:#f3f4f6;color:#4b5563;font-weight:500;padding:2px 8px;font-size:12px}' +
      '.shiplog-actions{position:sticky;bottom:0;z-index:2;display:flex;flex-direction:column;gap:8px;padding:12px 16px;border-top:1px solid rgba(17,24,39,.08);background:rgba(255,255,255,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}' +
      '.shiplog-actions button{width:100%;border:none;border-radius:10px;padding:10px 12px;cursor:pointer;background:var(--sl-accent);color:#fff;transition:background .15s ease}' +
      '.shiplog-actions button:hover{background:var(--sl-accent);background:color-mix(in srgb,var(--sl-accent) 88%,#000)}' +
      '.shiplog-actions button:disabled{opacity:.55;cursor:default}' +
      '.shiplog-item:focus-visible,.shiplog-button:focus-visible,.shiplog-header button:focus-visible,.shiplog-actions button:focus-visible{outline:2px solid var(--sl-accent);outline-offset:2px}' +
      '.shiplog-empty{padding:32px 24px;text-align:center;color:#6b7280}' +
      '.shiplog-spinner{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;margin-right:7px;vertical-align:-1px;animation:shiplog-spin .7s linear infinite}' +
      '@keyframes shiplog-spin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){.shiplog-panel,.shiplog-button,.shiplog-item{transition:none}}';
    document.head.appendChild(style);
  };

  const buildUrl = (origin, path, params) => {
    const url = new URL(path, origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.toString();
  };

  const createWidget = (options) => {
    const origin = new URL(WIDGET_SCRIPT_SRC || window.location.href).origin;
    const readerId = options.userId || ensureAnonymousId();
    const isExternal = Boolean(options.userId);

    createStyles();

    const existingRoot = document.getElementById(ROOT_ID);
    if (existingRoot) existingRoot.remove();
    if (cleanupListeners) {
      cleanupListeners();
      cleanupListeners = null;
    }

    const triggerElements = [];

    const root = document.createElement('div');
    root.id = ROOT_ID;
    if (options.position === 'bottom-left') root.classList.add('shiplog-left');
    if (HEX_COLOR.test(options.accentColor || '')) {
      root.style.setProperty('--sl-accent', options.accentColor);
    }
    root.innerHTML = [
      '<button class="shiplog-button' + (options.hideLauncher ? ' shiplog-hidden' : '') + '" type="button" aria-haspopup="dialog" aria-expanded="false">',
      '<span>🔔</span>',
      '<span>What\'s new</span>',
      '<span class="shiplog-badge shiplog-hidden">0</span>',
      '</button>',
      '<div class="shiplog-panel shiplog-hidden" role="dialog" aria-label="Latest updates">',
      '  <div class="shiplog-header">',
      '    <div class="shiplog-brand"><span class="shiplog-logo-slot"></span><div><strong class="shiplog-app-name">Latest updates</strong></div></div>',
      '    <button type="button" aria-label="Close" style="border:none;background:transparent;font-size:20px;cursor:pointer">×</button>',
      '  </div>',
      '  <div class="shiplog-list"><div class="shiplog-empty">Loading updates…</div></div>',
      '  <div class="shiplog-actions"><button type="button">Mark all as read</button><div class="shiplog-powered shiplog-hidden">Powered by <a href="' + origin + '/?ref=widget" target="_blank" rel="noopener noreferrer">Shiplog</a></div></div>',
      '</div>'
    ].join('');

    document.body.appendChild(root);

    const button = root.querySelector('.shiplog-button');
    const badge = root.querySelector('.shiplog-badge');
    const panel = root.querySelector('.shiplog-panel');
    const closeButton = root.querySelector('.shiplog-header button');
    const list = root.querySelector('.shiplog-list');
    const markAllButton = root.querySelector('.shiplog-actions button');

    const showEmpty = (message) => {
      list.replaceChildren(el('div', 'shiplog-empty', message));
    };

    const fetchFeed = async () => {
      const response = await fetch(buildUrl(origin, '/api/widget/feed', {
        appKey: options.appKey,
        anonymousId: isExternal ? undefined : readerId,
        userId: isExternal ? readerId : undefined
      }));
      if (!response.ok) {
        showEmpty('Unable to load updates.');
        return null;
      }
      return response.json();
    };

    const applyBranding = (feed) => {
      if (root.dataset.branded || !feed || !feed.app) return;
      root.dataset.branded = '1';
      const poweredBy = root.querySelector('.shiplog-powered');
      if (poweredBy && feed.app.showBranding !== false) {
        poweredBy.classList.remove('shiplog-hidden');
      }
      const poweredLink = poweredBy ? poweredBy.querySelector('a') : null;
      if (poweredLink && feed.app.slug) {
        poweredLink.href = origin + '/?ref=' + feed.app.slug + '-widget';
      }
      if (feed.app.name) {
        root.querySelector('.shiplog-app-name').textContent = feed.app.name;
      }
      if (feed.app.logoUrl) {
        const img = document.createElement('img');
        img.className = 'shiplog-app-logo';
        img.alt = '';
        img.onerror = () => img.remove();
        img.src = feed.app.logoUrl;
        root.querySelector('.shiplog-logo-slot').appendChild(img);
      }
    };

    const openPanel = () => {
      panel.classList.remove('shiplog-hidden');
      button.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => panel.classList.add('shiplog-open'));
      renderFeed();
    };

    const closePanel = () => {
      panel.classList.remove('shiplog-open');
      button.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        if (!panel.classList.contains('shiplog-open')) panel.classList.add('shiplog-hidden');
      }, 180);
    };

    const togglePanel = () => {
      if (panel.classList.contains('shiplog-hidden')) {
        openPanel();
      } else {
        closePanel();
      }
    };

    const renderFeed = async () => {
      const feed = await fetchFeed();
      if (!feed) return;
      applyBranding(feed);
      badge.textContent = feed.unreadCount > 9 ? '9+' : String(feed.unreadCount || 0);
      badge.classList.toggle('shiplog-hidden', !feed.unreadCount);

      markAllButton.disabled = !feed.unreadCount;
      markAllButton.textContent = feed.unreadCount
        ? 'Mark all as read'
        : "You're up to date";

      if (!feed.updates.length) {
        showEmpty('No published updates yet.');
        return;
      }

      const changelogBase = origin + '/changelog/' + feed.app.slug;
      const items = feed.updates.map((update) => {
        const publishedAt = update.publishedAt
          ? new Date(update.publishedAt).toLocaleDateString()
          : 'Draft';
        const item = el('a', 'shiplog-item' + (update.read ? ' shiplog-read' : ''));
        item.setAttribute('data-update-id', update._id);
        item.href = changelogBase + '#update-' + update._id;
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        const meta = el('div', 'shiplog-meta');
        meta.appendChild(el('span', 'shiplog-chip', update.category));
        meta.appendChild(el('span', '', publishedAt));
        item.appendChild(meta);
        item.appendChild(el('div', 'shiplog-title', update.title));
        item.appendChild(el('div', 'shiplog-summary', update.summary));
        return item;
      });
      list.replaceChildren(...items);

      const markItemRead = (item) => {
        const updateId = item.getAttribute('data-update-id');
        if (!updateId) return;
        fetch(buildUrl(origin, '/api/widget/read', {}), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appKey: options.appKey,
            updateId,
            anonymousId: isExternal ? undefined : readerId,
            userId: isExternal ? readerId : undefined
          }),
          keepalive: true
        })
          .then(() => renderFeed())
          .catch(() => {});
      };

      items.forEach((item) => {
        item.addEventListener('click', () => markItemRead(item));
      });
    };

    if (typeof options.trigger === 'string' && options.trigger) {
      document.querySelectorAll(options.trigger).forEach((trigger) => {
        triggerElements.push(trigger);
        if (boundTriggers.has(trigger)) return;
        boundTriggers.add(trigger);
        trigger.addEventListener('click', () => {
          if (activeControls) activeControls.toggle();
        });
      });
    }

    button.addEventListener('click', togglePanel);
    closeButton.addEventListener('click', closePanel);

    const onOutsidePointerdown = (event) => {
      if (panel.classList.contains('shiplog-hidden')) return;
      if (root.contains(event.target)) return;
      if (triggerElements.some((trigger) => trigger.contains(event.target))) return;
      closePanel();
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape' && !panel.classList.contains('shiplog-hidden')) {
        closePanel();
      }
    };
    document.addEventListener('pointerdown', onOutsidePointerdown);
    document.addEventListener('keydown', onKeydown);
    cleanupListeners = () => {
      document.removeEventListener('pointerdown', onOutsidePointerdown);
      document.removeEventListener('keydown', onKeydown);
    };

    markAllButton.addEventListener('click', async () => {
      if (markAllButton.disabled) return;
      markAllButton.disabled = true;
      markAllButton.setAttribute('aria-busy', 'true');
      markAllButton.innerHTML =
        '<span class="shiplog-spinner" aria-hidden="true"></span>Marking…';
      try {
        await fetch(buildUrl(origin, '/api/widget/read-all', {}), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appKey: options.appKey,
            anonymousId: isExternal ? undefined : readerId,
            userId: isExternal ? readerId : undefined
          })
        });
      } catch {}
      markAllButton.textContent = 'Mark all as read';
      markAllButton.removeAttribute('aria-busy');
      markAllButton.disabled = false;
      renderFeed();
    });

    activeControls = { open: openPanel, close: closePanel, toggle: togglePanel };
    if (pendingOpen) {
      pendingOpen = false;
      openPanel();
    } else {
      renderFeed();
    }
  };

  window.Shiplog = {
    init(options) {
      if (!options || !options.appKey) {
        throw new Error('Shiplog.init requires an appKey');
      }
      createWidget(options);
    },
    open() {
      if (activeControls) activeControls.open();
      else pendingOpen = true;
    },
    close() {
      pendingOpen = false;
      if (activeControls) activeControls.close();
    },
    toggle() {
      if (activeControls) activeControls.toggle();
      else pendingOpen = !pendingOpen;
    }
  };
})();
