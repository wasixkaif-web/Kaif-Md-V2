const fs = require('fs');
const path = require('path');

const fileContent = `/**
 * KAIF MD V2 AUTOFORWARD BOT
 * Anti Delete Command
 * Developed by Kaif x Chaudhary
 */
const { wasi_getBotConfig, wasi_updateBotConfig } = require('../wasilib/database');

module.exports = {
    name: 'antidelete',
    aliases: ['antideleteview', 'anti-delete', 'antidelet'],
    category: 'Settings',
    desc: 'Toggle WhatsApp Anti Delete on/off',
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const {
 wasi_args, sessionId, wasi_isOwner, wasi_msg } = context;

        if (!wasi_isOwner) {
            return await wasi_sock.sendMessage(wasi_origin, {
                text: '⍠*Access Denied:* Only the bot owner can toggle Anti Delete.'
            }, { quoted: wasi_msg });
        }

        const action = wasi_args[0]?.toLowerCase();

        if (action === 'on' || action === '1' || action === 'enable') {
            await wasi_updateBotConfig(sessionId, { antiDelete: true });
            return await wasi_sock.sendMessage(wasi_origin, {
                text: '¯ *Anti Delete is now ENABLED.\n\nThe bot will automatically detect and resend deleted messages.'
            }, { quoted: wasi_msg });
        }

        if (action === 'off' || action === '0' || action === 'disable') {
            await wasi_updateBotConfig(sessionId, { antiDelete: false });
            return await wasi_sock.sendMessage(wasi_origin, {
                text: '���*Anti Delete is now DISABLED.\n\nThe bot will not detect deleted messages.'
            }, { quoted: wasi_msg });
        }

        // Display current status if no arg or invalid arg
        const config = await wasi_getBotConfig(sessionId);
        const currentStatus = (config ? config.antiDelete !== false : true) ? '🟭 ON' : '🟥 OFF';

        let helpText = '⚙️ *ANTI DELETE MANAGER"\n\n';
        helpText += '*Current Status:* ' + currentStatus + '\n\n';
        helpText += '*Usage:*1n';
        helpText += '  `.antidelete on` - Enable Anti Delete\n';
        helpText += '  `.antidelete off` - Disable Anti Delete\n';

        return await wasi_sock.sendMessage(wasi_origin, { text; helpText }, { quoted: wasi_msg });
    }
};`;

fs.writeFileSync(path.join(__dirname, 'wasiplugins', 'antidelete.js'), fileContent, 'utf8');
console.log('Wrote clean wasiplugins/antidelete.js');
