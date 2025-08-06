class VideoCourse extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Define properties
    this._playerId = '';
    this._url = '';
    this._poster = '';
    this._maxWidth = '800px';
    this._maxHeight = 'auto';
    this._watermarkText = '';
    this._player = null;
    
    // Bind methods
    this._handleResize = this._handleResize.bind(this);
  }
  
  // Observed attributes for property changes - fix case sensitivity issues
  static get observedAttributes() {
    return ['playerid', 'url', 'poster', 'maxwidth', 'maxheight', 'dynamicwatermark'];
  }
  
  // Lifecycle: when component is added to DOM
  connectedCallback() {
    // Fix case sensitivity by using lowercase attribute names
    this._playerId = this.getAttribute('playerid') || this.getAttribute('playerId') || 'video-player';
    this._url = this.getAttribute('url') || '';
    this._poster = this.getAttribute('poster') || '';
    this._maxWidth = this.getAttribute('maxwidth') || this.getAttribute('maxWidth') || '800px';
    this._maxHeight = this.getAttribute('maxheight') || this.getAttribute('maxHeight') || 'auto';
    this._watermarkText = this.getAttribute('dynamicwatermark') || this.getAttribute('dynamicWatermark') || '';
    
    this._render();
    this._loadScripts();
    
    // Add resize listener
    window.addEventListener('resize', this._handleResize);
  }
  
  // Lifecycle: when component is removed from DOM
  disconnectedCallback() {
    window.removeEventListener('resize', this._handleResize);
    
    // Clear watermark interval if it exists
    if (this._watermarkInterval) {
      clearInterval(this._watermarkInterval);
    }
    
    // Clean up video.js player if it exists
    if (this._player && typeof this._player.dispose === 'function') {
      this._player.dispose();
    }
  }
  
  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch(name) {
      case 'playerid':
        this._playerId = newValue || 'video-player';
        break;
      case 'url':
        this._url = newValue || '';
        break;
      case 'poster':
        this._poster = newValue || '';
        break;
      case 'maxwidth':
        this._maxWidth = newValue || '800px';
        break;
      case 'maxheight':
        this._maxHeight = newValue || 'auto';
        break;
      case 'dynamicwatermark':
        this._watermarkText = newValue || '';
        break;
    }
    
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
  
  // Private method to render the component
  _render() {
    const template = `
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

    this.shadowRoot.innerHTML = template;
  }
  
  // Load required scripts
  _loadScripts() {
    const scripts = [
      'https://vjs.zencdn.net/8.6.1/video.min.js',
      'https://cdn.jsdelivr.net/npm/@videojs/http-streaming@3.0.2/dist/videojs-http-streaming.min.js',
    ];

    let loaded = 0;
    scripts.forEach(src => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        loaded++;
        if (loaded === scripts.length) this._initializePlayer();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length) this._initializePlayer();
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
    
    this._player = videojs(playerElement, {
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
    });

    this._player.ready(() => {
      // Replace the dynamic watermark code with this
      if (this._watermarkText) {
        const watermarkDiv = document.createElement('div');
        watermarkDiv.textContent = this._watermarkText;
        watermarkDiv.style.cssText = 'position: absolute; top: 10px; right: 10px; color: rgba(255, 255, 255, 0.7); background-color: rgba(0, 0, 0, 0.3); font-size: 1rem; z-index: 9999; padding: 4px 8px; border-radius: 4px; font-weight: bold;';
        
        // Add the watermark to the player
        this._player.el().appendChild(watermarkDiv);
        
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
        this._watermarkInterval = setInterval(moveWatermark, 4000);
      }
      
      // Add event listeners
      this._player.on('play', () => {
        this.dispatchEvent(new CustomEvent('videoplay', { bubbles: true, composed: true }));
      });
      
      this._player.on('pause', () => {
        this.dispatchEvent(new CustomEvent('videopause', { bubbles: true, composed: true }));
      });
      
      this._player.on('ended', () => {
        this.dispatchEvent(new CustomEvent('videoended', { bubbles: true, composed: true }));
      });
    });
  }
  
  // Handle window resize
  _handleResize() {
    if (this._player) {
      this._player.fluid(true);
    }
  }
  
  // Public API methods
  play() {
    if (this._player) this._player.play();
  }
  
  pause() {
    if (this._player) this._player.pause();
  }
  
  reset() {
    if (this._player) {
      this._player.currentTime(0);
      this._player.pause();
    }
  }
  
  setVolume(level) {
    if (this._player && typeof level === 'number' && level >= 0 && level <= 1) {
      this._player.volume(level);
    }
  }
  
  // Add this new method
  seekTo(timeInSeconds) {
    if (this._player && typeof timeInSeconds === 'number' && timeInSeconds >= 0) {
      this._player.currentTime(timeInSeconds);
    }
  }
}

// Register the custom element
customElements.define('video-course', VideoCourse);

