const fs = require('fs');
const path = require('path');
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

const W = 360;
const H = 140;
const FRAMES = 24;
const DELAY = 5; // 50ms per frame (~20 FPS)

// -----------------------------------------------------------------------------
// 1. CYBER FOREST ECO (Bioluminescent Eco Forest & Rising Fireflies)
// -----------------------------------------------------------------------------
function makeCyberForestGif() {
  const buffer = Buffer.alloc(W * H * FRAMES * 5);
  const gif = new GifWriter(buffer, W, H, { loop: 0 });

  const palette = [
    0x030d08, // 0: Deep Forest Black
    0x051d13, // 1: Dark Green
    0x0b3a26, // 2: Forest Green
    0x047857, // 3: Medium Emerald
    0x10b981, // 4: Light Emerald
    0x34d399, // 5: Mint Green
    0x00ff87, // 6: Bright Neon Green
    0x6ee7b7, // 7: Pale Bio Green
    0xffffff, // 8: White Spark
    0xffd700, // 9: Gold Firefly
    0xa7f3d0, // 10: Bio Glow
    0x064e3b, // 11: Vine Dark
  ];
  while (palette.length < 256) palette.push(0x000000);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const data = new Uint8Array(W * H);

    // Background Gradient
    for (let y = 0; y < H; y++) {
      const g = y < H * 0.4 ? 0 : (y < H * 0.75 ? 1 : 2);
      for (let x = 0; x < W; x++) data[y * W + x] = g;
    }

    // Glowing Cyber Tree Silhouettes & Digital Matrix Trunks
    const trees = [40, 95, 160, 225, 290, 345];
    for (const tx of trees) {
      for (let y = 20; y < H; y++) {
        const trunkW = Math.max(2, Math.round(5 - (y - 20) * 0.03));
        for (let dx = -trunkW; dx <= trunkW; dx++) {
          if (tx + dx >= 0 && tx + dx < W) {
            data[y * W + tx + dx] = (y + dx) % 4 === 0 ? 6 : 3;
          }
        }
      }
      // Glowing Foliage Canopy Orbs
      for (let dy = -25; dy <= 25; dy++) {
        for (let dx = -32; dx <= 32; dx++) {
          if ((dx * dx) / 1000 + (dy * dy) / 600 <= 1) {
            const px = tx + dx, py = 25 + dy;
            if (px >= 0 && px < W && py >= 0 && py < H) {
              const ring = Math.hypot(dx, dy);
              data[py * W + px] = ring < 12 ? 6 : (ring < 22 ? 4 : 2);
            }
          }
        }
      }
    }

    // Cyber Data Grid Lines pulsing on ground
    for (let x = 0; x < W; x += 16) {
      const gx = (x + Math.round(t * 16)) % W;
      for (let y = H - 25; y < H; y++) {
        data[y * W + gx] = 6;
      }
    }

    // Floating Fireflies Rising Upwards
    for (let p = 0; p < 22; p++) {
      const seed = p * 97.3;
      const px = Math.round((Math.sin(seed + t * 4) * 30 + seed * 19) % W);
      const py = Math.round((H - 10 - ((t * 1.5 + p * 0.1) % 1.0) * (H + 20)));
      if (px >= 0 && px < W && py >= 0 && py < H) {
        data[py * W + px] = 9; // Gold spark
        if (px + 1 < W) data[py * W + px + 1] = 6;
        if (py + 1 < H) data[(py + 1) * W + px] = 6;
        if (px - 1 >= 0) data[py * W + px - 1] = 7;
      }
    }

    gif.addFrame(0, 0, W, H, data, { palette, delay: DELAY });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_cyber_forest.gif', res);
  console.log('✅ Created banner_cyber_forest.gif');
}

// -----------------------------------------------------------------------------
// 2. MIDNIGHT STARLIGHT (Twinkling Galaxies & Shooting Star Meteor Showers)
// -----------------------------------------------------------------------------
function makeMidnightStarGif() {
  const buffer = Buffer.alloc(W * H * FRAMES * 5);
  const gif = new GifWriter(buffer, W, H, { loop: 0 });

  const palette = [
    0x080e18, // 0: Deep Void Night
    0x0f2027, // 1: Navy Cosmic
    0x203a43, // 2: Blue Gray
    0x2c5364, // 3: Slate Cyan
    0x60efff, // 4: Bright Cyan Starlight
    0x00f2fe, // 5: Neon Cyan
    0xffffff, // 6: Pure White Star
    0xffd700, // 7: Golden Constellation
    0x9d4edd, // 8: Purple Nebula
    0xc77dff, // 9: Pale Violet
    0x0077b6, // 10: Deep Blue Nebula
  ];
  while (palette.length < 256) palette.push(0x000000);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const data = new Uint8Array(W * H);

    // Cosmic Gradient Background
    for (let y = 0; y < H; y++) {
      const g = y < H * 0.4 ? 0 : (y < H * 0.75 ? 1 : 2);
      for (let x = 0; x < W; x++) data[y * W + x] = g;
    }

    // Swirling Nebula Cloud in Center
    for (let y = 15; y < H - 15; y++) {
      for (let x = 40; x < W - 40; x++) {
        const d = Math.hypot(x - 180, y - 60);
        const angle = Math.atan2(y - 60, x - 180) + t * Math.PI * 2;
        const wave = Math.sin(angle * 3 + d * 0.08);
        if (d < 80 && wave > 0.4) {
          data[y * W + x] = wave > 0.75 ? 9 : 8;
        }
      }
    }

    // Twinkling Fixed Constellation Stars (35 Stars)
    for (let s = 0; s < 35; s++) {
      const sx = Math.round((s * 73.7) % (W - 20) + 10);
      const sy = Math.round((s * 41.3) % (H - 20) + 10);
      const twinkle = Math.sin(t * Math.PI * 2 * (1 + (s % 3)) + s);
      const starColor = twinkle > 0.5 ? 6 : (twinkle > -0.2 ? 4 : 10);
      data[sy * W + sx] = starColor;
      if (twinkle > 0.6) {
        if (sx + 1 < W) data[sy * W + sx + 1] = 4;
        if (sx - 1 >= 0) data[sy * W + sx - 1] = 4;
        if (sy + 1 < H) data[(sy + 1) * W + sx] = 4;
        if (sy - 1 >= 0) data[(sy - 1) * W + sx] = 4;
      }
    }

    // Fast Shooting Star / Meteor Shower Trajectory
    const meteorProgress = (t * 2.2) % 1.0;
    const mx = Math.round(meteorProgress * (W + 120) - 60);
    const my = Math.round(meteorProgress * (H + 40) - 20);

    for (let tail = 0; tail < 28; tail++) {
      const tx = mx - tail * 2;
      const ty = my - tail;
      if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
        data[ty * W + tx] = tail < 4 ? 6 : (tail < 12 ? 4 : 10);
      }
    }

    gif.addFrame(0, 0, W, H, data, { palette, delay: DELAY });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_midnight_star.gif', res);
  console.log('✅ Created banner_midnight_star.gif');
}

// -----------------------------------------------------------------------------
// 3. SOLAR PHOENIX INFERNO (Flapping Golden Wings, Sun Flare, Fire Tornado)
// -----------------------------------------------------------------------------
function makeSolarPhoenixGif() {
  const buffer = Buffer.alloc(W * H * FRAMES * 5);
  const gif = new GifWriter(buffer, W, H, { loop: 0 });

  const palette = [
    0x140700, // 0: Dark Obsidian Red
    0x2e1000, // 1: Dark Amber
    0x5a2a00, // 2: Molten Orange
    0xb45309, // 3: Copper Fire
    0xd97706, // 4: Amber Gold
    0xf59e0b, // 5: Golden Yellow
    0xffd700, // 6: Sun Gold
    0xfffbeb, // 7: Blazing White Gold
    0xff3b00, // 8: Crimson Flame
    0xff7700, // 9: Pure Orange Flame
  ];
  while (palette.length < 256) palette.push(0x000000);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const data = new Uint8Array(W * H);

    // Inferno Dark Gradient Background
    for (let y = 0; y < H; y++) {
      const g = y < H * 0.4 ? 0 : (y < H * 0.75 ? 1 : 2);
      for (let x = 0; x < W; x++) data[y * W + x] = g;
    }

    // Great Central Solar Sun Core
    const sunCX = 180, sunCY = 68;
    for (let dy = -45; dy <= 45; dy++) {
      for (let dx = -45; dx <= 45; dx++) {
        const dist = Math.hypot(dx, dy);
        const ray = Math.sin(Math.atan2(dy, dx) * 12 + t * Math.PI * 4);
        if (dist <= 30 + ray * 5) {
          const px = sunCX + dx, py = sunCY + dy;
          if (px >= 0 && px < W && py >= 0 && py < H) {
            data[py * W + px] = dist < 14 ? 7 : (dist < 24 ? 6 : 5);
          }
        }
      }
    }

    // Flying Solar Phoenix Flapping Wings Motion
    const wingFlap = Math.sin(t * Math.PI * 2);
    const phoenixX = 180;
    const phoenixY = 64 + Math.round(wingFlap * 4);

    // Left & Right Wings (Curved parabolic flame wings)
    for (let wingSign of [-1, 1]) {
      for (let wx = 8; wx <= 85; wx++) {
        const wy = Math.round(-Math.sin((wx / 85) * Math.PI) * (28 + wingFlap * 18));
        const px = phoenixX + wingSign * wx;
        const py = phoenixY + wy;

        for (let thick = -4; thick <= 4; thick++) {
          const fpy = py + thick;
          if (px >= 0 && px < W && fpy >= 0 && fpy < H) {
            data[fpy * W + px] = Math.abs(thick) < 2 ? 7 : 6;
          }
        }
      }
    }

    // Phoenix Flaming Crown & Head
    for (let dy = -10; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        if (dx * dx + dy * dy <= 24) {
          data[(phoenixY + dy) * W + (phoenixX + dx)] = 7;
        }
      }
    }

    // Rising Molten Sparks & Flame Embers
    for (let e = 0; e < 30; e++) {
      const ex = Math.round((phoenixX + Math.sin(e * 3.7 + t * 6) * 130 + W) % W);
      const ey = Math.round((H - ((t * 2.0 + e * 0.08) % 1.0) * (H + 15)));
      if (ex >= 0 && ex < W && ey >= 0 && ey < H) {
        data[ey * W + ex] = e % 2 === 0 ? 6 : 8;
      }
    }

    gif.addFrame(0, 0, W, H, data, { palette, delay: DELAY });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_solar_phoenix.gif', res);
  console.log('✅ Created banner_solar_phoenix.gif');
}

// -----------------------------------------------------------------------------
// 4. HADES NETHERREALM FLAME (Turquoise Soul Flames & Mystic Skull Spirit)
// -----------------------------------------------------------------------------
function makeHadesFlameGif() {
  const buffer = Buffer.alloc(W * H * FRAMES * 5);
  const gif = new GifWriter(buffer, W, H, { loop: 0 });

  const palette = [
    0x000d14, // 0: Nether Void
    0x001e29, // 1: Dark Abyss
    0x003d4c, // 2: Deep Turquoise
    0x00667a, // 3: Medium Turquoise
    0x00c9ff, // 4: Bright Cyan Flame
    0x00f2fe, // 5: Glowing Soul Cyan
    0xffffff, // 6: Mystic White
    0x4facfe, // 7: Electric Sky Blue
    0x7928ca, // 8: Dark Necro Purple
    0xb800ff, // 9: Void Purple
  ];
  while (palette.length < 256) palette.push(0x000000);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const data = new Uint8Array(W * H);

    // Abyss Background Gradient
    for (let y = 0; y < H; y++) {
      const g = y < H * 0.4 ? 0 : (y < H * 0.75 ? 1 : 2);
      for (let x = 0; x < W; x++) data[y * W + x] = g;
    }

    // Swirling Netherworld Soul Flames (Bottom waves)
    for (let x = 0; x < W; x++) {
      const flameH = 45 + Math.sin(x * 0.08 + t * Math.PI * 4) * 16 + Math.cos(x * 0.15 - t * Math.PI * 6) * 10;
      for (let y = H - Math.round(flameH); y < H; y++) {
        if (y >= 0 && y < H) {
          const depth = (y - (H - flameH)) / flameH;
          data[y * W + x] = depth < 0.25 ? 5 : (depth < 0.6 ? 4 : 2);
        }
      }
    }

    // Floating Mystic Nether Skull Spirit in Center
    const skullX = 180;
    const skullY = 55 + Math.round(Math.sin(t * Math.PI * 2) * 8);

    // Skull Dome
    for (let dy = -22; dy <= 16; dy++) {
      for (let dx = -20; dx <= 20; dx++) {
        const dist = (dx * dx) / 380 + (dy * dy) / 280;
        if (dist <= 1) {
          const px = skullX + dx, py = skullY + dy;
          if (px >= 0 && px < W && py >= 0 && py < H) {
            // Skull Eye Sockets (Glowing turquoise fire eyes)
            const eyeL = Math.hypot(dx + 7, dy + 2);
            const eyeR = Math.hypot(dx - 7, dy + 2);
            if (eyeL <= 4.5 || eyeR <= 4.5) {
              data[py * W + px] = eyeL <= 2 || eyeR <= 2 ? 6 : 5; // Glowing Cyan Eyes
            } else if (Math.abs(dx) <= 2 && dy >= 8 && dy <= 12) {
              data[py * W + px] = 0; // Nasal cavity
            } else {
              data[py * W + px] = 4; // Skull bone turquoise glow
            }
          }
        }
      }
    }

    // Floating Soul Flame Wisps
    for (let w = 0; w < 20; w++) {
      const wx = Math.round((skullX + Math.sin(w * 4.3 + t * 5) * 120 + W) % W);
      const wy = Math.round((H - ((t * 1.6 + w * 0.1) % 1.0) * (H + 20)));
      if (wx >= 0 && wx < W && wy >= 0 && wy < H) {
        data[wy * W + wx] = 5;
        if (wx + 1 < W) data[wy * W + wx + 1] = 6;
      }
    }

    gif.addFrame(0, 0, W, H, data, { palette, delay: DELAY });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_hades_flame.gif', res);
  console.log('✅ Created banner_hades_flame.gif');
}

// -----------------------------------------------------------------------------
// 5. SPIDER-MAN CYBER NEON CITY (Swinging Web Trajectory & Neon City)
// -----------------------------------------------------------------------------
function makeSpiderManGif() {
  const buffer = Buffer.alloc(W * H * FRAMES * 5);
  const gif = new GifWriter(buffer, W, H, { loop: 0 });

  const palette = [
    0x0a0a14, // 0: Dark Sky
    0x121324, // 1: City Dark
    0x1a1c36, // 2: Building
    0x2d1b4e, // 3: Purple building
    0xff0055, // 4: Neon Crimson / Red
    0xd90429, // 5: Deep Red
    0xff3366, // 6: Bright Pink Red
    0x00f0ff, // 7: Cyber Cyan Web
    0x00a8ff, // 8: Web Glow
    0xffffff, // 9: White Eyes / Spark
    0xffd700, // 10: Gold Light
    0xffb703, // 11: City Window Orange
    0x00ff87, // 12: Neon Green Accent
    0x3a0ca3, // 13: Neon Violet
    0x7209b7, // 14: Magenta
    0x4361ee, // 15: Cyber Blue
  ];
  while (palette.length < 256) palette.push(0x000000);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const data = new Uint8Array(W * H);

    for (let y = 0; y < H; y++) {
      const g = y < H * 0.4 ? 0 : (y < H * 0.7 ? 1 : 2);
      for (let x = 0; x < W; x++) data[y * W + x] = g;
    }

    const buildings = [
      { x: 10, w: 45, h: 85 },
      { x: 60, w: 35, h: 105 },
      { x: 105, w: 50, h: 70 },
      { x: 165, w: 40, h: 115 },
      { x: 215, w: 55, h: 80 },
      { x: 280, w: 40, h: 100 },
      { x: 330, w: 30, h: 90 },
    ];

    for (const b of buildings) {
      for (let by = H - b.h; by < H; by++) {
        for (let bx = b.x; bx < b.x + b.w && bx < W; bx++) {
          if (bx >= 0 && by >= 0) {
            data[by * W + bx] = 3;
            if ((bx % 8 >= 2 && bx % 8 <= 5) && (by % 14 >= 3 && by % 14 <= 7)) {
              data[by * W + bx] = (bx + by + f) % 5 === 0 ? 11 : 10;
            }
          }
        }
      }
    }

    const swingAngle = Math.sin(t * Math.PI * 2);
    const spideyX = Math.round(W * 0.5 + swingAngle * 110);
    const spideyY = Math.round(52 + Math.abs(swingAngle) * 32);
    const webAnchorX = Math.round(W * 0.5 + (swingAngle > 0 ? 90 : -90));
    const webAnchorY = 5;

    const handX = spideyX + (swingAngle > 0 ? -12 : 12);
    const handY = spideyY - 14;
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const wx = Math.round(webAnchorX + (handX - webAnchorX) * (s / steps));
      const wy = Math.round(webAnchorY + (handY - webAnchorY) * (s / steps));
      if (wx >= 0 && wx < W && wy >= 0 && wy < H) {
        data[wy * W + wx] = 7;
        if (wy + 1 < H) data[(wy + 1) * W + wx] = 8;
      }
    }

    for (let dy = -18; dy <= 22; dy++) {
      for (let dx = -18; dx <= 18; dx++) {
        const px = spideyX + dx, py = spideyY + dy;
        if (px < 0 || px >= W || py < 0 || py >= H) continue;

        const distHead = Math.hypot(dx, dy + 8);
        const distTorso = Math.hypot(dx, dy - 4);

        if (distHead <= 9) {
          data[py * W + px] = 4;
          const eyeL = Math.hypot(dx + 3.5, dy + 8);
          const eyeR = Math.hypot(dx - 3.5, dy + 8);
          if (eyeL <= 3.2 || eyeR <= 3.2) data[py * W + px] = 9;
        } else if (distTorso <= 11) {
          if (Math.abs(dx) > 5) {
            data[py * W + px] = 15;
          } else {
            data[py * W + px] = 5;
            if (Math.abs(dx) <= 2 && Math.abs(dy - 4) <= 3) data[py * W + px] = 0;
          }
        }
        const legAngle = swingAngle * 0.8;
        const leg1Dist = Math.hypot(dx - Math.sin(legAngle) * 12, dy - 16);
        const leg2Dist = Math.hypot(dx + Math.sin(legAngle) * 10, dy - 15);
        if (leg1Dist <= 4.5 || leg2Dist <= 4.5) data[py * W + px] = 15;
      }
    }

    for (let p = 0; p < 18; p++) {
      const sparkX = Math.round((spideyX + Math.sin(t * 10 + p) * 60 + W) % W);
      const sparkY = Math.round((spideyY + Math.cos(t * 8 + p) * 35 + H) % H);
      if (sparkX >= 0 && sparkX < W && sparkY >= 0 && sparkY < H) {
        data[sparkY * W + sparkX] = p % 2 === 0 ? 7 : 4;
      }
    }

    gif.addFrame(0, 0, W, H, data, { palette, delay: DELAY });
  }

  const res = buffer.slice(0, gif.end());
  saveToAll('banners/banner_spider_city.gif', res);
  saveToAll('banners/banner_spiderman.gif', res);
  console.log('✅ Created banner_spider_city.gif & banner_spiderman.gif');
}

// RUN ALL
makeCyberForestGif();
makeMidnightStarGif();
makeSolarPhoenixGif();
makeHadesFlameGif();
makeSpiderManGif();

console.log('🎉 Generated all 5 animated GIFs successfully!');
