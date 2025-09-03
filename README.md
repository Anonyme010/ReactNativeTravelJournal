## Installation et configuration

1. Cloner le projet :
2. Installer les dépendances :
```
cd piscineMAP
npm install
```

3. Démarrer l'application avec nettoyage du cache (recommandé) :
```
npx expo start --clear
```
Ou 
```
npx expo start
```

### Avantage principal : pas besoin de clé API Google Maps

Cette application utilise OpenStreetMap comme fournisseur de cartes, ce qui présente plusieurs avantages :
- **Aucune clé API requise** - Contrairement à Google Maps, aucune carte de crédit ou payment n'est nécessaire
- **Gratuit et open source** - Pas de limitations d'utilisation


## Utilisation

1. **Écran principal** : Affiche la carte centrée sur la position de l'utilisateur
2. **Écran des piscines** : Montre toutes les location marquées
3. **Écran de détails** : Affiche les informations sur la localisation

