// Elements
const fileInput = document.getElementById('fileInput');
const folderBtn = document.getElementById('folderBtn');
const dropZone = document.getElementById('dropZone');
const playlistEl = document.getElementById('playlist');
const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('playPause');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const albumEl = document.getElementById('album');
const coverEl = document.getElementById('cover');
const vinylEl = document.getElementById('vinyl');
const volumeEl = document.getElementById('volume');
const volumeIcon = document.getElementById('volumeIcon');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const clearListBtn = document.getElementById('clearList');
const searchInput = document.getElementById('searchInput');
const trackCount = document.getElementById('trackCount');
const totalDuration = document.getElementById('totalDuration');
const backgroundBlur = document.getElementById('backgroundBlur');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const equalizerBars = document.querySelectorAll('.eq-bar');

let tracks = [];
let filteredTracks = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let audioContext;
let analyser;
let dataArray;
let canvasContext;

// Initialize visualizer
function initVisualizer() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    canvasContext = visualizerCanvas.getContext('2d');
    drawVisualizer();
  }
}

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  
  if (!analyser) return;
  
  analyser.getByteFrequencyData(dataArray);
  
  const width = visualizerCanvas.width;
  const height = visualizerCanvas.height;
  canvasContext.clearRect(0, 0, width, height);
  
  const barWidth = (width / dataArray.length) * 2.5;
  let x = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * height * 0.8;
    
    const gradient = canvasContext.createLinearGradient(0, height - barHeight, 0, height);
    gradient.addColorStop(0, '#6c5ce7');
    gradient.addColorStop(1, '#a29bfe');
    
    canvasContext.fillStyle = gradient;
    canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
    
    x += barWidth + 1;
  }
}

// Helpers
function formatTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function updateStats() {
  const total = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  trackCount.textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
  totalDuration.textContent = formatTime(total);
}

function getColorFromImage(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let r = 0, g = 0, b = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  
  const pixelCount = data.length / 4;
  r = Math.floor(r / pixelCount);
  g = Math.floor(g / pixelCount);
  b = Math.floor(b / pixelCount);
  
  return `rgb(${r}, ${g}, ${b})`;
}

function updateBackground(color) {
  if (color) {
    backgroundBlur.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
  }
}

function createTrackItem(track, index) {
  const li = document.createElement('li');
  li.dataset.index = index;
  li.dataset.name = track.name.toLowerCase();

  const num = document.createElement('div');
  num.className = 'track-number';
  num.innerHTML = '<i class="fas fa-music"></i>';

  const name = document.createElement('div');
  name.className = 'track-name';
  name.textContent = track.name;

  const dur = document.createElement('div');
  dur.className = 'track-duration';
  dur.textContent = formatTime(track.duration || 0);

  li.append(num, name, dur);
  li.addEventListener('click', () => {
    const actualIndex = tracks.findIndex(t => t.url === track.url);
    loadTrack(actualIndex);
    playTrack();
  });
  return li;
}

function refreshPlaylist() {
  playlistEl.innerHTML = '';
  const searchTerm = searchInput.value.toLowerCase();
  
  filteredTracks = tracks.filter(t => 
    t.name.toLowerCase().includes(searchTerm)
  );
  
  filteredTracks.forEach((t, i) => {
    const actualIndex = tracks.findIndex(track => track.url === t.url);
    playlistEl.appendChild(createTrackItem(t, actualIndex));
  });
  
  if (filteredTracks.length === 0 && searchTerm) {
    playlistEl.innerHTML = '<li style="text-align:center;color:var(--muted);">No tracks found</li>';
  }
  
  updateStats();
}

function addFiles(fileList) {
  const files = Array.from(fileList).filter(f => f.type.startsWith('audio'));
  if (!files.length) return;
  let added = 0;

  files.forEach(file => {
    const url = URL.createObjectURL(file);
    const temp = document.createElement('audio');
    temp.preload = 'metadata';
    temp.src = url;
    temp.addEventListener('loadedmetadata', () => {
      tracks.push({
        file,
        url,
        name: file.name.replace(/\.[^/.]+$/, ''),
        duration: temp.duration
      });
      added++;
      if (added === files.length) {
        refreshPlaylist();
        if (currentIndex === -1 && tracks.length > 0) {
          loadTrack(0);
        }
      }
    });
  });
}

// Load track
function loadTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const t = tracks[index];
  audio.src = t.url;
  titleEl.textContent = t.name;
  
  highlightPlaying();
  
  if (window.jsmediatags) {
    jsmediatags.read(t.file, {
      onSuccess: function(tag) {
        const tags = tag.tags;
        artistEl.textContent = tags.artist || 'Unknown Artist';
        albumEl.textContent = tags.album || 'Unknown Album';
        
        const picture = tags.picture;
        if (picture) {
          const base64String = picture.data.reduce((data, byte) => {
            return data + String.fromCharCode(byte);
          }, '');
          const imageUrl = `data:${picture.format};base64,${btoa(base64String)}`;
          
          const img = new Image();
          img.onload = function() {
            const color = getColorFromImage(img);
            updateBackground(color);
          };
          img.src = imageUrl;
          
          coverEl.innerHTML = `<img src="${imageUrl}" alt="cover">`;
        } else {
          setDefaultCover();
        }
      },
      onError: function() {
        artistEl.textContent = 'Unknown Artist';
        albumEl.textContent = 'Unknown Album';
        setDefaultCover();
      }
    });
  } else {
    artistEl.textContent = 'Unknown Artist';
    albumEl.textContent = 'Unknown Album';
    setDefaultCover();
  }
}

function setDefaultCover() {
  coverEl.innerHTML = '<div class="cover-placeholder"><i class="fas fa-music"></i></div>';
  updateBackground('rgba(108, 92, 231, 0.4)');
}

function highlightPlaying() {
  playlistEl.querySelectorAll('li').forEach(li => {
    li.classList.remove('playing');
    const icon = li.querySelector('.track-number i');
    if (icon) icon.className = 'fas fa-music';
  });
  
  const currentLi = playlistEl.querySelector(`li[data-index="${currentIndex}"]`);
  if (currentLi) {
    currentLi.classList.add('playing');
    const icon = currentLi.querySelector('.track-number i');
    if (icon) icon.className = 'fas fa-play';
    currentLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Play / Pause
function playTrack() {
  if (!audio.src) return;
  
  if (!audioContext) {
    initVisualizer();
  }
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  audio.play();
  isPlaying = true;
  playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
  coverEl.classList.add('playing');
  vinylEl.classList.add('playing');
  
  equalizerBars.forEach(bar => {
    bar.style.animationPlayState = 'running';
  });
}

function pauseTrack() {
  audio.pause();
  isPlaying = false;
  playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
  coverEl.classList.remove('playing');
  vinylEl.classList.remove('playing');
  
  equalizerBars.forEach(bar => {
    bar.style.animationPlayState = 'paused';
  });
}

// Next / Prev
function nextTrack() {
  if (isShuffle && tracks.length > 1) {
    let next = Math.floor(Math.random() * tracks.length);
    while (next === currentIndex && tracks.length > 1) {
      next = Math.floor(Math.random() * tracks.length);
    }
    loadTrack(next);
    playTrack();
    return;
  }
  let next = currentIndex + 1;
  if (next >= tracks.length) {
    if (isRepeat) next = 0;
    else {
      pauseTrack();
      return;
    }
  }
  loadTrack(next);
  playTrack();
}

function prevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  let prev = currentIndex - 1;
  if (prev < 0) prev = tracks.length - 1;
  loadTrack(prev);
  playTrack();
}

// Folder selection
folderBtn.addEventListener('click', async () => {
  try {
    const dirHandle = await window.showDirectoryPicker();
    const files = [];
    
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        if (file.type.startsWith('audio')) {
          files.push(file);
        }
      }
    }
    
    if (files.length > 0) {
      addFiles(files);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error accessing folder:', err);
      alert('Unable to access folder. Make sure you granted permission.');
    }
  }
});

// File input
fileInput.addEventListener('change', e => {
  addFiles(e.target.files);
  fileInput.value = '';
});

// Drag & Drop
['dragenter', 'dragover'].forEach(ev => {
  dropZone.addEventListener(ev, e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(ev => {
  dropZone.addEventListener(ev, e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', e => {
  addFiles(e.dataTransfer.files);
});

// Audio events
audio.addEventListener('timeupdate', () => {
  const percent = (audio.currentTime / audio.duration) * 100 || 0;
  progress.value = percent;
  progressFill.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
  
  // Resize canvas
  visualizerCanvas.width = visualizerCanvas.offsetWidth;
  visualizerCanvas.height = visualizerCanvas.offsetHeight;
});

audio.addEventListener('ended', () => {
  if (isRepeat) {
    audio.currentTime = 0;
    playTrack();
  } else {
    nextTrack();
  }
});

// Progress seek
progress.addEventListener('input', () => {
  if (!audio.duration) return;
  const seekTo = (progress.value / 100) * audio.duration;
  audio.currentTime = seekTo;
  progressFill.style.width = `${progress.value}%`;
});

// Controls
playPauseBtn.addEventListener('click', () => {
  if (!audio.src) {
    if (tracks.length) {
      loadTrack(0);
      playTrack();
    }
    return;
  }
  isPlaying ? pauseTrack() : playTrack();
});

prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);

// Volume
volumeEl.addEventListener('input', () => {
  audio.volume = volumeEl.value;
  
  if (volumeEl.value == 0) {
    volumeIcon.className = 'fas fa-volume-mute';
  } else if (volumeEl.value < 0.5) {
    volumeIcon.className = 'fas fa-volume-down';
  } else {
    volumeIcon.className = 'fas fa-volume-up';
  }
});

// Shuffle / Repeat
shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
  isRepeat = !isRepeat;
  repeatBtn.classList.toggle('active', isRepeat);
});

// Clear playlist
clearListBtn.addEventListener('click', () => {
  if (!confirm('Clear all tracks from playlist?')) return;
  
  tracks.forEach(t => URL.revokeObjectURL(t.url));
  tracks = [];
  filteredTracks = [];
  currentIndex = -1;
  audio.pause();
  audio.src = '';
  titleEl.textContent = 'No track selected';
  artistEl.textContent = '—';
  albumEl.textContent = '—';
  refreshPlaylist();
  setDefaultCover();
  coverEl.classList.remove('playing');
  vinylEl.classList.remove('playing');
});

// Search
searchInput.addEventListener('input', () => {
  refreshPlaylist();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      if (!audio.src && tracks.length) {
        loadTrack(0);
        playTrack();
      } else {
        isPlaying ? pauseTrack() : playTrack();
      }
      break;
    case 'ArrowRight':
      e.preventDefault();
      nextTrack();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevTrack();
      break;
  }
});

// Initialize canvas size
window.addEventListener('resize', () => {
  visualizerCanvas.width = visualizerCanvas.offsetWidth;
  visualizerCanvas.height = visualizerCanvas.offsetHeight;
});

visualizerCanvas.width = visualizerCanvas.offsetWidth;
visualizerCanvas.height = visualizerCanvas.offsetHeight;