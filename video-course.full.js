console.log('-------- v9 (fixed first play + quality selector) ---------');

class VideoCourse extends HTMLElement {
  static defaultConfig = {
    playerId: 'video-player',
    maxWidth: '800px',
    maxHeight: 'auto',
    watermarkInterval: 4000,
    scripts: [
      'https://vjs.zencdn.net/8.6.1/video.min.js',
      'https://cdn.jsdelivr.net/npm/@videojs/http-streaming@3.0.2/dist/videojs-http-streaming.min.js',
      'https://cdn.jsdelivr.net/npm/videojs-quality-selector-hls@1.1.1/dist/videojs-quality-selector-hls.min.js',
    ],
    playerOptions: {
      html5: {
        hls: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true
        }
      },
      responsive: true,
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2]
    },
    watermarkStyle: 'position: absolute; top: 10px; right: 10px; color: rgba(255, 255, 255, 0.7); background-color: rgba(0, 0, 0, 0.3); font-size: 1rem; z-index: 9999; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initProperties();
    this._bindMethods();
  }

  _initProperties() {
    this._playerId = '';
    this._url = '';
    this._poster = '';
    this._maxWidth = VideoCourse.defaultConfig.maxWidth;
    this._maxHeight = VideoCourse.defaultConfig.maxHeight;
    this._watermarkText = '';
    this._player = null;
    this._watermarkInterval = null;
    this._scriptsLoaded = false;
  }

  _bindMethods() {
    this._handleResize = this._handleResize.bind(this);
  }

  static get observedAttributes() {
    return ['playerid', 'url', 'poster', 'maxwidth', 'maxheight', 'dynamicwatermark'];
  }

  connectedCallback() {
    this._loadAttributes();
    this._render();
    this._loadScripts();
    window.addEventListener('resize', this._handleResize);
  }

  _loadAttributes() {
    const providedId = this.getAttribute('playerid') || this.getAttribute('playerId');
    this._playerId = providedId || `video-player-${Math.random().toString(36).slice(2, 9)}`;
    this._url = this.getAttribute('url') || '';
    this._poster = this.getAttribute('poster') || '';
    this._maxWidth = this.getAttribute('maxwidth') || this.getAttribute('maxWidth') || VideoCourse.defaultConfig.maxWidth;
    this._maxHeight = this.getAttribute('maxheight') || this.getAttribute('maxHeight') || VideoCourse.defaultConfig.maxHeight;
    this._watermarkText = this.getAttribute('dynamicwatermark') || this.getAttribute('dynamicWatermark') || '';
  }

  disconnectedCallback() {
    this._cleanup();
  }

  _cleanup() {
    window.removeEventListener('resize', this._handleResize);
    if (this._watermarkInterval) {
      clearInterval(this._watermarkInterval);
      this._watermarkInterval = null;
    }
    if (this._player && typeof this._player.dispose === 'function') {
      this._player.dispose();
      this._player = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this._updateAttribute(name, newValue);
    if (this.isConnected) {
      this._render();
      if (this._player && typeof this._player.dispose === 'function') {
        this._player.dispose();
        this._initializePlayer();
      }
    }
  }

  _updateAttribute(name, value) {
    switch (name) {
      case 'playerid':
        this._playerId = value || `video-player-${Math.random().toString(36).slice(2, 9)}`;
        break;
      case 'url':
        this._url = value || '';
        break;
      case 'poster':
        this._poster = value || '';
        break;
      case 'maxwidth':
        this._maxWidth = value || VideoCourse.defaultConfig.maxWidth;
        break;
      case 'maxheight':
        this._maxHeight = value || VideoCourse.defaultConfig.maxHeight;
        break;
      case 'dynamicwatermark':
        this._watermarkText = value || '';
        break;
    }
  }

  _render() {
    this.shadowRoot.innerHTML = this._getTemplate();
  }

  _getTemplate() {
    return `
      <style>
        @import url('https://vjs.zencdn.net/8.6.1/video-js.css');
        :host { display: block; width: 100%; }
        .video-container { width: 100%; max-width: ${this._maxWidth}; max-height: ${this._maxHeight}; margin: 0 auto; position: relative; }
        .video-js { width: 100%; height: 0; padding-top: 56.25%; position: relative; border-radius: 8px; overflow: hidden; }
        .video-js .vjs-tech { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .vjs-big-play-button { background-color: rgba(0, 0, 0, 0.45) !important; border-radius: 50% !important; width: 60px !important; height: 60px !important; }
      </style>
      <div class="video-container">
        <video-js
          id="${this._playerId}"
          class="video-js vjs-big-play-centered"
          controls
          preload="auto"
          poster="${this._poster}"
          playsinline
          data-setup="{}">
          <source src="${this._url}" type="application/x-mpegURL">
        </video-js>
      </div>
    `;
  }

  _loadScripts() {
    const scripts = VideoCourse.defaultConfig.scripts;
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === scripts.length) {
        this._scriptsLoaded = true;
        this._initializePlayer();
      }
    };
    scripts.forEach(src => {
      if (document.querySelector(`script[src="${src}"]`)) return onLoad();
      const script = document.createElement('script');
      script.src = src;
      script.onload = onLoad;
      document.head.appendChild(script);
    });
  }

  _initializePlayer() {
    if (typeof videojs === 'undefined') {
      return setTimeout(() => this._initializePlayer(), 100);
    }
    const playerElement = this.shadowRoot.querySelector(`#${this._playerId}`);
    if (!playerElement) return;

    this._player = videojs(playerElement, VideoCourse.defaultConfig.playerOptions);

    // ✅ Video quality selector
    if (typeof this._player.qualitySelectorHls === 'function') {
      this._player.qualitySelectorHls({
        displayCurrentQuality: true,
        vjsIconClass: 'vjs-icon-hd'
      });
    }

    // ✅ Attach first play listener immediately
    this._player.one('play', () => this._onFirstPlay());

    this._player.ready(() => {
      this._setupWatermark();
      if (!this._player.paused()) {
        this._onFirstPlay();
      }
    });
  }

  _setupWatermark() {
    if (!this._watermarkText) return;
    const watermarkDiv = document.createElement('div');
    watermarkDiv.textContent = this._watermarkText;
    watermarkDiv.style.cssText = VideoCourse.defaultConfig.watermarkStyle;
    this._player.el().appendChild(watermarkDiv);
    this._setupWatermarkPositioning(watermarkDiv);
  }

  _setupWatermarkPositioning(watermarkDiv) {
    const moveWatermark = () => {
      const playerRect = this._player.el().getBoundingClientRect();
      const maxX = playerRect.width - watermarkDiv.offsetWidth;
      const maxY = playerRect.height - watermarkDiv.offsetHeight;
      const randomX = Math.max(10, Math.floor(Math.random() * maxX));
      const randomY = Math.max(10, Math.floor(Math.random() * maxY));
      watermarkDiv.style.top = `${randomY}px`;
      watermarkDiv.style.left = `${randomX}px`;
    };
    moveWatermark();
    this._watermarkInterval = setInterval(moveWatermark, VideoCourse.defaultConfig.watermarkInterval);
  }

  _handleResize() {
    if (this._player) this._player.fluid(true);
  }

  play() { if (this._player) this._player.play(); }
  pause() { if (this._player) this._player.pause(); }
  seekTo(time) { if (this._player && typeof time === 'number' && time >= 0) this._player.currentTime(time); }

  callCounterAPI() {
    const parts = this._url.split("/");
    const name = decodeURIComponent(parts[parts.length - 2]).replace('video-course?name=', '');
    fetch(`https://moonlit-cassowary-25.convex.site/increment-vdo-count?name=${name}`)
      .then(() => console.log('success counter'))
      .catch(err => console.log('error counter:', err));
  }

  _onFirstPlay() {
    this.callCounterAPI();
    console.log('Video played for the first time!');
    this.dispatchEvent(new CustomEvent('firstplay', {
      detail: { player: this._player, currentTime: this._player.currentTime() }
    }));
  }
}

if (!customElements.get('video-course')) {
  customElements.define('video-course', VideoCourse);
}
