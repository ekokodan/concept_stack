
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { VoxelData, LessonStep } from '../types';
import { COLORS, CONFIG } from './voxelConstants';

// Helper to prevent overlapping voxels
function setBlock(map: Map<string, VoxelData>, x: number, y: number, z: number, color: number, stepIndex: number = -1) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const key = `${rx},${ry},${rz}`;
    map.set(key, { x: rx, y: ry, z: rz, color, stepIndex });
}

// Helper to safely parse color from step
function getSafeColor(colorStr: string): number {
    try {
        if (!colorStr) return 0xCCCCCC;
        let c = colorStr;
        if (c.startsWith('#')) c = c.substring(1);
        const parsed = parseInt(c, 16);
        return isNaN(parsed) ? 0xCCCCCC : parsed;
    } catch {
        return 0xCCCCCC;
    }
}

function generateSphere(map: Map<string, VoxelData>, cx: number, cy: number, cz: number, r: number, col: number, sy = 1) {
    const r2 = r * r;
    const xMin = Math.floor(cx - r);
    const xMax = Math.ceil(cx + r);
    const yMin = Math.floor(cy - r * sy);
    const yMax = Math.ceil(cy + r * sy);
    const zMin = Math.floor(cz - r);
    const zMax = Math.ceil(cz + r);

    for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
            for (let z = zMin; z <= zMax; z++) {
                const dx = x - cx;
                const dy = (y - cy) / sy;
                const dz = z - cz;
                if (dx * dx + dy * dy + dz * dz <= r2) {
                    setBlock(map, x, y, z, col);
                }
            }
        }
    }
}

export const Generators = {
    Eagle: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        // Branch
        for (let x = -8; x < 8; x++) {
            const y = Math.sin(x * 0.2) * 1.5;
            const z = Math.cos(x * 0.1) * 1.5;
            generateSphere(map, x, y, z, 1.8, COLORS.WOOD);
            if (Math.random() > 0.7) generateSphere(map, x, y + 2, z + (Math.random() - 0.5) * 3, 1.5, COLORS.GREEN);
        }
        // Body
        const EX = 0, EY = 2, EZ = 2;
        generateSphere(map, EX, EY + 6, EZ, 4.5, COLORS.DARK, 1.4);
        // Chest
        for (let x = EX - 2; x <= EX + 2; x++) for (let y = EY + 4; y <= EY + 9; y++) setBlock(map, x, y, EZ + 3, COLORS.LIGHT);
        // Wings (Rough approximation)
        for (let x of [-4, -3, 3, 4]) for (let y = EY + 4; y <= EY + 10; y++) for (let z = EZ - 2; z <= EZ + 3; z++) setBlock(map, x, y, z, COLORS.DARK);
        // Tail
        for (let x = EX - 2; x <= EX + 2; x++) for (let y = EY; y <= EY + 4; y++) for (let z = EZ - 5; z <= EZ - 3; z++) setBlock(map, x, y, z, COLORS.WHITE);
        // Head
        const HY = EY + 12, HZ = EZ + 1;
        generateSphere(map, EX, HY, HZ, 2.8, COLORS.WHITE);
        generateSphere(map, EX, HY - 2, HZ, 2.5, COLORS.WHITE);
        // Talons
        [[-2, 0], [-2, 1], [2, 0], [2, 1]].forEach(o => setBlock(map, EX + o[0], EY + o[1], EZ, COLORS.TALON));
        // Beak
        [[0, 1], [0, 2], [1, 1], [-1, 1]].forEach(o => setBlock(map, EX + o[0], HY, HZ + 2 + o[1], COLORS.GOLD));
        setBlock(map, EX, HY - 1, HZ + 3, COLORS.GOLD);
        // Eyes
        [[-1.5, COLORS.BLACK], [1.5, COLORS.BLACK]].forEach(o => setBlock(map, EX + o[0], HY + 0.5, HZ + 1.5, o[1]));
        [[-1.5, COLORS.WHITE], [1.5, COLORS.WHITE]].forEach(o => setBlock(map, EX + o[0], HY + 1.5, HZ + 1.5, o[1]));

        return Array.from(map.values());
    },
};

// New Procedural Templates for Educational Stacks
export const Templates = {
    Pyramid: (steps: LessonStep[]): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const layerHeight = 3;
        const totalSteps = Math.max(1, steps.length);
        const baseRadius = Math.max(3, totalSteps + 1);
        
        steps.forEach((step, index) => {
            const colorInt = getSafeColor(step.color);
            const yStart = index * layerHeight;
            
            // Taper factor
            const progress = index / totalSteps;
            const radius = Math.max(1, Math.round(baseRadius * (1 - progress * 0.8)));

            for (let y = 0; y < layerHeight; y++) {
                const currentY = yStart + y + CONFIG.FLOOR_Y + 1;
                const r = Math.max(1, radius - (y > 1 ? 1 : 0)); // Slight internal taper
                
                for (let x = -r; x <= r; x++) {
                    for (let z = -r; z <= r; z++) {
                        setBlock(map, x, currentY, z, colorInt, index);
                    }
                }
            }
        });
        return Array.from(map.values());
    },

    Tower: (steps: LessonStep[]): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const layerHeight = 3;
        const radius = 4;
        
        steps.forEach((step, index) => {
            const colorInt = getSafeColor(step.color);
            const yStart = index * layerHeight;
            
            for (let y = 0; y < layerHeight; y++) {
                const currentY = yStart + y + CONFIG.FLOOR_Y + 1;
                
                // Cylinder
                for (let x = -radius; x <= radius; x++) {
                    for (let z = -radius; z <= radius; z++) {
                         if (x*x + z*z <= radius*radius) {
                             setBlock(map, x, currentY, z, colorInt, index);
                         }
                    }
                }
            }
        });
        return Array.from(map.values());
    },

    Spiral: (steps: LessonStep[]): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const layerHeight = 3; 
        
        steps.forEach((step, index) => {
            const colorInt = getSafeColor(step.color);
            const yBase = index * layerHeight + CONFIG.FLOOR_Y + 1;
            const angleOffset = index * (Math.PI / 3); // 60 deg rotation per step
            
            for (let y = 0; y < layerHeight; y++) {
                const currentY = yBase + y;
                
                // Central pillar
                for(let x=-2; x<=2; x++) for(let z=-2; z<=2; z++) setBlock(map, x, currentY, z, COLORS.DARK, index);

                // Arm
                const armLength = 7;
                const width = 3;
                
                for (let d = 2; d < armLength; d++) {
                    for (let w = -width/2; w <= width/2; w++) {
                        // Rotate point (d, w)
                        const rx = Math.round(d * Math.cos(angleOffset) - w * Math.sin(angleOffset));
                        const rz = Math.round(d * Math.sin(angleOffset) + w * Math.cos(angleOffset));
                        
                        setBlock(map, rx, currentY, rz, colorInt, index);
                    }
                }
            }
        });
        return Array.from(map.values());
    }
};
