// ==========================================
// HERO CANVAS SETUP
// ==========================================
const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d", { alpha: false });
const loader = document.getElementById("loader");
const loaderText = document.querySelector(".loader-text");
const steps = document.querySelectorAll(".step");

const frameCount = 120;
const currentFrame = index => `vellfire/${(index + 1).toString().padStart(5, '0')}.jpg`;

const images = [];
let loadedCount = 0;
const obj = { frame: 0 };
let currentTargetFrame = 0;

// ==========================================
// SIDE SCROLL ENTRY CANVAS SETUP
// ==========================================
const sideCanvas = document.getElementById("side-view-canvas");
const sideContext = sideCanvas ? sideCanvas.getContext("2d", { alpha: false }) : null;

const sideFrameCount = 180;
const currentSideFrame = index => `vellfire-side-view/${(index + 1).toString().padStart(5, '0')}.jpg`;

const sideImages = [];
const sideObj = { frame: 0 };
let currentSideTargetFrame = 0;
let sideScrollProgress = 0;

let scrollYProgress = 0;
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

// ==========================================
// AUDIO & VIDEO SETUP
// ==========================================
const moveAudio = document.getElementById("hero-audio");
const sideAudio = document.getElementById("side-audio");
const audioToggleBtn = document.getElementById("audio-toggle");
const indicatorsVideo = document.getElementById("indicators-video");

moveAudio.loop = true;

if (indicatorsVideo) {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                indicatorsVideo.play().catch(() => { });
            } else {
                indicatorsVideo.pause();
            }
        });
    }, { threshold: 0.3 });
    videoObserver.observe(indicatorsVideo);
}

// Web Audio API logic 
let audioCtx = null;
let gainNode = null;
let sourceNode = null;
let isAudioUnlocked = false;
let isAudioStarted = false; 
let isAudioMuted = true;
let currentGain = 0; 
let gainFadeTimeout;

function initAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(moveAudio);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; 
    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
}

function rampGainTo(target, duration) {
    if (!gainNode || !audioCtx) return;
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(target, audioCtx.currentTime + duration);
    currentGain = target;
}

function ensureAudioPlaying() {
    if (isAudioStarted) return;
    moveAudio.play().then(() => {
        isAudioStarted = true;
    }).catch(() => { });
}

// Global Mute Toggle & Tooltip hiding
audioToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    isAudioMuted = !isAudioMuted;

    // Hide tooltip after interaction
    const audioTooltip = document.getElementById('audio-tooltip');
    if (audioTooltip) audioTooltip.classList.add('hidden');

    if (indicatorsVideo) indicatorsVideo.muted = isAudioMuted;
    if (sideAudio) sideAudio.muted = isAudioMuted;

    if (isAudioMuted) {
        audioToggleBtn.classList.remove("playing");
        audioToggleBtn.classList.add("muted");
        rampGainTo(0, 0.4);
    } else {
        audioToggleBtn.classList.add("playing");
        audioToggleBtn.classList.remove("muted");
        initAudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        ensureAudioPlaying();
        isAudioUnlocked = true;
    }
});

audioToggleBtn.classList.add("muted");

function unlockAudio() {
    if (isAudioUnlocked) return;
    initAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    ensureAudioPlaying();
    isAudioUnlocked = true;
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
}

document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

// ==========================================
// HORN HONK — scroll up at top of page
// ==========================================
let hornBuffer = null;
let hornCooldown = false;

fetch('horn.wav')
    .then(res => res.arrayBuffer())
    .then(data => {
        const tryDecode = () => {
            if (!audioCtx) { setTimeout(tryDecode, 500); return; }
            audioCtx.decodeAudioData(data).then(buf => { hornBuffer = buf; });
        };
        tryDecode();
    })
    .catch(() => console.warn('Horn audio unavailable'));

function playHorn() {
    if (!hornBuffer || !audioCtx || isAudioMuted || hornCooldown) return;
    const source = audioCtx.createBufferSource();
    source.buffer = hornBuffer;
    source.loop = false;
    const hornGain = audioCtx.createGain();
    hornGain.gain.value = 0.8;
    source.connect(hornGain);
    hornGain.connect(audioCtx.destination);
    source.start();
    hornCooldown = true;
    setTimeout(() => { hornCooldown = false; }, 2000);
}

window.addEventListener('wheel', (e) => {
    if (window.scrollY <= 5 && e.deltaY < -10 && !isAudioMuted) {
        playHorn();
    }
}, { passive: true });

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        setTimeout(() => {
            if (window.scrollY <= 5 && !isAudioMuted) playHorn();
        }, 50);
    }
});

// ==========================================
// PRELOAD IMAGES
// ==========================================
const preloadHeroImages = () => {
    const promises = [];
    for (let i = 0; i < frameCount; i++) {
        promises.push(new Promise((resolve) => {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                images[i] = img;
                loadedCount++;
                loaderText.textContent = `Igniting... ${Math.round((loadedCount / frameCount) * 100)}%`;
                resolve();
            };
            img.onerror = () => resolve();
        }));
    }
    return Promise.all(promises);
};

const preloadSideImages = () => {
    for (let i = 0; i < sideFrameCount; i++) {
        const img = new Image();
        img.src = currentSideFrame(i);
        img.onload = () => { 
            sideImages[i] = img; 
            if (i === 0 && sideContext) {
                sideCanvas.width = img.naturalWidth || 1920;
                sideCanvas.height = img.naturalHeight || 1080;
                sideContext.drawImage(img, 0, 0);
            }
        };
    }
};

preloadHeroImages().then(() => {
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 800);

    if (images[0]) {
        canvas.width = images[0].naturalWidth || 1920;
        canvas.height = images[0].naturalHeight || 1080;
        context.drawImage(images[0], 0, 0);
    }
    
    preloadSideImages();
    calculateScroll();
    requestAnimationFrame(renderLoop);
});

// ==========================================
// MAIN SCROLL CALCULATION
// ==========================================
function calculateScroll() {
    const animationScrollHeight = window.innerHeight * 4;
    scrollYProgress = Math.min(Math.max(window.scrollY / animationScrollHeight, 0), 1);
    currentTargetFrame = scrollYProgress * (frameCount - 1);

    scrollVelocity = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;

    updateSteps(scrollYProgress * 100);
    handleDynamicAudio(scrollVelocity, scrollYProgress);
    
    const sideScrollEl = document.getElementById('entry');
    if (sideScrollEl && sideContext) {
        const rect = sideScrollEl.getBoundingClientRect();
        const scrollSpace = sideScrollEl.scrollHeight - window.innerHeight;
        
        sideScrollProgress = Math.min(Math.max(-rect.top / scrollSpace, 0), 1);
        currentSideTargetFrame = sideScrollProgress * (sideFrameCount - 1);
        
        const sideText = document.querySelector('.side-text-content');
        if (sideText) {
            if (sideScrollProgress > 0.15 && sideScrollProgress < 0.95) {
                sideText.classList.add('active');
            } else {
                sideText.classList.remove('active');
            }
        }
        
        if (sideAudio && sideScrollProgress > 0 && sideScrollProgress < 1 && !isAudioMuted) {
            if (sideAudio.paused) sideAudio.play().catch(() => {});
            const targetTime = sideScrollProgress * (sideAudio.duration || 6); 
            if (!isNaN(targetTime) && Math.abs(sideAudio.currentTime - targetTime) > 0.1) {
                 sideAudio.currentTime = targetTime;
            }
        } else if (sideAudio) {
            sideAudio.pause();
        }
    }
}

function handleDynamicAudio(velocity, progress) {
    if (!isAudioUnlocked || isAudioMuted) return;
    ensureAudioPlaying();

    if (velocity > 3 && progress < 0.99) {
        clearTimeout(gainFadeTimeout);
        const targetGain = Math.min(0.15 + (velocity - 3) * 0.012, 0.70);
        rampGainTo(targetGain, 0.2);
    } else {
        clearTimeout(gainFadeTimeout);
        if (currentGain > 0) {
            gainFadeTimeout = setTimeout(() => rampGainTo(0, 0.6), 100);
        }
    }
}

window.addEventListener('scroll', calculateScroll, { passive: true });

// ==========================================
// RENDER LOOP
// ==========================================
function renderLoop() {
    const diff = currentTargetFrame - obj.frame;
    const absDiff = Math.abs(diff);
    const lerpFactor = absDiff > 3 ? 0.15 : 0.10;
    
    obj.frame += diff * lerpFactor;
    if (absDiff < 0.01) obj.frame = currentTargetFrame;

    const frameIndex = Math.min(Math.max(Math.round(obj.frame), 0), frameCount - 1);
    if (images[frameIndex]) {
        context.drawImage(images[frameIndex], 0, 0);
    }
    
    if (sideContext && sideImages.length > 0) {
        const sideDiff = currentSideTargetFrame - sideObj.frame;
        const sideAbsDiff = Math.abs(sideDiff);
        const sideLerpFactor = sideAbsDiff > 3 ? 0.15 : 0.10;
        
        sideObj.frame += sideDiff * sideLerpFactor;
        if (sideAbsDiff < 0.01) sideObj.frame = currentSideTargetFrame;
        
        const sideFrameIndex = Math.min(Math.max(Math.round(sideObj.frame), 0), sideFrameCount - 1);
        
        if (sideImages[sideFrameIndex]) {
            if (sideCanvas.width !== sideImages[sideFrameIndex].naturalWidth) {
                sideCanvas.width = sideImages[sideFrameIndex].naturalWidth || 1920;
                sideCanvas.height = sideImages[sideFrameIndex].naturalHeight || 1080;
            }
            sideContext.drawImage(sideImages[sideFrameIndex], 0, 0);
        }
    }
    requestAnimationFrame(renderLoop);
}

// ==========================================
// TEXT OVERLAY STEPS (HERO)
// ==========================================
function updateSteps(progressPercent) {
    steps.forEach((step, index) => {
        let isActive = false;
        switch (index) {
            case 0: isActive = progressPercent < 15; break;
            case 1: isActive = progressPercent >= 15 && progressPercent < 45; break;
            case 2: isActive = progressPercent >= 45 && progressPercent < 80; break;
            case 3: isActive = progressPercent >= 80; break;
        }
        step.classList.toggle('active', isActive);
    });
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) indicator.style.opacity = progressPercent > 5 ? '0' : '1';
}

// ==========================================
// ENHANCEMENTS & UI LOGIC
// ==========================================
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
const cursorGlow = document.getElementById('cursor-glow');
let cursorX = 0, cursorY = 0, ringX = 0, ringY = 0, glowX = 0, glowY = 0;

if (cursorDot && cursorRing && cursorGlow) {
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX; cursorY = e.clientY;
        cursorDot.style.left = cursorX + 'px'; cursorDot.style.top = cursorY + 'px';
    });

    function animateCursor() {
        ringX += (cursorX - ringX) * 0.15; ringY += (cursorY - ringY) * 0.15;
        cursorRing.style.left = ringX + 'px'; cursorRing.style.top = ringY + 'px';
        glowX += (cursorX - glowX) * 0.08; glowY += (cursorY - glowY) * 0.08;
        cursorGlow.style.left = glowX + 'px'; cursorGlow.style.top = glowY + 'px';
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    const interactiveSelectors = 'a, button, input, textarea, select, .cta-button, .audio-toggle-btn, .nav-cta, .nav-link, .feature-image';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactiveSelectors)) { cursorDot.classList.add('hovering'); cursorRing.classList.add('hovering'); }
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactiveSelectors)) { cursorDot.classList.remove('hovering'); cursorRing.classList.remove('hovering'); }
    });
}

const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
revealElements.forEach(el => revealObserver.observe(el));

// Specs Counter Animation (FIXED to .specs-monolith)
const specNumbers = document.querySelectorAll('.spec-number');
let countersAnimated = false;
const specObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
            countersAnimated = true;
            animateCounters();
        }
    });
}, { threshold: 0.5 });

const specsSection = document.querySelector('.specs-monolith');
if (specsSection) specObserver.observe(specsSection);

function animateCounters() {
    specNumbers.forEach(num => {
        const target = parseInt(num.dataset.target);
        const suffix = num.dataset.suffix || '';
        const startTime = performance.now();

        function tick(now) {
            const progress = Math.min((now - startTime) / 2200, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            num.textContent = Math.round(eased * target).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    });
}

const parallaxImages = document.querySelectorAll('.parallax-img img');
const highwayImg = document.querySelector('.parallax-highway');
window.addEventListener('scroll', () => {
    // 1. Handle standard editorial parallax images
    parallaxImages.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const shift = (rect.top - window.innerHeight / 2) * 0.04;
            img.style.transform = `translateY(${shift}px) scale(1.08)`;
        }
    });

    // 2. Handle the Highway Breakout (OUTSIDE the loop for performance)
    if (highwayImg) {
        const rect = highwayImg.parentElement.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const speed = 0.2;
            const yPos = -(rect.top * speed);
            highwayImg.style.transform = `translateY(${yPos}px) scale(1.1)`;
        }
    }
}, { passive: true });

const navbar = document.getElementById('navbar');
const heroHeight = window.innerHeight * 5;
window.addEventListener('scroll', () => {
    if (window.scrollY > heroHeight * 0.85) navbar.classList.add('visible');
    else navbar.classList.remove('visible');
}, { passive: true });

// Scroll Progress Bar & Car Position Update
const scrollProgress = document.getElementById('scroll-progress');
const scrollCar = document.getElementById('scroll-car');
window.addEventListener('scroll', () => {
    const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    if (scrollProgress) scrollProgress.style.width = progress + '%';
    if (scrollCar) scrollCar.style.left = progress + '%';
}, { passive: true });

async function fetchQuote() {
    try {
        const res = await fetch('https://api.quotable.io/random?tags=wisdom|technology|inspirational&maxLength=120');
        if (res.ok) {
            const data = await res.json();
            const quoteText = document.getElementById('quote-text');
            const quoteAuthor = document.getElementById('quote-author');
            if (quoteText && quoteAuthor) {
                quoteText.textContent = `"${data.content}"`;
                quoteAuthor.textContent = `— ${data.author}`;
            }
        }
    } catch (e) {}
}
fetchQuote();