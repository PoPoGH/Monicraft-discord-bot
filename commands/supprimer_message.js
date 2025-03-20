/**
 * Commande pour supprimer un message posté par le bot
 */

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('supprimer_message')
        .setDescription('Supprime un message posté par le bot (admins uniquement)')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('ID du message à supprimer')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Salon où se trouve le message (par défaut: salon actuel)')
                .addChannelTypes(ChannelType.GuildText)
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

        await interaction.deferReply({ ephemeral: true });

        try {
            // Récupérer les options
            const messageId = interaction.options.getString('message_id');
            const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
            
            // Vérifier les permissions dans le salon
            const permissions = targetChannel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.ManageMessages) || 
                !permissions.has(PermissionFlagsBits.ViewChannel)) {
                return interaction.editReply(`❌ Je n'ai pas les permissions nécessaires dans le salon ${targetChannel}.`);
            }
            
            try {
                // Récupérer et supprimer le message
                const message = await targetChannel.messages.fetch(messageId);
                
                // Vérifier si le message a été envoyé par le bot
                if (message.author.id !== interaction.client.user.id) {
                    return interaction.editReply(`❌ Le message avec l'ID "${messageId}" n'a pas été envoyé par moi. Je ne peux supprimer que mes propres messages.`);
                }
                
                await message.delete();
                return interaction.editReply(`✅ Le message avec l'ID "${messageId}" a été supprimé avec succès du salon ${targetChannel}.`);
            } catch (error) {
                console.error(`Erreur lors de la suppression du message ${messageId}:`, error);
                
                // Message d'erreur plus précis selon le type d'erreur
                if (error.code === 10008) {
                    return interaction.editReply(`❌ Le message avec l'ID "${messageId}" n'a pas été trouvé dans le salon ${targetChannel}.`);
                } else {
                    return interaction.editReply(`❌ Erreur lors de la suppression du message: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande supprimer_message:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
