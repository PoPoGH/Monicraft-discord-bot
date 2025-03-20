/**
 * Commande pour afficher un embed auto-actualisé d'un serveur Minecraft dans un salon
 */

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { checkServerStatus } = require('../utils/minecraft');
const { createServerStatusEmbed } = require('../utils/embeds');
const config = require('../config.json');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('afficher_serveur')
        .setDescription('Affiche un embed auto-actualisé d\'un serveur Minecraft dans un salon')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Nom du serveur à afficher')
                .setRequired(true)
                .setAutocomplete(true))
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Salon où afficher l\'embed')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),
    
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
        await interaction.deferReply();
        
        try {
            // Récupérer les options
            const serverName = interaction.options.getString('nom');
            const channel = interaction.options.getChannel('salon');
            
            // Vérifier les permissions dans le salon
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.SendMessages) || 
                !permissions.has(PermissionFlagsBits.ViewChannel) || 
                !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply(`❌ Je n'ai pas les permissions nécessaires dans le salon ${channel}.`);
            }
            
            // Récupérer les informations du serveur depuis la base de données
            const server = db.getServerByName(serverName);
            
            if (!server) {
                return interaction.editReply(`❌ Le serveur "${serverName}" n'existe pas dans la base de données.`);
            }
            
            try {
                // Vérifier l'état du serveur
                const statusInfo = await checkServerStatus(server.ip, server.port);
                
                // Mettre à jour le statut dans la base de données
                const newStatus = statusInfo.online ? 'online' : 'offline';
                db.updateServerStatus(server.id, newStatus);
                
                // Créer l'embed avec les informations du serveur
                const embed = createServerStatusEmbed(server, statusInfo);
                
                // Envoyer l'embed dans le salon spécifié
                const message = await channel.send({ embeds: [embed] });
                
                // Enregistrer le message dans la base de données pour les mises à jour automatiques
                const result = db.addEmbedMessage(server.id, channel.id, message.id);
                
                if (result.success) {
                    return interaction.editReply(`✅ L'embed du serveur "${serverName}" a été affiché dans ${channel} et sera mis à jour automatiquement toutes les ${config.updateInterval / 60000} minutes.`);
                } else {
                    return interaction.editReply(`⚠️ L'embed a été affiché, mais une erreur est survenue lors de l'enregistrement pour les mises à jour automatiques: ${result.error}`);
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification du serveur ${serverName}:`, error);
                
                // Créer un embed pour un serveur hors ligne avec l'erreur
                const statusInfo = {
                    online: false,
                    error: error.message
                };
                
                const embed = createServerStatusEmbed(server, statusInfo);
                
                // Mettre à jour le statut dans la base de données
                db.updateServerStatus(server.id, 'offline');
                
                // Envoyer l'embed dans le salon spécifié
                const message = await channel.send({ embeds: [embed] });
                
                // Enregistrer le message dans la base de données pour les mises à jour automatiques
                const result = db.addEmbedMessage(server.id, channel.id, message.id);
                
                if (result.success) {
                    return interaction.editReply(`⚠️ L'embed du serveur "${serverName}" (actuellement hors ligne) a été affiché dans ${channel} et sera mis à jour automatiquement toutes les ${config.updateInterval / 60000} minutes.`);
                } else {
                    return interaction.editReply(`⚠️ L'embed a été affiché, mais une erreur est survenue lors de l'enregistrement pour les mises à jour automatiques: ${result.error}`);
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande afficher_serveur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
