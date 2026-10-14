import React, { createContext, useContext, useState } from 'react';

interface SoundAlertContextType {
  soundEnabled: boolean;
  ttsEnabled: boolean;
  toggleSound: () => void;
  toggleTts: () => void;
  playAlertSound: (type?: 'warning' | 'critical' | 'chime') => void;
  speakAlert: (text: string) => void;
}

const SoundAlertContext = createContext<SoundAlertContextType | undefined>(undefined);

export const SoundAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Synthesized Web Audio API sound (reliable, no external assets needed)
  const playAlertSound = (type: 'warning' | 'critical' | 'chime' = 'warning') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(440, now + 0.15); // A4
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Warning
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(523.25, now + 0.12); // C5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('AudioContext playback error:', e);
    }
  };

  // Web Speech API text-to-speech for notifying proctor
  const speakAlert = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const toggleSound = () => setSoundEnabled((prev) => !prev);
  const toggleTts = () => setTtsEnabled((prev) => !prev);

  return (
    <SoundAlertContext.Provider
      value={{
        soundEnabled,
        ttsEnabled,
        toggleSound,
        toggleTts,
        playAlertSound,
        speakAlert,
      }}
    >
      {children}
    </SoundAlertContext.Provider>
  );
};

export const useSoundAlert = () => {
  const context = useContext(SoundAlertContext);
  if (!context) {
    throw new Error('useSoundAlert must be used within SoundAlertProvider');
  }
  return context;
};
