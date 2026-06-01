# 🥗 Oasis — Clinical Nutrition Decision Support Tool

> A Progressive Web App (PWA) for healthcare professionals and nutrition students performing clinical nutrition assessments with offline support, cloud synchronization, and evidence-based decision support.

**Live:** [minutriq.me](http://minutriq.me/)

---

## ✨ Overview

Oasis is a lightweight, user-friendly clinical nutrition decision support tool designed to assist:
- 👨‍🎓 **Nutrition students** in clinical education and training
- 👨‍⚕️ **Dietitians & nutritionists** in daily clinical practice
- 🏥 **Healthcare teams** in resource-limited settings

The application guides users through structured nutrition assessments, calculates requirements, and supports evidence-based clinical decision-making.

---

## 🚀 Key Features

### 📋 Clinical Modules

- **👶 Pediatric Nutrition Assessment** — Age-specific nutritional need calculations
- **🔥 Pediatric Burn Management** — Specialized nutrition support for burn patients
- **🏥 Drug-Nutrient Interactions (DNI)** — Database of medication-nutrition interactions
- **🧬 Clinical Decision Engines** — Automated clinical decision support algorithms
- **🍽️ Enteral & Parenteral Support** — Feeding route calculations and guidance
- **📊 Nutritional Screening** — Malnutrition risk assessment tools
- **📈 Growth Charts** — Pediatric growth monitoring and reference data

### 🗂️ Content & Data

- **🍎 Built-in Food Database** — Nutritional composition data for meal planning
- **📚 Clinical References** — Evidence-based guidelines and best practices
- **🧮 Calculation Library** — Formulas for energy, protein, micronutrient needs

### 💻 Technology & UX

- **📱 Progressive Web App (PWA)** — Install on iOS, Android, desktop, or use in browser
- **📶 Offline-First** — Works without internet connection; syncs when online
- **🔐 Secure Authentication** — Email/password account with role-based access
- **☁️ Cloud Sync** — Patient assessments and records stored securely in Firestore
- **🎨 Dark Mode & Themes** — Multiple theme options for comfortable viewing
- **⚡ Fast & Responsive** — Optimized for mobile-first workflows
- **📤 Print & Export** — Generate reports and export patient data

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **App Structure** | Modular JS components |
| **PWA** | Service Worker (sw.js) + App Shell |
| **Authentication** | Firebase Authentication |
| **Database** | Cloud Firestore + Realtime Database |
| **Charts** | Chart.js 4.x |
| **Icons** | Lucide (SVG icons) |
| **Fonts** | Google Fonts (Syne, Outfit, JetBrains Mono) |
| **Deployment** | GitHub Pages / Custom domain |

### File Structure

```
Oasis-/
├── index.html              # Main application shell
├── styles.css              # Global styles & design system
├── main.js                 # Core app logic, routing, UI control
│
├── pediNutrition.js        # Pediatric nutrition module
├── pediBurn.js             # Pediatric burn assessment
├── parenteral.js           # Parenteral nutrition calculations
├── foodSearch.js           # Food database search & lookup
├── foodData.js             # Nutritional database (compressed)
│
├── screening.js            # Malnutrition screening tools
├── assessment.js           # General nutrition assessment
├── cde.js                  # Clinical decision engines
├── growthCharts.js         # Growth chart data & rendering
├── dni.js                  # Drug-nutrient interactions
│
├── library.js              # Reference library & guidelines
├── references.js           # Citation & evidence base
├── oasisAI.js              # AI-powered decision support
│
├── sw.js                   # Service Worker (offline support)
├── CNAME                   # Custom domain configuration
└── manifest.json           # PWA manifest (icons, metadata)
```

---

## 🚀 Getting Started

### Installation

#### **Option 1: Web Browser** (No installation needed)
1. Visit [minutriq.me](http://minutriq.me/)
2. Sign in or create an account
3. Start using immediately

#### **Option 2: Install as App**

**iOS (Safari):**
1. Open in Safari
2. Tap **Share** → **Add to Home Screen**
3. Name the app → **Add**

**Android (Chrome):**
1. Open in Chrome
2. Tap the **menu** (⋮)
3. Select **"Install app"** or **"Add to Home Screen"**

**Desktop (Chrome/Edge):**
1. Click the **install icon** in the address bar
2. Click **"Install"**

### First Login

1. **Sign In/Register** with your email
2. **Complete your profile:**
   - Full name
   - Student/Staff ID
   - Institution/Hospital
   - Professional role
   - Avatar (optional)
3. **Start assessing** — choose a clinical module

---

## 📖 How to Use

### Basic Workflow

```
1. Sign in to your account
   ↓
2. Create a new patient record or open existing
   ↓
3. Select a clinical module (e.g., Pediatric Nutrition)
   ↓
4. Enter patient data (age, weight, medical history, etc.)
   ↓
5. System performs calculations & provides recommendations
   ↓
6. Review results, clinical notes, and decision support
   ↓
7. Save assessment to your account
   ↓
8. Print, export, or share findings
```

### Available Modules

| Module | Purpose | Users |
|--------|---------|-------|
| **Pediatric Nutrition** | Age-based caloric & protein needs | Pediatric dietitians |
| **Pediatric Burns** | Nutrition for burn-injured children | Burn units, ICU |
| **Screening** | Identify malnutrition risk | All settings |
| **Drug-Nutrient Interactions** | Check medication-food interactions | Clinical teams |
| **Parenteral Nutrition** | IV feeding calculations | ICU, hospital |
| **Growth Charts** | Monitor pediatric growth | Community health |
| **Food Database** | Nutrient lookup & meal planning | Meal planners |

---

## 🔒 Privacy & Security

- **User Accounts** — Each user has isolated, private account
- **Data Encryption** — All data encrypted in transit (SSL/TLS) and at rest
- **Offline Mode** — Calculations run locally; no data sent when offline
- **Firebase Security** — Leverages Google Cloud infrastructure
- **No Third-party Tracking** — No ads, analytics, or external tracking
- **Medical Grade** — Designed for confidential patient information

---

## 📋 System Requirements

### Minimum Requirements

- **Browser:** Chrome, Edge, Firefox, Safari (mobile or desktop)
- **Screen:** 360px wide (mobile) or larger
- **Internet:** Initial download only; works offline thereafter
- **Storage:** ~15–20 MB on device

### Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** (13+) | ✅ Full support | Safari or Chrome |
| **Android** (7+) | ✅ Full support | Chrome or Edge |
| **Windows/Mac/Linux** | ✅ Full support | Any modern browser |
| **Tablets** | ✅ Optimized | Landscape + portrait |

---

## ⚙️ Features in Detail

### 📊 Calculations & Algorithms

Oasis includes evidence-based formulas for:
- **REE (Resting Energy Expenditure):** Mifflin-St Jeor, Harris-Benedict
- **Protein Requirements:** WHO guidelines, disease-specific
- **Micronutrient Needs:** Age/sex-specific RDAs
- **Burn Nutrition:** Curreri formula, Toronto formula
- **Growth Assessment:** CDC/WHO growth percentiles

### 🧠 Clinical Decision Support

- **Nutrition diagnosis codes** (IDNT)
- **Intervention recommendations** based on diagnosis
- **Monitoring parameters** and frequency
- **Evidence references** for all recommendations

### 📱 Offline Capabilities

- ✅ All calculations work offline
- ✅ Food database fully available
- ✅ View saved patient records
- ❌ Data syncing waits for internet connection
- ❌ New patient records sync when online

---

## 🔄 Cloud Synchronization

When signed in with internet:

- ✅ Patient assessments auto-sync to Firestore
- ✅ Accessible on any device once signed in
- ✅ Real-time presence tracking
- ✅ Session management across devices
- ✅ Backup of all calculations and notes

**No sync = No data loss:** Local records persist even if sync fails.

---

## 🎯 Use Cases

### For Students
- Self-paced learning with real patient scenarios
- Practice nutrition calculations in a safe environment
- Build clinical decision-making skills
- Offline study during rotations or remote learning

### For Clinicians
- Quick bedside reference during rounds
- Standardized assessment workflows
- Evidence-based recommendations at point-of-care
- Documentation with printable reports

### For Nutrition Teams
- Consistent assessment protocols across settings
- Reduced calculation errors
- Time-saving in busy departments
- Scalable without additional cost (offline works everywhere)

---

## 🛠️ Development

### Tech Stack Summary

```
Frontend:        HTML5 + CSS3 + Vanilla JS
PWA:            Service Worker (app shell cache)
Backend:        Firebase (Auth + Firestore + RTDB)
Hosting:        GitHub Pages + Custom Domain
Version:        1.2.9
```

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/edisontaimu9-ui/Oasis-.git
   cd Oasis-
   ```

2. **Open locally:**
   ```bash
   # Simple HTTP server (Python)
   python -m http.server 8000
   
   # Or Node.js
   npx http-server
   ```

3. **Visit:** `http://localhost:8000`

### Building & Deployment

The app is fully static. To deploy:

1. Push to GitHub Pages
2. Configure custom domain (CNAME file already present)
3. Service Worker automatically caches assets

---

## 📚 References & Guidelines

The application references:

- **WHO Nutrition Guidelines** — Child growth, micronutrient needs
- **Academy of Nutrition and Dietetics (AND)** — Evidence Analysis Library
- **ASPEN** — Parenteral nutrition standards
- **FDA** — Food composition database
- **Clinical Practice Guidelines** — Burn care, pediatric nutrition

All calculations include citations to source evidence.

---

## ⚠️ Disclaimer

**Oasis is for educational and clinical decision-support purposes only.**

- ❌ **Does NOT replace professional clinical judgment**
- ❌ **Does NOT provide medical advice**
- ✅ **Supports** clinician decision-making
- ✅ **Assists** in education and training

Always consult with qualified healthcare professionals. Users are responsible for validating all outputs against patient-specific factors and clinical guidelines.

---

## 🤝 Contributing

Found a bug? Have a feature idea? Want to improve clinical content?

1. **Open an issue** with details and steps to reproduce
2. **Suggest enhancements** via GitHub Discussions
3. **Report clinical errors** to ensure accuracy
4. **Share feedback** on usability and workflows

---

## 📧 Contact & Support

- **Author:** Edison Taimu — BSc Nutrition and Dietetics (Hons), Malawi
- **Email:** inquiries via GitHub Issues
- **Website:** [minutriq.me](http://minutriq.me/)
- **Feedback:** Use the in-app Feedback button

---

## 📄 License

This project is licensed under the **MIT License** — see LICENSE file for details.

---

## 🙏 Acknowledgments

- **Firebase** for scalable backend infrastructure
- **Chart.js** for data visualization
- **Lucide Icons** for beautiful UI icons
- **Google Fonts** for typography
- **WHO & ASPEN** for evidence-based guidelines
- **Nutrition & dietetics community** for feedback and support

---

## 🌟 Status

- **Version:** 1.2.9
- **Status:** Active Development
- **Last Updated:** 2026-06-01
- **Deployment:** [minutriq.me](http://minutriq.me/)

---

## 🗺️ Roadmap (Future)

- [ ] Multi-language support (Chichewa, Swahili, French)
- [ ] Advanced AI-powered nutrition recommendations
- [ ] Integration with EHR systems
- [ ] Mobile app native versions (iOS/Android)
- [ ] Collaborative patient assessments (team mode)
- [ ] Advanced analytics & audit logs
- [ ] Telehealth integration

---

**Thank you for using Oasis!** Help us improve clinical nutrition care. 🌍
