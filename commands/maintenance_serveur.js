/**
 * Commande pour mettre un serveur Minecraft en mode maintenance
 */

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const config = require('../config.json');
const { createAnnouncementEmbed } = require('../utils/embeds');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('maintenance_serveur')
        .setDescription('Met un serveur Minecraft en mode maintenance pour mise à jour du modpack')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Nom du serveur à mettre en maintenance')
                .setRequired(true)
                .setAutocomplete(true))
        .addBooleanOption(option => 
            option.setName('activer')
                .setDescription('Activer (true) ou désactiver (false) le mode maintenance')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('raison')
                .setDescription('Raison de la maintenance (ex: mise à jour du modpack)')
                .setRequired(false))
        .addChannelOption(option => 
            option.setName('salon_annonce')
                .setDescription('Salon où envoyer l\'annonce de maintenance')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    
    // Gestion de l'autocomplétion
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const servers = db.getAllServers();
        const choices = servers.map(server => server.name);
        
        const filtered = choices.filter(choice => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        );
    },
    
    // Exécution de la commande
    async execute(interaction) {
        // Vérifier si l'utilisateur est autorisé à utiliser cette commande
        const userId = interaction.user.id;
        if (!config.adminIds.includes(userId)) {
            return interaction.reply({
                content: '⛔ Vous n\'êtes pas autorisé à utiliser cette commande.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Récupérer les options
            const serverName = interaction.options.getString('nom');
            const activateMaintenance = interaction.options.getBoolean('activer');
            const reason = interaction.options.getString('raison') || 'Maintenance du serveur';
            const announcementChannel = interaction.options.getChannel('salon_annonce') || interaction.channel;
            
            // Récupérer le serveur depuis la base de données
            const server = db.getServerByName(serverName);
            if (!server) {
                return interaction.editReply(`❌ Le serveur "${serverName}" n'existe pas dans la base de données.`);
            }
            
            // Vérifier les permissions dans le salon d'annonce
            const permissions = announcementChannel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.SendMessages) || 
                !permissions.has(PermissionFlagsBits.ViewChannel) || 
                !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply(`❌ Je n'ai pas les permissions nécessaires dans le salon ${announcementChannel}.`);
            }
            
            // Mettre à jour le statut du serveur
            const newStatus = activateMaintenance ? 'maintenance' : 'offline';
            db.updateServerStatus(server.id, newStatus);
            
            // Créer et envoyer l'annonce
            let title, description, color;
            
            if (activateMaintenance) {
                title = `🔧 Maintenance du serveur "${serverName}"`;
                description = `@everyone\n\nLe serveur **${serverName}** est actuellement en maintenance.\n\n**Raison :** ${reason}\n\nNous vous informerons dès que le serveur sera de nouveau disponible.`;
                color = '#f39c12'; // Orange pour la maintenance
            } else {
                title = `✅ Fin de maintenance du serveur "${serverName}"`;
                description = `@everyone\n\nLa maintenance du serveur **${serverName}** est terminée.\n\nLe serveur est maintenant disponible !`;
                color = '#2ecc71'; // Vert pour la fin de maintenance
            }
            
            const embed = createAnnouncementEmbed(title, description, color);
            
            // Envoyer l'annonce dans le salon spécifié
            await announcementChannel.send({ 
                content: '@everyone',
                embeds: [embed],
                allowedMentions: { parse: ['everyone'] }
            });
            
            // Message de confirmation différent selon que l'annonce a été envoyée dans le même salon ou un autre
            const sameChannel = announcementChannel.id === interaction.channel.id;
            return interaction.editReply({
                content: `✅ **Le serveur "${serverName}" a été ${activateMaintenance ? 'mis en' : 'retiré du'} mode maintenance avec succès !**\n` +
                        `📣 Une annonce a été publiée ${sameChannel ? 'dans ce salon' : `dans le salon ${announcementChannel}`}.`
            });
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande maintenance_serveur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
