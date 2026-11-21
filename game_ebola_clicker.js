/* ============================================================================
   SCHOOL-FUN : EBOLA CLICKER (MICROPHONE VOCAL MAC & ENOLA.PNG SPAMMER)
   Enregistrement micro vocal local + Spam barre espace + Popups Enola.png
   ============================================================================ */
'use strict';

const EbolaClickerGame = (() => {
  let active = false;
  let inited = false;

  // Stats & Clicker State
  let ebolas = 0;
  let totalClicks = 0;
  let ebolasPerClick = 1;
  let autoEps = 0;
  let autoInterval = null;
  let openTabsEnabled = (localStorage.getItem('ebola_open_tabs_enabled') === 'true'); // Par défaut false (Désactivé)
  let pitchMode = 'normal'; // 'normal', 'chipmunk', 'demon', 'fast'

  // Upgrades Configuration
  const UPGRADES = [
    { id: "megaphone", name: "📢 Mégaphone Mac", cost: 15, perClick: 1, eps: 0, count: 0, desc: "+1 Ebola par frappe d'espace" },
    { id: "clones", name: "👥 Clones d'Enola", cost: 50, perClick: 0, eps: 2, count: 0, desc: "+2 Ebolas automatiques par sec" },
    { id: "mutation", name: "🧬 Mutation Épidémique", cost: 200, perClick: 5, eps: 8, count: 0, desc: "+5/clic et +8/sec" },
    { id: "spammer", name: "⚡ Auto-Spammer M3", cost: 800, perClick: 15, eps: 35, count: 0, desc: "+15/clic et +35/sec" },
    { id: "pandemie", name: "🌍 Pandémie Mondiale", cost: 3000, perClick: 50, eps: 150, count: 0, desc: "+50/clic et +150/sec" }
  ];

  // Audio & Recording Engine
  const VoiceEngine = (() => {
    let audioCtx = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let customAudioBuffer = null;
    let customAudioBase64 = null;
    let recordTimer = null;

    function getAudioCtx() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    // Chargement de la voix sauvegardée en localStorage
    function loadSavedVoice() {
      try {
        const saved = localStorage.getItem('ebola_saved_voice_b64');
        if (saved) {
          customAudioBase64 = saved;
          decodeBase64Audio(saved);
        }
      } catch (e) {
        console.warn("[EbolaVoice] Erreur lecture voix sauvegardée :", e);
      }
    }

    function decodeBase64Audio(b64) {
      try {
        const c = getAudioCtx();
        const binary = atob(b64.split(',')[1] || b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        c.decodeAudioData(bytes.buffer, (buffer) => {
          customAudioBuffer = buffer;
          updateVoiceUI(true);
        }, (err) => {
          console.warn("[EbolaVoice] Échec décodage audio :", err);
        });
      } catch (e) {
        console.warn("[EbolaVoice] Erreur décompression base64 :", e);
      }
    }

    async function startRecording() {
      if (isRecording) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          isRecording = false;
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunks, { type: 'audio/webm' });

          // Convertir en ArrayBuffer pour Web Audio instantané
          const arrayBuf = await blob.arrayBuffer();
          const c = getAudioCtx();
          c.decodeAudioData(arrayBuf, (buffer) => {
            customAudioBuffer = buffer;
            updateVoiceUI(true);
            playVoice();
            if (typeof showToast === 'function') showToast("✅ Voix enregistrée avec succès !", "🎙️");
          });

          // Sauvegarder en base64 pour persistance
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              customAudioBase64 = reader.result;
              localStorage.setItem('ebola_saved_voice_b64', reader.result);
            } catch (err) {}
          };
          reader.readAsDataURL(blob);

          clearInterval(recordTimer);
          const recBtn = document.getElementById('ebola-rec-btn');
          if (recBtn) {
            recBtn.textContent = "🎙️ Ré-enregistrer 'Ebola'";
            recBtn.classList.remove('btn-danger', 'pulse-recording');
            recBtn.classList.add('btn-secondary');
          }
        };

        mediaRecorder.start();
        isRecording = true;

        const recBtn = document.getElementById('ebola-rec-btn');
        if (recBtn) {
          recBtn.textContent = "🔴 Parle maintenant : Dis 'EBOLA' ! (Stop)";
          recBtn.classList.remove('btn-secondary');
          recBtn.classList.add('btn-danger', 'pulse-recording');
        }

        // Arrêt automatique après 3 secondes maximum pour capturer juste le mot "Ebola"
        recordTimer = setTimeout(() => {
          if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 3000);

      } catch (err) {
        console.error("[EbolaVoice] Accès micro refusé ou impossible :", err);
        if (typeof showToast === 'function') {
          showToast("Micro non accessible : voix de synthèse par défaut active !", "⚠️");
        }
      }
    }

    function stopRecording() {
      if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }

    function toggleRecording() {
      if (isRecording) stopRecording();
      else startRecording();
    }

    function clearCustomVoice() {
      customAudioBuffer = null;
      customAudioBase64 = null;
      try { localStorage.removeItem('ebola_saved_voice_b64'); } catch (e) {}
      updateVoiceUI(false);
      if (typeof showToast === 'function') showToast("Voix réinitialisée (Synthèse active)", "🔄");
    }

    function playVoice() {
      const c = getAudioCtx();

      // Facteur de Pitch / Fréquence
      let rate = 1.0;
      if (pitchMode === 'chipmunk') rate = 1.6;
      else if (pitchMode === 'demon') rate = 0.65;
      else if (pitchMode === 'fast') rate = 1.35;

      if (customAudioBuffer) {
        // Lecture polyphonique de la voix de l'utilisateur enregistrée au micro
        try {
          const source = c.createBufferSource();
          source.buffer = customAudioBuffer;
          source.playbackRate.setValueAtTime(rate, c.currentTime);

          const gain = c.createGain();
          gain.gain.setValueAtTime(0.85, c.currentTime);

          source.connect(gain);
          gain.connect(c.destination);
          source.start(0);
          return;
        } catch (e) {}
      }

      // Fallback 1 : Web Speech API si aucune voix enregistrée
      if (typeof window.speechSynthesis !== 'undefined') {
        try {
          const utt = new SpeechSynthesisUtterance('Ebola');
          utt.lang = 'fr-FR';
          utt.rate = rate;
          utt.pitch = rate * 1.1;
          utt.volume = 1.0;
          window.speechSynthesis.speak(utt);
          return;
        } catch (e) {}
      }

      // Fallback 2 : Synthèse Web Audio pure "E-BO-LA"
      try {
        [320, 240, 360].forEach((freq, i) => {
          setTimeout(() => {
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq * rate, c.currentTime);
            g.gain.setValueAtTime(0.12, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
            osc.connect(g);
            g.connect(c.destination);
            osc.start();
            osc.stop(c.currentTime + 0.12);
          }, i * 110);
        });
      } catch (e) {}
    }

    function updateVoiceUI(hasCustom) {
      const statusEl = document.getElementById('ebola-voice-status');
      const testBtn = document.getElementById('ebola-test-voice-btn');
      const clearBtn = document.getElementById('ebola-clear-voice-btn');

      if (statusEl) {
        if (hasCustom) {
          statusEl.innerHTML = '<span class="text-emerald">✅ Ta voix micro "Ebola" est active !</span>';
        } else {
          statusEl.innerHTML = '<span class="text-amber">🎙️ Voix par défaut active (Enregistre la tienne !)</span>';
        }
      }
      if (testBtn) testBtn.style.display = hasCustom ? 'inline-block' : 'none';
      if (clearBtn) clearBtn.style.display = hasCustom ? 'inline-block' : 'none';
    }

    return {
      getAudioCtx,
      loadSavedVoice,
      toggleRecording,
      playVoice,
      clearCustomVoice,
      hasCustomVoice: () => !!customAudioBuffer
    };
  })();

  /* =========================================================================
     MÉCANIQUE CLICKER & SPAM ESPACE
     ========================================================================= */
  function triggerEbolaSpam() {
    // 1. Jouer la voix "Ebola"
    VoiceEngine.playVoice();

    // 2. Ouvrir nouvel onglet avec Enola.png si l'option est active
    if (openTabsEnabled) {
      try {
        window.open('Enola.png', '_blank');
      } catch (err) {
        console.warn("[EbolaClicker] Ouverture d'onglet bloquée par le navigateur :", err);
      }
    }

    // 3. Incrémenter les Ebolas et statistiques
    ebolas += ebolasPerClick;
    totalClicks++;

    // 4. Animation du virus central et spawn de clones volants
    animateCenterButton();
    spawnFloatingEnola();

    // 5. Mettre à jour l'interface
    updateStatsUI();
  }

  function animateCenterButton() {
    const btn = document.getElementById('ebola-big-button');
    if (!btn) return;
    btn.classList.remove('ebola-pop-anim');
    void btn.offsetWidth; // Force reflow
    btn.classList.add('ebola-pop-anim');
  }

  function spawnFloatingEnola() {
    const stage = document.getElementById('ebola-stage');
    if (!stage) return;

    // Sticker flottant d'Enola.png
    const floater = document.createElement('div');
    floater.className = 'ebola-floater';

    const randX = Math.random() * 80 + 10;
    const randRotate = (Math.random() - 0.5) * 50;
    const randScale = Math.random() * 0.4 + 0.8;

    floater.style.left = randX + '%';
    floater.style.bottom = '40%';
    floater.style.transform = `scale(${randScale}) rotate(${randRotate}deg)`;
    floater.innerHTML = `
      <img src="Enola.png" alt="Enola" style="width:70px; height:auto; border-radius:12px; box-shadow:0 0 20px rgba(0,255,136,0.5); border:2px solid #00f0ff;" />
      <div style="font-size:12px; font-weight:800; color:#00f0ff; text-align:center; text-shadow:0 0 8px #000;">+${ebolasPerClick} EBOLA!</div>
    `;

    stage.appendChild(floater);

    setTimeout(() => {
      if (floater.parentNode) floater.parentNode.removeChild(floater);
    }, 1200);
  }

  function updateStatsUI() {
    const ebCount = document.getElementById('ebola-count-display');
    if (ebCount) ebCount.textContent = formatNumber(ebolas);

    const epsDisp = document.getElementById('ebola-eps-display');
    if (epsDisp) epsDisp.textContent = formatNumber(autoEps) + ' /s';

    const clkDisp = document.getElementById('ebola-clicks-display');
    if (clkDisp) clkDisp.textContent = totalClicks;

    const perClkDisp = document.getElementById('ebola-perclick-display');
    if (perClkDisp) perClkDisp.textContent = '+' + formatNumber(ebolasPerClick);

    // Mettre à jour l'accessibilité des améliorations
    UPGRADES.forEach(u => {
      const btn = document.getElementById(`ebola-upg-${u.id}`);
      if (btn) {
        btn.disabled = ebolas < u.cost;
      }
    });
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toString();
  }

  function setOpenTabs(enabled, notify = true) {
    openTabsEnabled = !!enabled;
    try { localStorage.setItem('ebola_open_tabs_enabled', openTabsEnabled ? 'true' : 'false'); } catch (e) {}

    const chk = document.getElementById('ebola-tab-toggle');
    if (chk) chk.checked = openTabsEnabled;

    const btnStatus = document.getElementById('ebola-btn-status');
    if (btnStatus) {
      btnStatus.textContent = openTabsEnabled ? 'ACTIVÉ ✓' : 'DÉSACTIVÉ ✕';
      btnStatus.className = openTabsEnabled ? 'text-emerald' : 'text-rose';
    }

    const badge = document.getElementById('ebola-tab-badge');
    if (badge) {
      badge.textContent = openTabsEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ';
      badge.style.background = openTabsEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
      badge.style.color = openTabsEnabled ? '#10b981' : '#f43f5e';
    }

    const indicator = document.getElementById('ebola-mode-indicator');
    if (indicator) {
      indicator.textContent = openTabsEnabled ? 'ACTIVÉ (Ouvre Enola.png à chaque frappe)' : 'DÉSACTIVÉ (Zéro onglet - Idéal pour spammer)';
      indicator.className = openTabsEnabled ? 'text-emerald' : 'text-rose';
    }

    if (notify && typeof showToast === 'function') {
      showToast(openTabsEnabled ? "📑 Onglets Enola.png : ACTIVÉ" : "📑 Onglets Enola.png : DÉSACTIVÉ (Mode sans lag)", "📑");
    }
  }

  function buyUpgrade(id) {
    const upg = UPGRADES.find(u => u.id === id);
    if (!upg || ebolas < upg.cost) return;

    ebolas -= upg.cost;
    upg.count++;
    ebolasPerClick += upg.perClick;
    autoEps += upg.eps;
    upg.cost = Math.round(upg.cost * 1.35);

    saveClickerState();
    renderUpgradesUI();
    updateStatsUI();

    if (typeof showToast === 'function') {
      showToast(`Amélioration débloquée : ${upg.name} !`, "💉");
    }
  }

  function renderUpgradesUI() {
    const shopList = document.getElementById('ebola-shop-list');
    if (!shopList) return;

    shopList.innerHTML = UPGRADES.map(u => `
      <div class="ebola-shop-item ${ebolas >= u.cost ? 'can-buy' : 'cannot-buy'}">
        <div style="flex:1;">
          <div style="font-weight:700; font-size:14px; color:#fff;">${u.name} <span class="badge" style="background:#1e293b; color:#00f0ff;">x${u.count}</span></div>
          <div style="font-size:11px; color:#94a3b8;">${u.desc}</div>
        </div>
        <button id="ebola-upg-${u.id}" class="btn btn-primary btn-sm" ${ebolas < u.cost ? 'disabled' : ''} onclick="EbolaClickerGame.buy('${u.id}')">
          💰 ${formatNumber(u.cost)}
        </button>
      </div>
    `).join('');
  }

  function saveClickerState() {
    try {
      const state = {
        ebolas,
        totalClicks,
        ebolasPerClick,
        autoEps,
        upgrades: UPGRADES.map(u => ({ id: u.id, cost: u.cost, count: u.count }))
      };
      localStorage.setItem('ebola_clicker_save_v1', JSON.stringify(state));
    } catch (e) {}
  }

  function loadClickerState() {
    try {
      const saved = localStorage.getItem('ebola_clicker_save_v1');
      if (saved) {
        const state = JSON.parse(saved);
        ebolas = state.ebolas || 0;
        totalClicks = state.totalClicks || 0;
        ebolasPerClick = state.ebolasPerClick || 1;
        autoEps = state.autoEps || 0;
        if (state.upgrades) {
          state.upgrades.forEach(su => {
            const upg = UPGRADES.find(u => u.id === su.id);
            if (upg) {
              upg.cost = su.cost;
              upg.count = su.count;
            }
          });
        }
      }
    } catch (e) {}
  }

  /* =========================================================================
     INITIALISATION DU MODULE
     ========================================================================= */
  function init() {
    if (inited) return;

    loadClickerState();
    VoiceEngine.loadSavedVoice();

    // Configuration des écouteurs UI
    const recBtn = document.getElementById('ebola-rec-btn');
    if (recBtn) recBtn.onclick = VoiceEngine.toggleRecording;

    const testBtn = document.getElementById('ebola-test-voice-btn');
    if (testBtn) testBtn.onclick = VoiceEngine.playVoice;

    const clearBtn = document.getElementById('ebola-clear-voice-btn');
    if (clearBtn) clearBtn.onclick = VoiceEngine.clearCustomVoice;

    const bigBtn = document.getElementById('ebola-big-button');
    if (bigBtn) {
      bigBtn.onclick = () => {
        triggerEbolaSpam();
      };
    }

    const tabToggle = document.getElementById('ebola-tab-toggle');
    if (tabToggle) {
      tabToggle.onchange = (e) => setOpenTabs(e.target.checked, true);
    }

    const toggleBtn = document.getElementById('ebola-toggle-tab-btn');
    if (toggleBtn) {
      toggleBtn.onclick = () => setOpenTabs(!openTabsEnabled, true);
    }

    setOpenTabs(openTabsEnabled, false);

    // Sélecteur de Pitch Voice
    document.querySelectorAll('.ebola-pitch-btn').forEach(btn => {
      btn.onclick = () => {
        pitchMode = btn.dataset.pitch || 'normal';
        document.querySelectorAll('.ebola-pitch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        VoiceEngine.playVoice();
      };
    });

    // Écouteur global pour la BARRE ESPACE
    window.addEventListener('keydown', (e) => {
      if (window.__activeCyberSection === 'ebolaclicker') {
        if (e.code === 'Space') {
          e.preventDefault();
          triggerEbolaSpam();
        }
      }
    });

    renderUpgradesUI();
    updateStatsUI();

    inited = true;
  }

  function start() {
    if (!inited) init();
    active = true;

    // Boucle automatique d'Ebolas par seconde
    if (!autoInterval) {
      autoInterval = setInterval(() => {
        if (active && autoEps > 0) {
          ebolas += (autoEps / 10);
          updateStatsUI();
        }
      }, 100);
    }
  }

  function pause() {
    active = false;
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    }
    saveClickerState();
  }

  return {
    init,
    start,
    pause,
    buy: buyUpgrade,
    playVoice: VoiceEngine.playVoice
  };
})();

// ============================================================================
// ENREGISTREMENT UNIVERSEL DANS CYBER_MODULES & SECTION_TITLES
// ============================================================================
if (typeof CYBER_MODULES !== 'undefined') {
  CYBER_MODULES.ebolaclicker = EbolaClickerGame;
}
if (typeof SECTION_TITLES !== 'undefined') {
  SECTION_TITLES.ebolaclicker = '🦠 Ebola Clicker';
}

if (typeof window !== 'undefined') {
  if (!window.CYBER_MODULES) window.CYBER_MODULES = {};
  if (!window.SECTION_TITLES) window.SECTION_TITLES = {};
  window.CYBER_MODULES.ebolaclicker = EbolaClickerGame;
  window.SECTION_TITLES.ebolaclicker = '🦠 Ebola Clicker';

  function bindEbolaButtons() {
    if (!window.navigateTo) return;
    document.querySelectorAll('.nav-btn, [data-goto]').forEach(btn => {
      const sec = btn.dataset.section || btn.dataset.goto;
      if (sec === 'ebolaclicker') {
        btn.onclick = () => window.navigateTo('ebolaclicker');
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bindEbolaButtons);
  } else {
    bindEbolaButtons();
  }
}
