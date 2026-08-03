module.exports = {
    name: "menu",
    aliases: ["help", "h"],
    category: "Information",
    desc: "Show all available commands",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const { wasi_plugins, wasi_sender, wasi_msg, wasi_isLid } = context || {};
        const isLid = wasi_isLid || (wasi_origin && wasi_origin.endsWith('@lid'));
        const categories = {};
        const handledCommands = new Set();
        for (const [key, plugin] of wasi_plugins.entries()) {
            if (handledCommands.has(plugin.name)) continue;
            handledCommands.add(plugin.name);
            const category = plugin.category || "General";
            if (!categories[category]) categories[category] = [];
            categories[category].push(plugin);
        }
        let menuText = "⚡ *KAIF MD V2 AUTOFORWARD BOT* ⚡\n\n";
        menuText += "👤 *User:* @" + (wasi_sender ? wasi_sender.split("@")[0] : "User") + "\n";
        menuText += "📜 *Prefix:* .\n";
        menuText += "🔧 *Commands:* " + handledCommands.size + "\n\n";
        for (const category in categories) {
            menuText += "╭───┈ *" + category + "* ┈───\n";
            categories[category].forEach(cmd => {
                menuText += "│ ✦ ." + cmd.name + "\n";
            });
            menuText += "╰─────────────────\n\n";
        }
        menuText += "> _Developed by Kaif x Chaudhary_";
        try {
            if (isLid) {
                await wasi_sock.sendMessage(wasi_origin, { text: menuText });
            } else {
                await wasi_sock.sendMessage(wasi_origin, { text: menuText, mentions: wasi_sender ? [wasi_sender] : [] }, { quoted: wasi_msg });
            }
        } catch (e) {
            await wasi_sock.sendMessage(wasi_origin, { text: menuText });
        }
    }
};