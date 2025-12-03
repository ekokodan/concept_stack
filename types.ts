
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';

export enum AppState {
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING',
  REBUILDING = 'REBUILDING',
  INTERACTIVE_REBUILD = 'INTERACTIVE_REBUILD', // New state for manual stacking
  REJECTING = 'REJECTING' // Animation for wrong answers
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
  stepIndex?: number; // Links voxel to a specific lesson step
}

export interface SimulationVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  stepIndex: number; // -1 for decoration/rubble, 0..N for steps
  
  // Original positions for rebuilding
  originalX: number;
  originalY: number;
  originalZ: number;

  // Physics state
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
}

export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

export interface SavedModel {
  name: string;
  data: VoxelData[];
  baseModel?: string;
  steps?: LessonStep[];
}

export interface LessonStep {
    text: string;
    color: string; // Hex string
}

export interface ScreenPosition {
    x: number;
    y: number;
    visible: boolean;
}
