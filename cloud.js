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
    if (cloudBusy || !window.state) return false;
    cloudBusy = true;
    try {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(window.state)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || ('HTTP ' + response.status));
      }
      localStorage.setItem('fc_cloud_connected', '1');
      setCloudStatus('<b>☁️ Guardado en la nube</b><br><small>Base de datos Neon conectada. Último guardado: ' + new Date().toLocaleTimeString('es-MX') + '</small>', true);
      return true;
    } catch (error) {
      setCloudStatus('<b>⚠️ No se pudo guardar en la nube</b><br><small>Se conservaron tus datos en este dispositivo. Reintentaremos automáticamente.</small>', false);
      return false;
    } finally {
      cloudBusy = false;
    }
  }

  function queueCloudSave() {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(pushCloud, 500);
  }

  if (typeof localSave === 'function') {
    window.save = function() {
      localSave();
      queueCloudSave();
    };
  }

  async function bootCloud() {
    try {
      setCloudStatus('<b>☁️ Conectando…</b><br><small>Comprobando la base de datos en la nube.</small>', true);
      const response = await fetch('/api/state', {cache: 'no-store'});
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo conectar');

      if (result.exists && result.state) {
        window.state = result.state;
        if (typeof localSave === 'function') localSave();
        if (typeof window.renderHome === 'function') window.renderHome();
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
        setCloudStatus('<b>☁️ Conectado a la nube</b><br><small>Se verificará el guardado automáticamente.</small>', true);
      }
    };
  }

  function startWhenReady(attempt = 0) {
    if (window.state && document.getElementById('storageStatus')) {
      bootCloud();
      return;
    }
    if (attempt < 30) setTimeout(() => startWhenReady(attempt + 1), 250);
    else bootCloud();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startWhenReady());
  } else {
    startWhenReady();
  }

  // Tema visual inspirado en el diseño aprobado: azul marino, azul eléctrico, blanco y acentos dorados.
  const style = document.createElement('style');
  style.textContent = `
    :root{
      --blue:#0878ff!important;--blue2:#0754c9!important;--bg:#03112f!important;
      --text:#f7fbff!important;--muted:#9db3d6!important;--card:#071d48!important;
      --green:#59c7ff!important;--red:#ff6b7a!important;--line:#17427f!important;
    }
    html{background:#020b20!important}
    body{
      background:
        radial-gradient(circle at 75% 0%,rgba(0,119,255,.22),transparent 30%),
        linear-gradient(145deg,#020b20 0%,#03163b 55%,#020b20 100%)!important;
      color:var(--text)!important;
    }
    header{
      background:linear-gradient(135deg,#031b55,#086cff 65%,#09a5ff)!important;
      border-bottom:1px solid rgba(93,183,255,.45)!important;
      border-radius:0 0 26px 26px!important;
      box-shadow:0 12px 40px rgba(0,86,255,.24)!important;
    }
    .logo{
      background:linear-gradient(145deg,#fff,#b9e4ff)!important;
      color:#075bd8!important;
      box-shadow:0 0 24px rgba(102,196,255,.55)!important;
    }
    main{max-width:1100px!important}
    h2{color:#fff!important}
    .card{
      background:linear-gradient(145deg,rgba(8,36,85,.96),rgba(3,21,55,.96))!important;
      border:1px solid #1553a0!important;
      box-shadow:0 8px 28px rgba(0,0,0,.24),inset 0 1px rgba(116,195,255,.08)!important;
    }
    .stat b,.total{color:#fff!important}
    .stat span,.muted,.client small{color:#9db3d6!important}
    button.primary{
      background:linear-gradient(135deg,#0878ff,#09b4ff)!important;
      box-shadow:0 7px 20px rgba(0,118,255,.28)!important;
    }
    button.secondary,.filter{
      background:#09285a!important;color:#7ed0ff!important;border:1px solid #1a5baa!important;
    }
    .filter.active{
      background:linear-gradient(135deg,#086fff,#0aa9ff)!important;color:#fff!important;border-color:#4fc8ff!important;
    }
    .search,.field input,.field select,.field textarea{
      background:#041633!important;color:#fff!important;border-color:#1a4d8f!important;
    }
    .search::placeholder,.field input::placeholder,.field textarea::placeholder{color:#7895bd!important}
    .pill{background:#083c69!important;color:#73d5ff!important}
    .pill.red{background:#4b1730!important;color:#ff8b9a!important}
    .notice{background:#2c270b!important;border-color:#76600d!important;color:#fff3a6!important}
    .statusbox{background:#061d43!important;border-color:#1a4d8f!important;color:#fff!important}
    .statusbox.green{background:#062b4a!important;border-color:#1684bd!important}
    .statusbox.red{background:#40182c!important;border-color:#7c3150!important}
    table th,table td{border-color:#17427f!important}
    nav{
      background:rgba(2,15,43,.96)!important;
      border-top:1px solid #18519b!important;
      box-shadow:0 -12px 35px rgba(0,0,0,.28)!important;
      backdrop-filter:blur(14px)!important;
    }
    nav button{color:#819ac0!important}
    nav button.active{color:#48c5ff!important}
    nav span{filter:drop-shadow(0 0 7px rgba(57,184,255,.28))}
    .back{color:#52c8ff!important}
    @media (min-width:900px){
      body{min-height:100vh}
      header{position:sticky;top:0;z-index:20;padding:20px 34px!important}
      main{padding:28px 34px 120px!important}
      .grid{grid-template-columns:repeat(4,1fr)!important}
      nav{
        top:92px;bottom:0;left:0;right:auto;width:225px;
        display:flex;flex-direction:column;justify-content:flex-start;gap:8px;
        padding:28px 14px!important;border-top:0;border-right:1px solid #1553a0;
      }
      nav button{text-align:left;font-size:14px;padding:13px 16px!important;border-radius:14px}
      nav button.active{background:linear-gradient(90deg,#0878ff,#0865df)!important;color:#fff!important}
      nav span{display:inline-block;margin-right:9px}
      main{margin-left:225px;max-width:none!important}
    }
  `;
  document.head.appendChild(style);
})();