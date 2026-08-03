/**
 * ⚡ KAIF MD V2 AUTOFORWARD BOT ⚡
 * Auto-Forward Command with Global Support
 * Developed by Kaif x Chaudhary
 */
const { wasi_updateGroupSettings, wasi_getGroupSettings, wasi_getGlobalAutoForward, wasi_updateGlobalAutoForward } = require('../wasilib/database');

/**
 * Helper: parse a comma-separated list of JIDs and auto-add missing suffixes.
 */
function parseJids(input) {
    return input.split(',').map(j => {
        let jid = j.trim();
        if (!jid) return null;
        if (!jid.includes('@')) {
            jid = jid.includes('-') ? jid + '@g.us' : jid + '@s.whatsapp.net';
        }
        return jid;
    }).filter(Boolean);
}

module.exports = {
    name: 'autoforward',
    description: 'Auto-forward messages from source groups to targets — works even without admin',
    aliases: ['af', 'autof'],
    category: 'Group',
    wasi_handler: async (sock, from, context) => {
        const { wasi_msg, wasi_args, wasi_isAdmin, wasi_isOwner, wasi_isSudo, wasi_isGroup, sessionId } = context;

        const action = wasi_args[0]?.toLowerCase();
        const sub = wasi_args[1]?.toLowerCase();

        // ─────────────────────────────────────────────────────────────────────
        // GLOBAL SET COMMANDS (owner-only)
        // ─────────────────────────────────────────────────────────────────────
        if (action === 'set' && (sub === 'source_jids' || sub === 'target_jids')) {
            if (!wasi_isOwner) {
                return await sock.sendMessage(from, { text: '❌ Only the bot owner can set global auto-forward JIDs.' }, { quoted: wasi_msg });
            }

            const raw = wasi_args.slice(2).join(' ');
            if (!raw) {
                return await sock.sendMessage(from, {
                    text: `❌ Provide JIDs.\nExample:\n.af set ${sub} 12345@g.us, 67890@g.us`
                }, { quoted: wasi_msg });
            }

            const jids = parseJids(raw);
            if (!jids.length) {
                return await sock.sendMessage(from, { text: '❌ No valid JIDs found.' }, { quoted: wasi_msg });
            }

            const field = sub === 'source_jids' ? 'sourceJids' : 'targetJids';
            await wasi_updateGlobalAutoForward(sessionId, { [field]: jids });

            return await sock.sendMessage(from, {
                text: `✅ *Global AutoForward — ${sub} updated*\n\n${jids.map((j, i) => `${i + 1}. ${j}`).join('\n')}`
            }, { quoted: wasi_msg });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GLOBAL STATUS & TOGGLE
        // ─────────────────────────────────────────────────────────────────────
        if (action === 'global') {
            if (!wasi_isOwner) {
                return await sock.sendMessage(from, { text: '❌ Only the bot owner can manage global auto-forward.' }, { quoted: wasi_msg });
            }

            if (sub === 'on' || sub === 'off') {
                await wasi_updateGlobalAutoForward(sessionId, { enabled: sub === 'on' });
                return await sock.sendMessage(from, {
                    text: `✅ Global Auto-Forward *${sub.toUpperCase()}*.`
                }, { quoted: wasi_msg });
            }

            if (sub === 'timestamp') {
                const state = wasi_args[2]?.toLowerCase();
                if (state !== 'on' && state !== 'off') return await sock.sendMessage(from, { text: '❌ Usage: `.af global timestamp on/off`' }, { quoted: wasi_msg });
                await wasi_updateGlobalAutoForward(sessionId, { autoForwardTimestamp: state === 'on' });
                return await sock.sendMessage(from, { text: `✅ Global Timestamp *${state.toUpperCase()}*.` }, { quoted: wasi_msg });
            }

            // Show global status
            const gcfg = await wasi_getGlobalAutoForward(sessionId);
            const status = gcfg?.enabled ? '🟢 ON' : '🔴 OFF';
            const tsStatus = gcfg?.autoForwardTimestamp ? '🟢 ON' : '🔴 OFF';
            const srcs = gcfg?.sourceJids?.length ? gcfg.sourceJids.join('\n  ') : 'None';
            const tgts = gcfg?.targetJids?.length ? gcfg.targetJids.join('\n  ') : 'None';

            let text = `📡 *GLOBAL AUTO-FORWARD*\n\n`;
            text += `*Status:* ${status}\n`;
            text += `*Timestamp:* ${tsStatus}\n\n`;
            text += `*Source JIDs* (listen from):\n  ${srcs}\n\n`;
            text += `*Target JIDs* (forward to):\n  ${tgts}\n\n`;
            text += `*Commands:*\n`;
            text += `• \`.af global on/off\` — toggle\n`;
            text += `• \`.af global timestamp on/off\` — toggle time\n`;
            text += `• \`.af set source_jids jid1, jid2\` — set sources\n`;
            text += `• \`.af set target_jids jid1, jid2\` — set targets\n\n`;
            text += `> _This feature works even if the bot is NOT admin in the source group._`;

            return await sock.sendMessage(from, { text }, { quoted: wasi_msg });
        }

        // ─────────────────────────────────────────────────────────────────────
        // PER-GROUP COMMANDS
        // ─────────────────────────────────────────────────────────────────────
        if (!action) {
            const globalCfg = await wasi_getGlobalAutoForward(sessionId);
            const gStatus = globalCfg?.enabled ? '🟢 ON' : '🔴 OFF';

            let text = `🔄 *AUTO-FORWARD MANAGER*\n\n`;
            text += `📡 *Global Mode:* ${gStatus}\n`;

            if (wasi_isGroup) {
                const current = await wasi_getGroupSettings(sessionId, from) || {};
                const pStatus = current.autoForward ? '🟢 ON' : '🔴 OFF';
                const targets = current.autoForwardTargets || [];

                text += `\n📌 *This Group:* ${pStatus}\n`;
                text += `🎯 *Targets:* ${targets.length ? targets.join(', ') : 'None'}\n`;
            }

            text += `\n*── COMMON COMMANDS ──*\n`;
            text += `• \`.af on / off\` — Toggle this group\n`;
            text += `• \`.af set jid1, jid2\` — Set targets\n\n`;
            text += `*── ADVANCED OWNER ──*\n`;
            text += `• \`.af global\` — Global settings\n`;

            return await sock.sendMessage(from, { text }, { quoted: wasi_msg });
        }

        if (!wasi_isGroup) {
            return await sock.sendMessage(from, { text: '❌ Use this in a group or use `.af global`.' }, { quoted: wasi_msg });
        }

        if (!wasi_isAdmin && !wasi_isOwner && !wasi_isSudo) {
            return await sock.sendMessage(from, { text: '❌ Admin only.' }, { quoted: wasi_msg });
        }

        const current = await wasi_getGroupSettings(sessionId, from) || {};

        if (action === 'on') {
            if (!current.autoForwardTargets?.length) return await sock.sendMessage(from, { text: '⚠️ Set targets first.' }, { quoted: wasi_msg });
            await wasi_updateGroupSettings(sessionId, from, { autoForward: true });
            return await sock.sendMessage(from, { text: '✅ *Auto-Forward* enabled.' }, { quoted: wasi_msg });
        }

        if (action === 'off') {
            await wasi_updateGroupSettings(sessionId, from, { autoForward: false });
            return await sock.sendMessage(from, { text: '✅ *Auto-Forward* disabled.' }, { quoted: wasi_msg });
        }

        if (action === 'set') {
            const input = wasi_args.slice(1).join(' ');
            if (!input) return await sock.sendMessage(from, { text: '❌ Usage: `.af set jid1, jid2`' }, { quoted: wasi_msg });
            const targets = parseJids(input);
            await wasi_updateGroupSettings(sessionId, from, { autoForwardTargets: targets });
            return await sock.sendMessage(from, { text: `✅ Targets updated (${targets.length} JIDs).` }, { quoted: wasi_msg });
        }

        if (action === 'clear') {
            await wasi_updateGroupSettings(sessionId, from, {
                autoForwardTargets: [],
                autoForward: false
            });
            return await sock.sendMessage(from, { text: '✅ All group Auto-Forward settings cleared.' }, { quoted: wasi_msg });
        }

        return await sock.sendMessage(from, { text: '❓ Unknown action. Type `.af` for help.' }, { quoted: wasi_msg });
    }
};
