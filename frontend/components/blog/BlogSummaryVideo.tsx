import React from 'react';
import { 
  AbsoluteFill, 
  useCurrentFrame, 
  useVideoConfig, 
  interpolate, 
  spring,
  Sequence
} from 'remotion';

export interface BlogSummaryVideoProps {
  title: string;
  author: string;
  authorRole: string;
  introText: string;
  features: string[];
  ctaText: string;
  primaryColor?: string;
  accentColor?: string;
}

// 1. Client SPA SVG Diagram
const ClientSvgDiagram: React.FC<{ frame: number; primaryColor: string; accentColor: string }> = ({ 
  frame, 
  primaryColor, 
  accentColor 
}) => {
  const browserOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const node1Scale = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });
  const node2Scale = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' });
  const flowProgress = interpolate(frame, [30, 80], [0, 100], { extrapolateRight: 'clamp' });
  
  return (
    <svg width="340" height="220" viewBox="0 0 340 220" style={{ opacity: browserOpacity }}>
      {/* Browser Window frame */}
      <rect x="10" y="10" width="320" height="200" rx="12" fill="#0f172a" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      {/* Browser Bar */}
      <rect x="10" y="10" width="320" height="30" rx="0" fill="#1e293b" />
      {/* Browser Buttons */}
      <circle cx="25" cy="25" r="5" fill="#ef4444" />
      <circle cx="40" cy="25" r="5" fill="#f59e0b" />
      <circle cx="55" cy="25" r="5" fill="#10b981" />
      
      {/* Client Layers */}
      <g transform={`scale(${node1Scale})`} style={{ transformOrigin: '70px 110px' }}>
        <rect x="30" y="70" width="80" height="80" rx="8" fill={`${primaryColor}22`} stroke={primaryColor} strokeWidth="2" />
        <text x="70" y="105" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">React SPA</text>
        <text x="70" y="125" fill={primaryColor} fontSize="10" fontFamily="Fira Code" textAnchor="middle">Vite + TS</text>
      </g>
      
      {/* Flow arrow */}
      <line x1="120" y1="110" x2="210" y2="110" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
      <circle cx={120 + (flowProgress / 100) * 90} cy="110" r="4" fill={accentColor} />

      {/* Layer 2: State Context */}
      <g transform={`scale(${node2Scale})`} style={{ transformOrigin: '260px 110px' }}>
        <rect x="220" y="70" width="85" height="80" rx="8" fill={`${accentColor}22`} stroke={accentColor} strokeWidth="2" />
        <text x="262" y="105" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">Auth State</text>
        <text x="262" y="125" fill={accentColor} fontSize="10" fontFamily="Fira Code" textAnchor="middle">ORCID Context</text>
      </g>
    </svg>
  );
};

// 2. Server & DB SVG Diagram
const ServerSvgDiagram: React.FC<{ frame: number; primaryColor: string; accentColor: string }> = ({ 
  frame, 
  primaryColor, 
  accentColor 
}) => {
  const serverOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const dbScale = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });
  const apiScale = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' });
  const packetY = interpolate(frame, [35, 75], [90, 150], { extrapolateRight: 'clamp' });

  return (
    <svg width="340" height="220" viewBox="0 0 340 220" style={{ opacity: serverOpacity }}>
      {/* Container background */}
      <rect x="10" y="10" width="320" height="200" rx="16" fill="#0f172a" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      
      {/* Express API Layer */}
      <g transform={`scale(${apiScale})`} style={{ transformOrigin: '170px 70px' }}>
        <rect x="110" y="40" width="120" height="40" rx="6" fill={`${primaryColor}22`} stroke={primaryColor} strokeWidth="2" />
        <text x="170" y="65" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">Express API</text>
      </g>

      {/* Database Node */}
      <g transform={`scale(${dbScale})`} style={{ transformOrigin: '170px 160px' }}>
        <path d="M 120,135 A 50,12 0 0,0 220,135 V 175 A 50,12 0 0,1 120,175 Z" fill={`${accentColor}22`} stroke={accentColor} strokeWidth="2" />
        <ellipse cx="170" cy="135" rx="50" ry="12" fill={`${accentColor}44`} stroke={accentColor} strokeWidth="2" />
        <text x="170" y="162" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">SQLite DB</text>
      </g>

      {/* Connecting lines */}
      <line x1="170" y1="80" x2="170" y2="120" stroke="#64748b" strokeWidth="2" />
      <circle cx="170" cy={packetY} r="5" fill={primaryColor} />
    </svg>
  );
};

// 3. Data Pipeline Flow (LDES Circular/Linear Pipeline)
const PipelineSvgDiagram: React.FC<{ frame: number; primaryColor: string; accentColor: string }> = ({ 
  frame, 
  primaryColor, 
  accentColor 
}) => {
  const pipelineOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  
  const step1Active = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });
  const step2Active = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' });
  const step3Active = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' });
  const step4Active = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: 'clamp' });
  const step5Active = interpolate(frame, [70, 85], [0, 1], { extrapolateRight: 'clamp' });

  const packet1X = interpolate(frame, [10, 30], [50, 170], { extrapolateRight: 'clamp' });
  const packet2Y = interpolate(frame, [30, 50], [60, 130], { extrapolateRight: 'clamp' });
  const packet3X = interpolate(frame, [50, 70], [170, 290], { extrapolateRight: 'clamp' });
  const packet4X = interpolate(frame, [70, 90], [290, 420], { extrapolateRight: 'clamp' });

  return (
    <svg width="480" height="220" viewBox="0 0 480 220" style={{ opacity: pipelineOpacity }}>
      {/* Node 1: External LDES Ingestion */}
      <g opacity={0.3 + step1Active * 0.7}>
        <rect x="10" y="30" width="80" height="60" rx="8" fill="rgba(255,255,255,0.03)" stroke="#fff" strokeWidth="1.5" />
        <text x="50" y="55" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">1. LDES In</text>
        <text x="50" y="75" fill="#64748b" fontSize="8" textAnchor="middle">Harvest NERC</text>
      </g>

      {/* Node 2: SQLite & Triplestore DB */}
      <g opacity={0.3 + step2Active * 0.7}>
        <rect x="130" y="30" width="80" height="60" rx="8" fill={`${primaryColor}11`} stroke={primaryColor} strokeWidth="2" />
        <text x="170" y="55" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">2. Triplestore</text>
        <text x="170" y="75" fill={primaryColor} fontSize="8" textAnchor="middle">& SQLite DB</text>
      </g>

      {/* Node 3: User Mappings & Curation */}
      <g opacity={0.3 + step3Active * 0.7}>
        <rect x="130" y="130" width="80" height="60" rx="8" fill="rgba(255,255,255,0.03)" stroke="#fff" strokeWidth="1.5" />
        <text x="170" y="155" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">3. Translate</text>
        <text x="170" y="175" fill="#64748b" fontSize="8" textAnchor="middle">User Mappings</text>
      </g>

      {/* Node 4: Outbound LDES Publisher */}
      <g opacity={0.3 + step4Active * 0.7}>
        <rect x="250" y="30" width="80" height="60" rx="8" fill={`${accentColor}11`} stroke={accentColor} strokeWidth="2" />
        <text x="290" y="55" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">4. LDES Out</text>
        <text x="290" y="75" fill={accentColor} fontSize="8" textAnchor="middle">Publish Mappings</text>
      </g>

      {/* Node 5: Third-party enrichments */}
      <g opacity={0.3 + step5Active * 0.7}>
        <rect x="370" y="30" width="100" height="60" rx="8" fill="rgba(16,185,129,0.11)" stroke="#10b981" strokeWidth="2" />
        <text x="420" y="55" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">5. Third Party</text>
        <text x="420" y="75" fill="#10b981" fontSize="8" textAnchor="middle">Enrich Vocabularies</text>
      </g>

      {/* Flow Connectors */}
      <path d="M 90,60 L 130,60" stroke="#475569" strokeWidth="1.5" strokeDasharray="3,3" />
      <path d="M 170,90 L 170,130" stroke="#475569" strokeWidth="1.5" strokeDasharray="3,3" />
      <path d="M 210,160 Q 250,160 250,90" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="3,3" />
      <path d="M 330,60 L 370,60" stroke="#475569" strokeWidth="1.5" strokeDasharray="3,3" />

      {/* Data Packet animation pulses */}
      {frame >= 10 && frame <= 30 && <circle cx={packet1X} cy="60" r="3" fill="#38bdf8" />}
      {frame >= 30 && frame <= 50 && <circle cx="170" cy={packet2Y} r="3" fill="#fbbf24" />}
      {frame >= 50 && frame <= 70 && <circle cx={packet3X} cy="60" r="3" fill="#10b981" />}
      {frame >= 70 && frame <= 90 && <circle cx={packet4X} cy="60" r="3" fill="#34d399" />}
    </svg>
  );
};

// Sub-component for animated marine waves background
const WavesBackground: React.FC<{ primaryColor: string; accentColor: string }> = ({ 
  primaryColor, 
  accentColor 
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const wave1Offset = interpolate(frame, [0, durationInFrames], [0, 360]);
  const wave2Offset = interpolate(frame, [0, durationInFrames], [0, -480]);
  
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #090d16 0%, #0b1a30 50%, #042f2e 100%)',
      overflow: 'hidden'
    }}>
      {/* Decorative ambient glowing grids/blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}22 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '60%',
        height: '60%',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}11 0%, transparent 70%)`,
        filter: 'blur(60px)'
      }} />

      {/* SVG Waves at the bottom */}
      <svg 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '25%',
          opacity: 0.25
        }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill={primaryColor}
          d={`M0,192 C480,${220 + Math.sin(frame * 0.05) * 20} 960,${160 + Math.cos(frame * 0.05) * 20} 1440,192 L1440,320 L0,320 Z`}
          transform={`translate(${Math.sin(wave1Offset * Math.PI / 180) * 30}, 0)`}
        />
        <path
          fill={accentColor}
          d={`M0,128 C360,${160 + Math.cos(frame * 0.04) * 15} 720,${96 + Math.sin(frame * 0.04) * 15} 1080,128 C1260,144 1350,112 1440,96 L1440,320 L0,320 Z`}
          transform={`translate(${Math.sin(wave2Offset * Math.PI / 180) * 40}, 10)`}
          opacity={0.6}
        />
      </svg>
    </AbsoluteFill>
  );
};

export const BlogSummaryVideo: React.FC<BlogSummaryVideoProps> = ({
  title,
  author,
  authorRole,
  introText,
  features,
  ctaText,
  primaryColor = '#3b82f6',
  accentColor = '#f59e0b',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Dynamic slides timing based on duration (12s vs 18s)
  const ctaStart = durationInFrames === 540 ? 15 * fps : 9 * fps;

  // Global Progress bar at the top
  const globalProgress = interpolate(frame, [0, durationInFrames], [0, 100]);

  // Spring animation helper for active title entrance
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill style={{ fontFamily: 'Fira Sans, sans-serif', color: '#f8fafc' }}>
      {/* Background */}
      <WavesBackground primaryColor={primaryColor} accentColor={accentColor} />

      {/* Global Header */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: 50,
        right: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: 18,
            color: '#fff'
          }}>
            M
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.05em', color: '#f1f5f9' }}>
            MARINE TERM TRANSLATIONS
          </span>
        </div>
        <div style={{ 
          fontSize: 14, 
          color: 'rgba(255, 255, 255, 0.5)', 
          fontFamily: 'Fira Code, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Featured Summary
        </div>
      </div>

      {/* Progress Line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${globalProgress}%`,
        height: 5,
        backgroundColor: accentColor,
        boxShadow: `0 0 10px ${accentColor}`,
        zIndex: 20
      }} />

      {/* Slide 1: Introduction Title (0 - 3 seconds) */}
      <Sequence from={0} durationInFrames={3 * fps}>
        <AbsoluteFill style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '0 80px',
          boxSizing: 'border-box'
        }}>
          {/* Animated Category Badge */}
          <div style={{
            transform: `translateY(${interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' })}px)`,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
            display: 'inline-block',
            backgroundColor: `${primaryColor}22`,
            border: `1px solid ${primaryColor}44`,
            color: primaryColor,
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 600,
            width: 'fit-content',
            marginBottom: 24,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            New Announcement
          </div>

          {/* Large Title */}
          <h1 style={{
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 30px 0',
            color: '#ffffff',
            maxWidth: 800,
            transform: `scale(${titleSpring})`,
            textShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            {title}
          </h1>

          {/* Author info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [15, 30], [20, 0], { extrapolateRight: 'clamp' })}px)`
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: '#fff',
              backgroundImage: `url('https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=0284c7&color=fff')`,
              backgroundSize: 'cover',
              border: `2px solid ${primaryColor}`
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>{author}</div>
              <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' }}>{authorRole}</div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Slide 2: The Core Problem & Launch (3 - 6 seconds) */}
      <Sequence from={3 * fps} durationInFrames={3 * fps}>
        {(() => {
          const slideFrame = frame - 3 * fps;
          const slideSpring = spring({ frame: slideFrame, fps, config: { damping: 12 } });
          const textY = interpolate(slideFrame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });
          const textOpacity = interpolate(slideFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

          return (
            <AbsoluteFill style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: '0 80px',
              boxSizing: 'border-box',
              gap: 50
            }}>
              {/* Left Column: Huge quote styling */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontFamily: 'Fira Code, monospace', 
                  fontSize: 120, 
                  color: primaryColor, 
                  lineHeight: 0.1, 
                  marginBottom: -20,
                  opacity: 0.5
                }}>“</span>
                <p style={{
                  fontSize: 24,
                  lineHeight: 1.5,
                  color: '#e2e8f0',
                  fontWeight: 500,
                  margin: 0,
                  transform: `translateY(${textY}px)`,
                  opacity: textOpacity
                }}>
                  {introText}
                </p>
                <div style={{
                  marginTop: 20,
                  height: 3,
                  width: 60,
                  backgroundColor: accentColor,
                  transform: `scaleX(${slideSpring})`,
                  transformOrigin: 'left'
                }} />
              </div>

              {/* Right Column: Key Theme Card */}
              <div style={{ 
                flex: 0.8,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                borderRadius: 20,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 30,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(${slideSpring})`
              }}>
                <span style={{ 
                  color: accentColor, 
                  fontFamily: 'Fira Code, monospace', 
                  fontWeight: 'bold',
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>The Mission</span>
                <h3 style={{ fontSize: 28, margin: '10px 0 15px 0', fontWeight: 800 }}>Bridging Vocabularies</h3>
                <p style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4, margin: 0 }}>
                  Harmonizing local marine science translations with international NERC databases for global FAIR data.
                </p>
              </div>
            </AbsoluteFill>
          );
        })()}
      </Sequence>

      {/* Slide 3 (6-9s): Client-Side SPA (Only for 18-second video) */}
      {durationInFrames === 540 && (
        <Sequence from={6 * fps} durationInFrames={3 * fps}>
          {(() => {
            const slideFrame = frame - 6 * fps;
            const slideSpring = spring({ frame: slideFrame, fps, config: { damping: 12 } });
            
            return (
              <AbsoluteFill style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: '0 80px',
                boxSizing: 'border-box',
                gap: 50
              }}>
                <div style={{ flex: 1.1 }}>
                  <span style={{ 
                    color: accentColor, 
                    fontFamily: 'Fira Code, monospace', 
                    fontWeight: 'bold',
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>Client Layer</span>
                  <h2 style={{ fontSize: 40, fontWeight: 800, margin: '10px 0 20px 0', color: '#fff' }}>
                    Client-Side SPA
                  </h2>
                  <p style={{ fontSize: 16, color: '#e2e8f0', lineHeight: 1.5 }}>
                    Sleek Single Page Application built on Vite, React, and TypeScript. Ingests dynamic styles via Tailwind CDN, and manages contexts smoothly.
                  </p>
                </div>
                <div style={{ 
                  flex: 0.9,
                  display: 'flex',
                  justifyContent: 'center',
                  transform: `scale(${slideSpring})`
                }}>
                  <ClientSvgDiagram frame={slideFrame} primaryColor={primaryColor} accentColor={accentColor} />
                </div>
              </AbsoluteFill>
            );
          })()}
        </Sequence>
      )}

      {/* Slide 4 (9-12s): Server & Data Layer (Only for 18-second video) */}
      {durationInFrames === 540 && (
        <Sequence from={9 * fps} durationInFrames={3 * fps}>
          {(() => {
            const slideFrame = frame - 9 * fps;
            const slideSpring = spring({ frame: slideFrame, fps, config: { damping: 12 } });
            
            return (
              <AbsoluteFill style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: '0 80px',
                boxSizing: 'border-box',
                gap: 50
              }}>
                <div style={{ flex: 1.1 }}>
                  <span style={{ 
                    color: primaryColor, 
                    fontFamily: 'Fira Code, monospace', 
                    fontWeight: 'bold',
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>API & Database</span>
                  <h2 style={{ fontSize: 40, fontWeight: 800, margin: '10px 0 20px 0', color: '#fff' }}>
                    Server & Data Layer
                  </h2>
                  <p style={{ fontSize: 16, color: '#e2e8f0', lineHeight: 1.5 }}>
                    Docker-orchestrated Node/Express backend that manages secure sessions and coordinates SQL transactions. Integrates SQLite relational store for translation models.
                  </p>
                </div>
                <div style={{ 
                  flex: 0.9,
                  display: 'flex',
                  justifyContent: 'center',
                  transform: `scale(${slideSpring})`
                }}>
                  <ServerSvgDiagram frame={slideFrame} primaryColor={primaryColor} accentColor={accentColor} />
                </div>
              </AbsoluteFill>
            );
          })()}
        </Sequence>
      )}

      {/* Slide 5 (12-15s): Data Pipeline Flow (Only for 18-second video) */}
      {durationInFrames === 540 && (
        <Sequence from={12 * fps} durationInFrames={3 * fps}>
          {(() => {
            const slideFrame = frame - 12 * fps;
            const slideSpring = spring({ frame: slideFrame, fps, config: { damping: 12 } });
            
            return (
              <AbsoluteFill style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                padding: '0 50px',
                boxSizing: 'border-box'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <span style={{ 
                    color: '#10b981', 
                    fontFamily: 'Fira Code, monospace', 
                    fontWeight: 'bold',
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>Data Pipeline Lifecycle</span>
                  <h2 style={{ fontSize: 36, fontWeight: 800, margin: '5px 0 10px 0', color: '#fff' }}>
                    End-to-End Mappings Loop
                  </h2>
                  <p style={{ fontSize: 15, color: '#cbd5e1', maxWidth: 800, margin: '0 auto', lineHeight: 1.4 }}>
                    Data is ingested from LDES, synced to Triplestores & SQLite, reviewed by experts, re-published via LDES, and harvested to enrich third-party vocabularies.
                  </p>
                </div>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  transform: `scale(${slideSpring})`,
                  marginTop: 10
                }}>
                  <PipelineSvgDiagram frame={slideFrame} primaryColor={primaryColor} accentColor={accentColor} />
                </div>
              </AbsoluteFill>
            );
          })()}
        </Sequence>
      )}

      {/* Slide 3 (6-9s): Technical Highlights (Only for 12-second video) */}
      {durationInFrames === 360 && (
        <Sequence from={6 * fps} durationInFrames={3 * fps}>
          {(() => {
            const slideFrame = frame - 6 * fps;

            return (
              <AbsoluteFill style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                padding: '0 80px',
                boxSizing: 'border-box'
              }}>
                <h2 style={{
                  fontSize: 32,
                  fontWeight: 800,
                  marginBottom: 40,
                  textAlign: 'center',
                  color: '#ffffff',
                  opacity: interpolate(slideFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
                  transform: `translateY(${interpolate(slideFrame, [0, 15], [20, 0], { extrapolateRight: 'clamp' })}px)`
                }}>
                  Technical Architecture
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 24
                }}>
                  {features.map((feature, idx) => {
                    const itemDelay = idx * 10;
                    const itemSpring = spring({
                      frame: slideFrame - itemDelay,
                      fps,
                      config: { damping: 14 }
                    });

                    return (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid rgba(255, 255, 255, 0.08)`,
                          borderRadius: 16,
                          padding: 24,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transform: `scale(${itemSpring})`,
                          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: `${primaryColor}22`,
                          border: `1px solid ${primaryColor}44`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: primaryColor,
                          fontFamily: 'Fira Code, monospace',
                          fontWeight: 'bold',
                          fontSize: 18
                        }}>
                          0{idx + 1}
                        </div>
                        <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                          {feature.split(':')[0]}
                        </h4>
                        <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4, margin: 0 }}>
                          {feature.split(':')[1] || ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </AbsoluteFill>
            );
          })()}
        </Sequence>
      )}

      {/* Slide 4 or 6: Call to Action (9-12s for 12-second, 15-18s for 18-second) */}
      <Sequence from={ctaStart} durationInFrames={3 * fps}>
        {(() => {
          const slideFrame = frame - ctaStart;
          const entranceSpring = spring({ frame: slideFrame, fps, config: { damping: 12 } });
          const pulseScale = interpolate(slideFrame, [30, 45, 60], [1, 1.05, 1], { extrapolateRight: 'clamp' });

          return (
            <AbsoluteFill style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center', 
              padding: '0 80px',
              boxSizing: 'border-box',
              textAlign: 'center'
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 36,
                fontWeight: 'bold',
                marginBottom: 30,
                transform: `scale(${entranceSpring})`,
                boxShadow: `0 10px 30px ${accentColor}44`
              }}>
                ⚓
              </div>

              <h2 style={{
                fontSize: 40,
                fontWeight: 800,
                margin: '0 0 20px 0',
                color: '#ffffff',
                maxWidth: 700,
                opacity: interpolate(slideFrame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(slideFrame, [10, 25], [20, 0], { extrapolateRight: 'clamp' })}px)`
              }}>
                Shape the Multilingual Ocean Future
              </h2>

              <p style={{
                fontSize: 18,
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.5,
                maxWidth: 600,
                margin: '0 0 40px 0',
                opacity: interpolate(slideFrame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(slideFrame, [15, 30], [20, 0], { extrapolateRight: 'clamp' })}px)`
              }}>
                {ctaText}
              </p>

              <div style={{
                transform: `scale(${entranceSpring * pulseScale})`,
                opacity: interpolate(slideFrame, [20, 35], [0, 1], { extrapolateRight: 'clamp' })
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  color: '#0b1a30',
                  padding: '16px 36px',
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 'bold',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  Get Started Now
                </div>
              </div>
            </AbsoluteFill>
          );
        })()}
      </Sequence>
    </AbsoluteFill>
  );
};
