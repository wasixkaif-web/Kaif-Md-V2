require('dotenv').config();

module.exports = {
    ownerNumber: process.env.OWNER_NUMBER || '923466859436',
    sessionId: process.env.SESSION_ID || 'wasi_session',
    mongoDbUrl: process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb+srv://tosaso3642_db_user:LaAN2MRb4mjQ1jv8@cluster0.7xynokv.mongodb.net/?appName=Cluster0',
}
