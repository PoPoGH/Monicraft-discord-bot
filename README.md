# Monicraft - Bot Discord pour Serveurs Minecraft

Un bot Discord avancé pour gérer plusieurs serveurs Minecraft avec support pour les modpacks et création d'annonces automatiques.

## 🔧 Fonctionnalités

### 1. Gestion des Serveurs Minecraft
- Ajout dynamique de serveurs via la commande `/ajouter_serveur` avec support pour les modpacks
- Modification des informations d'un serveur existant avec `/modifier_serveur`
- Suppression de serveurs avec `/supprimer_serveur` (supprime également les embeds associés)
- Vérification de l'état des serveurs avec `/serveur`
- Affichage auto-actualisé de l'état des serveurs dans un salon avec `/afficher_serveur`
- Mode maintenance pour les serveurs avec `/maintenance_serveur`
- Persistance des données après redémarrage du bot
- Annonce automatique lors de la mise à jour de la version du modpack

### 2. Support des Modpacks
- Ajout de la version du modpack lors de la création d'un serveur
- Ajout du lien vers le modpack pour faciliter le téléchargement
- Affichage des informations du modpack dans les embeds de statut
- Annonces automatiques avec @everyone lors des mises à jour de modpack

### 3. Système d'Annonces
- Annonces automatiques avec @everyone lors des mises à jour de modpack via `/modifier_serveur`
- Création d'annonces manuelles personnalisées avec `/annonce` pour d'autres types d'informations (événements, maintenances, etc.)
- Personnalisation du titre, de la description et de la couleur des annonces manuelles

## 📋 Prérequis

- [Node.js](https://nodejs.org/) (v16.9.0 ou supérieur)
- [npm](https://www.npmjs.com/) (inclus avec Node.js)
- Un [compte développeur Discord](https://discord.com/developers/applications) pour créer un bot

## 🚀 Installation

1. **Cloner le dépôt ou télécharger les fichiers**

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer le bot**
   - Copiez `config.example.json` vers `config.json` et modifiez les valeurs :
     ```bash
     cp config.example.json config.json
     ```
   - Éditez le fichier `config.json` avec vos informations :
     ```json
     {
       "token": "VOTRE_TOKEN_DISCORD_ICI",
       "clientId": "ID_DE_VOTRE_BOT",
       "adminIds": ["ID_ADMIN_1", "ID_ADMIN_2"],
       "updateInterval": 300000,
       "embedColor": "#3498db",
       "devGuildIds": ["ID_SERVEUR_1", "ID_SERVEUR_2"],
       "isDev": false,
       "autoDeployCommands": true
     }
     ```
   - `token` : Le token de votre bot Discord (disponible sur le [portail développeur Discord](https://discord.com/developers/applications))
   - `clientId` : L'ID de votre application Discord
   - `adminIds` : Les IDs Discord des utilisateurs autorisés à ajouter des serveurs
   - `updateInterval` : Intervalle de mise à jour des embeds en millisecondes (300000 = 5 minutes)
   - `embedColor` : Couleur par défaut des embeds
   - `devGuildIds` : Liste des IDs des serveurs de développement où déployer les commandes en mode dev
   - `isDev` : Activer le mode développement (déploiement des commandes uniquement sur les serveurs spécifiés)
   - `autoDeployCommands` : Déployer automatiquement les commandes au démarrage du bot (true/false)

4. **Déployer ou supprimer les commandes slash**

   > **Note**: Si vous avez activé `autoDeployCommands` dans la configuration, les commandes seront automatiquement déployées au démarrage du bot. Vous n'avez pas besoin d'exécuter ces commandes manuellement.

   ```bash
   # Déploiement global (pour tous les serveurs)
   node deploy-commands.js --global
   
   # Déploiement sur les serveurs de développement configurés dans config.json
   node deploy-commands.js --dev
   
   # Déploiement sur un serveur spécifique
   node deploy-commands.js --guild=ID_DU_SERVEUR
   
   # Déploiement sur plusieurs serveurs spécifiques
   node deploy-commands.js --guild=ID_SERVEUR_1 --guild=ID_SERVEUR_2
   
   # Suppression de toutes les commandes globales
   node deploy-commands.js --delete --global
   
   # Suppression des commandes sur les serveurs de développement
   node deploy-commands.js --delete --dev
   
   # Suppression des commandes d'un serveur spécifique
   node deploy-commands.js --delete-guild=ID_DU_SERVEUR
   
   # Suppression des commandes de plusieurs serveurs spécifiques
   node deploy-commands.js --delete-guild=ID_SERVEUR_1 --delete-guild=ID_SERVEUR_2
   ```
   
   > **Note**: Le déploiement sur des serveurs spécifiques est instantané, tandis que le déploiement global peut prendre jusqu'à une heure pour se propager. C'est pourquoi il est recommandé d'utiliser le mode développement pendant la phase de test.
   >
   > La suppression des commandes peut être utile pour nettoyer les commandes obsolètes ou réinitialiser complètement le bot.

5. **Démarrer le bot**
   ```bash
   node index.js
   ```

## 📝 Commandes

### `/ajouter_serveur`
Ajoute un serveur Minecraft à la liste des serveurs surveillés.
- **Utilisation** : `/ajouter_serveur nom:MonServeur ip:mc.monserveur.com port:25565 modpack_version:1.0 modpack_link:https://exemple.com/modpack`
- **Permissions** : Réservé aux utilisateurs dont l'ID est dans `adminIds`
- **Options** :
  - `nom` : Nom du serveur (requis)
  - `ip` : Adresse IP ou domaine du serveur (requis)
  - `port` : Port du serveur (optionnel, par défaut: 25565)
  - `modpack_version` : Version du modpack utilisé par le serveur (optionnel)
  - `modpack_link` : Lien vers le modpack utilisé par le serveur (optionnel)

### `/modifier_serveur`
Modifie les informations d'un serveur existant.
- **Utilisation** : `/modifier_serveur nom:MonServeur champ:modpack_version valeur:1.1 salon_annonce:#annonces`
- **Permissions** : Réservé aux utilisateurs dont l'ID est dans `adminIds`
- **Options** :
  - `nom` : Nom du serveur à modifier (requis)
  - `champ` : Champ à modifier (requis) - Choix: Adresse IP, Port, Version du modpack, Lien du modpack
  - `valeur` : Nouvelle valeur pour le champ (requis)
  - `salon_annonce` : Salon où envoyer l'annonce (optionnel, pour les mises à jour de version)
- **Fonctionnalité spéciale** : Lorsque la version du modpack est modifiée, une annonce avec @everyone est automatiquement envoyée

### `/supprimer_serveur`
Supprime un serveur de la liste des serveurs surveillés et tous les embeds associés.
- **Utilisation** : `/supprimer_serveur nom:MonServeur confirmation:true`
- **Permissions** : Réservé aux utilisateurs dont l'ID est dans `adminIds`
- **Options** :
  - `nom` : Nom du serveur à supprimer (requis)
  - `confirmation` : Confirmation de la suppression (requis, doit être true pour confirmer)
- **Fonctionnalité spéciale** : Supprime également tous les embeds Discord associés au serveur

### `/serveur`
Affiche l'état d'un serveur Minecraft.
- **Utilisation** : `/serveur nom:MonServeur`
- **Affiche** : IP, port, nombre de joueurs connectés, ping, état du serveur, version du modpack, lien du modpack

### `/afficher_serveur`
Crée un embed auto-actualisé dans un salon.
- **Utilisation** : `/afficher_serveur nom:MonServeur salon:#état-serveurs`
- **Fonctionnement** : L'embed est mis à jour toutes les 5 minutes (configurable)

### `/annonce`
Crée une annonce manuelle avec un embed personnalisé (pour les événements, maintenances, etc.).
- **Utilisation** : `/annonce salon:#annonces titre:Événement spécial description:Un événement aura lieu ce weekend ! couleur:GREEN`
- **Options** :
  - `salon` : Salon où envoyer l'annonce (requis)
  - `titre` : Titre de l'annonce (requis)
  - `description` : Description de l'annonce (requis)
  - `couleur` : Couleur de l'embed (optionnel) - Noms de couleurs Discord (RED, GREEN, BLUE, etc.) ou codes HEX (#ff0000)
- **Note** : Pour les annonces de mise à jour de modpack, utilisez plutôt `/modifier_serveur` qui génère automatiquement une annonce

### `/maintenance_serveur`
Met un serveur Minecraft en mode maintenance pour mise à jour du modpack.
- **Utilisation** : `/maintenance_serveur nom:MonServeur activer:true raison:Mise à jour du modpack salon_annonce:#annonces`
- **Permissions** : Réservé aux utilisateurs dont l'ID est dans `adminIds`
- **Options** :
  - `nom` : Nom du serveur à mettre en maintenance (requis)
  - `activer` : Activer (true) ou désactiver (false) le mode maintenance (requis)
  - `raison` : Raison de la maintenance (optionnel)
  - `salon_annonce` : Salon où envoyer l'annonce de maintenance (optionnel)
- **Fonctionnalité spéciale** : 
  - Affiche le serveur comme étant en maintenance dans les embeds auto-actualisés
  - Envoie une annonce avec @everyone pour informer les utilisateurs de la maintenance
  - Empêche la mise à jour automatique du statut du serveur pendant la maintenance

### `/supprimer_message`
Supprime un message posté par le bot (utile pour supprimer des annonces obsolètes).
- **Utilisation** : `/supprimer_message message_id:123456789012345678 salon:#annonces`
- **Permissions** : Réservé aux utilisateurs dont l'ID est dans `adminIds`
- **Options** :
  - `message_id` : ID du message à supprimer (requis)
  - `salon` : Salon où se trouve le message (optionnel, par défaut: salon actuel)
- **Note** : Le bot ne peut supprimer que ses propres messages

## 🔄 Redémarrages et Maintenance

- Les données des serveurs sont stockées dans une base de données SQLite
- Les embeds auto-actualisés sont recréés automatiquement après un redémarrage
- Les logs sont enregistrés dans le dossier `logs/`

## 🛠️ Structure du Projet

```
├── commands/                   # Commandes du bot
│   ├── ajouter_serveur.js      # Commande pour ajouter un serveur
│   ├── modifier_serveur.js     # Commande pour modifier un serveur existant
│   ├── supprimer_serveur.js    # Commande pour supprimer un serveur
│   ├── serveur.js              # Commande pour vérifier l'état d'un serveur
│   ├── afficher_serveur.js     # Commande pour créer un embed auto-actualisé
│   ├── annonce.js              # Commande pour créer une annonce
│   ├── maintenance_serveur.js  # Commande pour mettre un serveur en maintenance
│   ├── supprimer_message.js    # Commande pour supprimer un message du bot
│   └── index.js                # Gestionnaire de commandes
├── utils/                      # Utilitaires
│   ├── minecraft.js            # Fonctions pour interagir avec les serveurs Minecraft
│   └── embeds.js               # Fonctions pour créer des embeds Discord
├── data/                       # Dossier pour la base de données (créé automatiquement)
├── logs/                       # Dossier pour les logs (créé automatiquement)
├── config.json                 # Configuration du bot
├── database.js                 # Module de gestion de la base de données
├── deploy-commands.js          # Script pour déployer les commandes slash
├── index.js                    # Point d'entrée du bot
├── package.json                # Dépendances du projet
└── README.md                   # Documentation
```

## 📚 Dépendances Principales

- [discord.js](https://discord.js.org/) - API Discord pour Node.js
- [node-mcstatus](https://www.npmjs.com/package/node-mcstatus) - Utilitaire pour interagir avec les serveurs Minecraft
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) - Base de données SQLite pour Node.js

## 🔧 Mode Développement

Le bot prend en charge un mode de développement qui permet de déployer les commandes slash uniquement sur des serveurs spécifiques. Cela présente plusieurs avantages :

1. **Mise à jour instantanée** : Les commandes déployées sur un serveur spécifique sont disponibles immédiatement, contrairement au déploiement global qui peut prendre jusqu'à une heure.
2. **Tests isolés** : Vous pouvez tester vos modifications sur un serveur de développement sans affecter les autres serveurs où le bot est utilisé.
3. **Développement itératif** : Modifiez et testez rapidement vos commandes pendant le développement.

Pour utiliser le mode développement :
1. Ajoutez les IDs de vos serveurs de développement dans le tableau `devGuildIds` du fichier `config.json`
2. Définissez `isDev` sur `true` dans `config.json` ou utilisez l'option `--dev` lors du déploiement
3. Déployez les commandes avec `node deploy-commands.js --dev`

Une fois le développement terminé, vous pouvez déployer globalement avec `node deploy-commands.js --global`.

## ⚠️ Résolution des Problèmes

- **Le bot ne répond pas aux commandes** : Vérifiez que les commandes slash ont été déployées avec `node deploy-commands.js`
- **Les commandes ne s'affichent pas immédiatement** : Si vous avez déployé globalement, cela peut prendre jusqu'à une heure. Utilisez le déploiement sur un serveur spécifique pour des tests immédiats.
- **Erreurs de connexion aux serveurs Minecraft** : Vérifiez que l'IP et le port sont corrects
- **Problèmes de permissions** : Assurez-vous que le bot a les permissions nécessaires dans les salons (Envoyer des messages, Intégrer des liens, Voir le salon)

## 🔒 Sécurité

Ce projet inclut un fichier `.gitignore` configuré pour exclure les fichiers sensibles et les données personnelles :

- **Fichiers de configuration** : Le fichier `config.json` contenant le token Discord et d'autres informations sensibles est exclu du dépôt Git. Utilisez toujours `config.example.json` comme modèle et créez votre propre `config.json` localement.
- **Base de données** : Les fichiers de base de données SQLite (dans le dossier `data/`) sont exclus pour éviter de partager des données utilisateur.
- **Logs** : Les fichiers de logs sont exclus pour éviter de divulguer des informations sensibles.
- **Dépendances** : Le dossier `node_modules/` est exclu pour réduire la taille du dépôt.

### Bonnes pratiques

1. **Ne jamais commiter de tokens ou clés d'API** : Utilisez des variables d'environnement ou un fichier de configuration exclu du dépôt.
2. **Vérifier régulièrement les dépendances** : Utilisez `npm audit` pour vérifier les vulnérabilités dans les dépendances.
3. **Limiter les permissions du bot** : N'accordez au bot que les permissions Discord dont il a réellement besoin.
4. **Restreindre l'accès aux commandes d'administration** : Utilisez le système `adminIds` pour limiter qui peut exécuter des commandes sensibles.

## 🤝 Contribution

N'hésitez pas à améliorer ce bot en ajoutant de nouvelles fonctionnalités ou en corrigeant des bugs !

Avant de soumettre une contribution :
1. Assurez-vous que votre code respecte les bonnes pratiques de sécurité
2. Testez vos modifications en mode développement
3. Vérifiez que vous n'avez pas inclus de données sensibles dans vos commits
