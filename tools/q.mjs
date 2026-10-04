const q = process.argv[2];
const r = await fetch('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q), {headers:{'User-Agent':'brol-cards/0.1 (projet perso)'}});
const j = await r.json();
for (const b of j.results.bindings) console.log(Object.entries(b).map(([k,v])=>k+'='+v.value).join(' | '));
console.error(j.results.bindings.length+' rows');
