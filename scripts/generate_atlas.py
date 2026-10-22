import os
import json
import math
from PIL import Image, ImageDraw

TILE_SIZE = 32
COLS = 4
ROWS = 3
WIDTH = COLS * TILE_SIZE
HEIGHT = ROWS * TILE_SIZE

def create_atlas():
    os.makedirs("web/assets", exist_ok=True)
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. GROUND_PLAIN (0, 0)
    # Iron-red martian regolith with subtle micro-craters and pebble specks
    ox, oy = 0, 0
    draw.rectangle([ox, oy, ox + 31, oy + 31], fill=(181, 68, 26, 255))
    # Subtle surface variations & grains
    plain_grains = [
        (3, 4, (199, 85, 41)), (4, 4, (155, 52, 17)),
        (12, 8, (207, 98, 51)), (13, 8, (155, 52, 17)),
        (22, 5, (160, 55, 18)), (26, 14, (215, 105, 58)),
        (7, 18, (155, 52, 17)), (15, 23, (200, 88, 42)),
        (25, 25, (150, 48, 14)), (9, 28, (210, 95, 48)),
        (28, 28, (165, 58, 20)), (18, 14, (140, 45, 12))
    ]
    for gx, gy, c in plain_grains:
        draw.point((ox + gx, oy + gy), fill=(*c, 255))
    # Tiny micro-crater
    draw.ellipse([ox + 16, oy + 16, ox + 20, oy + 19], outline=(130, 40, 10, 255), fill=(145, 48, 15, 255))
    draw.arc([ox + 16, oy + 16, ox + 20, oy + 19], start=200, end=340, fill=(215, 100, 52, 255))

    # 2. GROUND_ROUGH (32, 0) - Cost 2
    # Fractured dark basalt rocks, broken stones
    ox, oy = 32, 0
    draw.rectangle([ox, oy, ox + 31, oy + 31], fill=(107, 55, 32, 255))
    # Fractures and stony clusters
    draw.line([ox + 4, oy + 6, ox + 14, oy + 12], fill=(58, 28, 13, 255), width=1)
    draw.line([ox + 14, oy + 12, ox + 26, oy + 8], fill=(45, 20, 8, 255), width=1)
    draw.line([ox + 10, oy + 20, ox + 22, oy + 26], fill=(50, 24, 10, 255), width=1)
    # Basalt stones
    for sx, sy, w, h in [(6, 14, 5, 4), (18, 15, 6, 5), (8, 23, 4, 3), (22, 21, 5, 4)]:
        draw.rectangle([ox + sx, oy + sy, ox + sx + w, oy + sy + h], fill=(138, 76, 46, 255))
        draw.line([ox + sx, oy + sy, ox + sx + w, oy + sy], fill=(175, 105, 68, 255))
        draw.line([ox + sx, oy + sy + h, ox + sx + w, oy + sy + h], fill=(45, 22, 10, 255))

    # 3. GROUND_MUD (64, 0) - Cost 3
    # Dark dense iron-oxide clay, viscous sludge trenches
    ox, oy = 64, 0
    draw.rectangle([ox, oy, ox + 31, oy + 31], fill=(72, 35, 25, 255))
    # Mud ripples and wet trenches
    for my in [6, 14, 22]:
        draw.arc([ox + 4, oy + my, ox + 28, oy + my + 6], start=0, end=180, fill=(35, 15, 10, 255), width=2)
        draw.arc([ox + 6, oy + my + 1, ox + 26, oy + my + 6], start=180, end=360, fill=(110, 58, 42, 255), width=1)
    draw.ellipse([ox + 12, oy + 10, ox + 17, oy + 13], fill=(30, 12, 8, 255))
    draw.point((ox + 14, oy + 11), fill=(160, 95, 75, 255)) # wet specular highlight

    # 4. GROUND_SAND (96, 0) - Cost 5
    # Shifting golden-ochre sand dune drifts and wind ripples
    ox, oy = 96, 0
    draw.rectangle([ox, oy, ox + 31, oy + 31], fill=(201, 114, 58, 255))
    # Smooth sine-wave dune ripples
    for sy in [5, 12, 19, 26]:
        points = []
        for x in range(32):
            wave_y = sy + int(math.sin(x * 0.25) * 2)
            points.append((ox + x, oy + wave_y))
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=(235, 152, 86, 255), width=1)
            draw.line([(points[i][0], points[i][1] + 1), (points[i+1][0], points[i+1][1] + 1)], fill=(145, 75, 32, 255), width=1)

    # 5. ROCK (0, 32) - Impassable Terrain
    # Weathered Martian boulder cluster with sharp chiseled facets
    ox, oy = 0, 32
    # Shadow underneath
    draw.ellipse([ox + 3, oy + 16, ox + 29, oy + 30], fill=(40, 12, 6, 220))
    # Primary boulder polygon
    boulder_poly = [
        (ox + 5, oy + 18), (ox + 8, oy + 10), (ox + 16, oy + 4),
        (ox + 24, oy + 7), (ox + 28, oy + 16), (ox + 26, oy + 24),
        (ox + 18, oy + 27), (ox + 8, oy + 25)
    ]
    draw.polygon(boulder_poly, fill=(95, 34, 18, 255))
    # Facet shading
    facet_lit = [(ox + 8, oy + 10), (ox + 16, oy + 4), (ox + 18, oy + 14), (ox + 10, oy + 17)]
    draw.polygon(facet_lit, fill=(168, 70, 42, 255))
    facet_highlight = [(ox + 16, oy + 4), (ox + 24, oy + 7), (ox + 21, oy + 14), (ox + 18, oy + 14)]
    draw.polygon(facet_highlight, fill=(195, 92, 58, 255))
    facet_shadow = [(ox + 18, oy + 14), (ox + 24, oy + 7), (ox + 28, oy + 16), (ox + 26, oy + 24), (ox + 18, oy + 27)]
    draw.polygon(facet_shadow, fill=(58, 18, 8, 255))
    draw.polygon(boulder_poly, outline=(38, 10, 4, 255))

    # 6. WALL (32, 32) - Modular Outpost Container / Blast Wall
    ox, oy = 32, 32
    # Outer crate frame
    draw.rectangle([ox + 2, oy + 2, ox + 29, oy + 29], fill=(45, 55, 72, 255), outline=(26, 32, 44, 255))
    # Beveled panel
    draw.rectangle([ox + 5, oy + 5, ox + 26, oy + 26], fill=(58, 70, 92, 255))
    # Diagonal hazard stripes
    for d in range(0, 30, 6):
        draw.line([ox + 5 + d, oy + 5, ox + 5, oy + 5 + d], fill=(245, 158, 11, 255), width=2)
    # Steel frame struts & rivets
    draw.rectangle([ox + 7, oy + 7, ox + 24, oy + 24], fill=(36, 44, 58, 255), outline=(26, 32, 44, 255))
    # Status LED
    draw.rectangle([ox + 14, oy + 14, ox + 17, oy + 17], fill=(239, 68, 68, 255))
    draw.point((ox + 15, oy + 15), fill=(255, 255, 255, 255))

    # 7. ROVER (64, 32) - 6-Wheel Articulated Martian Rover
    ox, oy = 64, 32
    # Shadow
    draw.ellipse([ox + 3, oy + 22, ox + 29, oy + 30], fill=(20, 8, 4, 180))
    # Rocker-bogie suspension struts
    draw.line([ox + 7, oy + 22, ox + 16, oy + 16], fill=(71, 85, 105, 255), width=2)
    draw.line([ox + 25, oy + 22, ox + 16, oy + 16], fill=(71, 85, 105, 255), width=2)
    draw.line([ox + 16, oy + 22, ox + 16, oy + 16], fill=(71, 85, 105, 255), width=2)
    # 6 Rugged All-Terrain Wheels (3 visible pairs along side profile)
    for wx in [5, 14, 23]:
        # Tyre
        draw.rectangle([ox + wx, oy + 20, ox + wx + 5, oy + 27], fill=(24, 30, 42, 255), outline=(15, 20, 30, 255))
        # Tread highlights
        draw.line([ox + wx + 1, oy + 21, ox + wx + 4, oy + 21], fill=(71, 85, 105, 255))
        draw.line([ox + wx + 1, oy + 26, ox + wx + 4, oy + 26], fill=(71, 85, 105, 255))
        # Hub bolt
        draw.point((ox + wx + 2, oy + 23), fill=(203, 213, 225, 255))
    # Rover Main Chassis Deck
    draw.rectangle([ox + 6, oy + 13, ox + 26, oy + 19], fill=(226, 232, 240, 255), outline=(51, 65, 85, 255))
    # Chassis Cyan Stripe
    draw.line([ox + 7, oy + 16, ox + 25, oy + 16], fill=(0, 240, 255, 255), width=1)
    # Top Solar Array Deck
    draw.rectangle([ox + 8, oy + 10, ox + 24, oy + 12], fill=(2, 132, 199, 255), outline=(14, 116, 144, 255))
    # Pan-Cam Mast & Panoramic Sensor Head
    draw.line([ox + 22, oy + 10, ox + 22, oy + 4], fill=(71, 85, 105, 255), width=2)
    draw.rectangle([ox + 20, oy + 3, ox + 25, oy + 6], fill=(30, 41, 59, 255))
    # Glowing Cyan Optical Sensor
    draw.point((ox + 24, oy + 4), fill=(0, 240, 255, 255))
    draw.point((ox + 24, oy + 5), fill=(165, 243, 252, 255))
    # Parabolic High-Gain Antenna
    draw.arc([ox + 8, oy + 4, ox + 14, oy + 10], start=180, end=330, fill=(148, 163, 184, 255), width=2)

    # 8. GOAL (96, 32) - Mars Colony Habitat Pod / Landing Base
    ox, oy = 96, 32
    # Base shadow
    draw.ellipse([ox + 3, oy + 22, ox + 29, oy + 30], fill=(20, 8, 4, 180))
    # Landing shock-strut feet
    draw.line([ox + 4, oy + 26, ox + 9, oy + 20], fill=(100, 116, 139, 255), width=2)
    draw.line([ox + 27, oy + 26, ox + 22, oy + 20], fill=(100, 116, 139, 255), width=2)
    draw.rectangle([ox + 3, oy + 26, ox + 6, oy + 28], fill=(51, 65, 85, 255))
    draw.rectangle([ox + 25, oy + 26, ox + 28, oy + 28], fill=(51, 65, 85, 255))
    # Pressurized Dome Chassis
    draw.pieslice([ox + 7, oy + 7, ox + 24, oy + 27], start=180, end=360, fill=(241, 245, 249, 255), outline=(71, 85, 105, 255))
    draw.rectangle([ox + 7, oy + 17, ox + 24, oy + 23], fill=(226, 232, 240, 255), outline=(71, 85, 105, 255))
    # Airlock Door
    draw.rectangle([ox + 13, oy + 17, ox + 18, oy + 23], fill=(14, 165, 233, 255), outline=(3, 105, 161, 255))
    # Beacon Mast
    draw.line([ox + 16, oy + 7, ox + 16, oy + 2], fill=(71, 85, 105, 255), width=2)
    # Flashing Emerald Beacon Bulb
    draw.ellipse([ox + 14, oy + 1, ox + 18, oy + 5], fill=(16, 185, 129, 255))
    draw.point((ox + 16, oy + 3), fill=(167, 243, 208, 255))

    # 9. MOVING_OBSTACLE (0, 64) - Autonomous Patrol Crawler / Hazard Bot
    ox, oy = 0, 64
    # Shadow
    draw.ellipse([ox + 4, oy + 22, ox + 28, oy + 29], fill=(25, 8, 4, 180))
    # Heavy tracked treads
    draw.rectangle([ox + 5, oy + 20, ox + 26, oy + 26], fill=(30, 41, 59, 255), outline=(15, 23, 42, 255))
    for tx in range(6, 26, 4):
        draw.line([ox + tx, oy + 20, ox + tx, oy + 26], fill=(71, 85, 105, 255))
    # Armored Chassis
    draw.rectangle([ox + 8, oy + 12, ox + 23, oy + 20], fill=(220, 38, 38, 255), outline=(153, 27, 27, 255))
    draw.rectangle([ox + 10, oy + 14, ox + 21, oy + 18], fill=(30, 41, 59, 255))
    # Warning Strobe Dome
    draw.ellipse([ox + 13, oy + 7, ox + 18, oy + 12], fill=(255, 176, 32, 255))
    draw.point((ox + 15, oy + 9), fill=(255, 255, 255, 255))
    # Hazard radar antennas
    draw.line([ox + 9, oy + 12, ox + 6, oy + 8], fill=(245, 158, 11, 255))
    draw.line([ox + 22, oy + 12, ox + 25, oy + 8], fill=(245, 158, 11, 255))

    # 10. DECORATION_CRATER (32, 64)
    ox, oy = 32, 64
    draw.ellipse([ox + 3, oy + 5, ox + 28, oy + 26], fill=(138, 43, 15, 255), outline=(70, 20, 8, 255))
    draw.ellipse([ox + 6, oy + 9, ox + 25, oy + 23], fill=(50, 15, 6, 255))
    draw.arc([ox + 3, oy + 5, ox + 28, oy + 26], start=210, end=350, fill=(235, 130, 80, 255), width=2)

    # 11. DECORATION_SOLAR (64, 64)
    ox, oy = 64, 64
    # Pedestal & swivel mount
    draw.line([ox + 16, oy + 18, ox + 16, oy + 28], fill=(71, 85, 105, 255), width=3)
    draw.rectangle([ox + 12, oy + 27, ox + 20, oy + 30], fill=(30, 41, 59, 255))
    # Dual Blue PV Wings
    draw.polygon([(ox + 3, oy + 17), (ox + 29, oy + 10), (ox + 29, oy + 16), (ox + 3, oy + 23)], fill=(2, 132, 199, 255))
    draw.line([(ox + 3, oy + 17), (ox + 29, oy + 10)], fill=(56, 189, 248, 255), width=1)
    # Cell grid lines
    for gx in [9, 16, 23]:
        draw.line([ox + gx, oy + 15, ox + gx, oy + 21], fill=(14, 116, 144, 255))

    # 12. DECORATION_DISH (96, 64)
    ox, oy = 96, 64
    # Tripod base
    draw.line([ox + 8, oy + 28, ox + 16, oy + 18], fill=(71, 85, 105, 255), width=2)
    draw.line([ox + 24, oy + 28, ox + 16, oy + 18], fill=(71, 85, 105, 255), width=2)
    # Parabolic Dish Dish
    draw.arc([ox + 5, oy + 4, ox + 27, oy + 20], start=140, end=340, fill=(241, 245, 249, 255), width=4)
    # Receiver horn
    draw.line([ox + 16, oy + 12, ox + 20, oy + 6], fill=(0, 240, 255, 255), width=2)
    draw.point((ox + 20, oy + 6), fill=(255, 255, 255, 255))

    # Save PNG
    atlas_path = "web/assets/atlas.png"
    img.save(atlas_path, "PNG")
    print(f"Saved {atlas_path} ({WIDTH}x{HEIGHT})")

    # Save JSON metadata
    atlas_data = {
        "tileSize": TILE_SIZE,
        "width": WIDTH,
        "height": HEIGHT,
        "sprites": {
            "ground_plain": {"x": 0, "y": 0, "w": 32, "h": 32},
            "ground_rough": {"x": 32, "y": 0, "w": 32, "h": 32},
            "ground_mud": {"x": 64, "y": 0, "w": 32, "h": 32},
            "ground_sand": {"x": 96, "y": 0, "w": 32, "h": 32},
            
            "rock": {"x": 0, "y": 32, "w": 32, "h": 32},
            "wall": {"x": 32, "y": 32, "w": 32, "h": 32},
            "rover": {"x": 64, "y": 32, "w": 32, "h": 32},
            "goal": {"x": 96, "y": 32, "w": 32, "h": 32},
            
            "moving_obstacle": {"x": 0, "y": 64, "w": 32, "h": 32},
            "decoration_crater": {"x": 32, "y": 64, "w": 32, "h": 32},
            "decoration_solar": {"x": 64, "y": 64, "w": 32, "h": 32},
            "decoration_dish": {"x": 96, "y": 64, "w": 32, "h": 32}
        }
    }
    json_path = "web/assets/atlas.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(atlas_data, f, indent=2)
    print(f"Saved {json_path}")

if __name__ == "__main__":
    create_atlas()
