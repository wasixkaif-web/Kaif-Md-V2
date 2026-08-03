const { wasi_getBotConfig, wasi_updateBotConfig } = require("../wasilib/database");
module.exports = {
    name: "status",
    aliases: ["autostatus", "statusview", "autostatusview"],
    category: "Settings",
    desc: "Toggle WhatsApp Auto Status View on/off",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const { wasi_args, sessionId, wasi_isOwner, wasi_msg } = context || {};
        if (!wasi_isOwner) {
            try {
                return await wasi_sock.sendMessage(wasi_origin, { text: "❌ *Access Denied:* Only the bot owner can toggle Auto Status View." }, { quoted: wasi_msg });
            } catch (e) {
                return await wasi_sock.sendMessage(wasi_origin, { text: "❌ *Access Denied:* Only the bot owner can toggle Auto Status View." });
            }
        }
        const action = wasi_args[0]?.toLowerCase();
        if (action === "on" || action === "1" || action === "enable") {
            await wasi_updateBotConfig(sessionId, { autoStatusSeen: true });
            try {
                return await wasi_sock.sendMessage(wasi_origin, { text: "✅ *Auto Status View is now ENABLED.*\n\nThe bot will automatically view status updates." }, { quoted: wasi_msg });
            } catch (e) {
                return await wasi_sock.sendMessage(wasi_origin, { text: "✅ *Auto Status View is now ENABLED.*" });
            }
        }
        if (action === "off" || action === "0" || action === "disable") {
            await wasi_updateBotConfig(sessionId, { autoStatusSeen: false });
            try {
                return await wasi_sock.sendMessage(wasi_origin, { text: "❌ *Auto Status View is now DISABLED.*\n\nThe bot will not view status updates automatically." }, { quoted: wasi_msg });
            } catch (e) {
                return await wasi_sock.sendMessage(wasi_origin, { text: "❌ *Auto Status View is now DISABLED.*" });
            }
        }
        const config = await wasi_getBotConfig(sessionId);
        const currentStatus = (config ? config.autoStatusSeen !== false : true) ? "🟢 ON" : "🔴 OFF";
        let helpText = "📱 *AUTO STATUS VIEW MANAGER*\n\n";
        helpText += "*Current Status:* " + currentStatus + "\n\n";
        helpText += "*Usage:*\n";
        helpText += "• .status on — Enable Auto Status View\n";
        helpText += "• .status off — Disable Auto Status View\n";
        try {
            return await wasi_sock.sendMessage(wasi_origin, { text: helpText }, { quoted: wasi_msg });
        } catch (e) {
            return await wasi_sock.sendMessage(wasi_origin, { text: helpText });
        }
    }
};