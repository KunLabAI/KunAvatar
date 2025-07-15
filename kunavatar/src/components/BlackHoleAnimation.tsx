'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// 动态导入Three.js扩展
let OrbitControls: any;
let EffectComposer: any;
let RenderPass: any;
let UnrealBloomPass: any;
let ShaderPass: any;

// 异步加载Three.js扩展
const loadThreeExtensions = async () => {
  if (typeof window === 'undefined') return false;
  
  try {
    const [orbitModule, composerModule, renderModule, bloomModule, shaderModule] = await Promise.all([
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/ShaderPass.js')
    ]);
    
    OrbitControls = orbitModule.OrbitControls;
    EffectComposer = composerModule.EffectComposer;
    RenderPass = renderModule.RenderPass;
    UnrealBloomPass = bloomModule.UnrealBloomPass;
    ShaderPass = shaderModule.ShaderPass;
    
    return true;
  } catch (error) {
    console.error('Failed to load Three.js extensions:', error);
    return false;
  }
};

interface BlackHoleAnimationProps {
  className?: string;
  offsetX?: number;
  starsOnly?: boolean;
  hideControls?: boolean;
}

export default function BlackHoleAnimation({ className = '', offsetX = 0, starsOnly = false, hideControls = false }: BlackHoleAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    animationId?: number;
    cleanup?: () => void;
  }>({});
  
  // 星星数据状态（用于CSS后备动画）
  const [stars, setStars] = useState<Array<{
    left: string;
    top: string;
    animationDelay: string;
    animationDuration: string;
  }>>([]);
  
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 生成星星数据（仅在客户端）
  useEffect(() => {
    const generateStars = () => {
      const starData = [];
      for (let i = 0; i < 100; i++) {
        starData.push({
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${2 + Math.random() * 2}s`
        });
      }
      setStars(starData);
    };
    
    generateStars();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let retryCount = 0;
    const maxRetries = 10;

    const initThreeJS = async () => {
      try {
        const container = containerRef.current;
        if (!container) {
          console.warn('BlackHole: 容器未找到');
          return;
        }
        
        // 检查容器尺寸
        const containerRect = container.getBoundingClientRect();
        console.log('BlackHole: 容器尺寸', {
          width: containerRect.width,
          height: containerRect.height,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight,
          retryCount
        });
        
        if (container.clientWidth === 0 || container.clientHeight === 0) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.warn(`BlackHole: 容器尺寸为零，延迟重试 (${retryCount}/${maxRetries})`);
            setTimeout(() => initThreeJS(), 200 * retryCount); // 递增延迟
            return;
          } else {
            console.error('BlackHole: 容器尺寸检查失败，达到最大重试次数');
            setHasError(true);
            setErrorMessage('容器尺寸获取失败，请刷新页面重试');
            return;
          }
        }
        
        console.log('BlackHole: Three.js版本', THREE.REVISION);
        
        // 等待Three.js扩展加载完成
        const extensionsLoaded = await loadThreeExtensions();
        if (!extensionsLoaded) {
          throw new Error('Failed to load Three.js extensions');
        }

      // 黑洞参数
      const BLACK_HOLE_RADIUS = 1.3;
      const DISK_INNER_RADIUS = BLACK_HOLE_RADIUS - 3; // 减小内半径，让吸积盘覆盖黑洞
      const DISK_OUTER_RADIUS = 8.0;
      const DISK_TILT_ANGLE = Math.PI / 3.0;

      // 创建场景
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x020104, 0.025);

      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        4000
      );
      camera.position.set(-6.5 + offsetX, 5.0, 6.5);

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance" 
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.setClearColor(0x000000, 0); // 透明背景
      container.appendChild(renderer.domElement);

      // 创建星空
      const createStarField = () => {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 8000; // 增加星星数量
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        const starTwinkle = new Float32Array(starCount);
        const starFieldRadius = 2000;
        
        const starPalette = [
          new THREE.Color(0x88aaff), new THREE.Color(0xffaaff), new THREE.Color(0xaaffff),
          new THREE.Color(0xffddaa), new THREE.Color(0xffeecc), new THREE.Color(0xffffff),
          new THREE.Color(0xff8888), new THREE.Color(0x88ff88), new THREE.Color(0xffff88),
          new THREE.Color(0x88ffff)
        ];

        for (let i = 0; i < starCount; i++) {
          const i3 = i * 3;
          const phi = Math.acos(-1 + (2 * i) / starCount);
          const theta = Math.sqrt(starCount * Math.PI) * phi;
          const radius = Math.cbrt(Math.random()) * starFieldRadius + 100;

          starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
          starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          starPositions[i3 + 2] = radius * Math.cos(phi);

          const starColor = starPalette[Math.floor(Math.random() * starPalette.length)].clone();
          starColor.multiplyScalar(Math.random() * 0.7 + 0.3);
          starColors[i3] = starColor.r;
          starColors[i3 + 1] = starColor.g;
          starColors[i3 + 2] = starColor.b;
          starSizes[i] = THREE.MathUtils.randFloat(0.6, 3.0);
          starTwinkle[i] = Math.random() * Math.PI * 2;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starGeometry.setAttribute('twinkle', new THREE.BufferAttribute(starTwinkle, 1));

        const starMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() }
          },
          vertexShader: `
            uniform float uTime;
            uniform float uPixelRatio;
            attribute float size;
            attribute float twinkle;
            varying vec3 vColor;
            varying float vTwinkle;
            
            void main() {
              vColor = color;
              vTwinkle = sin(uTime * 2.5 + twinkle) * 0.5 + 0.5;
              
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            varying float vTwinkle;
            
            void main() {
              float dist = distance(gl_PointCoord, vec2(0.5));
              if (dist > 0.5) discard;
              
              float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
              alpha *= (0.2 + vTwinkle * 0.8);
              
              gl_FragColor = vec4(vColor, alpha);
            }
          `,
          transparent: true,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        return new THREE.Points(starGeometry, starMaterial);
      };

      // 创建黑洞
      const createBlackHole = () => {
        const blackHoleGeom = new THREE.SphereGeometry(BLACK_HOLE_RADIUS, 64, 32);
        const blackHoleMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        return new THREE.Mesh(blackHoleGeom, blackHoleMat);
      };

      // 创建事件视界
      const createEventHorizon = () => {
        const eventHorizonGeom = new THREE.SphereGeometry(BLACK_HOLE_RADIUS * 1.05, 64, 32);
        const eventHorizonMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }
          },
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float uTime;
            varying vec3 vNormal;
            
            void main() {
              float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
              fresnel = pow(fresnel, 2.5);
              
              vec3 glowColor = vec3(1.0, 0.4, 0.1);
              float pulse = sin(uTime * 2.5) * 0.15 + 0.85;
              
              gl_FragColor = vec4(glowColor * fresnel * pulse, fresnel * 0.4);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        return new THREE.Mesh(eventHorizonGeom, eventHorizonMat);
      };

      // 创建吸积盘
      const createAccretionDisk = () => {
        const diskGeometry = new THREE.RingGeometry(DISK_INNER_RADIUS, DISK_OUTER_RADIUS, 256, 128);
        const diskMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0.0 },
            uColorHot: { value: new THREE.Color(0xffffff) },
            uColorMid1: { value: new THREE.Color(0xff7733) },
            uColorMid2: { value: new THREE.Color(0xff4477) },
            uColorMid3: { value: new THREE.Color(0x7744ff) },
            uColorOuter: { value: new THREE.Color(0x4477ff) },
            uNoiseScale: { value: 2.5 },
            uFlowSpeed: { value: 0.22 },
            uDensity: { value: 1.3 }
          },
          vertexShader: `
            varying vec2 vUv;
            varying float vRadius;
            varying float vAngle;
            void main() {
              vUv = uv;
              vRadius = length(position.xy);
              vAngle = atan(position.y, position.x);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float uTime;
            uniform vec3 uColorHot;
            uniform vec3 uColorMid1;
            uniform vec3 uColorMid2;
            uniform vec3 uColorMid3;
            uniform vec3 uColorOuter;
            uniform float uNoiseScale;
            uniform float uFlowSpeed;
            uniform float uDensity;

            varying vec2 vUv;
            varying float vRadius;
            varying float vAngle;

            // 简化的噪声函数
            float random(vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
              vec2 i = floor(st);
              vec2 f = fract(st);
              float a = random(i);
              float b = random(i + vec2(1.0, 0.0));
              float c = random(i + vec2(0.0, 1.0));
              float d = random(i + vec2(1.0, 1.0));
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
              float normalizedRadius = smoothstep(${DISK_INNER_RADIUS.toFixed(2)}, ${DISK_OUTER_RADIUS.toFixed(2)}, vRadius);
              
              float spiral = vAngle * 3.0 - (1.0 / (normalizedRadius + 0.1)) * 2.0;
              vec2 noiseUv = vec2(vUv.x + uTime * uFlowSpeed * (2.0 / (vRadius * 0.3 + 1.0)) + sin(spiral) * 0.1, vUv.y * 0.8 + cos(spiral) * 0.1);
              float noiseVal1 = noise(noiseUv * uNoiseScale);
              float noiseVal2 = noise(noiseUv * uNoiseScale * 3.0 + 0.8);
              float noiseVal3 = noise(noiseUv * uNoiseScale * 6.0 + 1.5);
              
              float noiseVal = (noiseVal1 * 0.45 + noiseVal2 * 0.35 + noiseVal3 * 0.2);
              
              vec3 color = uColorOuter;
              color = mix(color, uColorMid3, smoothstep(0.0, 0.25, normalizedRadius));
              color = mix(color, uColorMid2, smoothstep(0.2, 0.55, normalizedRadius));
              color = mix(color, uColorMid1, smoothstep(0.5, 0.75, normalizedRadius));
              color = mix(color, uColorHot, smoothstep(0.7, 0.95, normalizedRadius));
              
              color *= (0.5 + noiseVal * 1.0);
              float brightness = pow(1.0 - normalizedRadius, 1.0) * 3.5 + 0.5;
              brightness *= (0.3 + noiseVal * 2.2);
              
              float pulse = sin(uTime * 1.8 + normalizedRadius * 12.0 + vAngle * 2.0) * 0.15 + 0.85;
              brightness *= pulse;
              
              float alpha = uDensity * (0.2 + noiseVal * 0.9);
              alpha *= smoothstep(0.0, 0.15, normalizedRadius);
              alpha *= (1.0 - smoothstep(0.85, 1.0, normalizedRadius));
              alpha = clamp(alpha, 0.0, 1.0);

              gl_FragColor = vec4(color * brightness, alpha);
            }
          `,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });

        const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
        accretionDisk.rotation.x = DISK_TILT_ANGLE;
        accretionDisk.renderOrder = 1;
        return accretionDisk;
      };

      // 添加对象到场景
      const stars = createStarField();
      let blackHole: THREE.Mesh | undefined;
      let eventHorizon: THREE.Mesh | undefined;
      let accretionDisk: THREE.Mesh | undefined;
      if (!starsOnly) {
        blackHole = createBlackHole();
        eventHorizon = createEventHorizon();
        accretionDisk = createAccretionDisk();
        scene.add(blackHole);
        scene.add(eventHorizon);
        scene.add(accretionDisk);
      }
      scene.add(stars);

      // 设置后处理效果
      let composer: any;
      let bloomPass: any;
      let lensingPass: any;
      
      const setupPostProcessing = () => {
        if (EffectComposer && RenderPass && UnrealBloomPass && ShaderPass) {
          composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
          
          bloomPass = new UnrealBloomPass(
            new THREE.Vector2(container.clientWidth, container.clientHeight),
            0.8, 0.7, 0.8
          );
          composer.addPass(bloomPass);

          if (!starsOnly) {
            // 引力透镜效果
            const lensingShader = {
              uniforms: {
                "tDiffuse": { value: null },
                "blackHoleScreenPos": { value: new THREE.Vector2(5.5, 0.5) },
                "lensingStrength": { value: 0.12 },
                "lensingRadius": { value: 0.3 },
                "aspectRatio": { value: container.clientWidth / container.clientHeight },
                "chromaticAberration": { value: 0.005 }
              },
              vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
              fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 blackHoleScreenPos;
                uniform float lensingStrength;
                uniform float lensingRadius;
                uniform float aspectRatio;
                uniform float chromaticAberration;
                varying vec2 vUv;
                
                void main() {
                  vec2 screenPos = vUv;
                  vec2 toCenter = screenPos - blackHoleScreenPos;
                  toCenter.x *= aspectRatio;
                  float dist = length(toCenter);
                  
                  float distortionAmount = lensingStrength / (dist * dist + 0.003);
                  distortionAmount = clamp(distortionAmount, 0.0, 0.7);
                  float falloff = smoothstep(lensingRadius, lensingRadius * 0.3, dist);
                  distortionAmount *= falloff;
                  
                  vec2 offset = normalize(toCenter) * distortionAmount;
                  offset.x /= aspectRatio;
                  
                  vec2 distortedUvR = screenPos - offset * (1.0 + chromaticAberration);
                  vec2 distortedUvG = screenPos - offset;
                  vec2 distortedUvB = screenPos - offset * (1.0 - chromaticAberration);
                  
                  float r = texture2D(tDiffuse, distortedUvR).r;
                  float g = texture2D(tDiffuse, distortedUvG).g;
                  float b = texture2D(tDiffuse, distortedUvB).b;
                  
                  gl_FragColor = vec4(r, g, b, 1.0);
                }`
            };
            lensingPass = new ShaderPass(lensingShader);
            composer.addPass(lensingPass);
          }
        }
      };

      // 延迟设置后处理，等待模块加载
      setTimeout(setupPostProcessing, 100);

      // 交互状态
      let isMouseOver = false;
      let autoRotateEnabled = false;
      let timeScale = 1.0;
      let bloomIntensity = 0.8;
      
      // 轨道控制器
      let controls: any;
      const setupControls = () => {
        // 只有在非仅星空模式时才启用交互控制
        if (OrbitControls && !starsOnly) {
          controls = new OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.035;
          controls.rotateSpeed = 0.4;
          controls.autoRotate = autoRotateEnabled;
          controls.autoRotateSpeed = 0.1;
          controls.target.set(0, 0, 0);
          controls.minDistance = 2.5;
          controls.maxDistance = 100;
          controls.enablePan = false;
          controls.enableRotate = true; // 确保启用旋转
          controls.enableZoom = true;   // 确保启用缩放
          controls.update();
        }
      };
      
      // 鼠标交互事件 - 只在非仅星空模式时处理
      const handleMouseEnter = () => {
        if (starsOnly) return;
        isMouseOver = true;
        if (container) {
          container.style.cursor = 'grab';
        }
      };
      
      const handleMouseLeave = () => {
        if (starsOnly) return;
        isMouseOver = false;
        if (container) {
          container.style.cursor = 'default';
        }
      };
      
      const handleMouseDown = () => {
        if (starsOnly) return;
        if (container) {
          container.style.cursor = 'grabbing';
        }
      };
      
      const handleMouseUp = () => {
        if (starsOnly) return;
        if (container) {
          container.style.cursor = isMouseOver ? 'grab' : 'default';
        }
      };
      
      // 重置到默认状态 - 只在非仅星空模式时执行
      const resetToDefaults = () => {
        if (starsOnly) return;
        autoRotateEnabled = true;
        timeScale = 1.0;
        bloomIntensity = 1.5;
        
        if (controls) {
          controls.autoRotate = autoRotateEnabled;
          controls.reset();
        }
        
        if (bloomPass) {
          bloomPass.strength = bloomIntensity;
        }
        
        // 重置相机位置
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
      };

      // 键盘交互事件 - 只在非仅星空模式时处理
      const handleKeyDown = (event: KeyboardEvent) => {
        if (starsOnly) return;
        
        switch(event.key.toLowerCase()) {
          case 'r': // 切换自动旋转
            autoRotateEnabled = !autoRotateEnabled;
            if (controls) {
              controls.autoRotate = autoRotateEnabled;
            }
            break;
          case 'arrowup': // 增加时间速度
            timeScale = Math.min(timeScale + 0.2, 3.0);
            event.preventDefault();
            break;
          case 'arrowdown': // 减少时间速度
            timeScale = Math.max(timeScale - 0.2, 0.1);
            event.preventDefault();
            break;
          case '+':
          case '=': // 增加辉光强度
            bloomIntensity = Math.min(bloomIntensity + 0.1, 2.0);
            if (bloomPass) {
              bloomPass.strength = bloomIntensity;
            }
            break;
          case '-': // 减少辉光强度
            bloomIntensity = Math.max(bloomIntensity - 0.1, 0.0);
            if (bloomPass) {
              bloomPass.strength = bloomIntensity;
            }
            break;
          case ' ': // 空格键暂停/恢复
            timeScale = timeScale > 0 ? 0 : 1.0;
            event.preventDefault();
            break;
          case 'escape': // ESC键重置到默认状态
            resetToDefaults();
            event.preventDefault();
            break;
        }
      };

      setTimeout(setupControls, 100);
      
      // 添加事件监听器 - 只在非仅星空模式时添加
      if (!starsOnly) {
        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
      }

      // 动画循环
      const clock = new THREE.Clock();
      const blackHoleScreenPosVec3 = new THREE.Vector3();
      
      const animate = () => {
        const elapsedTime = clock.getElapsedTime() * timeScale;
        const deltaTime = clock.getDelta() * timeScale;

        // 更新shader uniforms
        if (stars.material instanceof THREE.ShaderMaterial && stars.material.uniforms.uTime) {
          stars.material.uniforms.uTime.value = elapsedTime;
        }
        if (!starsOnly && blackHole && eventHorizon && accretionDisk) {
          if (eventHorizon.material instanceof THREE.ShaderMaterial) {
            if (eventHorizon.material.uniforms.uTime) {
              eventHorizon.material.uniforms.uTime.value = elapsedTime;
            }
            if (eventHorizon.material.uniforms.uCameraPosition) {
              eventHorizon.material.uniforms.uCameraPosition.value.copy(camera.position);
            }
          }
          if (accretionDisk.material instanceof THREE.ShaderMaterial && accretionDisk.material.uniforms.uTime) {
            accretionDisk.material.uniforms.uTime.value = elapsedTime;
          }

          // 更新引力透镜效果
          if (lensingPass && lensingPass.uniforms && lensingPass.uniforms.blackHoleScreenPos) {
            blackHoleScreenPosVec3.copy(blackHole!.position).project(camera);
            lensingPass.uniforms.blackHoleScreenPos.value.set(
              (blackHoleScreenPosVec3.x + 1) / 2,
              (blackHoleScreenPosVec3.y + 1) / 2
            );
          }

          // 吸积盘旋转
          accretionDisk!.rotation.z += deltaTime * 0.005;
        }

        // 更新控制器
        if (controls) {
          controls.update();
        }

        // 星空旋转
        stars.rotation.y += deltaTime * 0.003;
        stars.rotation.x += deltaTime * 0.001;

        // 渲染
        if (composer) {
          composer.render(deltaTime);
        } else {
          renderer.render(scene, camera);
        }
        
        sceneRef.current.animationId = requestAnimationFrame(animate);
      };

      animate();

      // 窗口大小调整
      let resizeTimeout: NodeJS.Timeout;
      const handleResize = () => {
        if (!container) return;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
          if (composer) {
            composer.setSize(container.clientWidth, container.clientHeight);
          }
          if (bloomPass) {
            bloomPass.resolution.set(container.clientWidth, container.clientHeight);
          }
          if (lensingPass && lensingPass.uniforms && lensingPass.uniforms.aspectRatio) {
            lensingPass.uniforms.aspectRatio.value = container.clientWidth / container.clientHeight;
          }
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        }, 150);
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
          if (!starsOnly) {
            window.removeEventListener('keydown', handleKeyDown);
            if (container) {
              container.removeEventListener('mouseenter', handleMouseEnter);
              container.removeEventListener('mouseleave', handleMouseLeave);
              container.removeEventListener('mousedown', handleMouseDown);
              container.removeEventListener('mouseup', handleMouseUp);
            }
          }
          if (controls) {
            controls.dispose();
          }
          if (composer) {
            composer.dispose();
          }
          if (container && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
          renderer.dispose();
        }
      };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('BlackHole: Three.js初始化失败', {
          message: err.message,
          stack: err.stack,
          containerSize: containerRef.current ? {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          } : null,
          webglSupport: (() => {
            try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch {
              return false;
            }
          })()
        });
        
        setHasError(true);
        setErrorMessage(`Three.js初始化失败: ${err.message}`);
      }
    };

    initThreeJS();

    return () => {
      if (sceneRef.current.cleanup) {
        sceneRef.current.cleanup();
      }
    };
  }, [offsetX]);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
      style={{ 
        background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #000002 70%)',
        width: '100%',
        height: '100%',
        pointerEvents: starsOnly ? 'none' : 'auto' // 星空模式禁用鼠标事件
      }}
    >
      
      {/* 错误信息显示 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/20 to-purple-900/20">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-red-400 font-semibold mb-2">黑洞动画加载失败</h3>
            <p className="text-gray-300 text-sm mb-4">{errorMessage}</p>
            <p className="text-gray-400 text-xs">正在显示CSS后备动画</p>
          </div>
        </div>
      )}
    </div>
  );
}