
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData, ScreenPosition } from '../types';
import { CONFIG } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  
  // Track which voxels are currently moving to their target
  private activeRebuildIndices: Set<number> = new Set();
  private rejectingIndices: Set<number> = new Set();
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private animationId: number = 0;

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(30, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.set(0, 10, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Floor
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = CONFIG.FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    this.activeRebuildIndices.clear();
    this.rejectingIndices.clear();
    this.rebuildTargets = [];
    
    // Calculate bounding box to center camera
    let minY = Infinity, maxY = -Infinity;
    if (data.length > 0) {
        data.forEach(d => {
            if (d.y < minY) minY = d.y;
            if (d.y > maxY) maxY = d.y;
        });
        const centerY = (minY + maxY) / 2;
        this.controls.target.set(0, centerY, 0);
    }
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        // Slight color variance for texture
        c.offsetHSL(0, 0, (Math.random() * 0.05) - 0.025);
        
        return {
            id: i,
            x: v.x, y: v.y, z: v.z,
            originalX: v.x, originalY: v.y, originalZ: v.z,
            color: c,
            stepIndex: v.stepIndex !== undefined ? v.stepIndex : -1,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0
        };
    });

    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate = true;
  }

  public dismantle() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.activeRebuildIndices.clear();
    this.rejectingIndices.clear();

    // Prepare rebuild targets from ORIGINAL positions
    this.rebuildTargets = this.voxels.map(v => ({
        x: v.originalX, y: v.originalY, z: v.originalZ,
        delay: 0,
        isRubble: false
    }));

    this.voxels.forEach(v => {
        // Explode outward slightly
        v.vx = (Math.random() - 0.5) * 2;
        v.vy = Math.random() * 1.5 + 0.5; // Upward pop
        v.vz = (Math.random() - 0.5) * 2;
        
        v.rvx = (Math.random() - 0.5) * 0.4;
        v.rvy = (Math.random() - 0.5) * 0.4;
        v.rvz = (Math.random() - 0.5) * 0.4;
    });
  }

  public rebuildLayer(stepIndex: number) {
      // FORCE STATE CHANGE to wake up physics
      this.state = AppState.INTERACTIVE_REBUILD;
      this.onStateChange(this.state);

      let found = 0;
      this.voxels.forEach((v, i) => {
          if (v.stepIndex === stepIndex) {
              this.activeRebuildIndices.add(i);
              this.rejectingIndices.delete(i);
              found++;
          }
      });
      console.log(`Rebuilding step ${stepIndex}, found ${found} voxels`);
      return found > 0;
  }

  public rejectLayer(stepIndex: number) {
     this.state = AppState.REJECTING;
     this.onStateChange(this.state);
     
     this.voxels.forEach((v, i) => {
         if (v.stepIndex === stepIndex) {
             this.rejectingIndices.add(i);
             // Jiggle
             v.vy = 0.5;
             v.vx = (Math.random() - 0.5) * 0.5;
             v.vz = (Math.random() - 0.5) * 0.5;
         }
     });

     setTimeout(() => {
         // Return to manual rebuild state after rejection animation
         if (this.state === AppState.REJECTING) {
             this.state = AppState.INTERACTIVE_REBUILD;
             this.onStateChange(this.state);
             this.rejectingIndices.clear();
         }
     }, 800);
  }
  
  public getStepCentroids(stepCount: number): ScreenPosition[] {
      const centroids: ScreenPosition[] = [];
      const sums: {[key: number]: {x: number, y: number, z: number, count: number}} = {};
      
      this.voxels.forEach(v => {
          if (v.stepIndex >= 0) {
              if (!sums[v.stepIndex]) sums[v.stepIndex] = {x:0, y:0, z:0, count:0};
              sums[v.stepIndex].x += v.x;
              sums[v.stepIndex].y += v.y;
              sums[v.stepIndex].z += v.z;
              sums[v.stepIndex].count++;
          }
      });

      for (let i = 0; i < stepCount; i++) {
          if (sums[i] && sums[i].count > 0) {
              const cx = sums[i].x / sums[i].count;
              const cy = sums[i].y / sums[i].count;
              const cz = sums[i].z / sums[i].count;
              
              const vec = new THREE.Vector3(cx, cy, cz);
              vec.project(this.camera);
              
              const x = (vec.x * .5 + .5) * this.container.clientWidth;
              const y = (-(vec.y * .5) + .5) * this.container.clientHeight;
              const isVisible = vec.z < 1 && Math.abs(vec.x) < 1.1 && Math.abs(vec.y) < 1.1;

              centroids.push({ x, y, visible: isVisible });
          } else {
              centroids.push({ x: 0, y: 0, visible: false });
          }
      }
      return centroids;
  }

  private updatePhysics() {
    // Stop physics if everything is stable to save battery
    // CRITICAL: rebuildLayer sets state to INTERACTIVE_REBUILD so this condition is false, allowing physics to run.
    if (this.state === AppState.STABLE) return;

    // 1. Rubble Physics (For pieces NOT active)
    this.voxels.forEach((v, i) => {
        const isActive = this.activeRebuildIndices.has(i);
        const isRejecting = this.rejectingIndices.has(i);

        if (!isActive && !isRejecting) {
             // Gravity
             v.vy -= 0.04; 
             v.x += v.vx; v.y += v.vy; v.z += v.vz;
             v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;
             
             // Friction
             v.vx *= 0.98; v.vz *= 0.98; v.vy *= 0.99;

             // Floor collision
             if (v.y < CONFIG.FLOOR_Y + 0.5) {
                 v.y = CONFIG.FLOOR_Y + 0.5;
                 v.vy *= -0.5; // Bounce
                 v.vx *= 0.8; 
                 v.vz *= 0.8;
                 v.rvx *= 0.8; v.rvy *= 0.8; v.rvz *= 0.8;
                 
                 if (Math.abs(v.vy) < 0.1) v.vy = 0;
             }
        }
    });

    // 2. Rebuild Physics (Flying to target)
    let movingCount = 0;
    // We check for both INTERACTIVE and REJECTING because rejected pieces still need gravity,
    // but active pieces need to fly.
    if (this.state === AppState.INTERACTIVE_REBUILD || this.state === AppState.REJECTING) {
        this.activeRebuildIndices.forEach(i => {
            const v = this.voxels[i];
            const t = this.rebuildTargets[i] || { x: v.originalX, y: v.originalY, z: v.originalZ };

            const dx = t.x - v.x;
            const dy = t.y - v.y;
            const dz = t.z - v.z;
            const distSq = dx*dx + dy*dy + dz*dz;

            if (distSq > 0.05) {
                movingCount++;
                const speed = 0.12;
                v.x += dx * speed;
                v.y += dy * speed;
                v.z += dz * speed;
                
                v.rx += (0 - v.rx) * speed;
                v.ry += (0 - v.ry) * speed;
                v.rz += (0 - v.rz) * speed;
            } else {
                // Snap to grid
                if (v.x !== t.x) {
                    v.x = t.x; v.y = t.y; v.z = t.z;
                    v.rx = 0; v.ry = 0; v.rz = 0;
                    // Visual pulse when landing
                    // We could scale it here if we had scale in voxel data, but for now we just snap.
                }
            }
        });
    }
    
    // Check if fully rebuilt logic could go here, but we rely on UI interaction.

    // 3. Rejecting Physics (Bounce)
    if (this.state === AppState.REJECTING) {
        this.rejectingIndices.forEach(i => {
            const v = this.voxels[i];
            v.vy -= 0.04;
            v.x += v.vx; v.y += v.vy; v.z += v.vz;
             if (v.y < CONFIG.FLOOR_Y + 0.5) {
                 v.y = CONFIG.FLOOR_Y + 0.5;
                 v.vy *= -0.4;
             }
        });
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    this.draw();
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public getJsonData(): string {
      return JSON.stringify(this.voxels.map(v => ({
          x: v.x, y: v.y, z: v.z, color: '#' + v.color.getHexString(), stepIndex: v.stepIndex
      })));
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
