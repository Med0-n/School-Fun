// ========================================================
// Slope 2 WebGL - Core Modding Engine & Driver Hooks
// ========================================================

(function() {
  'use strict';

  // Default Mod Configuration
  const DEFAULT_SETTINGS = {
    lang: 'en',
    // Background
    bgType: 'default', // 'default', 'color', 'gradient', 'image'
    bgColor: '#000000',
    bgGradient: 'linear-gradient(135deg, #0d0221 0%, #15002a 50%, #000000 100%)',
    bgImage: '',
    bgOpacity: 1.0,
    bgBlur: 0,
    bgScale: 'cover', // 'cover', 'contain', 'stretch', 'center', 'tile'
    // Neon Colors (Hex format)
    colorTrack: '#00FF2F',   // Original track green
    colorBall: '#00FFD9',    // Original ball cyan
    colorHazard: '#F30505',  // Original hazard red
    colorFog: '#050515',     // Original abyss fog
    fogDensity: 1.0,         // Fog density multiplier
    // Typography
    currentFont: 'Anton',
    customFontData: null,
    // Graphical Enhancements
    gfxBloom: false,
    gfxSharpen: false,
    gfxVignette: false,
    gfxHdr: false,
    // Performance
    unlockedFps: false,
    targetFps: 'vsync', // 'vsync', '60', '120', '144', '240', 'unlimited'
    renderScale: 1.0,   // 0.5 to 2.0
    nerdStats: false,
    // Audio & QoL
    masterVolume: 1.0,
    isMuted: false,
    pauseOnMenu: true,
    // Custom Music Player
    musicVolume: 0.8,
    musicLoop: true,
    musicUnityMode: 'mute_bgm' // 'mute_bgm', 'mute_all', 'keep_all'
  };

  // ========================================================
  // Custom Music Player Class
  // ========================================================
  class Slope2MusicPlayer {
    constructor(engine) {
      this.engine = engine;
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous";
      this.playlist = [
        { name: "Back On Track", url: "mods/music/BackOnTrack.ogg", isCustom: false },
        { name: "Cycles", url: "mods/music/Cycles.ogg", isCustom: false },
        { name: "Theory of Everything", url: "mods/music/TheoryOfEverything.ogg", isCustom: false }
      ];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isLooping = this.engine.settings.musicLoop !== false;
      this.volume = this.engine.settings.musicVolume !== undefined ? this.engine.settings.musicVolume : 0.8;
      this.unityAudioMode = this.engine.settings.musicUnityMode || 'mute_bgm';

      this.audio.volume = this.volume;
      this.audio.loop = false;

      this.audio.addEventListener('ended', () => {
        if (this.isLooping && this.playlist.length === 1) {
          this.audio.currentTime = 0;
          this.audio.play();
        } else if (this.isLooping && this.playlist.length > 1) {
          this.next();
        } else {
          this.isPlaying = false;
          this.engine.onCustomMusicState(false);
          this.onStateChange();
        }
      });

      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.engine.onCustomMusicState(true);
        this.onStateChange();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.engine.onCustomMusicState(false);
        this.onStateChange();
      });

      this.audio.addEventListener('timeupdate', () => {
        if (window.Slope2UI && window.Slope2UI.updateMusicProgress) {
          window.Slope2UI.updateMusicProgress(this.audio.currentTime, this.audio.duration);
        }
      });
    }

    currentTrack() {
      return this.playlist[this.currentIndex] || null;
    }

    loadTrack(index) {
      if (index < 0 || index >= this.playlist.length) return;
      this.currentIndex = index;
      const track = this.playlist[index];
      this.audio.src = track.url;
      this.onStateChange();
    }

    play() {
      if (!this.audio.src && this.playlist.length > 0) {
        this.loadTrack(this.currentIndex);
      }
      this.audio.play().catch(e => console.warn("[Music] Play error:", e));
    }

    pause() {
      this.audio.pause();
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    next() {
      if (this.playlist.length === 0) return;
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
      this.loadTrack(this.currentIndex);
      if (this.isPlaying) this.play();
    }

    prev() {
      if (this.playlist.length === 0) return;
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      this.loadTrack(this.currentIndex);
      if (this.isPlaying) this.play();
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val)));
      this.audio.volume = this.volume;
      this.engine.settings.musicVolume = this.volume;
      this.engine.saveSettings();
      this.onStateChange();
    }

    toggleLoop() {
      this.isLooping = !this.isLooping;
      this.engine.settings.musicLoop = this.isLooping;
      this.engine.saveSettings();
      this.onStateChange();
    }

    setUnityAudioMode(mode) {
      this.unityAudioMode = mode;
      this.engine.settings.musicUnityMode = mode;
      this.engine.saveSettings();
      this.engine.updateAudioVolume();
      this.onStateChange();
    }

    addFiles(files) {
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const name = file.name.replace(/\.[^/.]+$/, "");
        this.playlist.push({ name, url, isCustom: true });
      }
      this.engine.showNotification(this.engine.t('notif_saved') + ` (+${files.length} tracks)`);
      this.onStateChange();
    }

    onStateChange() {
      if (window.Slope2UI && window.Slope2UI.updateMusicUI) {
        window.Slope2UI.updateMusicUI();
      }
    }
  }

  // ========================================================
  // Core Modding Engine
  // ========================================================
  class Slope2ModEngine {
    constructor() {
      this.settings = this.loadSettings();
      this.glContexts = new Set();
      this.injectedPrograms = new Set();
      this.currentProgram = null;

      // Audio Nodes
      this.audioContexts = new Set();
      this.masterGainNodes = new Map();
      this.unityBgmGainNodes = new Map();
      this.unitySfxGainNodes = new Map();
      this.customMusicActive = false;

      // Music Player
      this.musicPlayer = new Slope2MusicPlayer(this);

      this.isPaused = false;
      this.menuOpen = false;
      this.currentDepthMask = true;
      this.currentDepthFunc = 515; // GL_LEQUAL

      // Performance tracking (passive)
      this.fps = 60;
      this.frametime = 16.6;
      this.fpsHistory = [];
      this.fpsMin = 60;
      this.fpsMax = 60;
      this.lastFrameTime = performance.now();
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();

      this.initSvgFilters();
      this.initHooks();
    }

    loadSettings() {
      try {
        const saved = localStorage.getItem('slope2_mods_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return Object.assign({}, DEFAULT_SETTINGS, parsed);
        }
      } catch (e) {
        console.warn("[Slope2Mods] Failed to load localStorage settings:", e);
      }
      return Object.assign({}, DEFAULT_SETTINGS);
    }

    saveSettings() {
      try {
        localStorage.setItem('slope2_mods_settings', JSON.stringify(this.settings));
      } catch (e) {
        console.warn("[Slope2Mods] Failed to save localStorage settings:", e);
      }
    }

    // ========================================================
    // 1. WebGL 2.0 Transparency & Shader Injection Hooks
    // ========================================================
    initHooks() {
      const self = this;

      // 1. Hook getContext: Force alpha: true and preserveDrawingBuffer: false
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') {
          attributes = attributes || {};
          // Enable true alpha backbuffer so custom background HTML element shows through
          attributes.alpha = true;
          // NEVER preserve drawing buffer: prevents ghosting/white trails behind moving objects
          attributes.preserveDrawingBuffer = false;
        }
        const gl = origGetContext.call(this, type, attributes);
        if (gl && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
          self.mainCanvas = this;
          if (!self.glContexts.has(gl)) {
            self.glContexts.add(gl);
            self.hookWebGL(gl);
          }
        }
        return gl;
      };

      // 2. WebAudio Hook for Master Volume, Instant Mute & BGM Separation
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const origAudioCtx = AudioCtx;
        window.AudioContext = window.webkitAudioContext = function(...args) {
          const ctx = new origAudioCtx(...args);
          self.audioContexts.add(ctx);
          self.setupAudioContextGain(ctx);
          return ctx;
        };
        window.AudioContext.prototype = origAudioCtx.prototype;
      }

      // 3. RequestAnimationFrame Hook for Passive FPS & Unlocked FPS
      this.hookRAF();
    }

    patchFragmentShader(source) {
      const headerCode = `
uniform mediump vec4 u_Slope2_ColorTrack;
uniform mediump vec4 u_Slope2_ColorBall;
uniform mediump vec4 u_Slope2_ColorHazard;
uniform mediump vec4 u_Slope2_ColorFog;
uniform mediump vec4 u_Slope2_ModFlags; // x: recolor active (1/0), y: transparent bg active (1/0), z: skybox pass (1/0)

mediump vec4 slope2_process_pixel(mediump vec4 col) {
    mediump float lum = max(col.r, max(col.g, col.b));
    if (u_Slope2_ModFlags.y > 0.5) {
        // Skybox pass: dark background/skybox becomes transparent
        if (u_Slope2_ModFlags.z > 0.5 || gl_FragCoord.z >= 0.9995) {
            if (lum < 0.02 && length(col.rgb) < 0.02) {
                col.a = 0.0;
                return col;
            }
        }
    }
    if (u_Slope2_ModFlags.x > 0.5) {
        if (lum > 0.15) {
            // 1. Hazard Red: Dominant red
            if (col.r > 0.35 && col.r > col.g * 1.5 && col.r > col.b * 1.5) {
                col.rgb = lum * u_Slope2_ColorHazard.rgb;
                col.a = 1.0;
            }
            // 2. Ball Cyan: High green and high blue, low red
            else if (col.b > 0.35 && col.g > 0.35 && col.r < 0.35) {
                col.rgb = lum * u_Slope2_ColorBall.rgb;
                col.a = 1.0;
            }
            // 3. Track and Buildings Green: Dominant green
            else if (col.g > 0.35 && col.g > col.b * 1.4 && col.g > col.r * 1.5) {
                col.rgb = lum * u_Slope2_ColorTrack.rgb;
                col.a = 1.0;
            }
        } else {
            // Solid geometry faces remain pure black and opaque
            col.rgb = vec3(0.0);
            col.a = 1.0;
        }
    }
    return col;
}
`;

      let patched = source;
      const mainIdx = patched.indexOf('void main()');
      if (mainIdx !== -1) {
        // Inject header right before void main() so all #version, #extension and precision statements remain first
        patched = patched.substring(0, mainIdx) + headerCode + '\n' + patched.substring(mainIdx);
        const newMainIdx = patched.indexOf('void main()');
        const openBrace = patched.indexOf('{', newMainIdx);
        const lastBrace = patched.lastIndexOf('}');
        if (openBrace !== -1 && lastBrace !== -1) {
          let body = patched.substring(openBrace + 1, lastBrace);
          body = body.replace(/return\s*;/g, 'SV_Target0 = slope2_process_pixel(SV_Target0); return;');
          body = body + '\n    SV_Target0 = slope2_process_pixel(SV_Target0);\n';
          patched = patched.substring(0, openBrace + 1) + body + patched.substring(lastBrace);
        }
      }

      return patched;
    }

    hookWebGL(gl) {
      const self = this;

      // 1. Hook shaderSource to inject neon color & transparency logic into fragment shaders
      const origShaderSource = gl.shaderSource.bind(gl);
      gl.shaderSource = function(shader, source) {
        if (typeof source === 'string' && source.includes('SV_Target0') && source.includes('void main()')) {
          source = self.patchFragmentShader(source);
        }
        return origShaderSource(shader, source);
      };

      // 2. Hook linkProgram to bind uniforms
      const origLinkProgram = gl.linkProgram.bind(gl);
      gl.linkProgram = function(program) {
        origLinkProgram(program);
        const locModFlags = gl.getUniformLocation(program, "u_Slope2_ModFlags");
        if (locModFlags) {
          program.__slope2 = true;
          program.__uModFlags = locModFlags;
          program.__uColorTrack = gl.getUniformLocation(program, "u_Slope2_ColorTrack");
          program.__uColorBall = gl.getUniformLocation(program, "u_Slope2_ColorBall");
          program.__uColorHazard = gl.getUniformLocation(program, "u_Slope2_ColorHazard");
          program.__uColorFog = gl.getUniformLocation(program, "u_Slope2_ColorFog");
          self.injectedPrograms.add(program);
        }
      };

      // 3. Hook useProgram to push current color uniforms
      const origUseProgram = gl.useProgram.bind(gl);
      gl.useProgram = function(program) {
        origUseProgram(program);
        self.currentProgram = program;
        if (program && program.__slope2) {
          self.applyProgramUniforms(gl, program);
        }
      };

      // 4. Hook clear & clearColor: Zero-ghosting backbuffer clearing
      const origClear = gl.clear.bind(gl);
      const origClearColor = gl.clearColor.bind(gl);

      gl.clearColor = function(r, g, b, a) {
        if (self.settings.bgType !== 'default') {
          // If clearing dark camera clear, force transparent black (0, 0, 0, 0)
          if (r <= 0.25 && g <= 0.25 && b <= 0.25) {
            return origClearColor(0.0, 0.0, 0.0, 0.0);
          }
        }
        return origClearColor(r, g, b, a);
      };

      gl.clear = function(mask) {
        if (self.settings.bgType !== 'default' && (mask & gl.COLOR_BUFFER_BIT)) {
          const fbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
          if (fbo === null) {
            // Main backbuffer clear: ensure clearColor is transparent black (0, 0, 0, 0)
            origClearColor(0.0, 0.0, 0.0, 0.0);
          }
        }
        return origClear(mask);
      };

      // 5. Hook bufferSubData on UNIFORM_BUFFER as secondary UBO replacement
      const origBufferSubData = gl.bufferSubData.bind(gl);
      gl.bufferSubData = function(target, offset, data, ...rest) {
        if (target === gl.UNIFORM_BUFFER && data && self.hasCustomColors()) {
          data = self.processUboData(data);
        }
        return origBufferSubData(target, offset, data, ...rest);
      };

      // 6. Hook depthMask, depthFunc, drawElements, drawArrays for skybox detection
      const origDepthMask = gl.depthMask.bind(gl);
      gl.depthMask = function(flag) {
        self.currentDepthMask = !!flag;
        return origDepthMask(flag);
      };

      const origDepthFunc = gl.depthFunc.bind(gl);
      gl.depthFunc = function(func) {
        self.currentDepthFunc = func;
        return origDepthFunc(func);
      };

      function checkSkyboxDraw(ctx, prog) {
        if (!prog || !prog.__slope2 || !prog.__uModFlags) return;
        const isSky = (!self.currentDepthMask && (self.currentDepthFunc === ctx.LEQUAL || self.currentDepthFunc === 515));
        if (isSky) prog.__isSkybox = true;
        const skyVal = (isSky || prog.__isSkybox) ? 1.0 : 0.0;
        if (skyVal !== prog.__lastSkyVal) {
          prog.__lastSkyVal = skyVal;
          const recolorFlag = self.hasCustomColors() ? 1.0 : 0.0;
          const transBgFlag = (self.settings.bgType !== 'default') ? 1.0 : 0.0;
          ctx.uniform4f(prog.__uModFlags, recolorFlag, transBgFlag, skyVal, 0.0);
        }
      }

      const origDrawElements = gl.drawElements.bind(gl);
      gl.drawElements = function(mode, count, type, offset) {
        checkSkyboxDraw(this, self.currentProgram || this.getParameter(this.CURRENT_PROGRAM));
        return origDrawElements(mode, count, type, offset);
      };

      const origDrawArrays = gl.drawArrays.bind(gl);
      gl.drawArrays = function(mode, first, count) {
        checkSkyboxDraw(this, self.currentProgram || this.getParameter(this.CURRENT_PROGRAM));
        return origDrawArrays(mode, first, count);
      };

      if (typeof WebGL2RenderingContext !== 'undefined' && !WebGL2RenderingContext.prototype.__slope2Hooked) {
        WebGL2RenderingContext.prototype.__slope2Hooked = true;
        const p2 = WebGL2RenderingContext.prototype;
        const p2DM = p2.depthMask;
        p2.depthMask = function(flag) {
          self.currentDepthMask = !!flag;
          return p2DM.call(this, flag);
        };
        const p2DF = p2.depthFunc;
        p2.depthFunc = function(func) {
          self.currentDepthFunc = func;
          return p2DF.call(this, func);
        };
        const p2DE = p2.drawElements;
        p2.drawElements = function(mode, count, type, offset) {
          checkSkyboxDraw(this, this.getParameter(this.CURRENT_PROGRAM));
          return p2DE.call(this, mode, count, type, offset);
        };
        const p2DA = p2.drawArrays;
        p2.drawArrays = function(mode, first, count) {
          checkSkyboxDraw(this, this.getParameter(this.CURRENT_PROGRAM));
          return p2DA.call(this, mode, first, count);
        };
      }
    }

    processUboData(data) {
      try {
        let f32 = null;
        if (data instanceof Float32Array) {
          f32 = data;
        } else if (data.buffer && data.byteLength >= 16) {
          f32 = new Float32Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 4));
        }
        if (!f32 || f32.length < 4) return data;

        const [tr, tg, tb] = this.hexToRgb01(this.settings.colorTrack);
        const [br, bg, bb] = this.hexToRgb01(this.settings.colorBall);
        const [hr, hg, hb] = this.hexToRgb01(this.settings.colorHazard);

        // Scan 4-float blocks (RGBA)
        for (let i = 0; i <= f32.length - 4; i += 4) {
          const r = f32[i], g = f32[i+1], b = f32[i+2];
          // Track green (High G, low R, low B)
          if (g > 0.6 && r < 0.4 && b < 0.4) {
            f32[i] = tr * 1.5; f32[i+1] = tg * 1.5; f32[i+2] = tb * 1.5;
          }
          // Ball cyan (High G, high B, low R)
          else if (b > 0.5 && g > 0.5 && r < 0.4) {
            f32[i] = br * 1.5; f32[i+1] = bg * 1.5; f32[i+2] = bb * 1.5;
          }
          // Hazard red (High R, low G, low B)
          else if (r > 0.6 && g < 0.35 && b < 0.35) {
            f32[i] = hr * 1.5; f32[i+1] = hg * 1.5; f32[i+2] = hb * 1.5;
          }
        }
      } catch (e) {}
      return data;
    }

    hasCustomColors() {
      const isDefaultTrack = (this.settings.colorTrack.toUpperCase() === '#00FF2F');
      const isDefaultBall = (this.settings.colorBall.toUpperCase() === '#00FFD9');
      const isDefaultHazard = (this.settings.colorHazard.toUpperCase() === '#F30505');
      const isDefaultFog = (this.settings.colorFog.toUpperCase() === '#050515');
      return (!isDefaultTrack || !isDefaultBall || !isDefaultHazard || !isDefaultFog);
    }

    applyProgramUniforms(gl, program) {
      if (!program || !program.__slope2) return;
      try {
        const active = gl.getParameter(gl.CURRENT_PROGRAM);
        if (active !== program) return;

        const hasCustom = this.hasCustomColors();
        const recolorFlag = hasCustom ? 1.0 : 0.0;
        const transBgFlag = (this.settings.bgType !== 'default') ? 1.0 : 0.0;
        const isSky = (program.__isSkybox || (!this.currentDepthMask && (this.currentDepthFunc === gl.LEQUAL || this.currentDepthFunc === 515)));
        const skyVal = isSky ? 1.0 : 0.0;
        program.__lastSkyVal = skyVal;

        gl.uniform4f(program.__uModFlags, recolorFlag, transBgFlag, skyVal, 0.0);

        if (recolorFlag > 0.5) {
          const [tr, tg, tb] = this.hexToRgb01(this.settings.colorTrack);
          const [br, bg, bb] = this.hexToRgb01(this.settings.colorBall);
          const [hr, hg, hb] = this.hexToRgb01(this.settings.colorHazard);
          const [fr, fg, fb] = this.hexToRgb01(this.settings.colorFog);

          gl.uniform4f(program.__uColorTrack, tr * 1.5, tg * 1.5, tb * 1.5, 1.0);
          gl.uniform4f(program.__uColorBall, br * 1.5, bg * 1.5, bb * 1.5, 1.0);
          gl.uniform4f(program.__uColorHazard, hr * 1.5, hg * 1.5, hb * 1.5, 1.0);
          gl.uniform4f(program.__uColorFog, fr, fg, fb, 1.0);
        }
      } catch (e) {}
    }

    updateAllProgramUniforms() {
      for (const gl of this.glContexts) {
        try {
          const active = gl.getParameter(gl.CURRENT_PROGRAM);
          if (active && active.__slope2) {
            this.applyProgramUniforms(gl, active);
          }
        } catch (e) {}
      }
    }

    hexToRgb01(hex) {
      const c = hex.replace('#', '');
      const num = parseInt(c, 16);
      return [
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
      ];
    }

    // ========================================================
    // 2. Audio Routing: Master Volume, Mute & BGM Separation
    // ========================================================
    setupAudioContextGain(ctx) {
      try {
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(this.settings.isMuted ? 0 : this.settings.masterVolume, ctx.currentTime);
        masterGain.connect(ctx.destination);
        this.masterGainNodes.set(ctx, masterGain);

        const bgmGain = ctx.createGain();
        bgmGain.gain.setValueAtTime(1.0, ctx.currentTime);
        bgmGain.connect(masterGain);
        this.unityBgmGainNodes.set(ctx, bgmGain);

        const sfxGain = ctx.createGain();
        sfxGain.gain.setValueAtTime(1.0, ctx.currentTime);
        sfxGain.connect(masterGain);
        this.unitySfxGainNodes.set(ctx, sfxGain);

        const origConnect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function(destination, ...args) {
          if (destination === ctx.destination) {
            // Check if source node is long-playing or looping background music
            const isBgm = (this instanceof AudioBufferSourceNode && (this.loop || (this.buffer && this.buffer.duration > 15)));
            const target = isBgm ? bgmGain : sfxGain;
            return origConnect.call(this, target, ...args);
          }
          return origConnect.call(this, destination, ...args);
        };
      } catch (e) {
        console.warn("[Slope2Mods] AudioContext gain setup error:", e);
      }
    }

    onCustomMusicState(isPlaying) {
      this.customMusicActive = isPlaying;
      this.updateAudioVolume();
    }

    updateAudioVolume() {
      const vol = this.settings.isMuted ? 0 : this.settings.masterVolume;
      const mode = this.settings.musicUnityMode || 'mute_bgm';
      const customOn = this.customMusicActive;

      for (const [ctx, masterGain] of this.masterGainNodes.entries()) {
        try {
          masterGain.gain.setValueAtTime(vol, ctx.currentTime);
        } catch (e) {}
      }

      for (const [ctx, bgmGain] of this.unityBgmGainNodes.entries()) {
        try {
          if (customOn && (mode === 'mute_bgm' || mode === 'mute_all')) {
            bgmGain.gain.setValueAtTime(0.0, ctx.currentTime);
          } else {
            bgmGain.gain.setValueAtTime(1.0, ctx.currentTime);
          }
        } catch (e) {}
      }

      for (const [ctx, sfxGain] of this.unitySfxGainNodes.entries()) {
        try {
          if (customOn && mode === 'mute_all') {
            sfxGain.gain.setValueAtTime(0.0, ctx.currentTime);
          } else {
            sfxGain.gain.setValueAtTime(1.0, ctx.currentTime);
          }
        } catch (e) {}
      }
    }

    toggleMute() {
      this.settings.isMuted = !this.settings.isMuted;
      this.saveSettings();
      this.updateAudioVolume();
      this.showNotification(this.settings.isMuted ? this.t('notif_muted') : this.t('notif_unmuted'));
      if (window.Slope2UI) window.Slope2UI.updateMuteButton();
    }

    setMasterVolume(val) {
      this.settings.masterVolume = Math.max(0, Math.min(1, parseFloat(val)));
      this.settings.isMuted = false;
      this.saveSettings();
      this.updateAudioVolume();
    }

    // ========================================================
    // 3. RequestAnimationFrame & Optional Unlocked FPS
    // ========================================================
    hookRAF() {
      const self = this;
      const _origRAF = window.requestAnimationFrame.bind(window);
      window._origRAF = _origRAF;

      let lastTargetFrameTime = performance.now();

      window.requestAnimationFrame = function(callback) {
        if (self.isPaused) {
          const checkResume = () => {
            if (!self.isPaused) {
              window.requestAnimationFrame(callback);
            } else {
              setTimeout(checkResume, 50);
            }
          };
          setTimeout(checkResume, 50);
          return 0;
        }

        const wrappedCallback = (timestamp) => {
          const now = performance.now();
          const dt = now - self.lastFrameTime;
          self.lastFrameTime = now;
          self.frametime = dt;

          self.frameCount++;
          if (now - self.lastFpsUpdate >= 500) {
            self.fps = Math.round((self.frameCount * 1000) / (now - self.lastFpsUpdate));
            self.frameCount = 0;
            self.lastFpsUpdate = now;

            self.fpsHistory.push(self.fps);
            if (self.fpsHistory.length > 30) self.fpsHistory.shift();
            self.fpsMin = Math.min(...self.fpsHistory);
            self.fpsMax = Math.max(...self.fpsHistory);

            if (self.settings.nerdStats && window.Slope2UI) {
              window.Slope2UI.updateNerdStats();
            }
          }

          callback(timestamp);
        };

        // Smooth limiter: if Unlocked FPS is enabled and target is not vsync/unlimited
        if (self.settings.unlockedFps && self.settings.targetFps !== 'vsync' && self.settings.targetFps !== 'unlimited') {
          const target = parseInt(self.settings.targetFps, 10);
          if (!isNaN(target) && target > 0) {
            const minInterval = 1000 / target;
            const now = performance.now();
            const elapsed = now - lastTargetFrameTime;
            if (elapsed < minInterval - 1.0) {
              // Frame skipping via next requestAnimationFrame tick (no thread blocking)
              return _origRAF(() => window.requestAnimationFrame(callback));
            }
            lastTargetFrameTime = now;
          }
        }

        // Native monitor VSync (smooth, zero CPU overhead) or unlimited
        return _origRAF(wrappedCallback);
      };
    }

    // ========================================================
    // 4. Dynamic Resolution (Render Scale)
    // ========================================================
    applyRenderScale() {
      if (!this.mainCanvas) {
        this.mainCanvas = document.querySelector("#unity-canvas");
      }
      if (!this.mainCanvas) return;

      const scale = parseFloat(this.settings.renderScale) || 1.0;
      if (Math.abs(scale - 1.0) < 0.01) {
        return;
      }

      const displayW = this.mainCanvas.clientWidth || window.innerWidth;
      const displayH = this.mainCanvas.clientHeight || window.innerHeight;

      const targetW = Math.max(320, Math.round(displayW * scale));
      const targetH = Math.max(240, Math.round(displayH * scale));

      if (this.mainCanvas.width !== targetW || this.mainCanvas.height !== targetH) {
        this.mainCanvas.width = targetW;
        this.mainCanvas.height = targetH;
      }
    }

    setRenderScale(scale) {
      this.settings.renderScale = Math.max(0.5, Math.min(2.0, parseFloat(scale)));
      this.saveSettings();
      this.applyRenderScale();
      if (this.settings.nerdStats && window.Slope2UI) {
        window.Slope2UI.updateNerdStats();
      }
    }

    // ========================================================
    // 5. Quality of Life: Instant Restart & Pause
    // ========================================================
    instantRestart() {
      if (window.unityInstance) {
        try {
          window.unityInstance.SendMessage("GmSoft", "LoadTargetScene");
          this.showNotification(this.t('notif_restarted'));
        } catch (e) {
          console.warn("[Slope2Mods] Instant restart failed:", e);
        }
      }
      const canvas = document.getElementById('unity-canvas');
      if (canvas) {
        const spaceDown = new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true });
        const spaceUp = new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true });
        canvas.dispatchEvent(spaceDown);
        setTimeout(() => canvas.dispatchEvent(spaceUp), 50);
      }
    }

    setPause(pause) {
      if (this.settings.pauseOnMenu) {
        this.isPaused = pause;
      }
    }

    // ========================================================
    // 6. Typography Manager
    // ========================================================
    applyFont(fontName, customUrl = null) {
      this.settings.currentFont = fontName;
      let fontUrl = customUrl;

      if (!fontUrl) {
        const fontMap = {
          'Anton': 'mods/fonts/Anton.otf',
          'Bangers': 'mods/fonts/Bangers.otf',
          'Electronic Highway': 'mods/fonts/Electronic Highway Sign.otf',
          'Liberation Sans': 'mods/fonts/LiberationSans.otf',
          'Oswald Bold': 'mods/fonts/Oswald-Bold.otf',
          'Roboto Bold': 'mods/fonts/Roboto-Bold.otf',
          'Square': 'mods/fonts/Square.otf',
          'Arial': 'mods/fonts/Arial.otf'
        };
        fontUrl = fontMap[fontName] || fontMap['Anton'];
      }

      let styleEl = document.getElementById('slope2-dynamic-font');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'slope2-dynamic-font';
        document.head.appendChild(styleEl);
      }

      const fontFaceName = 'Slope2CustomFont';
      styleEl.textContent = `
        @font-face {
          font-family: '${fontFaceName}';
          src: url('${fontUrl}') format('opentype');
          font-weight: normal;
          font-style: normal;
        }
        body, #loading-bar, #slope2-mod-menu, #slope2-nerd-stats, .slope2-hud-text {
          font-family: '${fontFaceName}', 'Segoe UI', Roboto, sans-serif !important;
        }
      `;

      this.saveSettings();
      this.showNotification(this.t('notif_font_loaded') + ` (${fontName})`);
    }

    // ========================================================
    // 7. Custom Background Engine (Native Alpha Clear, Zero Ghosting)
    // ========================================================
    applyBackground() {
      let bgEl = document.getElementById('slope2-custom-bg');
      if (!bgEl) {
        bgEl = document.createElement('div');
        bgEl.id = 'slope2-custom-bg';
        const container = document.getElementById('unity-container') || document.body;
        container.insertBefore(bgEl, container.firstChild);
      }

      const canvas = document.getElementById('unity-canvas');

      if (this.settings.bgType === 'default') {
        bgEl.style.display = 'none';
        if (canvas) {
          canvas.style.backgroundColor = '#000000';
          canvas.style.mixBlendMode = 'normal';
        }
        this.updateAllProgramUniforms();
        return;
      }

      bgEl.style.display = 'block';
      bgEl.style.position = 'absolute';
      bgEl.style.top = '0';
      bgEl.style.left = '0';
      bgEl.style.width = '100%';
      bgEl.style.height = '100%';
      bgEl.style.zIndex = '0';
      bgEl.style.pointerEvents = 'none';
      bgEl.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
      bgEl.style.opacity = this.settings.bgOpacity;
      bgEl.style.filter = `blur(${this.settings.bgBlur}px)`;

      if (canvas) {
        canvas.style.position = 'relative';
        canvas.style.zIndex = '1';
        canvas.style.backgroundColor = 'transparent';
        canvas.style.mixBlendMode = 'normal';
      }

      const scale = this.settings.bgScale || 'cover';
      switch (this.settings.bgType) {
        case 'color':
          bgEl.style.backgroundImage = 'none';
          bgEl.style.backgroundColor = this.settings.bgColor;
          break;
        case 'gradient':
          bgEl.style.backgroundColor = 'transparent';
          bgEl.style.backgroundImage = this.settings.bgGradient;
          break;
        case 'image':
          bgEl.style.backgroundColor = 'transparent';
          bgEl.style.backgroundImage = `url("${this.settings.bgImage}")`;
          if (scale === 'contain') {
            bgEl.style.backgroundSize = 'contain';
            bgEl.style.backgroundPosition = 'center';
            bgEl.style.backgroundRepeat = 'no-repeat';
          } else if (scale === 'stretch') {
            bgEl.style.backgroundSize = '100% 100%';
            bgEl.style.backgroundPosition = 'center';
            bgEl.style.backgroundRepeat = 'no-repeat';
          } else if (scale === 'center') {
            bgEl.style.backgroundSize = 'auto';
            bgEl.style.backgroundPosition = 'center';
            bgEl.style.backgroundRepeat = 'no-repeat';
          } else if (scale === 'tile') {
            bgEl.style.backgroundSize = 'auto';
            bgEl.style.backgroundPosition = 'top left';
            bgEl.style.backgroundRepeat = 'repeat';
          } else { // cover
            bgEl.style.backgroundSize = 'cover';
            bgEl.style.backgroundPosition = 'center';
            bgEl.style.backgroundRepeat = 'no-repeat';
          }
          break;
      }

      this.updateAllProgramUniforms();
    }

    // ========================================================
    // 8. Post-Processing & Neon Colors
    // ========================================================
    initSvgFilters() {
      const attach = () => {
        if (!document.body || document.getElementById('slope2-svg-filters')) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'slope2-svg-filters';
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.pointerEvents = 'none';
        document.body.appendChild(svg);
      };

      if (document.body) {
        attach();
      } else {
        document.addEventListener('DOMContentLoaded', attach);
      }
    }

    applyColors() {
      this.updateAllProgramUniforms();
      this.applyPostProcessing();
    }

    applyPostProcessing() {
      const canvas = document.getElementById('unity-canvas');
      if (!canvas) return;

      let filterParts = [];

      if (this.settings.gfxBloom) {
        filterParts.push('drop-shadow(0 0 10px rgba(0,255,100,0.5))');
      }
      if (this.settings.gfxSharpen) {
        filterParts.push('contrast(1.12) brightness(1.03)');
      }
      if (this.settings.gfxHdr) {
        filterParts.push('saturate(1.35) contrast(1.18)');
      }

      canvas.style.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

      let vigEl = document.getElementById('slope2-vignette-overlay');
      if (!vigEl) {
        vigEl = document.createElement('div');
        vigEl.id = 'slope2-vignette-overlay';
        document.body.appendChild(vigEl);
      }
      vigEl.style.display = this.settings.gfxVignette ? 'block' : 'none';
    }

    // ========================================================
    // Helper: i18n Translation & Notification
    // ========================================================
    t(key) {
      const lang = this.settings.lang || 'en';
      const dict = window.SLOPE2_I18N ? window.SLOPE2_I18N[lang] : null;
      return (dict && dict[key]) || key;
    }

    showNotification(msg) {
      let notif = document.getElementById('slope2-notification');
      if (!notif) {
        notif = document.createElement('div');
        notif.id = 'slope2-notification';
        document.body.appendChild(notif);
      }
      notif.textContent = msg;
      notif.className = 'show';
      clearTimeout(this._notifTimer);
      this._notifTimer = setTimeout(() => {
        notif.className = '';
      }, 2200);
    }
  }

  window.Slope2Engine = new Slope2ModEngine();
})();
