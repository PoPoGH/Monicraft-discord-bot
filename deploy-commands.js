/**
 * Script pour déployer les commandes slash sur Discord
 * À exécuter après chaque modification des commandes
 * 
 * Options:
 * --global : Déploie les commandes globalement (pour tous les serveurs)
 * --dev : Déploie les commandes uniquement sur les serveurs de développement
 * --guild=ID : Déploie les commandes sur un serveur spécifique (peut être répété)
 * --delete : Supprime toutes les commandes (globalement ou sur les serveurs spécifiés)
 * --delete-guild=ID : Supprime toutes les commandes d'un serveur spécifique
 */

const { REST, Routes } = require('discord.js');
const { token, clientId, isDev, devGuildIds } = require('./config.json');
const { commandsData } = require('./commands');
const fs = require('fs');

// Créer un fichier de log pour les déploiements
const logDir = './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = `${logDir}/deploy-commands-${new Date().toISOString().replace(/:/g, '-')}.log`;
const logger = fs.createWriteStream(logFile, { flags: 'a' });

// Fonction pour écrire dans le log
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    logger.write(logMessage + '\n');
}

// Créer une instance REST pour interagir avec l'API Discord
const rest = new REST({ version: '10' }).setToken(token);

// Analyser les arguments de la ligne de commande
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        global: false,
        dev: isDev,
        guildIds: [...devGuildIds],
        delete: false,
        deleteGuildIds: []
    };

    for (const arg of args) {
        if (arg === '--global') {
            options.global = true;
            options.dev = false;
        } else if (arg === '--dev') {
            options.dev = true;
            options.global = false;
        } else if (arg.startsWith('--guild=')) {
            const guildId = arg.split('=')[1];
            if (guildId && !options.guildIds.includes(guildId)) {
                options.guildIds.push(guildId);
            }
            options.dev = true;
            options.global = false;
        } else if (arg === '--delete') {
            options.delete = true;
        } else if (arg.startsWith('--delete-guild=')) {
            const guildId = arg.split('=')[1];
            if (guildId && !options.deleteGuildIds.includes(guildId)) {
                options.deleteGuildIds.push(guildId);
            }
            options.delete = true;
        }
    }

    return options;
}

// Fonction pour déployer les commandes sur un serveur spécifique
async function deployCommandsToGuild(guildId) {
    try {
        log(`Déploiement des commandes sur le serveur ${guildId}...`);
        
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commandsData },
        );
        
        log(`Déploiement réussi de ${data.length} commandes slash sur le serveur ${guildId}.`);
        return true;
    } catch (error) {
        log(`Erreur lors du déploiement des commandes sur le serveur ${guildId}: ${error}`);
        return false;
    }
}

// Fonction pour déployer les commandes globalement
async function deployCommandsGlobally() {
    try {
        log(`Déploiement global des commandes...`);
        
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData },
        );
        
        log(`Déploiement global réussi de ${data.length} commandes slash.`);
        
        // Afficher les commandes déployées
        data.forEach(cmd => {
            log(`- ${cmd.name}: ${cmd.description}`);
        });
        
        return true;
    } catch (error) {
        log(`Erreur lors du déploiement global des commandes: ${error}`);
        return false;
    }
}

// Fonction pour supprimer toutes les commandes globalement
async function deleteCommandsGlobally() {
    try {
        log('Suppression de toutes les commandes globales...');
        
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] },
        );
        
        log('Toutes les commandes globales ont été supprimées avec succès.');
        return true;
    } catch (error) {
        log(`Erreur lors de la suppression des commandes globales: ${error}`);
        return false;
    }
}

// Fonction pour supprimer toutes les commandes d'un serveur spécifique
async function deleteCommandsFromGuild(guildId) {
    try {
        log(`Suppression de toutes les commandes du serveur ${guildId}...`);
        
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] },
        );
        
        log(`Toutes les commandes du serveur ${guildId} ont été supprimées avec succès.`);
        return true;
    } catch (error) {
        log(`Erreur lors de la suppression des commandes du serveur ${guildId}: ${error}`);
        return false;
    }
}

// Fonction principale pour déployer ou supprimer les commandes
async function deployCommands() {
    try {
        const options = parseArgs();
        let success = true;
        
        // Traiter les demandes de suppression en premier
        if (options.delete) {
            if (options.deleteGuildIds.length > 0) {
                // Supprimer les commandes des serveurs spécifiés
                log(`Suppression des commandes de ${options.deleteGuildIds.length} serveur(s)...`);
                
                for (const guildId of options.deleteGuildIds) {
                    const deleteSuccess = await deleteCommandsFromGuild(guildId);
                    success = success && deleteSuccess;
                }
            } else if (options.global) {
                // Supprimer toutes les commandes globales
                success = await deleteCommandsGlobally();
            } else if (options.dev && options.guildIds.length > 0) {
                // Supprimer les commandes des serveurs de développement
                log(`Mode développement: suppression des commandes de ${options.guildIds.length} serveur(s)...`);
                
                for (const guildId of options.guildIds) {
                    const deleteSuccess = await deleteCommandsFromGuild(guildId);
                    success = success && deleteSuccess;
                }
            } else {
                // Aucun serveur spécifié et pas de mode global, supprimer globalement par défaut
                log('Aucun serveur spécifié pour la suppression, suppression globale par défaut.');
                success = await deleteCommandsGlobally();
            }
            
            return success;
        }
        
        // Si ce n'est pas une suppression, procéder au déploiement
        log(`Début du déploiement de ${commandsData.length} commandes slash.`);
        
        if (options.global) {
            // Déployer les commandes globalement
            success = await deployCommandsGlobally();
        } else if (options.dev && options.guildIds.length > 0) {
            // Déployer les commandes sur les serveurs de développement
            log(`Mode développement: déploiement sur ${options.guildIds.length} serveur(s).`);
            
            for (const guildId of options.guildIds) {
                const guildSuccess = await deployCommandsToGuild(guildId);
                success = success && guildSuccess;
            }
        } else {
            // Aucun serveur spécifié et pas de mode global, déployer globalement par défaut
            log('Aucun serveur spécifié et pas de mode développement, déploiement global par défaut.');
            success = await deployCommandsGlobally();
        }
        
        return success;
    } catch (error) {
        log(`Erreur lors de l'opération sur les commandes: ${error}`);
        return false;
    } finally {
        logger.end();
    }
}

// Exécuter le déploiement si le script est appelé directement
if (require.main === module) {
    const options = parseArgs();
    const operationType = options.delete ? 'Suppression' : 'Déploiement';
    
    deployCommands()
        .then(success => {
            if (success) {
                console.log(`${operationType} terminé avec succès.`);
                process.exit(0);
            } else {
                console.error(`Échec de l'opération de ${operationType.toLowerCase()}.`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Erreur non gérée:', error);
            process.exit(1);
        });
}

module.exports = { deployCommands };
