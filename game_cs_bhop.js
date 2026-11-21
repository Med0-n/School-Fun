/* ============================================================================
   SCHOOL-FUN : CS:GO BHOP & SURF 3D (SOURCE ENGINE MOVEMENT SIMULATION)
   Zero externe requis - Utilise three.min.js local & AudioContext Web Audio
   ============================================================================ */
'use strict';

const CsBhopGame = (() => {
  let container, canvas;
  let scene, camera, renderer;
  let active = false, inited = false, rafId = 0;
  let clock;

  // Viewmodel Knife
  let knifeGroup, knifeBlade, knifeSpinning = false, knifeSpinAngle = 0;

  // Maps & Track Data
  let currentMap = 'surf1'; // 'surf1', 'bhop1', 'hybrid1'
  let platforms = [];
  let surfRamps = [];
  let boostRings = [];
  let checkpoints = [];
  let currentCheckpoint = 0;
  let finishBox = null;
  let particlesGroup;
  let speedParticles = [];

  // CS Source Physics Configuration
  const P_CONFIG = {
    gravity: 26.0,
    jumpForce: 9.2,
    maxGroundSpeed: 13.5, // ~250 u/s
    groundAccel: 55.0,
    groundFriction: 6.2,
    airAccel: 50.0,
    maxAirSpeed: 3.2,
    autoBhop: true,
    mouseSens: 0.0022
  };

  // Player State
  const player = {
    pos: new THREE.Vector3(0, 4, 0),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: false,
    surfing: false,
    surfNormal: new THREE.Vector3(),
    jumpPressed: false,
    jumpQueued: false,
    streak: 0,
    height: 1.8,
    radius: 0.6,
    speedUnits: 0,
    bobTimer: 0
  };

  // Keys & Controls
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false
  };

  // Timer & Highscores
  let timerActive = false;
  let timerStart = 0;
  let elapsedTime = 0;
  let bestTimes = {
    surf1: parseFloat(localStorage.getItem('csbhop_best_surf1') || '0'),
    bhop1: parseFloat(localStorage.getItem('csbhop_best_bhop1') || '0'),
    hybrid1: parseFloat(localStorage.getItem('csbhop_best_hybrid1') || '0')
  };

  // Audio Synthesizer
  const AudioEngine = (() => {
    let ctx = null;
    let windGain = null;
    let windNoise = null;
    let surfGain = null;
    let surfOsc = null;

    function getCtx() {
      if (!ctx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        initWind();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function initWind() {
      try {
        if (!ctx) return;
        // Buffer de bruit blanc pour le sifflement du vent
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        windNoise = ctx.createBufferSource();
        windNoise.buffer = noiseBuffer;
        windNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        windGain = ctx.createGain();
        windGain.gain.setValueAtTime(0.0, ctx.currentTime);

        windNoise.connect(filter);
        filter.connect(windGain);
        windGain.connect(ctx.destination);
        windNoise.start();

        // Oscillateur pour le son de glisse sur rampes surf
        surfOsc = ctx.createOscillator();
        surfOsc.type = 'triangle';
        surfOsc.frequency.setValueAtTime(140, ctx.currentTime);
        const surfFilter = ctx.createBiquadFilter();
        surfFilter.type = 'lowpass';
        surfFilter.frequency.setValueAtTime(400, ctx.currentTime);

        surfGain = ctx.createGain();
        surfGain.gain.setValueAtTime(0.0, ctx.currentTime);

        surfOsc.connect(surfFilter);
        surfFilter.connect(surfGain);
        surfGain.connect(ctx.destination);
        surfOsc.start();
      } catch (e) {}
    }

    function updateSpeedSounds(speedUnits, isSurfing) {
      if (!ctx || !windGain) return;
      try {
        // Le vent monte proportionnellement au-dessus de 400 u/s
        const windVol = Math.max(0, Math.min(0.25, (speedUnits - 350) / 3000));
        windGain.gain.setTargetAtTime(windVol, ctx.currentTime, 0.08);

        if (surfGain) {
          const surfVol = isSurfing ? Math.min(0.18, 0.04 + speedUnits / 6000) : 0.0;
          surfGain.gain.setTargetAtTime(surfVol, ctx.currentTime, 0.05);
        }
      } catch (e) {}
    }

    function playTone(freq, duration, type = 'square', vol = 0.08, slide = null) {
      try {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime);
        if (slide) osc.frequency.exponentialRampToValueAtTime(slide, c.currentTime + duration);
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.connect(g);
        g.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + duration);
      } catch (e) {}
    }

    return {
      getCtx,
      updateSpeedSounds,
      jump: () => playTone(320, 0.08, 'sine', 0.12, 180),
      bhopStreak: (streak) => {
        const f = Math.min(900, 440 + streak * 45);
        playTone(f, 0.09, 'sine', 0.1, f * 1.2);
      },
      boost: () => {
        playTone(520, 0.15, 'sawtooth', 0.15, 1100);
      },
      checkpoint: () => {
        playTone(587.33, 0.1, 'sine', 0.12);
        setTimeout(() => playTone(880, 0.18, 'sine', 0.12), 80);
      },
      finish: () => {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          setTimeout(() => playTone(f, 0.22, 'sine', 0.15), i * 90);
        });
      },
      knifeInspect: () => {
        playTone(850, 0.06, 'triangle', 0.08, 1400);
        setTimeout(() => playTone(1200, 0.08, 'sine', 0.06, 600), 120);
      },
      fall: () => playTone(180, 0.2, 'sawtooth', 0.1, 70)
    };
  })();

  /* =========================================================================
     INITIALISATION 3D (THREE.JS)
     ========================================================================= */
  function init() {
    if (inited) return;
    container = document.getElementById('sec-csbhop');
    canvas = document.getElementById('canvas-csbhop');
    if (!canvas || typeof THREE === 'undefined') return;

    clock = new THREE.Clock();

    // Scene & Fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    scene.fog = new THREE.FogExp2(0x04060d, 0.008);

    // Camera
    camera = new THREE.PerspectiveCamera(80, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 560);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0x223355, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 1.4);
    dirLight1.position.set(30, 80, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff0077, 0.8);
    dirLight2.position.set(-40, 50, -30);
    scene.add(dirLight2);

    // Particles (Vitesse & Étoiles)
    createSpeedParticles();

    // 3D Knife Viewmodel
    createKnifeViewmodel();

    // Setup Map
    loadMap(currentMap);

    // Setup Listeners
    setupControls();
    setupUI();

    inited = true;
  }

  /* =========================================================================
     VIEWMODEL DU COUTEAU CYBER (STYLE KARAMBIT CS:GO)
     ========================================================================= */
  function createKnifeViewmodel() {
    knifeGroup = new THREE.Group();

    // Manche ergonomique foncé
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.32, 8);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x11131c,
      roughness: 0.6,
      metalness: 0.8
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.z = Math.PI / 10;
    knifeGroup.add(handle);

    // Anneau de maintien Karambit
    const ringGeo = new THREE.TorusGeometry(0.06, 0.02, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x005577,
      metalness: 0.9,
      roughness: 0.2
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, -0.18, 0);
    knifeGroup.add(ring);

    // Lame incurvée néon cyber
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.18, 0.15, 0.22, 0.35);
    bladeShape.quadraticCurveTo(0.15, 0.25, 0.04, 0.12);
    bladeShape.lineTo(0, 0);

    const extrudeSettings = { depth: 0.015, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.005, bevelThickness: 0.005 };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088aa,
      metalness: 0.95,
      roughness: 0.1
    });
    knifeBlade = new THREE.Mesh(bladeGeo, bladeMat);
    knifeBlade.position.set(-0.02, 0.05, -0.01);
    knifeGroup.add(knifeBlade);

    // Positionnement dans le coin inférieur droit de la caméra
    knifeGroup.position.set(0.28, -0.22, -0.42);
    knifeGroup.rotation.set(0.1, -0.2, 0.15);
    camera.add(knifeGroup);
    scene.add(camera);
  }

  function triggerKnifeInspect() {
    if (knifeSpinning) return;
    knifeSpinning = true;
    knifeSpinAngle = 0;
    AudioEngine.knifeInspect();
  }

  /* =========================================================================
     PARTICULES DE VITESSE (SPEED LINES DE SENSATION)
     ========================================================================= */
  function createSpeedParticles() {
    particlesGroup = new THREE.Group();
    const particleCount = 120;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      speedParticles.push({
        origX: positions[i * 3],
        origY: positions[i * 3 + 1],
        origZ: positions[i * 3 + 2]
      });
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.25,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geom, pMat);
    particlesGroup.add(pSystem);
    scene.add(particlesGroup);
  }

  /* =========================================================================
     GÉNÉRATION DES CARTES (SURF, BHOP, HYBRID)
     ========================================================================= */
  function clearMap() {
    platforms.forEach(p => scene.remove(p.mesh));
    surfRamps.forEach(r => scene.remove(r.mesh));
    boostRings.forEach(b => scene.remove(b.mesh));
    if (finishBox) scene.remove(finishBox.mesh);
    platforms = [];
    surfRamps = [];
    boostRings = [];
    checkpoints = [];
    currentCheckpoint = 0;
    finishBox = null;
  }

  // Matériaux réutilisables
  const surfMatCyan = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    roughness: 0.15,
    metalness: 0.6,
    emissive: 0x002d44,
    flatShading: true
  });

  const surfMatPink = new THREE.MeshStandardMaterial({
    color: 0xff0088,
    roughness: 0.15,
    metalness: 0.6,
    emissive: 0x330018,
    flatShading: true
  });

  const blockMat = new THREE.MeshStandardMaterial({
    color: 0x161b2e,
    roughness: 0.5,
    metalness: 0.8
  });

  const blockEdgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
  const blockEdgePinkMat = new THREE.LineBasicMaterial({ color: 0xff0077, linewidth: 2 });

  // Création d'une plateforme rectangulaire solide avec bordures néon
  function addPlatform(x, y, z, w, h, d, color = 0x00f0ff, isStart = false) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, blockMat);
    mesh.position.set(x, y, z);

    // Bords néon brillants
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = color === 0xff0077 ? blockEdgePinkMat : blockEdgeMat;
    const wire = new THREE.LineSegments(edges, lineMat);
    mesh.add(wire);

    scene.add(mesh);

    const halfW = w / 2, halfH = h / 2, halfD = d / 2;
    const plat = {
      mesh,
      minX: x - halfW, maxX: x + halfW,
      minY: y - halfH, maxY: y + halfH,
      minZ: z - halfD, maxZ: z + halfD,
      isStart
    };
    platforms.push(plat);
    return plat;
  }

  // Création d'une rampe de surf (triangle prismatique / coin 45°-60°)
  function addSurfRamp(x, y, z, length, height, width, slopeSide = 'right', angleZ = 0) {
    // slopeSide: 'right' (face glissable vers +X) ou 'left' (face glissable vers -X)
    const shape = new THREE.Shape();
    if (slopeSide === 'right') {
      // Triangle rectangle : pente douce glissable sur le côté droit
      shape.moveTo(0, 0);
      shape.lineTo(width, 0);
      shape.lineTo(0, height);
      shape.closePath();
    } else {
      shape.moveTo(0, 0);
      shape.lineTo(-width, 0);
      shape.lineTo(0, height);
      shape.closePath();
    }

    const extrudeSettings = { depth: length, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center(); // Centre géométrique pour rotation facile

    const mat = slopeSide === 'right' ? surfMatCyan : surfMatPink;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (angleZ !== 0) mesh.rotation.x = angleZ;

    // Bordure néon de la rampe
    const edges = new THREE.EdgesGeometry(geo);
    const wire = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: slopeSide === 'right' ? 0x00f0ff : 0xff0099,
      linewidth: 2
    }));
    mesh.add(wire);
    scene.add(mesh);

    // Calcul de la normale du plan de glisse principal
    // Pour une pente 45° :
    let nx = slopeSide === 'right' ? 0.7071 : -0.7071;
    let ny = 0.7071;
    let nz = 0;
    if (angleZ !== 0) {
      nz = -Math.sin(angleZ);
      ny = Math.cos(angleZ) * 0.7071;
    }

    const normal = new THREE.Vector3(nx, ny, nz).normalize();

    const ramp = {
      mesh,
      x, y, z,
      length, height, width,
      slopeSide,
      normal,
      minX: x - width - 1, maxX: x + width + 1,
      minY: y - height / 2 - 2, maxY: y + height / 2 + 3,
      minZ: z - length / 2 - 2, maxZ: z + length / 2 + 2
    };
    surfRamps.push(ramp);
    return ramp;
  }

  // Anneau d'accélération Boost (+400 u/s)
  function addBoostRing(x, y, z, boostAmount = 18.0) {
    const geo = new THREE.TorusGeometry(2.2, 0.18, 12, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    boostRings.push({
      mesh,
      pos: new THREE.Vector3(x, y, z),
      radius: 2.8,
      boostAmount,
      triggered: false
    });
  }

  // Zone d'arrivée (Goal Platform avec cylindre de téléportation)
  function addFinishPlatform(x, y, z, size = 10) {
    const plat = addPlatform(x, y, z, size, 2, size, 0x00ff88);
    const beaconGeo = new THREE.CylinderGeometry(size / 3, size / 3, 20, 16, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(x, y + 10, z);
    scene.add(beacon);

    finishBox = {
      mesh: beacon,
      minX: x - size / 2, maxX: x + size / 2,
      minY: y, maxY: y + 20,
      minZ: z - size / 2, maxZ: z + size / 2
    };
  }

  /* --- MAP 1: SURF CYBER UTOPIA --- */
  function buildSurfMap1() {
    clearMap();
    // 1. Tour de départ
    addPlatform(0, 40, -10, 8, 2, 12, 0x00f0ff, true);
    checkpoints.push(new THREE.Vector3(0, 43, -10));

    // 2. Première rampe de surf (droite) avec légère pente descendante
    addSurfRamp(5, 30, 25, 45, 12, 10, 'right', -0.06);

    // Anneau boost à la sortie
    addBoostRing(12, 28, 55, 16);

    // 3. Deuxième rampe de surf (gauche) pour enchaîner l'air-strafe
    addSurfRamp(4, 20, 95, 50, 14, 11, 'left', -0.04);

    // Checkpoint mi-parcours
    const cpPlat = addPlatform(0, 22, 130, 8, 2, 8, 0x00f0ff);
    checkpoints.push(new THREE.Vector3(0, 25, 130));

    // Anneau boost
    addBoostRing(0, 22, 148, 20);

    // 4. Troisième rampe : Grand tremplin ascendant
    addSurfRamp(-8, 14, 185, 45, 15, 12, 'right', 0.08);

    // Anneau boost dans le ciel
    addBoostRing(-6, 32, 225, 24);

    // 5. Quatrième rampe d'atterrissage à grande vitesse
    addSurfRamp(10, 16, 270, 55, 16, 12, 'left', -0.05);

    // 6. Plateforme finale victorieuse
    addFinishPlatform(0, 12, 335, 16);

    // Positionner le joueur au départ
    respawnPlayer();
  }

  /* --- MAP 2: BHOP MATRIX RUN --- */
  function buildBhopMap2() {
    clearMap();
    // 1. Départ
    addPlatform(0, 10, 0, 8, 2, 8, 0x00f0ff, true);
    checkpoints.push(new THREE.Vector3(0, 13, 0));

    // 2. Série de blocs étroits séparés par des gaps croissants
    addPlatform(0, 10, 15, 4, 1.5, 4, 0x00f0ff);
    addPlatform(0, 10, 27, 3.5, 1.5, 3.5, 0x00f0ff);
    addPlatform(0, 10, 41, 3.5, 1.5, 3.5, 0x00f0ff);

    // Virage à 90° gauche (demande un air-strafe précis)
    addPlatform(-8, 10, 55, 4, 1.5, 4, 0xff0077);
    addPlatform(-20, 10, 55, 4, 1.5, 4, 0xff0077);

    // Checkpoint 1
    addPlatform(-32, 11, 55, 7, 2, 7, 0x00f0ff);
    checkpoints.push(new THREE.Vector3(-32, 14, 55));

    // Anneau boost vers le couloir ascendant
    addBoostRing(-42, 13, 55, 15);

    // Blocs décalés en diagonale
    addPlatform(-54, 13, 62, 3, 1.5, 3, 0x00f0ff);
    addPlatform(-64, 15, 72, 3, 1.5, 3, 0x00f0ff);
    addPlatform(-74, 17, 82, 3, 1.5, 3, 0x00f0ff);
    addPlatform(-84, 19, 92, 3, 1.5, 3, 0x00f0ff);

    // Checkpoint 2
    addPlatform(-96, 21, 104, 7, 2, 7, 0x00f0ff);
    checkpoints.push(new THREE.Vector3(-96, 24, 104));

    // Grand saut final avec pad boost rouge
    addPlatform(-96, 21, 120, 4, 1.5, 4, 0xff0055);
    addBoostRing(-96, 22, 135, 25);

    // Blocs finaux espacés
    addPlatform(-96, 20, 160, 4, 1.5, 4, 0x00f0ff);
    addPlatform(-96, 18, 185, 4, 1.5, 4, 0x00f0ff);

    // Arrivée
    addFinishPlatform(-96, 16, 220, 14);

    respawnPlayer();
  }

  /* --- MAP 3: HYBRID OMEGA (SURF + BHOP) --- */
  function buildHybridMap3() {
    clearMap();
    // 1. Tour haute
    addPlatform(0, 50, 0, 8, 2, 10, 0x00f0ff, true);
    checkpoints.push(new THREE.Vector3(0, 53, 0));

    // 2. Plongée surf ultra rapide
    addSurfRamp(6, 36, 35, 55, 16, 12, 'right', -0.1);
    addBoostRing(12, 30, 72, 20);

    // 3. Sortie sur blocs de bhop à haute vitesse
    addPlatform(12, 22, 100, 4, 1.5, 4, 0xff0077);
    addPlatform(12, 21, 118, 4, 1.5, 4, 0xff0077);
    addPlatform(8, 20, 138, 4, 1.5, 4, 0xff0077);

    // Checkpoint
    addPlatform(0, 20, 160, 8, 2, 8, 0x00f0ff);
    checkpoints.push(new THREE.Vector3(0, 23, 160));

    // 4. Tremplin surf inverse
    addSurfRamp(-8, 18, 200, 55, 16, 12, 'left', 0.06);
    addBoostRing(-10, 36, 240, 24);

    // 5. Blocs suspendus dans les nuages
    addPlatform(-10, 28, 275, 4, 1.5, 4, 0x00f0ff);
    addPlatform(-10, 25, 300, 4, 1.5, 4, 0x00f0ff);

    // Plateforme finale
    addFinishPlatform(-10, 20, 345, 16);

    respawnPlayer();
  }

  function loadMap(mapKey) {
    currentMap = mapKey;
    if (mapKey === 'surf1') buildSurfMap1();
    else if (mapKey === 'bhop1') buildBhopMap2();
    else if (mapKey === 'hybrid1') buildHybridMap3();

    // Mettre à jour l'affichage de la carte active
    const mapLabel = document.getElementById('csbhop-map-name');
    if (mapLabel) {
      mapLabel.textContent = mapKey === 'surf1' ? 'surf_cyber_utopia' : mapKey === 'bhop1' ? 'bhop_matrix_run' : 'surf_bhop_hybrid';
    }
    const pbEl = document.getElementById('csbhop-best-time');
    if (pbEl) {
      pbEl.textContent = bestTimes[mapKey] > 0 ? formatTime(bestTimes[mapKey]) : '--:--.---';
    }
  }

  function respawnPlayer() {
    const cp = checkpoints[currentCheckpoint] || checkpoints[0] || new THREE.Vector3(0, 15, 0);
    player.pos.copy(cp);
    player.vel.set(0, 0, 0);
    player.yaw = 0;
    player.pitch = 0;
    player.onGround = false;
    player.surfing = false;
    player.streak = 0;
    timerActive = false;
    elapsedTime = 0;
    boostRings.forEach(b => b.triggered = false);
    updateHUD();
  }

  /* =========================================================================
     GESTION DES CONTRÔLES & POINTER LOCK (STYLE CS:GO)
     ========================================================================= */
  function setupControls() {
    window.addEventListener('keydown', e => {
      if (window.__activeCyberSection !== 'csbhop') return;
      AudioEngine.getCtx();

      if (e.code === 'KeyW' || e.code === 'KeyZ') keys.forward = true;
      if (e.code === 'KeyS') keys.backward = true;
      if (e.code === 'KeyA' || e.code === 'KeyQ') keys.left = true;
      if (e.code === 'KeyD') keys.right = true;
      if (e.code === 'Space') {
        keys.jump = true;
        player.jumpPressed = true;
        e.preventDefault();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.crouch = true;
      if (e.code === 'KeyR') {
        respawnPlayer();
        e.preventDefault();
      }
      if (e.code === 'KeyB') {
        P_CONFIG.autoBhop = !P_CONFIG.autoBhop;
        const bEl = document.getElementById('csbhop-autobhop-status');
        if (bEl) bEl.textContent = P_CONFIG.autoBhop ? 'AUTO-BHOP: ON' : 'AUTO-BHOP: OFF';
        if (typeof showToast === 'function') showToast(P_CONFIG.autoBhop ? 'Auto-Bhop Activé' : 'Auto-Bhop Désactivé', '⚡');
        e.preventDefault();
      }
      if (e.code === 'KeyF') {
        triggerKnifeInspect();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      if (window.__activeCyberSection !== 'csbhop') return;
      if (e.code === 'KeyW' || e.code === 'KeyZ') keys.forward = false;
      if (e.code === 'KeyS') keys.backward = false;
      if (e.code === 'KeyA' || e.code === 'KeyQ') keys.left = false;
      if (e.code === 'KeyD') keys.right = false;
      if (e.code === 'Space') {
        keys.jump = false;
        player.jumpPressed = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.crouch = false;
    });

    // Molette de souris pour bunny hop comme sur CS
    window.addEventListener('wheel', e => {
      if (window.__activeCyberSection !== 'csbhop') return;
      if (document.pointerLockElement === canvas) {
        player.jumpQueued = true;
        e.preventDefault();
      }
    }, { passive: false });

    // Pointer Lock sur le Canvas
    if (canvas) {
      canvas.addEventListener('click', () => {
        if (document.pointerLockElement !== canvas) {
          canvas.requestPointerLock();
          AudioEngine.getCtx();
        }
      });
    }

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== canvas || !active) return;
      const sens = P_CONFIG.mouseSens;
      player.yaw -= e.movementX * sens;
      player.pitch -= e.movementY * sens;
      // Clamp vertical de la vue (-89° à +89°)
      const maxPitch = Math.PI / 2 - 0.02;
      player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch));
    });
  }

  function setupUI() {
    const rBtn = document.getElementById('csbhop-reset');
    if (rBtn) rBtn.onclick = respawnPlayer;

    const autoBtn = document.getElementById('csbhop-autobhop-btn');
    if (autoBtn) {
      autoBtn.onclick = () => {
        P_CONFIG.autoBhop = !P_CONFIG.autoBhop;
        const bEl = document.getElementById('csbhop-autobhop-status');
        if (bEl) bEl.textContent = P_CONFIG.autoBhop ? 'AUTO-BHOP: ON' : 'AUTO-BHOP: OFF';
      };
    }

    // Sélecteurs de cartes
    document.querySelectorAll('.csbhop-map-btn').forEach(btn => {
      btn.onclick = () => {
        const map = btn.dataset.map;
        if (map) {
          loadMap(map);
          document.querySelectorAll('.csbhop-map-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      };
    });

    // Slider de sensibilité souris
    const sensInput = document.getElementById('csbhop-sens');
    if (sensInput) {
      sensInput.oninput = () => {
        const val = parseFloat(sensInput.value) || 2.2;
        P_CONFIG.mouseSens = val * 0.001;
        const valEl = document.getElementById('csbhop-sens-val');
        if (valEl) valEl.textContent = val.toFixed(1);
      };
    }
  }

  /* =========================================================================
     MOTEUR PHYSIQUE SOURCE ENGINE (AIR STRAFE & SURF)
     ========================================================================= */
  function updatePhysics(dt) {
    if (dt > 0.05) dt = 0.05; // Protection contre les chutes de framerate

    // Démarrage automatique du chrono dès le premier mouvement
    if (!timerActive && (keys.forward || keys.backward || keys.left || keys.right || keys.jump)) {
      timerActive = true;
      timerStart = performance.now();
    }
    if (timerActive) {
      elapsedTime = (performance.now() - timerStart) / 1000;
    }

    // Vecteurs de direction selon la vue caméra
    const sinY = Math.sin(player.yaw);
    const cosY = Math.cos(player.yaw);
    const forward = new THREE.Vector3(-sinY, 0, -cosY);
    const right = new THREE.Vector3(cosY, 0, -sinY);

    // Wish Direction (intention du joueur)
    const wishDir = new THREE.Vector3();
    if (keys.forward) wishDir.add(forward);
    if (keys.backward) wishDir.sub(forward);
    if (keys.right) wishDir.add(right);
    if (keys.left) wishDir.sub(right);

    const hasWish = wishDir.lengthSq() > 0.0001;
    if (hasWish) wishDir.normalize();

    // 1. GESTION DU SAUT & BHOP TIMING
    const wantJump = keys.jump && (P_CONFIG.autoBhop || player.jumpPressed || player.jumpQueued);
    if (wantJump && player.onGround) {
      player.vel.y = P_CONFIG.jumpForce;
      player.onGround = false;
      player.jumpPressed = false;
      player.jumpQueued = false;
      player.streak++;
      AudioEngine.jump();
      AudioEngine.bhopStreak(player.streak);
    }

    // 2. DÉPLACEMENT AU SOL VS DÉPLACEMENT EN L'AIR
    if (player.onGround) {
      // Friction CS au sol (uniquement si le joueur ne saute pas instantanément)
      const speed = player.vel.length();
      if (speed > 0) {
        const drop = speed * P_CONFIG.groundFriction * dt;
        const newSpeed = Math.max(0, speed - drop);
        player.vel.multiplyScalar(newSpeed / speed);
      }

      // Accélération au sol
      if (hasWish) {
        const currentSpeedInWish = player.vel.dot(wishDir);
        const addSpeed = P_CONFIG.maxGroundSpeed - currentSpeedInWish;
        if (addSpeed > 0) {
          const accel = Math.min(addSpeed, P_CONFIG.groundAccel * dt * P_CONFIG.maxGroundSpeed);
          player.vel.addScaledVector(wishDir, accel);
        }
      }
    } else if (player.surfing) {
      // 3. PHYSIQUE SURF (GLISSE SUR RAMPES INCLINÉES)
      // Friction quasi nulle, accélération de la gravité projetée le long de la pente
      const gVec = new THREE.Vector3(0, -P_CONFIG.gravity, 0);
      const gProj = gVec.clone().sub(player.surfNormal.clone().multiplyScalar(gVec.dot(player.surfNormal)));
      player.vel.addScaledVector(gProj, dt * 1.05);

      // Si le joueur appuie sur la touche de strafe vers la rampe, il reste collé
      if (hasWish) {
        const pushIntoRamp = wishDir.dot(player.surfNormal);
        if (pushIntoRamp < 0) {
          // Ajustement léger pour stabiliser le surf
          player.vel.addScaledVector(wishDir, dt * 8.0);
        }
      }
    } else {
      // 4. PHYSIQUE EN L'AIR & AIR-STRAFING SOURCE
      // Gravité standard
      player.vel.y -= P_CONFIG.gravity * dt;

      // Air Accelerate authentique (Quake / Source Engine)
      if (hasWish) {
        const currentSpeedInWish = player.vel.dot(wishDir);
        const addSpeed = P_CONFIG.maxAirSpeed - currentSpeedInWish;
        if (addSpeed > 0) {
          const accelSpeed = Math.min(addSpeed, P_CONFIG.airAccel * dt * P_CONFIG.maxAirSpeed);
          player.vel.addScaledVector(wishDir, accelSpeed);
        }
      }
    }

    // 5. INTÉGRATION DE LA POSITION & COLLISIONS
    const nextPos = player.pos.clone().addScaledVector(player.vel, dt);

    // Détection des collisions avec les plateformes (AABB)
    let groundFound = false;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (nextPos.x >= p.minX && nextPos.x <= p.maxX && nextPos.z >= p.minZ && nextPos.z <= p.maxZ) {
        // Atterrissage sur le dessus de la plateforme
        if (player.pos.y >= p.maxY - 0.2 && nextPos.y <= p.maxY + 0.1 && player.vel.y <= 0) {
          nextPos.y = p.maxY;
          player.vel.y = 0;
          groundFound = true;
          break;
        }
      }
    }
    player.onGround = groundFound;
    if (player.onGround && !wantJump) {
      // Réinitialisation du streak de bhop si on marche au sol
      player.streak = 0;
    }

    // Détection des collisions avec les rampes de surf
    let surfFound = false;
    for (let i = 0; i < surfRamps.length; i++) {
      const r = surfRamps[i];
      if (nextPos.x >= r.minX && nextPos.x <= r.maxX &&
          nextPos.y >= r.minY && nextPos.y <= r.maxY &&
          nextPos.z >= r.minZ && nextPos.z <= r.maxZ) {

        // Calcul de la distance relative à la rampe
        const relX = nextPos.x - r.x;
        const relY = nextPos.y - (r.y - r.height / 2);
        const hyp = r.slopeSide === 'right' ?
          (relX * r.height + relY * r.width) :
          (-relX * r.height + relY * r.width);

        if (hyp > 0 && hyp < (r.width * r.height + 1.2)) {
          surfFound = true;
          player.surfNormal.copy(r.normal);

          // Supprimer la vélocité pénétrant dans le plan
          const dot = player.vel.dot(r.normal);
          if (dot < 0) {
            player.vel.sub(r.normal.clone().multiplyScalar(dot));
          }
          break;
        }
      }
    }
    player.surfing = surfFound;

    // Détection des anneaux Boost
    for (let i = 0; i < boostRings.length; i++) {
      const b = boostRings[i];
      if (!b.triggered && nextPos.distanceTo(b.pos) < b.radius) {
        b.triggered = true;
        // Accélération puissante vers l'avant
        player.vel.addScaledVector(forward, b.boostAmount);
        AudioEngine.boost();
        if (typeof showToast === 'function') showToast('⚡ BOOST +400 u/s !', '🚀');
      }
    }

    // Détection de l'arrivée (Finish)
    if (finishBox &&
        nextPos.x >= finishBox.minX && nextPos.x <= finishBox.maxX &&
        nextPos.y >= finishBox.minY && nextPos.y <= finishBox.maxY &&
        nextPos.z >= finishBox.minZ && nextPos.z <= finishBox.maxZ) {
      onFinishLevel();
    }

    // Chute dans le vide (Kill floor)
    if (nextPos.y < -30) {
      AudioEngine.fall();
      respawnPlayer();
      return;
    }

    // Appliquer la nouvelle position
    player.pos.copy(nextPos);

    // Calcul de la vitesse affichée en CS units/sec (1 m/s ~= 20 u/s)
    const horizSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
    player.speedUnits = Math.round(horizSpeed * 20);

    // Mise à jour des sons dynamiques de vitesse
    AudioEngine.updateSpeedSounds(player.speedUnits, player.surfing);
  }

  function onFinishLevel() {
    timerActive = false;
    AudioEngine.finish();

    const pb = bestTimes[currentMap];
    let isNewRecord = false;
    if (pb === 0 || elapsedTime < pb) {
      bestTimes[currentMap] = elapsedTime;
      localStorage.setItem(`csbhop_best_${currentMap}`, elapsedTime.toString());
      isNewRecord = true;
    }

    const msg = isNewRecord ?
      `🎉 NOUVEAU RECORD CS ! ${formatTime(elapsedTime)}` :
      `🏁 Parcours terminé en ${formatTime(elapsedTime)} !`;

    if (typeof showToast === 'function') showToast(msg, '🏆');
    const pbEl = document.getElementById('csbhop-best-time');
    if (pbEl) pbEl.textContent = formatTime(bestTimes[currentMap]);

    // Légère célébration et retour au début après 2s
    setTimeout(respawnPlayer, 2200);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 100 ? (ms < 10 ? '00' : '0') : ''}${ms}`;
  }

  /* =========================================================================
     BOUCLE DE RENDU ET ANIMATIONS
     ========================================================================= */
  function step() {
    if (!active) return;
    const dt = clock.getDelta();

    updatePhysics(dt);

    // Positionner la caméra aux yeux du joueur
    camera.position.set(player.pos.x, player.pos.y + player.height * 0.85, player.pos.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    // FOV dynamique selon la vitesse (Sensation de vitesse warp)
    const targetFov = Math.min(106, 80 + (player.speedUnits - 250) * 0.015);
    camera.fov = THREE.MathUtils.lerp(camera.fov, Math.max(80, targetFov), 0.08);
    camera.updateProjectionMatrix();

    // Animation du couteau (Bobbing de marche + spin F)
    if (knifeGroup) {
      if (player.onGround && (keys.forward || keys.backward || keys.left || keys.right)) {
        player.bobTimer += dt * 10;
        knifeGroup.position.y = -0.22 + Math.sin(player.bobTimer) * 0.012;
        knifeGroup.position.x = 0.28 + Math.cos(player.bobTimer * 0.5) * 0.01;
      } else {
        knifeGroup.position.y = THREE.MathUtils.lerp(knifeGroup.position.y, -0.22, 0.1);
        knifeGroup.position.x = THREE.MathUtils.lerp(knifeGroup.position.x, 0.28, 0.1);
      }

      // Inclinaison du couteau lors de l'air-strafe
      if (keys.left) knifeGroup.rotation.z = THREE.MathUtils.lerp(knifeGroup.rotation.z, 0.35, 0.1);
      else if (keys.right) knifeGroup.rotation.z = THREE.MathUtils.lerp(knifeGroup.rotation.z, -0.1, 0.1);
      else knifeGroup.rotation.z = THREE.MathUtils.lerp(knifeGroup.rotation.z, 0.15, 0.1);

      // Animation d'inspection (Touche F) : Tour complet 360°
      if (knifeSpinning) {
        knifeSpinAngle += dt * 18;
        knifeBlade.rotation.x = knifeSpinAngle;
        if (knifeSpinAngle >= Math.PI * 2) {
          knifeSpinning = false;
          knifeBlade.rotation.x = 0;
        }
      }
    }

    // Animation des particules de vitesse
    if (particlesGroup) {
      particlesGroup.position.copy(camera.position);
      const posAttr = particlesGroup.children[0].geometry.attributes.position;
      const pArr = posAttr.array;
      const speedFactor = Math.min(3.0, player.speedUnits / 500);

      for (let i = 0; i < speedParticles.length; i++) {
        pArr[i * 3 + 2] += (dt * 30 * speedFactor);
        if (pArr[i * 3 + 2] > 20) {
          pArr[i * 3 + 2] = -35;
        }
      }
      posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
    updateHUD();

    rafId = requestAnimationFrame(step);
  }

  function updateHUD() {
    const spEl = document.getElementById('csbhop-speed-val');
    if (spEl) {
      spEl.textContent = player.speedUnits;
      // Couleurs dynamiques selon la vitesse
      if (player.speedUnits < 300) spEl.style.color = '#ffffff';
      else if (player.speedUnits < 600) spEl.style.color = '#00f0ff';
      else if (player.speedUnits < 1200) spEl.style.color = '#00ff88';
      else if (player.speedUnits < 2000) spEl.style.color = '#ff0077';
      else spEl.style.color = '#ffbb00';
    }

    const tEl = document.getElementById('csbhop-timer');
    if (tEl) tEl.textContent = formatTime(elapsedTime);

    const stEl = document.getElementById('csbhop-streak');
    if (stEl) {
      if (player.streak > 1) {
        stEl.textContent = `BHOP STREAK x${player.streak} !`;
        stEl.style.display = 'inline-block';
      } else {
        stEl.style.display = 'none';
      }
    }
  }

  function start() {
    if (!inited) init();
    active = true;
    if (clock) clock.start();
    if (!rafId) rafId = requestAnimationFrame(step);
  }

  function pause() {
    active = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }

  function resize() {
    if (!renderer || !canvas || !camera) return;
    const w = canvas.clientWidth || 960;
    const h = canvas.clientHeight || 560;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  return { init, start, pause, resize };
})();

// ============================================================================
// ENREGISTREMENT UNIVERSEL DANS CYBER_MODULES & SECTION_TITLES
// ============================================================================
if (typeof CYBER_MODULES !== 'undefined') {
  CYBER_MODULES.csbhop = CsBhopGame;
}
if (typeof SECTION_TITLES !== 'undefined') {
  SECTION_TITLES.csbhop = '🔪 CS:GO Bhop & Surf 3D';
}

if (typeof window !== 'undefined') {
  if (!window.CYBER_MODULES) window.CYBER_MODULES = {};
  if (!window.SECTION_TITLES) window.SECTION_TITLES = {};
  window.CYBER_MODULES.csbhop = CsBhopGame;
  window.SECTION_TITLES.csbhop = '🔪 CS:GO Bhop & Surf 3D';

  function bindCsBhopButtons() {
    if (!window.navigateTo) return;
    document.querySelectorAll('.nav-btn, [data-goto]').forEach(btn => {
      const sec = btn.dataset.section || btn.dataset.goto;
      if (sec === 'csbhop') {
        btn.onclick = () => window.navigateTo('csbhop');
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bindCsBhopButtons);
  } else {
    bindCsBhopButtons();
  }
}
