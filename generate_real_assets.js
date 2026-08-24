const fs = require('fs');
const path = require('path');
const { GifWriter } = require('omggif');
const { PNG } = require('pngjs');

// Ensure output directories exist
const dirs = [
  path.join(__dirname, 'public/banners'),
  path.join(__dirname, 'public/rewards'),
  path.join(__dirname, '../assets/banners'),
  path.join(__dirname, '../assets/rewards'),
  path.join(__dirname, '../web/assets/banners'),
  path.join(__dirname, '../web/assets/rewards'),
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Helper to save buffer to multiple paths
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
// 1. GENERATE SPIDER-MAN ANIMATED GIF BANNER (Swinging Web Cyberpunk GIF)
// -----------------------------------------------------------------------------
function generateSpiderManGif() {
  const width = 360;
  const height = 150;
  const numFrames = 24;
  const delay = 6; // 6 * 10ms = 60ms (~16 fps)

  const buffer = Buffer.alloc(width * height * numFrames * 5);
  const gifWriter = new GifWriter(buffer, width, height, { loop: 0 });

  // 256 Color Palette (Cyber Spiderman theme: deep dark navy/black, neon red, cyan, yellow, white)
  const palette = [];
  palette.push(0x0a0a14); // 0: Dark Sky
  palette.push(0x121324); // 1: City Dark
  palette.push(0x1a1c36); // 2: Building
  palette.push(0x2d1b4e); // 3: Purple building
  palette.push(0xff0055); // 4: Neon Crimson / Red
  palette.push(0xd90429); // 5: Deep Red
  palette.push(0xff3366); // 6: Bright Pink Red
  palette.push(0x00f0ff); // 7: Cyber Cyan Web
  palette.push(0x00a8ff); // 8: Web Glow
  palette.push(0xffffff); // 9: White Eyes / Spark
  palette.push(0xffd700); // 10: Gold Light
  palette.push(0xffb703); // 11: City Window Orange
  palette.push(0x00ff87); // 12: Neon Green Accent
  palette.push(0x3a0ca3); // 13: Neon Violet
  palette.push(0x7209b7); // 14: Magenta
  palette.push(0x4361ee); // 15: Cyber Blue

  // Fill remainder of palette with smooth color blends
  for (let i = 16; i < 256; i++) {
    const r = (i * 7) % 256;
    const g = (i * 13) % 256;
    const b = (i * 17) % 256;
    palette.push((r << 16) | (g << 8) | b);
  }

  for (let f = 0; f < numFrames; f++) {
    const frameData = new Uint8Array(width * height);
    const t = f / numFrames; // 0 to 1

    // Background Gradient + Cyber Buildings
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bgIdx = y < height * 0.4 ? 0 : (y < height * 0.7 ? 1 : 2);
        frameData[y * width + x] = bgIdx;
      }
    }

    // Draw Cyberpunk City Buildings Silhouette
    const buildings = [
      { x: 10, w: 45, h: 90 },
      { x: 60, w: 35, h: 110 },
      { x: 105, w: 50, h: 75 },
      { x: 165, w: 40, h: 120 },
      { x: 215, w: 55, h: 85 },
      { x: 280, w: 40, h: 105 },
      { x: 330, w: 30, h: 95 },
    ];

    for (const b of buildings) {
      for (let by = height - b.h; by < height; by++) {
        for (let bx = b.x; bx < b.x + b.w && bx < width; bx++) {
          if (bx >= 0 && by >= 0) {
            frameData[by * width + bx] = 3;
            // Windows
            if ((bx % 8 >= 2 && bx % 8 <= 5) && (by % 14 >= 3 && by % 14 <= 7)) {
              const winColor = (bx + by + f) % 5 === 0 ? 11 : 10;
              frameData[by * width + bx] = winColor;
            }
          }
        }
      }
    }

    // Spider-Man Swinging Motion Path (Sine Arc)
    const swingAngle = Math.sin(t * Math.PI * 2);
    const spideyX = Math.round(width * 0.5 + swingAngle * 110);
    const spideyY = Math.round(55 + Math.abs(swingAngle) * 35);
    const webAnchorX = Math.round(width * 0.5 + (swingAngle > 0 ? 90 : -90));
    const webAnchorY = 5;

    // Draw Glowing Cyber Web Line from Anchor to Spider-Man Hand
    const handX = spideyX + (swingAngle > 0 ? -12 : 12);
    const handY = spideyY - 14;
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const wx = Math.round(webAnchorX + (handX - webAnchorX) * (s / steps));
      const wy = Math.round(webAnchorY + (handY - webAnchorY) * (s / steps));
      if (wx >= 0 && wx < width && wy >= 0 && wy < height) {
        frameData[wy * width + wx] = 7; // Bright Cyan Web
        if (wy + 1 < height) frameData[(wy + 1) * width + wx] = 8;
      }
    }

    // Draw Spider-Man Silhouette & Glowing Suit (Body, Head, Mask Eyes)
    for (let dy = -18; dy <= 22; dy++) {
      for (let dx = -18; dx <= 18; dx++) {
        const px = spideyX + dx;
        const py = spideyY + dy;
        if (px < 0 || px >= width || py < 0 || py >= height) continue;

        const distHead = Math.sqrt(dx * dx + (dy + 8) * (dy + 8));
        const distTorso = Math.sqrt(dx * dx + (dy - 4) * (dy - 4));

        // Head
        if (distHead <= 9) {
          frameData[py * width + px] = 4; // Crimson Red Mask
          // Glowing Spidey White/Cyan Eyes
          const eyeL = Math.sqrt((dx + 3.5) * (dx + 3.5) + (dy + 8) * (dy + 8));
          const eyeR = Math.sqrt((dx - 3.5) * (dx - 3.5) + (dy + 8) * (dy + 8));
          if (eyeL <= 3.2 || eyeR <= 3.2) {
            frameData[py * width + px] = 9; // White Glowing Eyes
          }
        }
        // Torso / Suit
        else if (distTorso <= 11) {
          // Spider Suit Blue / Red / Black pattern
          if (Math.abs(dx) > 5) {
            frameData[py * width + px] = 15; // Cyber Blue suit sides
          } else {
            frameData[py * width + px] = 5; // Red Chest
            // Chest Spider Icon
            if (Math.abs(dx) <= 2 && Math.abs(dy - 4) <= 3) {
              frameData[py * width + px] = 0; // Black spider emblem
            }
          }
        }
        // Legs in dynamic acrobatic swing pose
        const legAngle = swingAngle * 0.8;
        const leg1Dist = Math.sqrt((dx - Math.sin(legAngle) * 12) ** 2 + (dy - 16) ** 2);
        const leg2Dist = Math.sqrt((dx + Math.sin(legAngle) * 10) ** 2 + (dy - 15) ** 2);
        if (leg1Dist <= 4.5 || leg2Dist <= 4.5) {
          frameData[py * width + px] = 15; // Blue legs
        }
      }
    }

    // Glowing Neon Sparks & Floating Web Particles
    for (let p = 0; p < 18; p++) {
      const sparkX = Math.round((spideyX + Math.sin(t * 10 + p) * 60 + width) % width);
      const sparkY = Math.round((spideyY + Math.cos(t * 8 + p) * 35 + height) % height);
      if (sparkX >= 0 && sparkX < width && sparkY >= 0 && sparkY < height) {
        frameData[sparkY * width + sparkX] = p % 2 === 0 ? 7 : 4;
      }
    }

    gifWriter.addFrame(0, 0, width, height, frameData, { palette, delay });
  }

  const gifLength = gifWriter.end();
  const finalGif = buffer.slice(0, gifLength);
  saveToAll('banners/banner_spider_city.gif', finalGif);
  saveToAll('banners/banner_spiderman.gif', finalGif);
  console.log('✅ Created banner_spiderman.gif successfully!');
}

// -----------------------------------------------------------------------------
// 2. GENERATE HIGH DEFINITION REWARD PNG IMAGES
// -----------------------------------------------------------------------------
function generateRewardPngs() {
  const size = 160;

  const rewards = [
    {
      filename: 'reward_bike_rental.png',
      bg1: [0, 255, 135],
      bg2: [5, 150, 105],
      draw(png) {
        // Draw 3D Bicycle
        drawCircle(png, 48, 100, 24, [0, 255, 135], [7, 11, 14]); // Left Wheel
        drawCircle(png, 112, 100, 24, [0, 255, 135], [7, 11, 14]); // Right Wheel
        drawLine(png, 48, 100, 78, 100, [255, 255, 255], 5);
        drawLine(png, 78, 100, 102, 65, [255, 255, 255], 5);
        drawLine(png, 102, 65, 62, 65, [255, 255, 255], 5);
        drawLine(png, 62, 65, 48, 100, [255, 255, 255], 5);
        drawLine(png, 78, 100, 68, 52, [255, 255, 255], 5); // Seat post
        drawLine(png, 112, 100, 96, 50, [255, 255, 255], 5); // Handle post
        drawLine(png, 58, 52, 78, 52, [0, 255, 135], 6); // Saddle
        drawLine(png, 88, 50, 106, 50, [0, 255, 135], 6); // Handlebar
        // Badge
        drawBadge(png, 95, 22, '1-DAY', [255, 215, 0], [0, 0, 0]);
      }
    },
    {
      filename: 'reward_cafe_amazon.png',
      bg1: [4, 120, 87],
      bg2: [120, 53, 15],
      draw(png) {
        // Coffee Cup
        drawPolygon(png, [
          [52, 55], [108, 55], [98, 125], [62, 125]
        ], [254, 243, 199]);
        drawRect(png, 48, 50, 64, 9, [255, 255, 255]); // Cup rim
        drawCircle(png, 80, 90, 18, [4, 120, 87], [4, 120, 87]); // Amazon Green Emblem
        drawCircle(png, 80, 90, 10, [52, 211, 153], [52, 211, 153]); // Leaf
        // Steam curves
        drawLine(png, 66, 42, 64, 25, [255, 255, 255], 3);
        drawLine(png, 80, 38, 78, 20, [255, 255, 255], 3);
        drawLine(png, 94, 42, 92, 25, [255, 255, 255], 3);
        // Badge
        drawBadge(png, 95, 22, '-30฿', [0, 255, 135], [0, 0, 0]);
      }
    },
    {
      filename: 'reward_grab_voucher.png',
      bg1: [0, 177, 79],
      bg2: [15, 23, 42],
      draw(png) {
        // Grab Electric Car
        drawPolygon(png, [
          [35, 105], [125, 105], [120, 75], [105, 55], [55, 55], [40, 75]
        ], [255, 255, 255]);
        // Windows
        drawPolygon(png, [
          [58, 60], [78, 60], [78, 75], [46, 75]
        ], [15, 23, 42]);
        drawPolygon(png, [
          [84, 60], [102, 60], [114, 75], [84, 75]
        ], [15, 23, 42]);
        // Wheels
        drawCircle(png, 55, 110, 14, [0, 255, 135], [15, 23, 42]);
        drawCircle(png, 105, 110, 14, [0, 255, 135], [15, 23, 42]);
        // Headlights
        drawCircle(png, 38, 92, 5, [253, 224, 71], [253, 224, 71]);
        drawCircle(png, 122, 92, 5, [253, 224, 71], [253, 224, 71]);
        // Badge
        drawBadge(png, 95, 22, '-50฿', [255, 215, 0], [0, 0, 0]);
      }
    },
    {
      filename: 'reward_tree_planting.png',
      bg1: [16, 185, 129],
      bg2: [6, 78, 59],
      draw(png) {
        // Pot
        drawPolygon(png, [
          [55, 105], [105, 105], [98, 135], [62, 135]
        ], [180, 83, 9]);
        drawRect(png, 50, 100, 60, 8, [217, 119, 6]);
        // Trunk
        drawRect(png, 76, 70, 8, 32, [120, 53, 15]);
        // Foliage Lush Circles
        drawCircle(png, 80, 52, 28, [52, 211, 153], [16, 185, 129]);
        drawCircle(png, 60, 60, 20, [16, 185, 129], [5, 150, 105]);
        drawCircle(png, 100, 60, 20, [5, 150, 105], [4, 120, 87]);
        drawCircle(png, 80, 42, 18, [110, 231, 183], [52, 211, 153]);
        // Sun Spark
        drawCircle(png, 115, 35, 6, [255, 215, 0], [255, 215, 0]);
        // Badge
        drawBadge(png, 95, 22, '1 TREE', [255, 215, 0], [0, 0, 0]);
      }
    },
    {
      filename: 'reward_probike_shop.png',
      bg1: [220, 38, 38],
      bg2: [24, 24, 27],
      draw(png) {
        // Chainring Gear
        drawCircle(png, 80, 85, 36, [245, 158, 11], [39, 39, 42]);
        drawCircle(png, 80, 85, 18, [245, 158, 11], [24, 24, 27]);
        drawCircle(png, 80, 85, 8, [245, 158, 11], [245, 158, 11]);
        // Crossed Tools
        drawLine(png, 55, 60, 105, 110, [255, 255, 255], 6);
        drawLine(png, 105, 60, 55, 110, [255, 255, 255], 6);
        // Badge
        drawBadge(png, 90, 22, '-100฿', [255, 215, 0], [0, 0, 0]);
      }
    },
    {
      filename: 'reward_eco_shirt.png',
      bg1: [2, 132, 199],
      bg2: [7, 89, 133],
      draw(png) {
        // T-Shirt
        drawPolygon(png, [
          [60, 50], [35, 65], [45, 85], [58, 78], [58, 130], [102, 130], [102, 78], [115, 85], [125, 65], [100, 50]
        ], [0, 255, 135]);
        // Collar & stripes
        drawCircle(png, 80, 50, 10, [15, 23, 42], [15, 23, 42]);
        drawRect(png, 58, 90, 44, 10, [15, 23, 42]);
        // Badge
        drawBadge(png, 95, 22, 'ECO', [255, 215, 0], [0, 0, 0]);
      }
    },
    {
      filename: 'reward_water_bottle.png',
      bg1: [99, 102, 241],
      bg2: [30, 27, 75],
      draw(png) {
        // Bottle Cap
        drawRect(png, 72, 40, 16, 12, [0, 255, 135]);
        drawRect(png, 66, 52, 28, 10, [51, 65, 85]);
        // Bottle Body
        drawPolygon(png, [
          [62, 62], [98, 62], [98, 130], [62, 130]
        ], [241, 245, 249]);
        // Grip & Logo
        drawRect(png, 62, 85, 36, 16, [0, 255, 135]);
        // Badge
        drawBadge(png, 95, 22, '24H COLD', [96, 239, 255], [0, 0, 0]);
      }
    }
  ];

  for (const rew of rewards) {
    const png = new PNG({ width: size, height: size });

    // Background Gradient with rounded aesthetics
    for (let y = 0; y < size; y++) {
      const t = y / size;
      const r = Math.round(rew.bg1[0] * (1 - t) + rew.bg2[0] * t);
      const g = Math.round(rew.bg1[1] * (1 - t) + rew.bg2[1] * t);
      const b = Math.round(rew.bg1[2] * (1 - t) + rew.bg2[2] * t);

      for (let x = 0; x < size; x++) {
        const idx = (size * y + x) << 2;
        // Rounded corner mask (radius 32)
        const cornerDist = getCornerDist(x, y, size, 32);
        if (cornerDist > 1) {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 0;
        } else {
          // Add subtle dark inner vignette
          const innerDist = Math.hypot(x - size/2, y - size/2) / (size * 0.7);
          const factor = Math.max(0.3, 1 - innerDist * 0.5);
          png.data[idx] = Math.round(r * factor);
          png.data[idx + 1] = Math.round(g * factor);
          png.data[idx + 2] = Math.round(b * factor);
          png.data[idx + 3] = 255;
        }
      }
    }

    rew.draw(png);

    const buffer = PNG.sync.write(png);
    saveToAll(`rewards/${rew.filename}`, buffer);
    console.log(`✅ Created ${rew.filename}`);
  }
}

// -----------------------------------------------------------------------------
// Graphic Primitives for PNG
// -----------------------------------------------------------------------------
function getCornerDist(x, y, size, r) {
  let cx = x < r ? r : (x > size - r ? size - r : x);
  let cy = y < r ? r : (y > size - r ? size - r : y);
  if (cx === x && cy === y) return 0;
  return Math.hypot(x - cx, y - cy) / r;
}

function drawCircle(png, cx, cy, r, borderColor, fillColor) {
  for (let y = cy - r - 2; y <= cy + r + 2; y++) {
    for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      if (x < 0 || x >= png.width || y < 0 || y >= png.height) continue;
      const d = Math.hypot(x - cx, y - cy);
      const idx = (png.width * y + x) << 2;
      if (d <= r - 3) {
        png.data[idx] = fillColor[0];
        png.data[idx + 1] = fillColor[1];
        png.data[idx + 2] = fillColor[2];
        png.data[idx + 3] = 255;
      } else if (d <= r) {
        png.data[idx] = borderColor[0];
        png.data[idx + 1] = borderColor[1];
        png.data[idx + 2] = borderColor[2];
        png.data[idx + 3] = 255;
      }
    }
  }
}

function drawRect(png, rx, ry, rw, rh, color) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || x >= png.width || y < 0 || y >= png.height) continue;
      const idx = (png.width * y + x) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = 255;
    }
  }
}

function drawLine(png, x1, y1, x2, y2, color, thickness = 2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(dist * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(x1 + (x2 - x1) * t);
    const py = Math.round(y1 + (y2 - y1) * t);
    for (let dy = -thickness; dy <= thickness; dy++) {
      for (let dx = -thickness; dx <= thickness; dx++) {
        if (Math.hypot(dx, dy) <= thickness) {
          const x = px + dx;
          const y = py + dy;
          if (x >= 0 && x < png.width && y >= 0 && y < png.height) {
            const idx = (png.width * y + x) << 2;
            png.data[idx] = color[0];
            png.data[idx + 1] = color[1];
            png.data[idx + 2] = color[2];
            png.data[idx + 3] = 255;
          }
        }
      }
    }
  }
}

function drawPolygon(png, points, color) {
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPoly(x, y, points)) {
        if (x >= 0 && x < png.width && y >= 0 && y < png.height) {
          const idx = (png.width * y + x) << 2;
          png.data[idx] = color[0];
          png.data[idx + 1] = color[1];
          png.data[idx + 2] = color[2];
          png.data[idx + 3] = 255;
        }
      }
    }
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function drawBadge(png, bx, by, text, bgColor, textColor) {
  const bw = 54, bh = 22;
  drawRect(png, bx - 2, by - 2, bw + 4, bh + 4, [0, 0, 0]); // shadow
  drawRect(png, bx, by, bw, bh, bgColor);
}

// RUN GENERATION
generateSpiderManGif();
generateRewardPngs();
