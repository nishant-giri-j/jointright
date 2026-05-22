import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useThreeJS } from '../contexts/ThreeJSContext';

// The 3D Meeting Table in the center of the room
const ConferenceTable = () => {
  return (
    <group position={[0, -0.6, 0]}>
      {/* Glossy Table Top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.08, 32]} />
        <meshStandardMaterial 
          color="#161427" 
          roughness={0.15} 
          metalness={0.85} 
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Table Glowing Border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[2.18, 2.2, 64]} />
        <meshBasicMaterial color="#4cc9f0" transparent opacity={0.6} />
      </mesh>
      {/* Central Holographic Core */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
        <meshBasicMaterial color="#9d4edd" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// Main SpatialMeetingRoom Component
const SpatialMeetingRoom = ({ children, participantsCount }) => {
  const { is3DEnabled, performanceMode } = useThreeJS();

  // Extract the individual video tile children (React elements)
  const tiles = useMemo(() => {
    return React.Children.toArray(children).filter(Boolean);
  }, [children]);

  // Radius of the circle based on participant count
  const radius = useMemo(() => {
    return Math.max(2.4, Math.min(3.5, 1.8 + tiles.length * 0.3));
  }, [tiles.length]);

  // Fallback to standard 2D layout if 3D is disabled
  if (!is3DEnabled) {
    return (
      <div className="standard-video-grid-fallback">
        {children}
      </div>
    );
  }

  return (
    <div className="spatial-room-canvas-container" style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Canvas
        camera={{ position: [0, 2.5, 5.5], fov: 50 }}
        dpr={performanceMode === 'low' ? [0.6, 1] : [1, 1.5]}
        gl={{ antialias: performanceMode !== 'low' }}
      >
        {/* Quality lighting for depth */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-4, 3, -4]} intensity={0.8} color="#9d4edd" />
        <spotLight 
          position={[0, 5, 0]} 
          intensity={2} 
          angle={0.6} 
          penumbra={0.5} 
          color="#4cc9f0" 
        />

        {/* 3D Boardroom Table */}
        <ConferenceTable />

        {/* Position Video tiles in a circular boardroom array */}
        <group position={[0, 0, 0]}>
          {tiles.map((tile, index) => {
            const angle = (index / tiles.length) * Math.PI * 2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            
            // Calculate rotation to face the center of the table (plus tilt up)
            const rotY = angle + Math.PI;

            return (
              <group 
                key={tile.key || index} 
                position={[x, 0.25, z]} 
                rotation={[0, rotY, 0]}
              >
                {/* 3D Floating Screen Panel Frame */}
                <mesh position={[0, 0, -0.02]}>
                  <boxGeometry args={[1.54, 1.04, 0.04]} />
                  <meshStandardMaterial 
                    color="#1a1829" 
                    roughness={0.4} 
                    metalness={0.7} 
                  />
                </mesh>
                
                {/* Glowing neon border behind the tile */}
                <mesh position={[0, 0, -0.035]}>
                  <boxGeometry args={[1.58, 1.08, 0.01]} />
                  <meshBasicMaterial color="#4361ee" transparent opacity={0.45} />
                </mesh>

                {/* HTML Transform node projection */}
                <Html
                  transform
                  occlude
                  distanceFactor={1.3}
                  style={{
                    width: '320px',
                    height: '210px',
                    backfaceVisibility: 'hidden',
                    transformStyle: 'preserve-3d',
                    pointerEvents: 'auto'
                  }}
                >
                  <div className="spatial-3d-screen-wrapper">
                    {tile}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>

        {/* Constrain camera movement for optimal viewing experience */}
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.1} // Prevent going below table level
          minPolarAngle={Math.PI / 6.0}   // Prevent going directly top-down
          minDistance={3.5}
          maxDistance={8.5}
        />
      </Canvas>

      {/* Center helpful instruction overlay */}
      <div className="spatial-navigation-hint">
        💡 Drag to orbit the 3D room • Scroll to zoom
      </div>
    </div>
  );
};

export default SpatialMeetingRoom;
