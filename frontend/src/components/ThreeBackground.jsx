import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 16;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xeedfc4, 1.15);
    directional.position.set(4, 6, 8);
    scene.add(directional);

    const materialA = new THREE.MeshStandardMaterial({
      color: '#c7ddaf',
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    const materialB = new THREE.MeshStandardMaterial({
      color: '#e4c6a8',
      roughness: 0.25,
      metalness: 0.08,
      transparent: true,
      opacity: 0.52,
    });

    const spheres = [
      new THREE.Mesh(new THREE.SphereGeometry(2.2, 48, 48), materialA),
      new THREE.Mesh(new THREE.SphereGeometry(1.5, 40, 40), materialB),
      new THREE.Mesh(new THREE.SphereGeometry(1.05, 34, 34), materialA),
    ];

    spheres[0].position.set(-5.5, 2.5, -1);
    spheres[1].position.set(5.4, -1.8, -2);
    spheres[2].position.set(2.6, 3.2, -1.5);

    spheres.forEach((sphere) => scene.add(sphere));

    const timer = typeof THREE.Timer === 'function' ? new THREE.Timer() : null;
    if (timer && typeof timer.connect === 'function') {
      timer.connect(document);
    }
    let frameId;

    const animate = () => {
      let t = performance.now() * 0.001;
      if (timer && typeof timer.update === 'function' && typeof timer.getElapsed === 'function') {
        timer.update();
        t = timer.getElapsed();
      }
      spheres[0].position.y = 2.5 + Math.sin(t * 0.45) * 0.55;
      spheres[1].position.x = 5.4 + Math.cos(t * 0.38) * 0.45;
      spheres[2].position.y = 3.2 + Math.sin(t * 0.62) * 0.4;

      spheres[0].rotation.y += 0.0014;
      spheres[1].rotation.x += 0.0012;
      spheres[2].rotation.z += 0.0016;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      if (!mount) {
        return;
      }
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.cancelAnimationFrame(frameId);
      if (timer && typeof timer.dispose === 'function') {
        timer.dispose();
      }
      renderer.dispose();
      spheres.forEach((sphere) => {
        sphere.geometry.dispose();
      });
      materialA.dispose();
      materialB.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 -z-10 opacity-80" aria-hidden="true" />;
}

export default ThreeBackground;
