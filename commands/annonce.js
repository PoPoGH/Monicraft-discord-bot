/**
 * Commande pour créer une annonce avec un embed personnalisé
 */

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createAnnouncementEmbed } = require('../utils/embeds');

module.exports = {
    // Définition de la commande
    data: new SlashCommandBuilder()
        .setName('annonce')
        .setDescription('Crée une annonce avec un embed personnalisé')
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Salon où envoyer l\'annonce')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('titre')
                .setDescription('Titre de l\'annonce')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Description de l\'annonce')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('couleur')
                .setDescription('Couleur de l\'embed (HEX ou nom: RED, GREEN, BLUE, etc.)')
                .setRequired(false)),
    
    // Exécution de la commande
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // Récupérer les options
            const channel = interaction.options.getChannel('salon');
            const title = interaction.options.getString('titre');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('couleur');
            
            // Vérifier les permissions dans le salon
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.SendMessages) || 
                !permissions.has(PermissionFlagsBits.ViewChannel) || 
                !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply(`❌ Je n'ai pas les permissions nécessaires dans le salon ${channel}.`);
            }
            
            // Créer l'embed d'annonce
            const embed = createAnnouncementEmbed(title, description, color);
            
            // Envoyer l'embed dans le salon spécifié
            await channel.send({ embeds: [embed] });
            
            // Répondre à l'utilisateur
            return interaction.editReply(`✅ Annonce envoyée avec succès dans ${channel}.`);
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande annonce:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};
