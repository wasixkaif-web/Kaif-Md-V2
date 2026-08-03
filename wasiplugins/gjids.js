module.exports = {
    name: "gjids",
    aliases: ["gjid", "groups", "grouplist"],
    category: "Tools",
    desc: "List all participating groups, their JIDs, and member counts",
    wasi_handler: async (wasi_sock, wasi_origin, context) => {
        const { wasi_msg, wasi_isLid } = context || {};
        try {
            const allGroupsObj = await wasi_sock.groupFetchAllParticipating();
            const groupChats = Object.values(allGroupsObj || {});
            if (!groupChats || groupChats.length === 0) {
                return await wasi_sock.sendMessage(wasi_origin, { text: "❌ You are not a member of any WhatsApp groups." }, wasi_isLid ? {} : { quoted: wasi_msg });
            }
            let msg = "📋 *YOUR GROUPS & JIDS* _(Total: " + groupChats.length + ")_\n\n";
            groupChats.forEach((group, index) => {
                const memberCount = group.participants ? group.participants.length : (group.size || "N/A");
                msg += (index + 1) + ". 👥 *" + (group.subject || "Unnamed Group") + "*\n";
                msg += "   🆔 " + group.id + "\n";
                msg += "   📊 *Members:* " + memberCount + "\n\n";
            });
            await wasi_sock.sendMessage(wasi_origin, { text: msg }, wasi_isLid ? {} : { quoted: wasi_msg });
        } catch (error) {
            console.error("[GJIDS ERROR]", error.message);
            await wasi_sock.sendMessage(wasi_origin, { text: "❌ Error fetching groups list: " + error.message });
        }
    }
};