/**
 * Bot Discord pour gérer des serveurs Minecraft
 * Permet d'ajouter des serveurs, vérifier leur état, et créer des annonces
 */

const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const { token, updateInterval, autoDeployCommands } = require('./config.json');
const db = require('./database');
const { commands } = require('./commands');
const { deployCommands } = require('./deploy-commands');
const { checkServerStatus } = require('./utils/minecraft');
const { createServerStatusEmbed } = require('./utils/embeds');
const fs = require('fs');
const path = require('path');

// Créer le dossier de logs s'il n'existe pas
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Configuration du fichier de log
const logFile = path.join(logDir, `bot-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logger = fs.createWriteStream(logFile, { flags: 'a' });

// Fonction pour écrire dans le log
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    logger.write(logMessage + '\n');
}

// Créer un nouveau client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Stocker les commandes dans le client pour y accéder facilement
client.commands = commands;

// Variable pour stocker l'intervalle de mise à jour
let updateInterval_ID = null;

/**
 * Fonction pour mettre à jour tous les embeds de statut de serveur
 */
async function updateAllServerEmbeds() {
    try {
        log('Début de la mise à jour des embeds de serveur...');
        
        // Récupérer tous les messages d'embed enregistrés
        const embedMessages = db.getAllEmbedMessages();
        
        if (embedMessages.length === 0) {
            log('Aucun embed à mettre à jour.');
            return;
        }
        
        log(`${embedMessages.length} embeds à mettre à jour.`);
        
        for (const embedMsg of embedMessages) {
            try {
                // Récupérer le salon
                const channel = await client.channels.fetch(embedMsg.channel_id).catch(() => null);
                
                if (!channel) {
                    log(`Salon introuvable pour l'embed ${embedMsg.id} (ID: ${embedMsg.channel_id})`);
                    continue;
                }
                
                // Vérifier l'état du serveur
                const statusInfo = await checkServerStatus(embedMsg.ip, embedMsg.port);
                
                // Mettre à jour le statut dans la base de données
                const newStatus = statusInfo.online ? 'online' : 'offline';
                db.updateServerStatus(embedMsg.server_id, newStatus);
                
                // Créer le nouvel embed avec toutes les informations du serveur
                const server = {
                    id: embedMsg.server_id,
                    name: embedMsg.name,
                    ip: embedMsg.ip,
                    port: embedMsg.port,
                    modpack_version: embedMsg.modpack_version,
                    modpack_link: embedMsg.modpack_link
                };
                
                const embed = createServerStatusEmbed(server, statusInfo);
                
                // Essayer de mettre à jour le message existant
                try {
                    const message = await channel.messages.fetch(embedMsg.message_id);
                    await message.edit({ embeds: [embed] });
                    log(`Embed mis à jour pour le serveur "${embedMsg.name}" dans le salon #${channel.name}`);
                } catch (messageError) {
                    // Si le message n'existe plus, en créer un nouveau
                    log(`Message introuvable pour l'embed ${embedMsg.id}, création d'un nouveau message...`);
                    const newMessage = await channel.send({ embeds: [embed] });
                    db.updateEmbedMessageId(embedMsg.id, newMessage.id);
                    log(`Nouvel embed créé pour le serveur "${embedMsg.name}" dans le salon #${channel.name}`);
                }
            } catch (embedError) {
                log(`Erreur lors de la mise à jour de l'embed ${embedMsg.id}: ${embedError}`);
            }
        }
        
        log('Mise à jour des embeds terminée.');
    } catch (error) {
        log(`Erreur lors de la mise à jour des embeds: ${error}`);
    }
}

// Événement déclenché lorsque le bot est prêt
client.once(Events.ClientReady, async () => {
    log(`Bot connecté en tant que ${client.user.tag}`);
    
    // Déployer automatiquement les commandes si l'option est activée
    if (autoDeployCommands) {
        log('Déploiement automatique des commandes activé...');
        try {
            const success = await deployCommands();
            if (success) {
                log('Déploiement automatique des commandes réussi.');
            } else {
                log('Échec du déploiement automatique des commandes.');
            }
        } catch (error) {
            log(`Erreur lors du déploiement automatique des commandes: ${error}`);
        }
    }
    
    // Démarrer la mise à jour automatique des embeds
    updateAllServerEmbeds();
    updateInterval_ID = setInterval(updateAllServerEmbeds, updateInterval);
    log(`Mise à jour automatique des embeds configurée (toutes les ${updateInterval / 60000} minutes)`);
});

// Événement déclenché lorsqu'une interaction est créée
client.on(Events.InteractionCreate, async interaction => {
    try {
        // Gérer l'autocomplétion
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command || !command.autocomplete) {
                return;
            }
            
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                log(`Erreur lors de l'autocomplétion pour ${interaction.commandName}: ${error}`);
            }
            return;
        }
        
        // Gérer les commandes slash
        if (!interaction.isChatInputCommand()) return;
        
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            log(`Commande inconnue: ${interaction.commandName}`);
            return;
        }
        
        log(`Exécution de la commande ${interaction.commandName} par ${interaction.user.tag}`);
        
        await command.execute(interaction);
    } catch (error) {
        log(`Erreur lors du traitement de l'interaction: ${error}`);
        
        // Répondre à l'utilisateur en cas d'erreur
        const replyContent = {
            content: 'Une erreur est survenue lors de l\'exécution de cette commande.',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyContent);
        } else {
            await interaction.reply(replyContent);
        }
    }
});

// Gérer les erreurs non gérées
process.on('unhandledRejection', error => {
    log(`Erreur non gérée: ${error}`);
});

// Gérer la fermeture propre du bot
function shutdown() {
    log('Arrêt du bot...');
    
    // Arrêter l'intervalle de mise à jour
    if (updateInterval_ID) {
        clearInterval(updateInterval_ID);
        log('Intervalle de mise à jour arrêté.');
    }
    
    // Fermer la connexion Discord
    client.destroy();
    log('Connexion Discord fermée.');
    
    // Fermer le fichier de log
    logger.end();
    
    process.exit(0);
}

// Gérer les signaux d'arrêt
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Connexion à Discord
client.login(token).catch(error => {
    log(`Erreur lors de la connexion à Discord: ${error}`);
    process.exit(1);
});
