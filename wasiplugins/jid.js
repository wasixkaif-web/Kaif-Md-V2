module.exports = {
    name: "jid",
    aliases: ["id", "chatjid", "myjid"],
    category: "Tools",
    desc: "Get the JID of the current chat, sender, or quoted user",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        try {
            const { wasi_sender, wasi_msg, wasi_isLid } = context || {};
            const chatJid = wasi_origin || wasi_msg?.key?.remoteJid;
            const senderJid = wasi_sender || (wasi_msg?.key?.participant || chatJid);
            const isLid = wasi_isLid || (chatJid && chatJid.endsWith('@lid'));
            const contextInfo = wasi_msg?.message?.extendedTextMessage?.contextInfo ||
                               wasi_msg?.message?.imageMessage?.contextInfo ||
                               wasi_msg?.message?.videoMessage?.contextInfo ||
                               wasi_msg?.message?.documentMessage?.contextInfo;
            const quotedParticipant = contextInfo?.participant;
            let response = "📍 *Chat JID:* " + chatJid + "\n";
            response += "👤 *Sender JID:* " + senderJid;
            if (quotedParticipant) {
                const normQuoted = quotedParticipant.replace(/:\d+/, '');
                response += "\n💬 *Quoted User JID:* " + normQuoted;
            }
            try {
                await wasi_sock.sendMessage(chatJid, { text: response }, isLid ? {} : { quoted: wasi_msg });
            } catch (e) {
                await wasi_sock.sendMessage(chatJid, { text: response });
            }
        } catch (err) {
            console.error("[JID ERROR]", err.message);
            try {
                await wasi_sock.sendMessage(wasi_origin, { text: "📍 *Chat JID:* " + wasi_origin });
            } catch (e) {}
        }
    }
};