// ─────────────────────────────────────────────────────────────────────────
// THE OFFICE — Phase 2, slice 1 of the Head of State 3D world.
//
// This is the first room. It proves the whole Phase 2 architecture:
//   • react-three-fiber renders the scene DECLARATIVELY — we describe what the
//     room should look like and it draws it. There is no hand-written camera
//     loop to fall out of sync, which is the entire class of bug that killed
//     the old build's 3D view.
//   • The room reads LIVE ENGINE STATE through props (approval, date, term) and
//     shows it on a wall display. As the simulation ticks, the world updates.
//   • It is built from simple primitives (boxes + planes), so it loads fast,
//     hosts free on GitHub Pages, and never depends on external 3D model files.
//
// Every future room (chamber, balcony, situation room) follows this same shape.
// ─────────────────────────────────────────────────────────────────────────
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'

// DRACO palette, reused from the brand identity.
const OBSIDIAN = '#0A0A0F'
const OBSIDIAN_2 = '#14141F'
const GOLD = '#C9A84C'
const PARCHMENT = '#F0EDE8'

// ── The room shell: floor, three walls, ceiling ──────────────────────────
function Room() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={OBSIDIAN_2} roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Back wall (holds the window) */}
      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color={OBSIDIAN} roughness={0.95} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-7, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color={OBSIDIAN} roughness={0.95} />
      </mesh>
      {/* Right wall */}
      <mesh position={[7, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color={OBSIDIAN} roughness={0.95} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={'#070709'} roughness={1} />
      </mesh>
      {/* Gold baseboard trim along the back wall — the DRACO accent line */}
      <mesh position={[0, 0.06, -5.96]}>
        <boxGeometry args={[14, 0.12, 0.05]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.25} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ── The desk: top + apron + four legs, with a gold edge ──────────────────
function Desk() {
  return (
    <group position={[0, 0, -1.4]}>
      {/* Top */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 1.5]} />
        <meshStandardMaterial color={'#1C1C28'} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Gold front edge */}
      <mesh position={[0, 1.05, 0.76]}>
        <boxGeometry args={[3.42, 0.13, 0.03]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} emissive={GOLD} emissiveIntensity={0.2} />
      </mesh>
      {/* Front apron panel */}
      <mesh position={[0, 0.62, 0.7]}>
        <boxGeometry args={[3.3, 0.8, 0.08]} />
        <meshStandardMaterial color={OBSIDIAN_2} roughness={0.7} />
      </mesh>
      {/* Legs */}
      {[[-1.6, -0.65], [1.6, -0.65], [-1.6, 0.65], [1.6, 0.65]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.5, z]}>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color={'#101018'} roughness={0.6} />
        </mesh>
      ))}
      {/* A nameplate on the desk */}
      <mesh position={[0, 1.13, 0.4]}>
        <boxGeometry args={[1.1, 0.04, 0.22]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.2} emissive={GOLD} emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}

// ── The chair behind the desk ────────────────────────────────────────────
function Chair() {
  return (
    <group position={[0, 0, -2.6]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1, 0.15, 1]} />
        <meshStandardMaterial color={'#15151F'} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.25, -0.45]}>
        <boxGeometry args={[1, 1.3, 0.15]} />
        <meshStandardMaterial color={'#15151F'} roughness={0.6} />
      </mesh>
      {/* gold piping on the seat back */}
      <mesh position={[0, 1.9, -0.44]}>
        <boxGeometry args={[1.02, 0.06, 0.16]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ── The flag on a pole, to the right of the desk ─────────────────────────
function Flag() {
  return (
    <group position={[3.6, 0, -3.8]}>
      {/* pole */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 4.4, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* finial */}
      <mesh position={[0, 4.45, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.2} emissive={GOLD} emissiveIntensity={0.3} />
      </mesh>
      {/* flag cloth — obsidian field with a gold band, the regime's colours */}
      <mesh position={[0.95, 3.6, 0]}>
        <planeGeometry args={[1.8, 1.1]} />
        <meshStandardMaterial color={OBSIDIAN_2} roughness={0.9} side={2} />
      </mesh>
      <mesh position={[0.95, 3.6, 0.01]}>
        <planeGeometry args={[1.8, 0.28]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.25} side={2} />
      </mesh>
    </group>
  )
}

// ── The window + a Nairobi-at-night silhouette behind it ─────────────────
function CityWindow() {
  // a handful of building blocks with faint emissive "windows"
  const buildings = [
    [-3.2, 1.6, 0.9], [-1.7, 2.4, 0.7], [-0.3, 1.9, 1.0],
    [1.1, 2.8, 0.8], [2.5, 1.7, 0.9], [3.6, 2.2, 0.7],
  ]
  return (
    <group position={[0, 0, -5.9]}>
      {/* window frame */}
      <mesh position={[0, 3.4, 0.02]}>
        <boxGeometry args={[6.4, 3.2, 0.08]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} emissive={GOLD} emissiveIntensity={0.1} />
      </mesh>
      {/* dark glass */}
      <mesh position={[0, 3.4, 0.05]}>
        <planeGeometry args={[6.1, 2.9]} />
        <meshStandardMaterial color={'#05060B'} roughness={0.2} metalness={0.4} />
      </mesh>
      {/* skyline behind the glass */}
      <group position={[0, 0, -1.2]}>
        {buildings.map(([x, h, d], i) => (
          <group key={i} position={[x, 0, -d]}>
            <mesh position={[0, h / 2 + 1.6, 0]}>
              <boxGeometry args={[0.8, h, 0.4]} />
              <meshStandardMaterial color={'#0C0C14'} roughness={1} />
            </mesh>
            {/* lit windows */}
            <mesh position={[0, h / 2 + 1.6, 0.21]}>
              <planeGeometry args={[0.5, h * 0.7]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.5} transparent opacity={0.35} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// ── The live wall display — this is the engine talking to the room ───────
function WallDisplay({ approval, dateLabel, term, statusColor }) {
  return (
    <Html position={[-5.2, 3.4, 0]} transform rotation={[0, Math.PI / 2, 0]} distanceFactor={6} occlude={false}>
      <div style={{
        width: 360, padding: '22px 26px', background: 'rgba(10,10,15,0.92)',
        border: `1px solid ${GOLD}`, borderRadius: 4, fontFamily: "'DM Sans', sans-serif",
        color: PARCHMENT, boxShadow: `0 0 30px rgba(201,168,76,0.25)`, userSelect: 'none',
      }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2, color: GOLD, textTransform: 'uppercase' }}>
          State of the Office
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, lineHeight: 1, color: statusColor, marginTop: 6 }}>
          {Math.round((approval ?? 0) * 100)}%
        </div>
        <div style={{ fontSize: 13, color: '#8A8A9A', marginTop: 2 }}>Public approval</div>
        <div style={{ height: 1, background: 'rgba(201,168,76,0.3)', margin: '14px 0' }} />
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: PARCHMENT }}>{dateLabel}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#8A8A9A', marginTop: 3 }}>Term {term}</div>
      </div>
    </Html>
  )
}

// ── Lighting: dark room, warm gold key, cool fill ────────────────────────
function Lighting() {
  return (
    <group>
      <ambientLight intensity={0.35} />
      {/* warm key light from the ceiling fixture over the desk */}
      <spotLight position={[0, 5.6, 0]} angle={0.8} penumbra={0.6} intensity={50} color={'#FFE7B0'} distance={16} castShadow />
      {/* cool fill from the window side */}
      <pointLight position={[0, 3.4, -5]} intensity={18} color={'#4A6FFF'} distance={14} />
      {/* gold rim from the left, near the display */}
      <pointLight position={[-5, 3.4, 1]} intensity={14} color={GOLD} distance={12} />
    </group>
  )
}

function statusColor(v) {
  if (v == null) return PARCHMENT
  return v > 0.5 ? '#2ECC8A' : v > 0.35 ? '#E0B548' : '#FF5555'
}

// ── The full Office view ─────────────────────────────────────────────────
export default function Office({ approval, dateLabel, term }) {
  return (
    <div className="office-view">
      <Canvas shadows camera={{ position: [0, 2.2, 4.6], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={['#05060B']} />
        <fog attach="fog" args={['#05060B', 8, 22]} />
        <Lighting />
        <Room />
        <Desk />
        <Chair />
        <Flag />
        <CityWindow />
        <WallDisplay approval={approval} dateLabel={dateLabel} term={term} statusColor={statusColor(approval)} />
        <OrbitControls
          target={[0, 1.6, -1.4]}
          enablePan={false}
          minDistance={2.5}
          maxDistance={8}
          minPolarAngle={0.4}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <div className="office-hint">Drag to look around · scroll to zoom · the wall display is live from the engine</div>
    </div>
  )
}
