/**
 * Klip Maker — Editor de Video Completo
 * Soporta: Velocidad (0.25x-4x), Cortar (Split), Recortar (Trim), Copiar/Pegar/Duplicar,
 * Reordenar, Filtros visuales, Transiciones, Texto superpuesto arrastrable, Audio/Música y Exportación.
 */

(() => {
  // ==================== ESTADO GLOBAL ====================
  const state = {
    mediaLibrary: [], // { id, name, type: 'video'|'demo', duration, videoEl, url, demoTheme }
    clips: [],        // Secuencia de clips en la línea de tiempo
    texts: [],        // Capas de texto { id, content, start, end, x, y, font, size, color, bgColor, bgOpacity, anim }
    hudLayers: [],    // Capas HUD / Vida / Daño / Cámara { id, name, srcX, srcY, srcW, srcH, destX, destY, destScale, borderColor, labelText, borderRadius }
    gamerFrame: {
      type: 'none',   // 'none' | 'neon' | 'shooter' | 'twitch' | 'esports' | 'custom'
      color: '#ff6b00',
      channelTag: '',
      channelLogoImg: null,
      channelLogoName: '',
      badgeX: 0.5,
      badgeY: 0.06,
      badgeScale: 100,
      customImg: null,
      _lastBadgeBox: null
    },
    bgMusic: null,    // { name, url, audioEl, duration, volume: 0.6, fadeOut: true }

    selectedClipId: null,
    selectedTextId: null,
    selectedHudId: null,
    clipboardClip: null,

    currentTime: 0,
    isPlaying: false,
    pixelsPerSecond: 65,
    aspectRatio: '9:16-fhd',
    fitMode: 'center',

    showCenterGuides: true,
    snapToCenter: true,
    showTikTokSafeZone: false,
    snappedX: false,
    snappedY: false,

    history: [],
    historyIndex: -1,
    isExporting: false,
    cancelExportFlag: false
  };

  let uidCounter = 1;
  const uid = (prefix = 'id') => `${prefix}_${Date.now()}_${uidCounter++}`;

  // ==================== REFERENCIAS DOM ====================
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const canvasOverlayHint = document.getElementById('canvasOverlayHint');

  const videoFileInput = document.getElementById('videoFileInput');
  const audioFileInput = document.getElementById('audioFileInput');
  const dropZone = document.getElementById('dropZone');
  const mediaListEl = document.getElementById('mediaList');
  const mediaCountBadge = document.getElementById('mediaCountBadge');

  const currentTimeLabel = document.getElementById('currentTimeLabel');
  const totalTimeLabel = document.getElementById('totalTimeLabel');
  const activeClipBadge = document.getElementById('activeClipBadge');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');

  const timelineScrollArea = document.getElementById('timelineScrollArea');
  const timelineInner = document.getElementById('timelineInner');
  const timelineRuler = document.getElementById('timelineRuler');
  const trackText = document.getElementById('trackText');
  const trackVideo = document.getElementById('trackVideo');
  const trackAudio = document.getElementById('trackAudio');
  const playhead = document.getElementById('playhead');

  // Controles de pestaña Velocidad/Corte
  const speedControlsWrap = document.getElementById('speedControlsWrap');
  const speedClipLabel = document.getElementById('speedClipLabel');
  const clipSpeedSlider = document.getElementById('clipSpeedSlider');
  const speedValueBadge = document.getElementById('speedValueBadge');
  const quickSpeedSelect = document.getElementById('quickSpeedSelect');
  const clipTrimStart = document.getElementById('clipTrimStart');
  const clipTrimEnd = document.getElementById('clipTrimEnd');
  const clipDurationInfo = document.getElementById('clipDurationInfo');
  const clipZoomSlider = document.getElementById('clipZoomSlider');
  const zoomValueBadge = document.getElementById('zoomValueBadge');
  const clipPanXSlider = document.getElementById('clipPanXSlider');
  const panXValueBadge = document.getElementById('panXValueBadge');
  const clipPanYSlider = document.getElementById('clipPanYSlider');
  const panYValueBadge = document.getElementById('panYValueBadge');
  const clipCropLeft = document.getElementById('clipCropLeft');
  const clipCropRight = document.getElementById('clipCropRight');
  const clipCropTop = document.getElementById('clipCropTop');
  const clipCropBottom = document.getElementById('clipCropBottom');

  // Controles de pestaña Gamer / HUD
  const hudLayersListEl = document.getElementById('hudLayersList');
  const hudEditorWrap = document.getElementById('hudEditorWrap');
  const hudSourcePickerCanvas = document.getElementById('hudSourcePickerCanvas');
  const hudPickerCtx = hudSourcePickerCanvas ? hudSourcePickerCanvas.getContext('2d') : null;
  const hudSrcX = document.getElementById('hudSrcX');
  const hudSrcY = document.getElementById('hudSrcY');
  const hudSrcW = document.getElementById('hudSrcW');
  const hudSrcH = document.getElementById('hudSrcH');
  const hudDestX = document.getElementById('hudDestX');
  const hudDestY = document.getElementById('hudDestY');
  const hudDestScale = document.getElementById('hudDestScale');
  const hudScaleBadge = document.getElementById('hudScaleBadge');
  const hudBorderColor = document.getElementById('hudBorderColor');
  const hudLabelText = document.getElementById('hudLabelText');
  const hudBorderRadius = document.getElementById('hudBorderRadius');

  // Controles de Filtros
  const filterControlsWrap = document.getElementById('filterControlsWrap');
  const fltBrightness = document.getElementById('fltBrightness');
  const fltContrast = document.getElementById('fltContrast');
  const fltSaturate = document.getElementById('fltSaturate');
  const fltGrayscale = document.getElementById('fltGrayscale');
  const fltSepia = document.getElementById('fltSepia');
  const fltHue = document.getElementById('fltHue');
  const fltBlur = document.getElementById('fltBlur');
  const fltVignette = document.getElementById('fltVignette');

  // Controles de Transiciones
  const transitionControlsWrap = document.getElementById('transitionControlsWrap');
  const transDurationSlider = document.getElementById('transDurationSlider');
  const transDurationBadge = document.getElementById('transDurationBadge');
  const chkFadeOutClip = document.getElementById('chkFadeOutClip');

  // Controles de Texto
  const textEditorWrap = document.getElementById('textEditorWrap');
  const txtContent = document.getElementById('txtContent');
  const txtStart = document.getElementById('txtStart');
  const txtEnd = document.getElementById('txtEnd');
  const txtFont = document.getElementById('txtFont');
  const txtSize = document.getElementById('txtSize');
  const txtColor = document.getElementById('txtColor');
  const txtBgColor = document.getElementById('txtBgColor');
  const txtBgOpacity = document.getElementById('txtBgOpacity');
  const txtAnim = document.getElementById('txtAnim');

  // Controles de Audio
  const clipAudioWrap = document.getElementById('clipAudioWrap');
  const clipVolumeSlider = document.getElementById('clipVolumeSlider');
  const clipVolBadge = document.getElementById('clipVolBadge');
  const chkMuteClip = document.getElementById('chkMuteClip');
  const bgMusicStatus = document.getElementById('bgMusicStatus');
  const bgMusicControls = document.getElementById('bgMusicControls');
  const bgMusicVolumeSlider = document.getElementById('bgMusicVolumeSlider');
  const bgMusicVolBadge = document.getElementById('bgMusicVolBadge');
  const chkMusicFadeOut = document.getElementById('chkMusicFadeOut');

  // ==================== UTILIDADES ====================
  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.25s';
      setTimeout(() => t.remove(), 250);
    }, 2600);
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }

  function defaultFilters() {
    return {
      preset: 'normal',
      brightness: 100,
      contrast: 100,
      saturate: 100,
      grayscale: 0,
      sepia: 0,
      hue: 0,
      blur: 0,
      vignette: 0
    };
  }

  function createClipFromMedia(media, customStart = 0, customEnd = null) {
    const dur = media.duration || 6;
    const end = customEnd !== null ? customEnd : dur;
    return {
      id: uid('clip'),
      mediaId: media.id,
      name: media.name,
      sourceDuration: dur,
      trimStart: customStart,
      trimEnd: end,
      speed: 1.0,
      volume: 1.0,
      muted: false,
      flipH: false,
      flipV: false,
      zoom: 100,
      panX: 0,
      panY: 0,
      crop: { left: 0, right: 0, top: 0, bottom: 0 },
      filters: defaultFilters(),
      transition: {
        type: 'none',
        duration: 0.6,
        fadeOut: false
      }
    };
  }

  function cloneClip(clip) {
    return {
      ...clip,
      id: uid('clip'),
      crop: clip.crop ? { ...clip.crop } : { left: 0, right: 0, top: 0, bottom: 0 },
      filters: { ...clip.filters },
      transition: { ...clip.transition }
    };
  }

  // Calcula el tiempo de inicio y fin de cada clip en la línea de tiempo según su recorte y velocidad
  function computeClipRanges() {
    let cursor = 0;
    return state.clips.map((clip, index) => {
      const rawLength = Math.max(0.1, clip.trimEnd - clip.trimStart);
      const effectiveDuration = rawLength / clip.speed;
      const start = cursor;
      const end = cursor + effectiveDuration;
      cursor = end;
      return {
        clip,
        index,
        timelineStart: start,
        timelineEnd: end,
        effectiveDuration
      };
    });
  }

  function getTotalDuration() {
    const ranges = computeClipRanges();
    const videoEnd = ranges.length > 0 ? ranges[ranges.length - 1].timelineEnd : 0;
    const textEnd = state.texts.reduce((max, t) => Math.max(max, t.end), 0);
    return Math.max(videoEnd, textEnd);
  }

  function getSelectedClip() {
    return state.clips.find(c => c.id === state.selectedClipId) || null;
  }

  function getSelectedText() {
    return state.texts.find(t => t.id === state.selectedTextId) || null;
  }

  function getSelectedHudLayer() {
    return state.hudLayers.find(h => h.id === state.selectedHudId) || null;
  }

  function getClipAtTime(time) {
    const ranges = computeClipRanges();
    if (ranges.length === 0) return null;
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (time >= r.timelineStart && (time < r.timelineEnd || (i === ranges.length - 1 && time <= r.timelineEnd + 0.001))) {
        return r;
      }
    }
    // Durante la edición, nunca devolver null si hay clips (evita que la pantalla quede en negro al tocar los extremos)
    if (!state.isExporting) {
      if (time <= ranges[0].timelineStart) return ranges[0];
      if (time >= ranges[ranges.length - 1].timelineEnd) return ranges[ranges.length - 1];
    }
    return null;
  }

  // ==================== HISTORIAL (DESHACER / REHACER) ====================
  function saveStateSnapshot() {
    const snap = JSON.stringify({
      clips: state.clips,
      texts: state.texts,
      hudLayers: state.hudLayers,
      selectedClipId: state.selectedClipId,
      selectedTextId: state.selectedTextId,
      selectedHudId: state.selectedHudId
    });
    if (state.historyIndex >= 0 && state.history[state.historyIndex] === snap) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snap);
    if (state.history.length > 40) state.history.shift();
    state.historyIndex = state.history.length - 1;
    updateUndoRedoButtons();
  }

  function restoreSnapshot(snapStr) {
    const data = JSON.parse(snapStr);
    state.clips = data.clips;
    state.texts = data.texts;
    state.hudLayers = data.hudLayers || [];
    state.selectedClipId = data.selectedClipId;
    state.selectedTextId = data.selectedTextId;
    state.selectedHudId = data.selectedHudId || null;
    updateUndoRedoButtons();
    syncUIWithSelection();
    renderHudLayersList();
    renderTimeline();
    renderFrame();
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      restoreSnapshot(state.history[state.historyIndex]);
      showToast('↩ Deshecho');
    }
  }

  function redo() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      restoreSnapshot(state.history[state.historyIndex]);
      showToast('↪ Rehecho');
    }
  }

  function updateUndoRedoButtons() {
    document.getElementById('btnUndo').disabled = state.historyIndex <= 0;
    document.getElementById('btnRedo').disabled = state.historyIndex >= state.history.length - 1;
  }

  // ==================== MOTOR DE CAPTURA Y MEZCLA DE AUDIO (COMPATIBLE CON FILE:// Y MP4/AAC) ====================
  let audioCtx = null;

  function getOrCreateAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function getMediaCaptureStream(mediaEl) {
    if (!mediaEl) return null;
    try {
      if (typeof mediaEl.captureStream === 'function') {
        return mediaEl.captureStream();
      }
      if (typeof mediaEl.mozCaptureStream === 'function') {
        return mediaEl.mozCaptureStream();
      }
    } catch (err) {
      console.warn('Aviso al capturar stream del elemento:', err);
    }
    return null;
  }

  function ensureAudioMixer() {
    getOrCreateAudioContext();
  }

  function connectElementToAudioMixer(mediaEl) {
    if (!mediaEl) return;
    mediaEl.muted = false;
  }

  async function decodeBlobToAudioBuffer(blob) {
    if (!blob) return null;
    try {
      const actx = getOrCreateAudioContext();
      const arrayBuf = await blob.arrayBuffer();
      return await actx.decodeAudioData(arrayBuf.slice(0));
    } catch (err) {
      console.warn('Aviso al decodificar PCM de audio del archivo:', err);
      return null;
    }
  }

  async function buildTimelineOfflineAudioBuffer(totalDur, targetSampleRate = 48000) {
    const totalFrames = Math.max(1024, Math.ceil(totalDur * targetSampleRate));
    const OfflineCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtxClass) return null;

    // Asegurar que todos los clips de video y la música de fondo tengan su AudioBuffer decodificado en RAM
    for (const c of state.clips) {
      const m = state.mediaLibrary.find(item => item.id === c.mediaId);
      if (m && m.rawBlob && !m.audioBuffer && !m._audioDecodeFailed) {
        m.audioBuffer = await decodeBlobToAudioBuffer(m.rawBlob);
        if (!m.audioBuffer) m._audioDecodeFailed = true;
      }
    }
    if (state.bgMusic && state.bgMusic.rawBlob && !state.bgMusic.audioBuffer && !state.bgMusic._audioDecodeFailed) {
      state.bgMusic.audioBuffer = await decodeBlobToAudioBuffer(state.bgMusic.rawBlob);
      if (!state.bgMusic.audioBuffer) state.bgMusic._audioDecodeFailed = true;
    }

    const offlineCtx = new OfflineCtxClass(2, totalFrames, targetSampleRate);
    let hasAnyAudioSource = false;

    const ranges = computeClipRanges();
    ranges.forEach(({ clip, timelineStart }) => {
      if (clip.muted || clip.volume <= 0) return;
      const media = state.mediaLibrary.find(m => m.id === clip.mediaId);
      if (media && media.audioBuffer) {
        try {
          const src = offlineCtx.createBufferSource();
          src.buffer = media.audioBuffer;
          src.playbackRate.value = Math.max(0.25, Math.min(4.0, clip.speed || 1.0));

          const gain = offlineCtx.createGain();
          gain.gain.value = Math.max(0, Math.min(1, clip.volume));

          src.connect(gain);
          gain.connect(offlineCtx.destination);

          const maxBufDur = media.audioBuffer.duration;
          const startOffset = Math.max(0, Math.min(maxBufDur - 0.01, clip.trimStart));
          const rawPlayDur = Math.max(0.02, Math.min(maxBufDur - startOffset, clip.trimEnd - clip.trimStart));
          src.start(Math.max(0, timelineStart), startOffset, rawPlayDur);
          hasAnyAudioSource = true;
        } catch (err) {
          console.warn('Aviso al programar clip en OfflineAudioContext:', err);
        }
      }
    });

    if (state.bgMusic && state.bgMusic.audioBuffer && state.bgMusic.volume > 0) {
      try {
        const bgSrc = offlineCtx.createBufferSource();
        bgSrc.buffer = state.bgMusic.audioBuffer;

        const bgGain = offlineCtx.createGain();
        const baseVol = Math.max(0, Math.min(1, state.bgMusic.volume));
        bgGain.gain.setValueAtTime(baseVol, 0);
        if (state.bgMusic.fadeOut && totalDur > 0.5) {
          const fadeStart = Math.max(0, totalDur - 2.0);
          bgGain.gain.setValueAtTime(baseVol, fadeStart);
          bgGain.gain.linearRampToValueAtTime(0.0001, totalDur);
        }

        bgSrc.connect(bgGain);
        bgGain.connect(offlineCtx.destination);
        const playDur = Math.min(state.bgMusic.audioBuffer.duration, totalDur);
        bgSrc.start(0, 0, playDur);
        hasAnyAudioSource = true;
      } catch (err) {
        console.warn('Aviso al programar música de fondo en OfflineAudioContext:', err);
      }
    }

    if (!hasAnyAudioSource) {
      // Añadir tono inaudible (-80dB) si el proyecto no tiene pistas con sonido para que el archivo MP4 siempre tenga pista AAC válida
      const osc = offlineCtx.createOscillator();
      const g = offlineCtx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(offlineCtx.destination);
      osc.start(0);
      osc.stop(totalDur);
    }

    try {
      return await offlineCtx.startRendering();
    } catch (err) {
      console.warn('Error al renderizar mezcla de audio offline:', err);
      return null;
    }
  }

  // ==================== CARGA DE MEDIOS Y VIDEO DEMO ====================
  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('video/')) {
        loadVideoFile(file);
      } else if (file.type.startsWith('audio/')) {
        loadAudioFile(file);
      } else {
        showToast(`Formato no soportado: ${file.name}`);
      }
    });
  }

  // ==================== CACHÉ DE FOTOGRAMAS Y SCRUBBING FLUIDO SIN PANTALLA NEGRA ====================
  function updateMediaFrameCache(media) {
    if (!media || !media.videoEl) return;
    const v = media.videoEl;
    if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
      if (!media._cacheCanvas) {
        media._cacheCanvas = document.createElement('canvas');
      }
      const cw = v.videoWidth;
      const ch = v.videoHeight;
      if (media._cacheCanvas.width !== cw || media._cacheCanvas.height !== ch) {
        media._cacheCanvas.width = cw;
        media._cacheCanvas.height = ch;
      }
      try {
        const cctx = media._cacheCanvas.getContext('2d');
        cctx.drawImage(v, 0, 0, cw, ch);
        media._hasCachedFrame = true;
      } catch (_) {}
    }
  }

  function requestVideoSeek(media, targetTime) {
    if (!media || !media.videoEl) return;
    const v = media.videoEl;
    const maxDur = isFinite(v.duration) && v.duration > 0 ? v.duration : (media.duration || 10);
    const clamped = Math.max(0, Math.min(Math.max(0, maxDur - 0.01), targetTime));

    if (!v.seeking && Math.abs(v.currentTime - clamped) < 0.012) {
      updateMediaFrameCache(media);
      return;
    }

    if (v.seeking) {
      // Guardar el último punto solicitado mientras el decodificador termina el fotograma actual
      media._pendingSeekTime = clamped;
    } else {
      media._pendingSeekTime = null;
      try {
        v.currentTime = clamped;
      } catch (_) {}
    }
  }

  // Genera miniaturas reales (filmstrip) en segundo plano para mostrar los fotogramas dentro de la línea de tiempo
  function generateVideoFilmstrip(mediaItem) {
    if (!mediaItem || !mediaItem.url) return;
    const thumbVideo = document.createElement('video');
    thumbVideo.src = mediaItem.url;
    thumbVideo.muted = true;
    thumbVideo.preload = 'auto';
    thumbVideo.playsInline = true;

    const thumbCount = 8;
    const thumbs = [];

    thumbVideo.addEventListener('loadeddata', async () => {
      const dur = isFinite(thumbVideo.duration) && thumbVideo.duration > 0 ? thumbVideo.duration : mediaItem.duration;
      const tCanvas = document.createElement('canvas');
      tCanvas.width = 96;
      tCanvas.height = 54;
      const tCtx = tCanvas.getContext('2d');

      for (let i = 0; i < thumbCount; i++) {
        const sampleTime = Math.min(dur - 0.05, Math.max(0.01, ((i + 0.5) / thumbCount) * dur));
        await new Promise((resolve) => {
          const onSeek = () => {
            thumbVideo.removeEventListener('seeked', onSeek);
            resolve();
          };
          thumbVideo.addEventListener('seeked', onSeek);
          try {
            thumbVideo.currentTime = sampleTime;
          } catch (_) {
            resolve();
          }
          setTimeout(resolve, 250);
        });
        try {
          tCtx.drawImage(thumbVideo, 0, 0, tCanvas.width, tCanvas.height);
          thumbs.push(tCanvas.toDataURL('image/jpeg', 0.6));
        } catch (_) {}
      }

      mediaItem.thumbnails = thumbs;
      thumbVideo.src = '';
      renderTimeline();
    }, { once: true });
  }

  function loadVideoFile(file) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = false;
    video.volume = 1.0;
    video.loop = false;
    video.disablePictureInPicture = true;
    video.style.width = '2px';
    video.style.height = '2px';
    video.style.pointerEvents = 'none';

    // Montar en el DOM activo para evitar que el navegador congele (freeze) el decodificador de video
    const mediaPool = document.getElementById('hiddenMediaPool');
    if (mediaPool) {
      mediaPool.appendChild(video);
    }

    let initialLoadDone = false;
    let mediaItemRef = null;

    video.addEventListener('loadedmetadata', () => {
      if (initialLoadDone) return;
      initialLoadDone = true;
      connectElementToAudioMixer(video);
      const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
      const mediaItem = {
        id: uid('media'),
        name: file.name,
        type: 'video',
        duration,
        videoEl: video,
        url,
        rawBlob: file,
        audioBuffer: null,
        thumbnails: [],
        _cacheCanvas: null,
        _hasCachedFrame: false,
        _pendingSeekTime: null
      };
      mediaItemRef = mediaItem;
      decodeBlobToAudioBuffer(file).then(buf => {
        if (buf) mediaItem.audioBuffer = buf;
      });
      state.mediaLibrary.push(mediaItem);
      const newClip = createClipFromMedia(mediaItem);
      state.clips.push(newClip);
      state.selectedClipId = newClip.id;
      canvasOverlayHint.style.display = 'none';

      saveStateSnapshot();
      renderMediaLibrary();
      syncUIWithSelection();
      renderTimeline();

      // Decodificar el primer fotograma de inmediato para que nunca aparezca en negro
      try {
        video.currentTime = 0.001;
      } catch (_) {}
      generateVideoFilmstrip(mediaItem);
      showToast(`🎬 Video añadido: ${file.name}`);
    });

    video.addEventListener('loadeddata', () => {
      if (mediaItemRef) {
        updateMediaFrameCache(mediaItemRef);
        if (!state.isPlaying && !state.isExporting) renderFrame();
      }
    });

    // Al terminar cada búsqueda (seek), actualizar la caché de fotograma y redibujar al instante (scrubbing fotograma a fotograma)
    video.addEventListener('seeked', () => {
      if (!mediaItemRef) return;
      updateMediaFrameCache(mediaItemRef);
      if (!state.isPlaying && !state.isExporting) {
        renderFrame();
      }
      if (mediaItemRef._pendingSeekTime !== null && mediaItemRef._pendingSeekTime !== undefined) {
        const nextTarget = mediaItemRef._pendingSeekTime;
        mediaItemRef._pendingSeekTime = null;
        if (Math.abs(video.currentTime - nextTarget) > 0.012) {
          try {
            video.currentTime = nextTarget;
          } catch (_) {}
        }
      }
    });

    video.addEventListener('error', () => {
      if (!initialLoadDone) {
        showToast(`No se pudo decodificar el video: ${file.name}`);
      } else {
        // Auto-recuperación silenciosa si el decodificador de hardware D3D11 se reinicia durante edición/exportación
        const savedTime = video.currentTime || 0;
        const wasPlaying = state.isPlaying || state.isExporting;
        try {
          video.load();
          video.currentTime = savedTime;
          if (wasPlaying) video.play().catch(() => {});
        } catch (_) {}
      }
    });
  }

  function loadAudioFile(file) {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.preload = 'auto';

    audio.addEventListener('loadedmetadata', () => {
      if (state.bgMusic && state.bgMusic.audioEl) {
        state.bgMusic.audioEl.pause();
      }
      connectElementToAudioMixer(audio);
      state.bgMusic = {
        name: file.name,
        url,
        rawBlob: file,
        audioBuffer: null,
        audioEl: audio,
        duration: audio.duration || 30,
        volume: Number(bgMusicVolumeSlider.value) / 100,
        fadeOut: chkMusicFadeOut.checked
      };
      decodeBlobToAudioBuffer(file).then(buf => {
        if (buf && state.bgMusic && state.bgMusic.rawBlob === file) {
          state.bgMusic.audioBuffer = buf;
        }
      });
      updateAudioTabUI();
      renderTimeline();
      showToast(`🎵 Música de fondo cargada: ${file.name}`);
    });
  }

  // Genera escenas animadas de demostración para probar el editor sin archivos externos
  function loadDemoProject() {
    pausePlayback();
    const demoScenes = [
      { name: 'Escena 1: Ciudad Neón', duration: 6.0, theme: 'neon' },
      { name: 'Escena 2: Horizonte Solar', duration: 6.0, theme: 'sunset' },
      { name: 'Escena 3: Pulso Digital', duration: 6.0, theme: 'matrix' }
    ];

    const createdClips = [];
    demoScenes.forEach((sc, idx) => {
      const mediaItem = {
        id: uid('demo'),
        name: sc.name,
        type: 'demo',
        duration: sc.duration,
        demoTheme: sc.theme
      };
      state.mediaLibrary.push(mediaItem);
      const clip = createClipFromMedia(mediaItem, 0, sc.duration);
      if (idx > 0) {
        clip.transition.type = idx === 1 ? 'fade' : 'slide-left';
        clip.transition.duration = 0.7;
      }
      createdClips.push(clip);
    });

    state.clips.push(...createdClips);
    state.selectedClipId = createdClips[0].id;

    if (state.texts.length === 0) {
      state.texts.push({
        id: uid('txt'),
        content: '✨ DEMO INTERACTIVA — CORTA, VELOCIDAD Y EFECTOS',
        start: 0.4,
        end: 4.5,
        x: 0.5,
        y: 0.14,
        font: 'Inter, system-ui, sans-serif',
        size: 38,
        color: '#ffffff',
        bgColor: '#1e1b4b',
        bgOpacity: 75,
        anim: 'pop'
      });
    }

    canvasOverlayHint.style.display = 'none';
    if (!state.bgMusic) {
      generateAmbientSynthMusic(true);
    }
    saveStateSnapshot();
    renderMediaLibrary();
    syncUIWithSelection();
    renderTimeline();
    seekTo(0);
    showToast('✨ Proyecto Demo cargado con 3 escenas y pista de audio');
  }

  // Genera un archivo WAV sintético ambiental en memoria para probar la pista de música
  function generateAmbientSynthMusic(silentToast = false) {
    const sampleRate = 22050;
    const durationSeconds = 20;
    const numSamples = sampleRate * durationSeconds;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const chords = [
      [220, 277.18, 329.63], // A major
      [174.61, 220, 261.63], // F major
      [196.0, 246.94, 293.66], // G major
      [164.81, 207.65, 246.94] // E major
    ];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const chordIdx = Math.floor(t / 2.5) % chords.length;
      const [f1, f2, f3] = chords[chordIdx];
      const beatEnv = 0.65 + 0.35 * Math.sin(2 * Math.PI * 2 * t);
      const pad =
        (Math.sin(2 * Math.PI * f1 * t) +
          0.7 * Math.sin(2 * Math.PI * f2 * t) +
          0.5 * Math.sin(2 * Math.PI * f3 * t)) /
        2.4;
      const sample = Math.max(-1, Math.min(1, pad * beatEnv * 0.35));
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    connectElementToAudioMixer(audio);
    state.bgMusic = {
      name: 'Synth Ambiental (Generado).wav',
      url,
      rawBlob: blob,
      audioBuffer: null,
      audioEl: audio,
      duration: durationSeconds,
      volume: Number(bgMusicVolumeSlider.value) / 100,
      fadeOut: chkMusicFadeOut.checked
    };
    decodeBlobToAudioBuffer(blob).then(buf => {
      if (buf && state.bgMusic && state.bgMusic.rawBlob === blob) {
        state.bgMusic.audioBuffer = buf;
      }
    });
    updateAudioTabUI();
    renderTimeline();
    if (!silentToast) {
      showToast('🎵 Ritmo ambiental añadido a la pista de audio');
    }
  }

  function renderMediaLibrary() {
    mediaCountBadge.textContent = state.mediaLibrary.length;
    if (state.mediaLibrary.length === 0) {
      mediaListEl.innerHTML = `<div class="empty-hint">No hay archivos todavía. Importa un video o pulsa <b>"✨ Cargar Video Demo"</b> arriba.</div>`;
      return;
    }

    mediaListEl.innerHTML = '';
    state.mediaLibrary.forEach(item => {
      const card = document.createElement('div');
      card.className = 'media-card';
      card.innerHTML = `
        <div class="media-card-info">
          <div class="media-card-title">${item.type === 'demo' ? '✨ ' : '🎬 '}${item.name}</div>
          <div class="media-card-meta">Duración: ${item.duration.toFixed(1)}s</div>
        </div>
        <button class="btn btn-secondary btn-sm">+ Añadir</button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        const clip = createClipFromMedia(item);
        state.clips.push(clip);
        state.selectedClipId = clip.id;
        canvasOverlayHint.style.display = 'none';
        saveStateSnapshot();
        syncUIWithSelection();
        renderTimeline();
        renderFrame();
        showToast(`Clip añadido al final: ${item.name}`);
      });
      mediaListEl.appendChild(card);
    });
  }

  // ==================== OPERACIONES DE EDICIÓN: CORTAR, COPIAR, PEGAR, VELOCIDAD ====================
  function splitClipAtPlayhead() {
    if (state.clips.length === 0) {
      showToast('Primero importa un video o carga el video demo');
      return;
    }

    let targetRange = getClipAtTime(state.currentTime);
    let splitTimelineTime = state.currentTime;

    // Si el cabezal está en un borde exacto pero hay un clip seleccionado, permite dividir a la mitad del clip seleccionado
    if (!targetRange || splitTimelineTime - targetRange.timelineStart < 0.15 || targetRange.timelineEnd - splitTimelineTime < 0.15) {
      const ranges = computeClipRanges();
      const selRange = ranges.find(r => r.clip.id === state.selectedClipId);
      if (selRange && selRange.effectiveDuration >= 0.4) {
        targetRange = selRange;
        splitTimelineTime = selRange.timelineStart + selRange.effectiveDuration / 2;
        state.currentTime = splitTimelineTime;
      } else {
        showToast('Coloca el cabezal (línea roja) dentro del clip que deseas cortar');
        return;
      }
    }

    const { clip, index, timelineStart } = targetRange;
    const offsetInTimeline = splitTimelineTime - timelineStart;
    const splitSourceTime = clip.trimStart + offsetInTimeline * clip.speed;

    if (splitSourceTime - clip.trimStart < 0.1 || clip.trimEnd - splitSourceTime < 0.1) {
      showToast('El punto de corte está demasiado cerca del extremo del clip');
      return;
    }

    const firstPart = cloneClip(clip);
    firstPart.name = `${clip.name.replace(/ \(Parte \d+\)$/, '')} (Parte 1)`;
    firstPart.trimStart = clip.trimStart;
    firstPart.trimEnd = Number(splitSourceTime.toFixed(2));

    const secondPart = cloneClip(clip);
    secondPart.name = `${clip.name.replace(/ \(Parte \d+\)$/, '')} (Parte 2)`;
    secondPart.trimStart = Number(splitSourceTime.toFixed(2));
    secondPart.trimEnd = clip.trimEnd;

    state.clips.splice(index, 1, firstPart, secondPart);
    state.selectedClipId = secondPart.id;

    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
    showToast('✂️ Clip dividido en 2 partes independientes');
  }

  function copySelectedClip() {
    const clip = getSelectedClip();
    if (!clip) {
      showToast('Selecciona primero un clip en la línea de tiempo');
      return;
    }
    state.clipboardClip = cloneClip(clip);
    document.getElementById('btnPaste').disabled = false;
    showToast(`📋 Parte copiada: "${clip.name}"`);
  }

  function pasteClip() {
    if (!state.clipboardClip) {
      showToast('No hay ningún clip copiado en el portapapeles');
      return;
    }
    const newClip = cloneClip(state.clipboardClip);
    newClip.name = `${state.clipboardClip.name} (Copia)`;

    const curIdx = state.clips.findIndex(c => c.id === state.selectedClipId);
    if (curIdx >= 0) {
      state.clips.splice(curIdx + 1, 0, newClip);
    } else {
      state.clips.push(newClip);
    }
    state.selectedClipId = newClip.id;

    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
    showToast('📥 Parte pegada en la línea de tiempo');
  }

  function duplicateSelectedClip() {
    const clip = getSelectedClip();
    if (!clip) {
      showToast('Selecciona un clip para duplicar');
      return;
    }
    const dup = cloneClip(clip);
    dup.name = `${clip.name} (Duplicado)`;
    const idx = state.clips.findIndex(c => c.id === clip.id);
    state.clips.splice(idx + 1, 0, dup);
    state.selectedClipId = dup.id;

    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
    showToast('➕ Parte duplicada');
  }

  function moveSelectedClip(direction) {
    const idx = state.clips.findIndex(c => c.id === state.selectedClipId);
    if (idx < 0) {
      showToast('Selecciona un clip para moverlo');
      return;
    }
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= state.clips.length) return;

    const temp = state.clips[idx];
    state.clips[idx] = state.clips[targetIdx];
    state.clips[targetIdx] = temp;

    saveStateSnapshot();
    renderTimeline();
    renderFrame();
    showToast(direction < 0 ? '⬅ Segmento movido a la izquierda' : '➡ Segmento movido a la derecha');
  }

  function deleteSelectedItem() {
    if (state.selectedTextId) {
      state.texts = state.texts.filter(t => t.id !== state.selectedTextId);
      state.selectedTextId = null;
      saveStateSnapshot();
      syncUIWithSelection();
      renderTimeline();
      renderFrame();
      showToast('🗑️ Capa de texto eliminada');
      return;
    }

    if (state.selectedClipId) {
      const idx = state.clips.findIndex(c => c.id === state.selectedClipId);
      if (idx >= 0) {
        state.clips.splice(idx, 1);
        const nextClip = state.clips[idx] || state.clips[idx - 1] || null;
        state.selectedClipId = nextClip ? nextClip.id : null;
        if (state.currentTime > getTotalDuration()) {
          state.currentTime = Math.max(0, getTotalDuration());
        }
        saveStateSnapshot();
        syncUIWithSelection();
        renderTimeline();
        renderFrame();
        showToast('🗑️ Clip eliminado de la línea de tiempo');
      }
    }
  }

  function setClipSpeed(newSpeed, commitHistory = true) {
    const clip = getSelectedClip();
    if (!clip) return;
    const clamped = Math.max(0.25, Math.min(4.0, Number(newSpeed)));
    clip.speed = Number(clamped.toFixed(2));

    if (commitHistory) saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
  }

  // ==================== SINCRONIZACIÓN DE PANELES LATERALES ====================
  function syncUIWithSelection() {
    const clip = getSelectedClip();
    const textItem = getSelectedText();

    if (clip) {
      speedControlsWrap.classList.remove('disabled-group');
      filterControlsWrap.classList.remove('disabled-group');
      transitionControlsWrap.classList.remove('disabled-group');
      clipAudioWrap.classList.remove('disabled-group');

      speedClipLabel.textContent = `Editando: ${clip.name}`;
      activeClipBadge.textContent = `🎬 ${clip.name} (${clip.speed}x)`;

      clipSpeedSlider.value = clip.speed;
      speedValueBadge.textContent = `${clip.speed.toFixed(2)}x`;

      // Actualizar selector rápido y chips
      quickSpeedSelect.value = String(clip.speed);
      document.querySelectorAll('.speed-preset').forEach(btn => {
        btn.classList.toggle('active', Math.abs(Number(btn.dataset.speed) - clip.speed) < 0.02);
      });

      clipTrimStart.max = (clip.trimEnd - 0.1).toFixed(1);
      clipTrimStart.value = clip.trimStart.toFixed(1);
      clipTrimEnd.max = clip.sourceDuration.toFixed(1);
      clipTrimEnd.value = clip.trimEnd.toFixed(1);

      const effDur = ((clip.trimEnd - clip.trimStart) / clip.speed).toFixed(2);
      clipDurationInfo.innerHTML = `Duración efectiva en timeline: <strong>${effDur}s</strong> (Original: ${(clip.trimEnd - clip.trimStart).toFixed(1)}s a ${clip.speed}x)`;

      clipZoomSlider.value = clip.zoom || 100;
      zoomValueBadge.textContent = `${clip.zoom || 100}%`;

      const px = clip.panX || 0;
      const py = clip.panY || 0;
      if (clipPanXSlider) clipPanXSlider.value = px;
      if (panXValueBadge) panXValueBadge.textContent = px === 0 ? '0% (Centro)' : `${px > 0 ? '+' : ''}${px}%`;
      if (clipPanYSlider) clipPanYSlider.value = py;
      if (panYValueBadge) panYValueBadge.textContent = py === 0 ? '0% (Centro)' : `${py > 0 ? '+' : ''}${py}%`;

      const crop = clip.crop || { left: 0, right: 0, top: 0, bottom: 0 };
      if (clipCropLeft) clipCropLeft.value = crop.left || 0;
      if (clipCropRight) clipCropRight.value = crop.right || 0;
      if (clipCropTop) clipCropTop.value = crop.top || 0;
      if (clipCropBottom) clipCropBottom.value = crop.bottom || 0;

      // Filtros
      const f = clip.filters;
      fltBrightness.value = f.brightness;
      fltContrast.value = f.contrast;
      fltSaturate.value = f.saturate;
      fltGrayscale.value = f.grayscale;
      fltSepia.value = f.sepia;
      fltHue.value = f.hue;
      fltBlur.value = f.blur;
      fltVignette.value = f.vignette;

      document.getElementById('valBrightness').textContent = `${f.brightness}%`;
      document.getElementById('valContrast').textContent = `${f.contrast}%`;
      document.getElementById('valSaturate').textContent = `${f.saturate}%`;
      document.getElementById('valGrayscale').textContent = `${f.grayscale}%`;
      document.getElementById('valSepia').textContent = `${f.sepia}%`;
      document.getElementById('valHue').textContent = `${f.hue}°`;
      document.getElementById('valBlur').textContent = `${f.blur}px`;
      document.getElementById('valVignette').textContent = `${f.vignette}%`;

      document.querySelectorAll('.filter-preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === f.preset);
      });

      // Transiciones
      document.querySelectorAll('.trans-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.trans === clip.transition.type);
      });
      transDurationSlider.value = clip.transition.duration;
      transDurationBadge.textContent = `${clip.transition.duration.toFixed(1)}s`;
      chkFadeOutClip.checked = Boolean(clip.transition.fadeOut);

      // Audio del clip
      clipVolumeSlider.value = Math.round(clip.volume * 100);
      clipVolBadge.textContent = `${Math.round(clip.volume * 100)}%`;
      chkMuteClip.checked = clip.muted;
    } else {
      speedControlsWrap.classList.add('disabled-group');
      filterControlsWrap.classList.add('disabled-group');
      transitionControlsWrap.classList.add('disabled-group');
      clipAudioWrap.classList.add('disabled-group');
      speedClipLabel.textContent = 'Selecciona un clip en la línea de tiempo';
      activeClipBadge.textContent = 'Sin clip seleccionado';
    }

    if (textItem) {
      textEditorWrap.classList.remove('disabled-group');
      txtContent.value = textItem.content;
      txtStart.value = textItem.start.toFixed(1);
      txtEnd.value = textItem.end.toFixed(1);
      txtFont.value = textItem.font;
      txtSize.value = textItem.size;
      txtColor.value = textItem.color;
      txtBgColor.value = textItem.bgColor;
      txtBgOpacity.value = textItem.bgOpacity;
      txtAnim.value = textItem.anim || 'none';
    } else {
      textEditorWrap.classList.add('disabled-group');
    }

    const hudLayer = getSelectedHudLayer();
    if (hudLayer && hudEditorWrap) {
      hudEditorWrap.classList.remove('disabled-group');
      hudSrcX.value = hudLayer.srcX;
      hudSrcY.value = hudLayer.srcY;
      hudSrcW.value = hudLayer.srcW;
      hudSrcH.value = hudLayer.srcH;
      hudDestX.value = hudLayer.destX;
      hudDestY.value = hudLayer.destY;
      hudDestScale.value = hudLayer.destScale;
      hudScaleBadge.textContent = `${Math.round(hudLayer.destScale)}%`;
      hudBorderColor.value = hudLayer.borderColor || '#10b981';
      hudLabelText.value = hudLayer.labelText || '';
      hudBorderRadius.value = hudLayer.borderRadius ?? 10;
    } else if (hudEditorWrap) {
      hudEditorWrap.classList.add('disabled-group');
    }
  }

  function renderHudLayersList() {
    if (!hudLayersListEl) return;
    hudLayersListEl.innerHTML = '';
    if (state.hudLayers.length === 0) {
      hudLayersListEl.innerHTML = `<div class="empty-hint" style="padding:8px; font-size:11px;">No hay capas HUD activas. Pulsa uno de los botones de arriba para añadir un recuadro de vida, daño o cámara.</div>`;
      return;
    }
    state.hudLayers.forEach((layer) => {
      const item = document.createElement('div');
      item.className = `hud-layer-item ${layer.id === state.selectedHudId ? 'active' : ''}`;
      item.innerHTML = `
        <span>🎯 ${layer.labelText || layer.name}</span>
        <small style="color:var(--text-muted);">${Math.round(layer.destScale)}%</small>
      `;
      item.addEventListener('click', () => {
        state.selectedHudId = layer.id;
        syncUIWithSelection();
        renderHudLayersList();
        renderFrame();
      });
      hudLayersListEl.appendChild(item);
    });
  }

  function updateAudioTabUI() {
    if (state.bgMusic) {
      bgMusicStatus.innerHTML = `🎵 Activa: <b>${state.bgMusic.name}</b> (${state.bgMusic.duration.toFixed(1)}s)`;
      bgMusicControls.classList.remove('disabled-group');
    } else {
      bgMusicStatus.textContent = 'Sin música cargada. Usa el botón "Importar Música" o genera una pista ambiental.';
      bgMusicControls.classList.add('disabled-group');
    }
  }

  // ==================== RENDERIZADO DE LA LÍNEA DE TIEMPO (TIMELINE) ====================
  function renderTimeline() {
    const totalDur = getTotalDuration();
    const minVisibleSeconds = Math.max(15, totalDur + 4);
    const pps = state.pixelsPerSecond;
    const totalWidthPx = Math.ceil(minVisibleSeconds * pps);

    timelineInner.style.width = `${totalWidthPx}px`;

    // 1. Regla de tiempo
    timelineRuler.innerHTML = '';
    const stepSec = pps < 40 ? 2 : 1;
    for (let s = 0; s <= minVisibleSeconds; s += stepSec) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = `${s * pps}px`;
      tick.textContent = formatTime(s);
      timelineRuler.appendChild(tick);

      if (pps >= 45) {
        const sub = document.createElement('div');
        sub.className = 'ruler-subtick';
        sub.style.left = `${(s + 0.5) * pps}px`;
        timelineRuler.appendChild(sub);
      }
    }

    // 2. Pista de Video Principal
    trackVideo.innerHTML = '';
    const ranges = computeClipRanges();
    ranges.forEach(({ clip, timelineStart, effectiveDuration }) => {
      const el = document.createElement('div');
      el.className = `timeline-clip ${clip.id === state.selectedClipId ? 'selected' : ''}`;
      el.style.left = `${timelineStart * pps}px`;
      el.style.width = `${Math.max(24, effectiveDuration * pps)}px`;

      const hasFilter = clip.filters.preset !== 'normal' ||
        clip.filters.brightness !== 100 ||
        clip.filters.contrast !== 100 ||
        clip.filters.saturate !== 100 ||
        clip.filters.grayscale > 0 ||
        clip.filters.sepia > 0 ||
        clip.filters.blur > 0;

      const tagsHtml = `
        <span class="clip-tag">${clip.speed}x</span>
        ${clip.transition.type !== 'none' ? `<span class="clip-tag trans-tag">✨ ${clip.transition.type}</span>` : ''}
        ${hasFilter ? `<span class="clip-tag filter-tag">🎨 Filtro</span>` : ''}
        ${clip.muted ? `<span class="clip-tag">🔇</span>` : ''}
      `;

      const mediaObj = state.mediaLibrary.find(m => m.id === clip.mediaId);
      let filmstripHtml = '';
      if (mediaObj && mediaObj.thumbnails && mediaObj.thumbnails.length > 0) {
        const imgs = mediaObj.thumbnails
          .map(src => `<img src="${src}" class="clip-thumb-img" alt="" draggable="false" />`)
          .join('');
        filmstripHtml = `<div class="clip-filmstrip">${imgs}</div>`;
      }

      el.innerHTML = `
        ${filmstripHtml}
        <div class="trim-handle left" title="Arrastra para recortar el inicio"></div>
        <div class="clip-top-row">
          <span class="clip-title-span">${clip.name}</span>
        </div>
        <div class="clip-bottom-row">
          ${tagsHtml}
          <span>${effectiveDuration.toFixed(1)}s</span>
        </div>
        <div class="trim-handle right" title="Arrastra para recortar el final"></div>
      `;

      el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('trim-handle')) return;
        e.stopPropagation();
        pausePlayback();
        state.selectedClipId = clip.id;
        state.selectedTextId = null;
        isScrubbing = true;
        syncUIWithSelection();
        renderTimeline();
        scrubFromMouseEvent(e);
      });

      // Recorte interactivo arrastrando las asas izquierda/derecha (mostrando en vivo el fotograma exacto que se recorta)
      const leftHandle = el.querySelector('.trim-handle.left');
      const rightHandle = el.querySelector('.trim-handle.right');

      leftHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        pausePlayback();
        state.selectedClipId = clip.id;
        const startX = e.clientX;
        const initialTrimStart = clip.trimStart;

        const onMove = (ev) => {
          const deltaSec = ((ev.clientX - startX) / state.pixelsPerSecond) * clip.speed;
          clip.trimStart = Math.max(0, Math.min(clip.trimEnd - 0.2, Number((initialTrimStart + deltaSec).toFixed(2))));
          const updatedRanges = computeClipRanges();
          const curRange = updatedRanges.find(r => r.clip.id === clip.id);
          if (curRange) {
            state.currentTime = curRange.timelineStart;
          }
          if (mediaObj) requestVideoSeek(mediaObj, clip.trimStart);
          syncUIWithSelection();
          renderTimeline();
          renderFrame();
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveStateSnapshot();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      rightHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        pausePlayback();
        state.selectedClipId = clip.id;
        const startX = e.clientX;
        const initialTrimEnd = clip.trimEnd;

        const onMove = (ev) => {
          const deltaSec = ((ev.clientX - startX) / state.pixelsPerSecond) * clip.speed;
          clip.trimEnd = Math.max(clip.trimStart + 0.2, Math.min(clip.sourceDuration, Number((initialTrimEnd + deltaSec).toFixed(2))));
          const updatedRanges = computeClipRanges();
          const curRange = updatedRanges.find(r => r.clip.id === clip.id);
          if (curRange) {
            state.currentTime = Math.max(curRange.timelineStart, curRange.timelineEnd - 0.02);
          }
          if (mediaObj) requestVideoSeek(mediaObj, clip.trimEnd - 0.02);
          syncUIWithSelection();
          renderTimeline();
          renderFrame();
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveStateSnapshot();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      trackVideo.appendChild(el);
    });

    // 3. Pista de Texto
    trackText.innerHTML = '';
    state.texts.forEach(txt => {
      const el = document.createElement('div');
      el.className = `timeline-text-item ${txt.id === state.selectedTextId ? 'selected' : ''}`;
      el.style.left = `${txt.start * pps}px`;
      el.style.width = `${Math.max(24, (txt.end - txt.start) * pps)}px`;
      el.textContent = `🔤 ${txt.content}`;

      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        state.selectedTextId = txt.id;
        syncUIWithSelection();
        renderTimeline();

        // Permitir arrastrar el bloque de texto horizontalmente en el tiempo
        const startX = e.clientX;
        const origStart = txt.start;
        const dur = txt.end - txt.start;

        const onMove = (ev) => {
          const deltaSec = (ev.clientX - startX) / state.pixelsPerSecond;
          txt.start = Math.max(0, Number((origStart + deltaSec).toFixed(2)));
          txt.end = Number((txt.start + dur).toFixed(2));
          syncUIWithSelection();
          renderTimeline();
          renderFrame();
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveStateSnapshot();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      trackText.appendChild(el);
    });

    // 4. Pista de Audio / Música de fondo
    trackAudio.innerHTML = '';
    if (state.bgMusic) {
      const audioDur = totalDur > 0 ? Math.min(state.bgMusic.duration, totalDur) : state.bgMusic.duration;
      const el = document.createElement('div');
      el.className = 'timeline-audio-item';
      el.style.left = '0px';
      el.style.width = `${Math.max(40, audioDur * pps)}px`;
      el.innerHTML = `<span>🎵 ${state.bgMusic.name} (${Math.round(state.bgMusic.volume * 100)}%)</span>`;
      trackAudio.appendChild(el);
    }

    updatePlayheadUI();
    totalTimeLabel.textContent = formatTime(totalDur);
  }

  function updatePlayheadUI() {
    const x = state.currentTime * state.pixelsPerSecond;
    playhead.style.left = `${x}px`;
    currentTimeLabel.textContent = formatTime(state.currentTime);
  }

  // ==================== MOTOR DE RENDERIZADO DE CANVAS (FILTROS, TRANSICIONES, VELOCIDAD, TEXTO) ====================
  function buildCssFilterString(f) {
    if (
      !f ||
      (f.brightness === 100 &&
        f.contrast === 100 &&
        f.saturate === 100 &&
        f.grayscale === 0 &&
        f.sepia === 0 &&
        f.hue === 0 &&
        f.blur === 0)
    ) {
      return 'none';
    }
    return [
      `brightness(${f.brightness}%)`,
      `contrast(${f.contrast}%)`,
      `saturate(${f.saturate}%)`,
      `grayscale(${f.grayscale}%)`,
      `sepia(${f.sepia}%)`,
      `hue-rotate(${f.hue}deg)`,
      `blur(${f.blur}px)`
    ].join(' ');
  }

  const demoBufferCanvas = document.createElement('canvas');
  demoBufferCanvas.width = 1280;
  demoBufferCanvas.height = 720;
  const demoBufferCtx = demoBufferCanvas.getContext('2d');

  function drawDemoScene(ctx, theme, sourceTime, w, h) {
    ctx.save();
    if (theme === 'neon') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#31104b');
      grad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Rejilla retro en movimiento
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      const horizon = h * 0.55;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 35, horizon);
        ctx.lineTo(w / 2 + i * 190, h);
        ctx.stroke();
      }
      const offset = (sourceTime * 120) % 40;
      for (let y = horizon; y < h; y += 35) {
        const yy = y + (offset * ((y - horizon) / (h - horizon)));
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }

      // Sol neón pulsante en el centro
      const pulse = Math.sin(sourceTime * 3) * 12;
      const sunGrad = ctx.createLinearGradient(0, horizon - 160, 0, horizon);
      sunGrad.addColorStop(0, '#f43f5e');
      sunGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w / 2, horizon - 50, 95 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Mira Shooter en el centro exacto de la escena
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 18, 0, Math.PI * 2);
      ctx.moveTo(w / 2 - 28, h / 2);
      ctx.lineTo(w / 2 + 28, h / 2);
      ctx.moveTo(w / 2, h / 2 - 28);
      ctx.lineTo(w / 2, h / 2 + 28);
      ctx.stroke();
    } else if (theme === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#4c1d95');
      grad.addColorStop(0.6, '#ea580c');
      grad.addColorStop(1, '#fde047');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = `rgba(15, 23, 42, ${0.45 + layer * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 25) {
          const y = h * (0.62 + layer * 0.1) + Math.sin(x * 0.01 + sourceTime * (1.8 + layer) + layer) * 28;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#051923';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + sourceTime * 1.4;
        const rad = 110 + Math.sin(sourceTime * 4 + i) * 45;
        const cx = w / 2 + Math.cos(angle) * rad * 1.6;
        const cy = h / 2 + Math.sin(angle) * rad;
        ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#6366f1';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // HUD Shooter simulado en las esquinas 16:9 para probar capas de Vida y Daño
    // 1. Abajo-Izquierda: Barra de Vida y Escudo
    const hpVal = Math.max(25, Math.round(85 + Math.sin(sourceTime * 2) * 15));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(24, h - 110, 310, 86);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, h - 110, 310, 86);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`❤️ HP ${hpVal}/100  🛡️ +50`, 40, h - 72);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, h - 56, 270, 18);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(40, h - 56, (hpVal / 100) * 270, 18);

    // 2. Abajo-Derecha: Daño y Munición
    const dmgVal = Math.round(180 + (sourceTime * 35) % 160);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(w - 334, h - 110, 310, 86);
    ctx.strokeStyle = '#f43f5e';
    ctx.strokeRect(w - 334, h - 110, 310, 86);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(`💥 DAÑO: ${dmgVal} DMG`, w - 316, h - 72);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`🔫 MUNICIÓN: ${28 - Math.floor(sourceTime * 3) % 15} / 120`, w - 316, h - 40);

    // 3. Arriba-Izquierda: Minimapa / Radar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(24, 24, 170, 150);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(24, 24, 170, 150);
    ctx.beginPath();
    ctx.arc(109, 99, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(109 + Math.cos(sourceTime * 2) * 25, 99 + Math.sin(sourceTime * 2) * 25, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function renderHudSourcePicker(sourceImage, srcFullW, srcFullH) {
    if (!hudPickerCtx || !hudSourcePickerCanvas) return;
    const pw = hudSourcePickerCanvas.width;
    const ph = hudSourcePickerCanvas.height;
    hudPickerCtx.clearRect(0, 0, pw, ph);
    hudPickerCtx.fillStyle = '#090d16';
    hudPickerCtx.fillRect(0, 0, pw, ph);

    if (sourceImage && srcFullW > 0 && srcFullH > 0) {
      hudPickerCtx.drawImage(sourceImage, 0, 0, srcFullW, srcFullH, 0, 0, pw, ph);
    }

    // Dibujar rectángulo de la capa HUD seleccionada
    const layer = getSelectedHudLayer();
    if (layer) {
      const rx = (layer.srcX / 100) * pw;
      const ry = (layer.srcY / 100) * ph;
      const rw = (layer.srcW / 100) * pw;
      const rh = (layer.srcH / 100) * ph;

      hudPickerCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      hudPickerCtx.fillRect(0, 0, pw, ry);
      hudPickerCtx.fillRect(0, ry + rh, pw, ph - (ry + rh));
      hudPickerCtx.fillRect(0, ry, rx, rh);
      hudPickerCtx.fillRect(rx + rw, ry, pw - (rx + rw), rh);

      hudPickerCtx.strokeStyle = '#fbbf24';
      hudPickerCtx.lineWidth = 2;
      hudPickerCtx.strokeRect(rx, ry, rw, rh);

      hudPickerCtx.fillStyle = '#fbbf24';
      hudPickerCtx.font = 'bold 10px sans-serif';
      hudPickerCtx.fillText(layer.labelText || 'ZONA HUD', rx + 4, Math.max(12, ry - 4));
    }
  }

  function drawHudLayers(ctx, sourceImage, srcFullW, srcFullH, w, h, filterStr) {
    if (!sourceImage || state.hudLayers.length === 0) return;
    state.hudLayers.forEach((layer) => {
      ctx.save();
      const sx = Math.max(0, (layer.srcX / 100) * srcFullW);
      const sy = Math.max(0, (layer.srcY / 100) * srcFullH);
      const sw = Math.max(12, Math.min(srcFullW - sx, (layer.srcW / 100) * srcFullW));
      const sh = Math.max(12, Math.min(srcFullH - sy, (layer.srcH / 100) * srcFullH));

      const boxW = (layer.destScale / 100) * w;
      const aspect = sw / sh;
      const boxH = boxW / Math.max(0.25, aspect);
      const cx = (layer.destX / 100) * w;
      const cy = (layer.destY / 100) * h;
      const bx = cx - boxW / 2;
      const by = cy - boxH / 2;
      const radius = layer.borderRadius ?? 10;

      // Sombra exterior gamer
      ctx.shadowColor = layer.borderColor || '#10b981';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, radius);
      ctx.save();
      ctx.clip();
      ctx.filter = filterStr || 'none';
      ctx.drawImage(sourceImage, sx, sy, sw, sh, bx, by, boxW, boxH);
      ctx.restore();

      // Borde luminoso del recuadro HUD
      ctx.strokeStyle = layer.borderColor || '#10b981';
      ctx.lineWidth = Math.max(2.5, w * 0.0035);
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, radius);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Etiqueta superior del recuadro (Ej: ❤️ VIDA / 💥 DAÑO)
      if (layer.labelText && layer.labelText.trim() !== '') {
        const fontSize = Math.max(12, Math.round(w * 0.018));
        ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
        const textW = ctx.measureText(layer.labelText).width;
        const pillW = textW + 16;
        const pillH = fontSize + 8;
        ctx.fillStyle = '#0a0a0a';
        ctx.strokeStyle = layer.borderColor || '#ff6b00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx + 8, by - pillH / 2, pillW, pillH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.labelText, bx + 16, by);
      }

      // Indicador de selección si el usuario la está editando (solo en vista previa)
      if (layer.id === state.selectedHudId && !state.isExporting) {
        ctx.strokeStyle = '#ff6b00';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx - 4, by - 4, boxW + 8, boxH + 8);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  }

  function drawGamerStreamFrame(ctx, w, h) {
    const gf = state.gamerFrame;
    if (!gf) return;

    const hasFrame = gf.type && gf.type !== 'none';
    const hasLogo = Boolean(gf.channelLogoImg);
    const hasText = Boolean(gf.channelTag && gf.channelTag.trim() !== '');

    if (!hasFrame && !hasLogo && !hasText) {
      gf._lastBadgeBox = null;
      return;
    }

    ctx.save();
    const color = gf.color || '#ff6b00';

    if (gf.type === 'custom' && gf.customImg) {
      ctx.drawImage(gf.customImg, 0, 0, w, h);
    } else if (gf.type === 'neon') {
      // Marco Neón Streamer (Bordes luminosos + esquinas cyberpunk)
      const pad = Math.round(Math.min(w, h) * 0.022);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(4, Math.round(w * 0.006));
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

      // Esquinas reforzadas
      const cornerLen = Math.round(Math.min(w, h) * 0.09);
      ctx.lineWidth = Math.max(8, Math.round(w * 0.012));
      ctx.beginPath();
      // Arriba-Izq
      ctx.moveTo(pad, pad + cornerLen); ctx.lineTo(pad, pad); ctx.lineTo(pad + cornerLen, pad);
      // Arriba-Der
      ctx.moveTo(w - pad - cornerLen, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + cornerLen);
      // Abajo-Izq
      ctx.moveTo(pad, h - pad - cornerLen); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + cornerLen, h - pad);
      // Abajo-Der
      ctx.moveTo(w - pad - cornerLen, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, h - pad - cornerLen);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (gf.type === 'shooter') {
      // Marco Shooter Táctico (HUD Militar + Esquinas + Mira central sutil)
      const pad = Math.round(Math.min(w, h) * 0.028);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, Math.round(w * 0.004));
      const cLen = Math.round(Math.min(w, h) * 0.07);

      // 4 esquinas tácticas
      ctx.beginPath();
      ctx.moveTo(pad, pad + cLen); ctx.lineTo(pad, pad); ctx.lineTo(pad + cLen, pad);
      ctx.moveTo(w - pad - cLen, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + cLen);
      ctx.moveTo(pad, h - pad - cLen); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + cLen, h - pad);
      ctx.moveTo(w - pad - cLen, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, h - pad - cLen);
      ctx.stroke();

      // Indicador REC Táctico arriba a la derecha
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      const badgeW = Math.round(w * 0.18);
      const badgeH = Math.round(w * 0.042);
      ctx.fillRect(w - pad - badgeW, pad + 10, badgeW, badgeH);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(w - pad - badgeW + badgeH * 0.45, pad + 10 + badgeH / 2, badgeH * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = `700 ${Math.round(badgeH * 0.5)}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('REC ● HUD', w - pad - badgeW + badgeH * 0.8, pad + 10 + badgeH / 2);
    } else if (gf.type === 'twitch') {
      // Marco Streamer Pro (Barras superior e inferior estilizadas)
      const barH = Math.round(h * 0.045);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    } else if (gf.type === 'esports') {
      // Marco Esports Gold Competitivo
      const pad = Math.round(Math.min(w, h) * 0.02);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(1, '#b45309');
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(6, Math.round(w * 0.009));
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    }

    // Promoción de Canal / Streamer: Imagen / Logo + Texto promocionado
    if (hasLogo || hasText) {
      const bScale = (gf.badgeScale || 100) / 100;
      const cx = (gf.badgeX ?? 0.5) * w;
      const cy = (gf.badgeY ?? 0.06) * h;
      const fontSize = Math.max(16, Math.round(w * 0.03 * bScale));
      ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;

      const tagText = hasText ? gf.channelTag.trim() : '';
      const tw = hasText ? ctx.measureText(tagText).width : 0;

      let logoW = 0;
      let logoH = 0;
      if (hasLogo && gf.channelLogoImg) {
        const imgAspect = Math.max(0.25, Math.min(3.5, (gf.channelLogoImg.width || 1) / Math.max(1, gf.channelLogoImg.height || 1)));
        logoH = hasText ? Math.round(fontSize * 1.55) : Math.round(w * 0.1 * bScale);
        logoW = Math.round(logoH * imgAspect);
      }

      const gap = hasLogo && hasText ? Math.round(fontSize * 0.45) : 0;
      const padX = hasText ? Math.round(fontSize * 0.85) : Math.round(logoH * 0.22);
      const padY = hasText ? Math.round(fontSize * 0.48) : Math.round(logoH * 0.22);
      const contentW = logoW + gap + tw;
      const contentH = Math.max(logoH, hasText ? fontSize : 0);
      const boxW = contentW + padX * 2;
      const boxH = contentH + padY * 2;
      const bx = cx - boxW / 2;
      const by = cy - boxH / 2;

      gf._lastBadgeBox = {
        normX: cx / w,
        normY: cy / h,
        halfNormW: (boxW / 2) / w,
        halfNormH: (boxH / 2) / h
      };

      // Cápsula / Placa promocional del canal
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(10, 10, 10, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2.5, Math.round(w * 0.003 * bScale));
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, hasText ? 999 : Math.round(Math.min(boxW, boxH) * 0.25));
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      let curX = bx + padX;
      if (hasLogo && gf.channelLogoImg) {
        const ly = cy - logoH / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(curX, ly, logoW, logoH, Math.round(logoH * 0.2));
        ctx.clip();
        ctx.drawImage(gf.channelLogoImg, curX, ly, logoW, logoH);
        ctx.restore();
        curX += logoW + gap;
      }

      if (hasText) {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, curX, cy);
      }
    } else {
      gf._lastBadgeBox = null;
    }

    ctx.restore();
  }

  function drawCenterAndSafeGuides(ctx, w, h) {
    if (state.isExporting) return;
    ctx.save();

    // 1. Zona Segura de TikTok / Reels (donde van los botones de Like/Comentario y Descripción)
    if (state.showTikTokSafeZone) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      // Columna derecha de iconos de TikTok
      const rightW = w * 0.16;
      const rightH = h * 0.42;
      const rightX = w - rightW - w * 0.02;
      const rightY = h * 0.36;
      ctx.fillRect(rightX, rightY, rightW, rightH);
      ctx.strokeRect(rightX, rightY, rightW, rightH);

      // Zona inferior de descripción / audio de TikTok
      const botH = h * 0.16;
      ctx.fillRect(w * 0.03, h - botH - h * 0.02, w * 0.78, botH);
      ctx.strokeRect(w * 0.03, h - botH - h * 0.02, w * 0.78, botH);
      ctx.setLineDash([]);

      ctx.fillStyle = '#fda4af';
      ctx.font = `bold ${Math.max(12, Math.round(w * 0.018))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('UI TIKTOK', rightX + rightW / 2, rightY + rightH / 2);
      ctx.fillText('ZONA DESCRIPCIÓN TIKTOK / REELS', w * 0.42, h - botH / 2 - h * 0.02);
    }

    // 2. Líneas Guía Centrales Horizontal y Vertical (Estilo CapCut / TikTok)
    if (state.showCenterGuides) {
      const centerX = w / 2;
      const centerY = h / 2;

      // Eje Central Vertical (X = 50%)
      ctx.beginPath();
      ctx.strokeStyle = state.snappedX ? '#ff6b00' : 'rgba(255, 133, 51, 0.85)';
      ctx.lineWidth = state.snappedX ? 3.5 : 1.8;
      ctx.setLineDash(state.snappedX ? [] : [8, 6]);
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, h);
      ctx.stroke();

      // Eje Central Horizontal (Y = 50%)
      ctx.beginPath();
      ctx.strokeStyle = state.snappedY ? '#ff6b00' : 'rgba(255, 133, 51, 0.85)';
      ctx.lineWidth = state.snappedY ? 3.5 : 1.8;
      ctx.setLineDash(state.snappedY ? [] : [8, 6]);
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Mira de Centro Exacto (Intersección H / V)
      ctx.strokeStyle = '#ff6b00';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Etiquetas claras de Línea Central Vertical y Horizontal
      const labelFont = Math.max(11, Math.round(Math.min(w, h) * 0.018));
      ctx.font = `700 ${labelFont}px Inter, system-ui, sans-serif`;

      // Etiqueta superior Eje Vertical
      ctx.fillStyle = state.snappedX ? '#ff6b00' : 'rgba(10, 10, 10, 0.9)';
      ctx.strokeStyle = '#ff6b00';
      ctx.lineWidth = 1.5;
      ctx.fillRect(centerX - 68, 8, 136, labelFont + 10);
      ctx.strokeRect(centerX - 68, 8, 136, labelFont + 10);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('┃ EJE CENTRAL V.', centerX, 8 + (labelFont + 10) / 2);

      // Etiqueta izquierda Eje Horizontal
      ctx.fillStyle = state.snappedY ? '#ff6b00' : 'rgba(10, 10, 10, 0.9)';
      ctx.fillRect(8, centerY - (labelFont + 10) / 2, 136, labelFont + 10);
      ctx.strokeRect(8, centerY - (labelFont + 10) / 2, 136, labelFont + 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('━ EJE CENTRAL H.', 8 + 68, centerY);
    }

    ctx.restore();
  }

  function renderFrame() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    let currentSourceImage = null;
    let currentSourceW = 1280;
    let currentSourceH = 720;
    let currentFilterStr = 'none';

    const activeRange = getClipAtTime(state.currentTime);
    if (activeRange) {
      const { clip, timelineStart, effectiveDuration } = activeRange;
      const elapsedInClip = Math.max(0, state.currentTime - timelineStart);
      const sourceTime = Math.min(clip.trimEnd, clip.trimStart + elapsedInClip * clip.speed);

      const media = state.mediaLibrary.find(m => m.id === clip.mediaId);
      if (media) {
        ctx.save();

        // Aplicar transformaciones de transición de entrada
        const trans = clip.transition;
        let alpha = 1;
        let flashWhite = 0;

        if (trans && trans.type !== 'none' && elapsedInClip < trans.duration) {
          const p = Math.max(0, Math.min(1, elapsedInClip / trans.duration));
          const ease = 1 - Math.pow(1 - p, 3);
          if (trans.type === 'fade') {
            alpha = ease;
          } else if (trans.type === 'flash') {
            flashWhite = 1 - ease;
          } else if (trans.type === 'slide-left') {
            ctx.translate((1 - ease) * w, 0);
          } else if (trans.type === 'slide-right') {
            ctx.translate(-(1 - ease) * w, 0);
          } else if (trans.type === 'slide-up') {
            ctx.translate(0, (1 - ease) * h);
          } else if (trans.type === 'zoom-in') {
            const z = 0.35 + 0.65 * ease;
            ctx.translate(w / 2, h / 2);
            ctx.scale(z, z);
            ctx.translate(-w / 2, -h / 2);
            alpha = ease;
          }
        }

        if (trans && trans.fadeOut && effectiveDuration - elapsedInClip < 0.6) {
          const rem = Math.max(0, (effectiveDuration - elapsedInClip) / 0.6);
          alpha *= rem;
        }

        ctx.globalAlpha = alpha;
        const baseFilter = buildCssFilterString(clip.filters);
        currentFilterStr = baseFilter;

        // Obtener la fuente de imagen (Demo o Video real con caché anti-pantalla-negra)
        if (media.type === 'demo') {
          drawDemoScene(demoBufferCtx, media.demoTheme, sourceTime, 1280, 720);
          currentSourceImage = demoBufferCanvas;
          currentSourceW = 1280;
          currentSourceH = 720;
        } else if (media.videoEl) {
          const v = media.videoEl;
          if (!state.isPlaying && !state.isExporting) {
            requestVideoSeek(media, sourceTime);
          }
          if (v.readyState >= 2 && !v.seeking) {
            updateMediaFrameCache(media);
            currentSourceImage = v;
            currentSourceW = v.videoWidth || 1280;
            currentSourceH = v.videoHeight || 720;
          } else if (media._hasCachedFrame && media._cacheCanvas) {
            // Mientras el decodificador de video busca el fotograma exacto, mostrar el último fotograma decodificado en caché para que NUNCA parpadee en negro
            currentSourceImage = media._cacheCanvas;
            currentSourceW = media._cacheCanvas.width || 1280;
            currentSourceH = media._cacheCanvas.height || 720;
          } else if (v.readyState >= 2) {
            currentSourceImage = v;
            currentSourceW = v.videoWidth || 1280;
            currentSourceH = v.videoHeight || 720;
          }
        }

        if (currentSourceImage) {
          const vw = currentSourceW;
          const vh = currentSourceH;
          const fitMode = state.fitMode || 'center';

          // 1. Si el modo es "blur" (Centro + Fondo Difuminado), dibujar primero el fondo difuminado
          if (fitMode === 'blur') {
            const bgScale = Math.max(w / vw, h / vh) * 1.08;
            const bgW = vw * bgScale;
            const bgH = vh * bgScale;
            ctx.filter = `${baseFilter} blur(24px) brightness(55%)`;
            ctx.drawImage(currentSourceImage, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
          }

          // 2. Calcular el recorte personalizado de la grabación (Crop Izq/Der/Arriba/Abajo)
          const crop = clip.crop || { left: 0, right: 0, top: 0, bottom: 0 };
          const cL = Math.max(0, Math.min(0.45, (crop.left || 0) / 100));
          const cR = Math.max(0, Math.min(0.45, (crop.right || 0) / 100));
          const cT = Math.max(0, Math.min(0.45, (crop.top || 0) / 100));
          const cB = Math.max(0, Math.min(0.45, (crop.bottom || 0) / 100));

          const sx = vw * cL;
          const sy = vh * cT;
          const sw = Math.max(16, vw * (1 - cL - cR));
          const sh = Math.max(16, vh * (1 - cT - cB));

          // 3. Determinar escala base según el modo de encuadre ('center' enfoca directamente el centro de la pantalla)
          let baseScale;
          if (fitMode === 'center' || fitMode === 'cover') {
            baseScale = Math.max(w / sw, h / sh);
          } else {
            baseScale = Math.min(w / sw, h / sh);
          }

          const userZoom = (clip.zoom || 100) / 100;
          const dw = sw * baseScale * userZoom;
          const dh = sh * baseScale * userZoom;

          // Desplazamiento Horizontal (Pan X) y Vertical (Pan Y) respecto a la línea central (0,0)
          const panOffsetX = ((clip.panX || 0) / 100) * (w * 0.65);
          const panOffsetY = ((clip.panY || 0) / 100) * (h * 0.65);

          ctx.save();
          ctx.translate(w / 2 + panOffsetX, h / 2 + panOffsetY);
          ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
          ctx.filter = baseFilter;
          ctx.drawImage(currentSourceImage, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }

        ctx.filter = 'none';

        // Efecto de Viñeta si está activo
        if (clip.filters.vignette > 0) {
          const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.72);
          vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
          vigGrad.addColorStop(1, `rgba(0,0,0,${(clip.filters.vignette / 100) * 0.88})`);
          ctx.fillStyle = vigGrad;
          ctx.fillRect(0, 0, w, h);
        }

        // Destello Blanco de transición
        if (flashWhite > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flashWhite})`;
          ctx.fillRect(0, 0, w, h);
        }

        ctx.restore();
      }
    }

    // 2. Renderizar Capas de Recuadro HUD (Vida del personaje, Daño, Minimapa, Cámara)
    if (currentSourceImage) {
      drawHudLayers(ctx, currentSourceImage, currentSourceW, currentSourceH, w, h, currentFilterStr);
    }

    // Actualizar el selector visual 16:9 en la pestaña Gamer
    if (!state.isExporting) {
      renderHudSourcePicker(currentSourceImage, currentSourceW, currentSourceH);
    }

    // 3. Renderizar Marco Gamer / Stream (Overlay)
    drawGamerStreamFrame(ctx, w, h);

    // 4. Renderizar Capas de Texto activas en el tiempo actual
    state.texts.forEach(txt => {
      if (state.currentTime >= txt.start && state.currentTime <= txt.end) {
        ctx.save();
        const elapsedTxt = state.currentTime - txt.start;
        let alpha = 1;
        let offsetY = 0;
        let scale = 1;

        if (txt.anim === 'fade' && elapsedTxt < 0.45) {
          alpha = elapsedTxt / 0.45;
        } else if (txt.anim === 'pop' && elapsedTxt < 0.35) {
          const p = elapsedTxt / 0.35;
          scale = 0.5 + 0.5 * Math.sin(p * Math.PI * 0.75);
        } else if (txt.anim === 'slide-up' && elapsedTxt < 0.4) {
          const p = elapsedTxt / 0.4;
          offsetY = (1 - p) * 45;
          alpha = p;
        }

        const cx = txt.x * w;
        const cy = txt.y * h + offsetY;

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        ctx.font = `700 ${txt.size}px ${txt.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = txt.content.split('\n');
        const lineHeight = txt.size * 1.22;
        const totalH = lines.length * lineHeight;
        let maxW = 0;
        lines.forEach(l => {
          const m = ctx.measureText(l).width;
          if (m > maxW) maxW = m;
        });

        const padX = 22;
        const padY = 12;

        // Fondo de caja de texto
        if (txt.bgOpacity > 0) {
          const hex = txt.bgColor || '#000000';
          const r = parseInt(hex.slice(1, 3), 16) || 0;
          const g = parseInt(hex.slice(3, 5), 16) || 0;
          const b = parseInt(hex.slice(5, 7), 16) || 0;
          ctx.fillStyle = `rgba(${r},${g},${b},${txt.bgOpacity / 100})`;
          ctx.beginPath();
          ctx.roundRect(-maxW / 2 - padX, -totalH / 2 - padY, maxW + padX * 2, totalH + padY * 2, 10);
          ctx.fill();
        }

        // Borde guía si está seleccionado
        if (txt.id === state.selectedTextId && !state.isExporting) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(-maxW / 2 - padX - 4, -totalH / 2 - padY - 4, maxW + (padX + 4) * 2, totalH + (padY + 4) * 2);
          ctx.setLineDash([]);
        }

        ctx.fillStyle = txt.color || '#ffffff';
        lines.forEach((line, i) => {
          const ly = -totalH / 2 + (i + 0.5) * lineHeight;
          ctx.fillText(line, 0, ly);
        });

        ctx.restore();
      }
    });

    // 5. Dibujar Líneas Guía Centrales Horizontal y Vertical + Zona Segura TikTok (Solo en edición)
    drawCenterAndSafeGuides(ctx, w, h);
  }

  // ==================== REPRODUCCIÓN Y SINCRONIZACIÓN DE AUDIO/VIDEO ====================
  let animFrameId = null;
  let lastFrameTimestamp = 0;
  let activePlayingMediaId = null;
  let activePlayingClipId = null;

  function stopAllMediaElements() {
    state.mediaLibrary.forEach(m => {
      if (m.videoEl && !m.videoEl.paused) {
        m.videoEl.pause();
      }
    });
    if (state.bgMusic && state.bgMusic.audioEl && !state.bgMusic.audioEl.paused) {
      state.bgMusic.audioEl.pause();
    }
    activePlayingMediaId = null;
    activePlayingClipId = null;
  }

  function applyResolutionPreset(presetCode) {
    state.aspectRatio = presetCode;
    // Resoluciones oficiales para TikTok / Celular (Android & iPhone) donde ANCHO y ALTO son múltiplos exactos de 16 macrobloques
    // (720 = 16×45, 1280 = 16×80, relación 9:16 exacta) evitando que el decodificador de teléfonos desplace las filas con estática.
    switch (presetCode) {
      case '9:16-fhd':
        canvas.width = 720;
        canvas.height = 1280;
        break;
      case '9:16-hd':
        canvas.width = 576;
        canvas.height = 1024;
        break;
      case '16:9-fhd':
      case '16:9-hd':
        canvas.width = 1280;
        canvas.height = 720;
        break;
      case '4:5-ig':
        canvas.width = 720;
        canvas.height = 896;
        break;
      case '1:1-sq':
        canvas.width = 720;
        canvas.height = 720;
        break;
      default:
        canvas.width = 720;
        canvas.height = 1280;
    }
    renderFrame();
  }

  function syncActiveMediaPlayback(totalDur) {
    const activeRange = getClipAtTime(state.currentTime);
    if (activeRange) {
      const { clip, timelineStart } = activeRange;
      const media = state.mediaLibrary.find(m => m.id === clip.mediaId);
      const targetSourceTime = clip.trimStart + (state.currentTime - timelineStart) * clip.speed;

      if (media && media.type === 'video' && media.videoEl) {
        const v = media.videoEl;
        const clipChanged = activePlayingClipId !== clip.id;

        if (activePlayingMediaId !== media.id) {
          state.mediaLibrary.forEach(m => {
            if (m.id !== media.id && m.videoEl) {
              if (!m.videoEl.paused) m.videoEl.pause();
              if (m.videoEl._exportGainNode) m.videoEl._exportGainNode.gain.value = 0;
            }
          });
          activePlayingMediaId = media.id;
        }
        activePlayingClipId = clip.id;

        if (Math.abs(v.playbackRate - clip.speed) > 0.01) {
          v.playbackRate = clip.speed;
        }
        const desiredVol = clip.muted ? 0 : Math.max(0, Math.min(1, clip.volume));
        if (state.isExporting && v._exportGainNode) {
          // Durante exportación mantenemos el decodificador nativo activo al 100% y regulamos el volumen en el nodo de ganancia
          v.muted = false;
          v.volume = 1.0;
          v._exportGainNode.gain.value = desiredVol;
        } else {
          v.muted = Boolean(clip.muted);
          if (Math.abs(v.volume - desiredVol) > 0.01) {
            v.volume = desiredVol;
          }
          if (v._capturedAudioTracks) {
            v._capturedAudioTracks.forEach(t => {
              t.enabled = !clip.muted && desiredVol > 0;
            });
          }
        }

        // Clave Anti-Freeze: Hacer seek SOLO al entrar a un nuevo segmento (clipChanged) o si se salió del rango.
        // Mientras está dentro del mismo clip, dejar que el decodificador de hardware avance sin interrumpirlo.
        if (clipChanged) {
          if (!v.seeking && Math.abs(v.currentTime - targetSourceTime) > 0.08) {
            try {
              v.currentTime = targetSourceTime;
            } catch (_) {}
          }
        } else if (!v.seeking && (v.currentTime < clip.trimStart - 0.15 || v.currentTime > clip.trimEnd + 0.25)) {
          try {
            v.currentTime = Math.max(clip.trimStart, Math.min(clip.trimEnd, targetSourceTime));
          } catch (_) {}
        } else if (!v.paused && !v.seeking && v.currentTime >= clip.trimStart && v.currentTime <= clip.trimEnd) {
          // Alinear suavemente el reloj de la línea de tiempo con el fotograma real decodificado del video
          const videoDrivenTimeline = timelineStart + (v.currentTime - clip.trimStart) / clip.speed;
          const diff = videoDrivenTimeline - state.currentTime;
          if (Math.abs(diff) > 0.04 && Math.abs(diff) < 0.5) {
            state.currentTime += diff * 0.35;
          }
        }

        if (v.paused && !v.seeking) {
          v.play().catch(() => {});
        }
      } else {
        state.mediaLibrary.forEach(m => {
          if (m.videoEl && !m.videoEl.paused) m.videoEl.pause();
        });
        activePlayingMediaId = null;
        activePlayingClipId = null;
      }
    } else {
      state.mediaLibrary.forEach(m => {
        if (m.videoEl && !m.videoEl.paused) m.videoEl.pause();
      });
      activePlayingMediaId = null;
      activePlayingClipId = null;
    }

    // Sincronizar música de fondo y su volumen / fade out
    if (state.bgMusic && state.bgMusic.audioEl) {
      const bgEl = state.bgMusic.audioEl;
      let vol = state.bgMusic.volume;
      if (state.bgMusic.fadeOut && totalDur - state.currentTime < 2.0) {
        vol *= Math.max(0, (totalDur - state.currentTime) / 2.0);
      }
      const clampedVol = Math.max(0, Math.min(1, vol));
      bgEl.muted = false;
      bgEl.volume = clampedVol;
      if (bgEl._exportGainNode) {
        bgEl._exportGainNode.gain.value = clampedVol;
      }
      if (state.currentTime < state.bgMusic.duration) {
        if (bgEl.paused && !bgEl.seeking) {
          try { bgEl.currentTime = state.currentTime; } catch (_) {}
          bgEl.play().catch(() => {});
        }
      } else if (!bgEl.paused) {
        bgEl.pause();
      }
    }
  }

  function startPlayback() {
    const totalDur = getTotalDuration();
    if (totalDur <= 0) {
      showToast('Añade un video o haz clic en "✨ Cargar Video Demo"');
      return;
    }
    ensureAudioMixer();

    if (state.currentTime >= totalDur - 0.05) {
      state.currentTime = 0;
    }

    state.isPlaying = true;
    activePlayingClipId = null;
    activePlayingMediaId = null;
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
    lastFrameTimestamp = performance.now();

    if (state.bgMusic && state.bgMusic.audioEl) {
      const bgEl = state.bgMusic.audioEl;
      if (state.currentTime < state.bgMusic.duration) {
        bgEl.currentTime = state.currentTime;
        bgEl.volume = state.bgMusic.volume;
        bgEl.play().catch(() => {});
      }
    }

    animFrameId = requestAnimationFrame(playbackLoop);
  }

  function pausePlayback() {
    state.isPlaying = false;
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    if (animFrameId) cancelAnimationFrame(animFrameId);
    stopAllMediaElements();
    renderFrame();
  }

  function togglePlayPause() {
    if (state.isPlaying) pausePlayback();
    else startPlayback();
  }

  function playbackLoop(now) {
    if (!state.isPlaying) return;
    const dt = Math.min(0.1, (now - lastFrameTimestamp) / 1000);
    lastFrameTimestamp = now;

    const totalDur = getTotalDuration();
    state.currentTime += dt;

    if (state.currentTime >= totalDur) {
      state.currentTime = totalDur;
      updatePlayheadUI();
      pausePlayback();
      return;
    }

    syncActiveMediaPlayback(totalDur);
    updatePlayheadUI();
    renderFrame();
    animFrameId = requestAnimationFrame(playbackLoop);
  }

  function seekTo(timeSec) {
    const totalDur = getTotalDuration();
    state.currentTime = Math.max(0, Math.min(totalDur > 0 ? totalDur : 0, timeSec));
    updatePlayheadUI();

    const activeRange = getClipAtTime(state.currentTime);
    if (activeRange) {
      const { clip, timelineStart } = activeRange;
      const media = state.mediaLibrary.find(m => m.id === clip.mediaId);
      const elapsedInClip = Math.max(0, state.currentTime - timelineStart);
      const sourceTime = Math.min(clip.trimEnd, clip.trimStart + elapsedInClip * clip.speed);
      if (media && media.videoEl) {
        requestVideoSeek(media, sourceTime);
      }
    }
    renderFrame();
  }

  // ==================== EXPORTACIÓN MP4 / AVI / WEBM DE ALTA CALIDAD (100% SOFTWARE SIN ESTÁTICA NI CUADRADOS) ====================
  function openExportSettingsModal() {
    const totalDur = getTotalDuration();
    if (totalDur <= 0) {
      showToast('No hay clips en la línea de tiempo para exportar');
      return;
    }
    pausePlayback();
    const fileNameInput = document.getElementById('exportFileNameInput');
    const projNameInput = document.getElementById('projectName');
    if (fileNameInput && projNameInput && projNameInput.value.trim()) {
      fileNameInput.value = projNameInput.value.trim();
    }
    const presetSel = document.getElementById('exportPresetSelect');
    if (presetSel && state.aspectRatio) {
      presetSel.value = state.aspectRatio;
    }
    document.getElementById('exportSettingsModal').style.display = 'flex';
  }

  function getCandidateCodecs(formatChoice) {
    const ext = formatChoice === 'avi' ? 'avi' : formatChoice === 'webm' ? 'webm' : 'mp4';
    if (formatChoice === 'webm') {
      return [
        { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { mimeType: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { mimeType: 'video/webm', ext: 'webm' }
      ];
    }
    // Uso exclusivo de codificadores por software CPU (VP9 / VP8) libre del codificador H.264 por GPU (avc1) que generaba estática y macrobloques dañados.
    return [
      { mimeType: 'video/mp4;codecs=vp09.00.10.08,mp4a.40.2', ext },
      { mimeType: 'video/mp4;codecs=vp09.00.10.08,opus', ext },
      { mimeType: 'video/mp4;codecs=vp9,mp4a.40.2', ext },
      { mimeType: 'video/mp4;codecs=vp9,opus', ext },
      { mimeType: 'video/webm;codecs=vp9,opus', ext },
      { mimeType: 'video/webm;codecs=vp8,opus', ext },
      { mimeType: 'video/webm', ext }
    ];
  }

  function selectBestCodecConfig(formatChoice) {
    const candidates = getCandidateCodecs(formatChoice);
    for (const cand of candidates) {
      if (cand.mimeType && MediaRecorder.isTypeSupported(cand.mimeType)) {
        return cand;
      }
    }
    return { mimeType: '', ext: formatChoice || 'mp4' };
  }

  async function exportEditedVideo() {
    const totalDur = getTotalDuration();
    if (totalDur <= 0) return;

    const formatChoice = document.getElementById('exportFormatSelect').value || 'mp4';
    const presetChoice = document.getElementById('exportPresetSelect').value || '9:16-fhd';
    const videoBitrate = Number(document.getElementById('exportQualitySelect').value) || 8500000;
    const exportFps = Number(document.getElementById('exportFpsSelect').value) || 30;
    const fileNameInput = document.getElementById('exportFileNameInput');
    const chkPickLocation = document.getElementById('chkPickSaveLocation');

    const rawName = (
      (fileNameInput && fileNameInput.value.trim()) ||
      (document.getElementById('projectName').value || '').trim() ||
      'klip-tiktok'
    );
    const cleanFileName = rawName.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-').trim() || 'klip-tiktok';
    document.getElementById('projectName').value = cleanFileName;

    let { mimeType, ext } = selectBestCodecConfig(formatChoice);

    // Si el usuario marcó "Elegir carpeta de destino", abrir la ventana nativa de Windows ANTES de iniciar el renderizado (mientras el gesto de clic está activo)
    let saveFileHandle = null;
    if ((!chkPickLocation || chkPickLocation.checked) && typeof window.showSaveFilePicker === 'function') {
      try {
        const mimeMap = {
          mp4: { 'video/mp4': ['.mp4'] },
          avi: { 'video/x-msvideo': ['.avi'] },
          webm: { 'video/webm': ['.webm'] }
        };
        saveFileHandle = await window.showSaveFilePicker({
          suggestedName: `${cleanFileName}.${ext}`,
          types: [
            {
              description: `Archivo de Video (${ext.toUpperCase()})`,
              accept: mimeMap[ext] || { 'video/mp4': ['.mp4'] }
            }
          ]
        });
      } catch (pickerErr) {
        if (pickerErr && pickerErr.name === 'AbortError') {
          showToast('Guardado cancelado');
          return;
        }
        console.warn('No se pudo abrir el selector de archivos nativo, se usará descarga directa:', pickerErr);
      }
    }

    document.getElementById('exportSettingsModal').style.display = 'none';

    if (presetChoice !== 'current') {
      document.getElementById('aspectRatioSelect').value = presetChoice;
      applyResolutionPreset(presetChoice);
    } else {
      applyResolutionPreset(state.aspectRatio);
    }

    pausePlayback();
    const actx = getOrCreateAudioContext();
    if (actx && actx.state === 'suspended') {
      await actx.resume().catch(() => {});
    }

    state.isExporting = true;
    state.cancelExportFlag = false;

    const modal = document.getElementById('exportModal');
    const progressBar = document.getElementById('exportProgressBar');
    const progressText = document.getElementById('exportProgressText');
    modal.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = 'Preparando pistas de video y audio...';

    // 2. Preparar todos los elementos de video y música antes de capturar el stream real
    state.currentTime = 0;
    activePlayingClipId = null;
    activePlayingMediaId = null;

    const usedMediaItems = [];
    state.clips.forEach(c => {
      const m = state.mediaLibrary.find(item => item.id === c.mediaId);
      if (m && m.type === 'video' && m.videoEl && !usedMediaItems.includes(m)) {
        usedMediaItems.push(m);
      }
    });

    usedMediaItems.forEach(m => {
      const v = m.videoEl;
      v.muted = false;
      v.loop = true; // Evita que el evento 'ended' cierre la pista de audio durante la exportación
      v.volume = 1.0;
      v._exportGainNode = null;
      v._capturedAudioTracks = null;
    });

    const firstRange = getClipAtTime(0);
    if (firstRange) {
      const firstMedia = state.mediaLibrary.find(m => m.id === firstRange.clip.mediaId);
      if (firstMedia && firstMedia.videoEl) {
        const fv = firstMedia.videoEl;
        fv.playbackRate = firstRange.clip.speed;
        fv.muted = false;
        fv.volume = 1.0;
        fv.currentTime = firstRange.clip.trimStart;
        await new Promise(res => {
          const onSeeked = () => {
            fv.removeEventListener('seeked', onSeeked);
            res();
          };
          fv.addEventListener('seeked', onSeeked);
          setTimeout(res, 180);
        });
        // Iniciar reproducción ANTES de capturar el stream para que el decodificador de audio esté activo desde t=0
        await fv.play().catch(() => {});
        activePlayingMediaId = firstMedia.id;
        activePlayingClipId = firstRange.clip.id;
      }
    }

    if (state.bgMusic && state.bgMusic.audioEl) {
      const bgEl = state.bgMusic.audioEl;
      bgEl.muted = false;
      bgEl.volume = 1.0;
      bgEl._exportGainNode = null;
      try { bgEl.currentTime = 0; } catch (_) {}
      await bgEl.play().catch(() => {});
    }

    // Breve espera para asegurar que el pipeline de audio del navegador esté emitiendo muestras PCM
    await new Promise(r => setTimeout(r, 80));
    renderFrame();

    // 3. Construir pistas de audio y bus maestro de mezcla a 48kHz (vía captureStream nativo libre de bloqueo CORS file://)
    usedMediaItems.forEach(m => {
      const vs = getMediaCaptureStream(m.videoEl);
      m.videoEl._capturedAudioTracks = vs ? vs.getAudioTracks().filter(t => t.readyState === 'live') : [];
    });

    let bgCapturedTracks = [];
    if (state.bgMusic && state.bgMusic.audioEl) {
      const bgs = getMediaCaptureStream(state.bgMusic.audioEl);
      bgCapturedTracks = bgs ? bgs.getAudioTracks().filter(t => t.readyState === 'live') : [];
    }

    let finalAudioTracks = [];
    let keepAliveOsc = null;
    let exportMixBus = null;

    const videosWithAudio = usedMediaItems.filter(
      m => m.videoEl._capturedAudioTracks && m.videoEl._capturedAudioTracks.length > 0
    );

    if (actx) {
      // Bus maestro de mezcla continua 48kHz para alimentar tanto AAC (Mp4Muxer) como MediaStreamDestination
      exportMixBus = actx.createGain();
      exportMixBus.gain.value = 1.0;

      const exportDest = actx.createMediaStreamDestination();
      exportMixBus.connect(exportDest);

      keepAliveOsc = actx.createOscillator();
      const keepAliveGain = actx.createGain();
      keepAliveGain.gain.value = 0.0002; // -74dB inaudible para mantener flujo continuo de muestras AAC sin huecos
      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(exportMixBus);
      keepAliveOsc.start();

      const initClipVol = firstRange ? (firstRange.clip.muted ? 0 : firstRange.clip.volume) : 1.0;

      videosWithAudio.forEach(m => {
        try {
          const track = m.videoEl._capturedAudioTracks[0];
          const srcNode = actx.createMediaStreamSource(new MediaStream([track]));
          const gainNode = actx.createGain();
          gainNode.gain.value = m.id === activePlayingMediaId ? initClipVol : 0;
          srcNode.connect(gainNode);
          gainNode.connect(exportMixBus);
          m.videoEl._exportGainNode = gainNode;
        } catch (err) {
          console.warn('Error al unir pista de video al mezclador:', err);
        }
      });

      if (bgCapturedTracks.length > 0 && state.bgMusic && state.bgMusic.audioEl) {
        try {
          const bgSrc = actx.createMediaStreamSource(new MediaStream([bgCapturedTracks[0]]));
          const bgGain = actx.createGain();
          bgGain.gain.value = state.bgMusic.volume;
          bgSrc.connect(bgGain);
          bgGain.connect(exportMixBus);
          state.bgMusic.audioEl._exportGainNode = bgGain;
        } catch (err) {
          console.warn('Error al unir música de fondo al mezclador:', err);
        }
      }

      finalAudioTracks = exportDest.stream.getAudioTracks();
    }

    if (finalAudioTracks.length === 0) {
      if (videosWithAudio.length > 0) {
        finalAudioTracks = [videosWithAudio[0].videoEl._capturedAudioTracks[0]];
      } else if (bgCapturedTracks.length > 0) {
        finalAudioTracks = [bgCapturedTracks[0]];
      }
    }

    renderFrame();

    // 4. Determinar si podemos usar el motor MP4 Estándar para Móviles (Mp4Muxer + WebCodecs H.264 Baseline + AAC FastStart)
    // Esto genera un archivo .mp4 NO fragmentado (ftyp isom + moov al inicio + tabla de keyframes stss) 100% compatible con Android, iPhone, WhatsApp y TikTok móvil.
    const w = canvas.width;
    const h = canvas.height;
    let chosenVideoConfig = null;
    let chosenAudioConfig = null;
    let chosenAudioMuxCodec = 'aac';

    if (formatChoice !== 'webm' && window.Mp4Muxer && typeof window.VideoEncoder === 'function') {
      const candidateVideoConfigs = [
        // Prioridad 1: Codificador H.264 Baseline por Software CPU (OpenH264 integrado en Chrome/Edge) -> Cero estática de GPU y 0 B-frames
        { codec: 'avc1.42001f', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'prefer-software', avc: { format: 'avc' } },
        { codec: 'avc1.42E01F', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'prefer-software', avc: { format: 'avc' } },
        { codec: 'avc1.420028', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'prefer-software', avc: { format: 'avc' } },
        // Prioridad 2: H.264 Constrained Baseline / Main Nivel 3.1 (resolución múltiplo exacto de 16: 720x1280)
        { codec: 'avc1.42001f', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'no-preference', avc: { format: 'avc' } },
        { codec: 'avc1.42E01F', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'no-preference', avc: { format: 'avc' } },
        { codec: 'avc1.4d001f', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'no-preference', avc: { format: 'avc' } },
        { codec: 'avc1.420028', width: w, height: h, bitrate: videoBitrate, framerate: exportFps, hardwareAcceleration: 'no-preference', avc: { format: 'avc' } }
      ];

      for (const cfg of candidateVideoConfigs) {
        try {
          const sup = await VideoEncoder.isConfigSupported(cfg);
          if (sup && sup.supported) {
            chosenVideoConfig = cfg;
            break;
          }
        } catch (_) {}
      }

      if (chosenVideoConfig && typeof window.AudioEncoder === 'function') {
        const audioCandidates = [
          { muxCodec: 'aac', cfg: { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000, aac: { format: 'aac' } } },
          { muxCodec: 'aac', cfg: { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 } },
          { muxCodec: 'aac', cfg: { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 } },
          { muxCodec: 'opus', cfg: { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 } }
        ];
        for (const item of audioCandidates) {
          try {
            const aSup = await AudioEncoder.isConfigSupported(item.cfg);
            if (aSup && aSup.supported) {
              chosenAudioConfig = item.cfg;
              chosenAudioMuxCodec = item.muxCodec;
              break;
            }
          } catch (_) {}
        }
      }
    }

    let finalBlob = null;

    if (chosenVideoConfig && window.Mp4Muxer) {
      // ==================== RUTA A: EXPORTACIÓN MP4 NATIVA PARA TELÉFONOS Y TIKTOK (H.264 + AAC + MOOV FASTSTART) ====================
      ext = formatChoice === 'avi' ? 'avi' : 'mp4';
      const sampleRate = chosenAudioConfig ? chosenAudioConfig.sampleRate : 48000;

      // Renderizar primero toda la mezcla de audio (clips + recortes + velocidad + música de fondo) con precisión de muestra vía OfflineAudioContext
      progressText.textContent = 'Procesando y mezclando pista de audio AAC de alta fidelidad...';
      const renderedAudioBuffer = chosenAudioConfig
        ? await buildTimelineOfflineAudioBuffer(totalDur, sampleRate)
        : null;

      const muxerTarget = new window.Mp4Muxer.ArrayBufferTarget();
      const muxer = new window.Mp4Muxer.Muxer({
        target: muxerTarget,
        video: {
          codec: 'avc',
          width: w,
          height: h,
          frameRate: exportFps
        },
        audio:
          chosenAudioConfig && renderedAudioBuffer
            ? {
                codec: chosenAudioMuxCodec,
                numberOfChannels: 2,
                sampleRate: sampleRate
              }
            : undefined,
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset'
      });

      const totalVideoFrames = Math.max(1, Math.ceil(totalDur * exportFps));
      let encodedVideoFrames = 0;
      const frameDurationUs = Math.round((1 / exportFps) * 1_000_000);

      let muxedVideoChunks = 0;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          try {
            const vBytes = new Uint8Array(chunk.byteLength);
            chunk.copyTo(vBytes);
            const vTsUs = Math.round(muxedVideoChunks * frameDurationUs);
            muxer.addVideoChunkRaw(vBytes, chunk.type, vTsUs, frameDurationUs, meta);
            muxedVideoChunks++;
          } catch (e) {
            console.warn('Error al añadir chunk de video al MP4:', e);
          }
        },
        error: (err) => console.warn('Error en VideoEncoder:', err)
      });
      videoEncoder.configure(chosenVideoConfig);

      // Codificar la mezcla completa de audio PCM a paquetes AAC crudos (1024 muestras por trama)
      if (chosenAudioConfig && renderedAudioBuffer && !state.cancelExportFlag) {
        try {
          let muxedAudioChunks = 0;
          const audioFrameDurUs = (1024 / sampleRate) * 1_000_000;
          const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              try {
                let rawBytes = new Uint8Array(chunk.byteLength);
                chunk.copyTo(rawBytes);
                // Si el codificador AAC de Windows antepuso cabecera ADTS (0xFFF...), extraer el bloque AAC crudo que exige el contenedor MP4
                if (
                  chosenAudioMuxCodec === 'aac' &&
                  rawBytes.byteLength > 7 &&
                  rawBytes[0] === 0xff &&
                  (rawBytes[1] & 0xf0) === 0xf0
                ) {
                  const adtsHeaderLen = (rawBytes[1] & 0x01) === 0 ? 9 : 7;
                  if (rawBytes.byteLength > adtsHeaderLen) {
                    rawBytes = rawBytes.subarray(adtsHeaderLen);
                  }
                }
                // Evitar que un meta.decoderConfig sin 'description' sobrescriba con undefined el descriptor esds válido de Mp4Muxer
                let safeMeta = undefined;
                if (meta && meta.decoderConfig) {
                  const dc = { ...meta.decoderConfig };
                  if (!dc.description || dc.description.byteLength === 0) {
                    delete dc.description;
                  }
                  safeMeta = { ...meta, decoderConfig: dc };
                }
                const aTsUs = Math.round(muxedAudioChunks * audioFrameDurUs);
                const aDurUs = Math.max(1, Math.round(audioFrameDurUs));
                muxer.addAudioChunkRaw(rawBytes, 'key', aTsUs, aDurUs, safeMeta);
                muxedAudioChunks++;
              } catch (e) {
                console.warn('Error al añadir chunk de audio AAC al MP4:', e);
              }
            },
            error: (err) => console.warn('Error en AudioEncoder:', err)
          });
          audioEncoder.configure(chosenAudioConfig);

          const ch0 = renderedAudioBuffer.getChannelData(0);
          const ch1 = renderedAudioBuffer.numberOfChannels > 1 ? renderedAudioBuffer.getChannelData(1) : ch0;
          const totalSamples = renderedAudioBuffer.length;
          const stepSamples = 1024;

          for (let offset = 0; offset < totalSamples; offset += stepSamples) {
            const count = Math.min(stepSamples, totalSamples - offset);
            if (count <= 0) break;
            const planar = new Float32Array(count * 2);
            planar.set(ch0.subarray(offset, offset + count), 0);
            planar.set(ch1.subarray(offset, offset + count), count);
            const tsUs = Math.round((offset / sampleRate) * 1_000_000);
            const aData = new AudioData({
              format: 'f32-planar',
              sampleRate: sampleRate,
              numberOfFrames: count,
              numberOfChannels: 2,
              timestamp: tsUs,
              data: planar
            });
            audioEncoder.encode(aData);
            aData.close();
          }

          if (audioEncoder.state === 'configured') {
            await audioEncoder.flush();
          }
          audioEncoder.close();
        } catch (audioEncErr) {
          console.warn('Error durante la codificación offline de audio AAC:', audioEncErr);
        }
      }

      // Reposicionar el primer clip exactamente en t=0 tras la codificación offline de audio para máxima sincronía A/V
      state.currentTime = 0;
      if (firstRange) {
        const firstMedia = state.mediaLibrary.find(m => m.id === firstRange.clip.mediaId);
        if (firstMedia && firstMedia.videoEl) {
          const fv = firstMedia.videoEl;
          try {
            fv.currentTime = firstRange.clip.trimStart;
          } catch (_) {}
          await new Promise(res => {
            const onSeeked = () => {
              fv.removeEventListener('seeked', onSeeked);
              res();
            };
            fv.addEventListener('seeked', onSeeked);
            setTimeout(res, 120);
          });
          if (fv.paused) {
            await fv.play().catch(() => {});
          }
        }
      }
      renderFrame();

      function encodeCurrentCanvasFrame(frameIdx) {
        if (videoEncoder.state !== 'configured') return;
        const tsUs = Math.round((frameIdx / exportFps) * 1_000_000);
        try {
          const vf = new VideoFrame(canvas, { timestamp: tsUs, duration: frameDurationUs });
          // Emitir un fotograma clave IDR cada 1 segundo (y en el cuadro 0) para compatibilidad total con móviles y WhatsApp/TikTok
          const isKeyFrame = (frameIdx % exportFps) === 0;
          videoEncoder.encode(vf, { keyFrame: isKeyFrame });
          vf.close();
        } catch (e) {
          console.warn('Error al codificar VideoFrame:', e);
        }
      }

      // Codificar primer cuadro t=0
      encodeCurrentCanvasFrame(0);
      encodedVideoFrames = 1;

      await new Promise((resolveLoop) => {
        let prevTime = performance.now();
        let lastClipIdInExport = firstRange ? firstRange.clip.id : null;

        async function exportStep(now) {
          if (state.cancelExportFlag) {
            resolveLoop();
            return;
          }

          const dt = Math.min(0.06, Math.max(0, (now - prevTime) / 1000));
          prevTime = now;
          state.currentTime += dt;

          if (state.currentTime >= totalDur) {
            state.currentTime = totalDur;
            renderFrame();
            while (encodedVideoFrames < totalVideoFrames) {
              encodeCurrentCanvasFrame(encodedVideoFrames);
              encodedVideoFrames++;
            }
            updatePlayheadUI();
            progressBar.style.width = '100%';
            progressText.textContent = `100% — Empaquetando MP4 con Audio AAC para Móvil y TikTok...`;
            resolveLoop();
            return;
          }

          const activeRange = getClipAtTime(state.currentTime);
          if (activeRange && activeRange.clip.id !== lastClipIdInExport) {
            lastClipIdInExport = activeRange.clip.id;
            const media = state.mediaLibrary.find(m => m.id === activeRange.clip.mediaId);
            const targetSource = activeRange.clip.trimStart + (state.currentTime - activeRange.timelineStart) * activeRange.clip.speed;
            if (media && media.videoEl && Math.abs(media.videoEl.currentTime - targetSource) > 0.12) {
              try {
                media.videoEl.currentTime = targetSource;
              } catch (_) {}
              await new Promise(r => {
                const onSeek = () => {
                  media.videoEl.removeEventListener('seeked', onSeek);
                  r();
                };
                media.videoEl.addEventListener('seeked', onSeek);
                setTimeout(r, 120);
              });
              if (media.videoEl.paused) {
                await media.videoEl.play().catch(() => {});
              }
              prevTime = performance.now();
            }
          }

          syncActiveMediaPlayback(totalDur);
          renderFrame();

          const targetFrameIdx = Math.min(totalVideoFrames - 1, Math.floor(state.currentTime * exportFps));
          while (encodedVideoFrames <= targetFrameIdx) {
            encodeCurrentCanvasFrame(encodedVideoFrames);
            encodedVideoFrames++;
          }

          updatePlayheadUI();

          const pct = Math.min(100, Math.round((state.currentTime / totalDur) * 100));
          progressBar.style.width = `${pct}%`;
          progressText.textContent = `${pct}% — ${formatTime(state.currentTime)} / ${formatTime(totalDur)} (MP4 H.264+AAC Móvil ${w}×${h})`;

          requestAnimationFrame(exportStep);
        }

        syncActiveMediaPlayback(totalDur);
        requestAnimationFrame(exportStep);
      });

      if (!state.cancelExportFlag) {
        try {
          if (videoEncoder.state === 'configured') await videoEncoder.flush();
          videoEncoder.close();
        } catch (e) {
          console.warn('Error al cerrar VideoEncoder:', e);
        }

        if (muxedVideoChunks > 0) {
          try {
            muxer.finalize();
            finalBlob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
          } catch (e) {
            console.warn('Error al finalizar muxer MP4:', e);
          }
        }
      } else {
        try { videoEncoder.close(); } catch (_) {}
      }
    }

    // ==================== RUTA B: FALLBACK MEDIARECORDER (PARA WEBM O NAVEGADORES SIN WEBCODECS) ====================
    if (!finalBlob && !state.cancelExportFlag) {
      state.currentTime = 0;
      const canvasStream = canvas.captureStream(exportFps);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0] || null;
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...finalAudioTracks
      ]);

      const chunks = [];
      let recorder = null;
      let stopPromise = null;

      function startRecorderWithMime(targetMime, targetExt) {
        mimeType = targetMime;
        ext = targetExt;
        chunks.length = 0;
        const opts = targetMime
          ? { mimeType: targetMime, videoBitsPerSecond: videoBitrate, audioBitsPerSecond: 160000 }
          : { videoBitsPerSecond: videoBitrate, audioBitsPerSecond: 160000 };
        recorder = new MediaRecorder(combinedStream, opts);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        stopPromise = new Promise((resolveStop) => {
          recorder.onstop = () => resolveStop();
        });
        recorder.start(100);
      }

      try {
        startRecorderWithMime(mimeType, ext);
      } catch (_) {
        const fbMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';
        startRecorderWithMime(fbMime, 'webm');
      }

      await new Promise((resolveLoop) => {
        let prevTime = performance.now();
        let lastClipIdInExport = firstRange ? firstRange.clip.id : null;

        async function exportStep(now) {
          if (state.cancelExportFlag) {
            resolveLoop();
            return;
          }

          const dt = Math.min(0.06, Math.max(0, (now - prevTime) / 1000));
          prevTime = now;
          state.currentTime += dt;

          if (state.currentTime >= totalDur) {
            state.currentTime = totalDur;
            renderFrame();
            if (canvasVideoTrack && typeof canvasVideoTrack.requestFrame === 'function') {
              try { canvasVideoTrack.requestFrame(); } catch (_) {}
            }
            updatePlayheadUI();
            progressBar.style.width = '100%';
            progressText.textContent = `100% (${formatTime(totalDur)} / ${formatTime(totalDur)})`;
            resolveLoop();
            return;
          }

          const activeRange = getClipAtTime(state.currentTime);
          if (activeRange && activeRange.clip.id !== lastClipIdInExport) {
            lastClipIdInExport = activeRange.clip.id;
            const media = state.mediaLibrary.find(m => m.id === activeRange.clip.mediaId);
            const targetSource = activeRange.clip.trimStart + (state.currentTime - activeRange.timelineStart) * activeRange.clip.speed;
            if (media && media.videoEl && Math.abs(media.videoEl.currentTime - targetSource) > 0.12) {
              try {
                media.videoEl.currentTime = targetSource;
              } catch (_) {}
              await new Promise(r => {
                const onSeek = () => {
                  media.videoEl.removeEventListener('seeked', onSeek);
                  r();
                };
                media.videoEl.addEventListener('seeked', onSeek);
                setTimeout(r, 120);
              });
              if (media.videoEl.paused) {
                await media.videoEl.play().catch(() => {});
              }
              prevTime = performance.now();
            }
          }

          syncActiveMediaPlayback(totalDur);
          renderFrame();
          if (canvasVideoTrack && typeof canvasVideoTrack.requestFrame === 'function') {
            try { canvasVideoTrack.requestFrame(); } catch (_) {}
          }
          updatePlayheadUI();

          const pct = Math.min(100, Math.round((state.currentTime / totalDur) * 100));
          progressBar.style.width = `${pct}%`;
          progressText.textContent = `${pct}% — ${formatTime(state.currentTime)} / ${formatTime(totalDur)} (${ext.toUpperCase()} ${canvas.width}×${canvas.height})`;

          requestAnimationFrame(exportStep);
        }

        syncActiveMediaPlayback(totalDur);
        requestAnimationFrame(exportStep);
      });

      if (recorder.state === 'recording') {
        try { recorder.requestData(); } catch (_) {}
      }
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      await stopPromise;
      finalBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
    }

    stopAllMediaElements();
    usedMediaItems.forEach(m => {
      if (m.videoEl) {
        m.videoEl.loop = false;
        m.videoEl._exportGainNode = null;
        m.videoEl._capturedAudioTracks = null;
      }
    });
    if (keepAliveOsc) {
      try { keepAliveOsc.stop(); } catch (_) {}
    }

    state.isExporting = false;
    modal.style.display = 'none';

    if (state.cancelExportFlag) {
      showToast('Exportación cancelada');
      return;
    }

    const blob = finalBlob;
    if (!blob || blob.size === 0) {
      showToast('⚠️ Error: El codificador no generó datos. Intenta con resolución 720p o formato WebM.');
      return;
    }

    const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
    if (saveFileHandle) {
      try {
        const writable = await saveFileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast(`✅ ¡Video guardado en "${saveFileHandle.name}" (${sizeMb} MB) con éxito!`);
        return;
      } catch (writeErr) {
        console.warn('Error al escribir en el destino seleccionado, iniciando descarga directa:', writeErr);
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFileName}.${ext}`;
    a.click();
    showToast(`✅ ¡Video "${cleanFileName}.${ext}" exportado (${sizeMb} MB) con éxito!`);
  }

  // ==================== EVENTOS DE LA INTERFAZ Y ATAJOS ====================
  // Pestañas laterales
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Importación de archivos y Drag & Drop
  videoFileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    videoFileInput.value = '';
  });
  audioFileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    audioFileInput.value = '';
  });

  dropZone.addEventListener('click', () => videoFileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  document.getElementById('btnLoadDemo').addEventListener('click', loadDemoProject);
  document.getElementById('btnWelcomeDemo').addEventListener('click', loadDemoProject);

  // Relación de aspecto y modo de ajuste para TikTok / Reels
  document.getElementById('aspectRatioSelect').addEventListener('change', (e) => {
    applyResolutionPreset(e.target.value);
  });

  document.getElementById('fitModeSelect').addEventListener('change', (e) => {
    state.fitMode = e.target.value;
    renderFrame();
  });

  // Deshacer / Rehacer
  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnRedo').addEventListener('click', redo);

  // Controles de transporte del reproductor
  document.getElementById('btnPlayPause').addEventListener('click', togglePlayPause);
  document.getElementById('btnSkipStart').addEventListener('click', () => {
    pausePlayback();
    seekTo(0);
  });
  document.getElementById('btnSkipEnd').addEventListener('click', () => {
    pausePlayback();
    seekTo(getTotalDuration());
  });
  document.getElementById('btnStepBack').addEventListener('click', () => {
    pausePlayback();
    seekTo(state.currentTime - 0.5);
  });
  document.getElementById('btnStepForward').addEventListener('click', () => {
    pausePlayback();
    seekTo(state.currentTime + 0.5);
  });

  // Herramientas de Corte, Copiar, Pegar, Duplicar, Mover, Eliminar
  document.getElementById('btnSplit').addEventListener('click', splitClipAtPlayhead);
  document.getElementById('btnSidebarSplit').addEventListener('click', splitClipAtPlayhead);
  document.getElementById('btnCopy').addEventListener('click', copySelectedClip);
  document.getElementById('btnSidebarCopy').addEventListener('click', copySelectedClip);
  document.getElementById('btnPaste').addEventListener('click', pasteClip);
  document.getElementById('btnSidebarPaste').addEventListener('click', pasteClip);
  document.getElementById('btnDuplicate').addEventListener('click', duplicateSelectedClip);
  document.getElementById('btnSidebarDuplicate').addEventListener('click', duplicateSelectedClip);
  document.getElementById('btnMoveLeft').addEventListener('click', () => moveSelectedClip(-1));
  document.getElementById('btnMoveRight').addEventListener('click', () => moveSelectedClip(1));
  document.getElementById('btnDelete').addEventListener('click', deleteSelectedItem);

  // Controles de Velocidad
  clipSpeedSlider.addEventListener('input', (e) => setClipSpeed(e.target.value, false));
  clipSpeedSlider.addEventListener('change', (e) => setClipSpeed(e.target.value, true));
  quickSpeedSelect.addEventListener('change', (e) => setClipSpeed(e.target.value, true));
  document.querySelectorAll('.speed-preset').forEach(btn => {
    btn.addEventListener('click', () => setClipSpeed(btn.dataset.speed, true));
  });

  // Controles de Recorte numérico (Trim) con vista previa del fotograma en vivo
  clipTrimStart.addEventListener('input', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.trimStart = Math.max(0, Math.min(clip.trimEnd - 0.1, Number(clipTrimStart.value)));
    const curRange = computeClipRanges().find(r => r.clip.id === clip.id);
    if (curRange) state.currentTime = curRange.timelineStart;
    const media = state.mediaLibrary.find(m => m.id === clip.mediaId);
    if (media) requestVideoSeek(media, clip.trimStart);
    renderTimeline();
    renderFrame();
  });

  clipTrimStart.addEventListener('change', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.trimStart = Math.max(0, Math.min(clip.trimEnd - 0.1, Number(clipTrimStart.value)));
    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
  });

  clipTrimEnd.addEventListener('input', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.trimEnd = Math.max(clip.trimStart + 0.1, Math.min(clip.sourceDuration, Number(clipTrimEnd.value)));
    const curRange = computeClipRanges().find(r => r.clip.id === clip.id);
    if (curRange) state.currentTime = Math.max(curRange.timelineStart, curRange.timelineEnd - 0.02);
    const media = state.mediaLibrary.find(m => m.id === clip.mediaId);
    if (media) requestVideoSeek(media, clip.trimEnd - 0.02);
    renderTimeline();
    renderFrame();
  });

  clipTrimEnd.addEventListener('change', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.trimEnd = Math.max(clip.trimStart + 0.1, Math.min(clip.sourceDuration, Number(clipTrimEnd.value)));
    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
  });

  // Transformación Voltear, Zoom, Posición (Pan X/Y) y Recorte de Grabación (Crop)
  document.getElementById('btnFlipH').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.flipH = !clip.flipH;
    saveStateSnapshot();
    renderFrame();
  });
  document.getElementById('btnFlipV').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.flipV = !clip.flipV;
    saveStateSnapshot();
    renderFrame();
  });
  clipZoomSlider.addEventListener('input', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.zoom = Number(clipZoomSlider.value);
    zoomValueBadge.textContent = `${clip.zoom}%`;
    renderFrame();
  });
  clipZoomSlider.addEventListener('change', () => saveStateSnapshot());

  if (clipPanXSlider) {
    clipPanXSlider.addEventListener('input', () => {
      const clip = getSelectedClip();
      if (!clip) return;
      let val = Number(clipPanXSlider.value);
      if (state.snapToCenter && Math.abs(val) <= 3) {
        val = 0;
        clipPanXSlider.value = 0;
        state.snappedX = true;
      } else {
        state.snappedX = val === 0;
      }
      clip.panX = val;
      panXValueBadge.textContent = val === 0 ? '0% (Centro)' : `${val > 0 ? '+' : ''}${val}%`;
      renderFrame();
    });
    clipPanXSlider.addEventListener('change', () => {
      state.snappedX = false;
      saveStateSnapshot();
      renderFrame();
    });
  }

  if (clipPanYSlider) {
    clipPanYSlider.addEventListener('input', () => {
      const clip = getSelectedClip();
      if (!clip) return;
      let val = Number(clipPanYSlider.value);
      if (state.snapToCenter && Math.abs(val) <= 3) {
        val = 0;
        clipPanYSlider.value = 0;
        state.snappedY = true;
      } else {
        state.snappedY = val === 0;
      }
      clip.panY = val;
      panYValueBadge.textContent = val === 0 ? '0% (Centro)' : `${val > 0 ? '+' : ''}${val}%`;
      renderFrame();
    });
    clipPanYSlider.addEventListener('change', () => {
      state.snappedY = false;
      saveStateSnapshot();
      renderFrame();
    });
  }

  function onCropInput() {
    const clip = getSelectedClip();
    if (!clip) return;
    if (!clip.crop) clip.crop = { left: 0, right: 0, top: 0, bottom: 0 };
    clip.crop.left = Math.max(0, Math.min(45, Number(clipCropLeft.value) || 0));
    clip.crop.right = Math.max(0, Math.min(45, Number(clipCropRight.value) || 0));
    clip.crop.top = Math.max(0, Math.min(45, Number(clipCropTop.value) || 0));
    clip.crop.bottom = Math.max(0, Math.min(45, Number(clipCropBottom.value) || 0));
    renderFrame();
  }

  [clipCropLeft, clipCropRight, clipCropTop, clipCropBottom].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', onCropInput);
    inp.addEventListener('change', () => saveStateSnapshot());
  });

  document.getElementById('btnFocusCenter916').addEventListener('click', () => {
    document.getElementById('aspectRatioSelect').value = '9:16-fhd';
    document.getElementById('fitModeSelect').value = 'center';
    state.fitMode = 'center';
    applyResolutionPreset('9:16-fhd');
    const clip = getSelectedClip();
    if (clip) {
      clip.panX = 0;
      clip.panY = 0;
      clip.zoom = 100;
      saveStateSnapshot();
      syncUIWithSelection();
    }
    renderFrame();
    showToast('🎯 Formato 9:16 vertical activado enfocando el centro exacto de la grabación');
  });

  document.getElementById('btnCenterClipXY').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.panX = 0;
    clip.panY = 0;
    state.snappedX = true;
    state.snappedY = true;
    saveStateSnapshot();
    syncUIWithSelection();
    renderFrame();
    setTimeout(() => {
      state.snappedX = false;
      state.snappedY = false;
      renderFrame();
    }, 600);
    showToast('➕ Grabación centrada exactamente en los ejes Horizontal y Vertical');
  });

  document.getElementById('btnResetCropPan').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.panX = 0;
    clip.panY = 0;
    clip.zoom = 100;
    clip.crop = { left: 0, right: 0, top: 0, bottom: 0 };
    saveStateSnapshot();
    syncUIWithSelection();
    renderFrame();
    showToast('🔄 Encuadre, zoom y recorte restablecidos');
  });

  // Botones de Guías Centrales H/V, Imán al Centro y Zona Segura TikTok
  const btnToggleCenterGuides = document.getElementById('btnToggleCenterGuides');
  const btnToggleSnapCenter = document.getElementById('btnToggleSnapCenter');
  const btnToggleSafeZone = document.getElementById('btnToggleSafeZone');

  if (btnToggleCenterGuides) {
    btnToggleCenterGuides.addEventListener('click', () => {
      state.showCenterGuides = !state.showCenterGuides;
      btnToggleCenterGuides.classList.toggle('active', state.showCenterGuides);
      renderFrame();
    });
  }
  if (btnToggleSnapCenter) {
    btnToggleSnapCenter.addEventListener('click', () => {
      state.snapToCenter = !state.snapToCenter;
      btnToggleSnapCenter.classList.toggle('active', state.snapToCenter);
      showToast(state.snapToCenter ? '🧲 Imán al centro activado' : 'Imán al centro desactivado');
    });
  }
  if (btnToggleSafeZone) {
    btnToggleSafeZone.addEventListener('click', () => {
      state.showTikTokSafeZone = !state.showTikTokSafeZone;
      btnToggleSafeZone.classList.toggle('active', state.showTikTokSafeZone);
      renderFrame();
    });
  }

  // ==================== CONTROLES DE PESTAÑA GAMER / STREAM FRAME / CAPAS HUD ====================
  document.querySelectorAll('.frame-preset-btn[data-frame]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.frame-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.gamerFrame.type = btn.dataset.frame;
      renderFrame();
    });
  });

  const customFrameInput = document.getElementById('customFrameInput');
  if (customFrameInput) {
    customFrameInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        state.gamerFrame.customImg = img;
        state.gamerFrame.type = 'custom';
        document.querySelectorAll('.frame-preset-btn').forEach(b => b.classList.remove('active'));
        renderFrame();
        showToast('🖼️ Marco personalizado cargado');
      };
      img.src = URL.createObjectURL(file);
    });
  }

  document.getElementById('gamerFrameColor').addEventListener('input', (e) => {
    state.gamerFrame.color = e.target.value;
    renderFrame();
  });

  document.getElementById('gamerChannelTag').addEventListener('input', (e) => {
    state.gamerFrame.channelTag = e.target.value;
    renderFrame();
  });

  const channelLogoInput = document.getElementById('channelLogoInput');
  const btnRemoveChannelLogo = document.getElementById('btnRemoveChannelLogo');
  const channelLogoStatus = document.getElementById('channelLogoStatus');
  const channelBadgeScale = document.getElementById('channelBadgeScale');
  const channelBadgeScaleBadge = document.getElementById('channelBadgeScaleBadge');

  if (channelLogoInput) {
    channelLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        state.gamerFrame.channelLogoImg = img;
        state.gamerFrame.channelLogoName = file.name;
        if (btnRemoveChannelLogo) btnRemoveChannelLogo.style.display = 'inline-flex';
        if (channelLogoStatus) {
          channelLogoStatus.textContent = `✅ Imagen activa: ${file.name} (puedes arrastrarla en el lienzo)`;
        }
        renderFrame();
        showToast('🖼️ Imagen / Logo del canal añadido');
      };
      img.src = URL.createObjectURL(file);
      channelLogoInput.value = '';
    });
  }

  if (btnRemoveChannelLogo) {
    btnRemoveChannelLogo.addEventListener('click', () => {
      state.gamerFrame.channelLogoImg = null;
      state.gamerFrame.channelLogoName = '';
      btnRemoveChannelLogo.style.display = 'none';
      if (channelLogoStatus) {
        channelLogoStatus.textContent = 'Puedes mostrar solo tu logo, solo texto, o ambos juntos para promocionar el canal.';
      }
      renderFrame();
      showToast('Logo del canal quitado');
    });
  }

  if (channelBadgeScale) {
    channelBadgeScale.addEventListener('input', (e) => {
      state.gamerFrame.badgeScale = Number(e.target.value) || 100;
      if (channelBadgeScaleBadge) channelBadgeScaleBadge.textContent = `${state.gamerFrame.badgeScale}%`;
      renderFrame();
    });
  }

  document.querySelectorAll('.channel-pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.gamerFrame.badgeX = Number(btn.dataset.x);
      state.gamerFrame.badgeY = Number(btn.dataset.y);
      renderFrame();
      showToast('📍 Posición de promoción del canal actualizada');
    });
  });

  // Presets para añadir Capas de Recuadro HUD (Vida, Daño, Munición, Minimapa, Webcam)
  const hudPresets = {
    'health-bl': {
      name: 'Barra de Vida (Abajo-Izq)',
      srcX: 1.5, srcY: 82, srcW: 26, srcH: 15,
      destX: 50, destY: 77, destScale: 56,
      borderColor: '#10b981',
      labelText: '❤️ VIDA / ESCUDO',
      borderRadius: 10
    },
    'ammo-br': {
      name: 'Daño / Munición (Abajo-Der)',
      srcX: 72, srcY: 82, srcW: 26, srcH: 15,
      destX: 50, destY: 87, destScale: 52,
      borderColor: '#f43f5e',
      labelText: '💥 DAÑO / MUNICIÓN',
      borderRadius: 10
    },
    'health-bc': {
      name: 'HUD Central (Abajo-Centro)',
      srcX: 32, srcY: 81, srcW: 36, srcH: 16,
      destX: 50, destY: 79, destScale: 62,
      borderColor: '#06b6d4',
      labelText: '⚡ HUD / HABILIDADES',
      borderRadius: 10
    },
    'minimap-tl': {
      name: 'Minimapa / Radar (Arriba-Izq)',
      srcX: 1.5, srcY: 2.5, srcW: 16, srcH: 24,
      destX: 23, destY: 16, destScale: 34,
      borderColor: '#38bdf8',
      labelText: '🗺️ RADAR',
      borderRadius: 12
    },
    'webcam': {
      name: 'Webcam / Recuadro Libre',
      srcX: 2, srcY: 32, srcW: 22, srcH: 26,
      destX: 50, destY: 16, destScale: 42,
      borderColor: '#a855f7',
      labelText: '📷 STREAM CAM',
      borderRadius: 14
    }
  };

  document.querySelectorAll('.hud-preset-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = hudPresets[btn.dataset.preset] || hudPresets['health-bl'];
      const newLayer = {
        id: uid('hud'),
        ...p
      };
      state.hudLayers.push(newLayer);
      state.selectedHudId = newLayer.id;
      saveStateSnapshot();
      syncUIWithSelection();
      renderHudLayersList();
      renderFrame();
      showToast(`🎯 Capa añadida: ${newLayer.labelText}`);
    });
  });

  function updateSelectedHudFromInputs() {
    const layer = getSelectedHudLayer();
    if (!layer) return;
    layer.srcX = Number(hudSrcX.value);
    layer.srcY = Number(hudSrcY.value);
    layer.srcW = Number(hudSrcW.value);
    layer.srcH = Number(hudSrcH.value);
    layer.destX = Number(hudDestX.value);
    layer.destY = Number(hudDestY.value);
    layer.destScale = Number(hudDestScale.value);
    hudScaleBadge.textContent = `${Math.round(layer.destScale)}%`;
    layer.borderColor = hudBorderColor.value;
    layer.labelText = hudLabelText.value;
    layer.borderRadius = Number(hudBorderRadius.value);
    renderHudLayersList();
    renderFrame();
  }

  [hudSrcX, hudSrcY, hudSrcW, hudSrcH, hudDestX, hudDestY, hudDestScale, hudBorderColor, hudLabelText, hudBorderRadius].forEach(el => {
    if (!el) return;
    el.addEventListener('input', updateSelectedHudFromInputs);
    el.addEventListener('change', () => saveStateSnapshot());
  });

  document.getElementById('btnCenterHudLayerX').addEventListener('click', () => {
    const layer = getSelectedHudLayer();
    if (!layer) return;
    layer.destX = 50;
    state.snappedX = true;
    saveStateSnapshot();
    syncUIWithSelection();
    renderFrame();
    setTimeout(() => {
      state.snappedX = false;
      renderFrame();
    }, 500);
    showToast('🎯 Recuadro HUD alineado con la línea central vertical');
  });

  document.getElementById('btnDeleteHudLayer').addEventListener('click', () => {
    if (!state.selectedHudId) return;
    state.hudLayers = state.hudLayers.filter(h => h.id !== state.selectedHudId);
    state.selectedHudId = state.hudLayers[0] ? state.hudLayers[0].id : null;
    saveStateSnapshot();
    syncUIWithSelection();
    renderHudLayersList();
    renderFrame();
    showToast('🗑️ Recuadro HUD eliminado');
  });

  // Arrastrar directamente sobre el mini-lienzo 16:9 (#hudSourcePickerCanvas) para elegir qué zona de vida/daño capturar
  let isDraggingHudPicker = false;
  if (hudSourcePickerCanvas) {
    const updatePickerPos = (e) => {
      const layer = getSelectedHudLayer();
      if (!layer) return;
      const rect = hudSourcePickerCanvas.getBoundingClientRect();
      const pctX = ((e.clientX - rect.left) / rect.width) * 100;
      const pctY = ((e.clientY - rect.top) / rect.height) * 100;
      layer.srcX = Math.max(0, Math.min(100 - layer.srcW, Number((pctX - layer.srcW / 2).toFixed(1))));
      layer.srcY = Math.max(0, Math.min(100 - layer.srcH, Number((pctY - layer.srcH / 2).toFixed(1))));
      syncUIWithSelection();
      renderFrame();
    };

    hudSourcePickerCanvas.addEventListener('mousedown', (e) => {
      if (!getSelectedHudLayer()) return;
      isDraggingHudPicker = true;
      updatePickerPos(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDraggingHudPicker) updatePickerPos(e);
    });
    window.addEventListener('mouseup', () => {
      if (isDraggingHudPicker) {
        isDraggingHudPicker = false;
        saveStateSnapshot();
      }
    });
  }

  // Presets de Filtros Visuales
  const filterPresets = {
    normal: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, blur: 0, vignette: 0 },
    cinema: { brightness: 96, contrast: 128, saturate: 88, grayscale: 0, sepia: 12, hue: -8, blur: 0, vignette: 45 },
    bw: { brightness: 105, contrast: 130, saturate: 0, grayscale: 100, sepia: 0, hue: 0, blur: 0, vignette: 30 },
    vintage: { brightness: 102, contrast: 92, saturate: 80, grayscale: 0, sepia: 65, hue: 0, blur: 0, vignette: 50 },
    warm: { brightness: 106, contrast: 108, saturate: 135, grayscale: 0, sepia: 25, hue: -10, blur: 0, vignette: 15 },
    cold: { brightness: 100, contrast: 112, saturate: 110, grayscale: 0, sepia: 0, hue: 18, blur: 0, vignette: 20 },
    cyber: { brightness: 108, contrast: 135, saturate: 185, grayscale: 0, sepia: 0, hue: -45, blur: 0, vignette: 35 },
    dreamy: { brightness: 112, contrast: 90, saturate: 120, grayscale: 0, sepia: 10, hue: 5, blur: 1.5, vignette: 25 }
  };

  document.querySelectorAll('.filter-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const clip = getSelectedClip();
      if (!clip) return;
      const presetKey = btn.dataset.preset;
      clip.filters = { preset: presetKey, ...filterPresets[presetKey] };
      saveStateSnapshot();
      syncUIWithSelection();
      renderTimeline();
      renderFrame();
    });
  });

  function onFilterSliderInput() {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.filters.preset = 'custom';
    clip.filters.brightness = Number(fltBrightness.value);
    clip.filters.contrast = Number(fltContrast.value);
    clip.filters.saturate = Number(fltSaturate.value);
    clip.filters.grayscale = Number(fltGrayscale.value);
    clip.filters.sepia = Number(fltSepia.value);
    clip.filters.hue = Number(fltHue.value);
    clip.filters.blur = Number(fltBlur.value);
    clip.filters.vignette = Number(fltVignette.value);
    syncUIWithSelection();
    renderFrame();
  }

  [fltBrightness, fltContrast, fltSaturate, fltGrayscale, fltSepia, fltHue, fltBlur, fltVignette].forEach(slider => {
    slider.addEventListener('input', onFilterSliderInput);
    slider.addEventListener('change', () => {
      saveStateSnapshot();
      renderTimeline();
    });
  });

  document.getElementById('btnResetFilters').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.filters = defaultFilters();
    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
    showToast('Filtros restablecidos');
  });

  document.getElementById('btnApplyFiltersAll').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    state.clips.forEach(c => {
      c.filters = { ...clip.filters };
    });
    saveStateSnapshot();
    renderTimeline();
    renderFrame();
    showToast('🎨 Filtros aplicados a todos los clips del proyecto');
  });

  // Transiciones
  document.querySelectorAll('.trans-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const clip = getSelectedClip();
      if (!clip) return;
      clip.transition.type = btn.dataset.trans;
      saveStateSnapshot();
      syncUIWithSelection();
      renderTimeline();
      renderFrame();
    });
  });

  transDurationSlider.addEventListener('input', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.transition.duration = Number(transDurationSlider.value);
    transDurationBadge.textContent = `${clip.transition.duration.toFixed(1)}s`;
    renderFrame();
  });
  transDurationSlider.addEventListener('change', () => saveStateSnapshot());

  chkFadeOutClip.addEventListener('change', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.transition.fadeOut = chkFadeOutClip.checked;
    saveStateSnapshot();
    renderFrame();
  });

  document.getElementById('btnApplyTransAll').addEventListener('click', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    state.clips.forEach(c => {
      c.transition = { ...clip.transition };
    });
    saveStateSnapshot();
    renderTimeline();
    showToast('✨ Transición aplicada a todos los clips');
  });

  // Texto y Subtítulos
  document.getElementById('btnAddText').addEventListener('click', () => {
    const start = Number(state.currentTime.toFixed(1));
    const newTxt = {
      id: uid('txt'),
      content: 'Nuevo Título',
      start,
      end: Number((start + 3.0).toFixed(1)),
      x: 0.5,
      y: 0.82,
      font: 'Inter, system-ui, sans-serif',
      size: 46,
      color: '#ffffff',
      bgColor: '#000000',
      bgOpacity: 60,
      anim: 'pop'
    };
    state.texts.push(newTxt);
    state.selectedTextId = newTxt.id;
    canvasOverlayHint.style.display = 'none';
    saveStateSnapshot();
    syncUIWithSelection();
    renderTimeline();
    renderFrame();
    showToast('🔤 Texto añadido en el tiempo actual');
  });

  function updateSelectedTextFromInputs() {
    const t = getSelectedText();
    if (!t) return;
    t.content = txtContent.value;
    t.start = Math.max(0, Number(txtStart.value));
    t.end = Math.max(t.start + 0.2, Number(txtEnd.value));
    t.font = txtFont.value;
    t.size = Number(txtSize.value) || 42;
    t.color = txtColor.value;
    t.bgColor = txtBgColor.value;
    t.bgOpacity = Number(txtBgOpacity.value);
    t.anim = txtAnim.value;
    renderTimeline();
    renderFrame();
  }

  [txtContent, txtStart, txtEnd, txtFont, txtSize, txtColor, txtBgColor, txtBgOpacity, txtAnim].forEach(el => {
    el.addEventListener('input', updateSelectedTextFromInputs);
    el.addEventListener('change', () => saveStateSnapshot());
  });

  document.querySelectorAll('.txt-pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = getSelectedText();
      if (!t) return;
      t.x = Number(btn.dataset.x);
      t.y = Number(btn.dataset.y);
      saveStateSnapshot();
      renderFrame();
    });
  });

  document.getElementById('btnDeleteText').addEventListener('click', () => {
    if (state.selectedTextId) deleteSelectedItem();
  });

  // Interacción directa sobre el Canvas Principal (#previewCanvas):
  // Permite mover Textos, mover Recuadros HUD (Vida/Daño) o mover el Encuadre del Video Principal con Imán al Centro H/V
  let canvasDragMode = null; // 'text' | 'hud' | 'video'
  let dragStartMouse = { x: 0, y: 0 };
  let dragStartClipPan = { x: 0, y: 0 };

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    // 1. Verificar si hizo clic sobre un Texto visible
    const clickedTxt = state.texts.find(t =>
      state.currentTime >= t.start &&
      state.currentTime <= t.end &&
      Math.abs(t.x - normX) < 0.22 &&
      Math.abs(t.y - normY) < 0.1
    );

    if (clickedTxt) {
      state.selectedTextId = clickedTxt.id;
      canvasDragMode = 'text';
      syncUIWithSelection();
      renderTimeline();
      renderFrame();
      return;
    }

    // 2. Verificar si hizo clic sobre la placa promocional del Canal / Streamer (Imagen / Logo / Texto)
    const badgeBox = state.gamerFrame && state.gamerFrame._lastBadgeBox;
    if (
      badgeBox &&
      Math.abs(normX - badgeBox.normX) <= Math.max(0.08, badgeBox.halfNormW) &&
      Math.abs(normY - badgeBox.normY) <= Math.max(0.04, badgeBox.halfNormH)
    ) {
      canvasDragMode = 'channelBadge';
      renderFrame();
      return;
    }

    // 3. Verificar si hizo clic sobre un Recuadro HUD (Vida / Daño / Cámara)
    const clickedHud = [...state.hudLayers].reverse().find(layer => {
      const halfW = (layer.destScale / 100) / 2;
      const halfH = halfW * 0.65;
      return Math.abs(layer.destX / 100 - normX) <= halfW && Math.abs(layer.destY / 100 - normY) <= halfH;
    });

    if (clickedHud) {
      state.selectedHudId = clickedHud.id;
      canvasDragMode = 'hud';
      syncUIWithSelection();
      renderHudLayersList();
      renderFrame();
      return;
    }

    // 4. Si hizo clic en el video principal, permite arrastrar qué parte de la grabación se ve (Pan X / Pan Y)
    const activeRange = getClipAtTime(state.currentTime);
    if (activeRange) {
      state.selectedClipId = activeRange.clip.id;
      canvasDragMode = 'video';
      dragStartMouse = { x: normX, y: normY };
      dragStartClipPan = { x: activeRange.clip.panX || 0, y: activeRange.clip.panY || 0 };
      syncUIWithSelection();
      renderTimeline();
      renderFrame();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!canvasDragMode) return;
    const rect = canvas.getBoundingClientRect();
    let normX = Math.max(0.03, Math.min(0.97, (e.clientX - rect.left) / rect.width));
    let normY = Math.max(0.03, Math.min(0.97, (e.clientY - rect.top) / rect.height));

    state.snappedX = false;
    state.snappedY = false;

    if (canvasDragMode === 'text') {
      const t = getSelectedText();
      if (!t) return;
      if (state.snapToCenter && Math.abs(normX - 0.5) < 0.025) {
        normX = 0.5;
        state.snappedX = true;
      }
      if (state.snapToCenter && Math.abs(normY - 0.5) < 0.025) {
        normY = 0.5;
        state.snappedY = true;
      }
      t.x = normX;
      t.y = normY;
      renderFrame();
    } else if (canvasDragMode === 'channelBadge') {
      if (state.snapToCenter && Math.abs(normX - 0.5) < 0.025) {
        normX = 0.5;
        state.snappedX = true;
      }
      if (state.snapToCenter && Math.abs(normY - 0.5) < 0.025) {
        normY = 0.5;
        state.snappedY = true;
      }
      state.gamerFrame.badgeX = Number(normX.toFixed(3));
      state.gamerFrame.badgeY = Number(normY.toFixed(3));
      renderFrame();
    } else if (canvasDragMode === 'hud') {
      const layer = getSelectedHudLayer();
      if (!layer) return;
      let pctX = normX * 100;
      let pctY = normY * 100;
      if (state.snapToCenter && Math.abs(pctX - 50) < 2.5) {
        pctX = 50;
        state.snappedX = true;
      }
      if (state.snapToCenter && Math.abs(pctY - 50) < 2.5) {
        pctY = 50;
        state.snappedY = true;
      }
      layer.destX = Number(pctX.toFixed(1));
      layer.destY = Number(pctY.toFixed(1));
      syncUIWithSelection();
      renderFrame();
    } else if (canvasDragMode === 'video') {
      const clip = getSelectedClip();
      if (!clip) return;
      const dx = (normX - dragStartMouse.x) * 150;
      const dy = (normY - dragStartMouse.y) * 150;
      let newPanX = Math.max(-100, Math.min(100, Math.round(dragStartClipPan.x + dx)));
      let newPanY = Math.max(-100, Math.min(100, Math.round(dragStartClipPan.y + dy)));

      if (state.snapToCenter && Math.abs(newPanX) <= 3) {
        newPanX = 0;
        state.snappedX = true;
      }
      if (state.snapToCenter && Math.abs(newPanY) <= 3) {
        newPanY = 0;
        state.snappedY = true;
      }
      clip.panX = newPanX;
      clip.panY = newPanY;
      syncUIWithSelection();
      renderFrame();
    }
  });

  window.addEventListener('mouseup', () => {
    if (canvasDragMode) {
      canvasDragMode = null;
      state.snappedX = false;
      state.snappedY = false;
      saveStateSnapshot();
      renderFrame();
    }
  });

  // Zoom rápido con la rueda del mouse sobre el lienzo
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const clip = getSelectedClip();
    if (!clip) return;
    const delta = e.deltaY < 0 ? 6 : -6;
    clip.zoom = Math.max(30, Math.min(350, (clip.zoom || 100) + delta));
    syncUIWithSelection();
    renderFrame();
  }, { passive: false });

  // Controles de Audio y Música
  clipVolumeSlider.addEventListener('input', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.volume = Number(clipVolumeSlider.value) / 100;
    clipVolBadge.textContent = `${clipVolumeSlider.value}%`;
  });
  clipVolumeSlider.addEventListener('change', () => saveStateSnapshot());

  chkMuteClip.addEventListener('change', () => {
    const clip = getSelectedClip();
    if (!clip) return;
    clip.muted = chkMuteClip.checked;
    saveStateSnapshot();
    renderTimeline();
  });

  document.getElementById('btnGenSynthMusic').addEventListener('click', generateAmbientSynthMusic);

  bgMusicVolumeSlider.addEventListener('input', () => {
    bgMusicVolBadge.textContent = `${bgMusicVolumeSlider.value}%`;
    if (state.bgMusic) {
      state.bgMusic.volume = Number(bgMusicVolumeSlider.value) / 100;
      if (state.bgMusic.audioEl) state.bgMusic.audioEl.volume = state.bgMusic.volume;
      renderTimeline();
    }
  });

  chkMusicFadeOut.addEventListener('change', () => {
    if (state.bgMusic) state.bgMusic.fadeOut = chkMusicFadeOut.checked;
  });

  document.getElementById('btnRemoveBgMusic').addEventListener('click', () => {
    if (state.bgMusic && state.bgMusic.audioEl) {
      state.bgMusic.audioEl.pause();
    }
    state.bgMusic = null;
    updateAudioTabUI();
    renderTimeline();
    showToast('Pista de música eliminada');
  });

  // Zoom de línea de tiempo y Scrubbing con el mouse sobre la regla / cabezal
  document.getElementById('timelineZoomSlider').addEventListener('input', (e) => {
    state.pixelsPerSecond = Number(e.target.value);
    renderTimeline();
  });

  let isScrubbing = false;
  function scrubFromMouseEvent(e) {
    const rect = timelineInner.getBoundingClientRect();
    const clickX = Math.max(0, e.clientX - rect.left);
    const timeSec = clickX / state.pixelsPerSecond;
    seekTo(timeSec);
  }

  timelineRuler.addEventListener('mousedown', (e) => {
    pausePlayback();
    isScrubbing = true;
    scrubFromMouseEvent(e);
  });

  playhead.querySelector('.playhead-cap').addEventListener('mousedown', (e) => {
    e.stopPropagation();
    pausePlayback();
    isScrubbing = true;
  });

  timelineInner.addEventListener('mousedown', (e) => {
    if (e.target === timelineInner || e.target.classList.contains('timeline-track')) {
      pausePlayback();
      isScrubbing = true;
      scrubFromMouseEvent(e);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isScrubbing) scrubFromMouseEvent(e);
  });

  window.addEventListener('mouseup', () => {
    isScrubbing = false;
  });

  // Exportación (Modal de ajustes MP4 / AVI / WebM / TikTok y progreso)
  document.getElementById('btnExport').addEventListener('click', openExportSettingsModal);
  document.getElementById('btnCloseExportSettings').addEventListener('click', () => {
    document.getElementById('exportSettingsModal').style.display = 'none';
  });
  document.getElementById('btnStartExportNow').addEventListener('click', exportEditedVideo);
  document.getElementById('btnCancelExport').addEventListener('click', () => {
    state.cancelExportFlag = true;
  });

  // Atajos de teclado globales
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      splitClipAtPlayhead();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      copySelectedClip();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault();
      pasteClip();
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      duplicateSelectedClip();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteSelectedItem();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      redo();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      pausePlayback();
      seekTo(state.currentTime - 0.25);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      pausePlayback();
      seekTo(state.currentTime + 0.25);
    }
  });

  // Inicialización
  renderHudLayersList();
  renderTimeline();
  renderFrame();
})();
