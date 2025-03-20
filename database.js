/**
 * Module de gestion de la base de données pour le bot Discord Minecraft
 * Utilise SQLite pour stocker les informations des serveurs et des messages d'embed
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Assurez-vous que le dossier data existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialisation de la base de données
const db = new Database(path.join(dataDir, 'minecraft_bot.db'));

// Initialisation des tables
function initDatabase() {
    // Table des serveurs Minecraft
    db.exec(`
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER NOT NULL,
            status TEXT DEFAULT 'offline',
            last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            modpack_version TEXT,
            modpack_link TEXT
        )
    `);

    // Table pour les messages d'embed auto-actualisés
    db.exec(`
        CREATE TABLE IF NOT EXISTS embed_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id INTEGER NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT,
            FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE
        )
    `);

    console.log('Base de données initialisée avec succès');
}

/**
 * Ajoute un nouveau serveur Minecraft à la base de données
 * @param {string} name - Nom du serveur
 * @param {string} ip - Adresse IP du serveur
 * @param {number} port - Port du serveur
 * @param {string} modpackVersion - Version du modpack (optionnel)
 * @param {string} modpackLink - Lien vers le modpack (optionnel)
 * @returns {Object} - Résultat de l'opération
 */
function addServer(name, ip, port, modpackVersion = null, modpackLink = null) {
    try {
        const stmt = db.prepare('INSERT INTO servers (name, ip, port, modpack_version, modpack_link) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(name, ip, port, modpackVersion, modpackLink);
        return { success: true, id: result.lastInsertRowid };
    } catch (error) {
        console.error('Erreur lors de l\'ajout du serveur:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Récupère tous les serveurs de la base de données
 * @returns {Array} - Liste des serveurs
 */
function getAllServers() {
    try {
        const stmt = db.prepare('SELECT * FROM servers');
        return stmt.all();
    } catch (error) {
        console.error('Erreur lors de la récupération des serveurs:', error);
        return [];
    }
}

/**
 * Récupère un serveur par son nom
 * @param {string} name - Nom du serveur
 * @returns {Object|null} - Informations du serveur ou null si non trouvé
 */
function getServerByName(name) {
    try {
        const stmt = db.prepare('SELECT * FROM servers WHERE name = ?');
        return stmt.get(name);
    } catch (error) {
        console.error(`Erreur lors de la récupération du serveur ${name}:`, error);
        return null;
    }
}

/**
 * Met à jour le statut d'un serveur
 * @param {number} id - ID du serveur
 * @param {string} status - Nouveau statut (online, offline, maintenance)
 */
function updateServerStatus(id, status) {
    try {
        const stmt = db.prepare('UPDATE servers SET status = ?, last_check = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(status, id);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut du serveur ${id}:`, error);
    }
}

/**
 * Met à jour les informations d'un serveur
 * @param {number} id - ID du serveur
 * @param {Object} updates - Objet contenant les champs à mettre à jour
 * @returns {Object} - Résultat de l'opération
 */
function updateServer(id, updates) {
    try {
        let query = 'UPDATE servers SET ';
        const params = [];
        const fields = [];

        // Construire la requête dynamiquement en fonction des champs fournis
        if (updates.ip !== undefined) {
            fields.push('ip = ?');
            params.push(updates.ip);
        }
        if (updates.port !== undefined) {
            fields.push('port = ?');
            params.push(updates.port);
        }
        if (updates.modpack_version !== undefined) {
            fields.push('modpack_version = ?');
            params.push(updates.modpack_version);
        }
        if (updates.modpack_link !== undefined) {
            fields.push('modpack_link = ?');
            params.push(updates.modpack_link);
        }

        // Si aucun champ n'est fourni, retourner une erreur
        if (fields.length === 0) {
            return { success: false, error: 'Aucun champ à mettre à jour' };
        }

        // Finaliser la requête
        query += fields.join(', ') + ' WHERE id = ?';
        params.push(id);

        const stmt = db.prepare(query);
        const result = stmt.run(...params);

        return { success: true, changes: result.changes };
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du serveur ${id}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Supprime un serveur de la base de données
 * @param {number} id - ID du serveur à supprimer
 * @returns {Object} - Résultat de l'opération
 */
function deleteServer(id) {
    try {
        const stmt = db.prepare('DELETE FROM servers WHERE id = ?');
        const result = stmt.run(id);
        return { success: true, changes: result.changes };
    } catch (error) {
        console.error(`Erreur lors de la suppression du serveur ${id}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Ajoute un message d'embed auto-actualisé
 * @param {number} serverId - ID du serveur
 * @param {string} channelId - ID du salon Discord
 * @param {string} messageId - ID du message Discord
 * @returns {Object} - Résultat de l'opération
 */
function addEmbedMessage(serverId, channelId, messageId) {
    try {
        const stmt = db.prepare('INSERT INTO embed_messages (server_id, channel_id, message_id) VALUES (?, ?, ?)');
        const result = stmt.run(serverId, channelId, messageId);
        return { success: true, id: result.lastInsertRowid };
    } catch (error) {
        console.error('Erreur lors de l\'ajout du message d\'embed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Récupère tous les messages d'embed auto-actualisés
 * @returns {Array} - Liste des messages d'embed
 */
function getAllEmbedMessages() {
    try {
        const stmt = db.prepare(`
            SELECT e.*, s.name, s.ip, s.port, s.modpack_version, s.modpack_link 
            FROM embed_messages e
            JOIN servers s ON e.server_id = s.id
        `);
        return stmt.all();
    } catch (error) {
        console.error('Erreur lors de la récupération des messages d\'embed:', error);
        return [];
    }
}

/**
 * Met à jour l'ID d'un message d'embed
 * @param {number} id - ID de l'entrée dans la table embed_messages
 * @param {string} messageId - Nouvel ID du message Discord
 */
function updateEmbedMessageId(id, messageId) {
    try {
        const stmt = db.prepare('UPDATE embed_messages SET message_id = ? WHERE id = ?');
        stmt.run(messageId, id);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'ID du message d'embed ${id}:`, error);
    }
}

// Initialiser la base de données au démarrage
initDatabase();

module.exports = {
    addServer,
    getAllServers,
    getServerByName,
    updateServerStatus,
    updateServer,
    deleteServer,
    addEmbedMessage,
    getAllEmbedMessages,
    updateEmbedMessageId
};
