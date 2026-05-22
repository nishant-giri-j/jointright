import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, Ring } from '@react-three/drei';
import { useThreeJS } from '../contexts/ThreeJSContext';
import { FaCrown, FaHandPaper } from 'react-icons/fa';

// Generate a deterministic HSL color based on the user's name
const getHashColor = (name = 'Participant') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return {
    base: `hsl(${h}, 75%, 55%)`,
    emissive: `hsl(${h}, 85%, 70%)`
  };
};

// 3D Host Crown mesh
const HostCrown = () => {
  return (
    <group position={[0, 0.9, 0]}>
      {/* Crown Ring */}
      <mesh>
        <torusGeometry args={[0.3, 0.05, 8, 24]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Crown Spikes (Cones) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh 
            key={i} 
            position={[Math.sin(angle) * 0.28, 0.15, Math.cos(angle) * 0.28]} 
            rotation={[0, -angle, 0.25]}
          >
            <coneGeometry args={[0.06, 0.22, 4]} />
            <meshStandardMaterial color="#ffa500" metalness={0.8} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
};

// Glowing speech wave ring under the avatar
const SpeechRing = ({ audioLevel }) => {
  const ringRef = useRef();

  useFrame((state, delta) => {
    if (ringRef.current) {
      // Dynamic scale based on speaking audio level
      const targetScale = 1.0 + audioLevel * 1.5;
      ringRef.current.scale.lerp({ x: targetScale, y: targetScale, z: 1 }, 0.15);
      
      // Rotate the ring slowly
      ringRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <group position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Ring ref={ringRef} args={[0.55, 0.6, 32]}>
        <meshBasicMaterial 
          color="#4cc9f0" 
          transparent 
          opacity={audioLevel > 0.05 ? 0.35 + audioLevel * 0.65 : 0} 
          depthWrite={false}
        />
      </Ring>
    </group>
  );
};

// The 3D Head Mesh (Icosahedron for low-poly look)
const AvatarHead = ({ name, isHost, audioLevel = 0 }) => {
  const headRef = useRef();
  const colors = useMemo(() => getHashColor(name), [name]);

  useFrame((state) => {
    if (headRef.current) {
      // Bobbing drift
      const time = state.clock.getElapsedTime();
      headRef.current.position.y = Math.sin(time * 1.5) * 0.05;
      
      // Rotate slowly based on active speaking
      headRef.current.rotation.y = Math.sin(time * 0.4) * 0.2 + (audioLevel * 0.5);

      // Speaking scale feedback
      const targetScale = 1.0 + audioLevel * 0.12;
      headRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.15);
    }
  });

  return (
    <group ref={headRef}>
      {/* 3D Geometric Head */}
      <mesh>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial 
          color={colors.base} 
          roughness={0.3} 
          metalness={0.2}
          emissive={colors.emissive}
          emissiveIntensity={audioLevel * 0.6}
        />
      </mesh>

      {/* Futuristic glowing eyes */}
      <group position={[0, 0.1, 0.45]}>
        {/* Left eye */}
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.08, 0.05, 0.1]} />
          <meshBasicMaterial color={audioLevel > 0.05 ? "#4cc9f0" : "#ffffff"} />
        </mesh>
        {/* Right eye */}
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.08, 0.05, 0.1]} />
          <meshBasicMaterial color={audioLevel > 0.05 ? "#4cc9f0" : "#ffffff"} />
        </mesh>
      </group>

      {/* Golden crown if Host */}
      {isHost && <HostCrown />}
    </group>
  );
};

// Main Avatar3D Component
const Avatar3D = ({ name, isHost, isHandRaised, isSpeaking }) => {
  const { is3DEnabled, performanceMode, audioLevels } = useThreeJS();

  // Retrieve audio level for this user if speaking
  const level = isSpeaking ? audioLevels[name] || 0.15 : 0;

  // Fallback to beautiful 2D placeholder if 3D is disabled
  if (!is3DEnabled) {
    const initial = (name || '?').charAt(0).toUpperCase();
    return (
      <div className="camera-off-placeholder">
        <div className={`avatar-circle ${isSpeaking ? 'speaking-active' : ''}`}>
          <span className="avatar-initial">{initial}</span>
          {isSpeaking && <div className="speaking-wave" />}
        </div>
        <div className="camera-off-info">
          {isHost && <FaCrown className="ph-host-badge" />}
          <span className="ph-name">{name}</span>
          {isHandRaised && <FaHandPaper className="ph-hand-badge" />}
        </div>
      </div>
    );
  }

  return (
    <div className="avatar-3d-container" style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '12px'
    }}>
      <Canvas
        camera={{ position: [0, 0.1, 1.8], fov: 50 }}
        dpr={performanceMode === 'low' ? [0.6, 1] : [1, 1.5]}
        gl={{ antialias: performanceMode !== 'low', alpha: true }}
      >
        {/* Soft immersive lighting */}
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 3, 2]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-2, 1, 1]} intensity={0.5} color="#4cc9f0" />

        {/* 3D Floating Avatar Head */}
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
          <AvatarHead name={name} isHost={isHost} audioLevel={level} />
        </Float>

        {/* Dynamic sound wave ring */}
        <SpeechRing audioLevel={level} />

        {/* Hand Raised 3D CSS billboard overlay */}
        {isHandRaised && (
          <Html position={[0.55, 0.65, 0]}>
            <div className="three-hand-raise-overlay animated-pop-in">
              <FaHandPaper />
            </div>
          </Html>
        )}
      </Canvas>

      {/* Name tag overlay on bottom */}
      <div className="avatar-3d-nametag">
        {isHost && <FaCrown className="nametag-host-icon" />}
        <span>{name}</span>
      </div>
    </div>
  );
};

export default Avatar3D;
