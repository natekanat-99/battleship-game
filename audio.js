// ============================================================
// Battleship Audio System — Web Audio API (no external assets)
// All sounds are procedurally generated.
// ============================================================

var BattleshipAudio = (function () {
    'use strict';

    var ctx = null;
    var muted = false;
    var musicVolume = 0.30;
    var sfxVolume = 0.70;

    // Gain nodes
    var masterGain = null;
    var musicGain = null;
    var sfxGain = null;

    // Music state
    var musicPlaying = false;
    var musicOscillators = [];
    var musicInterval = null;

    function init() {
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);

            musicGain = ctx.createGain();
            musicGain.gain.value = musicVolume;
            musicGain.connect(masterGain);

            sfxGain = ctx.createGain();
            sfxGain.gain.value = sfxVolume;
            sfxGain.connect(masterGain);
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    function ensureContext() {
        if (!ctx) init();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    function setMuted(val) {
        muted = val;
        if (masterGain) {
            masterGain.gain.value = muted ? 0 : 1;
        }
    }

    function isMuted() {
        return muted;
    }

    function setMusicVolume(val) {
        musicVolume = val;
        if (musicGain) musicGain.gain.value = val;
    }

    function setSfxVolume(val) {
        sfxVolume = val;
        if (sfxGain) sfxGain.gain.value = val;
    }

    // --- SFX Generators ---

    function playCannonFire() {
        ensureContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Low boom
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);

        // Noise burst
        var bufferSize = ctx.sampleRate * 0.15;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        var noise = ctx.createBufferSource();
        noise.buffer = buffer;
        var noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 0.2);
    }

    function playSplash() {
        ensureContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Filtered noise for water splash
        var bufferSize = ctx.sampleRate * 0.5;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        var noise = ctx.createBufferSource();
        noise.buffer = buffer;

        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.4);
        filter.Q.value = 1;

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 0.5);
    }

    function playExplosion() {
        ensureContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Heavy noise burst
        var bufferSize = ctx.sampleRate * 0.8;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }
        var noise = ctx.createBufferSource();
        noise.buffer = buffer;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.6);

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 0.8);

        // Sub-bass thud
        var osc = ctx.createOscillator();
        var oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        oscGain.gain.setValueAtTime(0.6, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(oscGain);
        oscGain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    function playSinking() {
        ensureContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Descending tone (creaking)
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 1.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.25, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 1.2);

        // Bubbling noise
        var bufferSize = ctx.sampleRate * 1.0;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            var t = i / ctx.sampleRate;
            data[i] = (Math.random() * 2 - 1) * 0.15 * Math.sin(t * 20) * (t > 0.3 ? 1 : t / 0.3);
        }
        var noise = ctx.createBufferSource();
        noise.buffer = buffer;

        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 2;

        var nGain = ctx.createGain();
        nGain.gain.value = 0.3;

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(sfxGain);
        noise.start(now + 0.2);
        noise.stop(now + 1.2);
    }

    function playVictoryFanfare() {
        ensureContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Triumphant horn notes: C5, E5, G5, C6
        var notes = [523.25, 659.25, 783.99, 1046.50];
        var durations = [0.3, 0.3, 0.3, 0.8];
        var offset = 0;

        notes.forEach(function (freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + offset);
            gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.05);
            gain.gain.setValueAtTime(0.25, now + offset + durations[i] - 0.05);
            gain.gain.linearRampToValueAtTime(0, now + offset + durations[i]);
            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(now + offset);
            osc.stop(now + offset + durations[i]);

            // Harmony
            var osc2 = ctx.createOscillator();
            var gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.value = freq * 0.5;
            gain2.gain.setValueAtTime(0, now + offset);
            gain2.gain.linearRampToValueAtTime(0.15, now + offset + 0.05);
            gain2.gain.setValueAtTime(0.15, now + offset + durations[i] - 0.05);
            gain2.gain.linearRampToValueAtTime(0, now + offset + durations[i]);
            osc2.connect(gain2);
            gain2.connect(sfxGain);
            osc2.start(now + offset);
            osc2.stop(now + offset + durations[i]);

            offset += durations[i];
        });
    }

    function playDefeatSting() {
        ensureContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Somber descending minor notes: C4, Eb4, Ab3, G3
        var notes = [261.63, 311.13, 207.65, 196.00];
        var durations = [0.4, 0.4, 0.5, 1.0];
        var offset = 0;

        notes.forEach(function (freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + offset);
            gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.05);
            gain.gain.setValueAtTime(0.2, now + offset + durations[i] * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, now + offset + durations[i]);
            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(now + offset);
            osc.stop(now + offset + durations[i]);

            offset += durations[i] * 0.8;
        });
    }

    // --- Background Music (procedural ambient loop) ---

    function startMusic() {
        ensureContext();
        if (!ctx || musicPlaying) return;
        musicPlaying = true;

        // Low drone
        var drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 55; // A1
        var droneGain = ctx.createGain();
        droneGain.gain.value = 0.08;
        drone.connect(droneGain);
        droneGain.connect(musicGain);
        drone.start();
        musicOscillators.push(drone);

        // Second drone for depth
        var drone2 = ctx.createOscillator();
        drone2.type = 'triangle';
        drone2.frequency.value = 82.41; // E2
        var droneGain2 = ctx.createGain();
        droneGain2.gain.value = 0.04;
        drone2.connect(droneGain2);
        droneGain2.connect(musicGain);
        drone2.start();
        musicOscillators.push(drone2);

        // Slow LFO modulation on drone
        var lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        var lfoGain = ctx.createGain();
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain);
        lfoGain.connect(drone.frequency);
        lfo.start();
        musicOscillators.push(lfo);

        // Periodic ambient pings
        var pingNotes = [440, 554.37, 659.25, 523.25, 392.00, 329.63];
        var pingIndex = 0;

        musicInterval = setInterval(function () {
            if (!ctx || !musicPlaying) return;
            var now = ctx.currentTime;
            var freq = pingNotes[pingIndex % pingNotes.length];
            pingIndex++;

            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

            osc.connect(gain);
            gain.connect(musicGain);
            osc.start(now);
            osc.stop(now + 2.0);
        }, 3000);
    }

    function stopMusic() {
        musicPlaying = false;
        musicOscillators.forEach(function (osc) {
            try { osc.stop(); } catch (e) { /* already stopped */ }
        });
        musicOscillators = [];
        if (musicInterval) {
            clearInterval(musicInterval);
            musicInterval = null;
        }
    }

    return {
        init: init,
        ensureContext: ensureContext,
        setMuted: setMuted,
        isMuted: isMuted,
        setMusicVolume: setMusicVolume,
        setSfxVolume: setSfxVolume,
        playCannonFire: playCannonFire,
        playSplash: playSplash,
        playExplosion: playExplosion,
        playSinking: playSinking,
        playVictoryFanfare: playVictoryFanfare,
        playDefeatSting: playDefeatSting,
        startMusic: startMusic,
        stopMusic: stopMusic
    };
})();
