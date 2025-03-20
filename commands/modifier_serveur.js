/**
 * Commande pour modifier les informations d'un serveur Minecraft existant
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database');
const config = require('../config.json');
const { checkServerStatus } = require('../utils/minecraft');
const { createAnnouncementEmbed } = require('../utils/embeds');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('modifier_serveur')
        .setDescription('Modifie les informations d\'un serveur Minecraft existant')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Nom du serveur à modifier')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option => 
            option.setName('champ')
                .setDescription('Champ à modifier')
                .setRequired(true)
                .addChoices(
                    { name: 'Adresse IP', value: 'ip' },
                    { name: 'Port', value: 'port' },
                    { name: 'Version du modpack', value: 'modpack_version' },
                    { name: 'Lien du modpack', value: 'modpack_link' }
                ))
        .addStringOption(option => 
            option.setName('valeur')
                .setDescription('Nouvelle valeur pour le champ')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('salon_annonce')
                .setDescription('Salon où envoyer l\'annonce (pour les mises à jour de version)')
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
            const fieldToUpdate = interaction.options.getString('champ');
            let newValue = interaction.options.getString('valeur');

            // Récupérer le serveur depuis la base de données
            const server = db.getServerByName(serverName);
            if (!server) {
                return interaction.editReply(`❌ Le serveur "${serverName}" n'existe pas dans la base de données.`);
            }

            // Préparer l'objet de mise à jour
            const updates = {};
            
            // Convertir la valeur en nombre pour le port
            if (fieldToUpdate === 'port') {
                const portValue = parseInt(newValue, 10);
                if (isNaN(portValue) || portValue <= 0 || portValue > 65535) {
                    return interaction.editReply('❌ Le port doit être un nombre valide entre 1 et 65535.');
                }
                updates.port = portValue;
                newValue = portValue.toString(); // Pour l'affichage
            } else {
                updates[fieldToUpdate] = newValue;
            }

            // Effectuer la mise à jour
            const result = db.updateServer(server.id, updates);
            
            if (result.success) {
                // Préparer le message de confirmation
                let fieldName = '';
                switch (fieldToUpdate) {
                    case 'ip': fieldName = 'Adresse IP'; break;
                    case 'port': fieldName = 'Port'; break;
                    case 'modpack_version': fieldName = 'Version du modpack'; break;
                    case 'modpack_link': fieldName = 'Lien du modpack'; break;
                }
                
                // Si la version du modpack a été modifiée, faire une annonce
                if (fieldToUpdate === 'modpack_version') {
                    try {
                        // Récupérer le serveur mis à jour pour avoir les informations les plus récentes
                        const updatedServer = db.getServerByName(serverName);
                        
                        // Récupérer le salon d'annonce spécifié ou utiliser le salon actuel
                        const announcementChannel = interaction.options.getChannel('salon_annonce') || interaction.channel;
                        
                        // Vérifier les permissions dans le salon d'annonce
                        const permissions = announcementChannel.permissionsFor(interaction.client.user);
                        if (!permissions.has(PermissionFlagsBits.SendMessages) || 
                            !permissions.has(PermissionFlagsBits.ViewChannel) || 
                            !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                            return interaction.editReply({
                                content: `✅ **La version du modpack du serveur "${serverName}" a été mise à jour avec succès !**\n` +
                                        `📝 **Nouvelle version :** ${newValue}\n` +
                                        `⚠️ Impossible d'envoyer l'annonce: Je n'ai pas les permissions nécessaires dans le salon ${announcementChannel}.`
                            });
                        }
                        
                        // Créer un embed pour l'annonce de mise à jour du modpack
                        const title = `📢 Mise à jour du modpack pour ${serverName}`;
                        const description = `@everyone\n\nLe modpack du serveur **${serverName}** a été mis à jour vers la version **${newValue}**.\n\n${updatedServer.modpack_link ? `Lien du modpack: ${updatedServer.modpack_link}` : ''}`;
                        const embed = createAnnouncementEmbed(title, description, '#ff9900');
                        
                        // Envoyer l'annonce dans le salon spécifié
                        await announcementChannel.send({ 
                            content: '@everyone',
                            embeds: [embed],
                            allowedMentions: { parse: ['everyone'] }
                        });
                        
                        // Message de confirmation différent selon que l'annonce a été envoyée dans le même salon ou un autre
                        const sameChannel = announcementChannel.id === interaction.channel.id;
                        return interaction.editReply({
                            content: `✅ **La version du modpack du serveur "${serverName}" a été mise à jour avec succès !**\n` +
                                    `📝 **Nouvelle version :** ${newValue}\n` +
                                    `📣 Une annonce a été publiée ${sameChannel ? 'dans ce salon' : `dans le salon ${announcementChannel}`}.`
                        });
                    } catch (announceError) {
                        console.error('Erreur lors de l\'envoi de l\'annonce:', announceError);
                        
                        return interaction.editReply({
                            content: `✅ **La version du modpack du serveur "${serverName}" a été mise à jour avec succès !**\n` +
                                    `📝 **Nouvelle version :** ${newValue}\n` +
                                    `⚠️ Impossible d'envoyer l'annonce: ${announceError.message}`
                        });
                    }
                } else {
                    // Pour les autres champs, afficher simplement la confirmation
                    return interaction.editReply({
                        content: `✅ **Le champ "${fieldName}" du serveur "${serverName}" a été mis à jour avec succès !**\n` +
                                `📝 **Nouvelle valeur :** ${newValue}`
                    });
                }
            } else {
                return interaction.editReply(`❌ Erreur lors de la mise à jour du serveur : ${result.error}`);
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande modifier_serveur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
