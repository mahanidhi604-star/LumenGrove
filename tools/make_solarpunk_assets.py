import math
from PIL import Image, ImageDraw

# 1. Process Solarpunk Dome from reference image
img = Image.open('solarpunk-ref.jpg').convert('RGBA')
w, h = img.size

# Crop dome
dome_crop = img.crop((290, 155, 690, 680))
dw, dh = dome_crop.size

# Mask into an elegant arch
mask = Image.new('L', (dw, dh), 0)
draw = ImageDraw.Draw(mask)
# Top circle
draw.pieslice([0, 0, dw, dw], 180, 360, fill=255)
# Bottom rectangle
draw.rectangle([0, dw // 2, dw, dh], fill=255)

dome_arch = Image.new('RGBA', (dw, dh), (0, 0, 0, 0))
dome_arch.paste(dome_crop, (0, 0), mask=mask)

dome_arch.save('public/solarpunk-arch.png')
dome_arch.save('solarpunk-arch.png')
print('Saved solarpunk-arch.png:', dw, dh)

# 2. Generate precision Solarpunk Astrolabe Dial SVG
def generate_astrolabe_svg(size=220):
    cx, cy = size / 2, size / 2
    svg = []
    svg.append(f'<svg class="solarpunk-astrolabe" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">')
    
    # Defs
    svg.append('<defs>')
    svg.append('  <radialGradient id="solarGlow" cx="50%" cy="50%" r="50%">')
    svg.append('    <stop offset="0%" stop-color="var(--ac)" stop-opacity="0.35"/>')
    svg.append('    <stop offset="50%" stop-color="var(--ac)" stop-opacity="0.1"/>')
    svg.append('    <stop offset="100%" stop-color="var(--ac)" stop-opacity="0"/>')
    svg.append('  </radialGradient>')
    svg.append('</defs>')
    
    # Ambient Solar Core Glow
    svg.append(f'  <circle cx="{cx}" cy="{cy}" r="{cx * 0.85:.1f}" fill="url(#solarGlow)" class="astrolabe-glow"/>')
    
    # Outer Rotating Ring (Clockwise, 60s)
    svg.append('  <g class="astrolabe-outer-ring">')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="{cx - 6:.1f}" fill="none" stroke="var(--ln)" stroke-width="1" opacity="0.45"/>')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="{cx - 12:.1f}" fill="none" stroke="var(--ac)" stroke-width="1.5" opacity="0.8"/>')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="{cx - 20:.1f}" fill="none" stroke="var(--ln)" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.6"/>')
    
    # 36 precision tick marks
    for i in range(36):
        angle = math.radians(i * 10)
        is_major = (i % 3 == 0)
        r_out = cx - 12
        r_in = cx - 20 if is_major else cx - 16
        x1 = cx + r_out * math.cos(angle)
        y1 = cy + r_out * math.sin(angle)
        x2 = cx + r_in * math.cos(angle)
        y2 = cy + r_in * math.sin(angle)
        sw = '1.4' if is_major else '0.7'
        sc = 'var(--ac)' if is_major else 'var(--ln)'
        op = '0.9' if is_major else '0.45'
        svg.append(f'    <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{sc}" stroke-width="{sw}" opacity="{op}"/>')
        
    # Planetary orbital nodes
    for deg in [20, 110, 215, 305]:
        rad = math.radians(deg)
        nx = cx + (cx - 20) * math.cos(rad)
        ny = cy + (cx - 20) * math.sin(rad)
        svg.append(f'    <circle cx="{nx:.1f}" cy="{ny:.1f}" r="2.5" fill="var(--ac)"/>')
        svg.append(f'    <circle cx="{nx:.1f}" cy="{ny:.1f}" r="5" fill="none" stroke="var(--ac)" stroke-width="0.75" opacity="0.7"/>')
    svg.append('  </g>')
    
    # Sunburst Gear (Counter-Clockwise, 36s)
    svg.append('  <g class="astrolabe-sunburst-gear">')
    teeth = 18
    r_base = 62
    r_tip = 75
    points = []
    for i in range(teeth):
        step = 360.0 / teeth
        a1 = math.radians(i * step)
        a2 = math.radians((i + 0.35) * step)
        a3 = math.radians((i + 0.55) * step)
        a4 = math.radians((i + 0.9) * step)
        points.append(f'{cx + r_base * math.cos(a1):.1f},{cy + r_base * math.sin(a1):.1f}')
        points.append(f'{cx + r_tip * math.cos(a2):.1f},{cy + r_tip * math.sin(a2):.1f}')
        points.append(f'{cx + r_tip * math.cos(a3):.1f},{cy + r_tip * math.sin(a3):.1f}')
        points.append(f'{cx + r_base * math.cos(a4):.1f},{cy + r_base * math.sin(a4):.1f}')
    pts_str = ' '.join(points)
    svg.append(f'    <polygon points="{pts_str}" fill="none" stroke="var(--ac)" stroke-width="1.3" opacity="0.85"/>')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="{r_base:.1f}" fill="none" stroke="var(--ln)" stroke-width="1" opacity="0.5"/>')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="48" fill="none" stroke="var(--ac2)" stroke-width="1" stroke-dasharray="4 4" opacity="0.65"/>')
    
    # Spokes
    for i in range(8):
        sa = math.radians(i * 45)
        sx1 = cx + 22 * math.cos(sa)
        sy1 = cy + 22 * math.sin(sa)
        sx2 = cx + 48 * math.cos(sa)
        sy2 = cy + 48 * math.sin(sa)
        svg.append(f'    <line x1="{sx1:.1f}" y1="{sy1:.1f}" x2="{sx2:.1f}" y2="{sy2:.1f}" stroke="var(--ln)" stroke-width="0.9" opacity="0.6"/>')
    svg.append('  </g>')
    
    # Central Solar Hub & Crosshair
    svg.append('  <g class="astrolabe-core">')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="22" fill="none" stroke="var(--ac)" stroke-width="1.4"/>')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="14" fill="none" stroke="var(--ln)" stroke-width="0.9" stroke-dasharray="2 2"/>')
    svg.append(f'    <circle cx="{cx}" cy="{cy}" r="7" fill="var(--ac)" class="astrolabe-core-dot"/>')
    svg.append(f'    <line x1="{cx-26:.1f}" y1="{cy:.1f}" x2="{cx-9:.1f}" y2="{cy:.1f}" stroke="var(--ac)" stroke-width="1"/>')
    svg.append(f'    <line x1="{cx+9:.1f}" y1="{cy:.1f}" x2="{cx+26:.1f}" y2="{cy:.1f}" stroke="var(--ac)" stroke-width="1"/>')
    svg.append(f'    <line x1="{cx:.1f}" y1="{cy-26:.1f}" x2="{cx:.1f}" y2="{cy-9:.1f}" stroke="var(--ac)" stroke-width="1"/>')
    svg.append(f'    <line x1="{cx:.1f}" y1="{cy+9:.1f}" x2="{cx:.1f}" y2="{cy+26:.1f}" stroke="var(--ac)" stroke-width="1"/>')
    svg.append('  </g>')
    
    svg.append('</svg>')
    return '\n'.join(svg)

svg_str = generate_astrolabe_svg(220)
with open('public/solarpunk-astrolabe.svg', 'w') as f:
    f.write(svg_str)
with open('solarpunk-astrolabe.svg', 'w') as f:
    f.write(svg_str)
print('Generated solarpunk-astrolabe.svg, length:', len(svg_str))
