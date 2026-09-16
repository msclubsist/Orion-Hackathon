'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ORION_STARS, CONSTELLATION_EDGES } from '../../data/orionData';
import type { StarNodeData } from '../../types/orion';
import { sound } from '../../audio/soundEffects';

export const OrionConstellation3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeStar, setActiveStar] = useState<StarNodeData | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Particle Cloud Background (Optimized count for mobile & desktop)
    const particlesCount = 120;
    const particlesGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);

    const colors = [
      new THREE.Color(0xFFFFFF),
      new THREE.Color(0xBAE6FD),
      new THREE.Color(0x38BDF8),
      new THREE.Color(0x0284C7)
    ];

    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 35;
      posArray[i + 1] = (Math.random() - 0.5) * 35;
      posArray[i + 2] = (Math.random() - 0.5) * 35;

      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      colorArray[i] = chosenColor.r;
      colorArray[i + 1] = chosenColor.g;
      colorArray[i + 2] = chosenColor.b;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    masterGroup.add(particlesMesh);

    // Star Nodes & Glow Sprites
    const starMeshes: THREE.Mesh[] = [];
    const starMeshMap = new Map<string, THREE.Mesh>();

    const createGlowTexture = (hexColor: string) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, hexColor);
        grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.15)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(c);
    };

    ORION_STARS.forEach((star) => {
      const geo = new THREE.SphereGeometry(star.size, 24, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(star.color),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...star.coords);
      mesh.userData = { starData: star };
      
      const spriteMat = new THREE.SpriteMaterial({
        map: createGlowTexture(star.color),
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(star.size * 5.5, star.size * 5.5, 1);
      mesh.add(sprite);

      masterGroup.add(mesh);
      starMeshes.push(mesh);
      starMeshMap.set(star.name, mesh);
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    CONSTELLATION_EDGES.forEach(([starA, starB]) => {
      const meshA = starMeshMap.get(starA);
      const meshB = starMeshMap.get(starB);
      if (meshA && meshB) {
        const points = [meshA.position, meshB.position];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMat);
        masterGroup.add(line);
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerInteraction = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(starMeshes, false);

      if (intersects.length > 0) {
        const starData = intersects[0].object.userData.starData as StarNodeData;
        if (activeStar?.name !== starData.name) {
          setActiveStar(starData);
          sound.playHover();
        }
      }
    };

    const onPointerMove = (e: MouseEvent) => {
      handlePointerInteraction(e.clientX, e.clientY);
    };

    let isDragging = false;
    let previousPosition = { x: 0, y: 0 };

    const onStart = (x: number, y: number) => {
      isDragging = true;
      previousPosition = { x, y };
      handlePointerInteraction(x, y);
    };

    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      const deltaX = x - previousPosition.x;
      const deltaY = y - previousPosition.y;

      masterGroup.rotation.y += deltaX * 0.008;
      masterGroup.rotation.x += deltaY * 0.008;

      previousPosition = { x, y };
    };

    const onEnd = () => {
      isDragging = false;
    };

    // Mouse listeners
    const onMouseDown = (e: MouseEvent) => onStart(e.clientX, e.clientY);
    const onMouseMoveDoc = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onMouseUp = () => onEnd();

    // Touch listeners
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => onEnd();

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMoveDoc);
    window.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let animId: number;
    let isIntersecting = true;
    const clock = new THREE.Clock();

    const io = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting && !animId) {
        animate();
      }
    }, { threshold: 0.1 });
    io.observe(container);

    const animate = () => {
      if (!isIntersecting) {
        animId = 0;
        return;
      }
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        masterGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.18;
        masterGroup.rotation.x = Math.cos(elapsed * 0.3) * 0.12;
      }

      starMeshes.forEach((mesh, i) => {
        const scaleFactor = 1 + Math.sin(elapsed * 2.5 + i) * 0.08;
        mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      io.disconnect();
      if (animId) cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMoveDoc);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeStar]);

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] md:h-[460px] flex items-center justify-center select-none touch-none">
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      <div className="absolute top-2 left-2 text-[10px] font-mono-hud text-[#38BDF8] tracking-widest pointer-events-none flex flex-col gap-0.5 text-left">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="w-1.5 h-1.5 bg-[#38BDF8]" />
          ORION SPATIAL TELEMETRY 3D
        </span>
        <span className="text-[#7DD3FC] text-[8px] sm:text-[10px]">RA 05h 35m • DEC −05° 23′</span>
      </div>

      <div className="absolute bottom-2 left-2 text-[8px] sm:text-[9px] font-mono-hud text-[#7DD3FC] pointer-events-none text-left">
        [ DRAG / TOUCH TO ROTATE • TAP NODES FOR DATA ]
      </div>

      {activeStar && (
        <div className="absolute bottom-4 right-4 max-w-[240px] sm:max-w-[280px] p-3 sm:p-3.5 bg-[#07193D]/95 backdrop-blur-md rounded-none border border-[#38BDF8]/40 text-left pointer-events-none shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[rgba(212,233,255,0.12)]">
            <span className="text-xs font-display font-bold text-white tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2" style={{ backgroundColor: activeStar.color }} />
              {activeStar.name.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono-hud text-[#38BDF8] bg-[#040E24] px-1.5 py-0.5 border border-[#38BDF8]/40">
              MAG {activeStar.apparentMagnitude}
            </span>
          </div>

          <p className="text-[10px] sm:text-[11px] text-[#BAE6FD] font-sans mb-2 leading-relaxed font-normal">
            {activeStar.role}
          </p>

          <div className="grid grid-cols-2 gap-1 text-[8px] sm:text-[9px] font-mono-hud text-[#7DD3FC] pt-1 border-t border-[rgba(212,233,255,0.1)]">
            <div>
              <span className="text-[#7DD3FC] block">DESIGNATION</span>
              <span className="text-white truncate block">{activeStar.designation}</span>
            </div>
            <div>
              <span className="text-[#7DD3FC] block">DISTANCE</span>
              <span className="text-[#38BDF8] truncate block">{activeStar.distance}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
