/**
 * Commande pour ajouter un serveur Minecraft à la base de données
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const config = require('../config.json');
const { checkServerStatus } = require('../utils/minecraft');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('ajouter_serveur')
        .setDescription('Ajoute un serveur Minecraft à la liste des serveurs surveillés')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Nom du serveur')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('ip')
                .setDescription('Adresse IP ou domaine du serveur')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('port')
                .setDescription('Port du serveur (par défaut: 25565)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('modpack_version')
                .setDescription('Version du modpack utilisé par le serveur')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('modpack_link')
                .setDescription('Lien vers le modpack utilisé par le serveur')
                .setRequired(false)),
    
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
            const name = interaction.options.getString('nom');
            const ip = interaction.options.getString('ip');
            const port = interaction.options.getInteger('port') || 25565;
            const modpackVersion = interaction.options.getString('modpack_version');
            const modpackLink = interaction.options.getString('modpack_link');

            // Vérifier si le serveur existe déjà
            const existingServer = db.getServerByName(name);
            if (existingServer) {
                return interaction.editReply(`⚠️ Un serveur avec le nom "${name}" existe déjà.`);
            }

            // Vérifier si le serveur est accessible
            try {
                const status = await checkServerStatus(ip, port);
                
                // Ajouter le serveur à la base de données
                const result = db.addServer(name, ip, port, modpackVersion, modpackLink);
                
                if (result.success) {
                    // Préparer le message de succès
                    let successMessage = `✅ **Serveur "${name}" ajouté avec succès !**\n` +
                                        `🌍 **Adresse :** \`${ip}:${port}\`\n` +
                                        `🔄 **État :** ${status.online ? '🟢 En ligne' : '🔴 Hors ligne'}`;
                    
                    // Ajouter les informations du modpack si fournies
                    if (modpackVersion) {
                        successMessage += `\n📦 **Version du modpack :** ${modpackVersion}`;
                    }
                    
                    if (modpackLink) {
                        successMessage += `\n🔗 **Lien du modpack :** ${modpackLink}`;
                    }
                    
                    // Répondre avec le message de succès
                    return interaction.editReply({
                        content: successMessage
                    });
                } else {
                    return interaction.editReply(`❌ Erreur lors de l'ajout du serveur : ${result.error}`);
                }
            } catch (error) {
                console.error('Erreur lors de la vérification du serveur:', error);
                
                // Ajouter quand même le serveur à la base de données
                const result = db.addServer(name, ip, port, modpackVersion, modpackLink);
                
                if (result.success) {
                    // Préparer le message d'erreur
                    let errorMessage = `⚠️ **Serveur "${name}" ajouté, mais il semble inaccessible.**\n` +
                                      `🌍 **Adresse :** \`${ip}:${port}\`\n` +
                                      `❌ **Erreur :** ${error.message}`;
                    
                    // Ajouter les informations du modpack si fournies
                    if (modpackVersion) {
                        errorMessage += `\n📦 **Version du modpack :** ${modpackVersion}`;
                    }
                    
                    if (modpackLink) {
                        errorMessage += `\n🔗 **Lien du modpack :** ${modpackLink}`;
                    }
                    
                    return interaction.editReply({
                        content: errorMessage
                    });
                } else {
                    return interaction.editReply(`❌ Erreur lors de l'ajout du serveur : ${result.error}`);
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande ajouter_serveur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
