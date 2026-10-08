# Cadrage des photos de personnes : détecte le visage principal (OpenCV, détecteur YuNet) et calcule
# l'object-position qui le place dans la zone visible de la carte, au-dessus du bandeau du nom.
# Sans ça, toutes les photos sont cadrées « centre, 20 % du haut » : un visage en bas ou sur le côté est coupé.
# Usage : pip install opencv-python-headless && python3 tools/build-focus.py [--hors-ligne]
# Écrit data/focus.js : { "Fichier.jpg": "50 74" } (object-position en %), ou "50 100 1.4 47" avec un zoom
# (ancré en bas, à 47 % de la largeur) ; seulement pour les photos dont le visage tombe mal avec le cadrage par défaut.
# Cadrage manuel (MANUAL) : un 5ᵉ nombre donne la hauteur du point de zoom (« 100 0 1.6 90 20 »), pour isoler une
# personne sur une photo de groupe sans lui couper la tête.
import json, os, re, time, urllib.request
import cv2, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.faces')  # photos téléchargées et résultats, hors dépôt
MODEL = os.path.join(CACHE, 'yunet.onnx')
UA = 'BrolCards/1.0 (https://github.com/Helvor/Brol; focus)'
PEOPLE = {'politique', 'bourgmestre', 'culture', 'sport', 'science', 'monarchie', 'militaire', 'aviation', 'rail', 'exploration', 'finance'}
BOX = 100 / (100 * 88 / 63 - 18)  # zone photo d'une carte : largeur / hauteur (≈ 0,82)
TARGET_Y = 0.38                    # centre du visage à 38 % de la hauteur de la zone photo
DEFAULT = (50, 20)                 # cadrage par défaut de style.css

os.makedirs(CACHE, exist_ok=True)
if not os.path.exists(MODEL):
    urllib.request.urlretrieve('https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx', MODEL)

src = open(os.path.join(ROOT, 'data', 'cards.js'), encoding='utf8').read()
cards = json.loads(re.search(r'window\.CARDS = (\[.*?\]);\n', src, re.S).group(1))
info = json.load(open(os.path.join(ROOT, 'tools', '.cache-images.json'), encoding='utf8'))  # écrit par build-images.mjs
files = sorted({f for c in cards if c['cat'] in PEOPLE for f in (c.get('img'), c.get('alt')) if f and not f.lower().endswith('.svg')})

results_path = os.path.join(CACHE, 'faces.json')
results = json.load(open(results_path)) if os.path.exists(results_path) else {}

def fetch(f):
    i = info.get(f)
    if not i: return None
    url = (i.get('thumb') or i['url']).split('?')[0]
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return urllib.request.urlopen(req, timeout=30).read()
        except Exception as e:
            if '429' in str(e) or 'timed out' in str(e): time.sleep(10 * (attempt + 1)); continue
            return None
    return None

det = None
import sys
OFFLINE = '--hors-ligne' in sys.argv  # n'analyse rien de nouveau : écrit data/focus.js avec les résultats déjà en cache
for n, f in enumerate([] if OFFLINE else files):
    if results.get(f) is not None: continue  # déjà analysée (un téléchargement raté est retenté)
    data = fetch(f); time.sleep(0.6)
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR) if data else None
    if img is None: results[f] = None; continue
    h, w = img.shape[:2]
    det = cv2.FaceDetectorYN.create(MODEL, '', (w, h), 0.8)
    det.setInputSize((w, h))
    _, faces = det.detect(img)
    if faces is None or not len(faces): results[f] = {'w': w, 'h': h, 'face': None}
    else:
        x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])[:4]  # le plus grand visage : la personne de la carte
        results[f] = {'w': w, 'h': h, 'face': [float((x + fw / 2) / w), float((y + fh / 2) / h), float(fh / h)]}
    if n % 25 == 0:
        json.dump(results, open(results_path, 'w'))
        print(f'Visages : {n + 1} / {len(files)}', flush=True)
json.dump(results, open(results_path, 'w'))

def place(r, px, py):
    """Position du visage dans la zone photo (0–1) pour un object-position donné (0–1)."""
    fx, fy, _ = r['face']
    ratio = r['w'] / r['h']
    if ratio >= BOX:
        L = ratio / BOX
        return (1 - L) * px + fx * L, fy
    L = BOX / ratio
    return fx, (1 - L) * py + fy * L

def fix(r):
    """Cadrage à corriger seulement si le visage tombe mal avec le cadrage par défaut :
    sous le bandeau du nom, collé en haut, ou trop sur le côté. Sinon None (on ne touche à rien)."""
    x0, y0 = place(r, DEFAULT[0] / 100, DEFAULT[1] / 100)
    if 0.14 <= y0 <= 0.55 and 0.22 <= x0 <= 0.78: return None
    fx, fy, _ = r['face']
    ratio = r['w'] / r['h']
    px, py = DEFAULT[0] / 100, DEFAULT[1] / 100
    if ratio > BOX:
        L = ratio / BOX
        px = min(1, max(0, (0.5 - fx * L) / (1 - L)))
    elif ratio < BOX:
        L = BOX / ratio
        py = min(1, max(0, (TARGET_Y - fy * L) / (1 - L)))
    x1, y1 = place(r, px, py)
    zoom = 1
    if y1 > 0.55:  # photo pas assez haute pour remonter le visage : léger zoom ancré en bas
        zoom = min(1.8, (1 - TARGET_Y) / (1 - y1))
    return round(px * 100), round(py * 100), round(zoom, 2), round(x1 * 100)

# Relu à l'œil et laissé au cadrage par défaut : photo de groupe (le plus grand visage n'est pas la bonne
# personne), personne minuscule ou recadrage sans visage
SKIP = {
    'Mélissa Hanus.jpg', 'Sven Gatz op bezoek in het Lange Max Museum.jpg',
    'Michèle Loijens, Benoit Hellings, and Yolande Duviver compaigning for Ecolo on Rue des Tanneurs (Brussels) (DSCF0952).jpg',
    'Defense.gov News Photo 970702-D-2987S-003.jpg', 'AD 2023 - SN Gemeenteraad 01.jpg',
    # Plein cadre (photos d'action) : banderole, panneaux, groupe ou image trop sombre
    "Jean-Claude Van Cauwenberghe.jpg", "Paris-Nice 2012 etape2 Tom Boonen 1.JPG", "Rik Van Looy, Tour de France 1964.jpg", "Sydney International Tennis WTA (33040174528).jpg",
}
# Cadrage réglé à la main, prioritaire sur la détection : relu à l'œil sur la carte
MANUAL = {
    "L'Evénement illustré - 7 juin 1919.jpg": '50 100 1.25 50',  # Gabrielle Petit : couverture de magazine, titre masqué
    'Luc Coene 2015.jpg': '85 20',  # visage sur le bord droit de la photo
    'Klaas Knot, Octavian Armașu & Pierre Wunsch.jpg': '100 0 1.6 90 20',  # Plein cadre de Pierre Wunsch : zoom sur lui seul
}
out = dict(MANUAL)
for f in files:
    if f in SKIP or f in MANUAL: continue
    r = results.get(f)
    if not r or not r.get('face'): continue
    v = fix(r)
    if not v: continue
    px, py, zoom, fxp = v
    out[f] = f'{px} {py}' + (f' {zoom} {fxp}' if zoom > 1.01 else '')
open(os.path.join(ROOT, 'data', 'focus.js'), 'w', encoding='utf8').write(
    '// Généré par tools/build-focus.py : cadrage des photos sur le visage (object-position en %).\n'
    'window.FOCUS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
found = sum(1 for f in files if results.get(f) and results[f].get('face'))
print(f'data/focus.js : {len(out)} photos recadrées ; visage trouvé sur {found} / {len(files)}')
