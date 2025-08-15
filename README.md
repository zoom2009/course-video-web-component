# How to resize

## ตัวอย่าง url video => https://moonlit-cassowary-25.convex.site/video-course?name=44-Changing%20Bill/master.m3u8

# คู่มือการแปลงไฟล์วิดีโอเป็น HLS (.m3u8) หลายความละเอียดด้วย FFmpeg

## คำอธิบาย

เอกสารนี้จะอธิบายขั้นตอนการแปลงไฟล์วิดีโอ MP4 ให้กลายเป็นไฟล์ HLS (.m3u8) ที่รองรับการสตรีมแบบ Adaptive Bitrate Streaming หลายความละเอียด (480p, 720p, 1080p, 1440p)

---

## ขั้นตอนการทำงาน

### 1. เตรียมไฟล์วิดีโอต้นฉบับ

ตั้งชื่อไฟล์วิดีโอของคุณว่า

```
input.mp4
```

---

### 2. ย่อวิดีโอให้เป็นไฟล์ขนาดเล็ก (Optional)

ลดขนาดวิดีโอให้เล็กลงก่อน เพื่อให้ encode เร็วขึ้น และลดการใช้ทรัพยากรเครื่อง

```bash
ffmpeg -i input.mp4 -c:v libx264 -preset veryfast -r 60 -vf "scale=2560:-1" -c:a copy reduce.mp4
```

* ลดความละเอียดวิดีโอให้กว้าง 2560px (ความสูงจะปรับอัตโนมัติตามอัตราส่วนเดิม)
* บีบอัดวิดีโอด้วย libx264
* รักษาเสียงเดิม (copy audio)

---

### 3. แปลงไฟล์วิดีโอเป็น HLS (.m3u8) รองรับ 4 ความละเอียด

ใช้คำสั่งนี้เพื่อสร้างไฟล์ HLS พร้อม master playlist และ sub-playlist แยกตามความละเอียด

Window ต้อง save เป็นไฟล์ .bat แล้วกดเข้าใจงาน
```bash
ffmpeg -i reduce.mp4 ^
-filter_complex "[0:v]split=4[v480][v720][v1080][v1440]; [v480]scale=w=854:h=480[v480out]; [v720]scale=w=1280:h=720[v720out]; [v1080]scale=w=1920:h=1080[v1080out]; [v1440]scale=w=2560:h=1440[v1440out]" ^
-map "[v480out]" -c:v:0 libx264 -b:v:0 1400k -preset veryfast -g 48 -sc_threshold 0 ^
-map "[v720out]" -c:v:1 libx264 -b:v:1 2800k -preset veryfast -g 48 -sc_threshold 0 ^
-map "[v1080out]" -c:v:2 libx264 -b:v:2 5000k -preset veryfast -g 48 -sc_threshold 0 ^
-map "[v1440out]" -c:v:3 libx264 -b:v:3 8000k -preset veryfast -g 48 -sc_threshold 0 ^
-map a:0 -c:a:0 aac -b:a:0 128k ^
-map a:0 -c:a:1 aac -b:a:1 128k ^
-map a:0 -c:a:2 aac -b:a:2 128k ^
-map a:0 -c:a:3 aac -b:a:3 128k ^
-f hls -hls_time 6 -hls_playlist_type vod ^
-hls_segment_filename "v%%v/file_%%03d.ts" ^
-master_pl_name master.m3u8 ^
-var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" ^
v%%v/prog.m3u8

```

Mac
```bash
ffmpeg -i reduce.mp4 \
-filter_complex "[0:v]split=4[v480][v720][v1080][v1440]; \
  [v480]scale=w=854:h=480[v480out]; \
  [v720]scale=w=1280:h=720[v720out]; \
  [v1080]scale=w=1920:h=1080[v1080out]; \
  [v1440]scale=w=2560:h=1440[v1440out]" \
-map "[v480out]" -c:v:0 libx264 -b:v:0 1400k -preset veryfast -g 48 -sc_threshold 0 \
-map "[v720out]" -c:v:1 libx264 -b:v:1 2800k -preset veryfast -g 48 -sc_threshold 0 \
-map "[v1080out]" -c:v:2 libx264 -b:v:2 5000k -preset veryfast -g 48 -sc_threshold 0 \
-map "[v1440out]" -c:v:3 libx264 -b:v:3 8000k -preset veryfast -g 48 -sc_threshold 0 \
-map a:0 -c:a:0 aac -b:a:0 128k \
-map a:0 -c:a:1 aac -b:a:1 128k \
-map a:0 -c:a:2 aac -b:a:2 128k \
-map a:0 -c:a:3 aac -b:a:3 128k \
-f hls \
-hls_time 6 \
-hls_playlist_type vod \
-hls_segment_filename "v%v/file_%03d.ts" \
-master_pl_name master.m3u8 \
-var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" \
v%v/prog.m3u8

```

### อธิบายรายละเอียด:

| ความละเอียด | ขนาด (px) | Bitrate ประมาณ (k) |
| ----------- | --------- | ------------------ |
| 480p        | 854x480   | 1400k              |
| 720p        | 1280x720  | 2800k              |
| 1080p       | 1920x1080 | 5000k              |
| 1440p       | 2560x1440 | 8000k              |

---

### 4. โครงสร้างไฟล์ที่ได้จะเป็นแบบนี้:

```
master.m3u8
v0/
  prog.m3u8
  file_000.ts
  file_001.ts
  ...
v1/
  prog.m3u8
  file_000.ts
  ...
v2/
  prog.m3u8
  file_000.ts
  ...
v3/
  prog.m3u8
  file_000.ts
  ...
v4/
  prog.m3u8
  file_000.ts
  ...
```

---

## 5. ตัวอย่าง HTML เล่นไฟล์ HLS ด้วย HLS.js

นำไปวางในไฟล์ `.html` แล้วเปิดผ่าน browser ได้เลย (ใช้ master.m3u8 เป็น source)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HLS.js Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <video id="video" controls width="640" height="360"></video>

  <script>
    const video = document.getElementById('video');
    const videoSrc = 'master.m3u8'; // เปลี่ยนเป็น path ของ master.m3u8 ที่คุณวางไว้

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function() {
        video.play();
      });
    }
  </script>
</body>
</html>
```

---

## หมายเหตุเพิ่มเติม:

* ไฟล์ .m3u8 และ .ts ต้องวางใน server ที่รองรับ HTTP Requests (เช่น Apache, Nginx, CDN) ไม่สามารถเปิดจากไฟล์ local ได้
* หากต้องการใช้บน production แนะนำให้ใช้ CDN เพื่อโหลดไฟล์ .ts ให้เร็วขึ้น
* หากวิดีโอมีความยาวมาก ให้ปรับ `-hls_time 6` เป็น 2-4 วินาที จะทำให้สลับ bitrate ไหลลื่นขึ้นเวลาสัญญาณอ่อน

---

ต้องการให้ผมทำ **Shell Script Auto Run แบบ copy paste ใช้งานได้เลยไหมครับ?** (จะพิมพ์แค่ชื่อไฟล์ แล้ว script จะ gen ให้ครบเลย) ?

------------------------

# Video-Course Web Component

A reusable web component for video playback with HLS (HTTP Live Streaming) support. This custom element provides a responsive video player with quality selection, dynamic watermarking, and a simple API for controlling playback.

## Features

- HLS streaming with adaptive quality selection
- Dynamic watermark with random positioning
- Responsive design that adapts to container size
- Custom events for video state changes
- Simple API for controlling playback
- Support for video quality selection

## Installation

### Option 1: Include via CDN

```html
<script src="https://cdn.example.com/path/to/video-course.js"></script>
```

### Option 2: Download and include locally

1. Download the `video-course.js` file
2. Include it in your HTML:

```html
<script src="./video-course.js"></script>
```

## Basic Usage

Add the `<video-course>` element to your HTML:

```html
<video-course
  id="myCourseVideo"
  playerid="video1"
  url="https://example.com/path/to/your/video/master.m3u8"
  poster="https://example.com/path/to/your/poster.jpg"
  maxwidth="800px"
  maxheight="auto"
  dynamicwatermark="user@example.com"
></video-course>
```

## Attributes

| Attribute | Description | Default |
|-----------|-------------|--------|
| `playerid` | Unique ID for the video player | `video-player` |
| `url` | URL to the HLS stream (m3u8 file) | `""` |
| `poster` | URL to the poster image | `""` |
| `maxwidth` | Maximum width of the video player | `800px` |
| `maxheight` | Maximum height of the video player | `auto` |
| `dynamicwatermark` | Text to display as a watermark | `""` |

## JavaScript API

The component provides a JavaScript API for controlling the video:

```javascript
// Get a reference to the component
const player = document.getElementById('myCourseVideo');

// Control playback
player.play();       // Play the video
player.pause();      // Pause the video
player.reset();      // Reset to beginning and pause

// Seek to a specific time (in seconds)
player.seekTo(30);   // Jump to 30 seconds

// Control volume (0-1)
player.setVolume(0.5);  // Set volume to 50%

// Quality control
player.setQuality('auto');  // Auto quality
player.setQuality(720);     // Force 720p quality
const currentQuality = player.getQuality();  // Get current quality

// Get information
const currentTime = player.getCurrentTime();  // Current playback position
const duration = player.getDuration();       // Total video duration
const isPlaying = player.isPlaying();        // Check if video is playing
```

## Events

The component dispatches custom events that you can listen for:

```javascript
const player = document.getElementById('myCourseVideo');

// Listen for play event
player.addEventListener('videoplay', () => {
  console.log('Video started playing');
});

// Listen for pause event
player.addEventListener('videopause', () => {
  console.log('Video paused');
});

// Listen for ended event
player.addEventListener('videoended', () => {
  console.log('Video playback completed');
});
```

## Example

Here's a complete example showing how to use the component with custom controls:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Course Player</title>
  <script src="./video-course.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .video-wrapper {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .controls {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    button {
      padding: 8px 16px;
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Video Course Player</h1>

  <div class="video-wrapper">
    <video-course
      id="myCourseVideo"
      playerid="video1"
      url="https://example.com/path/to/your/video/master.m3u8"
      poster="https://example.com/path/to/your/poster.jpg"
      maxwidth="800px"
      maxheight="auto"
      dynamicwatermark="user@example.com"
    ></video-course>
  </div>
  
  <div class="controls">
    <button onclick="jumpToTime(0)">Start</button>
    <button onclick="jumpToTime(30)">30s</button>
    <button onclick="jumpToTime(60)">1min</button>
    <button onclick="toggleQuality()">Toggle Quality</button>
  </div>
  
  <script>
    function jumpToTime(second) {
      const player = document.getElementById('myCourseVideo');
      if (player) {
        player.seekTo(second);
        player.play();
      }
    }
    
    function toggleQuality() {
      const player = document.getElementById('myCourseVideo');
      if (player) {
        const currentQuality = player.getQuality();
        if (currentQuality === 'auto' || currentQuality === '720') {
          player.setQuality(360);
        } else {
          player.setQuality('auto');
        }
      }
    }
  </script>
</body>
</html>
```

## Dependencies

This component automatically loads the following dependencies:

- Video.js (v8.6.1)
- VideoJS HTTP Streaming plugin
- VideoJS Contrib Quality Levels plugin
- VideoJS HLS Quality Selector plugin

## Browser Compatibility

This component works in all modern browsers that support Custom Elements v1 and HLS playback via Video.js:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.