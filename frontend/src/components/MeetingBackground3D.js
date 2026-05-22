import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { useThreeJS } from '../contexts/ThreeJSContext';

// Background Particles (Star Field) that drift and pulse with audio
const ParticleField = ({ performanceMode, audioLevel = 0 }) => {
  const ref = useRef();
  
  // Choose count based on performance mode
  const count = performanceMode === 'low' ? 300 : 800;

  // Pure JS random distribution inside a sphere (radius = 1.5)
  const sphere = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const radius = 1.5;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * radius;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      // Slow rotation drift
      ref.current.rotation.x -= delta * 0.015;
      ref.current.rotation.y -= delta * 0.01;

      // Audio-reactive expansion/pulse
      const targetScale = 1 + audioLevel * 0.25;
      ref.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.1);
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#4cc9f0"
          size={performanceMode === 'low' ? 0.006 : 0.004}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6 + audioLevel * 0.4}
        />
      </Points>
    </group>
  );
};

// Volumetric Nebula Clouds that float and pulse
const NebulaCloud = ({ color, position, speed, size, audioLevel = 0 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime() * speed;
      
      // Floating animation
      meshRef.current.position.y = position[1] + Math.sin(time) * 0.15;
      meshRef.current.position.x = position[0] + Math.cos(time * 0.8) * 0.15;
      
      // Rotation
      meshRef.current.rotation.z += 0.002;
      meshRef.current.rotation.x += 0.001;

      // Scale pulse to the beat
      const baseScale = size * (1 + audioLevel * 0.15);
      meshRef.current.scale.set(baseScale, baseScale, baseScale);
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={[size, size, size]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.12 + audioLevel * 0.05}
        depthWrite={false}
        wireframe={false}
      />
    </mesh>
  );
};

// Main MeetingBackground3D Component
const MeetingBackground3D = () => {
  const { is3DEnabled, performanceMode, activeSpeaker, audioLevels, themeColors } = useThreeJS();

  // Get active speaker's real-time audio level or default to 0
  const activeLevel = activeSpeaker ? audioLevels[activeSpeaker] || 0 : 0;

  if (!is3DEnabled) return null;

  return (
    <div className="three-canvas-bg" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
      backgroundColor: themeColors.darkBg,
      overflow: 'hidden'
    }}>
      <Canvas
        camera={{ position: [0, 0, 1] }}
        dpr={performanceMode === 'low' ? [0.5, 1] : [1, 1.5]}
        gl={{
          antialias: performanceMode !== 'low',
          depth: false,
          stencil: false,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        <color attach="background" args={[themeColors.darkBg]} />
        
        {/* Soft Ambient Light for depth */}
        <ambientLight intensity={0.5} />

        {/* Nebula Clouds */}
        <NebulaCloud 
          color={themeColors.primary} 
          position={[-0.6, 0.3, -0.5]} 
          speed={0.2} 
          size={0.8}
          audioLevel={activeLevel}
        />
        <NebulaCloud 
          color={themeColors.secondary} 
          position={[0.6, -0.4, -0.6]} 
          speed={0.15} 
          size={0.9}
          audioLevel={activeLevel}
        />
        {performanceMode === 'high' && (
          <NebulaCloud 
            color={themeColors.accent} 
            position={[0, 0.5, -0.8]} 
            speed={0.25} 
            size={0.5}
            audioLevel={activeLevel}
          />
        )}

        {/* Particles / Star Field */}
        <ParticleField performanceMode={performanceMode} audioLevel={activeLevel} />
      </Canvas>
    </div>
  );
};

export default MeetingBackground3D;
