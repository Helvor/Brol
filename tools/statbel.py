# Réduit les fichiers open data de Statbel (trop gros pour le dépôt) à tools/sources/communes.csv :
# une ligne par commune (code INS), population au 1er janvier et revenu net imposable par habitant.
# Fichiers à télécharger à la main sur https://statbel.fgov.be/fr/open-data (le site bloque les robots) :
#   - « Statistique fiscale des revenus » par commune : TF_PSNL_INC_TAX_MUNTY.xlsx
#   - « Population par lieu de résidence, nationalité, état civil, âge et sexe » : TF_SOC_POP_STRUCT_AAAA.zip
# Usage : python3 tools/statbel.py TF_PSNL_INC_TAX_MUNTY.xlsx TF_SOC_POP_STRUCT_AAAA.zip
import csv, io, re, sys, zipfile
from collections import defaultdict
from pathlib import Path
import openpyxl

inc_path, pop_path = sys.argv[1], sys.argv[2]

# Population : somme de toutes les lignes (sexe, nationalité, âge…) par commune
pop, names, age_sum = defaultdict(int), {}, defaultdict(int)
with zipfile.ZipFile(pop_path) as z:
    txt = next(n for n in z.namelist() if n.lower().endswith('.txt'))
    with z.open(txt) as f:
        r = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig'), delimiter='|')
        for row in r:
            k, n = row['CD_REFNIS'], int(row['MS_POPULATION'])
            pop[k] += n
            age_sum[k] += n * int(row['CD_AGE'])
            names[k] = (row['TX_DESCR_FR'], row['TX_DESCR_NL'])
pop_year = re.findall(r'(\d{4})', Path(pop_path).name)[-1]

# Fusions de communes du 1er janvier 2025 : les revenus sont encore publiés par ancienne commune (code INS)
FUSIONS = {
    'Anvers': ['11007'], 'Beveren-Kruibeke-Zwijndrecht': ['46003', '46013', '11056'], 'Pajottegem': ['23023', '23024', '23032'],
    'Tielt': ['37007', '37015'], 'Wingene': ['37012', '37018'], 'Nazareth-De Pinte': ['44012', '44048'],
    'Lochristi': ['44034', '44073'], 'Merelbeke-Melle': ['44040', '44043'], 'Lokeren': ['44045', '46014'],
    'Hasselt': ['71022', '73040'], 'Tessenderlo-Ham': ['71057', '71069'], 'Bilzen-Hoeselt': ['73006', '73032'],
    'Tongres-Looz': ['73009', '73083'], 'Bastogne': ['82003', '82005'],
}

# Revenus : dernière année disponible ; revenu net imposable total / habitants
wb = openpyxl.load_workbook(inc_path, read_only=True)
rows = wb.worksheets[0].iter_rows(values_only=True)
head = next(rows)
col = {h: i for i, h in enumerate(head)}
inc, raw = {}, {}
for row in rows:
    y, k = int(row[col['CD_YEAR']]), str(row[col['CD_MUNTY_REFNIS']])
    raw[(y, k)] = (row[col['MS_TOT_NET_TAXABLE_INC']], row[col['MS_TOT_RESIDENTS']])
    if k not in inc or y > inc[k][0]:
        inc[k] = (y, row[col['MS_TOT_NET_TAXABLE_INC']] / row[col['MS_TOT_RESIDENTS']])
inc_year = max(y for y, _ in inc.values())
by_name = {fr: k for k, (fr, _) in names.items()}
for name, old in FUSIONS.items():
    k = by_name[name]
    tot = [raw[(inc_year, o)] for o in old + ([k] if (inc_year, k) in raw else [])]
    inc[k] = (inc_year, sum(t for t, _ in tot) / sum(n for _, n in tot))

out = Path(__file__).parent / 'sources' / 'communes.csv'
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['ins', 'nom_fr', 'nom_nl', f'population_{pop_year}', 'age_moyen', f'revenu_par_habitant_{inc_year}'])
    for k in sorted(pop):
        y, v = inc.get(k, (None, None))
        w.writerow([k, *names[k], pop[k], round(age_sum[k] / pop[k], 1), round(v) if v and y == inc_year else ''])
missing = [names[k][0] for k in pop if inc.get(k, (0,))[0] != inc_year]
print(f'{out} : {len(pop)} communes (population {pop_year}, revenus {inc_year}) ; sans revenu {inc_year} : {len(missing)}', missing[:10])
