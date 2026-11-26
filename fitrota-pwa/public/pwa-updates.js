export async function watchForUpdates({isSafeToReload,notify}) {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const workers = navigator.serviceWorker;
  const notice = document.getElementById('pwa-update');
  const apply = document.getElementById('pwa-update-apply');
  let controller = workers.controller;
  let registration;
  let activeChanged = false;
  let dismissed = null;
  let applying = false;
  let applyTimeout;
  let lastCheck = 0;
  const watched = new WeakSet();

  const candidate = () => controller && (registration?.waiting ?? (activeChanged ? controller : null));
  function updateNotice() {
    const available = candidate();
    notice.hidden = !available || available === dismissed;
    apply.disabled = applying;
    apply.textContent = applying ? 'Güncelleniyor…' : 'Güncelle';
  }

  function stopApplying() {
    clearTimeout(applyTimeout);
    applying = false;
    updateNotice();
  }

  workers.addEventListener('controllerchange', () => {
    const previous = controller;
    controller = workers.controller;
    if (previous && controller && previous !== controller) activeChanged = true;
    if (activeChanged && applying && isSafeToReload()) {
      window.location.reload();
      return;
    }
    stopApplying();
  });

  try {
    registration = await workers.register('/sw.js',{updateViaCache:'none'});
  } catch (_) {
    return; // Önbellek olmadan çevrimiçi kullanım mümkündür.
  }

  function watchInstallation() {
    const installing = registration.installing;
    if (installing && !watched.has(installing)) {
      watched.add(installing);
      installing.addEventListener('statechange',updateNotice);
    }
    updateNotice();
  }
  registration.addEventListener('updatefound',watchInstallation);
  watchInstallation();

  async function check() {
    updateNotice();
    const now = Date.now();
    if (document.hidden || navigator.onLine === false || registration.installing || now-lastCheck < 60000) return;
    lastCheck = now;
    try { await registration.update(); } catch (_) { /* Bağlantı gelince yeniden denenecek. */ }
    watchInstallation();
  }

  apply.addEventListener('click', () => {
    if (!candidate() || applying) return;
    if (!isSafeToReload()) {
      notify('Güncellemeden önce açık antrenmanını veya formunu kaydet.');
      return;
    }
    const waiting = registration.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    applying = true;
    updateNotice();
    waiting.postMessage({type:'FITROTA_ACTIVATE_UPDATE'});
    applyTimeout = setTimeout(stopApplying,12000);
  });
  document.getElementById('pwa-update-later').addEventListener('click', () => {
    dismissed = candidate();
    updateNotice();
  });
  document.addEventListener('visibilitychange',check);
  window.addEventListener('online',() => { lastCheck = 0; check(); });
  setInterval(check,15*60*1000);
  check();
}
