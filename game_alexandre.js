/* ============================================================================
   SCHOOL-FUN : ALEXANDRE WINGDINGS SIMULATOR
   Fais pleurer Alexandre en convertissant ses chefs-d'œuvre en Wingdings !
   Feux d'artifice, cascade de larmes, 1000 pages, génération IA & Upgrades
   ============================================================================ */
'use strict';

const AlexandreGame = (() => {
  let active = false;
  let inited = false;

  // Progression & Stats
  let currentPage = 1;
  const TARGET_PAGES = 1000;
  let tears = 0;
  let tearsPerConvert = 10;
  let pagesPerConvert = 1;
  let emotionLevel = 1; // Multiplicateur de larmes & taille des explosions
  let autoSelectUnlocked = false;
  let autoConvertInterval = null;
  let isSelectedAll = false;
  let isWingdingued = false;
  let currentRawText = '';
  let alexandreState = 'idle'; // 'idle', 'panicked', 'crying'

  // Upgrades Configuration
  const UPGRADES = [
    { id: 'emotion', name: '😭 Émotion Intense', cost: 25, count: 0, desc: 'Alexandre pleure plus fort (+50% Larmes & Feux d\'artifice x2)' },
    { id: 'multipage', name: '📑 Multipage Turbo', cost: 75, count: 0, desc: '+1 page convertie d\'un seul coup par action Wingdings' },
    { id: 'autoselect', name: '⚡ Auto-Select Magique', cost: 180, count: 0, desc: 'Sélectionne automatiquement tout le texte dès qu\'il apparaît' },
    { id: 'overclock', name: '⚡ Overclock Gemini 2.5', cost: 450, count: 0, desc: 'Génération instantanée ultra-rapide des manuscrits' },
    { id: 'tsunami', name: '🌧️ Tsunami de Larmes', cost: 1200, count: 0, desc: 'Production passive continue de larmes (+15/s)' },
    { id: 'master', name: '🔮 Gaster Wingdings Nova', cost: 3500, count: 0, desc: 'Multiplie par 5 toutes les larmes et fait exploser des fusées géantes' }
  ];

  // Table de conversion Wingdings Unicode universelle
  const WINGDINGS_MAP = {
    'a': '✌', 'b': '👌', 'c': '👍', 'd': '👎', 'e': '☜', 'f': '☞', 'g': '☝', 'h': '✍',
    'i': '✎', 'j': '✏', 'k': '✂', 'l': '✁', 'm': '👓', 'n': '🕭', 'o': '🔔', 'p': '🕮',
    'q': '🕯', 'r': '🕱', 's': '💣', 't': '⌛', 'u': '⏳', 'v': '🖂', 'w': '🖃', 'x': '🖄',
    'y': '🖅', 'z': '📁',
    'A': '✡', 'B': '✝', 'C': '✞', 'D': '✟', 'E': '✠', 'F': '✡', 'G': '♈', 'H': '♉',
    'I': '♊', 'J': '♋', 'K': '♌', 'L': '♍', 'M': '♎', 'N': '♏', 'O': '♐', 'P': '♑',
    'Q': '♒', 'R': '♓', 'S': '🕮', 'T': '🕯', 'U': '🕱', 'V': '🕲', 'W': '🕳', 'X': '👓',
    'Y': '🕻', 'Z': '🕼',
    '0': '🗀', '1': '🗁', '2': '🗂', '3': '📂', '4': '📁', '5': '🗄', '6': '📄', '7': '🗎', '8': '🗍', '9': '🗎',
    ' ': '   ', '.': '●', ',': '◆', '!': '⚡', '?': '❓', "'": '❛', '"': '❝', ':': '❖', ';': '✦',
    'é': '✌', 'è': '☜', 'ê': '☞', 'à': '☝', 'ç': '✍', 'ù': '⏳', 'ô': '🔔', 'î': '✎'
  };

  function toWingdings(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      out += WINGDINGS_MAP[ch] || ch;
    }
    return out;
  }

  // Audio Synthesizer (Web Audio)
  const AudioEngine = (() => {
    let ctx = null;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur = 0.08, type = 'sine', vol = 0.1, slide = null) {
      try {
        const c = getCtx();
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, c.currentTime);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + dur);
      } catch (e) {}
    }
    return {
      getCtx,
      blip: () => tone(480 + Math.random() * 120, 0.04, 'triangle', 0.04),
      shock: () => {
        tone(300, 0.12, 'sawtooth', 0.15, 650);
        setTimeout(() => tone(620, 0.15, 'square', 0.12, 220), 70);
      },
      firework: () => {
        // Son de détonation de feu d'artifice
        tone(120, 0.25, 'sawtooth', 0.2, 35);
        setTimeout(() => tone(800, 0.15, 'sine', 0.1, 1400), 50);
        setTimeout(() => tone(960, 0.12, 'triangle', 0.08, 400), 120);
      },
      cry: () => {
        // Plainte tragi-comique d'Alexandre
        [580, 520, 460, 400, 340].forEach((f, i) => {
          setTimeout(() => tone(f, 0.14, 'sawtooth', 0.09, f * 0.85), i * 85);
        });
      },
      pageDing: () => {
        tone(784, 0.08, 'sine', 0.1);
        setTimeout(() => tone(1046, 0.18, 'sine', 0.12), 60);
      },
      victory: () => {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          setTimeout(() => tone(f, 0.2, 'sine', 0.15), i * 80);
        });
      }
    };
  })();

  // Générateur Procédural Simulant Gemini 2.5 Flash Lite
  const GeminiFlashLiteSimulator = (() => {
    const SUJETS = [
      "la métaphysique quantique appliquée aux chaussettes orphelines",
      "la sociologie secrète des pigeons parisiens et leur réseau 5G",
      "l'analyse thermodynamique comparée des lasagnes et du noyau terrestre",
      "pourquoi le chiffre 7 refuse d'avouer son crime contre le chiffre 9",
      "la théorie des cordes revisitée à travers la texture des cordons bleus",
      "l'influence de la Lune sur la vitesse de cuisson des coquillettes",
      "le manifeste philosophique sur l'existence prouvée des fenêtres Windows 95 dans l'espace",
      "la diplomatie géopolitique entre les stylos 4 couleurs et les effaceurs"
    ];

    const INTROS = [
      "Dans mon traité fondamental en 14 volumes, j'ai formellement démontré que",
      "Il est scientifiquement et ontologiquement indéniable que",
      "Après 72 heures sans sommeil devant ma machine à écrire cybernétique, je proclame que",
      "Contrairement à l'opinion de mes détracteurs incapables de saisir le génie pur,",
      "Voici la preuve irréfutable que l'univers tout entier est régi par"
    ];

    const ARGUMENTS = [
      "les particules subatomiques vibrent exactement à la même fréquence qu'une tartine qui tombe du mauvais côté. Ceci implique que la gravitation n'est qu'une illusion sensorielle créée par le manque de beurre salé.",
      "la compression du temps cosmique s'accélère à chaque fois qu'un professeur dit 'Rangez vos affaires dans 5 minutes'. Les calculs différentiels prouvent qu'un trou noir miniature se forme sous le tableau noir.",
      "les équations non-linéaires d'Einstein révèlent une variable cachée : la courbure de l'espace-temps dépend exclusivement du taux de caféine contenu dans mon thermos.",
      "si l'on projette les coordonnées fractales de mon devoir de maths dans un espace de Hilbert, on obtient le visage parfait d'un ornithorynque jouant de la clarinette.",
      "la mémoire holographique universelle prouve que chaque gomme mie de pain contient les secrets perdus de la bibliothèque d'Alexandrie."
    ];

    const CONCLUSIONS = [
      "En conclusion, quiconque oserait modifier ne serait-ce qu'une lettre de ce chef-d'œuvre commettrait un crime imprescriptible contre la culture universelle !",
      "Ce texte est protégé par les lois du copyright galactique et la pureté absolue de mon âme d'artiste.",
      "Je refuse que quiconque pose un seul doigt sur ce document. C'est l'apogée de ma carrière intellectuelle !",
      "Ne sélectionnez surtout pas ce texte. Sa perfection typographique pourrait détruire l'équilibre gravitationnel de cette salle."
    ];

    function generate(page) {
      const s = SUJETS[Math.floor(Math.random() * SUJETS.length)];
      const i = INTROS[Math.floor(Math.random() * INTROS.length)];
      const a1 = ARGUMENTS[Math.floor(Math.random() * ARGUMENTS.length)];
      const a2 = ARGUMENTS[Math.floor(Math.random() * ARGUMENTS.length)];
      const c = CONCLUSIONS[Math.floor(Math.random() * CONCLUSIONS.length)];

      return `=== TRAITÉ DISSERTATOIRE N°${page} : ${s.toUpperCase()} ===\n\n` +
             `${i} ${s}. En effet, ${a1}\n\n` +
             `De surcroît, mes observations empiriques attestent que ${a2}\n\n` +
             `${c}\n\n` +
             `Signé avec emphase et fierté : Alexandre, Philosophe du Futur.`;
    }

    return { generate };
  })();

  /* =========================================================================
     MOTEUR DE FEUX D'ARTIFICE (CANVAS PARTICLES)
     ========================================================================= */
  const FireworksEngine = (() => {
    let cv, ctx, raf = 0, particles = [];

    function init() {
      cv = document.getElementById('alexandre-fireworks-canvas');
      if (!cv) return;
      ctx = cv.getContext('2d');
      resize();
    }

    function resize() {
      if (!cv) return;
      cv.width = cv.parentElement.clientWidth || 800;
      cv.height = cv.parentElement.clientHeight || 500;
    }

    function spawnBurst(x, y, count = 35) {
      const colors = ['#00f0ff', '#ff0077', '#00ff88', '#ffbb00', '#a855f7', '#ffffff'];
      for (let i = 0; i < count * emotionLevel; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        particles.push({
          x: x || Math.random() * cv.width,
          y: y || Math.random() * cv.height * 0.7,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
          decay: Math.random() * 0.02 + 0.015,
          size: Math.random() * 3.5 + 2,
          isGlyph: Math.random() > 0.6,
          glyph: ['✌', '💣', '✈', '✂', '⌛', '🔔', '📁'][Math.floor(Math.random() * 7)]
        });
      }
      if (!raf) loop();
    }

    function loop() {
      if (!cv || !ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravité
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        if (p.isGlyph) {
          ctx.font = `${Math.round(p.size * 4)}px sans-serif`;
          ctx.fillStyle = p.color;
          ctx.fillText(p.glyph, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    }

    return { init, resize, burst: spawnBurst };
  })();

  /* =========================================================================
     GESTION DU PERSONNAGE ALEXANDRE & DE SES ÉMOTIONS
     ========================================================================= */
  function setAlexandreMood(mood) {
    alexandreState = mood;
    const faceEl = document.getElementById('alexandre-avatar-face');
    const bubbleText = document.getElementById('alexandre-speech-bubble');
    const tearCascade = document.getElementById('alexandre-tears-container');
    const namePlate = document.getElementById('alexandre-nameplate');

    if (!faceEl || !bubbleText) return;

    if (mood === 'idle') {
      faceEl.innerHTML = `
        <!-- Visage Alexandre Fier & Bavard -->
        <circle cx="50" cy="50" r="42" fill="#fed7aa" stroke="#00f0ff" stroke-width="3" />
        <!-- Lunettes rondes intello -->
        <circle cx="36" cy="46" r="12" fill="none" stroke="#0f172a" stroke-width="3.5" />
        <circle cx="64" cy="46" r="12" fill="none" stroke="#0f172a" stroke-width="3.5" />
        <line x1="48" y1="46" x2="52" y2="46" stroke="#0f172a" stroke-width="3.5" />
        <!-- Yeux souriants -->
        <circle cx="36" cy="46" r="4" fill="#0284c7" />
        <circle cx="64" cy="46" r="4" fill="#0284c7" />
        <!-- Sourcils prétentieux -->
        <path d="M 26 34 Q 36 28 44 32" stroke="#78350f" stroke-width="3" fill="none" />
        <path d="M 56 32 Q 64 28 74 34" stroke="#78350f" stroke-width="3" fill="none" />
        <!-- Bouche bavarde -->
        <path d="M 40 66 Q 50 74 60 66" stroke="#b91c1c" stroke-width="3" fill="none" />
        <!-- Mèche de cheveux intello -->
        <path d="M 22 26 Q 50 8 78 26 Q 60 14 30 18 Z" fill="#78350f" />
      `;
      bubbleText.innerHTML = `« Admire ce chef-d'œuvre de la pensée moderne ! Généré avec la puissance cérébrale de Gemini 2.5 Flash Lite. N'y touche surtout pas ! »`;
      if (tearCascade) tearCascade.style.display = 'none';
      if (namePlate) namePlate.textContent = 'Alexandre 🤓 (Écrivain)';
    } else if (mood === 'panicked') {
      faceEl.innerHTML = `
        <!-- Visage Alexandre Paniqué (Select All) -->
        <circle cx="50" cy="50" r="42" fill="#ffedd5" stroke="#f59e0b" stroke-width="3" />
        <!-- Gouttes de sueur animées -->
        <circle cx="80" cy="30" r="5" fill="#38bdf8" />
        <circle cx="84" cy="45" r="4" fill="#38bdf8" />
        <!-- Lunettes de travers -->
        <circle cx="36" cy="44" r="13" fill="none" stroke="#0f172a" stroke-width="3.5" />
        <circle cx="64" cy="48" r="13" fill="none" stroke="#0f172a" stroke-width="3.5" />
        <line x1="49" y1="46" x2="51" y2="46" stroke="#0f172a" stroke-width="3.5" />
        <!-- Yeux exorbités -->
        <circle cx="36" cy="44" r="6" fill="#dc2626" />
        <circle cx="64" cy="48" r="6" fill="#dc2626" />
        <!-- Sourcils horrifiés -->
        <path d="M 26 28 Q 36 34 44 32" stroke="#78350f" stroke-width="3" fill="none" />
        <path d="M 56 32 Q 64 34 74 28" stroke="#78350f" stroke-width="3" fill="none" />
        <!-- Bouche grande ouverte de panique -->
        <ellipse cx="50" cy="70" rx="10" ry="12" fill="#7f1d1d" stroke="#b91c1c" stroke-width="2" />
        <path d="M 22 26 Q 50 8 78 26 Q 60 14 30 18 Z" fill="#78350f" />
      `;
      bubbleText.innerHTML = `<strong class="text-amber">« HÉ ATTENDS ! POURQUOI TOUT EST SÉLECTIONNÉ LÀ ?! Qu'est-ce que tu t'apprêtes à faire ?! NE CLIQUE PAS SUR WINGDINGS JE T'EN SUPPLIE ! »</strong>`;
      if (tearCascade) tearCascade.style.display = 'none';
      if (namePlate) namePlate.textContent = 'Alexandre 😨 (En Panique)';
    } else if (mood === 'crying') {
      faceEl.innerHTML = `
        <!-- Visage Alexandre qui pleure à chaudes larmes -->
        <circle cx="50" cy="50" r="42" fill="#fee2e2" stroke="#ef4444" stroke-width="4" />
        <!-- Lunettes inondées -->
        <circle cx="36" cy="46" r="13" fill="none" stroke="#0f172a" stroke-width="3.5" />
        <circle cx="64" cy="46" r="13" fill="none" stroke="#0f172a" stroke-width="3.5" />
        <line x1="49" y1="46" x2="51" y2="46" stroke="#0f172a" stroke-width="3.5" />
        <!-- Yeux fermés en larmes avec cascades d'eau -->
        <path d="M 28 46 Q 36 52 44 46" stroke="#0284c7" stroke-width="4" fill="none" />
        <path d="M 56 46 Q 64 52 72 46" stroke="#0284c7" stroke-width="4" fill="none" />
        <!-- Cascades de larmes bleues jaillissantes -->
        <path d="M 32 50 C 25 70, 20 85, 24 100" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round" />
        <path d="M 68 50 C 75 70, 80 85, 76 100" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round" />
        <!-- Bouche tremblotante qui pleure -->
        <path d="M 38 72 Q 50 62 62 72 Q 50 78 38 72 Z" fill="#b91c1c" stroke="#991b1b" stroke-width="2" />
        <path d="M 22 26 Q 50 8 78 26 Q 60 14 30 18 Z" fill="#78350f" />
      `;
      bubbleText.innerHTML = `<strong class="text-rose">« NOOOON ! MES PAGES ! 😭😭 C'EST QUOI CES SYMBOLES D'AVIONS ET DE MAINS ?! C'EST ILLISIBLE ! MON CHEF-D'ŒUVRE EST DÉTRUIT ! 😭😭 »</strong>`;
      if (tearCascade) tearCascade.style.display = 'block';
      if (namePlate) namePlate.textContent = 'Alexandre 😭 (Dévasté)';
    }
  }

  /* =========================================================================
     ACTIONS DU JEU : SELECT ALL & WINGDINGS CONVERSION
     ========================================================================= */
  function loadNewPage() {
    isWingdingued = false;
    isSelectedAll = false;

    currentRawText = GeminiFlashLiteSimulator.generate(currentPage);
    const docEl = document.getElementById('alexandre-doc-content');
    if (docEl) {
      docEl.classList.remove('wingdings-active', 'doc-selected-all');
      docEl.textContent = currentRawText;
    }

    const statPg = document.getElementById('alexandre-page-stat');
    if (statPg) statPg.textContent = `${currentPage} / ${TARGET_PAGES}`;

    const progBar = document.getElementById('alexandre-progress-bar');
    if (progBar) progBar.style.width = `${Math.min(100, (currentPage / TARGET_PAGES) * 100)}%`;

    const convBtn = document.getElementById('alexandre-convert-btn');
    if (convBtn) convBtn.disabled = true;

    if (autoSelectUnlocked) {
      setTimeout(selectAllText, 300);
    } else {
      setAlexandreMood('idle');
    }
  }

  function selectAllText() {
    if (isWingdingued) return;
    isSelectedAll = true;

    const docEl = document.getElementById('alexandre-doc-content');
    if (docEl) {
      docEl.classList.add('doc-selected-all');
      // Sélection visuelle réelle dans le DOM
      try {
        const range = document.createRange();
        range.selectNodeContents(docEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }

    AudioEngine.shock();
    setAlexandreMood('panicked');

    const convBtn = document.getElementById('alexandre-convert-btn');
    if (convBtn) convBtn.disabled = false;

    const selBtn = document.getElementById('alexandre-select-btn');
    if (selBtn) selBtn.textContent = '✅ Tout Sélectionné !';
  }

  function convertToWingdings() {
    if (!isSelectedAll || isWingdingued) return;
    isWingdingued = true;

    const docEl = document.getElementById('alexandre-doc-content');
    if (docEl) {
      docEl.classList.remove('doc-selected-all');
      docEl.classList.add('wingdings-active');
      docEl.textContent = toWingdings(currentRawText);
    }

    // 1. Déclencher feux d'artifice & son
    AudioEngine.firework();
    AudioEngine.cry();
    FireworksEngine.burst();

    // 2. Alexandre pleure à chaudes larmes
    setAlexandreMood('crying');

    // 3. Calculer les larmes et les pages complétées
    const gainedTears = Math.round(tearsPerConvert * emotionLevel * pagesPerConvert);
    tears += gainedTears;
    currentPage += pagesPerConvert;

    if (currentPage > TARGET_PAGES) currentPage = TARGET_PAGES;

    // 4. Mettre à jour l'interface
    updateStatsUI();

    if (typeof showToast === 'function') {
      showToast(`💥 WINGDINGS ! +${gainedTears} Larmes collectées !`, '😭');
    }

    // 5. Vérifier la fin du jeu des 1000 pages
    if (currentPage >= TARGET_PAGES) {
      onFinishGame();
      return;
    }

    // 6. Charger la page suivante après 1.8 seconde
    setTimeout(() => {
      if (active) loadNewPage();
    }, 1800);
  }

  function onFinishGame() {
    AudioEngine.victory();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => FireworksEngine.burst(null, null, 60), i * 300);
    }
    const bubbleText = document.getElementById('alexandre-speech-bubble');
    if (bubbleText) {
      bubbleText.innerHTML = `🏆 <strong>« TU AS GAGNÉ... 1000 PAGES TRANSFORMÉES EN WINGDINGS ! Mes yeux ne pleurent plus, ils ne voient que des symboles Gaster... Tu es le Maître Typographe Suprême ! »</strong>`;
    }
    if (typeof showToast === 'function') {
      showToast('🎉 FÉLICITATIONS : Les 1000 pages d\'Alexandre ont été vaincues !', '👑');
    }
  }

  function updateStatsUI() {
    const tDisp = document.getElementById('alexandre-tears-display');
    if (tDisp) tDisp.textContent = formatNumber(tears);

    const statPg = document.getElementById('alexandre-page-stat');
    if (statPg) statPg.textContent = `${currentPage} / ${TARGET_PAGES}`;

    const progBar = document.getElementById('alexandre-progress-bar');
    if (progBar) progBar.style.width = `${Math.min(100, (currentPage / TARGET_PAGES) * 100)}%`;

    const selBtn = document.getElementById('alexandre-select-btn');
    if (selBtn && !isSelectedAll) selBtn.textContent = '📑 Tout Sélectionner (Cmd+A)';

    // Mettre à jour la boutique
    UPGRADES.forEach(u => {
      const btn = document.getElementById(`alex-upg-${u.id}`);
      if (btn) btn.disabled = tears < u.cost;
    });
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toString();
  }

  function buyUpgrade(id) {
    const upg = UPGRADES.find(u => u.id === id);
    if (!upg || tears < upg.cost) return;

    tears -= upg.cost;
    upg.count++;

    if (id === 'emotion') emotionLevel += 1;
    if (id === 'multipage') pagesPerConvert += 1;
    if (id === 'autoselect') autoSelectUnlocked = true;
    if (id === 'master') tearsPerConvert *= 5;

    upg.cost = Math.round(upg.cost * 1.45);

    saveState();
    renderUpgradesUI();
    updateStatsUI();
    AudioEngine.pageDing();

    if (typeof showToast === 'function') {
      showToast(`Amélioration débloquée : ${upg.name} !`, '✨');
    }
  }

  function renderUpgradesUI() {
    const list = document.getElementById('alexandre-shop-list');
    if (!list) return;

    list.innerHTML = UPGRADES.map(u => `
      <div class="alexandre-shop-item ${tears >= u.cost ? 'can-buy' : 'cannot-buy'}">
        <div style="flex:1;">
          <div style="font-weight:700; font-size:13px; color:#fff;">${u.name} <span class="badge" style="background:#1e293b; color:#00f0ff;">x${u.count}</span></div>
          <div style="font-size:11px; color:#94a3b8;">${u.desc}</div>
        </div>
        <button id="alex-upg-${u.id}" class="btn btn-primary btn-sm" ${tears < u.cost ? 'disabled' : ''} onclick="AlexandreGame.buy('${u.id}')">
          💧 ${formatNumber(u.cost)}
        </button>
      </div>
    `).join('');
  }

  function saveState() {
    try {
      const state = {
        currentPage,
        tears,
        emotionLevel,
        pagesPerConvert,
        autoSelectUnlocked,
        upgrades: UPGRADES.map(u => ({ id: u.id, cost: u.cost, count: u.count }))
      };
      localStorage.setItem('alexandre_wingdings_save_v1', JSON.stringify(state));
    } catch (e) {}
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('alexandre_wingdings_save_v1');
      if (saved) {
        const s = JSON.parse(saved);
        currentPage = s.currentPage || 1;
        tears = s.tears || 0;
        emotionLevel = s.emotionLevel || 1;
        pagesPerConvert = s.pagesPerConvert || 1;
        autoSelectUnlocked = !!s.autoSelectUnlocked;
        if (s.upgrades) {
          s.upgrades.forEach(su => {
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

    loadState();
    FireworksEngine.init();

    const selBtn = document.getElementById('alexandre-select-btn');
    if (selBtn) selBtn.onclick = selectAllText;

    const convBtn = document.getElementById('alexandre-convert-btn');
    if (convBtn) convBtn.onclick = convertToWingdings;

    const resetBtn = document.getElementById('alexandre-reset-save-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm("Réinitialiser ta progression sur les 1000 pages d'Alexandre ?")) {
          currentPage = 1;
          tears = 0;
          emotionLevel = 1;
          pagesPerConvert = 1;
          autoSelectUnlocked = false;
          try { localStorage.removeItem('alexandre_wingdings_save_v1'); } catch(e){}
          loadNewPage();
          renderUpgradesUI();
          updateStatsUI();
        }
      };
    }

    // Écouteur clavier (Ctrl+A / Cmd+A pour Tout Sélectionner et W pour Wingdings)
    window.addEventListener('keydown', (e) => {
      if (window.__activeCyberSection === 'alexandre') {
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
          e.preventDefault();
          selectAllText();
        }
        if (e.code === 'KeyW' || e.code === 'Enter') {
          if (isSelectedAll && !isWingdingued) {
            e.preventDefault();
            convertToWingdings();
          }
        }
      }
    });

    window.addEventListener('resize', FireworksEngine.resize);

    renderUpgradesUI();
    loadNewPage();
    updateStatsUI();

    inited = true;
  }

  function start() {
    if (!inited) init();
    active = true;

    // Production passive de larmes (Tsunami)
    if (!autoConvertInterval) {
      autoConvertInterval = setInterval(() => {
        if (active) {
          const tsunamiUpg = UPGRADES.find(u => u.id === 'tsunami');
          if (tsunamiUpg && tsunamiUpg.count > 0) {
            tears += (tsunamiUpg.count * 1.5);
            updateStatsUI();
          }
        }
      }, 100);
    }
  }

  function pause() {
    active = false;
    if (autoConvertInterval) {
      clearInterval(autoConvertInterval);
      autoConvertInterval = null;
    }
    saveState();
  }

  return {
    init,
    start,
    pause,
    buy: buyUpgrade,
    selectAll: selectAllText,
    convert: convertToWingdings
  };
})();

// ============================================================================
// ENREGISTREMENT UNIVERSEL DANS CYBER_MODULES & SECTION_TITLES
// ============================================================================
if (typeof CYBER_MODULES !== 'undefined') {
  CYBER_MODULES.alexandre = AlexandreGame;
}
if (typeof SECTION_TITLES !== 'undefined') {
  SECTION_TITLES.alexandre = '😭 Alexandre Wingdings Simulator';
}

if (typeof window !== 'undefined') {
  if (!window.CYBER_MODULES) window.CYBER_MODULES = {};
  if (!window.SECTION_TITLES) window.SECTION_TITLES = {};
  window.CYBER_MODULES.alexandre = AlexandreGame;
  window.SECTION_TITLES.alexandre = '😭 Alexandre Wingdings Simulator';

  function bindAlexandreButtons() {
    if (!window.navigateTo) return;
    document.querySelectorAll('.nav-btn, [data-goto]').forEach(btn => {
      const sec = btn.dataset.section || btn.dataset.goto;
      if (sec === 'alexandre') {
        btn.onclick = () => window.navigateTo('alexandre');
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bindAlexandreButtons);
  } else {
    bindAlexandreButtons();
  }
}
