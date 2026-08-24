const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { GifWriter } = require('omggif');

function saveToAll(relPath, buffer) {
  const targetDirs = [
    path.join(__dirname, 'public'),
    path.join(__dirname, '../assets'),
    path.join(__dirname, '../web/assets'),
  ];
  for (const td of targetDirs) {
    const full = path.join(td, relPath);
    const parent = path.dirname(full);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(full, buffer);
  }
}

// -----------------------------------------------------------------------------
// PART 1: HIGH-RES MINIMALIST REWARD PNGs (256 x 256)
// -----------------------------------------------------------------------------

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  const alpha = a / 255;
  const invA = 1 - alpha;
  png.data[idx] = Math.round(r * alpha + png.data[idx] * invA);
  png.data[idx + 1] = Math.round(g * alpha + png.data[idx + 1] * invA);
  png.data[idx + 2] = Math.round(b * alpha + png.data[idx + 2] * invA);
  png.data[idx + 3] = Math.min(255, png.data[idx + 3] + a);
}

function drawAALine(png, x0, y0, x1, y1, r, g, b, a = 255, thickness = 2) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;

  for (let l = 0; l <= len; l += 0.5) {
    const cx = x0 + ux * l, cy = y0 + uy * l;
    for (let t = -thickness / 2; t <= thickness / 2; t += 0.5) {
      const px = Math.round(cx + nx * t);
      const py = Math.round(cy + ny * t);
      const dist = Math.abs(t) / (thickness / 2);
      const alpha = Math.round(a * Math.max(0, 1 - dist * dist));
      setPixel(png, px, py, r, g, b, alpha);
    }
  }
}

function drawAACircle(png, cx, cy, radius, r, g, b, a = 255, fill = true, strokeWidth = 2) {
  const minX = Math.max(0, Math.floor(cx - radius - strokeWidth));
  const maxX = Math.min(png.width - 1, Math.ceil(cx + radius + strokeWidth));
  const minY = Math.max(0, Math.floor(cy - radius - strokeWidth));
  const maxY = Math.min(png.height - 1, Math.ceil(cy + radius + strokeWidth));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (fill) {
        if (dist <= radius) {
          const edgeAlpha = Math.min(1, radius - dist + 0.5);
          setPixel(png, x, y, r, g, b, Math.round(a * edgeAlpha));
        }
      } else {
        const ringDist = Math.abs(dist - radius);
        if (ringDist <= strokeWidth / 2 + 0.5) {
          const edgeAlpha = Math.max(0, 1 - ringDist / (strokeWidth / 2 + 0.5));
          setPixel(png, x, y, r, g, b, Math.round(a * edgeAlpha));
        }
      }
    }
  }
}

function drawAARect(png, x0, y0, w, h, radius, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      let inside = true;
      if (radius > 0) {
        const inCornerL = x < x0 + radius;
        const inCornerR = x >= x0 + w - radius;
        const inCornerT = y < y0 + radius;
        const inCornerB = y >= y0 + h - radius;
        if ((inCornerL || inCornerR) && (inCornerT || inCornerB)) {
          const cx = inCornerL ? x0 + radius : x0 + w - radius;
          const cy = inCornerT ? y0 + radius : y0 + h - radius;
          if (Math.hypot(x - cx, y - cy) > radius) inside = false;
        }
      }
      if (inside) setPixel(png, x, y, r, g, b, a);
    }
  }
}

// Background Card Frame for Rewards
function createRewardBase(badgeText, badgeBgR, badgeBgG, badgeBgB, accentR, accentG, accentB) {
  const png = new PNG({ width: 256, height: 256 });
  // Base dark gradient
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const ratio = y / 256;
      const r = Math.round(10 + 5 * ratio);
      const g = Math.round(20 + 25 * (1 - ratio));
      const b = Math.round(25 + 15 * ratio);
      setPixel(png, x, y, r, g, b, 255);
    }
  }

  // Rounded outer border
  drawAARect(png, 8, 8, 240, 240, 28, 20, 32, 45, 255);
  drawAARect(png, 10, 10, 236, 236, 26, 12, 22, 30, 255);

  // Subtle Glowing center circle
  for (let y = 20; y < 236; y++) {
    for (let x = 20; x < 236; x++) {
      const dist = Math.hypot(x - 128, y - 138);
      if (dist < 85) {
        const glow = (1 - dist / 85) * 0.35;
        setPixel(png, x, y, accentR, accentG, accentB, Math.round(glow * 255));
      }
    }
  }

  // Badge Ribbon at Top
  drawAARect(png, 40, 18, 176, 32, 10, badgeBgR, badgeBgG, badgeBgB, 255);
  // Gold/Accent Border on badge
  drawAARect(png, 40, 18, 176, 3, 0, 255, 255, 255, 120);

  return png;
}

// 1. BIKE RENTAL PASS
function generateBikeRentalPNG() {
  const png = createRewardBase('1-DAY PASS', 0, 200, 115, 0, 255, 135);

  // Minimalist Aerodynamic Bike
  const cy = 145;
  // Left & Right Wheels
  drawAACircle(png, 78, cy + 20, 32, 0, 255, 135, 255, false, 5);
  drawAACircle(png, 78, cy + 20, 18, 0, 255, 135, 140, false, 2);
  drawAACircle(png, 78, cy + 20, 6, 255, 255, 255, 255, true);

  drawAACircle(png, 178, cy + 20, 32, 0, 255, 135, 255, false, 5);
  drawAACircle(png, 178, cy + 20, 18, 0, 255, 135, 140, false, 2);
  drawAACircle(png, 178, cy + 20, 6, 255, 255, 255, 255, true);

  // Bike Frame Tubes (Clean Neon Green & White)
  drawAALine(png, 78, cy + 20, 120, cy + 20, 0, 255, 135, 255, 5); // Chainstay
  drawAALine(png, 120, cy + 20, 108, cy - 20, 0, 255, 135, 255, 5); // Seat tube
  drawAALine(png, 78, cy + 20, 108, cy - 20, 0, 255, 135, 255, 5); // Seatstay
  drawAALine(png, 108, cy - 20, 155, cy - 20, 255, 255, 255, 5); // Top tube
  drawAALine(png, 120, cy + 20, 160, cy - 20, 0, 255, 135, 255, 5); // Down tube
  drawAALine(png, 160, cy - 20, 178, cy + 20, 0, 255, 135, 255, 5); // Fork

  // Handlebar & Saddle
  drawAALine(png, 155, cy - 20, 150, cy - 32, 255, 255, 255, 4);
  drawAALine(png, 142, cy - 32, 162, cy - 32, 255, 255, 255, 5);
  drawAALine(png, 98, cy - 24, 118, cy - 24, 255, 215, 0, 6); // Gold Saddle

  saveToAll('rewards/reward_bike_rental.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_bike_rental.png');
}

// 2. CAFE AMAZON
function generateCafeAmazonPNG() {
  const png = createRewardBase('-30฿ AMAZON', 18, 120, 50, 34, 197, 94);

  // Modern Minimalist Coffee Cup
  const cx = 128, cy = 142;
  // Cup body polygon
  for (let y = cy - 35; y <= cy + 45; y++) {
    const progress = (y - (cy - 35)) / 80;
    const w = 48 - progress * 14;
    for (let x = cx - w; x <= cx + w; x++) {
      setPixel(png, Math.round(x), y, 245, 240, 230, 255);
    }
  }
  // Green Brand Sleeve
  for (let y = cy - 8; y <= cy + 24; y++) {
    const progress = (y - (cy - 35)) / 80;
    const w = 49 - progress * 14;
    for (let x = cx - w; x <= cx + w; x++) {
      setPixel(png, Math.round(x), y, 20, 110, 50, 255);
    }
  }
  // Golden Leaf Emblem on Sleeve
  drawAACircle(png, cx, cy + 8, 12, 255, 215, 0, 255, true);
  drawAACircle(png, cx, cy + 8, 6, 20, 110, 50, 255, true);

  // Cup Lid
  drawAARect(png, cx - 52, cy - 43, 104, 10, 5, 255, 255, 255, 255);
  drawAARect(png, cx - 38, cy - 50, 76, 8, 3, 230, 230, 230, 255);

  // Minimalist Green Straw
  drawAALine(png, cx + 15, cy - 50, cx + 28, cy - 80, 0, 255, 135, 255, 5);

  // Steam waves
  drawAALine(png, cx - 18, cy - 58, cx - 22, cy - 74, 255, 255, 255, 120, 3);
  drawAALine(png, cx - 5, cy - 58, cx - 8, cy - 78, 255, 255, 255, 160, 3);

  saveToAll('rewards/reward_cafe_amazon.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_cafe_amazon.png');
}

// 3. GRAB VOUCHER
function generateGrabVoucherPNG() {
  const png = createRewardBase('-50฿ GRAB', 0, 165, 80, 0, 220, 120);

  // Modern Sleek Electric Car Silhouette
  const cx = 128, cy = 145;
  // Car Roof & Cabin
  drawAARect(png, cx - 45, cy - 25, 90, 30, 12, 255, 255, 255, 255);
  // Car Main Body
  drawAARect(png, cx - 68, cy - 2, 136, 32, 10, 0, 180, 90, 255);

  // Windows
  drawAARect(png, cx - 38, cy - 20, 34, 18, 4, 20, 40, 50, 255);
  drawAARect(png, cx + 4, cy - 20, 34, 18, 4, 20, 40, 50, 255);

  // Wheels
  drawAACircle(png, cx - 42, cy + 30, 16, 20, 20, 25, 255, true);
  drawAACircle(png, cx - 42, cy + 30, 8, 0, 255, 135, 255, true);

  drawAACircle(png, cx + 42, cy + 30, 16, 20, 20, 25, 255, true);
  drawAACircle(png, cx + 42, cy + 30, 8, 0, 255, 135, 255, true);

  // Headlights
  drawAACircle(png, cx + 64, cy + 10, 5, 255, 215, 0, 255, true);
  drawAACircle(png, cx - 64, cy + 10, 5, 255, 50, 80, 255, true);

  // Eco EV Lightning Bolt Badge
  drawAALine(png, cx - 4, cy + 4, cx + 2, cy + 12, 255, 215, 0, 255, 3);
  drawAALine(png, cx + 2, cy + 12, cx - 2, cy + 12, 255, 215, 0, 255, 3);
  drawAALine(png, cx - 2, cy + 12, cx + 4, cy + 22, 255, 215, 0, 255, 3);

  saveToAll('rewards/reward_grab_voucher.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_grab_voucher.png');
}

// 4. TREE PLANTING
function generateTreePlantingPNG() {
  const png = createRewardBase('1 TREE', 16, 120, 60, 0, 255, 135);

  const cx = 128, cy = 145;
  // Modern Terracotta Pot
  for (let y = cy + 15; y <= cy + 55; y++) {
    const p = (y - (cy + 15)) / 40;
    const w = 34 - p * 8;
    for (let x = cx - w; x <= cx + w; x++) {
      setPixel(png, Math.round(x), y, 210, 105, 60, 255);
    }
  }
  drawAARect(png, cx - 38, cy + 10, 76, 10, 4, 235, 125, 75, 255);

  // Plant Stem
  drawAALine(png, cx, cy + 12, cx, cy - 25, 100, 160, 60, 255, 6);

  // Lush Foliage Canopy (Overlapping minimal circles)
  drawAACircle(png, cx, cy - 45, 32, 0, 230, 110, 255, true);
  drawAACircle(png, cx - 24, cy - 35, 24, 0, 190, 85, 255, true);
  drawAACircle(png, cx + 24, cy - 35, 24, 16, 185, 80, 255, true);
  drawAACircle(png, cx, cy - 32, 20, 0, 255, 135, 255, true);

  // Sunlight sparkles
  drawAACircle(png, cx - 35, cy - 65, 4, 255, 215, 0, 220, true);
  drawAACircle(png, cx + 38, cy - 55, 5, 255, 215, 0, 240, true);

  saveToAll('rewards/reward_tree_planting.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_tree_planting.png');
}

// 5. PROBIKE SHOP
function generateProbikeShopPNG() {
  const png = createRewardBase('-100฿ PROBIKE', 20, 80, 160, 0, 180, 255);

  const cx = 128, cy = 142;
  // Minimalist Metallic Chainring Sprocket
  drawAACircle(png, cx, cy, 48, 200, 220, 240, 255, false, 8);
  drawAACircle(png, cx, cy, 32, 100, 130, 160, 255, false, 4);
  drawAACircle(png, cx, cy, 14, 0, 220, 255, 255, true);

  // Sprocket Teeth (16 teeth around circumference)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const tx = cx + Math.cos(angle) * 54;
    const ty = cy + Math.sin(angle) * 54;
    drawAACircle(png, tx, ty, 5, 220, 235, 250, 255, true);
  }

  // Cross arms
  for (let a = 0; a < 4; a++) {
    const angle = (a / 4) * Math.PI;
    const x0 = cx + Math.cos(angle) * 44;
    const y0 = cy + Math.sin(angle) * 44;
    const x1 = cx - Math.cos(angle) * 44;
    const y1 = cy - Math.sin(angle) * 44;
    drawAALine(png, x0, y0, x1, y1, 180, 200, 220, 255, 4);
  }

  saveToAll('rewards/reward_probike_shop.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_probike_shop.png');
}

// 6. ECO SHIRT
function generateEcoShirtPNG() {
  const png = createRewardBase('ECO SHIRT', 0, 150, 100, 0, 255, 135);

  const cx = 128, cy = 145;
  // Cycling Jersey Body
  drawAARect(png, cx - 36, cy - 25, 72, 65, 8, 240, 245, 250, 255);

  // Shoulders & Sleeves
  drawAALine(png, cx - 36, cy - 25, cx - 62, cy - 2, 0, 200, 110, 255, 18);
  drawAALine(png, cx + 36, cy - 25, cx + 62, cy - 2, 0, 200, 110, 255, 18);

  // Collar V-neck
  drawAACircle(png, cx, cy - 30, 16, 12, 22, 30, 255, true);

  // Eco Racing Stripes & Logo
  drawAARect(png, cx - 8, cy - 10, 16, 45, 3, 0, 255, 135, 255);
  drawAACircle(png, cx, cy + 8, 7, 255, 215, 0, 255, true);

  saveToAll('rewards/reward_eco_shirt.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_eco_shirt.png');
}

// 7. WATER BOTTLE
function generateWaterBottlePNG() {
  const png = createRewardBase('24H COLD', 10, 100, 160, 0, 200, 255);

  const cx = 128, cy = 142;
  // Sleek Stainless Bottle Flask Body
  drawAARect(png, cx - 24, cy - 30, 48, 75, 12, 30, 42, 56, 255);

  // Neon Green Grip Band
  drawAARect(png, cx - 24, cy - 8, 48, 20, 4, 0, 255, 135, 255);

  // Flask Neck & Cap
  drawAARect(png, cx - 14, cy - 45, 28, 16, 4, 180, 195, 210, 255);
  drawAARect(png, cx - 18, cy - 58, 36, 14, 6, 20, 30, 40, 255);

  // Sport Loop Handle
  drawAACircle(png, cx, cy - 65, 10, 0, 255, 135, 255, false, 4);

  // Cold condensation drops
  drawAACircle(png, cx - 12, cy + 22, 3, 96, 239, 255, 220, true);
  drawAACircle(png, cx + 14, cy + 12, 2.5, 96, 239, 255, 220, true);

  saveToAll('rewards/reward_water_bottle.png', PNG.sync.write(png));
  console.log('✅ Generated high-res reward_water_bottle.png');
}

// Run Reward PNGs
generateBikeRentalPNG();
generateCafeAmazonPNG();
generateGrabVoucherPNG();
generateTreePlantingPNG();
generateProbikeShopPNG();
generateEcoShirtPNG();
generateWaterBottlePNG();

// -----------------------------------------------------------------------------
// PART 2: HIGH-RES MINIMALIST ANIMATED GIF BANNERS (480 x 150, 24 FRAMES, 60FPS FEEL)
// -----------------------------------------------------------------------------

const BW = 480;
const BH = 150;
const BF_FRAMES = 24;
const BF_DELAY = 6; // 60ms per frame

// Helper: Palette Generator
function createPalette(baseColors) {
  const p = [...baseColors];
  while (p.length < 256) p.push(0x000000);
  return p;
}

// 1. MINIMALIST CYBER FOREST ECO
function generateCyberForestBanner() {
  const buffer = Buffer.alloc(BW * BH * BF_FRAMES * 5);
  const gif = new GifWriter(buffer, BW, BH, { loop: 0 });

  const palette = createPalette([
    0x04110b, // 0: Deep Pine Void
    0x082417, // 1: Dark Forest Green
    0x0d3f28, // 2: Forest Green
    0x105938, // 3: Medium Emerald
    0x059669, // 4: Emerald
    0x10b981, // 5: Light Emerald
    0x34d399, // 6: Mint Bio
    0x00ff87, // 7: Glowing Neon Green
    0x6ee7b7, // 8: Pale Light Green
    0xffffff, // 9: White Light
    0xffd700, // 10: Golden Bio Firefly
    0x60efff, // 11: Cyan Spark
  ]);

  for (let f = 0; f < BF_FRAMES; f++) {
    const t = f / BF_FRAMES;
    const data = new Uint8Array(BW * BH);

    // Smooth Minimalist Gradient Background
    for (let y = 0; y < BH; y++) {
      const g = y < 50 ? 0 : (y < 100 ? 1 : 2);
      for (let x = 0; x < BW; x++) data[y * BW + x] = g;
    }

    // Elegant Mountain / Hill Ridges in Silhouette
    for (let x = 0; x < BW; x++) {
      const h1 = 55 + Math.sin(x * 0.015) * 18 + Math.cos(x * 0.03) * 10;
      for (let y = Math.round(h1); y < BH; y++) data[y * BW + x] = 2;

      const h2 = 85 + Math.sin(x * 0.02 + 1) * 14 + Math.cos(x * 0.04) * 8;
      for (let y = Math.round(h2); y < BH; y++) data[y * BW + x] = 3;
    }

    // Minimalist Pine Trees Array
    const treeX = [30, 75, 120, 175, 230, 285, 340, 395, 445];
    for (const tx of treeX) {
      for (let ty = 35; ty < 120; ty++) {
        const span = Math.round((ty - 35) * 0.28);
        for (let dx = -span; dx <= span; dx++) {
          const px = tx + dx;
          if (px >= 0 && px < BW) {
            data[ty * BW + px] = Math.abs(dx) < 2 ? 7 : 4;
          }
        }
      }
    }

    // Smooth Bioluminescent Fireflies (Sine wave undulating paths)
    for (let p = 0; p < 28; p++) {
      const seed = p * 47.9;
      const px = Math.round((seed * 13.5 + Math.sin(t * Math.PI * 2 + seed) * 35 + BW) % BW);
      const py = Math.round(BH - 20 - ((t + p * 0.035) % 1.0) * (BH - 30));
      if (px >= 0 && px < BW && py >= 0 && py < BH) {
        data[py * BW + px] = 10; // Gold center
        if (px + 1 < BW) data[py * BW + px + 1] = 7;
        if (px - 1 >= 0) data[py * BW + px - 1] = 7;
        if (py + 1 < BH) data[(py + 1) * BW + px] = 8;
        if (py - 1 >= 0) data[(py - 1) * BW + px] = 8;
      }
    }

    gif.addFrame(0, 0, BW, BH, data, { palette, delay: BF_DELAY, disposal: 2 });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_cyber_forest.gif', res);
  console.log('✅ Generated high-res banner_cyber_forest.gif');
}

// 2. MINIMALIST MIDNIGHT STARLIGHT
function generateMidnightStarBanner() {
  const buffer = Buffer.alloc(BW * BH * BF_FRAMES * 5);
  const gif = new GifWriter(buffer, BW, BH, { loop: 0 });

  const palette = createPalette([
    0x060c18, // 0: Deep Space Midnight
    0x0b172a, // 1: Navy Cosmic
    0x132742, // 2: Blue Space
    0x1c3a60, // 3: Starlight Slate
    0x0284c7, // 4: Sky Blue
    0x38bdf8, // 5: Cyan Glow
    0x60efff, // 6: Neon Starlight
    0xffffff, // 7: Pure White
    0x7c3aed, // 8: Purple Aurora
    0xa855f7, // 9: Pale Violet
    0xffd700, // 10: Golden Star
  ]);

  for (let f = 0; f < BF_FRAMES; f++) {
    const t = f / BF_FRAMES;
    const data = new Uint8Array(BW * BH);

    // Deep Space Background
    for (let y = 0; y < BH; y++) {
      const g = y < 50 ? 0 : (y < 100 ? 1 : 2);
      for (let x = 0; x < BW; x++) data[y * BW + x] = g;
    }

    // Undulating Aurora Borealis Ribbon Wave
    for (let x = 0; x < BW; x++) {
      const wave = Math.sin(x * 0.015 + t * Math.PI * 2) * 20 + Math.cos(x * 0.025 - t * Math.PI) * 12;
      const cy = 60 + wave;
      for (let dy = -16; dy <= 16; dy++) {
        const py = Math.round(cy + dy);
        if (py >= 0 && py < BH) {
          const dist = Math.abs(dy) / 16;
          if (dist < 0.4) data[py * BW + x] = 6;
          else if (dist < 0.75) data[py * BW + x] = 8;
          else data[py * BW + x] = 9;
        }
      }
    }

    // Twinkling Stars (40 Stars)
    for (let s = 0; s < 40; s++) {
      const sx = Math.round((s * 79.3) % (BW - 20) + 10);
      const sy = Math.round((s * 47.1) % (BH - 20) + 10);
      const twinkle = Math.sin(t * Math.PI * 2 * (1 + (s % 3)) + s);
      const color = twinkle > 0.4 ? 7 : (twinkle > -0.2 ? 6 : 4);
      data[sy * BW + sx] = color;
      if (twinkle > 0.5) {
        if (sx + 1 < BW) data[sy * BW + sx + 1] = 6;
        if (sx - 1 >= 0) data[sy * BW + sx - 1] = 6;
        if (sy + 1 < BH) data[(sy + 1) * BW + sx] = 6;
        if (sy - 1 >= 0) data[(sy - 1) * BW + sx] = 6;
      }
    }

    // Smooth Meteor Shooting Star Trail
    const meteorP = (t * 1.8) % 1.0;
    const mx = Math.round(meteorP * (BW + 150) - 75);
    const my = Math.round(meteorP * (BH + 60) - 30);
    for (let tail = 0; tail < 32; tail++) {
      const tx = mx - tail * 2;
      const ty = my - tail;
      if (tx >= 0 && tx < BW && ty >= 0 && ty < BH) {
        data[ty * BW + tx] = tail < 4 ? 7 : (tail < 14 ? 6 : 4);
      }
    }

    gif.addFrame(0, 0, BW, BH, data, { palette, delay: BF_DELAY, disposal: 2 });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_midnight_star.gif', res);
  console.log('✅ Generated high-res banner_midnight_star.gif');
}

// 3. MINIMALIST SOLAR PHOENIX INFERNO
function generateSolarPhoenixBanner() {
  const buffer = Buffer.alloc(BW * BH * BF_FRAMES * 5);
  const gif = new GifWriter(buffer, BW, BH, { loop: 0 });

  const palette = createPalette([
    0x170701, // 0: Dark Obsidian Fire
    0x2c0f03, // 1: Dark Amber
    0x541c05, // 2: Deep Crimson Amber
    0x8a2c07, // 3: Copper Fire
    0xb45309, // 4: Amber Flame
    0xd97706, // 5: Pure Amber Gold
    0xf59e0b, // 6: Sun Gold
    0xffd700, // 7: Bright Gold
    0xfffbeb, // 8: White Sun Core
    0xff3b00, // 9: Lava Red
    0xff7700, // 10: Bright Orange
  ]);

  for (let f = 0; f < BF_FRAMES; f++) {
    const t = f / BF_FRAMES;
    const data = new Uint8Array(BW * BH);

    // Warm Sun Gradient
    for (let y = 0; y < BH; y++) {
      const g = y < 50 ? 0 : (y < 100 ? 1 : 2);
      for (let x = 0; x < BW; x++) data[y * BW + x] = g;
    }

    // Majestic Radiant Sunburst Core
    const sunX = 240, sunY = 75;
    for (let dy = -50; dy <= 50; dy++) {
      for (let dx = -50; dx <= 50; dx++) {
        const dist = Math.hypot(dx, dy);
        const ray = Math.sin(Math.atan2(dy, dx) * 14 + t * Math.PI * 4);
        if (dist <= 36 + ray * 6) {
          const px = sunX + dx, py = sunY + dy;
          if (px >= 0 && px < BW && py >= 0 && py < BH) {
            data[py * BW + px] = dist < 16 ? 8 : (dist < 28 ? 7 : 6);
          }
        }
      }
    }

    // Elegant Phoenix Flapping Wings Motion
    const wingFlap = Math.sin(t * Math.PI * 2);
    const phoenixX = 240, phoenixY = 72 + Math.round(wingFlap * 4);

    for (const sign of [-1, 1]) {
      for (let wx = 8; wx <= 120; wx++) {
        const wy = Math.round(-Math.sin((wx / 120) * Math.PI) * (36 + wingFlap * 22));
        const px = phoenixX + sign * wx;
        const py = phoenixY + wy;
        for (let thick = -3; thick <= 3; thick++) {
          const fpy = py + thick;
          if (px >= 0 && px < BW && fpy >= 0 && fpy < BH) {
            data[fpy * BW + px] = Math.abs(thick) < 2 ? 8 : 7;
          }
        }
      }
    }

    // Phoenix Head Crown
    for (let dy = -12; dy <= 6; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        if (dx * dx + dy * dy <= 32) {
          data[(phoenixY + dy) * BW + (phoenixX + dx)] = 8;
        }
      }
    }

    // Rising Solar Embers
    for (let e = 0; e < 35; e++) {
      const ex = Math.round((phoenixX + Math.sin(e * 4.1 + t * 6) * 160 + BW) % BW);
      const ey = Math.round(BH - ((t * 1.8 + e * 0.05) % 1.0) * (BH + 20));
      if (ex >= 0 && ex < BW && ey >= 0 && ey < BH) {
        data[ey * BW + ex] = e % 2 === 0 ? 7 : 10;
      }
    }

    gif.addFrame(0, 0, BW, BH, data, { palette, delay: BF_DELAY, disposal: 2 });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_solar_phoenix.gif', res);
  console.log('✅ Generated high-res banner_solar_phoenix.gif');
}

// 4. MINIMALIST HADES NETHERREALM FLAME
function generateHadesFlameBanner() {
  const buffer = Buffer.alloc(BW * BH * BF_FRAMES * 5);
  const gif = new GifWriter(buffer, BW, BH, { loop: 0 });

  const palette = createPalette([
    0x020f17, // 0: Dark Nether Void
    0x051d28, // 1: Dark Abyss
    0x093345, // 2: Deep Turquoise
    0x0e4f68, // 3: Medium Turquoise
    0x0ea5e9, // 4: Electric Cyan
    0x00f2fe, // 5: Glowing Soul Cyan
    0xffffff, // 6: Pure Soul White
    0x38bdf8, // 7: Sky Blue Flame
    0x6366f1, // 8: Indigo Arcane
    0xa855f7, // 9: Void Purple
  ]);

  for (let f = 0; f < BF_FRAMES; f++) {
    const t = f / BF_FRAMES;
    const data = new Uint8Array(BW * BH);

    // Nether Gradient
    for (let y = 0; y < BH; y++) {
      const g = y < 50 ? 0 : (y < 100 ? 1 : 2);
      for (let x = 0; x < BW; x++) data[y * BW + x] = g;
    }

    // Smooth Soul Flame Waves across entire width
    for (let x = 0; x < BW; x++) {
      const flameH = 45 + Math.sin(x * 0.04 + t * Math.PI * 4) * 16 + Math.cos(x * 0.08 - t * Math.PI * 2) * 10;
      for (let y = BH - Math.round(flameH); y < BH; y++) {
        if (y >= 0 && y < BH) {
          const depth = (y - (BH - flameH)) / flameH;
          data[y * BW + x] = depth < 0.25 ? 5 : (depth < 0.65 ? 4 : 2);
        }
      }
    }

    // Minimalist Floating Soul Skull in Center
    const skullX = 240, skullY = 60 + Math.round(Math.sin(t * Math.PI * 2) * 8);
    for (let dy = -26; dy <= 20; dy++) {
      for (let dx = -24; dx <= 24; dx++) {
        const dist = (dx * dx) / 520 + (dy * dy) / 380;
        if (dist <= 1) {
          const px = skullX + dx, py = skullY + dy;
          if (px >= 0 && px < BW && py >= 0 && py < BH) {
            const eyeL = Math.hypot(dx + 9, dy + 2);
            const eyeR = Math.hypot(dx - 9, dy + 2);
            if (eyeL <= 5 || eyeR <= 5) {
              data[py * BW + px] = eyeL <= 2.5 || eyeR <= 2.5 ? 6 : 5; // Glowing Cyan Eyes
            } else if (Math.abs(dx) <= 3 && dy >= 10 && dy <= 16) {
              data[py * BW + px] = 0;
            } else {
              data[py * BW + px] = 4;
            }
          }
        }
      }
    }

    // Spectral Wisps
    for (let w = 0; w < 24; w++) {
      const wx = Math.round((skullX + Math.sin(w * 3.7 + t * 5) * 150 + BW) % BW);
      const wy = Math.round(BH - ((t * 1.5 + w * 0.08) % 1.0) * (BH + 20));
      if (wx >= 0 && wx < BW && wy >= 0 && wy < BH) {
        data[wy * BW + wx] = 5;
        if (wx + 1 < BW) data[wy * BW + wx + 1] = 6;
      }
    }

    gif.addFrame(0, 0, BW, BH, data, { palette, delay: BF_DELAY, disposal: 2 });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_hades_flame.gif', res);
  console.log('✅ Generated high-res banner_hades_flame.gif');
}

// 5. MINIMALIST SPIDER-MAN CYBER NEON CITY
function generateSpiderManBanner() {
  const buffer = Buffer.alloc(BW * BH * BF_FRAMES * 5);
  const gif = new GifWriter(buffer, BW, BH, { loop: 0 });

  const palette = createPalette([
    0x0a0c18, // 0: Dark Cyber Night
    0x11162d, // 1: City Dark Navy
    0x1a213f, // 2: Skyscraper Dark
    0x251b40, // 3: Neon Purple Skyscraper
    0xe11d48, // 4: Neon Crimson Red
    0xbe123c, // 5: Dark Red Suit
    0xff0055, // 6: Glowing Laser Red
    0x00f0ff, // 7: Neon Cyan Laser Web
    0x38bdf8, // 8: Web Glow
    0xffffff, // 9: White Spider Eyes
    0xffd700, // 10: Golden City Light
    0xf59e0b, // 11: Amber Light
    0x00ff87, // 12: Neon Green Spark
  ]);

  for (let f = 0; f < BF_FRAMES; f++) {
    const t = f / BF_FRAMES;
    const data = new Uint8Array(BW * BH);

    // Dark Cyber Night Sky
    for (let y = 0; y < BH; y++) {
      const g = y < 50 ? 0 : (y < 100 ? 1 : 2);
      for (let x = 0; x < BW; x++) data[y * BW + x] = g;
    }

    // High-Tech Cyber Skyscrapers Skyline
    const buildings = [
      { x: 10, w: 55, h: 95 },
      { x: 75, w: 45, h: 120 },
      { x: 130, w: 60, h: 80 },
      { x: 200, w: 50, h: 130 },
      { x: 260, w: 65, h: 90 },
      { x: 335, w: 50, h: 115 },
      { x: 395, w: 45, h: 100 },
      { x: 450, w: 30, h: 85 },
    ];

    for (const b of buildings) {
      for (let by = BH - b.h; by < BH; by++) {
        for (let bx = b.x; bx < b.x + b.w && bx < BW; bx++) {
          if (bx >= 0 && by >= 0) {
            data[by * BW + bx] = 3;
            // Clean illuminated window rows
            if ((bx % 10 >= 3 && bx % 10 <= 7) && (by % 16 >= 4 && by % 16 <= 9)) {
              data[by * BW + bx] = (bx + by + f) % 7 === 0 ? 10 : 11;
            }
          }
        }
      }
    }

    // Spider-Man Swinging Trajectory (Smooth Harmonic Arc)
    const swingAngle = Math.sin(t * Math.PI * 2);
    const spideyX = Math.round(BW * 0.5 + swingAngle * 140);
    const spideyY = Math.round(55 + Math.abs(swingAngle) * 40);
    const webAnchorX = Math.round(BW * 0.5 + (swingAngle > 0 ? 120 : -120));
    const webAnchorY = 5;

    // Laser Cyber Web
    const handX = spideyX + (swingAngle > 0 ? -16 : 16);
    const handY = spideyY - 18;
    const steps = 80;
    for (let s = 0; s <= steps; s++) {
      const wx = Math.round(webAnchorX + (handX - webAnchorX) * (s / steps));
      const wy = Math.round(webAnchorY + (handY - webAnchorY) * (s / steps));
      if (wx >= 0 && wx < BW && wy >= 0 && wy < BH) {
        data[wy * BW + wx] = 7;
        if (wy + 1 < BH) data[(wy + 1) * BW + wx] = 8;
      }
    }

    // Spider-Man Minimalist Hero Silhouette
    for (let dy = -22; dy <= 26; dy++) {
      for (let dx = -22; dx <= 22; dx++) {
        const px = spideyX + dx, py = spideyY + dy;
        if (px < 0 || px >= BW || py < 0 || py >= BH) continue;

        const distHead = Math.hypot(dx, dy + 10);
        const distTorso = Math.hypot(dx, dy - 5);

        if (distHead <= 11) {
          data[py * BW + px] = 4; // Mask Red
          // Slanted White Eyes
          const eyeL = Math.hypot(dx + 4.5, dy + 10);
          const eyeR = Math.hypot(dx - 4.5, dy + 10);
          if (eyeL <= 4.2 || eyeR <= 4.2) data[py * BW + px] = 9;
        } else if (distTorso <= 14) {
          if (Math.abs(dx) > 6) {
            data[py * BW + px] = 1; // Blue suit side
          } else {
            data[py * BW + px] = 6; // Red suit chest
            if (Math.abs(dx) <= 2 && Math.abs(dy - 5) <= 4) data[py * BW + px] = 0; // Spider icon
          }
        }
        // Legs in motion
        const legAngle = swingAngle * 0.9;
        const leg1 = Math.hypot(dx - Math.sin(legAngle) * 15, dy - 20);
        const leg2 = Math.hypot(dx + Math.sin(legAngle) * 13, dy - 19);
        if (leg1 <= 5.5 || leg2 <= 5.5) data[py * BW + px] = 1;
      }
    }

    // Laser Sparks
    for (let p = 0; p < 22; p++) {
      const sparkX = Math.round((spideyX + Math.sin(t * 12 + p) * 75 + BW) % BW);
      const sparkY = Math.round((spideyY + Math.cos(t * 10 + p) * 45 + BH) % BH);
      if (sparkX >= 0 && sparkX < BW && sparkY >= 0 && sparkY < BH) {
        data[sparkY * BW + sparkX] = p % 2 === 0 ? 7 : 6;
      }
    }

    gif.addFrame(0, 0, BW, BH, data, { palette, delay: BF_DELAY, disposal: 2 });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_spider_city.gif', res);
  saveToAll('banners/banner_spiderman.gif', res);
  console.log('✅ Generated high-res banner_spider_city.gif & banner_spiderman.gif');
}

// Run All Banners
generateCyberForestBanner();
generateMidnightStarBanner();
generateSolarPhoenixBanner();
generateHadesFlameBanner();
generateSpiderManBanner();

console.log('🎉 Generated all high-res minimalist assets successfully!');
