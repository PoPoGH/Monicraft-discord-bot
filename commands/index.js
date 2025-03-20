/**
 * Gestionnaire de commandes pour le bot Discord
 * Charge et exporte toutes les commandes disponibles
 */

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

// Collection pour stocker les commandes
const commands = new Collection();
const commandsData = [];

// Charger toutes les commandes du dossier
const commandFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'index.js');

for (const file of commandFiles) {
    const command = require(path.join(__dirname, file));
    
    // Vérifier que la commande a les propriétés requises
    if ('data' in command && 'execute' in command) {
        commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
        console.log(`Commande chargée: ${command.data.name}`);
    } else {
        console.warn(`La commande ${file} n'a pas les propriétés "data" ou "execute" requises.`);
    }
}

module.exports = {
    commands,
    commandsData
};
