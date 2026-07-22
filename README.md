# Quiz des municipalités du Québec

Petite application web : on affiche le nom d’une municipalité, l’utilisateur clique sur la carte. Bon clic → surbrillance verte ; mauvais clic → « C'est le mauvais endroit ».

## Données géographiques

Les limites proviennent des **Découpages administratifs 1/100 000** du MRNF ([Données Québec](https://www.donneesquebec.ca/recherche/dataset/eec20550-7916-4ff9-b9bf-9e07288b4a17)), couche `munic_s` (sans simplification globale : fusion des parties, exclusion des entités « Toponyme à venir »).

Au premier lancement, le script télécharge le jeu officiel (~83 Mo) dans `scripts/_bdat100k/` :

```bash
pip install -r requirements.txt
python scripts/fetch_municipalities.py
```

Le résultat est écrit dans `public/data/municipalities.geojson`.

## Lancer l’application

Un serveur HTTP local est nécessaire (fetch du GeoJSON) :

```bash
python -m http.server 8080
```

Puis ouvrir [http://localhost:8080](http://localhost:8080).

## Licence des données

Données Québec — licence **CC-BY 4.0** (voir la fiche du jeu de données).
