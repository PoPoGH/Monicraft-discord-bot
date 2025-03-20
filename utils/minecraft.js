/**
 * Utilitaires pour interagir avec les serveurs Minecraft
 * Utilise node-mcstatus pour récupérer les informations des serveurs
 */

const mcs = require('node-mcstatus');
const db = require('../database');

/**
 * Vérifie le statut d'un serveur Minecraft
 * @param {string} ip - Adresse IP du serveur
 * @param {number} port - Port du serveur
 * @param {number} timeout - Délai d'attente en millisecondes (optionnel)
 * @returns {Promise<Object>} - Informations sur le serveur
 */
async function checkServerStatus(ip, port, timeout = 5000) {
    try {
        // Récupérer les informations du serveur
        const status = await mcs.statusJava(ip, port, { timeout: timeout });

        return {
            online: true,
            players: status.players,
            version: status.version.name_text,
            ping: status.ping,
            favicon: status.favicon || null
        };
    } catch (error) {
        console.error(`Erreur lors de la vérification du serveur ${ip}:${port}:`, error);
        return {
            online: false,
            error: error.message
        };
    }
}

/**
 * Met à jour le statut de tous les serveurs dans la base de données
 * @returns {Promise<Array>} - Liste des serveurs avec leur statut mis à jour
 */
async function updateAllServersStatus() {
    try {
        const servers = db.getAllServers();
        const updatedServers = [];

        for (const server of servers) {
            const status = await checkServerStatus(server.ip, server.port);
            const newStatus = status.online ? 'online' : 'offline';
            
            // Mettre à jour le statut dans la base de données
            db.updateServerStatus(server.id, newStatus);
            
            updatedServers.push({
                ...server,
                status: newStatus,
                statusInfo: status
            });
        }

        return updatedServers;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut des serveurs:', error);
        return [];
    }
}

module.exports = {
    checkServerStatus,
    updateAllServersStatus
};
