/**
 * Commande pour supprimer un serveur Minecraft de la base de données
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const config = require('../config.json');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('supprimer_serveur')
        .setDescription('Supprime un serveur Minecraft de la liste des serveurs surveillés')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Nom du serveur à supprimer')
                .setRequired(true)
                .setAutocomplete(true))
        .addBooleanOption(option => 
            option.setName('confirmation')
                .setDescription('Confirmez la suppression (true pour confirmer)')
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
            const confirmation = interaction.options.getBoolean('confirmation');

            // Vérifier la confirmation
            if (!confirmation) {
                return interaction.editReply({
                    content: '⚠️ **Suppression annulée.**\n' +
                            'Pour supprimer un serveur, vous devez définir l\'option "confirmation" sur "true".'
                });
            }

            // Récupérer le serveur depuis la base de données
            const server = db.getServerByName(serverName);
            if (!server) {
                return interaction.editReply(`❌ Le serveur "${serverName}" n'existe pas dans la base de données.`);
            }

            // Supprimer le serveur
            const result = db.deleteServer(server.id);
            
            if (result.success) {
                return interaction.editReply({
                    content: `🗑️ **Le serveur "${serverName}" a été supprimé avec succès !**`
                });
            } else {
                return interaction.editReply(`❌ Erreur lors de la suppression du serveur : ${result.error}`);
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande supprimer_serveur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
