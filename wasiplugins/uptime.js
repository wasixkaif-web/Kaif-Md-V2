module.exports = {
    name: "uptime",
    category: "Information",
    desc: "Show the bot uptime",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const { wasi_msg, wasi_isLid } = context || {};
        const isLid = wasi_isLid || (wasi_origin && wasi_origin.endsWith('@lid'));
        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        let uptimeStr = "*🤖 Bot Uptime*\n\n";
        if (days > 0) uptimeStr += "*Days:* " + days + "d ";
        if (hours > 0) uptimeStr += "*Hours:* " + hours + "h ";
        if (minutes > 0) uptimeStr += "*Minutes:* " + minutes + "m ";
        uptimeStr += "*Seconds:* " + seconds + "s";
        try {
            await wasi_sock.sendMessage(wasi_origin, { text: uptimeStr }, isLid ? {} : { quoted: wasi_msg });
        } catch (e) {
            await wasi_sock.sendMessage(wasi_origin, { text: uptimeStr });
        }
    }
};