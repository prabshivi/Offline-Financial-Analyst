import * as THREE from 'three';

/**
 * Procedurally generates realistic textures for the 3D Golden Retriever model.
 * These run in-memory on HTML5 Canvas without requiring external image assets.
 */

// Generate realistic Golden Retriever fur texture with directional strands
export function generateFurTexture(
  baseHex = '#E5A038',
  highlightHex = '#FCD34D',
  shadowHex = '#B45309',
  creamHex = '#FEF3C7'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.5, highlightHex);
  grad.addColorStop(1, shadowHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Layer fine fur strands
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 8 + Math.random() * 16;
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4; // Directional combing

    const colorRoll = Math.random();
    if (colorRoll < 0.45) {
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.15 + Math.random() * 0.25})`; // Golden
    } else if (colorRoll < 0.75) {
      ctx.strokeStyle = `rgba(254, 243, 199, ${0.12 + Math.random() * 0.2})`; // Cream highlight
    } else {
      ctx.strokeStyle = `rgba(180, 83, 9, ${0.1 + Math.random() * 0.2})`; // Dark amber shadow
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * (len * 0.5) + (Math.random() - 0.5) * 4,
      y + Math.sin(angle) * (len * 0.5),
      x + Math.cos(angle) * len,
      y + Math.sin(angle) * len
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate fur bump map for realistic anisotropic light catching
export function generateFurBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  ctx.lineWidth = 1;
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 6 + Math.random() * 12;
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3;

    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

// Generate realistic wet leather dog nose texture
export function generateNoseTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bumpCtx = bumpCanvas.getContext('2d');

  if (ctx && bumpCtx) {
    // Charcoal black with subtle warm undertone
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, 256, 256);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, 256, 256);

    // Leather cobblestone pore pattern
    for (let x = 0; x < 256; x += 6) {
      for (let y = 0; y < 256; y += 6) {
        const ox = (Math.random() - 0.5) * 3;
        const oy = (Math.random() - 0.5) * 3;
        const radius = 1.8 + Math.random() * 1.5;

        // Color map: subtle wet sheen highlights
        ctx.fillStyle = Math.random() > 0.6 ? '#27272A' : '#09090B';
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Bump map: distinct pebbles
        bumpCtx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#333333';
        bumpCtx.beginPath();
        bumpCtx.arc(x + ox, y + oy, radius, 0, Math.PI * 2);
        bumpCtx.fill();
      }
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  const bump = new THREE.CanvasTexture(bumpCanvas);
  return { map, bump };
}

// Generate realistic canine eye texture (Warm Hazel / Dark Amber with pupil & limbal ring)
export function generateCanineEyeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 128;
  const cy = 128;

  // White sclera base with slight vascular warmth
  ctx.fillStyle = '#F4EFEB';
  ctx.fillRect(0, 0, 256, 256);

  // Dark limbal ring
  const irisRadius = 90;
  ctx.fillStyle = '#1A0D00';
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius + 4, 0, Math.PI * 2);
  ctx.fill();

  // Amber / Golden Brown Iris Gradient
  const irisGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, irisRadius);
  irisGrad.addColorStop(0, '#5A2E05');
  irisGrad.addColorStop(0.35, '#8C4808');
  irisGrad.addColorStop(0.7, '#6E3406');
  irisGrad.addColorStop(1, '#241002');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
  ctx.fill();

  // Iris radial striations
  ctx.lineWidth = 1.2;
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    const r1 = 30 + Math.random() * 10;
    const r2 = irisRadius - Math.random() * 6;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(217, 119, 6, 0.4)' : 'rgba(254, 215, 170, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // Deep Black Pupil
  const pupilRadius = 38;
  ctx.fillStyle = '#050201';
  ctx.beginPath();
  ctx.arc(cx, cy, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // Natural corneal gloss reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(cx - 18, cy - 20, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(cx + 14, cy + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

// Generate realistic textured tongue
export function generateTongueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Soft organic pink gradient
  const grad = ctx.createLinearGradient(0, 0, 128, 256);
  grad.addColorStop(0, '#E11D48'); // Deep rose base
  grad.addColorStop(0.6, '#FB7185'); // Warm pink mid
  grad.addColorStop(1, '#FDA4AF'); // Soft tip
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  // Central sulcus (groove)
  ctx.strokeStyle = 'rgba(190, 18, 60, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 10);
  ctx.lineTo(64, 230);
  ctx.stroke();

  // Papillae texture dots
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(159, 18, 57, 0.2)';
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// Generate stitched leather collar texture
export function generateCollarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Rich turquoise bridle leather
  ctx.fillStyle = '#0891B2';
  ctx.fillRect(0, 0, 256, 64);

  // Subtle leather shading
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 64);

  // White contrast saddle stitching
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  // Top stitch line
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(256, 8);
  ctx.stroke();

  // Bottom stitch line
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(256, 56);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}
