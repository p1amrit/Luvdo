# 🎲 LUVDO — The Real-Time Social & Aesthetic Ludo Experience

> **Classic board game mechanics meet modern glassmorphic design, low-latency WebRTC crystal voice chat, 2v2 co-op team play, and cross-platform web & mobile support.**
>
> *Made with ❤️ by [Amrit](https://github.com/p1amrit)*

---

[![Live Web App](https://img.shields.io/badge/Live%20Demo-luvdo.onrender.com-f43f5e?style=for-the-badge&logo=render&logoColor=white)](https://luvdo.onrender.com/)
[![Download Android APK](https://img.shields.io/badge/Android%20APK-Download%20Direct-10b981?style=for-the-badge&logo=android&logoColor=white)](https://github.com/p1amrit/Luvdo/raw/main/LUVDO.apk)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![WebRTC Voice](https://img.shields.io/badge/WebRTC-Live%20Voice-22c55e?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Mobile%20Native-1192e8?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

---

## 🌟 Quick Links

* 🌐 **Play Live Web App:** [https://luvdo.onrender.com/](https://luvdo.onrender.com/)
* 📱 **Download Android App:** [`LUVDO.apk`](https://github.com/p1amrit/Luvdo/raw/main/LUVDO.apk) (Ready to install on any Android phone)
* 🐙 **GitHub Repository:** [https://github.com/p1amrit/Luvdo](https://github.com/p1amrit/Luvdo)

---

## ✨ Standout Features & Highlights

### 🎲 1. Authoritative Board & Ludo King Mechanics
* **Classic & Familiar Rules**: Roll a **6** to bring a pawn out of the yard, consecutive sixes handling, bonus turns on rolling a 6 or capturing opponent pawns, safe star stump sanctuaries, and exact dice rolls required to reach the home chamber.
* **Dynamic Local Player Orientation**: The local player is always anchored comfortably at the **Bottom-Left quadrant** of the board (matching the familiar *Ludo King* mobile orientation).
* **Multi-Token Smart Separation**: Multiple tokens landing on the same tile or safe stump separate gracefully into a visible circular cluster with smooth parting animations rather than overlapping into an invisible single dot.
* **Casual Modern Colors**: Reimagined with modern casual aesthetic tones:
  * 💖 **Rose** (Red quadrant)
  * 💜 **Purple** (Blue quadrant)
  * 🍑 **Peach** (Yellow quadrant)
  * 🌿 **Mint** (Green quadrant)

### 🎙️ 2. Real-Time WebRTC Voice Lounge
* **Browser-Native Crystal Audio**: High-fidelity peer-to-peer WebRTC voice communication with zero-latency jitter buffer optimization and adaptive noise suppression.
* **Live Voice Lounge (`LobbyView`)**:
  * Overlapping circular avatar stack (`ring-2 ring-emerald-400`) displaying all players currently connected to the voice call.
  * Active green microphone badges pinned to joined player avatars.
  * Live connection radar beacon and status pills (`● 2 Connected`).
* **Header Mini-Stack Indicator**: Compact live voice status and talking indicators in the header during active gameplay.

### 👥 3. Flexible Match Modes & Clean Lobby
* **4-Player Free-For-All**: Classic competitive 4-player board battle.
* **2v2 Co-op Teams**: Team 1 (Rose & Peach) vs Team 2 (Purple & Mint) with interactive drag-and-drop and one-tap player reassignment (`To T1` / `To T2`).
* **1v1 Showdown**: Fast, intimate face-off.
* **Match Pace Toggle**: Configurable pace defaulting to **Full (4 tokens)** for classic play, with a **Quick (2 tokens)** option for rapid casual games.
* **Smart Fallback AI Bots**: One-tap `+ Add Bot` / remove bot support with an authoritative 15-second turn countdown timer so matches never stall.
* **Zero-Friction Sharing**: 4-digit room codes, 1-tap room link copy, and instant **WhatsApp Direct Invite** buttons.

### 🏆 4. Celebratory Grand Champion Victory Screen
* **Grand Trophy Emblem**: Floating 3D golden trophy with spinning sparkles and celebratory ambiance.
* **Multi-Stage Confetti Explosions**: Cascading multi-color particle bursts celebrating the match winner.
* **Champion Showcase Card**: Winner’s high-resolution avatar framed in a glowing golden ring, crown badge, and team color indicators.
* **Instant Action Controls**: One-tap **Play Again** (immediate rematch) and **Return to Lobby** controls.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | **React 19 + TypeScript** | Modern component-based reactive UI architecture |
| **Styling & Effects** | **Tailwind CSS v4** | Glassmorphic design, smooth backdrop blurs, aesthetic gradients |
| **Icons & Visuals** | **Lucide React + Canvas Confetti** | Minimal iconography and celebratory particle effects |
| **Real-Time Networking** | **Socket.io Client & Server** | Synchronized turn validation, dice rolling, lobby state sync |
| **Voice Chat** | **WebRTC PeerConnection** | Ultra-low latency voice communication |
| **Mobile Runtime** | **Capacitor 7** | Native Android APK bridge with hardware back button & notch support |
| **Deployment** | **Render (Web) + GitHub** | Automatic CI/CD deployments on git push |

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js** (v18 or higher recommended, tested up to v26)
* **npm** (v9 or higher)

### Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/p1amrit/Luvdo.git
   cd Luvdo
   ```

2. **Install Root, Server, and Client Dependencies:**
   ```bash
   # Install server dependencies
   cd server && npm install
   cd ..

   # Install client dependencies
   cd client && npm install
   cd ..
   ```

3. **Run Concurrently in Development Mode:**
   ```bash
   npm run dev
   ```
   * **Client UI:** `http://localhost:3000`
   * **Backend Server:** `http://localhost:4000`

---

## 📱 Building the Android APK

LUVDO is built as a hybrid mobile app using **Capacitor**:

```bash
# 1. Build the production web bundle
npm --prefix client run build

# 2. Sync web assets with the native Android project
npx cap sync android

# 3. Compile the debug APK
cd android
./gradlew assembleDebug
```
The compiled APK will be output to:
`android/app/build/outputs/apk/debug/app-debug.apk` *(or the prebuilt `LUVDO.apk` in the root repository folder)*.

---

## 📄 License & Credits

Distributed under the MIT License. See `LICENSE` for more information.

* **Created with ❤️ by:** [Amrit](https://github.com/p1amrit)
* **Live Deployment:** [https://luvdo.onrender.com/](https://luvdo.onrender.com/)
