import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Queue3DCanvasProps {
  onAdvanceToken?: () => void;
  className?: string;
  currentTokenNumber?: number;
  initialMeToken?: number;
}

export default function Queue3DCanvas({
  onAdvanceToken,
  className = '',
  currentTokenNumber = 14,
  initialMeToken = 17
}: Queue3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hudInfo, setHudInfo] = useState<{ text: string; isMyTurn: boolean }>({
    text: `Token A-${initialMeToken} · ${initialMeToken - currentTokenNumber} ahead · about ${(initialMeToken - currentTokenNumber) * 6} min`,
    isMyTurn: false
  });
  const advanceFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animFrameId: number;

    let nowToken = currentTokenNumber;
    let meToken = initialMeToken;
    const N = 7;
    let busy = false;

    const updateHud = () => {
      const ahead = meToken - nowToken;
      if (ahead <= 0) {
        setHudInfo({
          text: `Token A-${meToken} · It's your turn! Please proceed to doctor.`,
          isMyTurn: true
        });
      } else {
        setHudInfo({
          text: `Token A-${meToken} · ${ahead} ahead · about ${ahead * 6} min`,
          isMyTurn: false
        });
      }
    };

    updateHud();

    // Three.js Scene Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 90);
    camera.position.set(0, 2, 14);
    camera.lookAt(0, -0.2, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(4, 7, 6);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xf2a93b, 1.2, 14);
    pointLight.position.set(-3, 1, 5);
    scene.add(pointLight);

    // Tech Grid
    const grid = new THREE.GridHelper(60, 60, 0x1aa7a9, 0x0f3a42);
    grid.position.y = -1.62;
    if (grid.material instanceof THREE.Material) {
      grid.material.transparent = true;
      grid.material.opacity = 0.55;
    }
    scene.add(grid);

    // Token Group
    const group = new THREE.Group();
    scene.add(group);

    const slotPosition = (s: number) => new THREE.Vector3(-2.4 + s * 1.15, -0.9 + s * 0.5, 2 - s * 1.9);
    const boxGeo = new THREE.BoxGeometry(2.6, 1.5, 0.2);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0b6b6d, roughness: 0.4 });

    interface TokenItem {
      num: number;
      slot: number;
      s: number;
      mesh: THREE.Mesh;
      cv: HTMLCanvasElement;
      tex: THREE.CanvasTexture;
    }

    const tokens: TokenItem[] = [];

    const drawCardFace = (t: TokenItem) => {
      const ctx = t.cv.getContext('2d');
      if (!ctx) return;
      const w = 512;
      const h = 296;
      const isServing = t.slot === 0;
      const isMine = t.num === meToken;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (isServing) {
        grad.addColorStop(0, '#F9C566');
        grad.addColorStop(1, '#EE9A1B');
      } else if (isMine) {
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, '#E6F4F1');
      } else {
        grad.addColorStop(0, '#14A9AB');
        grad.addColorStop(1, '#0A5A63');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Border for user's token
      if (isMine && !isServing) {
        ctx.strokeStyle = '#0F8B8D';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, w - 14, h - 14);
      }

      // Plus symbol watermark
      ctx.fillStyle = isServing ? 'rgba(42,26,0,.15)' : 'rgba(255,255,255,.2)';
      ctx.fillRect(430, 34, 14, 48);
      ctx.fillRect(413, 51, 48, 14);

      // Token text
      ctx.fillStyle = isServing ? '#2A1A00' : isMine ? '#0E2A33' : '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.font = "800 146px 'Bricolage Grotesque', sans-serif";
      ctx.fillText(`A-${t.num}`, 34, 178);

      ctx.font = "600 38px 'Figtree', sans-serif";
      if (isServing) {
        ctx.fillText(isMine ? 'Your turn!' : 'Now serving', 38, 252);
      } else {
        ctx.fillText(isMine ? `You · about ${t.slot * 6} min` : `About ${t.slot * 6} min wait`, 38, 252);
      }

      t.tex.needsUpdate = true;
    };

    // Create 7 tokens in line
    for (let i = 0; i < N; i++) {
      const cvs = document.createElement('canvas');
      cvs.width = 512;
      cvs.height = 296;
      const tex = new THREE.CanvasTexture(cvs);

      const materials = [
        sideMat,
        sideMat,
        sideMat,
        sideMat,
        new THREE.MeshBasicMaterial({ map: tex }),
        sideMat
      ];

      const mesh = new THREE.Mesh(boxGeo, materials);
      mesh.position.copy(slotPosition(i));
      mesh.rotation.y = -0.45;
      group.add(mesh);

      const tObj: TokenItem = {
        num: nowToken + i,
        slot: i,
        s: 1,
        mesh,
        cv: cvs,
        tex
      };

      tokens.push(tObj);
      drawCardFace(tObj);
    }

    // Glowing ring for currently serving token slot
    const ringGeo = new THREE.TorusGeometry(1.85, 0.035, 8, 72);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf2a93b,
      transparent: true,
      opacity: 0.75
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(slotPosition(0));
    ring.rotation.y = -0.45;
    group.add(ring);

    // 3D Ambulance
    const ambulanceGroup = new THREE.Group();
    const makeMat = (col: number, emis = 0) =>
      new THREE.MeshStandardMaterial({ color: col, emissive: emis, roughness: 0.45 });

    const addBox = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      ambulanceGroup.add(b);
      return b;
    };

    addBox(1.5, 0.75, 0.7, makeMat(0xffffff), 0, 0.55, 0); // body
    addBox(0.55, 0.52, 0.66, makeMat(0xdde8ec), 1.02, 0.46, 0); // windshield
    addBox(1.5, 0.1, 0.72, makeMat(0xc53340), 0, 0.34, 0); // red stripe
    addBox(0.14, 0.42, 0.74, makeMat(0xc53340), -0.1, 0.62, 0); // cross vert
    addBox(0.42, 0.14, 0.74, makeMat(0xc53340), -0.1, 0.62, 0); // cross horiz

    // Flashing emergency siren
    const sirenMat = makeMat(0xff2030, 0xff2030);
    addBox(0.2, 0.12, 0.3, sirenMat, -0.5, 0.98, 0);

    // Wheels
    const wheelMat = makeMat(0x111111);
    [-0.5, 0.7].forEach(x => {
      [0.36, -0.36].forEach(z => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 16), wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.19, z);
        ambulanceGroup.add(w);
      });
    });

    ambulanceGroup.position.set(-9, -1.62, 4.6);
    ambulanceGroup.scale.setScalar(1.1);
    scene.add(ambulanceGroup);

    // Dust particles
    const particlePositions = new Float32Array(180);
    for (let i = 0; i < 180; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 26;
      particlePositions[i + 1] = Math.random() * 7 - 1;
      particlePositions[i + 2] = (Math.random() - 0.5) * 20;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x7fe3e5,
      size: 0.07,
      transparent: true,
      opacity: 0.7
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Advance Queue Function
    const advanceToken = () => {
      if (busy) return;
      busy = true;
      nowToken++;

      if (meToken < nowToken) {
        meToken = nowToken + 3;
      }
      updateHud();

      const out = tokens.find(t => t.slot === 0);
      tokens.forEach(t => t.slot--);
      if (out) out.s = 0;
      tokens.forEach(t => {
        if (t !== out) drawCardFace(t);
      });

      if (onAdvanceToken) {
        onAdvanceToken();
      }

      setTimeout(() => {
        if (out) {
          out.num = nowToken + N - 1;
          out.slot = N - 1;
          out.mesh.position.copy(slotPosition(N - 1));
          out.mesh.scale.setScalar(0.01);
          out.s = 1;
          drawCardFace(out);
        }
        busy = false;
      }, 650);
    };

    advanceFnRef.current = advanceToken;

    // Responsive Resize
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      group.position.set(w > h * 1.2 ? 2.3 : -0.6, -0.2, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // Mouse tilt interaction
    let mouseX = 0;
    const handlePointerMove = (e: PointerEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove);

    // Animation Loop
    const awayVec = new THREE.Vector3(-8, 3, 4);
    let lastTime = performance.now();
    let autoAdvanceAcc = 0;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!prefersReducedMotion) {
        autoAdvanceAcc += dt;
        if (autoAdvanceAcc > 4.5) {
          autoAdvanceAcc = 0;
          advanceToken();
        }

        // Ambulance motion
        ambulanceGroup.position.x += dt * 2.4;
        if (ambulanceGroup.position.x > 11) {
          ambulanceGroup.position.x = -11;
        }

        // Flashing beacon
        sirenMat.emissiveIntensity = 0.4 + 0.6 * Math.abs(Math.sin(now / 160));
        particles.rotation.y += dt * 0.03;
        group.rotation.y += (mouseX * 0.14 - group.rotation.y) * 0.05;
      }

      // Smooth lerp token cards
      tokens.forEach(t => {
        const targetPos = t.slot < 0 ? awayVec : slotPosition(t.slot);
        t.mesh.position.lerp(targetPos, 0.09);
        const k = t.mesh.scale.x + (t.s - t.mesh.scale.x) * 0.1;
        t.mesh.scale.setScalar(Math.max(k, 0.01));
      });

      const pulseScale = 1 + 0.05 * Math.sin(now / 380);
      ring.scale.set(pulseScale, pulseScale, 1);

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [currentTokenNumber, initialMeToken, onAdvanceToken]);

  return (
    <div className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" aria-label="3D Live Healthcare Queue & Ambulance Simulation" />

      {/* Floating HUD bottom bar */}
      <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between gap-3 flex-wrap pointer-events-none z-10">
        <div
          className={`px-4 py-2 rounded-full border backdrop-blur-md font-semibold text-xs transition-all pointer-events-auto shadow-sm ${
            hudInfo.isMyTurn
              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold token-serving-glow'
              : 'bg-white/90 text-slate-800 border-slate-200'
          }`}
        >
          {hudInfo.text}
        </div>

        <button
          type="button"
          onClick={() => advanceFnRef.current()}
          className="pointer-events-auto px-4 py-2 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white font-semibold text-xs border border-white/15 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          title="Simulate front desk advancing to next patient token"
        >
          <span>Call next token</span>
          <span className="text-amber-400 font-mono text-[11px]">⚡</span>
        </button>
      </div>
    </div>
  );
}
