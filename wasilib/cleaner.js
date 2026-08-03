/**
 * ⚡ KAIF MD V2 AUTOFORWARD BOT ⚡
 * Cleaner Utility
 * Developed by Kaif x Chaudhary
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

function processAndCleanMessage(message, customOldTextRegex = null, customNewText = null) {
    try {
        if (!message) return message;
        let cleaned = JSON.parse(JSON.stringify(message));
        
        const targetBlocks = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        targetBlocks.forEach(block => {
            if (cleaned[block]?.contextInfo) {
                delete cleaned[block].contextInfo.isForwarded;
                delete cleaned[block].contextInfo.forwardingScore;
                delete cleaned[block].contextInfo.forwardedNewsletterMessageInfo;
                delete cleaned[block].contextInfo.externalAdReply;
                delete cleaned[block].contextInfo.newsletterJid;
                delete cleaned[block].contextInfo.newsletterName;
                delete cleaned[block].contextInfo.newsletterServerMessageId;
                cleaned[block].contextInfo.isForwarded = false;
                cleaned[block].contextInfo.forwardingScore = 0;
            }
            delete cleaned[block]?.isForwarded;
            delete cleaned[block]?.forwardingScore;
        });

        if (cleaned.contextInfo) {
            delete cleaned.contextInfo.isForwarded;
            delete cleaned.contextInfo.forwardingScore;
            delete cleaned.contextInfo.forwardedNewsletterMessageInfo;
            cleaned.contextInfo.isForwarded = false;
        }

        let activeRegexes = [];
        if (Array.isArray(customOldTextRegex) && customOldTextRegex.length > 0) {
            activeRegexes = customOldTextRegex.map(pattern => {
                try {
                    if (!pattern || !pattern.trim()) return null;
                    const escaped = escapeRegex(pattern.trim());
                    return new RegExp(escaped, 'gu');
                } catch (e) { return null; }
            }).filter(Boolean);
        } else if (process.env.OLD_TEXT_REGEX) {
            activeRegexes = process.env.OLD_TEXT_REGEX.split(',').map(pattern => {
                try {
                    if (!pattern || !pattern.trim()) return null;
                    const escaped = escapeRegex(pattern.trim());
                    return new RegExp(escaped, 'gu');
                } catch (e) { return null; }
            }).filter(Boolean);
        }

        const activeNewText = customNewText !== null && customNewText !== undefined ? customNewText : (process.env.NEW_TEXT || '');

        const replaceText = (text) => {
            if (!text || !activeRegexes.length) return text;
            let result = text;
            activeRegexes.forEach(regex => {
                result = result.replace(regex, activeNewText);
            });
            return result;
        };

        if (cleaned.conversation) cleaned.conversation = replaceText(cleaned.conversation);
        if (cleaned.extendedTextMessage) cleaned.extendedTextMessage.text = replaceText(cleaned.extendedTextMessage.text);
        if (cleaned.imageMessage) cleaned.imageMessage.caption = replaceText(cleaned.imageMessage.caption);
        if (cleaned.videoMessage) cleaned.videoMessage.caption = replaceText(cleaned.videoMessage.caption);
        if (cleaned.documentMessage) cleaned.documentMessage.caption = replaceText(cleaned.documentMessage.caption);

        return cleaned;
    } catch (e) {
        console.error('Cleaning Error:', e.message);
        return message;
    }
}

module.exports = { processAndCleanMessage };