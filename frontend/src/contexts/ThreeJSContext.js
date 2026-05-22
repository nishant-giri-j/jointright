import React, { createContext, useContext, useState, useEffect } from 'react';

const ThreeJSContext = createContext(null);

export const ThreeJSProvider = ({ children }) => {
  const [hasWebGL, setHasWebGL] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [performanceMode, setPerformanceMode] = useState('high'); // 'high' or 'low'
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [audioLevels, setAudioLevels] = useState({}); // { userName: level 0.0 - 1.0 }

  useEffect(() => {
    // Detect WebGL support
    const detectWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        return false;
      }
    };

    const webglSupported = detectWebGL();
    setHasWebGL(webglSupported);

    // Auto-configure performance mode based on device hardware
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd = cores < 4;
    setPerformanceMode(isLowEnd ? 'low' : 'high');

    // Load user preference if stored
    const storedPref = localStorage.getItem('jointright_3d_enabled');
    if (storedPref !== null) {
      setIs3DEnabled(storedPref === 'true' && webglSupported);
    } else {
      setIs3DEnabled(webglSupported);
    }
  }, []);

  const toggle3D = (enabled) => {
    if (!hasWebGL) return;
    setIs3DEnabled(enabled);
    localStorage.setItem('jointright_3d_enabled', enabled ? 'true' : 'false');
  };

  const updateAudioLevel = (userName, level) => {
    setAudioLevels((prev) => ({
      ...prev,
      [userName]: level,
    }));
  };

  const clearAudioLevels = () => {
    setAudioLevels({});
  };

  const value = {
    hasWebGL,
    is3DEnabled: is3DEnabled && hasWebGL,
    performanceMode,
    setPerformanceMode,
    activeSpeaker,
    setActiveSpeaker,
    audioLevels,
    updateAudioLevel,
    clearAudioLevels,
    toggle3D,
    themeColors: {
      primary: '#9d4edd',   // Nebula deep purple
      secondary: '#4361ee', // Electric blue
      accent: '#4cc9f0',    // Neon cyan
      darkBg: '#0f0c1b'     // Dark space background
    }
  };

  return (
    <ThreeJSContext.Provider value={value}>
      {children}
    </ThreeJSContext.Provider>
  );
};

export const useThreeJS = () => {
  const context = useContext(ThreeJSContext);
  if (!context) {
    throw new Error('useThreeJS must be used within a ThreeJSProvider');
  }
  return context;
};
