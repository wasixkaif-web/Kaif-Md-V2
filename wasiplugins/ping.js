module.exports = {
    name: "ping",
    category: "Information",
    desc: "Show the bot response speed",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const { wasi_msg, wasi_isLid } = context || {};
        const isLid = wasi_isLid || (wasi_origin && wasi_origin.endsWith('@lid'));
        const start = Date.now();
        try {
            const sendOptions = isLid ? {} : { quoted: wasi_msg };
            let pingMsg;
            try {
                pingMsg = await wasi_sock.sendMessage(wasi_origin, { text: "🏓 *Pinging...*" }, sendOptions);
            } catch (e) {
                pingMsg = await wasi_sock.sendMessage(wasi_origin, { text: "🏓 *Pinging...*" });
            }
            const end = Date.now();
            const responseTime = end - start;
            const timeStampSec = wasi_msg?.messageTimestamp ? (typeof wasi_msg.messageTimestamp === "number" ? wasi_msg.messageTimestamp : (wasi_msg.messageTimestamp.low || Date.now() / 1000)) : Date.now() / 1000;
            const incomingLatency = Math.max(0, Math.floor(Date.now() - (timeStampSec * 1000)));
            let report = "🏓 *Pong!* — *" + responseTime + "ms*\n";
            report += "📡 *Latency:* " + incomingLatency + "ms";
            if (pingMsg?.key && !isLid) {
                try {
                    await wasi_sock.sendMessage(wasi_origin, { text: report, edit: pingMsg.key });
                    return;
                } catch (e) {}
            }
            await wasi_sock.sendMessage(wasi_origin, { text: report });
        } catch (err) {
            console.error("[PING ERROR]", err.message);
            try {
                await wasi_sock.sendMessage(wasi_origin, { text: "🏓 *Pong!*" });
            } catch (e) {}
        }
    }
};