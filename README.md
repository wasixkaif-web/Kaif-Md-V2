# ⚡ KAIF MD V2 AUTOFORWARD BOT ⚡
### Developed by [Kaif x Chaudhary](https://github.com/KaifxChaudhary-dev)

A streamlined, stable, and high-performance WhatsApp bot focused on **Auto-Forwarding**, **Auto-Status Viewing**, and core utility commands.

---

## ⚡ **CORE FEATURES**
- 📢 **Auto-Forwarding**: Automatically relay messages from source groups to target chats including channels/newsletters.
- 👁️ **Auto-Status Viewing**: Automatically views all contact WhatsApp status updates (togglable via `.status on/off`).
- 🧹 **Smart Cleaning**: Automatically removes "Forwarded" labels and "Forwarding Scores".
- 🔀 **Regex Replacement**: Swap text/captions (like removing old links or adding your own footer) on the fly.
- 💾 **Safe Session Management**: Uses MongoDB for persistent auth states, ensuring your bot never logs out.
- ⚡ **Light & Fast**: Stripped of bloated plugins for extreme stability and speed.

---

## 📋 **AVAILABLE COMMANDS**
| Command | Alias | Description |
| ------- | ----- | ----------- |
| `.af` | `.autoforward` | Configure auto-forward targets for the current group or globally. |
| `.f` | `.forward` | Manually forward a replied message to multiple JIDs. |
| `.status` | `.autostatus`, `.statusview` | Toggle WhatsApp Auto-Status view on or off (`.status on` / `.status off`). |
| `.gjids` | `.gjid` | List all your group names and their unique JIDs. |
| `.jid` | | Get the JID of the current chat. |
| `.menu` | `.help` | Show available commands and categories. |
| `.ping` | | Measure response speed and server latency. |
| `.uptime` | | View current bot running time. |

---

## 🛠️ **SETUP & DEPLOYMENT**

### **Prerequisites**
- **Node.js 20+**
- **MongoDB Database** (Essential for session stability)

### **Local Installation**
```bash
# Clone the repository
git clone https://github.com/KaifxChaudhary-dev/Kaif-Md

# Install dependencies
npm install

# Configure environment variables
# See below for requirements

# Start the bot
npm start
```

---

## ⚙️ **ENVIRONMENT VARIABLES**

| Variable | Description |
| -------- | ----------- |
| `MONGODB_URI` | Your MongoDB connection string. |
| `SESSION_ID` | Custom session name (defaults to `wasi_session`). |
| `OLD_TEXT_REGEX` | Comma-separated list of patterns to replace. |
| `NEW_TEXT` | Replacement string (what to put instead of old text). |
| `OWNER_NUMBER` | Your personal WhatsApp number (e.g., `92123456789`). |

---

## 🙌 **CREDITS**
- **Base connection**: [Whiskeysockets Baileys](https://github.com/WhiskeySockets/Baileys)
- **Developer**: [Kaif x Chaudhary](https://github.com/KaifxChaudhary-dev)
- **Repo Version**: 1.1.0 (Stable)

---
> _Powered by Kaif x Chaudhary_
