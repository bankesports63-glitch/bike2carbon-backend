const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../assets/rewards');
const webDir = path.join(__dirname, '../../web/assets/rewards');

[dir, webDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// SVG artwork for each reward
const svgs = {
  'bike_rental.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_bike" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00FF87"/>
        <stop offset="50%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#064E3B"/>
      </linearGradient>
      <filter id="glow_bike" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_bike)"/>
    <circle cx="64" cy="64" r="50" fill="#070B0E" opacity="0.4"/>
    <!-- Bicycle Wheels -->
    <circle cx="42" cy="74" r="16" stroke="#00FF87" stroke-width="4" fill="#111827" filter="url(#glow_bike)"/>
    <circle cx="42" cy="74" r="5" fill="#00FF87"/>
    <circle cx="86" cy="74" r="16" stroke="#00FF87" stroke-width="4" fill="#111827" filter="url(#glow_bike)"/>
    <circle cx="86" cy="74" r="5" fill="#00FF87"/>
    <!-- Bike Frame -->
    <path d="M42 74 L60 74 L74 54 L52 54 Z" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round" fill="none"/>
    <path d="M60 74 L54 44" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
    <path d="M86 74 L72 44 L80 44" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
    <path d="M48 44 L58 44" stroke="#00FF87" stroke-width="5" stroke-linecap="round"/>
    <!-- 1 Day Badge -->
    <rect x="74" y="16" width="42" height="20" rx="8" fill="#FFD700"/>
    <text x="95" y="30" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#000" text-anchor="middle">1-DAY</text>
  </svg>`,

  'cafe_amazon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_amazon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064E3B"/>
        <stop offset="50%" stop-color="#D97706"/>
        <stop offset="100%" stop-color="#451A03"/>
      </linearGradient>
      <linearGradient id="cup_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FEF3C7"/>
        <stop offset="100%" stop-color="#F59E0B"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_amazon)"/>
    <circle cx="64" cy="64" r="50" fill="#000" opacity="0.3"/>
    <!-- Coffee Cup -->
    <path d="M42 46 L86 46 L80 94 C79 98 75 102 70 102 L58 102 C53 102 49 98 48 94 Z" fill="url(#cup_grad)"/>
    <rect x="38" y="42" width="52" height="7" rx="3.5" fill="#FFF"/>
    <!-- Amazon Leaf Logo -->
    <circle cx="64" cy="72" r="14" fill="#047857"/>
    <path d="M64 64 C70 68 70 76 64 80 C58 76 58 68 64 64 Z" fill="#34D399"/>
    <!-- Steam Curves -->
    <path d="M52 34 C50 28 54 24 52 18" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8"/>
    <path d="M64 32 C62 26 66 22 64 16" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9"/>
    <path d="M76 34 C74 28 78 24 76 18" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8"/>
    <!-- 30฿ Badge -->
    <rect x="76" y="16" width="38" height="20" rx="8" fill="#00FF87"/>
    <text x="95" y="30" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#000" text-anchor="middle">-30฿</text>
  </svg>`,

  'grab_voucher.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_grab" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00B14F"/>
        <stop offset="50%" stop-color="#059669"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_grab)"/>
    <circle cx="64" cy="64" r="50" fill="#000" opacity="0.3"/>
    <!-- Car Body -->
    <path d="M36 78 L92 78 C96 78 98 75 96 70 L90 56 C88 52 84 50 78 50 L50 50 C44 50 40 52 38 56 L32 70 C30 75 32 78 36 78 Z" fill="#FFFFFF"/>
    <!-- Car Windows -->
    <path d="M42 54 L58 54 L58 66 L38 66 Z" fill="#0F172A"/>
    <path d="M64 54 L86 54 L90 66 L64 66 Z" fill="#0F172A"/>
    <!-- Wheels -->
    <circle cx="44" cy="82" r="9" fill="#1E293B" stroke="#00FF87" stroke-width="2"/>
    <circle cx="84" cy="82" r="9" fill="#1E293B" stroke="#00FF87" stroke-width="2"/>
    <!-- Headlights -->
    <circle cx="34" cy="72" r="3" fill="#FDE047"/>
    <circle cx="94" cy="72" r="3" fill="#FDE047"/>
    <!-- 50฿ Badge -->
    <rect x="76" y="16" width="38" height="20" rx="8" fill="#FFD700"/>
    <text x="95" y="30" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#000" text-anchor="middle">-50฿</text>
  </svg>`,

  'tree_planting.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_tree" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="50%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#064E3B"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_tree)"/>
    <circle cx="64" cy="64" r="50" fill="#000" opacity="0.3"/>
    <!-- Pot / Soil -->
    <path d="M46 84 L82 84 L78 104 C77 106 75 108 72 108 L56 108 C53 108 51 106 50 104 Z" fill="#B45309"/>
    <rect x="42" y="80" width="44" height="6" rx="3" fill="#D97706"/>
    <!-- Tree Trunk -->
    <rect x="61" y="60" width="6" height="24" rx="2" fill="#78350F"/>
    <!-- Tree Leaves (Lush Sprout) -->
    <circle cx="64" cy="46" r="22" fill="#34D399"/>
    <circle cx="50" cy="52" r="16" fill="#10B981"/>
    <circle cx="78" cy="52" r="16" fill="#059669"/>
    <circle cx="64" cy="38" r="15" fill="#6EE7B7"/>
    <!-- Sunbeam / Eco sparkle -->
    <circle cx="86" cy="30" r="4" fill="#FFD700"/>
    <circle cx="40" cy="36" r="3" fill="#FFF"/>
    <!-- 1 Tree Badge -->
    <rect x="74" y="16" width="42" height="20" rx="8" fill="#FFD700"/>
    <text x="95" y="30" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#000" text-anchor="middle">1 TREE</text>
  </svg>`,

  'probike_shop.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_probike" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#DC2626"/>
        <stop offset="50%" stop-color="#991B1B"/>
        <stop offset="100%" stop-color="#18181B"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_probike)"/>
    <circle cx="64" cy="64" r="50" fill="#000" opacity="0.3"/>
    <!-- Chainring / Cog Gear -->
    <circle cx="64" cy="64" r="28" stroke="#F59E0B" stroke-width="6" fill="#27272A" stroke-dasharray="8, 4"/>
    <circle cx="64" cy="64" r="14" fill="#F59E0B"/>
    <circle cx="64" cy="64" r="6" fill="#18181B"/>
    <!-- Crossed Wrenches / Bike Pedals -->
    <path d="M44 44 L84 84" stroke="#FFF" stroke-width="5" stroke-linecap="round"/>
    <path d="M84 44 L44 84" stroke="#FFF" stroke-width="5" stroke-linecap="round"/>
    <!-- 100฿ Badge -->
    <rect x="70" y="16" width="46" height="20" rx="8" fill="#FFD700"/>
    <text x="93" y="30" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#000" text-anchor="middle">-100฿</text>
  </svg>`,

  'eco_shirt.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_shirt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284C7"/>
        <stop offset="50%" stop-color="#0369A1"/>
        <stop offset="100%" stop-color="#075985"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_shirt)"/>
    <circle cx="64" cy="64" r="50" fill="#000" opacity="0.3"/>
    <!-- T-Shirt Body -->
    <path d="M48 38 L30 50 L38 64 L46 58 L46 96 L82 96 L82 58 L90 64 L98 50 L80 38 C76 44 52 44 48 38 Z" fill="#00FF87"/>
    <!-- Collar & Stripe -->
    <path d="M52 38 C56 44 72 44 76 38" stroke="#0F172A" stroke-width="3" fill="none"/>
    <rect x="46" y="66" width="36" height="8" fill="#0F172A"/>
    <!-- Eco Logo on chest -->
    <circle cx="64" cy="54" r="4" fill="#0F172A"/>
    <!-- ECO Badge -->
    <rect x="74" y="16" width="42" height="20" rx="8" fill="#FFD700"/>
    <text x="95" y="30" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#000" text-anchor="middle">ECO</text>
  </svg>`,

  'water_bottle.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="bg_bottle" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366F1"/>
        <stop offset="50%" stop-color="#4338CA"/>
        <stop offset="100%" stop-color="#1E1B4B"/>
      </linearGradient>
      <linearGradient id="steel" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E2E8F0"/>
        <stop offset="50%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#94A3B8"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#bg_bottle)"/>
    <circle cx="64" cy="64" r="50" fill="#000" opacity="0.3"/>
    <!-- Bottle Cap -->
    <rect x="58" y="28" width="12" height="10" rx="3" fill="#00FF87"/>
    <rect x="54" y="38" width="20" height="8" rx="2" fill="#334155"/>
    <!-- Bottle Body -->
    <rect x="50" y="46" width="28" height="54" rx="8" fill="url(#steel)"/>
    <!-- Grip Ring & Logo -->
    <rect x="50" y="62" width="28" height="12" fill="#00FF87"/>
    <path d="M58 68 L70 68" stroke="#000" stroke-width="2" stroke-linecap="round"/>
    <!-- Cold Frost Badge -->
    <rect x="74" y="16" width="42" height="20" rx="8" fill="#60EFFF"/>
    <text x="95" y="30" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#000" text-anchor="middle">24H COLD</text>
  </svg>`
};

for (const [filename, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(dir, filename), content);
  fs.writeFileSync(path.join(webDir, filename), content);
}

console.log('Created all reward vector artworks successfully!');
