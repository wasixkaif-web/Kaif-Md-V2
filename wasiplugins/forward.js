module.exports = {
    name: "forward",
    aliases: ["f"],
    category: "Tools",
    desc: "Forward a replied message to multiple JIDs (private, group, or newsletter)",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const { wasi_msg, wasi_args, wasi_sender } = context || {};
        const targetChat = wasi_origin || wasi_sender;
        let quoted = wasi_msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                     wasi_msg?.message?.imageMessage?.contextInfo?.quotedMessage ||
                     wasi_msg?.message?.videoMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            return await wasi_sock.sendMessage(targetChat, { text: "❌ Please reply to a message you want to forward." }, { quoted: wasi_msg });
        }
        if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
        if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
        const { processAndCleanMessage } = require("../wasilib/cleaner");
        quoted = processAndCleanMessage(quoted);
        const inputArgs = (wasi_args || []).join(" ");
        if (!inputArgs) {
            const usage = "❌ *Invalid Usage*\n\nProvide JIDs separated by commas.\nExample: .f 123@s.whatsapp.net, 456@g.us, 120363@newsletter";
            return await wasi_sock.sendMessage(targetChat, { text: usage }, { quoted: wasi_msg });
        }
        const targetJids = inputArgs.split(",").map(j => j.trim()).filter(j => j.length > 0);
        if (targetJids.length === 0) {
            return await wasi_sock.sendMessage(targetChat, { text: "❌ No valid JIDs found." }, { quoted: wasi_msg });
        }
        const mType = Object.keys(quoted).find(k => k.endsWith("Message") || k === "conversation" || k === "stickerMessage");
        if (mType && quoted[mType] && typeof quoted[mType] === "object") {
            if (quoted[mType].contextInfo) {
                delete quoted[mType].contextInfo.isForwarded;
                delete quoted[mType].contextInfo.forwardingScore;
                delete quoted[mType].contextInfo.forwardedNewsletterMessageInfo;
                quoted[mType].contextInfo.isForwarded = false;
            }
        }
        let successCount = 0;
        let failCount = 0;
        const failedJids = [];
        for (const jid of targetJids) {
            try {
                let target = jid;
                if (!target.includes("@")) target = target + "@s.whatsapp.net";
                await wasi_sock.relayMessage(target, quoted, { messageId: wasi_sock.generateMessageTag() });
                successCount++;
                await new Promise(r => setTimeout(r, 600));
            } catch (error) {
                console.error("Relay failed for " + jid + ":", error.message);
                failCount++;
                failedJids.push(jid);
            }
        }
        if (failCount > 0) {
            let report = "⚠️ *Some JIDs failed to receive message*\n\n❌ *Failed:* " + failCount + "\n✨ *Mode:* Native Relay\n\n*Failed List:*\n" + failedJids.map(j => "> " + j).join("\n");
            await wasi_sock.sendMessage(targetChat, { text: report }, { quoted: wasi_msg });
        } else {
            await wasi_sock.sendMessage(targetChat, { text: "✅ Successfully forwarded message to " + successCount + " target(s)." }, { quoted: wasi_msg });
        }
    }
};