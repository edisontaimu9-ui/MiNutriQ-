# 🥗 MiNutriQ

> **Clinical Nutrition Decision Support Tool — Progressive Web App**

MiNutriQ is a lightweight Progressive Web App (PWA) designed to assist nutrition students and healthcare professionals in performing clinical nutrition assessments and clinical decision-making, with a focus on pediatric nutrition and specialized cases.

---

## 🚀 Key Features

### 👶 Pediatric Nutrition Module
- Assess nutritional needs in children
- Supports structured clinical decision-making
- Based on practical nutrition workflows

### 🔥 Pediatric Burn Management
- Calculates nutrition requirements for burn patients
- Guides energy and nutrient planning

### 🧮 Clinical Decision Engines
- Integrated calculation logic for nutrition support
- Automates complex estimations to reduce clinical errors

### 🗂️ Food Database
- Local food dataset (`foodData.js`)
- Used for dietary planning and reference

### 📱 Progressive Web App (PWA)
- Installable on mobile devices
- Offline functionality via service worker (`sw.js`)
- Fast and responsive interface

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Architecture | Modular JS files |
| PWA | Service Worker + App Shell |
| Deployment | GitHub Pages / Netlify |

---

## 📂 Project Structure

```
MiNutriQ/
│
├── index.html          # Main UI of the app
├── styles.css          # App styling
├── main.js             # Core app logic & navigation
│
├── foodData.js         # Food database
├── pediNutrition.js    # Pediatric nutrition calculations
├── pediBurn.js         # Burn nutrition module
├── cde.js              # Clinical decision engine
│
└── sw.js               # Service worker (offline support)
```

---

## ⚙️ How It Works

MiNutriQ follows a simplified clinical workflow:

1. **Input** patient data
2. **Select** module (e.g., pediatric, burn)
3. **Process** — system runs calculations automatically
4. **Output** — receive nutrition recommendations

---

## 📲 Installation

### Option 1: Run Locally

```bash
git clone https://github.com/edisontaimu9-ui/MiNutriQ-.git
cd MiNutriQ-
```

Open `index.html` in your browser.

### Option 2: Install as Mobile App

1. Open the deployed app in **Chrome**
2. Tap **"Add to Home Screen"**
3. Use it like a native app

---

## 🌐 Deployment

### GitHub Pages

1. Go to **Settings → Pages**
2. Select the `main` branch
3. Save and access your live link

### Netlify *(Recommended)*

1. Connect your GitHub repository
2. Enable auto-deploy on push

---

## 🔄 Offline & Updates

- App works **offline** using `sw.js`
- Updates require refreshing the app or reopening after a new deployment

---

## 🎯 Purpose

MiNutriQ is built to:

- Support clinical nutrition education
- Simplify nutrition calculations
- Provide accessible tools in **low-resource settings**
- Align with **Nutrition Care Process (NCP)** concepts

---

## ⚠️ Disclaimer

> This tool is for **educational and decision-support purposes only**.  
> It does **not** replace professional clinical judgment.

---

## 👨‍💻 Author

**Edison Taimu**  
BSc Nutrition and Dietetics (Hons) | Malawi
