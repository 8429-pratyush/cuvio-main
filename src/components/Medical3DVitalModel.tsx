import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Activity, Heart, Brain, Bone, ShieldAlert, Sparkles,
  RotateCcw, Eye, Compass, Zap, Stethoscope, ChevronRight, Check
} from 'lucide-react';

export interface AnatomicalRegion {
  id: string;
  name: string;
  specialty: string;
  urgency: 'Emergency' | 'Priority' | 'Routine';
  commonSymptoms: string[];
  defaultSeverity: number;
  description: string;
  position: [number, number, number];
  color: string;
}

export const ANATOMICAL_REGIONS: AnatomicalRegion[] = [
  {
    id: 'chest',
    name: 'Chest & Cardiovascular',
    specialty: 'Cardiology',
    urgency: 'Emergency',
    commonSymptoms: ['Chest tightness & left arm ache', 'Palpitations & shortness of breath', 'Sudden dizziness during exertion'],
    defaultSeverity: 8,
    description: 'Coronary circulation, myocardium, and thoracic aorta vital zone.',
    position: [0, 0.9, 0.55],
    color: '#ef4444' // red
  },
  {
    id: 'brain',
    name: 'Head & Neurovascular',
    specialty: 'Neurology',
    urgency: 'Priority',
    commonSymptoms: ['Severe migraine with aura & nausea', 'Sudden visual blurriness or vertigo', 'Unilateral facial numbness'],
    defaultSeverity: 7,
    description: 'Cerebral cortex, intracranial pressure, and cranial neural networks.',
    position: [0, 2.3, 0.25],
    color: '#8b5cf6' // purple
  },
  {
    id: 'lungs',
    name: 'Thorax & Respiratory',
    specialty: 'Pulmonology',
    urgency: 'Priority',
    commonSymptoms: ['Persistent wheezing & night cough', 'Stridor or breathing difficulty', 'Sharp pleuritic pain on inhalation'],
    defaultSeverity: 6,
    description: 'Bronchial arborization, bilateral alveolar beds, and pleural cavity.',
    position: [-0.65, 0.95, 0.35],
    color: '#06b6d4' // cyan
  },
  {
    id: 'abdomen',
    name: 'Abdomen & Gastrointestinal',
    specialty: 'Gastroenterology',
    urgency: 'Routine',
    commonSymptoms: ['Sharp upper abdominal cramps & acidity', 'Right lower quadrant tenderness', 'Nausea after meals with bloating'],
    defaultSeverity: 5,
    description: 'Gastric mucosa, hepatic biliary axis, and mesenteric intestine.',
    position: [0, -0.1, 0.5],
    color: '#f59e0b' // amber
  },
  {
    id: 'spine_joints',
    name: 'Spine & Musculoskeletal',
    specialty: 'Orthopedics',
    urgency: 'Routine',
    commonSymptoms: ['Acute knee joint pain & clicking', 'Lumbar disc pain radiating to foot', 'Shoulder impingement with stiffness'],
    defaultSeverity: 5,
    description: 'Axial spinal column, lumbar facet joints, and articular cartilage.',
    position: [0.65, -1.3, 0.3],
    color: '#10b981' // emerald
  }
];

interface Medical3DVitalModelProps {
  onSelectRegion?: (region: AnatomicalRegion, symptom: string) => void;
  selectedSpecialty?: string;
  className?: string;
}

export default function Medical3DVitalModel({
  onSelectRegion,
  selectedSpecialty,
  className = ''
}: Medical3DVitalModelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const ecgCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeRegion, setActiveRegion] = useState<AnatomicalRegion>(ANATOMICAL_REGIONS[0]);
  const [viewMode, setViewMode] = useState<'hologram' | 'heart' | 'neuro'>('hologram');
  const isRotating = true; // Rotates slowly by default, user can still drag
  const [hoveredRegion, setHoveredRegion] = useState<AnatomicalRegion | null>(null);

  // Heart Rate simulation
  const [bpm, setBpm] = useState(74);

  // Sync selectedSpecialty with active region if passed from parent
  useEffect(() => {
    if (selectedSpecialty) {
      const match = ANATOMICAL_REGIONS.find(r => r.specialty.toLowerCase() === selectedSpecialty.toLowerCase());
      if (match) setActiveRegion(match);
    }
  }, [selectedSpecialty]);

  // Animated ECG Canvas
  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let t = 0;
    const points: number[] = [];
    const maxPoints = 120;

    const renderEcg = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00f5d4';

      // Cardiac rhythm waveform generation (P-Q-R-S-T sequence)
      const phase = (t % 60);
      let yOffset = 0;
      if (phase >= 15 && phase <= 20) {
        yOffset = -5; // P wave
      } else if (phase === 24) {
        yOffset = 3; // Q dip
      } else if (phase === 26) {
        yOffset = -26; // R peak
      } else if (phase === 28) {
        yOffset = 10; // S drop
      } else if (phase >= 34 && phase <= 42) {
        yOffset = -8; // T wave
      }

      points.push(canvas.height / 2 + yOffset);
      if (points.length > maxPoints) points.shift();

      ctx.beginPath();
      const step = canvas.width / maxPoints;
      for (let i = 0; i < points.length; i++) {
        const x = i * step;
        const y = points[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      t += 1;
      animationId = requestAnimationFrame(renderEcg);
    };

    renderEcg();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Subtle BPM fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setBpm(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return next >= 68 && next <= 82 ? next : 74;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Three.js 3D Viewport Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 380;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040d1a, 0.12);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x102a43, 2.5);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 3, 20);
    pointLightCyan.position.set(3, 4, 4);
    scene.add(pointLightCyan);

    const pointLightEmerald = new THREE.PointLight(0x10b981, 2.5, 20);
    pointLightEmerald.position.set(-3, -2, 3);
    scene.add(pointLightEmerald);

    const heartGlowLight = new THREE.PointLight(0xef4444, 4, 8);
    heartGlowLight.position.set(0, 0.9, 0.6);
    scene.add(heartGlowLight);

    // 3. Holographic Torso Root Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // A. Torso Contour Ribs (Concentric Glowing Wire Rings)
    const contourCount = 28;
    const ribLines: THREE.Line[] = [];
    for (let i = 0; i < contourCount; i++) {
      const y = -1.8 + (i / contourCount) * 4.2;
      let radiusX = 0.8;
      let radiusZ = 0.5;

      // Anatomical contour profiling (head, neck, shoulders, chest, waist, hips)
      if (y > 1.8) {
        // Head
        const headProgress = (y - 1.8) / 0.6;
        radiusX = 0.45 * Math.sin(headProgress * Math.PI);
        radiusZ = 0.45 * Math.sin(headProgress * Math.PI);
      } else if (y > 1.5) {
        // Neck
        radiusX = 0.35;
        radiusZ = 0.32;
      } else if (y > 0.8) {
        // Shoulders & Chest
        radiusX = 1.15;
        radiusZ = 0.65;
      } else if (y > 0) {
        // Mid chest
        radiusX = 0.95;
        radiusZ = 0.6;
      } else if (y > -0.7) {
        // Waist
        radiusX = 0.8;
        radiusZ = 0.52;
      } else {
        // Pelvis & upper thighs
        radiusX = 0.95;
        radiusZ = 0.58;
      }

      if (radiusX <= 0.05) continue;

      const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusZ, 0, 2 * Math.PI, false, 0);
      const curvePoints = curve.getPoints(48);
      const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints.map(p => new THREE.Vector3(p.x, y, p.y)));
      
      const mat = new THREE.LineBasicMaterial({
        color: y > 0.6 && y < 1.3 ? 0x00f5d4 : 0x1e3a8a,
        transparent: true,
        opacity: 0.35 + (i % 3 === 0 ? 0.3 : 0.1)
      });
      const line = new THREE.Line(geometry, mat);
      modelGroup.add(line);
      ribLines.push(line);
    }

    // B. Floating Holographic Bio-Particles
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color('#00f5d4');
    const c2 = new THREE.Color('#8b5cf6');
    const c3 = new THREE.Color('#3b82f6');

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 4.2;
      const r = Math.random() * 1.1;

      particlePositions[i * 3] = Math.cos(theta) * r;
      particlePositions[i * 3 + 1] = h;
      particlePositions[i * 3 + 2] = Math.sin(theta) * r * 0.7;

      const mixed = Math.random() > 0.5 ? (Math.random() > 0.5 ? c1 : c2) : c3;
      particleColors[i * 3] = mixed.r;
      particleColors[i * 3 + 1] = mixed.g;
      particleColors[i * 3 + 2] = mixed.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    modelGroup.add(particleField);

    // C. 3D Biometric Beating Heart
    const heartGroup = new THREE.Group();
    heartGroup.position.set(0, 0.9, 0.5);

    // Heart Core Mesh (Dual organic lobes)
    const heartGeo = new THREE.SphereGeometry(0.24, 24, 24);
    heartGeo.scale(1.1, 1.3, 0.9);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.2,
      wireframe: false
    });
    const heartMesh = new THREE.Mesh(heartGeo, heartMat);
    heartGroup.add(heartMesh);

    // Heart Wireframe Halo
    const heartWireMat = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const heartWireMesh = new THREE.Mesh(heartGeo.clone().scale(1.15, 1.15, 1.15), heartWireMat);
    heartGroup.add(heartWireMesh);

    modelGroup.add(heartGroup);

    // D. 3D Brain Neural Hologram Sphere
    const brainGroup = new THREE.Group();
    brainGroup.position.set(0, 2.3, 0.25);
    const brainGeo = new THREE.IcosahedronGeometry(0.28, 2);
    const brainMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.8,
      wireframe: true
    });
    const brainMesh = new THREE.Mesh(brainGeo, brainMat);
    brainGroup.add(brainMesh);
    modelGroup.add(brainGroup);

    // E. Interactive Hotspot Markers
    const hotspotMeshes: { mesh: THREE.Mesh; halo: THREE.Mesh; region: AnatomicalRegion }[] = [];
    ANATOMICAL_REGIONS.forEach(reg => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(...reg.position);

      const sphereGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(reg.color),
        wireframe: false
      });
      const markerMesh = new THREE.Mesh(sphereGeo, sphereMat);
      markerMesh.userData = { region: reg };

      const haloGeo = new THREE.RingGeometry(0.12, 0.16, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(reg.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);

      markerGroup.add(markerMesh);
      markerGroup.add(haloMesh);
      modelGroup.add(markerGroup);

      hotspotMeshes.push({ mesh: markerMesh, halo: haloMesh, region: reg });
    });

    // 4. Mouse Drag & Touch Rotation Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = clientX - prevMouseX;
        const deltaY = clientY - prevMouseY;
        targetRotationY += deltaX * 0.008;
        targetRotationX += deltaY * 0.005;
        // Clamp vertical pitch
        targetRotationX = Math.max(-0.4, Math.min(0.4, targetRotationX));
        prevMouseX = clientX;
        prevMouseY = clientY;
      }

      // Raycasting for interactive hotspots
      if (!isDragging && 'clientX' in e) {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / width) * 2 - 1,
          -((e.clientY - rect.top) / height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotMeshes.map(h => h.mesh));
        if (intersects.length > 0) {
          const hit = intersects[0].object.userData.region as AnatomicalRegion;
          setHoveredRegion(hit);
          container.style.cursor = 'pointer';
        } else {
          setHoveredRegion(null);
          container.style.cursor = 'grab';
        }
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onContainerClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / width) * 2 - 1,
        -((e.clientY - rect.top) / height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspotMeshes.map(h => h.mesh));
      if (intersects.length > 0) {
        const selected = intersects[0].object.userData.region as AnatomicalRegion;
        setActiveRegion(selected);
        if (onSelectRegion) {
          onSelectRegion(selected, selected.commonSymptoms[0]);
        }
      }
    };

    container.addEventListener('mousedown', onPointerDown);
    container.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('click', onContainerClick);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    container.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 5. Main Animation Loop
    let clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth damped rotation
      if (isRotating && !isDragging) {
        targetRotationY += 0.0035;
      }
      modelGroup.rotation.y += (targetRotationY - modelGroup.rotation.y) * 0.08;
      modelGroup.rotation.x += (targetRotationX - modelGroup.rotation.x) * 0.08;

      // Realistic cardiac systole/diastole pulse
      const heartPulse = Math.sin(elapsedTime * 6.8);
      const heartScale = 1.0 + (heartPulse > 0.4 ? Math.pow(heartPulse, 3) * 0.18 : 0);
      heartGroup.scale.set(heartScale, heartScale, heartScale);
      heartGlowLight.intensity = 2.5 + (heartPulse > 0.4 ? 3.5 : 0);

      // Brain synaptic scintillation
      brainGroup.rotation.y = elapsedTime * 0.4;
      brainGroup.rotation.z = Math.sin(elapsedTime * 0.5) * 0.1;

      // Hotspots pulsing & always face camera
      hotspotMeshes.forEach(({ halo, region }, index) => {
        halo.lookAt(camera.position);
        const pulse = 1.0 + Math.sin(elapsedTime * 3.5 + index) * 0.2;
        halo.scale.set(pulse, pulse, pulse);
        if (region.id === activeRegion?.id) {
          halo.scale.set(pulse * 1.4, pulse * 1.4, pulse * 1.4);
        }
      });

      // Bio particle drift
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        let y = positions[i * 3 + 1];
        y += 0.003;
        if (y > 2.2) y = -2.0;
        positions[i * 3 + 1] = y;
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    // 6. Resize listener
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onPointerDown);
      container.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('click', onContainerClick);
      container.removeEventListener('touchstart', onPointerDown);
      container.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isRotating, activeRegion?.id]);

  return (
    <div className={`relative bg-gradient-to-b from-slate-950 via-[#071322] to-slate-950 rounded-3xl border border-cyan-500/20 shadow-2xl overflow-hidden p-4 sm:p-5 text-white ${className}`}>
      {/* Background Radial Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">
              Interactive Anatomical Vital Model
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Canvas + Real-Time Telemetry HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
        {/* Left / Center: Interactive 3D Model Viewport (7 Cols) */}
        <div className="lg:col-span-7 relative flex flex-col items-center justify-center">
          <div
            ref={mountRef}
            className="w-full h-80 sm:h-96 rounded-2xl relative cursor-grab active:cursor-grabbing select-none"
          />

          {/* Interactive Hint */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1.5 font-medium">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Drag to spin 3D body &bull; Tap glowing nodes to isolate symptoms
            </span>
            {hoveredRegion && (
              <span className="text-cyan-300 font-bold hidden sm:inline">
                Hovering: {hoveredRegion.name}
              </span>
            )}
          </div>
        </div>

        {/* Right: Biometric HUD & Selected Organ Triage (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* Card 1: Live Bio-Telemetry Monitor */}
          <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800/90 shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">Cardiac Sinus Rhythm</span>
              </div>
              <div className="flex items-baseline gap-1 text-emerald-400 font-mono font-black text-sm">
                <span>{bpm}</span>
                <span className="text-[10px] text-slate-400">BPM</span>
              </div>
            </div>

            {/* ECG Real-Time Canvas Line */}
            <div className="h-14 bg-black/60 rounded-xl p-1.5 border border-cyan-900/30 overflow-hidden relative">
              <canvas
                ref={ecgCanvasRef}
                width={280}
                height={48}
                className="w-full h-full"
              />
              <span className="absolute bottom-1 right-2 text-[9px] font-mono text-cyan-500/80">
                Lead II &bull; Normal
              </span>
            </div>

            {/* Vital Stats Mini-Grid */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase">SpO2 (Pulse)</p>
                <p className="text-xs font-mono font-extrabold text-cyan-400 mt-0.5">99.1%</p>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Triage Acc.</p>
                <p className="text-xs font-mono font-extrabold text-emerald-400 mt-0.5">96.8%</p>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Stress Lvl</p>
                <p className="text-xs font-mono font-extrabold text-amber-400 mt-0.5">Low (18%)</p>
              </div>
            </div>
          </div>

          {/* Card 2: Selected Anatomical Hotspot Detail */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl p-4 border border-cyan-500/30 shadow-lg relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ISOLATED REGION
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeRegion.urgency === 'Emergency'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : activeRegion.urgency === 'Priority'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {activeRegion.urgency} Priority
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeRegion.color }} />
                  {activeRegion.name}
                </h4>
                <p className="text-xs text-cyan-300/90 font-semibold mt-0.5">
                  Recommended Specialist: <span className="underline decoration-cyan-400 font-bold text-white">{activeRegion.specialty}</span>
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeRegion.description}
              </p>

              {/* Common Indicative Symptoms */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Typical Clinical Indicators:
                </p>
                <div className="space-y-1">
                  {activeRegion.commonSymptoms.map((sym, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (onSelectRegion) onSelectRegion(activeRegion, sym);
                      }}
                      className="w-full text-left text-xs bg-slate-800/80 hover:bg-cyan-950/70 hover:border-cyan-500/40 border border-slate-700/60 p-2 rounded-xl text-slate-200 hover:text-cyan-200 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate pr-2">&bull; {sym}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-3">
              <button
                onClick={() => {
                  if (onSelectRegion) {
                    onSelectRegion(activeRegion, activeRegion.commonSymptoms[0]);
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-[#0B5A4B] via-emerald-600 to-teal-500 hover:from-[#084337] hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Run AI Triage for {activeRegion.name.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Anatomical Quick Select Buttons */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
          Target Zones:
        </span>
        {ANATOMICAL_REGIONS.map(reg => {
          const isCurrent = activeRegion.id === reg.id;
          return (
            <button
              key={reg.id}
              onClick={() => {
                setActiveRegion(reg);
                if (onSelectRegion) onSelectRegion(reg, reg.commonSymptoms[0]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isCurrent
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isCurrent ? '#040d1a' : reg.color }}
              />
              <span>{reg.name.split(' ')[0]}</span>
              <span className="text-[10px] opacity-75">({reg.specialty})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
