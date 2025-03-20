/**
 * Utilitaires pour créer et gérer les embeds Discord
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Crée un embed pour afficher le statut d'un serveur Minecraft
 * @param {Object} server - Informations du serveur
 * @param {Object} statusInfo - Informations de statut du serveur
 * @returns {EmbedBuilder} - L'embed Discord
 */
function createServerStatusEmbed(server, statusInfo) {
    // Déterminer la couleur en fonction du statut
    let embedColor;
    if (server.status === 'maintenance') {
        embedColor = '#f39c12'; // Orange pour la maintenance
    } else if (statusInfo.online) {
        embedColor = '#2ecc71'; // Vert pour en ligne
    } else {
        embedColor = '#e74c3c'; // Rouge pour hors ligne
    }

    const embed = new EmbedBuilder()
        .setTitle(`📢 État du Serveur "${server.name}"`)
        .setColor(embedColor)
        .setFooter({ text: `Dernière mise à jour: ${new Date().toLocaleString()}` });

    // Ajouter l'adresse du serveur
    embed.addFields({ name: '🌍 Adresse', value: `\`${server.ip}:${server.port}\`` });

    // Ajouter les informations du modpack si disponibles
    if (server.modpack_version) {
        embed.addFields({ 
            name: '📦 Version du modpack', 
            value: server.modpack_version 
        });
    }

    if (server.modpack_link) {
        embed.addFields({ 
            name: '🔗 Lien du modpack', 
            value: server.modpack_link 
        });
    }

    // Afficher les informations en fonction du statut
    if (server.status === 'maintenance') {
        // Serveur en maintenance
        embed.setDescription('🔧 **Le serveur est actuellement en maintenance.**');
        embed.addFields({ 
            name: '⏱️ Statut', 
            value: 'En maintenance - Veuillez patienter' 
        });
    } else if (statusInfo.online) {
        // Serveur en ligne
        // Ajouter les informations des joueurs
        embed.addFields({ 
            name: '👥 Joueurs connectés', 
            value: `${statusInfo.players.online}/${statusInfo.players.max}` 
        });

        // Ajouter un message d'invitation
        embed.addFields({ 
            name: '🔥 Rejoignez-nous !', 
            value: 'Le serveur est en ligne et prêt à vous accueillir !' 
        });

        // Ajouter la version du serveur si disponible
        if (statusInfo.version) {
            embed.addFields({ 
                name: '🔧 Version', 
                value: statusInfo.version 
            });
        }
    } else {
        // Serveur hors ligne
        embed.setDescription('⚠️ **Le serveur est actuellement hors ligne ou inaccessible.**');
        
        if (statusInfo.error) {
            embed.addFields({ 
                name: '❌ Erreur', 
                value: statusInfo.error 
            });
        }
    }

    return embed;
}

/**
 * Crée un embed pour une annonce personnalisée
 * @param {string} title - Titre de l'annonce
 * @param {string} description - Description de l'annonce
 * @param {string} color - Couleur de l'embed (HEX ou nom de couleur Discord)
 * @returns {EmbedBuilder} - L'embed Discord
 */
function createAnnouncementEmbed(title, description, color = config.embedColor) {
    // Vérifier si la couleur est valide
    let embedColor = color;
    try {
        // Si la couleur est un nom (RED, GREEN, etc.), la convertir en HEX
        if (!color.startsWith('#')) {
            embedColor = color.toUpperCase();
        }
    } catch (error) {
        console.error('Erreur lors de la conversion de la couleur:', error);
        embedColor = config.embedColor; // Utiliser la couleur par défaut en cas d'erreur
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(embedColor)
        .setTimestamp();

    return embed;
}

module.exports = {
    createServerStatusEmbed,
    createAnnouncementEmbed
};
