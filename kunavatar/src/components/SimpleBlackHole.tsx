'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SimpleBlackHoleProps {
  className?: string;
}

export default function SimpleBlackHole({ className = '' }: SimpleBlackHoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    animationId?: number;
    cleanup?: () => void;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    console.log('Initializing Simple Black Hole...');

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 创建一个简单的黑色球体
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(geometry, material);
    scene.add(blackHole);

    // 创建一些星星
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // 动画循环
    const animate = () => {
      blackHole.rotation.y += 0.01;
      stars.rotation.y += 0.001;
      
      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();
    console.log('Simple Black Hole initialized successfully');

    // 窗口大小调整
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 保存引用
    sceneRef.current = {
      scene,
      camera,
      renderer,
      cleanup: () => {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        window.removeEventListener('resize', handleResize);
        if (container && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };

    return () => {
      if (sceneRef.current.cleanup) {
        sceneRef.current.cleanup();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full ${className}`}
      style={{ background: 'linear-gradient(to bottom, #000011, #000033)' }}
    >
      <div className="absolute top-4 left-4 text-white text-sm z-10">
        Simple Black Hole Test
      </div>
    </div>
  );
}