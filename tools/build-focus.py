# Cadrage des photos de personnes : détecte le visage principal (OpenCV, détecteur YuNet) et calcule
# l'object-position qui le place dans la zone visible de la carte, au-dessus du bandeau du nom.
# Sans ça, toutes les photos sont cadrées « centre, 20 % du haut » : un visage en bas ou sur le côté est coupé.
# Usage : pip install opencv-python-headless && python3 tools/build-focus.py
# Écrit data/focus.js : { "Fichier.jpg": "50 74" } (object-position en %), seulement quand le cadrage change.
import json, os, re, time, urllib.request
import cv2, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.faces')  # photos téléchargées et résultats, hors dépôt
MODEL = os.path.join(CACHE, 'yunet.onnx')
UA = 'BrolCards/1.0 (https://github.com/Helvor/Brol; focus)'
PEOPLE = {'politique', 'bourgmestre', 'culture', 'sport', 'science', 'monarchie'}
BOX = 100 / (100 * 88 / 63 - 18)  # zone photo d'une carte : largeur / hauteur (≈ 0,82)
TARGET_Y = 0.35                    # centre du visage à 35 % de la hauteur de la zone photo
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
for n, f in enumerate(files):
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

def position(r):
    fx, fy, _ = r['face']
    ratio = r['w'] / r['h']
    px, py = DEFAULT
    if ratio > BOX:   # photo plus large que la zone : on choisit la position horizontale
        L = ratio / BOX
        px = (0.5 - fx * L) / (1 - L) * 100
        py = DEFAULT[1]
    elif ratio < BOX:  # photo plus haute : on choisit la position verticale
        L = BOX / ratio
        py = (TARGET_Y - fy * L) / (1 - L) * 100
    return round(min(100, max(0, px))), round(min(100, max(0, py)))

out = {}
for f in files:
    r = results.get(f)
    if not r or not r.get('face'): continue
    px, py = position(r)
    if abs(px - DEFAULT[0]) >= 6 or abs(py - DEFAULT[1]) >= 6: out[f] = f'{px} {py}'
open(os.path.join(ROOT, 'data', 'focus.js'), 'w', encoding='utf8').write(
    '// Généré par tools/build-focus.py : cadrage des photos sur le visage (object-position en %).\n'
    'window.FOCUS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
found = sum(1 for f in files if results.get(f) and results[f].get('face'))
print(f'data/focus.js : {len(out)} photos recadrées ; visage trouvé sur {found} / {len(files)}')
