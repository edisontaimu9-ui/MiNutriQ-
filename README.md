🥗 Oasis 

> **Clinical Nutrition Decision Support Tool — Progressive Web App**

Oasis is a lightweight Progressive Web App (PWA) designed to assist nutrition students and healthcare professionals in performing clinical nutrition assessments and clinical decision-making, with a focus on pediatric nutrition, clinical nutrition: Critical care & Surgery,Enteral nutrition , Dietary assessment and meal planning.

 🚀 Features

 👶 Pediatric Nutrition Module
- Assesses nutritional needs in children
- Supports structured clinical decision-making
- Based on practical nutrition workflows

🔥 Pediatric Burn Management
- Calculates nutrition requirements for burn patients
- Guides energy and nutrient planning

🧮 Clinical Decision Engines
- Integrated calculation logic for nutrition support
- Automates complex estimations to reduce clinical errors

🗂️ Food Database
- Built-in food dataset for dietary planning and reference

🔐 User Authentication
- Secure email-based login and registration
- Each user has an isolated, private account

 ☁️ Cloud Sync
- Patient data, calculations, and saved records stored securely in the cloud
- Accessible across devices when signed in
- Real-time presence and session tracking

📱 Progressive Web App (PWA)
- Installable on mobile and desktop
- Offline functionality — works without an internet connection
- Fast and responsive interface

🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Architecture | Modular JS files |
| PWA | Service Worker + App Shell |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore + Firebase Realtime Database |
| Deployment | GitHub Pages / Netlify |

 📂 Project Structure

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
⚙️ How It Works

1. **Sign in** with your account
2. **Input** patient data
3. **Select** a module (e.g., pediatric, burn)
4. **Process** — the system runs calculations automatically
5. **Output** — receive nutrition recommendations
6. **Save** — results sync to your account for future reference

🎯 Purpose

MiNutriQ is built to:

- Support clinical nutrition education
- Simplify nutrition calculations
- Provide accessible tools in **low-resource settings**
- Align with **Nutrition Care Process (NCP)** concepts

 ⚠️ Disclaimer

> This tool is for **educational and decision-support purposes only**.  
> It does **not** replace professional clinical judgment.


👨‍💻 Author

**Edison Taimu**  
BSc Nutrition and Dietetics (Hons) | Malawi
