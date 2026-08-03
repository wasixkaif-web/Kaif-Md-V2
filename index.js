/**
 * KAIF MD V2 AUTOFORWARD BOT
 * Main Entry Point
 * Developed by Kaif x Chaudhary
 */
require('dotenv').config();

// Configure DNS servers to fix querySrv ECONNREFUSED for MongoDB Atlas
const dns = require('dns');
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const {
    DisconnectReason,
    jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');

const { wasi_connectSession, wasi_clearSession } = require('./wasilib/session');
const { 
    wasi_connectDatabase, 
    wasi_getGroupSettings, 
    wasi_isDbConnected, 
    wasi_getGlobalAutoForward,
    wasi_updateGlobalAutoForward,
    wasi_getBotConfig,
    wasi_updateBotConfig
} = require('./wasilib/database');
const config = require('./wasi');

const wasi_app = express();
const wasi_port = process.env.PORT || 3000;

// --------------------------------------------------------------------------
// PLUGIN LOADER
// --------------------------------------------------------------------------
const wasi_plugins = new Map();

function wasi_loadPlugins() {
    const pluginDir = path.join(__dirname, 'wasiplugins');
    if (!fs.existsSync(pluginDir)) return;

    const requested = ['autoforward.js', 'forward.js', 'gjids.js', 'jid.js', 'uptime.js', 'ping.js', 'menu.js', 'antidelete.js', 'status.js'];
    
    for (const file of requested) {
        const filePath = path.join(pluginDir, file);
        if (fs.existsSync(filePath)) {
            try {
                delete require.cache[require.resolve('./wasiplugins/' + file)];
                const plugin = require('./wasiplugins/' + file);
                if (plugin.name) {
                    const name = plugin.name.toLowerCase();
                    wasi_plugins.set(name, plugin);
                    if (plugin.aliases && Array.isArray(plugin.aliases)) {
                        plugin.aliases.forEach(alias => wasi_plugins.set(alias.toLowerCase(), plugin));
                    }
                }
            } catch (e) {
                console.error('X Failed to load plugin ' + file + ':', e.message);
            }
        }
    }
    console.log('C Loaded ' + wasi_plugins.size + ' core commands.');
}

// --------------------------------------------------------------------------
// TEXT REPLACEMENT & CLEANING CONFIG
// --------------------------------------------------------------------------
const { processAndCleanMessage } = require('./wasilib/cleaner');

// --------------------------------------------------------------------------
// SESSION STATE
// --------------------------------------------------------------------------
const sessions = new Map();
const wasi_messageStore = new Map();
const wasi_processedDeletes = new Set();

// Middleware
wasi_app.use(express.json());
wasi_app.use(express.static(path.join(__dirname, 'public')));

// Keep-Alive Route
wasi_app.get('/ping', (req, res) => res.status(200).send('pong'));

// --------------------------------------------------------------------------
// 24-HOUR AUTO CLEANUP & MAINTENANCE LOGIC
// --------------------------------------------------------------------------
async function wasi_runDailyCleanup() {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    let purgedCount = 0;
    for (const [key, val] of wasi_messageStore.entries()) {
        const itemTs = val?.timestamp || (val?.messageTimestamp ? val.messageTimestamp * 1000 : 0);
        if (itemTs && (now - itemTs > ONE_DAY_MS)) {
            wasi_messageStore.delete(key);
            purgedCount++;
        }
    }
    if (wasi_messageStore.size > 1000) {
        const keysToDelete = Array.from(wasi_messageStore.keys()).slice(0, wasi_messageStore.size - 500);
        keysToDelete.forEach(k => wasi_messageStore.delete(k));
    }
    wasi_processedDeletes.clear();
    try {
        const db = require('./wasilib/database');
        if (db.wasi_isDbConnected()) {
            const sessionId = config.sessionId || 'wasi_session';
            await db.wasi_cleanupOldData(sessionId);
        }
    } catch (e) {}
    console.log('🧹 [24H CLEANUP] Successfully refreshed bot memory & database. Purged ' + purgedCount + ' old messages.');
    return { purgedMessages: purgedCount, timestamp: new Date() };
}

setInterval(wasi_runDailyCleanup, 24 * 60 * 60 * 1000);
setTimeout(wasi_runDailyCleanup, 10000);

wasi_app.post('/api/clear-cache', async (req, res) => {
    try {
        const result = await wasi_runDailyCleanup();
        res.json({ success: true, message: 'Purged ' + result.purgedMessages + ' stale items and refreshed storage.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Dashboard APIs
wasi_app.get('/api/status', async (req, res) => {
    try {
        const sessionId = config.sessionId || 'wasi_session';
        const session = sessions.get(sessionId);
        res.json({
            connected: session?.isConnected || false,
            qr: session?.qr || null,
            dbConnected: wasi_isDbConnected()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

wasi_app.get('/api/config', async (req, res) => {
    try {
        const db = require('./wasilib/database');
        const sessionId = config.sessionId || 'wasi_session';
        const cfg = await db.wasi_getGlobalAutoForward(sessionId);
        const botCfg = await db.wasi_getBotConfig(sessionId);
        res.json({
            enabled: cfg?.enabled !== false,
            autoStatusSeen: botCfg?.autoStatusSeen !== false,
            antiDeleteMode: botCfg?.antiDeleteMode || 'chat',
            antiDelete: botCfg?.antiDelete !== false,
            sourceJids: cfg?.sourceJids || [],
            targetJids: cfg?.targetJids || [],
            oldTextRegex: cfg?.oldTextRegex || [],
            newText: cfg?.newText || ''
        });
    } catch (e) {
        res.json({ enabled: true, autoStatusSeen: true, antiDeleteMode: 'chat', antiDelete: true, sourceJids: [], targetJids: [], oldTextRegex: [], newText: '' });
    }
});

wasi_app.post('/api/config', async (req, res) => {
    try {
        const db = require('./wasilib/database');
        const sessionId = config.sessionId || 'wasi_session';
        const { sourceJids, targetJids, oldTextRegex, newText, enabled, autoStatusSeen, antiDeleteMode, antiDelete } = req.body || {};
        await db.wasi_updateGlobalAutoForward(sessionId, {
            enabled: enabled !== undefined ? enabled : true,
            sourceJids: Array.isArray(sourceJids) ? sourceJids : [],
            targetJids: Array.isArray(targetJids) ? targetJids : [],
            oldTextRegex: Array.isArray(oldTextRegex) ? oldTextRegex : [],
            newText: newText || ''
        });
        await db.wasi_updateBotConfig(sessionId, {
            autoStatusSeen: autoStatusSeen !== undefined ? autoStatusSeen : true,
            antiDeleteMode: antiDeleteMode || 'chat',
            antiDelete: antiDelete !== undefined ? antiDelete : true
        });
        res.json({ success: true });
    } catch (e) {
        console.error('Error saving config:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});
// --------------------------------------------------------------------------
// SESSION MANAGEMENT
// --------------------------------------------------------------------------
async function startSession(sessionId) {
    if (sessions.has(sessionId)) {
        const existing = sessions.get(sessionId);
        if (existing.isConnected && existing.sock) return;
        if (existing.sock) {
            try {
                existing.sock.ev.removeAllListeners('connection.update');
                existing.sock.end(undefined);
            } catch (e) {}
            sessions.delete(sessionId);
        }
    }

    console.log('[ Starting session: ' + sessionId);
    const sessionState = { sock: null, isConnected: false, qr: null };
    sessions.set(sessionId, sessionState);

    const { wasi_sock, saveCreds } = await wasi_connectSession(false, sessionId);
    sessionState.sock = wasi_sock;

    console.log('[' + sessionId + '] Socket created, listening for events...');

    wasi_sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                sessionState.qr = await qrcode.toDataURL(qr);
                console.log('\n===================================================');
                console.log('SCAN THE QR CODE BELOW WITH WHATSAPP ON YOUR PHONE');
                console.log('===================================================\n');
                const qrTerminal = await qrcode.toString(qr, { type: 'terminal', small: true });
                console.log(qrTerminal);
                console.log('===================================================\n');
            } catch (e) {
                console.error('Failed to display QR code:', e.message);
            }
        }

        if (connection === 'close') {
            sessionState.isConnected = false;
            sessionState.qr = null;
            const statusCode = (lastDisconnect?.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode : (lastDisconnect?.error?.output?.statusCode || 500);
            const reason = lastDisconnect?.error?.message || 'Unknown Disconnect';

            console.log('X [' + sessionId + '] Connection closed (Status: ' + statusCode + ', Reason: ' + reason + ')');

            const isLogout = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 440;
            if (isLogout) {
                console.log('C [' + sessionId + '] Logged out or expired session. Clearing MongoDB auth and restarting for new QR...');
                sessions.delete(sessionId);
                await wasi_clearSession(sessionId);
                setTimeout(() => startSession(sessionId), 2000);
            } else {
                console.log('l [' + sessionId + '] Reconnecting in 3 seconds...');
                setTimeout(() => startSession(sessionId), 3000);
            }
        } else if (connection === 'open') {
            sessionState.isConnected = true;
            sessionState.qr = null;
            const userJid = wasi_sock?.user?.id ? jidNormalizedUser(wasi_sock.user.id) : 'Connected User';
            console.log('C [' + sessionId + '] Connected to WhatsApp successfully as: ' + userJid);
        }
    });

    wasi_sock.ev.on('creds.update', saveCreds);

    async function processDeletedMessage(msgId, chatJid, deleter) {
    if (!msgId || wasi_processedDeletes.has(msgId)) return;
    const botCfg = await wasi_getBotConfig(sessionId);
    if (botCfg && botCfg.antiDelete === false) return;
    const cachedVal = wasi_messageStore.get(msgId);
    const cachedMsg = cachedVal?.message || cachedVal;
    if (!cachedMsg) return;
    wasi_processedDeletes.add(msgId);
    const deletedSender = jidNormalizedUser(cachedMsg.key?.participant || (cachedMsg.key && cachedMsg.key.remoteJid) || chatJid);
    const deleterJid = jidNormalizedUser(deleter || chatJid);
    const time = new Date(cachedMsg.messageTimestamp ? cachedMsg.messageTimestamp * 1000 : Date.now()).toLocaleString();
    const mode = botCfg?.antiDeleteMode || 'chat';
    const ownerJid = wasi_sock?.user?.id ? jidNormalizedUser(wasi_sock.user.id) : (config.ownerNumber ? config.ownerNumber.replace(/\D/g, '') + '@s.whatsapp.net' : null);
    let targetJids = [];
    if (mode === 'inbox' || mode === 'pm') {
        if (ownerJid) targetJids.push(ownerJid);
        else targetJids.push(chatJid);
    } else if (mode === 'both') {
        targetJids.push(chatJid);
        if (ownerJid) targetJids.push(ownerJid);
    } else {
        targetJids.push(chatJid);
    }
    targetJids = Array.from(new Set(targetJids.filter(Boolean)));
    console.log('[ ANTI-DELETE ] Message deleted by ' + deleterJid + ' (Sender: ' + deletedSender + ') in ' + chatJid + ' [Mode: ' + mode + ']');
    let mentions = [deletedSender];
    if (deleterJid !== deletedSender) mentions.push(deleterJid);
    let deletedMsgContent = processAndCleanMessage(cachedMsg.message);
    if (deletedMsgContent.viewOnceMessageV2) deletedMsgContent = deletedMsgContent.viewOnceMessageV2.message;
    if (deletedMsgContent.viewOnceMessage) deletedMsgContent = deletedMsgContent.viewOnceMessage.message;
    const isMedia = !!(deletedMsgContent.imageMessage || deletedMsgContent.videoMessage || deletedMsgContent.audioMessage || deletedMsgContent.documentMessage || deletedMsgContent.stickerMessage);
    const bodyText = deletedMsgContent.conversation || deletedMsgContent.extendedTextMessage?.text || deletedMsgContent.imageMessage?.caption || deletedMsgContent.videoMessage?.caption || deletedMsgContent.documentMessage?.caption || '';
    let baseHeader = '🗑️ *Anti Delete Message Recovered*\n\n';
    baseHeader += '👤 *Sender:* @' + (deletedSender.split('@')[0] || 'Unknown') + '\n';
    baseHeader += '📍 *Source Chat:* ' + chatJid + '\n';
    baseHeader += '⏰ *Time:* ' + time + '\n\n';
    for (const targetJid of targetJids) {
        let captionText = baseHeader;
        if (!isMedia) {
            captionText += '💬 *Deleted Message:*\n\n' + (bodyText || '[Empty Message]');
            await wasi_sock.sendMessage(targetJid, { text: captionText, mentions });
        } else {
            if (bodyText) captionText += '💬 *Caption:* ' + bodyText + '\n\n';
            captionText += '📌 *Resending deleted media below:*';
            await wasi_sock.sendMessage(targetJid, { text: captionText, mentions });
            await wasi_sock.relayMessage(targetJid, deletedMsgContent, { messageId: wasi_sock.generateMessageTag() });
        }
    }
}

wasi_sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
        if (!update.update?.messageStubType) continue;
        if (update.update.messageStubType !== 1 && update.update.messageStubType !== 68) continue;
        try {
            const msgId = update.key?.id;
            const chatJid = update.key?.remoteJid;
            const deleter = update.key?.participant || chatJid;
            await processDeletedMessage(msgId, chatJid, deleter);
        } catch (err) {
            console.error('[ ANTI-DELETE-ERROR ]', err.message);
        }
    }
});


wasi_sock.ev.on('messages.upsert', async (chatUpdate) => {
        for (const wasi_msg of chatUpdate.messages) {
            if (!wasi_msg.message) continue;

            const rawOrigin = wasi_msg.key.remoteJid;
            const wasi_sender = jidNormalizedUser(wasi_msg.key.participant || rawOrigin);
            const isLid = !!(rawOrigin && rawOrigin.endsWith('@lid'));
            const wasi_origin = rawOrigin;
            const msgId = wasi_msg.key.id;

            if (msgId) wasi_messageStore.set(msgId, { message: wasi_msg, timestamp: Date.now() });
            if (wasi_messageStore.size > 1000) {
                const firstKey = wasi_messageStore.keys().next().value;
                wasi_messageStore.delete(firstKey);
            }

            if (wasi_origin === 'status@broadcast') {
                try {
                    const botCfg = await wasi_getBotConfig(sessionId);
                    if (botCfg ? botCfg.autoStatusSeen !== false : true) {
                        await wasi_sock.readMessages([wasi_msg.key]);
                        console.log('👁️ [AUTO STATUS] Auto viewed status from:', wasi_sender);
                    }
                } catch (err) {
                    console.error('❌ [AUTO STATUS ERROR]:', err.message);
                }
                continue;
            }

            let msgObj = wasi_msg.message;
            if (msgObj.ephemeralMessage) msgObj = msgObj.ephemeralMessage.message;
            if (msgObj.viewOnceMessageV2) msgObj = msgObj.viewOnceMessageV2.message;
            if (msgObj.viewOnceMessage) msgObj = msgObj.viewOnceMessage.message;
            if (msgObj.editedMessage?.message) msgObj = msgObj.editedMessage.message;

            const wasi_text = msgObj.conversation ||
                msgObj.extendedTextMessage?.text ||
                msgObj.imageMessage?.caption ||
                msgObj.videoMessage?.caption ||
                msgObj.documentMessage?.caption ||
                msgObj.buttonsResponseMessage?.selectedButtonId ||
                msgObj.templateButtonReplyMessage?.selectedId ||
                msgObj.listResponseMessage?.singleSelectReply?.selectedRowId || '';

            if (wasi_text && !wasi_msg.key.fromMe) {
                console.log('[ MSG ] From ' + wasi_sender + ' in ' + wasi_origin + ': ' + wasi_text.slice(0, 60));
            }

            if (wasi_origin.endsWith('@g.us') && !wasi_msg.key.fromMe) {
                try {
                    const globalCfg = await wasi_getGlobalAutoForward(sessionId);
                    if (globalCfg?.enabled && globalCfg.sourceJids?.includes(wasi_origin) && globalCfg.targetJids?.length > 0) {
                        let relayMsg = processAndCleanMessage(wasi_msg.message);
                        if (relayMsg.viewOnceMessageV2) relayMsg = relayMsg.viewOnceMessageV2.message;
                        if (relayMsg.viewOnceMessage) relayMsg = relayMsg.viewOnceMessage.message;
                        if (globalCfg.autoForwardTimestamp && relayMsg.conversation) {
                            const time = new Date().localeTimeString();
                            relayMsg.conversation = relayMsg.conversation + '\n\n_[' + time + ']_';
                        }
                        for (const targetJid of globalCfg.targetJids) {
                            try {
                                console.log('[ GLOBAL-FORWARD ] Relaying from ' + wasi_origin + ' -> ' + targetJid);
                                await wasi_sock.relayMessage(targetJid, relayMsg, {
                                     messageId: wasi_sock.generateMessageTag()
                                });
                            } catch (err) {
                                console.error('[ GLOBAL-FORWARD ] Failed for ' + targetJid + ':', err.message);
                            }
                        }
                    }
                } catch (err) { }
            }

            if (wasi_origin.endsWith('@g.us') && !wasi_msg.key.fromMe) {
                try {
                    const groupSettings = await wasi_getGroupSettings(sessionId, wasi_origin);
                    if (groupSettings && groupSettings.autoForward && groupSettings.autoForwardTargets?.length > 0) {
                        let relayMsg = processAndCleanMessage(wasi_msg.message);
                        if (relayMsg.viewOnceMessageV2) relayMsg = relayMsg.viewOnceMessageV2.message;
                        if (relayMsg.viewOnceMessage) relayMsg = relayMsg.viewOnceMessage.message;
                        for (const targetJid of groupSettings.autoForwardTargets) {
                            try {
                                console.log('[ GROUP-FORWARD ] Relaying from ' + wasi_origin + ' -> ' + targetJid);
                                await wasi_sock.relayMessage(targetJid, relayMsg, {
                                     messageId: wasi_sock.generateMessageTag()
                                });
                            } catch (err) {
                                console.error('[ GROUP-FORWARD ] Failed for ' + targetJid + ':', err.message);
                            }
                        }
                    }
                } catch (err) { }
            }

            const cleanText = wasi_text.trim();
            if (cleanText) {
                const prefixes = ['.', '!', '#', '/'];
                let wasi_cmd_input = '';
                let wasi_args = [];

                const matchedPrefix = prefixes.find(p => cleanText.startsWith(p));
                if (matchedPrefix) {
                    const wasi_parts = cleanText.slice(matchedPrefix.length).trim().split(/\s+/);
                    wasi_cmd_input = wasi_parts[0]?.toLowerCase() || '';
                    wasi_args = wasi_parts.slice(1);
                } else {
                    const wasi_parts = cleanText.split(/\s+/);
                    const potCmd = wasi_parts[0]?.toLowerCase() || '';
                    if (wasi_plugins.has(potCmd)) {
                        wasi_cmd_input = potCmd;
                        wasi_args = wasi_parts.slice(1);
                    }
                }

                if (wasi_cmd_input && wasi_plugins.has(wasi_cmd_input)) {
                    const plugin = wasi_plugins.get(wasi_cmd_input);
                    try {
                        console.log('[ CMD ] Executing plugin .' + wasi_cmd_input + ' by ' + wasi_sender);
                        const isGroup = wasi_origin.endsWith('@g.us');
                        let wasi_isAdmin = false;
                        if (isGroup) {
                            try {
                                const groupMetadata = await wasi_sock.groupMetadata(wasi_origin);
                                const senderMod = groupMetadata.participants.find(p => jidNormalizedUser(p.id) === wasi_sender);
                                wasi_isAdmin = (senderMod?.admin === 'admin' || senderMod?.admin === 'superadmin');
                            } catch (e) { }
                        }

                        const botNum = wasi_sock?.user?.id ? jidNormalizedUser(wasi_sock.user.id).replace(/\D/g, '') : '';
                        const envOwner = (process.env.OWNER_NUMBER || config.ownerNumber || '923466859436').replace(/\D/g, '');
                        const botCfg = await wasi_getBotConfig(sessionId);
                        const sudoList = (botCfg?.sudo || []).map(s => String(s).replace(/\D/g, ''));

                        const senderNum = wasi_sender.replace(/\D/g, '');
                        const isSudo = wasi_msg.key.fromMe ||
                            (botNum && senderNum && senderNum.includes(botNum)) ||
                            (envOwner && senderNum && senderNum.includes(envOwner)) ||
                            sudoList.some(s => s && senderNum.includes(s));
                        const isOwner = isSudo || !wasi_origin.endsWith('@g.us');

                        const sendReply = async (content, options = {}) => {
                            const cleanOpts = { ...options };
                            if (isLid) {
                                delete cleanOpts.quoted;
                            } else if (cleanOpts.quoted === undefined) {
                                cleanOpts.quoted = wasi_msg;
                            }
                            try {
                                return await wasi_sock.sendMessage(wasi_origin, content, cleanOpts);
                            } catch (e1) {
                                try {
                                    delete cleanOpts.quoted;
                                    return await wasi_sock.sendMessage(wasi_origin, content, cleanOpts);
                                } catch (e2) {
                                    try {
                                        const plainText = typeof content === 'string' ? content : (content.text || '');
                                        if (plainText) {
                                            return await wasi_sock.sendMessage(wasi_origin, { text: plainText });
                                        }
                                    } catch (e3) {
                                        console.error('[SEND ERROR] Failed to send to ' + wasi_origin + ':', e3.message);
                                    }
                                }
                            }
                        };
await plugin.wasi_handler(wasi_sock, wasi_origin, {
                            wasi_sender,
                            wasi_msg,
                            wasi_args,
                            sessionId,
                            wasi_text,
                            wasi_isGroup: isGroup,
                            wasi_isAdmin,
                            wasi_isOwner: isOwner,
                            wasi_isSudo: isOwner,
                            wasi_plugins,
                            wasi_isLid: isLid,
                            sendReply
                        });
                    } catch (err) {
                        console.error('Error in plugin ' + wasi_cmd_input + ':', err.message);
                    }
                }
            }
        }
    });
}


async function main() {
    wasi_app.listen(wasi_port, '0.0.0.0', () => {
        console.log('🌐 Dashboard running on port ' + wasi_port + ': http://localhost:' + wasi_port);
    });

    wasi_loadPlugins();

    try {
        if (config.mongoDbUrl) {
            const dbwasi_Result = await wasi_connectDatabase(config.mongoDbUrl);
            if (dbwasi_Result) console.log('✅ Database connected successfully');
        }

        const sessionId = config.sessionId || 'wasi_session';
        await startSession(sessionId);
    } catch (err) {
        console.error('Initialization Error:', err);
    }
}

main();
