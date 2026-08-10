"use client";

import { useEffect, useRef, useState } from "react";
import { LabCanvas } from "./LabCanvas";

type LabScene3DProps = {
  onReady?: () => void;
};

type AuroraRibbon = {
  group: import("three").Group;
  mat: import("three").MeshBasicMaterial;
  phase: number;
  speed: number;
};

type Bokeh = {
  mesh: import("three").Mesh;
  mat: import("three").MeshBasicMaterial;
  ox: number;
  oy: number;
  oz: number;
  drift: number;
};

export function LabScene3D({ onReady }: LabScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (useFallback) return;

    let alive = true;
    let animationId = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let removeListeners: (() => void) | undefined;
    const disposables: Array<{ dispose?: () => void }> = [];

    const init = async () => {
      const container = containerRef.current;
      if (!container || !alive) return;

      try {
        const THREE = await import("three");
        if (!alive || !containerRef.current) return;

        container.replaceChildren();

        const width = window.innerWidth;
        const height = window.innerHeight;

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.75;
        renderer.domElement.style.cssText =
          "position:absolute;inset:0;width:100%;height:100%;display:block;";
        container.appendChild(renderer.domElement);
        disposables.push(renderer);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x070a12, 0.011);

        const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 120);
        camera.position.set(0, 0.3, 9);

        scene.add(new THREE.HemisphereLight(0xd8c8ff, 0x1a1020, 0.85));
        scene.add(new THREE.AmbientLight(0x604868, 0.22));
        const warmFill = new THREE.PointLight(0xffb8a8, 0.35, 28);
        warmFill.position.set(2.5, 1.2, 4);
        scene.add(warmFill);

        const starLayer = (count: number, spread: number, size: number, opacity: number) => {
          const positions = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.8 - 10;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          disposables.push(geo);
          const mat = new THREE.PointsMaterial({
            color: 0xeae6ff,
            size,
            sizeAttenuation: true,
            transparent: true,
            opacity,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          disposables.push(mat);
          const pts = new THREE.Points(geo, mat);
          scene.add(pts);
          return pts;
        };

        const starsDeep = starLayer(600, 50, 0.05, 0.3);
        const starsMid = starLayer(220, 30, 0.09, 0.5);

        const gridGeo = new THREE.PlaneGeometry(40, 40, 40, 40);
        disposables.push(gridGeo);
        const gridMat = new THREE.MeshBasicMaterial({
          color: 0x8b9cff,
          wireframe: true,
          transparent: true,
          opacity: 0.04,
        });
        disposables.push(gridMat);
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.rotation.x = -Math.PI / 2.2;
        grid.position.y = -3.8;
        grid.position.z = -6;
        scene.add(grid);

        const ribbonColors = [0x8b9cff, 0xc4b5fd, 0xffb8a8, 0xffc4d4, 0xfbbf8a];
        const ribbons: AuroraRibbon[] = [];

        for (let i = 0; i < 5; i++) {
          const yBase = (i - 2) * 0.55;
          const points = [
            new THREE.Vector3(-8, yBase, -2 - i * 0.3),
            new THREE.Vector3(-3, yBase + 0.6, -1),
            new THREE.Vector3(0, yBase - 0.3, 0),
            new THREE.Vector3(3, yBase + 0.5, -0.5),
            new THREE.Vector3(8, yBase, -2 - i * 0.2),
          ];
          const curve = new THREE.CatmullRomCurve3(points);
          const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.018 + i * 0.006, 6, false);
          disposables.push(tubeGeo);
          const tubeMat = new THREE.MeshBasicMaterial({
            color: ribbonColors[i],
            transparent: true,
            opacity: 0.05 + i * 0.012,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          disposables.push(tubeMat);
          const tube = new THREE.Mesh(tubeGeo, tubeMat);

          const glowGeo = new THREE.TubeGeometry(curve, 60, 0.06 + i * 0.015, 6, false);
          disposables.push(glowGeo);
          const glowMat = new THREE.MeshBasicMaterial({
            color: ribbonColors[i],
            transparent: true,
            opacity: 0.018,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          disposables.push(glowMat);
          const glow = new THREE.Mesh(glowGeo, glowMat);

          const group = new THREE.Group();
          group.add(tube, glow);
          scene.add(group);

          ribbons.push({
            group,
            mat: tubeMat,
            phase: i * 1.2,
            speed: 0.35 + i * 0.08,
          });
        }

        const bokehs: Bokeh[] = [];
        const bokehGeo = new THREE.CircleGeometry(1, 32);
        disposables.push(bokehGeo);
        for (let i = 0; i < 14; i++) {
          const mat = new THREE.MeshBasicMaterial({
            color: i % 3 === 0 ? 0xffb8a8 : i % 3 === 1 ? 0xffc4d4 : 0x8b9cff,
            transparent: true,
            opacity: 0.015 + Math.random() * 0.015,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          disposables.push(mat);
          const mesh = new THREE.Mesh(bokehGeo, mat);
          mesh.position.set(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 8,
            -4 - Math.random() * 8,
          );
          const scale = 0.4 + Math.random() * 1.8;
          mesh.scale.setScalar(scale);
          scene.add(mesh);
          bokehs.push({
            mesh,
            mat,
            ox: mesh.position.x,
            oy: mesh.position.y,
            oz: mesh.position.z,
            drift: 0.3 + Math.random() * 0.6,
          });
        }

        const dustGeo = new THREE.BufferGeometry();
        const dustCount = 120;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
          dustPos[i * 3] = (Math.random() - 0.5) * 20;
          dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
          dustPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 4;
        }
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        disposables.push(dustGeo);
        const dustMat = new THREE.PointsMaterial({
          color: 0xffecd8,
          size: 0.07,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        disposables.push(dustMat);
        const dust = new THREE.Points(dustGeo, dustMat);
        scene.add(dust);

        const dustBase = Float32Array.from(dustPos);

        let pointerX = 0;
        let pointerY = 0;
        let scrollProgress = 0;

        const onPointerMove = (e: PointerEvent) => {
          pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
          pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
        };

        const onScroll = () => {
          const el = document.querySelector(".lab-scroll");
          if (!el) return;
          const max = el.scrollHeight - el.clientHeight;
          scrollProgress = max > 0 ? el.scrollTop / max : 0;
        };

        window.addEventListener("pointermove", onPointerMove);
        document.querySelector(".lab-scroll")?.addEventListener("scroll", onScroll, {
          passive: true,
        });
        onScroll();

        const onResize = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer?.setSize(w, h);
        };
        window.addEventListener("resize", onResize);

        removeListeners = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("resize", onResize);
          document.querySelector(".lab-scroll")?.removeEventListener("scroll", onScroll);
        };

        let frame = 0;
        const animate = () => {
          if (!alive) return;
          frame++;
          const t = frame * 0.012;
          const breathe = Math.sin(t * 1.1) * 0.5 + 0.5;

          for (const ribbon of ribbons) {
            const p = ribbon.phase;
            ribbon.group.rotation.z = Math.sin(t * ribbon.speed + p) * 0.12;
            ribbon.group.position.y = Math.sin(t * ribbon.speed * 0.65 + p) * 0.45;
            ribbon.group.position.x = Math.sin(t * ribbon.speed * 0.38 + p * 1.3) * 0.55;
            ribbon.mat.opacity = 0.06 + breathe * 0.04 + Math.sin(t * 1.8 + p) * 0.03;
          }

          for (const b of bokehs) {
            b.mesh.position.x = b.ox + Math.sin(t * b.drift) * 0.75;
            b.mesh.position.y = b.oy + Math.cos(t * b.drift * 0.8) * 0.55;
            b.mesh.position.z = b.oz + Math.sin(t * b.drift * 0.5) * 0.3;
            b.mat.opacity = 0.012 + Math.sin(t * b.drift + b.ox) * 0.008 + 0.008;
          }

          starsDeep.rotation.y = t * 0.035;
          starsDeep.rotation.x = Math.sin(t * 0.15) * 0.04;
          starsMid.rotation.y = -t * 0.05;
          starsMid.rotation.z = Math.cos(t * 0.12) * 0.025;

          const dustAttr = dustGeo.getAttribute("position") as import("three").BufferAttribute;
          for (let i = 0; i < dustCount; i++) {
            const i3 = i * 3;
            dustAttr.array[i3] = dustBase[i3]! + Math.sin(t * 0.6 + i * 0.2) * 0.12;
            dustAttr.array[i3 + 1] =
              dustBase[i3 + 1]! + t * 0.018 + Math.cos(t * 0.4 + i * 0.15) * 0.1;
            if (dustAttr.array[i3 + 1]! > 6) dustAttr.array[i3 + 1]! -= 12;
            dustAttr.array[i3 + 2] = dustBase[i3 + 2]! + Math.sin(t * 0.32 + i) * 0.08;
          }
          dustAttr.needsUpdate = true;
          dust.rotation.y = t * 0.045;

          grid.rotation.z = Math.sin(t * 0.18) * 0.04;
          grid.position.y = -3.8 + Math.sin(t * 0.25) * 0.25;
          grid.position.z = -6 - scrollProgress * 2;

          const idleX = Math.sin(t * 0.35) * 0.35;
          const idleY = Math.cos(t * 0.28) * 0.22;
          const camZ = 9 - scrollProgress * 0.8;
          const camY = 0.3 + scrollProgress * 0.2;
          camera.position.x += (pointerX * 0.32 + idleX - camera.position.x) * 0.035;
          camera.position.y += (-pointerY * 0.22 + camY + idleY - camera.position.y) * 0.035;
          camera.position.z += (camZ - camera.position.z) * 0.035;
          camera.lookAt(0, scrollProgress * 0.1 - 0.1, -2);

          renderer!.render(scene, camera);
          animationId = requestAnimationFrame(animate);
        };

        animate();
        onReadyRef.current?.();
      } catch {
        if (alive) setUseFallback(true);
        onReadyRef.current?.();
      }
    };

    init();

    return () => {
      alive = false;
      cancelAnimationFrame(animationId);
      removeListeners?.();
      for (const item of disposables) item.dispose?.();
      containerRef.current?.replaceChildren();
    };
  }, [useFallback]);

  if (useFallback) {
    return <LabCanvas />;
  }

  return <div ref={containerRef} className="lab-scene-3d" aria-hidden />;
}
