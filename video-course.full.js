/**
 * VideoCourse - A reusable web component for video playback with HLS support
 * Features:
 * - HLS streaming with quality selection
 * - Dynamic watermark with random positioning
 * - Responsive design
 * - Custom events for video state changes
 * - Public API for controlling playback
 */

// Wrap the entire component in an IIFE to prevent global namespace pollution

class VideoCourse extends HTMLElement {
  // Default configuration that can be overridden
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

    // Initialize properties
    this._initProperties();

    // Bind methods to maintain correct 'this' context
    this._bindMethods();
  }

  // Initialize all properties with default values
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

  // Bind methods to maintain correct 'this' context
  _bindMethods() {
    this._handleResize = this._handleResize.bind(this);
  }

  // Define observed attributes for property changes
  static get observedAttributes() {
    return ['playerid', 'url', 'poster', 'maxwidth', 'maxheight', 'dynamicwatermark'];
  }

  // Lifecycle: when component is added to DOM
  connectedCallback() {
    this._loadAttributes();
    this._render();
    this._loadScripts();

    // Add resize listener
    window.addEventListener('resize', this._handleResize);
  }

  // Load attributes from HTML element
  _loadAttributes() {
    this._playerId = this.getAttribute('playerid') || this.getAttribute('playerId') || VideoCourse.defaultConfig.playerId;
    this._url = this.getAttribute('url') || '';
    this._poster = this.getAttribute('poster') || '';
    this._maxWidth = this.getAttribute('maxwidth') || this.getAttribute('maxWidth') || VideoCourse.defaultConfig.maxWidth;
    this._maxHeight = this.getAttribute('maxheight') || this.getAttribute('maxHeight') || VideoCourse.defaultConfig.maxHeight;
    this._watermarkText = this.getAttribute('dynamicwatermark') || this.getAttribute('dynamicWatermark') || '';
  }

  // Lifecycle: when component is removed from DOM
  disconnectedCallback() {
    this._cleanup();
  }

  // Clean up resources
  _cleanup() {
    window.removeEventListener('resize', this._handleResize);

    // Clear watermark interval if it exists
    if (this._watermarkInterval) {
      clearInterval(this._watermarkInterval);
      this._watermarkInterval = null;
    }

    // Clean up video.js player if it exists
    if (this._player && typeof this._player.dispose === 'function') {
      this._player.dispose();
      this._player = null;
    }
  }

  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this._updateAttribute(name, newValue);

    // Re-render if component is already connected
    if (this.isConnected) {
      this._render();
      // Reinitialize player if it exists
      if (this._player && typeof this._player.dispose === 'function') {
        this._player.dispose();
        this._initializePlayer();
      }
    }
  }

  // Update attribute value
  _updateAttribute(name, value) {
    switch (name) {
      case 'playerid':
        this._playerId = value || VideoCourse.defaultConfig.playerId;
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

  // Render the component template
  _render() {
    this.shadowRoot.innerHTML = this._getTemplate();
  }

  // Get the component template
  _getTemplate() {
    return `
        <style>
          @import url('https://vjs.zencdn.net/8.6.1/video-js.css');
          
          :host {
            display: block;
            width: 100%;
          }
          .video-container {
            width: 100%;
            max-width: ${this._maxWidth};
            max-height: ${this._maxHeight};
            margin: 0 auto;
            position: relative;
          }
          .video-js {
            width: 100%;
            height: 0;
            padding-top: 56.25%; /* 16:9 Aspect Ratio */
            position: relative;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .video-js .vjs-tech {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .vjs-big-play-button {
            background-color: rgba(0, 0, 0, 0.45) !important;
            border-radius: 50% !important;
            width: 60px !important;
            height: 60px !important;
            line-height: 60px !important;
            margin-top: -30px !important;
            margin-left: -30px !important;
          }
          .vjs-poster img {
            object-fit: cover;
          }
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
            <p class="vjs-no-js">
              To view this video please enable JavaScript, and consider upgrading to a web browser that
              <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>.
            </p>
          </video-js>
        </div>
      `;
  }

  // Load required scripts
  _loadScripts() {
    if (this._scriptsLoaded) {
      this._initializePlayer();
      return;
    }

    const scripts = VideoCourse.defaultConfig.scripts;
    let loaded = 0;

    scripts.forEach(src => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        loaded++;
        if (loaded === scripts.length) {
          this._scriptsLoaded = true;
          this._initializePlayer();
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length) {
          this._scriptsLoaded = true;
          this._initializePlayer();
        }
      };
      document.head.appendChild(script);
    });
  }

  // Initialize video.js player
  _initializePlayer() {
    // Wait for videojs to be available
    if (typeof videojs === 'undefined') {
      setTimeout(() => this._initializePlayer(), 100);
      return;
    }

    const playerElement = this.shadowRoot.querySelector(`#${this._playerId}`);
    if (!playerElement) return;

    // Create player with default options
    this._player = videojs(playerElement, VideoCourse.defaultConfig.playerOptions);

    // Set up player when ready
    this._player.qualitySelectorHls({
      displayCurrentQuality: true,
      vjsIconClass: 'vjs-icon-hd'
    })
    this._player.ready(() => {
      this._setupWatermark();
    });
  }

  // Set up watermark if text is provided
  _setupWatermark() {
    if (!this._watermarkText) return;

    const watermarkDiv = document.createElement('div');
    watermarkDiv.textContent = this._watermarkText;
    watermarkDiv.style.cssText = VideoCourse.defaultConfig.watermarkStyle;

    // Add the watermark to the player
    this._player.el().appendChild(watermarkDiv);

    // Set up random positioning
    this._setupWatermarkPositioning(watermarkDiv);
  }

  // Set up random positioning for watermark
  _setupWatermarkPositioning(watermarkDiv) {
    // Function to move watermark to random position
    const moveWatermark = () => {
      const playerRect = this._player.el().getBoundingClientRect();
      const maxX = playerRect.width - watermarkDiv.offsetWidth;
      const maxY = playerRect.height - watermarkDiv.offsetHeight;

      // Generate random positions (with some padding from edges)
      const randomX = Math.max(10, Math.floor(Math.random() * maxX));
      const randomY = Math.max(10, Math.floor(Math.random() * maxY));

      // Apply new position
      watermarkDiv.style.top = `${randomY}px`;
      watermarkDiv.style.right = 'auto';
      watermarkDiv.style.left = `${randomX}px`;
    };

    // Move watermark initially
    moveWatermark();

    // Set interval to move watermark every 4 seconds
    this._watermarkInterval = setInterval(
      moveWatermark,
      VideoCourse.defaultConfig.watermarkInterval
    );
  }

  // Handle window resize
  _handleResize() {
    if (this._player) {
      this._player.fluid(true);
    }
  }

  // PUBLIC API METHODS

  /**
   * Play the video
   */
  play() {
    if (this._player) this._player.play();
  }

  /**
   * Pause the video
   */
  pause() {
    if (this._player) this._player.pause();
  }

  /**
   * Seek to a specific time in the video
   * @param {number} timeInSeconds - Time to seek to in seconds
   */
  seekTo(timeInSeconds) {
    if (this._player && typeof timeInSeconds === 'number' && timeInSeconds >= 0) {
      this._player.currentTime(timeInSeconds);
    }
  }
}

// Register the custom element only if it hasn't been registered yet
if (!customElements.get('video-course')) {
  customElements.define('video-course', VideoCourse);
}
