/* ============================================================================
   SCHOOL-FUN : PACK 25 JEUX DOPAMINE RUSH (ARCADE, RÉFLEXES & ADDICTION)
   ============================================================================ */
'use strict';

const DopamineAudio = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur = 0.08, type = 'square', vol = 0.06, slide = null) {
    try {
      const c = getCtx(), o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch(e){}
  }
  return {
    jump: () => tone(360, 0.09, 'square', 0.06, 720),
    score: () => { tone(540, 0.07, 'sine', 0.08); setTimeout(() => tone(840, 0.1, 'sine', 0.08), 60); },
    combo: () => { [480, 600, 720, 960].forEach((f, i) => setTimeout(() => tone(f, 0.08, 'sine', 0.08), i * 45)); },
    hit: () => tone(200, 0.07, 'triangle', 0.08, 90),
    boom: () => tone(130, 0.22, 'sawtooth', 0.1, 40),
    slice: () => tone(680, 0.05, 'sawtooth', 0.06, 220),
    coin: () => { tone(988, 0.06, 'sine', 0.08); setTimeout(() => tone(1318, 0.1, 'sine', 0.08), 50); },
    over: () => { tone(280, 0.14, 'sawtooth', 0.08, 140); setTimeout(() => tone(160, 0.24, 'sawtooth', 0.08, 70), 110); }
  };
})();

/* 1. NEON HIGHWAY 3D */
const HighwayGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let px, speed, nitro, score, over, traffic, pads, particles, floatingTexts, roadOffset;
  const W = 760, H = 480;

  function init() {
    cv = document.getElementById("canvas-highway");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_highway") || "0", 10);
    const rBtn = document.getElementById("highway-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "highway") {
        if (e.code === "Space") { nitro = true; e.preventDefault(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    window.addEventListener("keyup", e => {
      if (window.__activeCyberSection === "highway" && e.code === "Space") nitro = false;
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    px = 0; speed = 140; nitro = false; score = 0; over = false; roadOffset = 0;
    traffic = []; pads = []; particles = []; floatingTexts = [];
    for (let i = 0; i < 4; i++) spawnCar(200 + i * 250);
    for (let i = 0; i < 2; i++) spawnPad(300 + i * 400);
    updateHud();
  }

  function spawnCar(z) {
    const lane = Math.floor(Math.random() * 3) - 1;
    const colors = ["#ff007f", "#a855f7", "#ffea00", "#00f0ff"];
    traffic.push({
      lane, z: z || 1200,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 40 + Math.random() * 30
    });
  }

  function spawnPad(z) {
    const lane = Math.floor(Math.random() * 3) - 1;
    pads.push({ lane, z: z || 1400 });
  }

  function updateHud() {
    const sEl = document.getElementById("highway-score");
    if (sEl) sEl.textContent = Math.floor(score);
    const spEl = document.getElementById("highway-speed");
    if (spEl) spEl.textContent = Math.floor(speed);
    const bEl = document.getElementById("highway-best");
    if (bEl) bEl.textContent = Math.floor(best);
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    const targetSpeed = nitro ? 280 : 150 + Math.min(100, score / 40);
    speed += (targetSpeed - speed) * 0.08;
    score += (speed / 100);
    if (score > best) { best = score; localStorage.setItem("hf_best_highway", Math.floor(best).toString()); }

    if (window.CyberKeys && window.CyberKeys.left()) px -= 0.045;
    else if (window.CyberKeys && window.CyberKeys.right()) px += 0.045;
    px = Math.max(-1.1, Math.min(1.1, px));

    roadOffset = (roadOffset + speed * 0.1) % 60;

    for (let i = traffic.length - 1; i >= 0; i--) {
      const c = traffic[i];
      c.z -= (speed - c.speed) * 0.12;
      if (c.z > 20 && c.z < 85) {
        const laneDiff = Math.abs(px - c.lane * 0.85);
        if (laneDiff < 0.42) {
          over = true;
          DopamineAudio.boom();
          for (let p = 0; p < 35; p++) {
            particles.push({
              x: W / 2 + px * 220, y: H - 80,
              vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
              color: c.color, life: 1
            });
          }
        } else if (laneDiff < 0.7 && !c.nearMiss) {
          c.nearMiss = true;
          score += 150;
          DopamineAudio.score();
          floatingTexts.push({ text: "CLOSE CALL! +150", x: W / 2 + px * 200, y: H - 120, life: 1 });
        }
      }
      if (c.z < -50) {
        traffic.splice(i, 1);
        spawnCar(1200 + Math.random() * 300);
      }
    }

    for (let i = pads.length - 1; i >= 0; i--) {
      const p = pads[i];
      p.z -= speed * 0.12;
      if (p.z > 20 && p.z < 70 && Math.abs(px - p.lane * 0.85) < 0.45) {
        pads.splice(i, 1);
        score += 300;
        speed += 60;
        DopamineAudio.coin();
        floatingTexts.push({ text: "NITRO BOOST! +300", x: W / 2 + px * 200, y: H - 110, life: 1 });
        spawnPad(1400 + Math.random() * 400);
        continue;
      }
      if (p.z < -40) {
        pads.splice(i, 1);
        spawnPad(1300 + Math.random() * 500);
      }
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.025; });
    particles = particles.filter(p => p.life > 0);
    floatingTexts.forEach(ft => { ft.y -= 1.2; ft.life -= 0.02; });
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);

    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, "#0e0826");
    grad.addColorStop(1, "#3b0764");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 180);

    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ff007f";
    ctx.fillStyle = "#ff007f";
    ctx.beginPath();
    ctx.arc(W / 2, 120, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const vpX = W / 2, vpY = 160;
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(vpX - 40, vpY);
    ctx.lineTo(vpX + 40, vpY);
    ctx.lineTo(W - 40, H);
    ctx.lineTo(40, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.moveTo(vpX - 40, vpY); ctx.lineTo(40, H);
    ctx.moveTo(vpX + 40, vpY); ctx.lineTo(W - 40, H);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
    [-0.33, 0.33].forEach(off => {
      ctx.beginPath();
      ctx.moveTo(vpX + off * 40, vpY);
      ctx.lineTo(W / 2 + off * (W - 120), H);
      ctx.stroke();
    });

    pads.forEach(p => {
      const scale = 200 / (p.z + 100);
      const x = vpX + (p.lane * 0.85) * (scale * (W / 2 - 80));
      const y = vpY + (H - vpY) * (1 - (p.z / 1200));
      if (scale > 0 && y > vpY && y < H) {
        ctx.fillStyle = "#10b981";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#10b981";
        ctx.fillRect(x - 20 * scale, y - 6 * scale, 40 * scale, 12 * scale);
      }
    });

    traffic.forEach(c => {
      const scale = 200 / (c.z + 100);
      const x = vpX + (c.lane * 0.85) * (scale * (W / 2 - 80));
      const y = vpY + (H - vpY) * (1 - (c.z / 1200));
      if (scale > 0 && y > vpY && y < H) {
        ctx.fillStyle = c.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = c.color;
        const w = 46 * scale, h = 28 * scale;
        ctx.fillRect(x - w / 2, y - h, w, h);
      }
    });

    const pCarX = W / 2 + px * (W / 2 - 120);
    const pCarY = H - 65;
    ctx.shadowBlur = nitro ? 25 : 15;
    ctx.shadowColor = nitro ? "#00f0ff" : "#ff007f";
    ctx.fillStyle = nitro ? "#00f0ff" : "#ff007f";
    ctx.fillRect(pCarX - 32, pCarY, 64, 34);

    if (nitro) {
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(pCarX - 20, pCarY + 34, 8, 16 + Math.random() * 12);
      ctx.fillRect(pCarX + 12, pCarY + 34, 8, 16 + Math.random() * 12);
    }

    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    floatingTexts.forEach(ft => {
      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00f0ff";
      ctx.fillText(ft.text, ft.x, ft.y);
    });

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CRASH !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + Math.floor(score) + " km • Espace / R pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 2. NEON GRAVITY BALL */
const GravityBallGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let bx, by, bvx, bvy, plats, score, combo, over;
  const W = 500, H = 600;

  function init() {
    cv = document.getElementById("canvas-gravityball");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_gravityball") || "0", 10);
    const rBtn = document.getElementById("gravityball-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "gravityball" && e.code === "Space" && over) reset();
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    bx = W / 2; by = 120; bvx = 0; bvy = 0; score = 0; combo = 0; over = false;
    plats = [];
    for (let y = 200; y < H + 100; y += 85) plats.push(makePlat(y));
    updateHud();
  }

  function makePlat(y) {
    const gapW = 80;
    const gapX = 30 + Math.random() * (W - gapW - 60);
    return { y, gapX, gapW, passed: false };
  }

  function updateHud() {
    const sEl = document.getElementById("gravityball-score");
    if (sEl) sEl.textContent = Math.floor(score);
    const cEl = document.getElementById("gravityball-combo");
    if (cEl) cEl.textContent = "x" + (combo + 1);
    const bEl = document.getElementById("gravityball-best");
    if (bEl) bEl.textContent = Math.floor(best);
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    const scrollSpd = 2.4 + Math.min(3.5, score / 400);

    if (window.CyberKeys && window.CyberKeys.left()) bvx -= 0.65;
    else if (window.CyberKeys && window.CyberKeys.right()) bvx += 0.65;
    else bvx *= 0.84;
    bvx = Math.max(-6, Math.min(6, bvx));
    bx += bvx;
    if (bx < 15) { bx = 15; bvx = 0; }
    if (bx > W - 15) { bx = W - 15; bvx = 0; }

    bvy += 0.42;
    by += bvy;

    for (let i = 0; i < plats.length; i++) {
      const pl = plats[i];
      pl.y -= scrollSpd;

      if (by + 12 >= pl.y && by + 12 <= pl.y + 16 && bvy > 0) {
        if (bx < pl.gapX || bx > pl.gapX + pl.gapW) {
          by = pl.y - 12;
          bvy = 0;
          if (combo > 1) { score += combo * 50; DopamineAudio.combo(); }
          combo = 0;
        } else {
          if (!pl.passed) {
            pl.passed = true;
            combo++;
            score += 20 * combo;
            DopamineAudio.score();
          }
        }
      }
    }

    plats = plats.filter(pl => pl.y > -20);
    while (plats.length < 8) {
      const lastY = plats[plats.length - 1].y;
      plats.push(makePlat(lastY + 85));
    }

    if (by <= 20 || by >= H + 20) {
      over = true;
      DopamineAudio.boom();
    }

    if (score > best) { best = score; localStorage.setItem("hf_best_gravityball", Math.floor(best).toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ff0055";
    ctx.beginPath();
    for (let x = 0; x < W; x += 20) {
      ctx.lineTo(x + 10, 16);
      ctx.lineTo(x + 20, 0);
    }
    ctx.lineTo(0, 0);
    ctx.fill();

    plats.forEach(pl => {
      ctx.fillStyle = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00f0ff";
      ctx.fillRect(0, pl.y, pl.gapX, 12);
      ctx.fillRect(pl.gapX + pl.gapW, pl.y, W - (pl.gapX + pl.gapW), 12);
      ctx.fillStyle = "#ff007f";
      ctx.fillRect(pl.gapX - 2, pl.y, 4, 12);
      ctx.fillRect(pl.gapX + pl.gapW - 2, pl.y, 4, 12);
    });

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = combo > 2 ? "#ffea00" : "#ff007f";
    ctx.fillStyle = combo > 2 ? "#ffea00" : "#ff007f";
    ctx.beginPath();
    ctx.arc(bx, by, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ÉCRASÉ !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + Math.floor(score) + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 3. HYPER HEXAGON */
const HexagonGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let angle, walls, time, over;
  const W = 560, H = 560;

  function init() {
    cv = document.getElementById("canvas-hexagon");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseFloat(localStorage.getItem("hf_best_hexagon") || "0");
    const rBtn = document.getElementById("hexagon-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "hexagon" && e.code === "Space" && over) reset();
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    angle = 0; walls = []; time = 0; over = false;
    spawnWall(280); spawnWall(420);
    updateHud();
  }

  function spawnWall(dist) {
    const openSide = Math.floor(Math.random() * 6);
    walls.push({ dist: dist || 320, openSide, speed: 2.5 + Math.min(3, time / 20) });
  }

  function updateHud() {
    const tEl = document.getElementById("hexagon-time");
    if (tEl) tEl.textContent = time.toFixed(1) + "s";
    const rEl = document.getElementById("hexagon-rank");
    if (rEl) {
      if (time > 60) rEl.textContent = "HEXAGON MASTER";
      else if (time > 45) rEl.textContent = "PENTAGON";
      else if (time > 30) rEl.textContent = "SQUARE";
      else if (time > 15) rEl.textContent = "TRIANGLE";
      else if (time > 5) rEl.textContent = "LINE";
      else rEl.textContent = "POINT";
    }
    const bEl = document.getElementById("hexagon-best");
    if (bEl) bEl.textContent = best.toFixed(1) + "s";
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    time += 1 / 60;
    if (time > best) { best = time; localStorage.setItem("hf_best_hexagon", best.toFixed(1)); }

    if (window.CyberKeys && window.CyberKeys.left()) angle -= 0.08;
    else if (window.CyberKeys && window.CyberKeys.right()) angle += 0.08;

    for (let i = walls.length - 1; i >= 0; i--) {
      const w = walls[i];
      w.dist -= w.speed;
      if (w.dist > 34 && w.dist < 50) {
        let normA = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let side = Math.floor(normA / (Math.PI / 3));
        if (side !== w.openSide) {
          over = true;
          DopamineAudio.boom();
        }
      }
      if (w.dist < 20) {
        walls.splice(i, 1);
        spawnWall(340);
        DopamineAudio.score();
      }
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#0a071b";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.5);

    walls.forEach(w => {
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#ff007f";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff007f";
      for (let s = 0; s < 6; s++) {
        if (s === w.openSide) continue;
        const a1 = s * (Math.PI / 3);
        const a2 = (s + 1) * (Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1) * w.dist, Math.sin(a1) * w.dist);
        ctx.lineTo(Math.cos(a2) * w.dist, Math.sin(a2) * w.dist);
        ctx.stroke();
      }
    });

    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * (Math.PI / 3);
      const x = Math.cos(a) * 26, y = Math.sin(a) * 26;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.rotate(angle);
    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ffea00";
    ctx.beginPath();
    ctx.moveTo(42, 0); ctx.lineTo(34, -7); ctx.lineTo(34, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Temps : " + time.toFixed(1) + "s • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 4. CYBER KNIFE HIT */
const KnifeHitGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let wheelAngle, rotSpeed, stuckKnives, knivesLeft, stage, flyingKnife, over;
  const W = 500, H = 580;

  function init() {
    cv = document.getElementById("canvas-knifehit");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_knifehit") || "1", 10);
    const rBtn = document.getElementById("knifehit-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "knifehit") {
        if (e.code === "Space") { e.preventDefault(); throwKnife(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = throwKnife;
    reset();
  }

  function reset() {
    wheelAngle = 0; rotSpeed = 0.035; stuckKnives = []; knivesLeft = 7;
    stage = 1; flyingKnife = null; over = false;
    updateHud();
  }

  function throwKnife() {
    if (over) { reset(); return; }
    if (flyingKnife || knivesLeft <= 0) return;
    flyingKnife = { y: H - 80, speed: 28 };
    knivesLeft--;
    DopamineAudio.jump();
    updateHud();
  }

  function updateHud() {
    const kEl = document.getElementById("knifehit-knives");
    if (kEl) kEl.textContent = knivesLeft;
    const sEl = document.getElementById("knifehit-stage");
    if (sEl) sEl.textContent = stage;
    const bEl = document.getElementById("knifehit-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    wheelAngle += rotSpeed;

    if (flyingKnife) {
      flyingKnife.y -= flyingKnife.speed;
      if (flyingKnife.y <= 170) {
        const hitAngle = (-wheelAngle + Math.PI / 2) % (Math.PI * 2);
        let clash = false;
        stuckKnives.forEach(a => {
          let diff = Math.abs((hitAngle - a + Math.PI * 2) % (Math.PI * 2));
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 0.22) clash = true;
        });

        if (clash) {
          over = true;
          DopamineAudio.boom();
        } else {
          stuckKnives.push(hitAngle);
          DopamineAudio.hit();
          flyingKnife = null;
          if (knivesLeft === 0) {
            stage++;
            DopamineAudio.combo();
            if (stage > best) { best = stage; localStorage.setItem("hf_best_knifehit", best.toString()); }
            stuckKnives = [];
            knivesLeft = 7 + Math.min(5, stage);
            rotSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.035 + Math.min(0.04, stage * 0.005));
          }
        }
      }
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#080b16";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = 170, R = 75;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wheelAngle);

    ctx.fillStyle = "#1e1b4b";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    stuckKnives.forEach(a => {
      ctx.save();
      ctx.rotate(a - Math.PI / 2);
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(-4, R, 8, 45);
      ctx.fillStyle = "#ff007f";
      ctx.fillRect(-7, R + 30, 14, 15);
      ctx.restore();
    });
    ctx.restore();

    if (flyingKnife) {
      ctx.fillStyle = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00f0ff";
      ctx.fillRect(cx - 4, flyingKnife.y, 8, 45);
      ctx.fillStyle = "#ff007f";
      ctx.fillRect(cx - 7, flyingKnife.y + 30, 14, 15);
    }

    if (!flyingKnife && knivesLeft > 0) {
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(cx - 4, H - 90, 8, 45);
      ctx.fillStyle = "#ff007f";
      ctx.fillRect(cx - 7, H - 60, 14, 15);
    }

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LAME PERCUTÉE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Étage atteint : " + stage + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 5. COLOR SWITCH NEON */
const ColorSwitchGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let by, bvy, colorIdx, score, over, rings, swappers, camY;
  const W = 460, H = 640;
  const COLORS = ["#00f0ff", "#ff007f", "#ffea00", "#a855f7"];

  function init() {
    cv = document.getElementById("canvas-colorswitch");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_colorswitch") || "0", 10);
    const rBtn = document.getElementById("colorswitch-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "colorswitch") {
        if (e.code === "Space") { e.preventDefault(); bounce(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = bounce;
    reset();
  }

  function bounce() {
    if (over) { reset(); return; }
    bvy = -7.2;
    DopamineAudio.jump();
  }

  function reset() {
    by = H - 120; bvy = 0; colorIdx = 0; score = 0; over = false; camY = 0;
    rings = []; swappers = [];
    for (let y = H - 280; y > -1000; y -= 240) {
      rings.push({ y, angle: 0, rotSpd: 0.03, passed: false });
      swappers.push({ y: y - 120, passed: false });
    }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("colorswitch-score");
    if (sEl) sEl.textContent = score;
    const bEl = document.getElementById("colorswitch-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    bvy += 0.32;
    by += bvy;

    const targetCam = Math.max(0, (H / 2) - by);
    camY += (targetCam - camY) * 0.1;

    rings.forEach(r => {
      r.angle += r.rotSpd;
      const screenY = r.y + camY;
      const ballScreenY = by + camY;

      [screenY + 65, screenY - 65].forEach(boundaryY => {
        if (Math.abs(ballScreenY - boundaryY) < 10) {
          const hitAngle = (Math.PI / 2 - r.angle + Math.PI * 2) % (Math.PI * 2);
          const seg = Math.floor(hitAngle / (Math.PI / 2));
          if (seg !== colorIdx) {
            over = true;
            DopamineAudio.boom();
          }
        }
      });

      if (!r.passed && by < r.y) {
        r.passed = true;
        score++;
        DopamineAudio.score();
        if (score > best) { best = score; localStorage.setItem("hf_best_colorswitch", best.toString()); }
      }
    });

    swappers.forEach(sw => {
      if (!sw.passed && Math.abs(by - sw.y) < 18) {
        sw.passed = true;
        colorIdx = (colorIdx + 1 + Math.floor(Math.random() * 3)) % 4;
        DopamineAudio.combo();
      }
    });

    rings = rings.filter(r => r.y + camY < H + 100);
    while (rings.length < 5) {
      const minY = Math.min(...rings.map(r => r.y));
      rings.push({ y: minY - 240, angle: 0, rotSpd: (Math.random() > 0.5 ? 1 : -1) * 0.03, passed: false });
      swappers.push({ y: minY - 360, passed: false });
    }

    if (by + camY > H + 50) {
      over = true;
      DopamineAudio.boom();
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#090916";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;

    rings.forEach(r => {
      const ry = r.y + camY;
      ctx.save();
      ctx.translate(cx, ry);
      ctx.rotate(r.angle);
      ctx.lineWidth = 14;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = COLORS[i];
        ctx.shadowBlur = 12;
        ctx.shadowColor = COLORS[i];
        ctx.beginPath();
        ctx.arc(0, 0, 65, i * (Math.PI / 2), (i + 1) * (Math.PI / 2));
        ctx.stroke();
      }
      ctx.restore();
    });

    swappers.forEach(sw => {
      if (sw.passed) return;
      const sy = sw.y + camY;
      ctx.save();
      ctx.translate(cx, sy);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#fff";
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = COLORS[colorIdx];
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS[colorIdx];
    ctx.beginPath();
    ctx.arc(cx, by + camY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COULEUR INCOMPATIBLE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 6. HELIX JUMP NEON */
const HelixGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let ballY, bvy, towerRot, floors, score, level, fireball, over, streak;
  const W = 500, H = 620;

  function init() {
    cv = document.getElementById("canvas-helix");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_helix") || "0", 10);
    const rBtn = document.getElementById("helix-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "helix" && e.code === "Space" && over) reset();
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    ballY = 160; bvy = 0; towerRot = 0; score = 0; level = 1;
    fireball = false; over = false; streak = 0;
    floors = [];
    for (let i = 0; i < 12; i++) floors.push(makeFloor(300 + i * 110));
    updateHud();
  }

  function makeFloor(y) {
    const gapAngle = Math.random() * Math.PI * 2;
    const redAngle = (gapAngle + Math.PI) % (Math.PI * 2);
    return { y, gapAngle, redAngle, passed: false };
  }

  function updateHud() {
    const sEl = document.getElementById("helix-score");
    if (sEl) sEl.textContent = score;
    const lEl = document.getElementById("helix-level");
    if (lEl) lEl.textContent = level;
    const bEl = document.getElementById("helix-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    if (window.CyberKeys && window.CyberKeys.left()) towerRot -= 0.055;
    else if (window.CyberKeys && window.CyberKeys.right()) towerRot += 0.055;

    bvy += 0.42;
    ballY += bvy;

    floors.forEach(f => {
      if (ballY >= f.y - 12 && ballY <= f.y + 12 && bvy > 0) {
        let relAngle = (Math.PI / 2 - towerRot - f.gapAngle + Math.PI * 4) % (Math.PI * 2);
        if (relAngle > 0.4 && relAngle < Math.PI * 2 - 0.4) {
          let relRed = (Math.PI / 2 - towerRot - f.redAngle + Math.PI * 4) % (Math.PI * 2);
          if (relRed < 0.6 || relRed > Math.PI * 2 - 0.6) {
            if (!fireball) {
              over = true;
              DopamineAudio.boom();
              return;
            }
          }
          bvy = -8.5;
          streak = 0;
          fireball = false;
          DopamineAudio.hit();
        } else {
          if (!f.passed) {
            f.passed = true;
            streak++;
            score += 10 * streak;
            DopamineAudio.score();
            if (streak >= 3) {
              fireball = true;
              DopamineAudio.combo();
            }
            if (score > best) { best = score; localStorage.setItem("hf_best_helix", best.toString()); }
          }
        }
      }
    });

    if (ballY > 260) {
      const diff = ballY - 260;
      ballY = 260;
      floors.forEach(f => f.y -= diff);
    }

    floors = floors.filter(f => f.y > 60);
    while (floors.length < 12) {
      const lastY = floors[floors.length - 1].y;
      floors.push(makeFloor(lastY + 110));
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070815";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;

    ctx.fillStyle = "#1e1e38";
    ctx.fillRect(cx - 30, 0, 60, H);

    floors.forEach(f => {
      ctx.save();
      ctx.translate(cx, f.y);
      ctx.scale(1, 0.35);

      ctx.lineWidth = 26;
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(0, 0, 110, towerRot + f.gapAngle + 0.4, towerRot + f.gapAngle + Math.PI * 2 - 0.4);
      ctx.stroke();

      ctx.strokeStyle = "#ff0055";
      ctx.beginPath();
      ctx.arc(0, 0, 110, towerRot + f.redAngle - 0.5, towerRot + f.redAngle + 0.5);
      ctx.stroke();

      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = fireball ? "#ffea00" : "#00f0ff";
    ctx.shadowBlur = fireball ? 25 : 15;
    ctx.shadowColor = fireball ? "#ffea00" : "#00f0ff";
    ctx.beginPath();
    ctx.arc(cx, ballY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ZONE ROUGE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 7. BALL BLAST CANNON */
const BallBlastGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let cx, bullets, rocks, score, coins, over;
  const W = 640, H = 540;

  function init() {
    cv = document.getElementById("canvas-ballblast");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_ballblast") || "0", 10);
    const rBtn = document.getElementById("ballblast-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "ballblast" && e.code === "Space" && over) reset();
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    cx = W / 2; bullets = []; rocks = []; score = 0; coins = 0; over = false;
    spawnRock(W / 4, 30);
    spawnRock(3 * W / 4, 45);
    updateHud();
  }

  function spawnRock(x, hp, r = 36) {
    const colors = ["#ff007f", "#00f0ff", "#ffea00", "#a855f7"];
    rocks.push({
      x: x || Math.random() * (W - 100) + 50,
      y: 90,
      vx: (Math.random() > 0.5 ? 1 : -1) * 2.8,
      vy: 0,
      r,
      hp: hp || 25,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function updateHud() {
    const sEl = document.getElementById("ballblast-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("ballblast-coins");
    if (cEl) cEl.textContent = coins;
    const bEl = document.getElementById("ballblast-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    if (window.CyberKeys && window.CyberKeys.left()) cx -= 6;
    else if (window.CyberKeys && window.CyberKeys.right()) cx += 6;
    cx = Math.max(30, Math.min(W - 30, cx));

    if (Math.random() < 0.38) {
      bullets.push({ x: cx - 10, y: H - 55 }, { x: cx + 10, y: H - 55 });
      DopamineAudio.jump();
    }

    bullets.forEach(b => b.y -= 14);
    bullets = bullets.filter(b => b.y > 0);

    for (let rIdx = rocks.length - 1; rIdx >= 0; rIdx--) {
      const r = rocks[rIdx];
      r.vy += 0.28;
      r.x += r.vx;
      r.y += r.vy;

      if (r.x < r.r || r.x > W - r.r) r.vx *= -1;
      if (r.y > H - 50 - r.r) { r.y = H - 50 - r.r; r.vy = -11.5; }

      if (Math.abs(r.x - cx) < r.r + 20 && r.y > H - 85) {
        over = true;
        DopamineAudio.boom();
      }

      for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        const b = bullets[bIdx];
        const dist = Math.hypot(r.x - b.x, r.y - b.y);
        if (dist < r.r) {
          bullets.splice(bIdx, 1);
          r.hp--;
          score += 5;
          DopamineAudio.hit();
          if (r.hp <= 0) {
            DopamineAudio.boom();
            coins += 10;
            score += 100;
            if (r.r > 20) {
              spawnRock(r.x - 15, 15, r.r * 0.7);
              spawnRock(r.x + 15, 15, r.r * 0.7);
            }
            rocks.splice(rIdx, 1);
            break;
          }
        }
      }
    }

    if (rocks.length === 0) {
      spawnRock(W / 3, 35 + Math.floor(score / 50));
      spawnRock(2 * W / 3, 50 + Math.floor(score / 50));
    }

    if (score > best) { best = score; localStorage.setItem("hf_best_ballblast", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00f0ff";
    ctx.fillRect(cx - 24, H - 45, 48, 25);
    ctx.fillRect(cx - 8, H - 65, 16, 20);

    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffea00";
    bullets.forEach(b => ctx.fillRect(b.x - 3, b.y, 6, 12));

    rocks.forEach(r => {
      ctx.fillStyle = r.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.max(12, Math.floor(r.r * 0.7)) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur = 0;
      ctx.fillText(r.hp, r.x, r.y);
    });

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CANNON DÉTRUIT !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 8. STACK TOWER 3D */
const StackTowerGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let stack, current, score, combo, over, camY;
  const W = 520, H = 600;

  function init() {
    cv = document.getElementById("canvas-stacktower");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_stacktower") || "0", 10);
    const rBtn = document.getElementById("stacktower-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "stacktower") {
        if (e.code === "Space") { e.preventDefault(); drop(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = drop;
    reset();
  }

  function drop() {
    if (over) { reset(); return; }
    const top = stack[stack.length - 1];
    const diff = current.x - top.x;
    if (Math.abs(diff) < 4) {
      current.x = top.x;
      combo++;
      score += 10 * combo;
      DopamineAudio.combo();
    } else if (Math.abs(diff) < current.w) {
      current.w -= Math.abs(diff);
      if (diff > 0) current.x = top.x + diff / 2;
      else current.x = top.x - Math.abs(diff) / 2;
      combo = 0;
      score += 10;
      DopamineAudio.score();
    } else {
      over = true;
      DopamineAudio.boom();
      return;
    }

    stack.push({ x: current.x, y: current.y, w: current.w, color: current.color });
    if (score > best) { best = score; localStorage.setItem("hf_best_stacktower", best.toString()); }

    const colors = ["#00f0ff", "#ff007f", "#ffea00", "#a855f7", "#10b981"];
    current = {
      x: -current.w,
      y: current.y - 24,
      w: current.w,
      vx: 3.5 + Math.min(3, score / 100),
      color: colors[stack.length % colors.length]
    };
    updateHud();
  }

  function reset() {
    score = 0; combo = 0; over = false; camY = 0;
    stack = [{ x: W / 2 - 90, y: H - 120, w: 180, color: "#00f0ff" }];
    current = { x: -180, y: H - 144, w: 180, vx: 3.8, color: "#ff007f" };
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("stacktower-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("stacktower-combo");
    if (cEl) cEl.textContent = "x" + (combo + 1);
    const bEl = document.getElementById("stacktower-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    current.x += current.vx;
    if (current.x > W - current.w || current.x < 0) current.vx *= -1;

    const targetCam = Math.max(0, (H / 2) - current.y);
    camY += (targetCam - camY) * 0.1;
  }

  function draw() {
    ctx.fillStyle = "#08091a";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(0, camY);

    stack.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.fillRect(b.x, b.y, b.w, 22);
    });

    if (!over) {
      ctx.fillStyle = current.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = current.color;
      ctx.fillRect(current.x, current.y, current.w, 22);
    }
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TOUR EFFONDRÉE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 9. CYBER TIMBER CHOPPER */
const TimberGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let playerSide, branches, score, energy, over;
  const W = 500, H = 600;

  function init() {
    cv = document.getElementById("canvas-timber");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_timber") || "0", 10);
    const rBtn = document.getElementById("timber-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "timber") {
        if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); chop("left"); }
        if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); chop("right"); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = (e) => {
      const rect = cv.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      chop(clickX < W / 2 ? "left" : "right");
    };
    reset();
  }

  function reset() {
    playerSide = "left"; score = 0; energy = 100; over = false;
    branches = ["none", "none", "none"];
    for (let i = 0; i < 6; i++) spawnBranch();
    updateHud();
  }

  function spawnBranch() {
    const r = Math.random();
    if (r < 0.4) branches.push("left");
    else if (r < 0.8) branches.push("right");
    else branches.push("none");
  }

  function chop(side) {
    if (over) { reset(); return; }
    playerSide = side;
    branches.shift();
    spawnBranch();
    score++;
    energy = Math.min(100, energy + 8);
    DopamineAudio.slice();

    if (branches[0] === playerSide) {
      over = true;
      DopamineAudio.boom();
    }
    if (score > best) { best = score; localStorage.setItem("hf_best_timber", best.toString()); }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("timber-score");
    if (sEl) sEl.textContent = score;
    const eEl = document.getElementById("timber-energy");
    if (eEl) eEl.textContent = Math.floor(energy) + "%";
    const bEl = document.getElementById("timber-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    energy -= 0.65 + Math.min(1.2, score / 80);
    if (energy <= 0) {
      over = true;
      DopamineAudio.over();
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#090818";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;

    ctx.fillStyle = "#222";
    ctx.fillRect(W / 2 - 120, 25, 240, 14);
    ctx.fillStyle = energy > 30 ? "#10b981" : "#ff0055";
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(W / 2 - 120, 25, (energy / 100) * 240, 14);

    ctx.fillStyle = "#1e1b4b";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 4;
    ctx.fillRect(cx - 45, 0, 90, H);
    ctx.strokeRect(cx - 45, 0, 90, H);

    branches.forEach((b, i) => {
      const y = H - 120 - i * 65;
      if (b === "left") {
        ctx.fillStyle = "#ff007f";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff007f";
        ctx.fillRect(cx - 150, y, 105, 26);
      } else if (b === "right") {
        ctx.fillStyle = "#ff007f";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff007f";
        ctx.fillRect(cx + 45, y, 105, 26);
      }
    });

    const px = playerSide === "left" ? cx - 110 : cx + 70;
    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffea00";
    ctx.fillRect(px, H - 130, 40, 50);

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(energy <= 0 ? "ÉNERGIE ÉPUISÉE !" : "ÉCRASÉ PAR LA BRANCHE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Clic / Gauche/Droite pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 10. FLAPPY DUNK HOOPS */
const FlappyDunkGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let by, bvy, hoops, score, combo, over;
  const W = 640, H = 500;

  function init() {
    cv = document.getElementById("canvas-flappydunk");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_flappydunk") || "0", 10);
    const rBtn = document.getElementById("flappydunk-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "flappydunk") {
        if (e.code === "Space") { e.preventDefault(); flap(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = flap;
    reset();
  }

  function flap() {
    if (over) { reset(); return; }
    bvy = -7.4;
    DopamineAudio.jump();
  }

  function reset() {
    by = H / 2; bvy = 0; score = 0; combo = 0; over = false;
    hoops = [makeHoop(W + 60), makeHoop(W + 340)];
    updateHud();
  }

  function makeHoop(x) {
    return { x, y: 120 + Math.random() * (H - 240), w: 64, passed: false };
  }

  function updateHud() {
    const sEl = document.getElementById("flappydunk-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("flappydunk-combo");
    if (cEl) cEl.textContent = "x" + (combo + 1);
    const bEl = document.getElementById("flappydunk-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    bvy += 0.38;
    by += bvy;

    hoops.forEach(h => {
      h.x -= 3.2;
      if (!h.passed && 160 > h.x && 160 < h.x + h.w) {
        if (Math.abs(by - h.y) < 26) {
          h.passed = true;
          combo++;
          score += combo;
          DopamineAudio.coin();
          if (score > best) { best = score; localStorage.setItem("hf_best_flappydunk", best.toString()); }
        }
      }
    });

    if (hoops[0].x < -80) {
      hoops.shift();
      hoops.push(makeHoop(hoops[hoops.length - 1].x + 280));
    }

    if (by < 12 || by > H - 12) {
      over = true;
      DopamineAudio.boom();
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#0a071c";
    ctx.fillRect(0, 0, W, H);

    hoops.forEach(h => {
      ctx.strokeStyle = "#ff007f";
      ctx.lineWidth = 6;
      ctx.shadowBlur = 14;
      ctx.shadowColor = "#ff007f";
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, h.y, h.w / 2, 14, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + 12, h.y + 30);
      ctx.moveTo(h.x + h.w, h.y); ctx.lineTo(h.x + h.w - 12, h.y + 30);
      ctx.lineTo(h.x + 12, h.y + 30);
      ctx.stroke();
    });

    ctx.save();
    ctx.translate(160, by);
    ctx.fillStyle = "#ff7700";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff7700";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.ellipse(-14, -6, 12, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CHUTE DU BALLON !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 11. BREAKOUT 360 RING */
const Breakout360Game = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let padAngle, bx, by, bvx, bvy, bricks, score, combo, over;
  const W = 560, H = 560, R = 230;

  function init() {
    cv = document.getElementById("canvas-breakout360");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_breakout360") || "0", 10);
    const rBtn = document.getElementById("breakout360-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "breakout360" && e.code === "Space" && over) reset();
    });
    cv.onmousemove = e => {
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left - W / 2;
      const my = e.clientY - rect.top - H / 2;
      padAngle = Math.atan2(my, mx);
    };
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    padAngle = 0; bx = 0; by = 0; bvx = 3.2; bvy = 2.8; score = 0; combo = 0; over = false;
    bricks = [];
    const colors = ["#00f0ff", "#ff007f", "#ffea00", "#a855f7"];
    for (let ring = 0; ring < 3; ring++) {
      const radius = 90 + ring * 35;
      const count = 12 + ring * 6;
      for (let i = 0; i < count; i++) {
        bricks.push({
          angle: (i / count) * Math.PI * 2,
          radius,
          color: colors[ring % colors.length],
          alive: true
        });
      }
    }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("breakout360-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("breakout360-combo");
    if (cEl) cEl.textContent = "x" + (combo + 1);
    const bEl = document.getElementById("breakout360-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    bx += bvx; by += bvy;
    const bDist = Math.hypot(bx, by);

    bricks.forEach(br => {
      if (!br.alive) return;
      const brX = Math.cos(br.angle) * br.radius;
      const brY = Math.sin(br.angle) * br.radius;
      if (Math.hypot(bx - brX, by - brY) < 18) {
        br.alive = false;
        bvx *= -1.02; bvy *= -1.02;
        combo++;
        score += 10 * combo;
        DopamineAudio.hit();
        if (score > best) { best = score; localStorage.setItem("hf_best_breakout360", best.toString()); }
      }
    });

    if (bDist >= R - 14) {
      const ballAngle = Math.atan2(by, bx);
      let diff = Math.abs((ballAngle - padAngle + Math.PI * 4) % (Math.PI * 2));
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      if (diff < 0.32) {
        const normalX = bx / bDist;
        const normalY = by / bDist;
        const dot = bvx * normalX + bvy * normalY;
        bvx -= 2 * dot * normalX;
        bvy -= 2 * dot * normalY;
        DopamineAudio.jump();
      } else if (bDist >= R + 10) {
        over = true;
        DopamineAudio.boom();
      }
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070815";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ffea00";
    ctx.lineWidth = 10;
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ffea00";
    ctx.beginPath();
    ctx.arc(0, 0, R, padAngle - 0.3, padAngle + 0.3);
    ctx.stroke();

    bricks.forEach(br => {
      if (!br.alive) return;
      ctx.fillStyle = br.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = br.color;
      ctx.beginPath();
      ctx.arc(Math.cos(br.angle) * br.radius, Math.sin(br.angle) * br.radius, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BALLE ÉCHAPPÉE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 12. ASTEROIDS NEON BLASTER */
const AsteroidsGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let ship, roids, lasers, score, wave, over;
  const W = 720, H = 480;

  function init() {
    cv = document.getElementById("canvas-asteroids");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_asteroids") || "0", 10);
    const rBtn = document.getElementById("asteroids-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "asteroids") {
        if (e.code === "Space") { e.preventDefault(); fire(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = () => { if (over) reset(); else fire(); };
    reset();
  }

  function reset() {
    ship = { x: W / 2, y: H / 2, r: 14, angle: -Math.PI / 2, vx: 0, vy: 0 };
    roids = []; lasers = []; score = 0; wave = 1; over = false;
    for (let i = 0; i < 5; i++) spawnRoid();
    updateHud();
  }

  function spawnRoid(x, y, r = 38) {
    roids.push({
      x: x || (Math.random() < 0.5 ? 20 : W - 20),
      y: y || Math.random() * H,
      r,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3
    });
  }

  function fire() {
    if (over) return;
    lasers.push({
      x: ship.x + Math.cos(ship.angle) * 16,
      y: ship.y + Math.sin(ship.angle) * 16,
      vx: Math.cos(ship.angle) * 12,
      vy: Math.sin(ship.angle) * 12,
      life: 45
    });
    DopamineAudio.jump();
  }

  function updateHud() {
    const sEl = document.getElementById("asteroids-score");
    if (sEl) sEl.textContent = score;
    const wEl = document.getElementById("asteroids-wave");
    if (wEl) wEl.textContent = wave;
    const bEl = document.getElementById("asteroids-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    if (window.CyberKeys && window.CyberKeys.left()) ship.angle -= 0.07;
    if (window.CyberKeys && window.CyberKeys.right()) ship.angle += 0.07;
    if (window.CyberKeys && window.CyberKeys.up()) {
      ship.vx += Math.cos(ship.angle) * 0.22;
      ship.vy += Math.sin(ship.angle) * 0.22;
    }
    ship.vx *= 0.98; ship.vy *= 0.98;
    ship.x = (ship.x + ship.vx + W) % W;
    ship.y = (ship.y + ship.vy + H) % H;

    for (let l = lasers.length - 1; l >= 0; l--) {
      const laser = lasers[l];
      laser.x = (laser.x + laser.vx + W) % W;
      laser.y = (laser.y + laser.vy + H) % H;
      laser.life--;
      if (laser.life <= 0) { lasers.splice(l, 1); continue; }

      for (let r = roids.length - 1; r >= 0; r--) {
        const roid = roids[r];
        if (Math.hypot(laser.x - roid.x, laser.y - roid.y) < roid.r) {
          lasers.splice(l, 1);
          score += Math.floor(100 / roid.r * 10);
          DopamineAudio.boom();
          if (roid.r > 20) {
            spawnRoid(roid.x, roid.y, roid.r / 2);
            spawnRoid(roid.x, roid.y, roid.r / 2);
          }
          roids.splice(r, 1);
          break;
        }
      }
    }

    roids.forEach(r => {
      r.x = (r.x + r.vx + W) % W;
      r.y = (r.y + r.vy + H) % H;
      if (Math.hypot(ship.x - r.x, ship.y - r.y) < ship.r + r.r - 4) {
        over = true;
        DopamineAudio.boom();
      }
    });

    if (roids.length === 0) {
      wave++;
      DopamineAudio.combo();
      for (let i = 0; i < 4 + wave; i++) spawnRoid();
    }

    if (score > best) { best = score; localStorage.setItem("hf_best_asteroids", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#060714";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-12, -10); ctx.lineTo(-6, 0); ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffea00";
    lasers.forEach(l => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "#ff007f";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff007f";
    roids.forEach(r => {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VAISSEAU DÉTRUIT !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 13. TAP TAP ZIGZAG */
const ZigzagGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let bx, by, dir, path, gems, score, gemsCollected, speed, over, camY;
  const W = 520, H = 600;

  function init() {
    cv = document.getElementById("canvas-zigzag");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_zigzag") || "0", 10);
    const rBtn = document.getElementById("zigzag-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "zigzag") {
        if (e.code === "Space") { e.preventDefault(); turn(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = turn;
    reset();
  }

  function turn() {
    if (over) { reset(); return; }
    dir = dir === "NE" ? "NW" : "NE";
    DopamineAudio.jump();
  }

  function reset() {
    bx = W / 2; by = H - 140; dir = "NE"; score = 0; gemsCollected = 0; speed = 3.8;
    over = false; camY = 0; path = []; gems = [];
    let curX = W / 2, curY = H - 140;
    path.push({ x: curX, y: curY });
    for (let i = 0; i < 28; i++) {
      const stepDir = Math.random() < 0.5 ? -1 : 1;
      curX += stepDir * 30;
      curY -= 30;
      path.push({ x: curX, y: curY });
      if (Math.random() < 0.3) gems.push({ x: curX, y: curY, collected: false });
    }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("zigzag-score");
    if (sEl) sEl.textContent = score;
    const gEl = document.getElementById("zigzag-gems");
    if (gEl) gEl.textContent = gemsCollected;
    const bEl = document.getElementById("zigzag-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    speed = 3.8 + Math.min(3, score / 60);
    if (dir === "NE") { bx += speed * 0.7; by -= speed * 0.7; }
    else { bx -= speed * 0.7; by -= speed * 0.7; }
    score++;

    let onPath = false;
    path.forEach(pt => {
      if (Math.hypot(bx - pt.x, by - pt.y) < 28) onPath = true;
    });

    if (!onPath) {
      over = true;
      DopamineAudio.boom();
    }

    gems.forEach(g => {
      if (!g.collected && Math.hypot(bx - g.x, by - g.y) < 22) {
        g.collected = true;
        gemsCollected++;
        score += 25;
        DopamineAudio.coin();
      }
    });

    const targetCam = (H / 2) - by;
    camY += (targetCam - camY) * 0.15;

    while (path[path.length - 1].y + camY > -200) {
      const last = path[path.length - 1];
      const stepDir = Math.random() < 0.5 ? -1 : 1;
      const nextX = last.x + stepDir * 30;
      const nextY = last.y - 30;
      path.push({ x: nextX, y: nextY });
      if (Math.random() < 0.25) gems.push({ x: nextX, y: nextY, collected: false });
    }

    if (score > best) { best = score; localStorage.setItem("hf_best_zigzag", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#080718";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(0, camY);

    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 36;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    path.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f0ff";
    ctx.stroke();

    gems.forEach(g => {
      if (g.collected) return;
      ctx.fillStyle = "#ff007f";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff007f";
      ctx.beginPath();
      ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffea00";
    ctx.beginPath();
    ctx.arc(bx, by, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CHUTE DU VIDE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 14. BULLET HELL GRAZING */
const BulletHellGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let px, py, bullets, score, hyper, over, timer;
  const W = 640, H = 540;

  function init() {
    cv = document.getElementById("canvas-bullethell");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_bullethell") || "0", 10);
    const rBtn = document.getElementById("bullethell-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "bullethell") {
        if (e.code === "Space" && hyper >= 100) { e.preventDefault(); unleashHyper(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onmousemove = e => {
      const rect = cv.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
    };
    cv.onclick = () => { if (over) reset(); else if (hyper >= 100) unleashHyper(); };
    reset();
  }

  function unleashHyper() {
    hyper = 0;
    bullets = [];
    score += 500;
    DopamineAudio.combo();
    updateHud();
  }

  function reset() {
    px = W / 2; py = H - 80; bullets = []; score = 0; hyper = 0; over = false; timer = 0;
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("bullethell-score");
    if (sEl) sEl.textContent = score;
    const hEl = document.getElementById("bullethell-hyper");
    if (hEl) hEl.textContent = Math.floor(hyper) + "%";
    const bEl = document.getElementById("bullethell-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    timer++;
    score++;

    if (window.CyberKeys && window.CyberKeys.left()) px -= 5;
    if (window.CyberKeys && window.CyberKeys.right()) px += 5;
    if (window.CyberKeys && window.CyberKeys.up()) py -= 5;
    if (window.CyberKeys && window.CyberKeys.down()) py += 5;
    px = Math.max(15, Math.min(W - 15, px));
    py = Math.max(15, Math.min(H - 15, py));

    if (timer % 12 === 0) {
      const angle = (timer * 0.12) % (Math.PI * 2);
      for (let s = 0; s < 4; s++) {
        const a = angle + s * (Math.PI / 2);
        bullets.push({
          x: W / 2, y: 120,
          vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4,
          color: "#ff007f"
        });
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy;
      const dist = Math.hypot(px - b.x, py - b.y);
      if (dist < 6) {
        over = true;
        DopamineAudio.boom();
      } else if (dist < 22 && !b.grazed) {
        b.grazed = true;
        score += 20;
        hyper = Math.min(100, hyper + 5);
        DopamineAudio.jump();
      }
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) bullets.splice(i, 1);
    }

    if (score > best) { best = score; localStorage.setItem("hf_best_bullethell", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#080614";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(W / 2, 120, 24, 0, Math.PI * 2);
    ctx.fill();

    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 22, 0, Math.PI * 2);
    ctx.stroke();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("IMPACT DE PROJECTILE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 15. CYBER CROSSY ROAD */
const CrossyCyberGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let py, px, lanes, score, dist, over, camY;
  const W = 580, H = 600, GRID = 40;

  function init() {
    cv = document.getElementById("canvas-crossycyber");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_crossycyber") || "0", 10);
    const rBtn = document.getElementById("crossycyber-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "crossycyber") {
        if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); hop(0, -1); }
        if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); hop(0, 1); }
        if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); hop(-1, 0); }
        if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); hop(1, 0); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = () => { if (over) reset(); else hop(0, -1); };
    reset();
  }

  function hop(dx, dy) {
    if (over) { reset(); return; }
    px += dx * GRID;
    py += dy * GRID;
    px = Math.max(20, Math.min(W - 20, px));
    if (dy < 0) {
      score += 10;
      dist++;
      DopamineAudio.jump();
      if (score > best) { best = score; localStorage.setItem("hf_best_crossycyber", best.toString()); }
    }
    updateHud();
  }

  function reset() {
    px = W / 2; py = H - 60; score = 0; dist = 0; over = false; camY = 0;
    lanes = [];
    for (let y = H; y > -1000; y -= GRID) {
      const type = Math.random() < 0.65 ? "road" : "grass";
      lanes.push({
        y, type,
        speed: (Math.random() > 0.5 ? 1 : -1) * (2.4 + Math.random() * 2),
        cars: type === "road" ? [0, 220, 440] : []
      });
    }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("crossycyber-score");
    if (sEl) sEl.textContent = score;
    const dEl = document.getElementById("crossycyber-dist");
    if (dEl) dEl.textContent = dist + "m";
    const bEl = document.getElementById("crossycyber-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    const targetCam = (H / 2) - py;
    camY += (targetCam - camY) * 0.15;

    lanes.forEach(l => {
      if (l.type === "road") {
        for (let i = 0; i < l.cars.length; i++) {
          l.cars[i] = (l.cars[i] + l.speed + W) % W;
          if (Math.abs(py - l.y) < 22 && Math.abs(px - l.cars[i]) < 28) {
            over = true;
            DopamineAudio.boom();
          }
        }
      }
    });

    while (lanes[lanes.length - 1].y + camY > -200) {
      const minY = lanes[lanes.length - 1].y;
      const type = Math.random() < 0.7 ? "road" : "grass";
      lanes.push({
        y: minY - GRID, type,
        speed: (Math.random() > 0.5 ? 1 : -1) * (2.8 + Math.random() * 2),
        cars: type === "road" ? [0, 240, 480] : []
      });
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(0, camY);

    lanes.forEach(l => {
      ctx.fillStyle = l.type === "road" ? "#111827" : "#064e3b";
      ctx.fillRect(0, l.y - GRID / 2, W, GRID);
      if (l.type === "road") {
        l.cars.forEach(cx => {
          ctx.fillStyle = "#ff007f";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#ff007f";
          ctx.fillRect(cx - 24, l.y - 12, 48, 24);
        });
      }
    });

    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#00f0ff";
    ctx.fillRect(px - 14, py - 14, 28, 28);
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PERCUTÉ EN PLEINE VOIE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Flèches / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 16. CHROMA WAVE SNAKE */
const WaveSnakeGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let py, vy, holding, tail, orbs, score, over, t;
  const W = 720, H = 460;

  function init() {
    cv = document.getElementById("canvas-wavesnake");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_wavesnake") || "0", 10);
    const rBtn = document.getElementById("wavesnake-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "wavesnake") {
        if (e.code === "Space") { holding = true; e.preventDefault(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    window.addEventListener("keyup", e => {
      if (window.__activeCyberSection === "wavesnake" && e.code === "Space") holding = false;
    });
    cv.onmousedown = () => holding = true;
    cv.onmouseup = () => holding = false;
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    py = H / 2; vy = 0; holding = false; tail = []; orbs = []; score = 0; over = false; t = 0;
    for (let i = 0; i < 4; i++) spawnOrb(W + i * 160);
    updateHud();
  }

  function spawnOrb(x) {
    orbs.push({ x, y: 80 + Math.random() * (H - 160), collected: false });
  }

  function updateHud() {
    const sEl = document.getElementById("wavesnake-score");
    if (sEl) sEl.textContent = score;
    const bEl = document.getElementById("wavesnake-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    t += 0.05;
    vy += holding ? -0.7 : 0.7;
    vy = Math.max(-6, Math.min(6, vy));
    py += vy;

    tail.unshift({ x: 120, y: py });
    if (tail.length > 25) tail.pop();

    if (py < 25 || py > H - 25) {
      over = true;
      DopamineAudio.boom();
    }

    orbs.forEach(o => {
      o.x -= 4.2;
      if (!o.collected && Math.hypot(120 - o.x, py - o.y) < 22) {
        o.collected = true;
        score += 50;
        DopamineAudio.coin();
        if (score > best) { best = score; localStorage.setItem("hf_best_wavesnake", best.toString()); }
      }
    });

    orbs = orbs.filter(o => o.x > -40);
    while (orbs.length < 4) spawnOrb(W + 120);
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#080616";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(0, 0, W, 20);
    ctx.fillRect(0, H - 20, W, 20);

    for (let i = 0; i < tail.length; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#ff007f";
      ctx.beginPath();
      ctx.arc(tail[i].x - i * 3, tail[i].y, Math.max(3, 10 - i * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    orbs.forEach(o => {
      if (o.collected) return;
      ctx.fillStyle = "#ffea00";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ffea00";
      ctx.beginPath();
      ctx.arc(o.x, o.y, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COLLISION AVEC LA PAROI !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 17. NEON PINBALL BOUNCER */
const PinballGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let bx, by, bvx, bvy, bumpers, score, multiplier, over;
  const W = 500, H = 640;

  function init() {
    cv = document.getElementById("canvas-pinball");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_pinball") || "0", 10);
    const rBtn = document.getElementById("pinball-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "pinball" && e.code === "Space") {
        e.preventDefault();
        if (over) reset(); else bvy = -12;
      }
    });
    cv.onclick = () => { if (over) reset(); else bvy = -12; };
    reset();
  }

  function reset() {
    bx = W / 2; by = 160; bvx = 3.5; bvy = 2; score = 0; multiplier = 1; over = false;
    bumpers = [
      { x: W / 2 - 80, y: 220, r: 28, color: "#ff007f", pts: 100 },
      { x: W / 2 + 80, y: 220, r: 28, color: "#00f0ff", pts: 100 },
      { x: W / 2, y: 320, r: 34, color: "#ffea00", pts: 250 },
      { x: W / 2 - 100, y: 420, r: 24, color: "#a855f7", pts: 150 },
      { x: W / 2 + 100, y: 420, r: 24, color: "#10b981", pts: 150 }
    ];
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("pinball-score");
    if (sEl) sEl.textContent = score;
    const mEl = document.getElementById("pinball-multiplier");
    if (mEl) mEl.textContent = "x" + multiplier;
    const bEl = document.getElementById("pinball-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    bvy += 0.28;
    bx += bvx; by += bvy;

    if (bx < 20) { bx = 20; bvx *= -0.92; DopamineAudio.hit(); }
    if (bx > W - 20) { bx = W - 20; bvx *= -0.92; DopamineAudio.hit(); }
    if (by < 20) { by = 20; bvy *= -0.92; DopamineAudio.hit(); }

    bumpers.forEach(bm => {
      const dist = Math.hypot(bx - bm.x, by - bm.y);
      if (dist < bm.r + 12) {
        const nx = (bx - bm.x) / dist;
        const ny = (by - bm.y) / dist;
        bvx = nx * 9.5;
        bvy = ny * 9.5;
        score += bm.pts * multiplier;
        multiplier = Math.min(10, multiplier + 1);
        DopamineAudio.score();
        if (score > best) { best = score; localStorage.setItem("hf_best_pinball", best.toString()); }
      }
    });

    if (by > H + 30) {
      over = true;
      DopamineAudio.over();
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070a16";
    ctx.fillRect(0, 0, W, H);

    bumpers.forEach(bm => {
      ctx.fillStyle = bm.color;
      ctx.shadowBlur = 18;
      ctx.shadowColor = bm.color;
      ctx.beginPath();
      ctx.arc(bm.x, bm.y, bm.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.arc(bx, by, 11, 0, Math.PI * 2);
    ctx.fill();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BILLE PERDUE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour relancer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 18. CYBER BLADE SLICER */
const FruitSlicerGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let items, trail, score, combo, over, isSlashing;
  const W = 720, H = 500;

  function init() {
    cv = document.getElementById("canvas-fruitslicer");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_fruitslicer") || "0", 10);
    const rBtn = document.getElementById("fruitslicer-reset");
    if (rBtn) rBtn.onclick = reset;

    cv.onmousedown = (e) => { isSlashing = true; trail = []; addTrail(e); };
    cv.onmouseup = () => isSlashing = false;
    cv.onmousemove = (e) => { if (isSlashing) addTrail(e); };
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function addTrail(e) {
    const rect = cv.getBoundingClientRect();
    trail.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1 });
    checkSlash(e.clientX - rect.left, e.clientY - rect.top);
  }

  function checkSlash(tx, ty) {
    let slicedCount = 0;
    items.forEach(it => {
      if (!it.sliced && Math.hypot(it.x - tx, it.y - ty) < it.r + 14) {
        it.sliced = true;
        if (it.isBomb) {
          over = true;
          DopamineAudio.boom();
        } else {
          slicedCount++;
          score += 20 * combo;
          DopamineAudio.slice();
        }
      }
    });
    if (slicedCount > 1) {
      combo += slicedCount;
      DopamineAudio.combo();
    }
  }

  function reset() {
    items = []; trail = []; score = 0; combo = 1; over = false; isSlashing = false;
    updateHud();
  }

  function spawnItem() {
    const isBomb = Math.random() < 0.22;
    items.push({
      x: 100 + Math.random() * (W - 200),
      y: H + 20,
      vx: (Math.random() - 0.5) * 5,
      vy: -(12 + Math.random() * 4),
      r: isBomb ? 20 : 26,
      color: isBomb ? "#ff0055" : (Math.random() < 0.5 ? "#00f0ff" : "#ffea00"),
      isBomb,
      sliced: false
    });
  }

  function updateHud() {
    const sEl = document.getElementById("fruitslicer-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("fruitslicer-combo");
    if (cEl) cEl.textContent = "x" + combo;
    const bEl = document.getElementById("fruitslicer-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    if (Math.random() < 0.04) spawnItem();

    items.forEach(it => {
      it.vy += 0.32;
      it.x += it.vx;
      it.y += it.vy;
    });

    items = items.filter(it => it.y < H + 60);
    trail.forEach(t => t.life -= 0.08);
    trail = trail.filter(t => t.life > 0);

    if (score > best) { best = score; localStorage.setItem("hf_best_fruitslicer", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#090818";
    ctx.fillRect(0, 0, W, H);

    items.forEach(it => {
      ctx.fillStyle = it.sliced ? "rgba(255,255,255,0.4)" : it.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = it.color;
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 6;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    trail.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOMBE TOUCHÉE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 19. PAC-MAN NEON CYBER */
const PacCyberGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let px, py, pdir, ghosts, dots, score, lives, powerTime, over;
  const W = 560, H = 560, GRID = 28;

  function init() {
    cv = document.getElementById("canvas-paccyber");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_paccyber") || "0", 10);
    const rBtn = document.getElementById("paccyber-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "paccyber") {
        if (e.code === "ArrowLeft" || e.code === "KeyA") pdir = "L";
        if (e.code === "ArrowRight" || e.code === "KeyD") pdir = "R";
        if (e.code === "ArrowUp" || e.code === "KeyW") pdir = "U";
        if (e.code === "ArrowDown" || e.code === "KeyS") pdir = "D";
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    px = 10 * GRID; py = 14 * GRID; pdir = "R"; score = 0; lives = 3; powerTime = 0; over = false;
    dots = [];
    for (let x = 1; x < 19; x++) {
      for (let y = 1; y < 19; y++) {
        if (Math.random() < 0.6) dots.push({ x: x * GRID, y: y * GRID, power: Math.random() < 0.05, eaten: false });
      }
    }
    ghosts = [
      { x: 3 * GRID, y: 3 * GRID, color: "#ff0055", vx: 2, vy: 0 },
      { x: 16 * GRID, y: 3 * GRID, color: "#00f0ff", vx: -2, vy: 0 },
      { x: 3 * GRID, y: 16 * GRID, color: "#ffea00", vx: 2, vy: 0 },
      { x: 16 * GRID, y: 16 * GRID, color: "#a855f7", vx: -2, vy: 0 }
    ];
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("paccyber-score");
    if (sEl) sEl.textContent = score;
    const lEl = document.getElementById("paccyber-lives");
    if (lEl) lEl.textContent = lives;
    const bEl = document.getElementById("paccyber-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    const spd = 3.2;
    if (pdir === "L") px -= spd;
    if (pdir === "R") px += spd;
    if (pdir === "U") py -= spd;
    if (pdir === "D") py += spd;

    px = (px + W) % W;
    py = (py + H) % H;

    if (powerTime > 0) powerTime--;

    dots.forEach(d => {
      if (!d.eaten && Math.hypot(px - d.x, py - d.y) < 16) {
        d.eaten = true;
        score += d.power ? 50 : 10;
        DopamineAudio.score();
        if (d.power) {
          powerTime = 300;
          DopamineAudio.combo();
        }
      }
    });

    ghosts.forEach(g => {
      g.x = (g.x + g.vx + W) % W;
      g.y = (g.y + g.vy + H) % H;
      if (Math.random() < 0.03) {
        if (Math.random() < 0.5) { g.vx = (Math.random() > 0.5 ? 2 : -2); g.vy = 0; }
        else { g.vy = (Math.random() > 0.5 ? 2 : -2); g.vx = 0; }
      }

      if (Math.hypot(px - g.x, py - g.y) < 18) {
        if (powerTime > 0) {
          score += 200;
          DopamineAudio.coin();
          g.x = 10 * GRID; g.y = 10 * GRID;
        } else {
          lives--;
          DopamineAudio.boom();
          if (lives <= 0) over = true;
          else { px = 10 * GRID; py = 14 * GRID; }
        }
      }
    });

    if (score > best) { best = score; localStorage.setItem("hf_best_paccyber", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070716";
    ctx.fillRect(0, 0, W, H);

    dots.forEach(d => {
      if (d.eaten) return;
      ctx.fillStyle = d.power ? "#ffea00" : "#00f0ff";
      ctx.shadowBlur = d.power ? 14 : 6;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.power ? 6 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ghosts.forEach(g => {
      ctx.fillStyle = powerTime > 0 ? "#3b82f6" : g.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 11, Math.PI, 0, false);
      ctx.lineTo(g.x + 11, g.y + 11);
      ctx.lineTo(g.x - 11, g.y + 11);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffea00";
    ctx.beginPath();
    ctx.arc(px, py, 12, 0.25 * Math.PI, 1.75 * Math.PI);
    ctx.lineTo(px, py);
    ctx.fill();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PARTIE TERMINÉE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Clic / R pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 20. SPACE INVADERS CYBER */
const InvadersCyberGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let shipX, invaders, lasers, alienBombs, dir, score, wave, over;
  const W = 640, H = 520;

  function init() {
    cv = document.getElementById("canvas-invaderscyber");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_invaderscyber") || "0", 10);
    const rBtn = document.getElementById("invaderscyber-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "invaderscyber") {
        if (e.code === "Space") { e.preventDefault(); fire(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = () => { if (over) reset(); else fire(); };
    reset();
  }

  function fire() {
    if (over) return;
    lasers.push({ x: shipX, y: H - 55 });
    DopamineAudio.jump();
  }

  function reset() {
    shipX = W / 2; lasers = []; alienBombs = []; dir = 1; score = 0; wave = 1; over = false;
    invaders = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        invaders.push({ x: 90 + c * 58, y: 70 + r * 42, alive: true });
      }
    }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("invaderscyber-score");
    if (sEl) sEl.textContent = score;
    const wEl = document.getElementById("invaderscyber-wave");
    if (wEl) wEl.textContent = wave;
    const bEl = document.getElementById("invaderscyber-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    if (window.CyberKeys && window.CyberKeys.left()) shipX -= 5.5;
    if (window.CyberKeys && window.CyberKeys.right()) shipX += 5.5;
    shipX = Math.max(30, Math.min(W - 30, shipX));

    lasers.forEach(l => l.y -= 12);
    lasers = lasers.filter(l => l.y > 0);

    let hitEdge = false;
    invaders.forEach(inv => {
      if (!inv.alive) return;
      inv.x += dir * (1.2 + wave * 0.3);
      if (inv.x > W - 40 || inv.x < 40) hitEdge = true;
    });

    if (hitEdge) {
      dir *= -1;
      invaders.forEach(inv => inv.y += 18);
    }

    if (Math.random() < 0.035) {
      const living = invaders.filter(i => i.alive);
      if (living.length > 0) {
        const shooter = living[Math.floor(Math.random() * living.length)];
        alienBombs.push({ x: shooter.x, y: shooter.y });
      }
    }

    alienBombs.forEach(b => b.y += 4.5);
    alienBombs = alienBombs.filter(b => b.y < H);

    for (let l = lasers.length - 1; l >= 0; l--) {
      for (let i = 0; i < invaders.length; i++) {
        const inv = invaders[i];
        if (inv.alive && Math.hypot(lasers[l].x - inv.x, lasers[l].y - inv.y) < 18) {
          inv.alive = false;
          lasers.splice(l, 1);
          score += 30;
          DopamineAudio.hit();
          break;
        }
      }
    }

    alienBombs.forEach(b => {
      if (Math.abs(b.x - shipX) < 22 && b.y > H - 55) {
        over = true;
        DopamineAudio.boom();
      }
    });

    invaders.forEach(inv => {
      if (inv.alive && inv.y > H - 70) {
        over = true;
        DopamineAudio.boom();
      }
    });

    if (invaders.every(inv => !inv.alive)) {
      wave++;
      DopamineAudio.combo();
      invaders.forEach(inv => { inv.alive = true; inv.y -= 80; });
    }

    if (score > best) { best = score; localStorage.setItem("hf_best_invaderscyber", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070716";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#00f0ff";
    ctx.fillRect(shipX - 20, H - 45, 40, 20);
    ctx.fillRect(shipX - 6, H - 58, 12, 14);

    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ffea00";
    lasers.forEach(l => ctx.fillRect(l.x - 2, l.y, 4, 12));

    ctx.fillStyle = "#ff0055";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff0055";
    alienBombs.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 8));

    invaders.forEach(inv => {
      if (!inv.alive) return;
      ctx.fillStyle = "#ff007f";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ff007f";
      ctx.fillRect(inv.x - 14, inv.y - 10, 28, 20);
    });

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("INVASION RÉUSSIE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 21. LASER DEFLECTOR 4-WAY */
const LaserBounceGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let shieldDir, lasers, score, combo, over;
  const W = 540, H = 540;

  function init() {
    cv = document.getElementById("canvas-laserbounce");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_laserbounce") || "0", 10);
    const rBtn = document.getElementById("laserbounce-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "laserbounce") {
        if (e.code === "ArrowUp" || e.code === "KeyW") shieldDir = "U";
        if (e.code === "ArrowDown" || e.code === "KeyS") shieldDir = "D";
        if (e.code === "ArrowLeft" || e.code === "KeyA") shieldDir = "L";
        if (e.code === "ArrowRight" || e.code === "KeyD") shieldDir = "R";
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    shieldDir = "U"; lasers = []; score = 0; combo = 0; over = false;
    spawnLaser();
    updateHud();
  }

  function spawnLaser() {
    const dirs = ["U", "D", "L", "R"];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    const spd = 4.2 + Math.min(4, score / 120);
    let x, y, vx, vy;
    if (d === "U") { x = W / 2; y = 20; vx = 0; vy = spd; }
    if (d === "D") { x = W / 2; y = H - 20; vx = 0; vy = -spd; }
    if (d === "L") { x = 20; y = H / 2; vx = spd; vy = 0; }
    if (d === "R") { x = W - 20; y = H / 2; vx = -spd; vy = 0; }
    lasers.push({ x, y, vx, vy, dir: d });
  }

  function updateHud() {
    const sEl = document.getElementById("laserbounce-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("laserbounce-combo");
    if (cEl) cEl.textContent = "x" + (combo + 1);
    const bEl = document.getElementById("laserbounce-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.x += l.vx; l.y += l.vy;
      const dist = Math.hypot(l.x - W / 2, l.y - H / 2);

      if (dist < 46) {
        if (shieldDir === l.dir) {
          combo++;
          score += 15 * combo;
          DopamineAudio.hit();
          lasers.splice(i, 1);
          spawnLaser();
          if (score > 100 && Math.random() < 0.4) spawnLaser();
        } else {
          over = true;
          DopamineAudio.boom();
        }
      }
    }
    if (score > best) { best = score; localStorage.setItem("hf_best_laserbounce", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070716";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ffea00";
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 10;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    if (shieldDir === "U") ctx.arc(cx, cy, 42, Math.PI * 1.25, Math.PI * 1.75);
    if (shieldDir === "D") ctx.arc(cx, cy, 42, Math.PI * 0.25, Math.PI * 0.75);
    if (shieldDir === "L") ctx.arc(cx, cy, 42, Math.PI * 0.75, Math.PI * 1.25);
    if (shieldDir === "R") ctx.arc(cx, cy, 42, Math.PI * 1.75, Math.PI * 2.25);
    ctx.stroke();

    ctx.fillStyle = "#ff0055";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff0055";
    lasers.forEach(l => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOUCLIER PERCÉ !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • ZQSD / Flèches / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 22. LUNAR LANDER ZERO-G */
const LunarLanderGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let ship, fuel, pads, score, over, landed;
  const W = 680, H = 480;

  function init() {
    cv = document.getElementById("canvas-lunarlander");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_lunarlander") || "0", 10);
    const rBtn = document.getElementById("lunarlander-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "lunarlander" && over && (e.code === "Space" || e.code === "KeyR")) reset();
    });
    cv.onclick = () => { if (over) reset(); };
    reset();
  }

  function reset() {
    ship = { x: 120, y: 70, vx: 1.8, vy: 0, angle: 0 };
    fuel = 100; score = 0; over = false; landed = false;
    pads = [{ x: 300, y: H - 40, w: 90, mult: 2 }, { x: 520, y: H - 70, w: 60, mult: 3 }];
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("lunarlander-score");
    if (sEl) sEl.textContent = score;
    const fEl = document.getElementById("lunarlander-fuel");
    if (fEl) fEl.textContent = Math.floor(fuel) + "%";
    const bEl = document.getElementById("lunarlander-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    if (window.CyberKeys && window.CyberKeys.left()) ship.angle -= 0.05;
    if (window.CyberKeys && window.CyberKeys.right()) ship.angle += 0.05;
    if (window.CyberKeys && window.CyberKeys.up() && fuel > 0) {
      ship.vx += Math.sin(ship.angle) * 0.14;
      ship.vy -= Math.cos(ship.angle) * 0.14;
      fuel -= 0.35;
    }

    ship.vy += 0.045;
    ship.x += ship.vx;
    ship.y += ship.vy;

    pads.forEach(p => {
      if (ship.y >= p.y - 14 && ship.x >= p.x && ship.x <= p.x + p.w) {
        if (Math.abs(ship.vy) < 1.4 && Math.abs(ship.angle) < 0.25) {
          landed = true;
          over = true;
          score = Math.floor(100 * p.mult + fuel);
          DopamineAudio.combo();
          if (score > best) { best = score; localStorage.setItem("hf_best_lunarlander", best.toString()); }
        } else {
          over = true;
          DopamineAudio.boom();
        }
      }
    });

    if (ship.y > H - 20 || ship.x < 10 || ship.x > W - 10) {
      over = true;
      DopamineAudio.boom();
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#060714";
    ctx.fillRect(0, 0, W, H);

    pads.forEach(p => {
      ctx.fillStyle = "#10b981";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#10b981";
      ctx.fillRect(p.x, p.y, p.w, 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(p.mult + "X", p.x + p.w / 2 - 8, p.y + 24);
    });

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(-12, 12); ctx.lineTo(12, 12); ctx.closePath();
    ctx.stroke();

    if (window.CyberKeys && window.CyberKeys.up() && fuel > 0) {
      ctx.fillStyle = "#ffea00";
      ctx.beginPath();
      ctx.moveTo(-6, 12); ctx.lineTo(0, 24 + Math.random() * 8); ctx.lineTo(6, 12);
      ctx.fill();
    }
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = landed ? "#10b981" : "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(landed ? "ATTERRISSAGE PARFAIT !" : "CRASH LUNAIRE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 23. ORBIT JUMP PLANET */
const OrbitJumpGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let pDist, pvy, pRot, obs, score, laps, over;
  const W = 540, H = 540, PR = 90;

  function init() {
    cv = document.getElementById("canvas-orbitjump");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_orbitjump") || "0", 10);
    const rBtn = document.getElementById("orbitjump-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "orbitjump") {
        if (e.code === "Space") { e.preventDefault(); jump(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = jump;
    reset();
  }

  function jump() {
    if (over) { reset(); return; }
    if (pDist <= PR + 1) {
      pvy = 6.8;
      DopamineAudio.jump();
    }
  }

  function reset() {
    pDist = PR; pvy = 0; pRot = 0; score = 0; laps = 0; over = false;
    obs = [{ rot: Math.PI }, { rot: Math.PI * 1.6 }];
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("orbitjump-score");
    if (sEl) sEl.textContent = score;
    const lEl = document.getElementById("orbitjump-laps");
    if (lEl) lEl.textContent = laps;
    const bEl = document.getElementById("orbitjump-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    const spd = 0.045 + Math.min(0.04, score / 300);
    pRot += spd;
    if (pRot >= Math.PI * 2) {
      pRot -= Math.PI * 2;
      laps++;
      score += 50;
      DopamineAudio.coin();
    }

    if (pDist > PR) {
      pvy -= 0.38;
      pDist += pvy;
      if (pDist <= PR) { pDist = PR; pvy = 0; }
    }

    obs.forEach(o => {
      let diff = Math.abs((pRot - o.rot + Math.PI * 4) % (Math.PI * 2));
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.16 && pDist < PR + 18) {
        over = true;
        DopamineAudio.boom();
      }
    });

    if (score > best) { best = score; localStorage.setItem("hf_best_orbitjump", best.toString()); }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070716";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = "#1e1b4b";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.arc(0, 0, PR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    obs.forEach(o => {
      ctx.save();
      ctx.rotate(o.rot);
      ctx.fillStyle = "#ff007f";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff007f";
      ctx.fillRect(PR, -8, 22, 16);
      ctx.restore();
    });

    ctx.rotate(pRot);
    ctx.fillStyle = "#ffea00";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffea00";
    ctx.beginPath();
    ctx.arc(pDist + 10, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COLLISION SATELLITE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Score : " + score + " • Espace / Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

/* 24. CYBER SIMON MATRIX */
const SimonGame = (() => {
  let cv, ctx, active = false, best = 0;
  let seq, playerIdx, round, busy, litPad, over;
  const W = 500, H = 500;
  const PADS = [
    { id: 0, color: "#00f0ff", freq: 440, x: 20, y: 20, w: 220, h: 220 },
    { id: 1, color: "#ff007f", freq: 554, x: 260, y: 20, w: 220, h: 220 },
    { id: 2, color: "#ffea00", freq: 659, x: 20, y: 260, w: 220, h: 220 },
    { id: 3, color: "#10b981", freq: 880, x: 260, y: 260, w: 220, h: 220 }
  ];

  function init() {
    cv = document.getElementById("canvas-simon");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_simon") || "0", 10);
    const rBtn = document.getElementById("simon-reset");
    if (rBtn) rBtn.onclick = reset;

    cv.onclick = (e) => {
      if (over) { reset(); return; }
      if (busy) return;
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      PADS.forEach(p => {
        if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) handlePress(p.id);
      });
    };
    reset();
  }

  function reset() {
    seq = []; playerIdx = 0; round = 0; busy = false; litPad = -1; over = false;
    nextRound();
  }

  function nextRound() {
    round++;
    playerIdx = 0;
    seq.push(Math.floor(Math.random() * 4));
    updateHud();
    playSequence();
  }

  function playSequence() {
    busy = true;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= seq.length) {
        clearInterval(interval);
        busy = false;
        litPad = -1;
        draw();
        return;
      }
      lightPad(seq[i]);
      i++;
    }, 600);
  }

  function lightPad(id) {
    litPad = id;
    DopamineAudio.jump();
    draw();
    setTimeout(() => { litPad = -1; draw(); }, 350);
  }

  function handlePress(id) {
    lightPad(id);
    if (id === seq[playerIdx]) {
      playerIdx++;
      if (playerIdx === seq.length) {
        DopamineAudio.combo();
        if (round > best) { best = round; localStorage.setItem("hf_best_simon", best.toString()); }
        setTimeout(nextRound, 800);
      }
    } else {
      over = true;
      DopamineAudio.boom();
      draw();
    }
  }

  function updateHud() {
    const rEl = document.getElementById("simon-round");
    if (rEl) rEl.textContent = round;
    const bEl = document.getElementById("simon-best");
    if (bEl) bEl.textContent = best;
  }

  function draw() {
    ctx.fillStyle = "#070716";
    ctx.fillRect(0, 0, W, H);

    PADS.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = litPad === p.id ? 1.0 : 0.35;
      ctx.shadowBlur = litPad === p.id ? 25 : 8;
      ctx.shadowColor = p.color;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    });
    ctx.globalAlpha = 1.0;

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0055";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ERREUR DE SÉQUENCE !", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Manches réussies : " + (round - 1) + " • Clic pour rejouer", W / 2, H / 2 + 20);
    }
  }

  function start() { if (!cv) init(); active = true; draw(); }
  function pause() { active = false; }
  return { init, start, pause };
})();

/* 25. CYBER COIN PUSHER */
const CoinDozerGame = (() => {
  let cv, ctx, raf = 0, active = false, best = 0;
  let pusherZ, pDir, coins, dropperX, score, droppedCount, over;
  const W = 540, H = 600;

  function init() {
    cv = document.getElementById("canvas-coindozer");
    if (!cv) return;
    ctx = cv.getContext("2d");
    best = parseInt(localStorage.getItem("hf_best_coindozer") || "0", 10);
    const rBtn = document.getElementById("coindozer-reset");
    if (rBtn) rBtn.onclick = reset;
    window.addEventListener("keydown", e => {
      if (window.__activeCyberSection === "coindozer") {
        if (e.code === "Space") { e.preventDefault(); dropCoin(); }
        if (e.code === "KeyR" && over) reset();
      }
    });
    cv.onclick = dropCoin;
    reset();
  }

  function dropCoin() {
    if (over) { reset(); return; }
    coins.push({ x: dropperX + (Math.random() - 0.5) * 20, y: 160, vy: 0 });
    droppedCount++;
    DopamineAudio.jump();
    updateHud();
  }

  function reset() {
    pusherZ = 0; pDir = 1; dropperX = W / 2; score = 0; droppedCount = 0; over = false;
    coins = [];
    for (let i = 0; i < 24; i++) {
      coins.push({ x: 80 + Math.random() * (W - 160), y: 220 + Math.random() * 220, vy: 0 });
    }
    updateHud();
  }

  function updateHud() {
    const sEl = document.getElementById("coindozer-score");
    if (sEl) sEl.textContent = score;
    const cEl = document.getElementById("coindozer-coins");
    if (cEl) cEl.textContent = droppedCount;
    const bEl = document.getElementById("coindozer-best");
    if (bEl) bEl.textContent = best;
  }

  function step() {
    if (!active) return;
    update();
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (over) return;
    pusherZ += pDir * 1.4;
    if (pusherZ > 65 || pusherZ < 0) pDir *= -1;

    dropperX = W / 2 + Math.sin(Date.now() * 0.003) * (W / 2 - 80);

    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (c.y < 260) c.y += pusherZ * 0.08;
      else c.y += 0.8;

      if (c.y > H - 50) {
        coins.splice(i, 1);
        score += 25;
        DopamineAudio.coin();
        if (score > best) { best = score; localStorage.setItem("hf_best_coindozer", best.toString()); }
      }
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#070716";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(60, 160 + pusherZ, W - 120, 35);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 160 + pusherZ, W - 120, 35);

    ctx.fillStyle = "#ff007f";
    ctx.fillRect(dropperX - 25, 40, 50, 18);

    coins.forEach(c => {
      ctx.fillStyle = "#ffea00";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ffea00";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function start() { if (!cv) init(); active = true; if (!raf) raf = requestAnimationFrame(step); }
  function pause() { active = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { init, start, pause };
})();

// ============================================================================
// ENREGISTREMENT UNIVERSEL DANS CYBER_MODULES ET SECTION_TITLES
// ============================================================================
const DopamineModulesMap = {
  highway: HighwayGame,
  gravityball: GravityBallGame,
  hexagon: HexagonGame,
  knifehit: KnifeHitGame,
  colorswitch: ColorSwitchGame,
  helix: HelixGame,
  ballblast: BallBlastGame,
  stacktower: StackTowerGame,
  timber: TimberGame,
  flappydunk: FlappyDunkGame,
  breakout360: Breakout360Game,
  asteroids: AsteroidsGame,
  zigzag: ZigzagGame,
  bullethell: BulletHellGame,
  crossycyber: CrossyCyberGame,
  wavesnake: WaveSnakeGame,
  pinball: PinballGame,
  fruitslicer: FruitSlicerGame,
  paccyber: PacCyberGame,
  invaderscyber: InvadersCyberGame,
  laserbounce: LaserBounceGame,
  lunarlander: LunarLanderGame,
  orbitjump: OrbitJumpGame,
  simon: SimonGame,
  coindozer: CoinDozerGame
};

const DopamineTitlesMap = {
  highway: '🏎️ Neon Highway 3D',
  gravityball: '⚡ Neon Gravity Ball',
  hexagon: '🔷 Hyper Hexagon',
  knifehit: '🗡️ Cyber Knife Hit',
  colorswitch: '🎨 Color Switch Neon',
  helix: '🌀 Helix Jump Neon',
  ballblast: '💥 Ball Blast Cannon',
  stacktower: '🧱 Stack Tower 3D',
  timber: '🪓 Cyber Timber Chopper',
  flappydunk: '🏀 Flappy Dunk Hoops',
  breakout360: '⭕ Breakout 360 Ring',
  asteroids: '🚀 Asteroids Blaster',
  zigzag: '⚡ Tap Tap Zigzag',
  bullethell: '✨ Bullet Hell Grazing',
  crossycyber: '🐸 Cyber Crossy Road',
  wavesnake: '🐍 Chroma Wave Snake',
  pinball: '🎰 Neon Pinball Bouncer',
  fruitslicer: '⚔️ Cyber Blade Slicer',
  paccyber: '👾 Pac-Man Neon Cyber',
  invaderscyber: '🛸 Space Invaders Cyber',
  laserbounce: '🛡️ Laser Deflector 4-Way',
  lunarlander: '🚀 Lunar Lander Zero-G',
  orbitjump: '🪐 Orbit Jump Planet',
  simon: '🎵 Cyber Simon Matrix',
  coindozer: '🪙 Cyber Coin Pusher'
};

if (typeof CYBER_MODULES !== 'undefined') {
  Object.assign(CYBER_MODULES, DopamineModulesMap);
}
if (typeof SECTION_TITLES !== 'undefined') {
  Object.assign(SECTION_TITLES, DopamineTitlesMap);
}

if (typeof window !== 'undefined') {
  if (!window.CYBER_MODULES) window.CYBER_MODULES = {};
  if (!window.SECTION_TITLES) window.SECTION_TITLES = {};
  Object.assign(window.CYBER_MODULES, DopamineModulesMap);
  Object.assign(window.SECTION_TITLES, DopamineTitlesMap);

  function bindDopamineButtons() {
    if (!window.navigateTo) return;
    document.querySelectorAll('.nav-btn, [data-goto]').forEach(btn => {
      const sec = btn.dataset.section || btn.dataset.goto;
      if (DopamineModulesMap[sec]) {
        btn.onclick = () => window.navigateTo(sec);
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bindDopamineButtons);
  } else {
    bindDopamineButtons();
  }
}
