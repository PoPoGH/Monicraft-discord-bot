/**
 * Commande pour vérifier l'état d'un serveur Minecraft
 */

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkServerStatus } = require('../utils/minecraft');
const { createServerStatusEmbed } = require('../utils/embeds');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('serveur')
        .setDescription('Affiche l\'état d\'un serveur Minecraft')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Nom du serveur à vérifier')
                .setRequired(true)
                .setAutocomplete(true)),
    
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
            // Récupérer le nom du serveur
            const serverName = interaction.options.getString('nom');
            
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
                
                // Envoyer la réponse
                return interaction.editReply({ embeds: [embed] });
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
                
                // Envoyer la réponse
                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande serveur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
