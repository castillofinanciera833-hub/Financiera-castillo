(() => {
  const localSave = window.save;
  let cloudTimer = null;
  let cloudBusy = false;

  function setCloudStatus(message, good = true) {
    const el = document.getElementById('storageStatus');
    if (!el) return;
    el.className = 'statusbox ' + (good ? 'green' : 'red');
    el.innerHTML = message;
  }

  async function pushCloud() {
    if (cloudBusy) return;
    cloudBusy = true;
    try {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(window.state)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo guardar en la nube');
      localStorage.setItem('fc_cloud_connected', '1');
      setCloudStatus('<b>☁️ Guardado en la nube</b><br><small>Base de datos Neon conectada. Último guardado: ' + new Date().toLocaleTimeString('es-MX') + '</small>', true);
    } catch (error) {
      setCloudStatus('<b>⚠️ Sin conexión con la nube</b><br><small>La app continúa guardando en este dispositivo. Se reintentará automáticamente.</small>', false);
    } finally {
      cloudBusy = false;
    }
  }

  function queueCloudSave() {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(pushCloud, 500);
  }

  window.save = function() {
    localSave();
    queueCloudSave();
  };

  async function bootCloud() {
    try {
      setCloudStatus('<b>☁️ Conectando…</b><br><small>Comprobando la base de datos en la nube.</small>', true);
      const response = await fetch('/api/state', {cache: 'no-store'});
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo conectar');

      if (result.exists && result.state) {
        window.state = result.state;
        localSave();
        window.renderHome();
        if (typeof window.renderClients === 'function') window.renderClients();
        setCloudStatus('<b>☁️ Datos cargados desde la nube</b><br><small>La información de Financiera Castillo ya está disponible en este dispositivo.</small>', true);
      } else {
        await pushCloud();
      }
    } catch (error) {
      setCloudStatus('<b>⚠️ Modo local</b><br><small>No se pudo conectar con la nube. Tus datos locales siguen intactos.</small>', false);
    }
  }

  const originalRenderData = window.renderData;
  if (typeof originalRenderData === 'function') {
    window.renderData = function() {
      originalRenderData();
      if (localStorage.getItem('fc_cloud_connected') === '1') {
        setCloudStatus('<b>☁️ Guardado en la nube</b><br><small>Base de datos Neon conectada.</small>', true);
      }
    };
  }

  bootCloud();
})();