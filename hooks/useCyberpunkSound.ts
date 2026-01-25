import { useRef, useCallback, useEffect } from 'react';

// Frequency configurations for sounds
const SOUNDS = {
    hover: { freq: 4000, type: 'sine', duration: 0.05, vol: 0.05 },
    click: { freq: 800, type: 'square', duration: 0.1, vol: 0.1 },
    confirm: { freq: 600, type: 'sawtooth', duration: 0.3, vol: 0.15 },
    glitch: { type: 'noise', duration: 0.2, vol: 0.2 },
};

export const useCyberpunkSound = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext on first user interaction to comply with browser autoplay policies
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
        };

        document.addEventListener('click', initAudio, { once: true });
        return () => document.removeEventListener('click', initAudio);
    }, []);

    const playOscillator = useCallback((freq: number, type: OscillatorType, duration: number, vol: number) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        // Resume context if suspended
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Envelope
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }, []);

    const playGlitchSound = useCallback((duration: number, vol: number) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // White noise with some random drops
            data[i] = Math.random() * 2 - 1;
            if (Math.random() > 0.9) data[i] *= 0; // Dropouts
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    }, []);

    const playHover = useCallback(() => {
        playOscillator(SOUNDS.hover.freq, SOUNDS.hover.type as OscillatorType, SOUNDS.hover.duration, SOUNDS.hover.vol);
    }, [playOscillator]);

    const playClick = useCallback(() => {
        // A short "tek" sound
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }, []);

    const playConfirm = useCallback(() => {
        // A nice major chord arpeggio
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        [440, 554, 659].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.3);
        });
    }, []);

    const playDelete = useCallback(() => {
        playGlitchSound(SOUNDS.glitch.duration, SOUNDS.glitch.vol);
    }, [playGlitchSound]);

    return { playHover, playClick, playConfirm, playDelete };
};
