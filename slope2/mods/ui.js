// ========================================================
// Slope 2 WebGL - UI Controller & Menu View
// ========================================================

(function() {
  'use strict';

  class Slope2UIController {
    constructor(engine) {
      this.engine = engine;
      this.activeTab = 'appearance';
      this.initDOM();
      this.bindShortcuts();
      this.applyInitialState();
    }

    t(key) {
      return this.engine.t(key);
    }

    initDOM() {
      // 1. Gear Trigger Button
      const btn = document.createElement('button');
      btn.id = 'slope2-menu-btn';
      btn.title = "Settings & Mods (P)";
      btn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      `;
      btn.onclick = () => this.toggleMenu();
      document.body.appendChild(btn);

      // 2. Nerd Stats (Minecraft F3 Overlay)
      const stats = document.createElement('div');
      stats.id = 'slope2-nerd-stats';
      stats.innerHTML = `
        <div><span id="stat-title" style="color:var(--neon-green); font-weight:bold;">SLOPE 2 // NERD STATS</span></div>
        <div>FPS: <span id="stat-fps" class="stat-val">60</span> (<span id="stat-fps-low" class="stat-val">60</span> 1% low) | Frametime: <span id="stat-frametime" class="stat-val">16.6ms</span></div>
        <div>Resolution: <span id="stat-res" class="stat-val">1920x1080</span> (Scale: <span id="stat-scale" class="stat-val">1.0x</span>)</div>
        <div>GPU: <span id="stat-gpu" class="stat-val">WebGL 2.0</span></div>
        <div>JS Heap: <span id="stat-mem" class="stat-val">N/A</span></div>
        <div>Audio: <span id="stat-vol" class="stat-val">100%</span></div>
        <div>Active Enhancements: <span id="stat-mods" class="stat-val">None</span></div>
      `;
      document.body.appendChild(stats);

      // 3. Mod Menu Modal
      const menu = document.createElement('div');
      menu.id = 'slope2-mod-menu';
      menu.innerHTML = `
        <div class="slope2-modal">
          <!-- Header -->
          <div class="slope2-header">
            <div class="slope2-title-box">
              <h2 id="i18n-title">${this.t('title')}</h2>
              <p id="i18n-subtitle">${this.t('subtitle')}</p>
            </div>
            <div class="slope2-header-controls">
              <select id="slope2-lang" class="slope2-lang-select">
                <option value="en">English (US)</option>
                <option value="fr">Français</option>
                <option value="bs">Bosanski</option>
              </select>
              <button class="slope2-close-btn" id="slope2-modal-close">&times;</button>
            </div>
          </div>

          <!-- Body -->
          <div class="slope2-body">
            <!-- Sidebar Navigation -->
            <div class="slope2-sidebar">
              <button class="slope2-tab-btn active" data-tab="appearance">🎨 <span id="i18n-tab-appearance">${this.t('tab_appearance')}</span></button>
              <button class="slope2-tab-btn" data-tab="graphics">✨ <span id="i18n-tab-graphics">${this.t('tab_graphics')}</span></button>
              <button class="slope2-tab-btn" data-tab="performance">⚡ <span id="i18n-tab-performance">${this.t('tab_performance')}</span></button>
              <button class="slope2-tab-btn" data-tab="audio_qol">🎵 <span id="i18n-tab-audio-qol">${this.t('tab_audio_qol')}</span></button>
              <button class="slope2-tab-btn" data-tab="fonts">🔤 <span id="i18n-tab-fonts">${this.t('tab_fonts')}</span></button>
              <button class="slope2-tab-btn" data-tab="profile">💾 <span id="i18n-tab-profile">${this.t('tab_profile')}</span></button>
            </div>

            <!-- Content Panels -->
            <div class="slope2-content">
              <!-- Panel: Appearance -->
              <div class="slope2-panel active" id="panel-appearance">
                <!-- Background Customizer -->
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-bg-title">${this.t('bg_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-bg-type">${this.t('bg_type')}</span></div>
                    <select id="mod-bg-type" class="slope2-select">
                      <option value="default">${this.t('bg_default')}</option>
                      <option value="color">${this.t('bg_color')}</option>
                      <option value="gradient">${this.t('bg_gradient')}</option>
                      <option value="image">${this.t('bg_image')}</option>
                    </select>
                  </div>

                  <div class="slope2-row" id="row-bg-color" style="display:none;">
                    <div class="slope2-label"><span id="i18n-bg-color">${this.t('bg_color')}</span></div>
                    <input type="color" id="mod-bg-color" class="slope2-color-input" value="#000000">
                  </div>

                  <div class="slope2-row" id="row-bg-preset" style="display:none;">
                    <div class="slope2-label"><span id="i18n-bg-presets">${this.t('bg_builtin_presets')}</span></div>
                    <select id="mod-bg-preset" class="slope2-select">
                      <option value="">${this.t('bg_none')}</option>
                      <option value="mods/backgrounds/cyber_grid.svg">${this.t('bg_cyber_grid')}</option>
                      <option value="mods/backgrounds/synthwave_sunset.svg">${this.t('bg_synthwave')}</option>
                      <option value="mods/backgrounds/deep_space.svg">${this.t('bg_deep_space')}</option>
                    </select>
                  </div>

                  <div class="slope2-row" id="row-bg-upload" style="display:none;">
                    <div class="slope2-label"><span id="i18n-bg-upload">${this.t('bg_upload')}</span></div>
                    <div>
                      <label class="slope2-file-label" for="mod-bg-file">Browse File...</label>
                      <input type="file" id="mod-bg-file" accept="image/*" style="display:none;">
                    </div>
                  </div>

                  <div class="slope2-row" id="row-bg-scale" style="display:none;">
                    <div class="slope2-label"><span id="i18n-bg-scale">${this.t('bg_scale')}</span></div>
                    <select id="mod-bg-scale" class="slope2-select">
                      <option value="cover">${this.t('bg_scale_cover')}</option>
                      <option value="contain">${this.t('bg_scale_contain')}</option>
                      <option value="stretch">${this.t('bg_scale_stretch')}</option>
                      <option value="center">${this.t('bg_scale_center')}</option>
                      <option value="tile">${this.t('bg_scale_tile')}</option>
                    </select>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-bg-opacity">${this.t('bg_opacity')}</span></div>
                    <div class="slope2-range-box">
                      <input type="range" id="mod-bg-opacity" class="slope2-range" min="0.1" max="1.0" step="0.05" value="1.0">
                      <span id="val-bg-opacity" class="slope2-range-val">100%</span>
                    </div>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-bg-blur">${this.t('bg_blur')}</span></div>
                    <div class="slope2-range-box">
                      <input type="range" id="mod-bg-blur" class="slope2-range" min="0" max="20" step="1" value="0">
                      <span id="val-bg-blur" class="slope2-range-val">0px</span>
                    </div>
                  </div>
                </div>

                <!-- Neon Colors -->
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-color-title">${this.t('color_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-color-track">${this.t('color_track')}</span></div>
                    <input type="color" id="mod-color-track" class="slope2-color-input" value="#00FF2F">
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-color-ball">${this.t('color_ball')}</span></div>
                    <input type="color" id="mod-color-ball" class="slope2-color-input" value="#00FFD9">
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-color-hazard">${this.t('color_hazard')}</span></div>
                    <input type="color" id="mod-color-hazard" class="slope2-color-input" value="#F30505">
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label"><span id="i18n-color-fog">${this.t('color_fog')}</span></div>
                    <input type="color" id="mod-color-fog" class="slope2-color-input" value="#050515">
                  </div>

                  <div class="slope2-row">
                    <button class="slope2-btn" id="btn-reset-colors">${this.t('color_reset')}</button>
                  </div>
                </div>
              </div>

              <!-- Panel: Graphics -->
              <div class="slope2-panel" id="panel-graphics">
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-gfx-title">${this.t('gfx_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('gfx_bloom')}<span>High-intensity neon wireframe bloom glow</span></div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-gfx-bloom"><span class="slope2-slider"></span></label>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('gfx_sharpen')}<span>Pixel-perfect high-frequency edge sharpening</span></div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-gfx-sharpen"><span class="slope2-slider"></span></label>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('gfx_vignette')}<span>Subtle chromatic aberration & cinematic dark edges</span></div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-gfx-vignette"><span class="slope2-slider"></span></label>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('gfx_hdr')}<span>Punchy color saturation & deep black contrast</span></div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-gfx-hdr"><span class="slope2-slider"></span></label>
                  </div>
                </div>
              </div>

              <!-- Panel: Performance -->
              <div class="slope2-panel" id="panel-performance">
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-perf-title">${this.t('perf_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('perf_fps_unlocked')}<span>Allows game loop to exceed screen refresh rate</span></div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-perf-unlocked"><span class="slope2-slider"></span></label>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('perf_target_fps')}</div>
                    <select id="mod-target-fps" class="slope2-select">
                      <option value="vsync">${this.t('perf_fps_vsync')}</option>
                      <option value="60">60 FPS</option>
                      <option value="120">120 FPS</option>
                      <option value="144">144 FPS</option>
                      <option value="240">240 FPS</option>
                      <option value="unlimited">${this.t('perf_fps_unlimited')}</option>
                    </select>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('perf_render_scale')}<span>${this.t('perf_scale_desc')}</span></div>
                    <div class="slope2-range-box">
                      <input type="range" id="mod-render-scale" class="slope2-range" min="0.5" max="2.0" step="0.1" value="1.0">
                      <span id="val-render-scale" class="slope2-range-val">1.0x</span>
                    </div>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('perf_f3_stats')}<span>Toggle with [F3] key anytime</span></div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-f3-stats"><span class="slope2-slider"></span></label>
                  </div>
                </div>
              </div>

              <!-- Panel: Audio & QoL -->
              <div class="slope2-panel" id="panel-audio_qol">
                <!-- Quality of Life -->
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-qol-title">${this.t('qol_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('qol_volume')}</div>
                    <div class="slope2-range-box">
                      <input type="range" id="mod-master-volume" class="slope2-range" min="0" max="1" step="0.05" value="1.0">
                      <span id="val-master-volume" class="slope2-range-val">100%</span>
                    </div>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('qol_mute')}<span>Press [M] to toggle instantly</span></div>
                    <button class="slope2-btn" id="btn-toggle-mute">Mute Audio</button>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('qol_instant_restart')}<span>${this.t('qol_instant_restart_desc')}</span></div>
                    <button class="slope2-btn" id="btn-instant-restart">Restart Run [R]</button>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('qol_pause_on_menu')}</div>
                    <label class="slope2-switch"><input type="checkbox" id="mod-pause-menu" checked><span class="slope2-slider"></span></label>
                  </div>
                </div>

                <!-- Custom Music Player -->
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-music-title">${this.t('music_title')}</div>
                  
                  <div class="slope2-music-card">
                    <div class="slope2-music-track-info">
                      <div class="slope2-music-icon" id="music-icon">🎵</div>
                      <div class="slope2-music-details">
                        <div class="slope2-music-title" id="music-track-title">Back On Track</div>
                        <div class="slope2-music-status" id="music-track-status">Stopped</div>
                      </div>
                    </div>

                    <div class="slope2-music-btns">
                      <button class="slope2-music-ctrl-btn" id="btn-music-prev" title="Previous">⏮</button>
                      <button class="slope2-music-ctrl-btn play-btn" id="btn-music-play">▶ Play</button>
                      <button class="slope2-music-ctrl-btn" id="btn-music-next" title="Next">⏭</button>
                      <button class="slope2-music-ctrl-btn" id="btn-music-loop" title="Loop">🔁</button>
                    </div>

                    <div class="slope2-row">
                      <div class="slope2-label"><span id="i18n-music-playlist">${this.t('music_playlist')}</span></div>
                      <select id="mod-music-select" class="slope2-select" style="max-width: 220px;"></select>
                    </div>

                    <div class="slope2-row">
                      <div class="slope2-label"><span id="i18n-music-volume">${this.t('music_volume')}</span></div>
                      <div class="slope2-range-box">
                        <input type="range" id="mod-music-volume" class="slope2-range" min="0" max="1" step="0.05" value="0.8">
                        <span id="val-music-volume" class="slope2-range-val">80%</span>
                      </div>
                    </div>

                    <div class="slope2-row">
                      <div class="slope2-label"><span id="i18n-music-unity-mode">${this.t('music_unity_mode')}</span></div>
                      <select id="mod-music-unity-mode" class="slope2-select">
                        <option value="mute_bgm">${this.t('music_mute_bgm_keep_sfx')}</option>
                        <option value="mute_all">${this.t('music_mute_all_unity')}</option>
                        <option value="keep_all">${this.t('music_keep_all_unity')}</option>
                      </select>
                    </div>

                    <div class="slope2-row">
                      <div class="slope2-label"><span id="i18n-music-import">${this.t('music_import')}</span></div>
                      <div>
                        <label class="slope2-file-label" for="mod-music-file" id="i18n-music-import-btn">${this.t('music_import_btn')}</label>
                        <input type="file" id="mod-music-file" accept="audio/*" multiple style="display:none;">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Panel: Fonts -->
              <div class="slope2-panel" id="panel-fonts">
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-font-title">${this.t('font_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('font_select')}</div>
                    <select id="mod-font-select" class="slope2-select">
                      <option value="Anton">Anton (Original Slope 2)</option>
                      <option value="Bangers">Bangers (Arcade Comic)</option>
                      <option value="Electronic Highway">Electronic Highway Sign (Cyber)</option>
                      <option value="Liberation Sans">Liberation Sans (Clean Modern)</option>
                      <option value="Oswald Bold">Oswald Bold (Tall Display)</option>
                      <option value="Roboto Bold">Roboto Bold (Geometric)</option>
                      <option value="Square">Square (Pixel Retro)</option>
                      <option value="Arial">Arial (Standard)</option>
                    </select>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('font_upload')}<span>Load any .otf or .ttf from your computer</span></div>
                    <div>
                      <label class="slope2-file-label" for="mod-font-file">Browse Font File...</label>
                      <input type="file" id="mod-font-file" accept=".otf,.ttf,.woff,.woff2" style="display:none;">
                    </div>
                  </div>

                  <div class="slope2-row">
                    <button class="slope2-btn" id="btn-reset-font">${this.t('font_reset')}</button>
                  </div>
                </div>
              </div>

              <!-- Panel: Profiles -->
              <div class="slope2-panel" id="panel-profile">
                <div class="slope2-section">
                  <div class="slope2-section-title" id="i18n-profile-title">${this.t('profile_title')}</div>
                  
                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('profile_export')}<span>Save settings as JSON file</span></div>
                    <button class="slope2-btn" id="btn-export-profile">Export JSON</button>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('profile_import')}<span>Load settings from JSON file</span></div>
                    <div>
                      <label class="slope2-file-label" for="mod-import-file">Select JSON...</label>
                      <input type="file" id="mod-import-file" accept=".json" style="display:none;">
                    </div>
                  </div>

                  <div class="slope2-row">
                    <div class="slope2-label">${this.t('profile_reset_all')}</div>
                    <button class="slope2-btn slope2-btn-danger" id="btn-reset-factory">Reset Everything</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(menu);

      this.bindDOMEvents();
    }

    bindDOMEvents() {
      const self = this;
      const s = this.engine.settings;

      // Close button & overlay click
      document.getElementById('slope2-modal-close').onclick = () => this.toggleMenu(false);
      document.getElementById('slope2-mod-menu').onclick = (e) => {
        if (e.target.id === 'slope2-mod-menu') this.toggleMenu(false);
      };

      // Tab switcher
      const tabs = document.querySelectorAll('.slope2-tab-btn');
      tabs.forEach(tab => {
        tab.onclick = () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.dataset.tab;
          document.querySelectorAll('.slope2-panel').forEach(p => p.classList.remove('active'));
          const panel = document.getElementById(`panel-${target}`);
          if (panel) panel.classList.add('active');
          self.activeTab = target;
        };
      });

      // Language switcher
      const langSel = document.getElementById('slope2-lang');
      langSel.value = s.lang || 'en';
      langSel.onchange = (e) => {
        s.lang = e.target.value;
        self.engine.saveSettings();
        self.updateLanguageStrings();
      };

      // Background Type
      const bgTypeSel = document.getElementById('mod-bg-type');
      bgTypeSel.value = s.bgType;
      bgTypeSel.onchange = (e) => {
        s.bgType = e.target.value;
        self.updateBgVisibility();
        self.engine.applyBackground();
        self.engine.saveSettings();
      };

      // Background Solid Color
      const bgColor = document.getElementById('mod-bg-color');
      bgColor.value = s.bgColor || '#000000';
      bgColor.oninput = (e) => {
        s.bgColor = e.target.value;
        self.engine.applyBackground();
        self.engine.saveSettings();
      };

      // Background Presets
      const bgPreset = document.getElementById('mod-bg-preset');
      bgPreset.onchange = (e) => {
        if (e.target.value) {
          s.bgType = 'image';
          s.bgImage = e.target.value;
          bgTypeSel.value = 'image';
          self.updateBgVisibility();
          self.engine.applyBackground();
          self.engine.saveSettings();
          self.engine.showNotification(self.t('notif_bg_loaded'));
        }
      };

      // Background File Upload
      const bgFile = document.getElementById('mod-bg-file');
      bgFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            s.bgType = 'image';
            s.bgImage = evt.target.result;
            bgTypeSel.value = 'image';
            self.updateBgVisibility();
            self.engine.applyBackground();
            self.engine.saveSettings();
            self.engine.showNotification(self.t('notif_bg_loaded'));
          };
          reader.readAsDataURL(file);
        }
      };

      // Background Scaling
      const bgScale = document.getElementById('mod-bg-scale');
      if (bgScale) {
        bgScale.value = s.bgScale || 'cover';
        bgScale.onchange = (e) => {
          s.bgScale = e.target.value;
          self.engine.applyBackground();
          self.engine.saveSettings();
        };
      }

      // Background Opacity & Blur
      const bgOpacity = document.getElementById('mod-bg-opacity');
      const valBgOpacity = document.getElementById('val-bg-opacity');
      bgOpacity.value = s.bgOpacity;
      valBgOpacity.textContent = `${Math.round(s.bgOpacity * 100)}%`;
      bgOpacity.oninput = (e) => {
        s.bgOpacity = parseFloat(e.target.value);
        valBgOpacity.textContent = `${Math.round(s.bgOpacity * 100)}%`;
        self.engine.applyBackground();
        self.engine.saveSettings();
      };

      const bgBlur = document.getElementById('mod-bg-blur');
      const valBgBlur = document.getElementById('val-bg-blur');
      bgBlur.value = s.bgBlur;
      valBgBlur.textContent = `${s.bgBlur}px`;
      bgBlur.oninput = (e) => {
        s.bgBlur = parseInt(e.target.value, 10);
        valBgBlur.textContent = `${s.bgBlur}px`;
        self.engine.applyBackground();
        self.engine.saveSettings();
      };

      // Neon Colors
      const colTrack = document.getElementById('mod-color-track');
      const colBall = document.getElementById('mod-color-ball');
      const colHazard = document.getElementById('mod-color-hazard');
      const colFog = document.getElementById('mod-color-fog');

      colTrack.value = s.colorTrack;
      colBall.value = s.colorBall;
      colHazard.value = s.colorHazard;
      colFog.value = s.colorFog;

      colTrack.oninput = (e) => { s.colorTrack = e.target.value; self.engine.applyColors(); self.engine.saveSettings(); };
      colBall.oninput = (e) => { s.colorBall = e.target.value; self.engine.applyColors(); self.engine.saveSettings(); };
      colHazard.oninput = (e) => { s.colorHazard = e.target.value; self.engine.applyColors(); self.engine.saveSettings(); };
      colFog.oninput = (e) => { s.colorFog = e.target.value; self.engine.applyColors(); self.engine.saveSettings(); };

      document.getElementById('btn-reset-colors').onclick = () => {
        s.colorTrack = '#00FF2F';
        s.colorBall = '#00FFD9';
        s.colorHazard = '#F30505';
        s.colorFog = '#050515';
        colTrack.value = s.colorTrack;
        colBall.value = s.colorBall;
        colHazard.value = s.colorHazard;
        colFog.value = s.colorFog;
        self.engine.applyColors();
        self.engine.saveSettings();
        self.engine.showNotification(self.t('notif_saved'));
      };

      // Graphics Enhancements
      const gfxBloom = document.getElementById('mod-gfx-bloom');
      const gfxSharpen = document.getElementById('mod-gfx-sharpen');
      const gfxVignette = document.getElementById('mod-gfx-vignette');
      const gfxHdr = document.getElementById('mod-gfx-hdr');

      gfxBloom.checked = s.gfxBloom;
      gfxSharpen.checked = s.gfxSharpen;
      gfxVignette.checked = s.gfxVignette;
      gfxHdr.checked = s.gfxHdr;

      const updateGfx = () => {
        s.gfxBloom = gfxBloom.checked;
        s.gfxSharpen = gfxSharpen.checked;
        s.gfxVignette = gfxVignette.checked;
        s.gfxHdr = gfxHdr.checked;
        self.engine.applyPostProcessing();
        self.engine.saveSettings();
      };

      gfxBloom.onchange = updateGfx;
      gfxSharpen.onchange = updateGfx;
      gfxVignette.onchange = updateGfx;
      gfxHdr.onchange = updateGfx;

      // Performance: Unlocked FPS & Target FPS
      const perfUnlocked = document.getElementById('mod-perf-unlocked');
      const targetFps = document.getElementById('mod-target-fps');
      perfUnlocked.checked = s.unlockedFps;
      targetFps.value = s.targetFps;

      perfUnlocked.onchange = () => {
        s.unlockedFps = perfUnlocked.checked;
        self.engine.saveSettings();
      };
      targetFps.onchange = () => {
        s.targetFps = targetFps.value;
        self.engine.saveSettings();
      };

      // Performance: Render Scale
      const renderScale = document.getElementById('mod-render-scale');
      const valRenderScale = document.getElementById('val-render-scale');
      renderScale.value = s.renderScale;
      valRenderScale.textContent = `${s.renderScale.toFixed(1)}x`;
      renderScale.oninput = (e) => {
        const val = parseFloat(e.target.value);
        valRenderScale.textContent = `${val.toFixed(1)}x`;
        self.engine.setRenderScale(val);
      };

      // Performance: Nerd Stats F3
      const f3Stats = document.getElementById('mod-f3-stats');
      f3Stats.checked = s.nerdStats;
      f3Stats.onchange = () => {
        s.nerdStats = f3Stats.checked;
        document.getElementById('slope2-nerd-stats').style.display = s.nerdStats ? 'block' : 'none';
        self.engine.saveSettings();
      };

      // Audio & QoL
      const masterVol = document.getElementById('mod-master-volume');
      const valMasterVol = document.getElementById('val-master-volume');
      masterVol.value = s.masterVolume;
      valMasterVol.textContent = `${Math.round(s.masterVolume * 100)}%`;
      masterVol.oninput = (e) => {
        valMasterVol.textContent = `${Math.round(e.target.value * 100)}%`;
        self.engine.setMasterVolume(e.target.value);
      };

      const btnMute = document.getElementById('btn-toggle-mute');
      btnMute.onclick = () => {
        self.engine.toggleMute();
      };

      const pauseMenu = document.getElementById('mod-pause-menu');
      pauseMenu.checked = s.pauseOnMenu;
      pauseMenu.onchange = () => {
        s.pauseOnMenu = pauseMenu.checked;
        self.engine.saveSettings();
      };

      document.getElementById('btn-instant-restart').onclick = () => {
        self.engine.instantRestart();
      };

      // Custom Music Player Controls
      const musicPlayer = self.engine.musicPlayer;
      const btnMusicPlay = document.getElementById('btn-music-play');
      const btnMusicPrev = document.getElementById('btn-music-prev');
      const btnMusicNext = document.getElementById('btn-music-next');
      const btnMusicLoop = document.getElementById('btn-music-loop');
      const modMusicSelect = document.getElementById('mod-music-select');
      const modMusicVolume = document.getElementById('mod-music-volume');
      const valMusicVolume = document.getElementById('val-music-volume');
      const modMusicUnityMode = document.getElementById('mod-music-unity-mode');
      const modMusicFile = document.getElementById('mod-music-file');

      btnMusicPlay.onclick = () => musicPlayer.togglePlay();
      btnMusicPrev.onclick = () => musicPlayer.prev();
      btnMusicNext.onclick = () => musicPlayer.next();
      btnMusicLoop.onclick = () => musicPlayer.toggleLoop();

      modMusicSelect.onchange = (e) => {
        musicPlayer.loadTrack(parseInt(e.target.value, 10));
        musicPlayer.play();
      };

      modMusicVolume.value = musicPlayer.volume;
      valMusicVolume.textContent = `${Math.round(musicPlayer.volume * 100)}%`;
      modMusicVolume.oninput = (e) => {
        const val = parseFloat(e.target.value);
        valMusicVolume.textContent = `${Math.round(val * 100)}%`;
        musicPlayer.setVolume(val);
      };

      modMusicUnityMode.value = musicPlayer.unityAudioMode;
      modMusicUnityMode.onchange = (e) => {
        musicPlayer.setUnityAudioMode(e.target.value);
      };

      modMusicFile.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          musicPlayer.addFiles(e.target.files);
        }
      };

      // Typography
      const fontSel = document.getElementById('mod-font-select');
      fontSel.value = s.currentFont || 'Anton';
      fontSel.onchange = (e) => {
        self.engine.applyFont(e.target.value);
      };

      const fontFile = document.getElementById('mod-font-file');
      fontFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const fontName = file.name.replace(/\.[^/.]+$/, "");
            self.engine.applyFont(fontName, evt.target.result);
          };
          reader.readAsDataURL(file);
        }
      };

      document.getElementById('btn-reset-font').onclick = () => {
        fontSel.value = 'Anton';
        self.engine.applyFont('Anton');
      };

      // Profile Export / Import
      document.getElementById('btn-export-profile').onclick = () => this.exportProfile();

      const importFile = document.getElementById('mod-import-file');
      importFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = JSON.parse(evt.target.result);
              Object.assign(s, data);
              self.engine.saveSettings();
              self.applyInitialState();
              self.engine.showNotification(self.t('notif_profile_imported'));
            } catch (err) {
              alert("Invalid configuration JSON file!");
            }
          };
          reader.readAsText(file);
        }
      };

      document.getElementById('btn-reset-factory').onclick = () => {
        if (confirm("Restore all settings to original factory defaults?")) {
          localStorage.removeItem('slope2_mods_settings');
          location.reload();
        }
      };

      this.updateBgVisibility();
    }

    updateBgVisibility() {
      const type = this.engine.settings.bgType;
      document.getElementById('row-bg-color').style.display = (type === 'color') ? 'flex' : 'none';
      document.getElementById('row-bg-preset').style.display = (type === 'image') ? 'flex' : 'none';
      document.getElementById('row-bg-upload').style.display = (type === 'image') ? 'flex' : 'none';
      const rowScale = document.getElementById('row-bg-scale');
      if (rowScale) {
        rowScale.style.display = (type === 'image') ? 'flex' : 'none';
      }
    }

    bindShortcuts() {
      const self = this;
      window.addEventListener('keydown', (e) => {
        // Prevent hotkeys when typing in text inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          return;
        }

        // P: Toggle Mod Menu (ESC is disabled to avoid conflict with School-Fun panic key)
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          self.toggleMenu();
        }
        // F3: Toggle Nerd Stats
        else if (e.key === 'F3') {
          e.preventDefault();
          self.engine.settings.nerdStats = !self.engine.settings.nerdStats;
          self.engine.saveSettings();
          const cb = document.getElementById('mod-f3-stats');
          if (cb) cb.checked = self.engine.settings.nerdStats;
          document.getElementById('slope2-nerd-stats').style.display = self.engine.settings.nerdStats ? 'block' : 'none';
        }
        // R: Instant Restart
        else if (e.key === 'r' || e.key === 'R') {
          self.engine.instantRestart();
        }
        // M: Instant Mute/Unmute
        else if (e.key === 'm' || e.key === 'M') {
          self.engine.toggleMute();
        }
      });
    }

    toggleMenu(forceState) {
      const menu = document.getElementById('slope2-mod-menu');
      const willOpen = (forceState !== undefined) ? forceState : !menu.classList.contains('open');

      if (willOpen) {
        menu.classList.add('open');
        this.engine.menuOpen = true;
        this.engine.setPause(true);
      } else {
        menu.classList.remove('open');
        this.engine.menuOpen = false;
        this.engine.setPause(false);
      }
    }

    updateMuteButton() {
      const btn = document.getElementById('btn-toggle-mute');
      if (btn) {
        btn.textContent = this.engine.settings.isMuted ? "Unmute Audio" : "Mute Audio";
      }
    }

    updateLanguageStrings() {
      const t = (k) => this.t(k);
      const el = (id) => document.getElementById(id);

      if (el('i18n-title')) el('i18n-title').textContent = t('title');
      if (el('i18n-subtitle')) el('i18n-subtitle').textContent = t('subtitle');
      if (el('i18n-tab-appearance')) el('i18n-tab-appearance').textContent = t('tab_appearance');
      if (el('i18n-tab-graphics')) el('i18n-tab-graphics').textContent = t('tab_graphics');
      if (el('i18n-tab-performance')) el('i18n-tab-performance').textContent = t('tab_performance');
      if (el('i18n-tab-audio-qol')) el('i18n-tab-audio-qol').textContent = t('tab_audio_qol');
      if (el('i18n-tab-fonts')) el('i18n-tab-fonts').textContent = t('tab_fonts');
      if (el('i18n-tab-profile')) el('i18n-tab-profile').textContent = t('tab_profile');

      if (el('i18n-bg-title')) el('i18n-bg-title').textContent = t('bg_title');
      if (el('i18n-bg-type')) el('i18n-bg-type').textContent = t('bg_type');
      if (el('i18n-bg-presets')) el('i18n-bg-presets').textContent = t('bg_builtin_presets');
      if (el('i18n-bg-upload')) el('i18n-bg-upload').textContent = t('bg_upload');
      if (el('i18n-bg-scale')) el('i18n-bg-scale').textContent = t('bg_scale');
      const bgScaleSel = el('mod-bg-scale');
      if (bgScaleSel) {
        const curVal = bgScaleSel.value;
        bgScaleSel.innerHTML = `
          <option value="cover">${t('bg_scale_cover')}</option>
          <option value="contain">${t('bg_scale_contain')}</option>
          <option value="stretch">${t('bg_scale_stretch')}</option>
          <option value="center">${t('bg_scale_center')}</option>
          <option value="tile">${t('bg_scale_tile')}</option>
        `;
        bgScaleSel.value = curVal;
      }
      if (el('i18n-bg-opacity')) el('i18n-bg-opacity').textContent = t('bg_opacity');
      if (el('i18n-bg-blur')) el('i18n-bg-blur').textContent = t('bg_blur');

      if (el('i18n-color-title')) el('i18n-color-title').textContent = t('color_title');
      if (el('i18n-color-track')) el('i18n-color-track').textContent = t('color_track');
      if (el('i18n-color-ball')) el('i18n-color-ball').textContent = t('color_ball');
      if (el('i18n-color-hazard')) el('i18n-color-hazard').textContent = t('color_hazard');
      if (el('i18n-color-fog')) el('i18n-color-fog').textContent = t('color_fog');
      if (el('btn-reset-colors')) el('btn-reset-colors').textContent = t('color_reset');

      if (el('i18n-gfx-title')) el('i18n-gfx-title').textContent = t('gfx_title');
      if (el('i18n-perf-title')) el('i18n-perf-title').textContent = t('perf_title');
      if (el('i18n-qol-title')) el('i18n-qol-title').textContent = t('qol_title');
      if (el('i18n-font-title')) el('i18n-font-title').textContent = t('font_title');
      if (el('i18n-profile-title')) el('i18n-profile-title').textContent = t('profile_title');

      if (el('i18n-music-title')) el('i18n-music-title').textContent = t('music_title');
      if (el('i18n-music-playlist')) el('i18n-music-playlist').textContent = t('music_playlist');
      if (el('i18n-music-volume')) el('i18n-music-volume').textContent = t('music_volume');
      if (el('i18n-music-unity-mode')) el('i18n-music-unity-mode').textContent = t('music_unity_mode');
      if (el('i18n-music-import')) el('i18n-music-import').textContent = t('music_import');
      if (el('i18n-music-import-btn')) el('i18n-music-import-btn').textContent = t('music_import_btn');

      this.updateMusicUI();
    }

    updateMusicUI() {
      const player = this.engine.musicPlayer;
      if (!player) return;

      const track = player.currentTrack();
      const titleEl = document.getElementById('music-track-title');
      const statusEl = document.getElementById('music-track-status');
      const iconEl = document.getElementById('music-icon');
      const playBtn = document.getElementById('btn-music-play');
      const loopBtn = document.getElementById('btn-music-loop');
      const sel = document.getElementById('mod-music-select');

      if (titleEl && track) titleEl.textContent = track.name;
      if (statusEl) statusEl.textContent = player.isPlaying ? (this.t('music_now_playing') || "Playing") : "Paused / Stopped";
      if (iconEl) {
        if (player.isPlaying) iconEl.classList.add('playing');
        else iconEl.classList.remove('playing');
      }
      if (playBtn) {
        playBtn.textContent = player.isPlaying ? "⏸ " + (this.t('music_pause') || "Pause") : "▶ " + (this.t('music_play') || "Play");
      }
      if (loopBtn) {
        if (player.isLooping) loopBtn.classList.add('active');
        else loopBtn.classList.remove('active');
      }
      if (sel) {
        sel.innerHTML = player.playlist.map((t, i) =>
          `<option value="${i}" ${i === player.currentIndex ? 'selected' : ''}>${t.name}${t.isCustom ? ' (Custom)' : ''}</option>`
        ).join('');
      }
    }

    updateMusicProgress(currentTime, duration) {
      const statusEl = document.getElementById('music-track-status');
      const player = this.engine.musicPlayer;
      if (statusEl && player && player.isPlaying && duration) {
        const curMin = Math.floor(currentTime / 60);
        const curSec = Math.floor(currentTime % 60).toString().padStart(2, '0');
        const durMin = Math.floor(duration / 60);
        const durSec = Math.floor(duration % 60).toString().padStart(2, '0');
        statusEl.textContent = `${this.t('music_now_playing') || "Playing"} (${curMin}:${curSec} / ${durMin}:${durSec})`;
      }
    }

    updateNerdStats() {
      const e = this.engine;
      const el = (id) => document.getElementById(id);
      if (!el('stat-fps')) return;

      el('stat-fps').textContent = e.fps;
      el('stat-fps-low').textContent = e.fpsMin;
      el('stat-frametime').textContent = `${e.frametime.toFixed(1)}ms`;

      const canvas = e.mainCanvas || document.getElementById('unity-canvas');
      if (canvas) {
        el('stat-res').textContent = `${canvas.width}x${canvas.height}`;
        el('stat-scale').textContent = `${(e.settings.renderScale || 1.0).toFixed(1)}x`;
      }

      if (window.performance && window.performance.memory) {
        const usedMb = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        const totalMb = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
        el('stat-mem').textContent = `${usedMb}MB / ${totalMb}MB`;
      } else {
        el('stat-mem').textContent = "Supported on Chromium";
      }

      el('stat-vol').textContent = e.settings.isMuted ? "MUTED" : `${Math.round(e.settings.masterVolume * 100)}%`;

      const activeMods = [];
      if (e.settings.bgType !== 'default') activeMods.push("CustomBG");
      if (e.settings.gfxBloom) activeMods.push("Bloom");
      if (e.settings.gfxSharpen) activeMods.push("Sharpen");
      if (e.settings.gfxVignette) activeMods.push("Vignette");
      if (e.settings.gfxHdr) activeMods.push("HDR");
      if (e.settings.unlockedFps) activeMods.push("UnlockedFPS");
      el('stat-mods').textContent = activeMods.length > 0 ? activeMods.join(", ") : "Standard";
    }

    exportProfile() {
      const blob = new Blob([JSON.stringify(this.engine.settings, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slope2_mods_profile_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    applyInitialState() {
      this.engine.applyBackground();
      this.engine.applyPostProcessing();
      this.engine.applyFont(this.engine.settings.currentFont);
      this.engine.applyRenderScale();
      this.engine.updateAudioVolume();
      this.updateLanguageStrings();

      const bgScale = document.getElementById('mod-bg-scale');
      if (bgScale) bgScale.value = this.engine.settings.bgScale || 'cover';

      if (this.engine.settings.nerdStats) {
        document.getElementById('slope2-nerd-stats').style.display = 'block';
      }
    }
  }

  // Initialize UI once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.Slope2UI = new Slope2UIController(window.Slope2Engine);
    });
  } else {
    window.Slope2UI = new Slope2UIController(window.Slope2Engine);
  }
})();
