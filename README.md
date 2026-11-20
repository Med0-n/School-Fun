# 🎮 Cyber School Portal (School Fun)

<div align="center">

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Active-success?style=for-the-badge&logo=github)
![Version](https://img.shields.io/badge/Version-2.5%20Neon-00f0ff?style=for-the-badge)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Multiplayer-8b5cf6?style=for-the-badge)
![Web Audio](https://img.shields.io/badge/Web%20Audio-Soundboard%20&%20SFX-10b981?style=for-the-badge)
![Boss Key](https://img.shields.io/badge/Boss%20Key-Esc%20Panic%20Mode-ef4444?style=for-the-badge)

**La plateforme web tout-en-un pour survivre aux heures de cours.**  
*Jeux solo & multijoueurs (Local & Wi-Fi EDU_VD), Slope 2 officiel, Banque de Memes par sous-dossiers, Soundboard interactif et Camouflage ultra-rapide.*

[**🚀 Accéder au Site en Ligne**](https://med0-n.github.io/School-Fun/)

</div>

---

## 📑 Sommaire

- [✨ Fonctionnalités Principales](#-fonctionnalités-principales)
- [⛷️ Slope 2](#️-slope-2)
- [⚔️ Jeux Multijoueur](#️-jeux-multijoueur-local--en-ligne)
- [🕹️ Jeux Solo Rétro & Utilitaires](#️-jeux-solo-rétro--utilitaires)
- [🖼️ Banque de Memes & Sous-dossiers](#️-banque-de-memes--sous-dossiers)
- [🔊 Soundboard Scolaire & Sous-dossiers](#-soundboard-scolaire--sous-dossiers)
- [🔗 Bibliothèque de Liens (`lien.json`)](#-bibliothèque-de-liens-lienjson)
- [🛡️ Camouflage & Mode Panique (Boss Key)](#️-camouflage--mode-panique-boss-key)
- [📁 Structure des Fichiers & Configuration](#-structure-des-fichiers--configuration)
- [🚀 Déploiement GitHub Pages](#-déploiement-github-pages)

---

## ✨ Fonctionnalités Principales

- **🎮 12+ Jeux intégrés** : Solo, 2 joueurs sur un même clavier, et multijoueur en ligne P2P.
- **⛷️ Slope 2 (1games.io)** : Intégration optimisée plein écran avec iframe wrapper officiel.
- **🖼️ Banque de Memes** : Auto-détection des images (`.jpeg`, `.png`, `.gif`, `.webp`) triées par dossiers (`11VP`, `HP`, `Ultérieur`...).
- **🔊 Soundboard Scolaire** : Pads interactifs néon, égaliseur visuel animé, mode Loop, volume général et coupure d'urgence (`.wav`, `.mp3`, `.ogg`...).
- **🔗 Bibliothèque de Liens** : Charge tes sites favoris depuis `lien.json` et les ouvre dans un nouvel onglet avec leurs favicons.
- **🛡️ Touche Panique (<kbd>Échap</kbd>)** : Bascule instantanément sur un faux Google Docs éditable, change le favicon de l'onglet et coupe immédiatement tous les sons en cours.
- **🌐 100% Client-Side** : Zéro serveur requis, fonctionne directement sur GitHub Pages et compatible avec le Wi-Fi des écoles (`EDU_VD`).

---

## ⛷️ Slope 2

- Version officielle intégrée via le wrapper sécurisé de **1games.io** (`https://1games.io/embed/slope-2`).
- Mode plein écran immersif avec déblocage direct des touches <kbd>A</kbd>/<kbd>D</kbd> et <kbd>←</kbd>/<kbd>→</kbd>.
- Bouton de secours pour ouverture dans un nouvel onglet si le réseau scolaire filtre les iframes.

---

## ⚔️ Jeux Multijoueur (Local & En Ligne)

| Jeu | Mode | Description |
| :--- | :--- | :--- |
| **🔴 Puissance 4 Néon** | **En Ligne (P2P) & Local** | Joue contre un ami à distance (Maison ↔ Maison ou Wi-Fi École) via **WebRTC STUN Google**. Génération d'un lien d'invitation en 1 clic. |
| **🏓 Cyber Pong 1v1** | **Local (1 clavier)** | Duel classique revisité avec traînées néon lumineuses et accélération de la balle. |
| **🏍️ Tron Cycles 1v1** | **Local (1 clavier)** | Deux motos de lumière s'affrontent, la première qui touche un mur ou une traînée perd. |
| **💣 Tank Battle 1v1** | **Local (1 clavier)** | Arène de tir avec obus qui ricochent sur les murs. |

> 💡 **Comment jouer à Puissance 4 à distance ?**  
> 1. Clique sur **« Créer la salle »**.  
> 2. Clique sur **« 📋 Copier lien d'invitation »** et envoie-le à ton pote.  
> 3. Dès qu'il clique sur le lien, la partie démarre immédiatement sans qu'il ait besoin de taper le code !

---

## 🕹️ Jeux Solo Rétro & Utilitaires

- **🧱 Tetris Néon** : Système complet de rotation (SRS), ghost piece, hold piece, score et niveaux rétro.
- **⌨️ Spacebar Clicker & Speed Test** : Mode Idle/Clicker avec boutique d'améliorations et Speed Test officiel CPS (5s, 10s, 30s, 60s).
- **🐍 Snake Néon** : Le serpent classique avec grille cyber et accélération progressive.
- **🔢 2048 Néon** : Fusionne les blocs pour atteindre 2048 avec animations fluides.
- **🦖 Cyber Runner** : Course d'obstacles sans fin avec vitesse exponentielle.
- **🎯 Réflexe & Aim Trainer** : Mesure ton temps de réaction au millième de seconde et teste ta précision.
- **🐦 Flappy Néon** : Évite les piliers laser dans ce clone rétro ultra-nerveux.
- **🧮 Calculatrice EDU_VD** : Calculatrice scientifique complète déguisée pour faire semblant de travailler.
- **🏆 Hauts Faits de l'École** : Badges et succès déblocables (Survivant du Lundi 8h, Maître du Camouflage...).

---

## 🖼️ Banque de Memes & Sous-dossiers

La galerie scanne automatiquement les dossiers déclarés dans `dossiers.json` :
- **Sous-dossiers par défaut** : `11VP`, `HP`, `Ultérieur` (26 memes originaux triés).
- **Fonctionnalités** :
  - Filtre par sous-dossier (`📁 Tous`, `📁 11VP`, `📁 HP`...) avec compteur d'images.
  - Filtre par type (`Tous`, `GIFs`, `Images`).
  - Recherche instantanée par nom ou dossier.
  - Lightbox plein écran avec navigation au clavier (<kbd>←</kbd> <kbd>→</kbd> <kbd>Échap</kbd>).
  - Compteur de likes persistant dans le navigateur.
  - Bouton **« 🎲 Meme Aléatoire »**.
  - Possibilité d'ajouter des sous-dossiers à la volée depuis le site.

---

## 🔊 Soundboard Scolaire & Sous-dossiers

Un Soundboard interactif ultra-rapide basé sur le même système d'auto-détection :
- **Sous-dossiers par défaut** : `memes/`, `bruits/`, racine `sound/`.
- **Formats supportés** : `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.webm`.
- **Fonctionnalités** :
  - Pads interactifs néon avec titre et badge de dossier.
  - Visualiseur audio avec égaliseur animé en direct.
  - Option **🔁 Loop** par son pour répéter en boucle.
  - Raccourcis clavier : les touches <kbd>1</kbd> à <kbd>9</kbd> lancent les 9 premiers sons de la liste.
  - Curseur de **Volume Général** (0% à 100%).
  - Bouton **« ⏹️ Tout Couper »** (urgence sonore).
  - 8 sons de démo synthétiques intégrés (Airhorn MLG, Vine Boom, Bruh, 8-bit Jump, Fanfare, Laser, Alerte Rouge, Buzzer).
  - Coupure automatique instantanée si la Touche Panique (<kbd>Échap</kbd>) est pressée.

---

## 🔗 Bibliothèque de Liens (`lien.json`)

Configure tes sites préférés directement dans le fichier `lien.json` à la racine :

```json
{
  "1": "google.com",
  "2": "wikipedia.org",
  "3": "youtube.com",
  "4": "github.com",
  "5": "https://1games.io/game/slope-2/",
  "Pronote": "pronote.ch"
}
```

- Tous les liens s'ouvrent dans un **nouvel onglet sécurisé**.
- Récupération automatique du favicon officiel de chaque domaine.
- Bouton de rechargement à chaud `🔄 Recharger lien.json` et barre de recherche rapide.

---

## 🛡️ Camouflage & Mode Panique (Boss Key)

- **Touche d'urgence** : Appuie sur <kbd>Échap</kbd> à tout moment.
- **Effets immédiats** :
  1. Affichage instantané d'une fausse page Google Docs éditable.
  2. Remplacement du titre et du favicon de l'onglet par le logo officiel Google Docs.
  3. Pause automatique de tous les jeux.
  4. Coupure nette de tous les sons du Soundboard.
- **Retour au jeu** : Clique sur le petit logo en haut à gauche du faux Google Docs.
- **Presets disponibles** : Google Docs, Pronote, Moodle, Wikipédia.

---

## 📁 Structure des Fichiers & Configuration

```text
📁 School-Fun/ (Racine)
│
├── 📄 index.html              <-- Application web complète
├── 📄 lien.json               <-- Configuration de tes liens personnalisés
├── 📄 dossiers.json           <-- Configuration des sous-dossiers memes et sons
├── 📄 README.md               <-- Documentation du projet
│
├── 📁 meme/                   <-- Banque de memes par sous-dossiers
│   ├── 📁 11VP/               <-- 1.jpeg, 2.gif, 3.jpeg...
│   ├── 📁 HP/                 <-- 1.jpeg, 2.jpeg...
│   └── 📁 Ultérieur/          <-- 1.jpeg...
│
└── 📁 sound/                  <-- Soundboard par sous-dossiers
    ├── 1.wav, 2.wav, 3.wav    <-- Sons à la racine
    ├── 📁 memes/              <-- 1.wav, 2.wav...
    └── 📁 bruits/             <-- 1.wav, 2.wav...
```

### Comment ajouter de nouveaux fichiers :
- **Pour les memes** : Place tes images dans `meme/<sous-dossier>/` en les nommant `1.jpeg`, `2.gif`, `3.png`... puis ajoute le nom du sous-dossier dans `dossiers.json`.
- **Pour les sons** : Place tes fichiers audio dans `sound/<sous-dossier>/` en les nommant `1.mp3`, `2.wav`... puis ajoute le nom du sous-dossier dans `dossiers.json`.

---

## 🚀 Déploiement GitHub Pages

1. Clone ce dépôt ou fork-le :
   ```bash
   git clone https://github.com/Med0-n/School-Fun.git
   ```
2. Va dans **Settings** ⚙️ > **Pages** de ton dépôt GitHub.
3. Sous **Branch**, sélectionne `main` et `/ (root)`, puis clique sur **Save**.
4. Ton site sera en ligne sous quelques secondes à l'adresse :  
   `https://<ton-pseudo>.github.io/<nom-du-repo>/`

---

<div align="center">
  <sub>Fait avec passion pour le fun et la survie scolaire. 🕹️</sub>
</div>
