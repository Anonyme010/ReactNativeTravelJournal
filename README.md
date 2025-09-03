# Piscine - Journal de Voyage Visuel

Piscine est une application React Native Expo qui sert de journal de voyage visuel, combinant appareil photo, localisation, cartes et fonctionnalités de calendrier pour créer un enregistrement interactif de vos voyages.

## Fonctionnalités

- 📸 Capturez des photos avec géolocalisation automatique
- 🗺️ Visualisez toutes vos photos sur une carte interactive
- 📅 Parcourez vos photos par date à l'aide d'une interface de calendrier
- 🔍 Filtrez et recherchez vos souvenirs de voyage
- 👤 Profil personnel avec statistiques

## Stack Technologique

- React Native avec Expo
- Firebase Authentication
- Firestore Database
- Cloudinary pour le stockage d'images
- OpenStreetMap pour les cartes (via WebView)
- React Navigation pour la navigation
- Expo Location et Camera APIs


### Installation

1. Clonez le dépôt
2. Installez les dépendances
3. Démarrez le serveur de développement

   npx expo start


## Membres de l'Équipe et Responsabilités

### Membre 1 (Hajar.B): Appareil Photo et Gestion des Médias
- Fonctionnalité d'appareil photo et capture d'images
- Capture des données de localisation pour chaque photo prise
- Intégration et configuration de Cloudinary
- Téléchargement et transformation d'images
- Sauvegarde locale des photos dans la galerie de l'appareil

### Membre 2 (MMoustapha.A): Carte et Services de Localisation
- Intégration de carte avec OpenStreetMap via WebView
- Suivi de localisation et géolocalisation
- Marqueurs de lieux et interactions avec la carte

### Membre 3 (Nour.L): Calendrier et Galerie Photo
- Implémentation du calendrier et marquage des dates avec photos
- Galerie photo avec filtrage par date
- Visualisation modale des photos par jour
- UI/UX pour la navigation et l'affichage des photos

### Membre 4 (Walid.H): Firebase/Backend et Intégration Principale
- Configuration et intégration de Firebase
- Système d'authentification
- Conception de la base de données Firestore
- Structure de navigation
- Gestion des profils
- Intégration et connexion entre les travaux des autres membres
- Coordination technique entre les différents composants de l'application

## Implémentation de la Carte

Nous utilisons OpenStreetMap avec Leaflet.js via un composant WebView pour afficher la carte. Cette approche a été choisie pour:
- Éviter les restrictions d'API et les coûts liés à Google Maps
- Fournir une solution entièrement gratuite qui ne nécessite pas de carte de crédit 
- Assurer la compatibilité sur toutes les plateformes


