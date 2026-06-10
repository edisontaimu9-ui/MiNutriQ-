# 🥗 Oasis — Clinical Nutrition Decision Support Tool

> A Progressive Web App (PWA) for healthcare professionals and nutrition students performing clinical nutrition assessments with **modular architecture**, **partial offline support**, and **evidence-based decision support**.

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
- **📶 Partial Offline Support** — Basic calculations work offline; syncs when online
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
| **App Structure** | Modular JS components (feature-based modules) |
| **PWA** | Service Worker (sw.js) + App Shell |
| **Authentication** | Firebase Authentication |
| **Database** | Cloud Firestore + Realtime Database |
| **Charts** | Chart.js 4.x |
| **Icons** | Lucide (SVG icons) |
| **Fonts** | Google Fonts (Syne, Outfit, JetBrains Mono) |
| **Deployment** | GitHub Pages / Custom domain |

### Modular File Structure

```
Oasis-/
├── 📄 index.html              # Main application shell & HTML structure
├── 🎨 styles.css              # Global styles & design system
├── ⚙️  main.js                 # Core app logic, routing, UI control, state management
│
├── 📦 OFFLINE MODULES (Basic calculations - work without internet)
│   ├── pediNutrition.js        # Pediatric nutrition calculations (Mifflin-St Jeor, WHO, etc.)
│   ├── pediBurn.js             # Pediatric burn assessment formulas
│   ├── parenteral.js           # Parenteral nutrition calculations
│   ├── screening.js            # Malnutrition screening (MUST, NRS-2002, SGA)
│   ├── foodData.js             # Built-in food database (compressed, local)
│   ├── growthCharts.js         # Growth chart percentiles & z-score calculations
│   └── assessment.js           # General nutrition assessment utilities
│
├── 📦 ONLINE MODULES (Advanced features - require internet)
│   ├── dni.js                  # Drug-nutrient interactions (Firebase-backed)
│   ├── cde.js                  # Advanced clinical decision engines
│   ├── library.js              # Reference library & guidelines lookup
│   ├── references.js           # Citation & evidence base (cloud-sourced)
│   └── oasisAI.js              # AI-powered decision support (API-dependent)
│
├── 📡 SERVICE & SYNC
│   ├── sw.js                   # Service Worker (offline caching, background sync)
│   ├── firebaseConfig.js       # Firebase configuration & initialization
│   └── syncManager.js          # Cloud sync logic for assessments
│
├── 🎯 PWA & DEPLOYMENT
│   ├── manifest.json           # PWA manifest (icons, metadata, theme)
│   ├── CNAME                   # Custom domain configuration (minutriq.me)
│   └── sw-assets.json          # Service Worker cache manifest
```

### Module Dependency Graph

```
main.js (router & state)
    ├── pediNutrition.js ✅ OFFLINE
    ├── pediBurn.js ✅ OFFLINE
    ├── parenteral.js ✅ OFFLINE
    ├── screening.js ✅ OFFLINE
    ├── assessment.js ✅ OFFLINE
    ├── foodData.js + foodSearch.js ✅ OFFLINE
    ├── growthCharts.js ✅ OFFLINE
    │
    ├── dni.js 🔵 ONLINE (requires Firebase + internet)
    ├── cde.js 🔵 ONLINE (cloud-backed decision support)
    ├── library.js 🔵 ONLINE (reference lookups)
    ├── oasisAI.js 🔵 ONLINE (external API calls)
    │
    └── sw.js (background service)
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

| Module | Purpose | Users | Offline |
|--------|---------|-------|---------|
| **Pediatric Nutrition** | Age-based caloric & protein needs | Pediatric dietitians | ✅ |
| **Pediatric Burns** | Nutrition for burn-injured children | Burn units, ICU | ✅ |
| **Screening** | Identify malnutrition risk | All settings | ✅ |
| **Assessment** | General nutrition evaluations | All settings | ✅ |
| **Growth Charts** | Monitor pediatric growth | Community health | ✅ |
| **Food Database** | Nutrient lookup & meal planning | Meal planners | ✅ |
| **Parenteral Nutrition** | IV feeding calculations | ICU, hospital | ✅ |
| **Drug-Nutrient Interactions** | Check medication-food interactions | Clinical teams | 🔵 Online |
| **Clinical Decision Engines** | Advanced decision support | Advanced users | 🔵 Online |
| **Reference Library** | Evidence-based guidelines lookup | Students, clinicians | 🔵 Online |

---

## 🔒 Privacy & Security

- **User Accounts** — Each user has isolated, private account
- **Data Encryption** — All data encrypted in transit (SSL/TLS) and at rest
- **Offline Mode** — Basic calculations run locally; no data sent when offline
- **Firebase Security Rules** — Leverages Google Cloud infrastructure with fine-grained access control
- **No Third-party Tracking** — No ads, analytics, or external tracking
- **Medical Grade** — Designed for confidential patient information
- **HIPAA Considerations** — Suitable for healthcare environments

---

## 📋 System Requirements

### Minimum Requirements

- **Browser:** Chrome 90+, Edge 90+, Firefox 88+, Safari 14+ (mobile or desktop)
- **Screen:** 360px wide (mobile) or larger
- **Internet:** Required for advanced features; basic calculations work offline
- **Storage:** ~20–25 MB on device (includes offline modules)
- **JavaScript:** Must be enabled

### Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** (14+) | ✅ Full support | Safari or Chrome |
| **Android** (8+) | ✅ Full support | Chrome or Edge |
| **Windows/Mac/Linux** | ✅ Full support | Any modern browser |
| **Tablets** | ✅ Optimized | Landscape + portrait |

---

## ⚙️ Offline & Online Features

### ✅ Works Offline (Basic Calculations)

- **Pediatric Nutrition** — Mifflin-St Jeor, Harris-Benedict, Schofield formulas
- **Burn Calculations** — Curreri, Toronto, Modified Brooke formulas
- **Protein Requirements** — WHO guidelines calculations
- **Screening Tools** — MUST, NRS-2002, SGA assessments
- **Food Database** — Built-in nutritional composition lookup
- **Growth Charts** — CDC/WHO growth percentiles & z-scores
- **Micronutrient Needs** — Age/sex-specific RDA calculations

**Offline Capabilities:**
- ✅ All basic calculations work without internet
- ✅ Food database fully available
- ✅ View saved patient records
- ✅ Create new patient records offline (sync when connected)
- ✅ Print reports locally

### 🔵 Requires Internet (Advanced Features)

- **Drug-Nutrient Interactions** — Real-time database lookups
- **Advanced Clinical Decision Engines** — Cloud-backed algorithms
- **Reference Library** — Online guideline & evidence base
- **AI-Powered Recommendations** — External API-dependent
- **Data Synchronization** — Firestore sync across devices
- **User Authentication** — Firebase login verification

**Online Features:**
- ✅ Cloud sync of assessments
- ✅ Cross-device access
- ✅ Advanced decision support
- ✅ Real-time presence tracking
- ✅ Backup of all calculations

---

## 🔄 Cloud Synchronization

When signed in with internet:

- ✅ Patient assessments auto-sync to Firestore
- ✅ Accessible on any device once signed in
- ✅ Real-time presence tracking
- ✅ Session management across devices
- ✅ Backup of all calculations and notes
- ✅ Sync conflict resolution

**No sync = No data loss:** Local records persist even if sync fails. Changes sync automatically when connection is restored.

---

## 🎯 Use Cases

### For Students
- Self-paced learning with real patient scenarios
- Practice basic nutrition calculations in offline environments
- Build clinical decision-making skills
- Offline study during rotations or remote learning
- Assessment practice without internet dependency

### For Clinicians
- Quick bedside reference during rounds (offline calculations)
- Standardized assessment workflows
- Evidence-based recommendations at point-of-care
- Documentation with printable reports
- Fast basic calculations in time-constrained environments

### For Nutrition Teams
- Consistent assessment protocols across settings
- Reduced calculation errors with built-in formulas
- Time-saving in busy departments
- Offline-first approach for unreliable connectivity
- Centralized record-keeping with cloud sync (when online)

---

## 🛠️ Development

### Tech Stack Summary

```
Frontend:        HTML5 + CSS3 + Vanilla JavaScript (no build step)
Architecture:    Modular, feature-based JS modules
PWA:            Service Worker (app shell cache strategy)
Offline:        IndexedDB for local persistence
Backend:        Firebase (Auth + Firestore + RTDB)
Hosting:        GitHub Pages + Custom Domain (minutriq.me)
Version:        1.3.0
Last Updated:   2026-06-10
```

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/edisontaimu9-ui/Oasis-.git
   cd Oasis-
   ```

2. **Open locally:**
   ```bash
   # Simple HTTP server (Python 3)
   python -m http.server 8000
   
   # Or Python 2
   python -m SimpleHTTPServer 8000
   
   # Or Node.js
   npx http-server
   
   # Or using Live Server (VS Code extension)
   ```

3. **Visit:** `http://localhost:8000`

4. **For offline testing:**
   - Open DevTools (F12) → Application → Service Workers
   - Check "Offline" to simulate offline mode
   - Verify basic calculations still work
   - Confirm online-only features show appropriate messages

### Testing Module Isolation

To test individual modules in the browser console:

```javascript
// Test offline module directly
console.log(pediNutrition.calculateREE(70, 'male', 30));

// Check module availability
console.log(typeof pediNutrition); // "object" if loaded
console.log(typeof dni);           // "undefined" if not loaded or offline
```

### Building & Deployment

The app is fully static (no build process required):

1. Push to GitHub repository
2. GitHub Pages automatically serves from `main` branch
3. Custom domain configured via CNAME file
4. Service Worker automatically caches and updates assets
5. DNS points to GitHub Pages servers

**To deploy changes:**
```bash
git add .
git commit -m "Update feature or calculation"
git push origin main
```

---

## 🔧 Contributing Guide

Found a bug? Have a feature idea? Want to improve clinical content or offline capabilities?

### How to Contribute

1. **Report Issues:**
   - Open an issue with details and steps to reproduce
   - Include browser, device, and OS information
   - Provide screenshots if applicable
   - Note whether issue occurs online/offline

2. **Suggest Enhancements:**
   - Use GitHub Discussions for feature requests
   - Describe the use case and expected behavior
   - Suggest clinical modules or improvements
   - Request offline vs. online functionality

3. **Report Clinical Errors:**
   - Ensure accuracy of medical calculations
   - Reference the guideline or study used
   - Provide the correction with evidence

4. **Improve Code:**
   - Submit pull requests with clear commit messages
   - Test changes in offline mode
   - Follow the existing modular code structure
   - Test module isolation

### Module Development Guidelines

When adding new features:
- If calculation-based → create as **offline module** (independent)
- If requires external data → create as **online module** (with fallback)
- Import only necessary dependencies
- Add graceful offline handling
- Update this README with module info

---

## 📚 References & Guidelines

The application references:

- **WHO Nutrition Guidelines** — Child growth, micronutrient needs, complementary feeding
- **Academy of Nutrition and Dietetics (AND)** — Evidence Analysis Library, IDNT
- **ASPEN** — American Society for Parenteral and Enteral Nutrition standards
- **CDC** — Growth charts and nutritional surveillance data
- **FDA** — Food composition database (USDA FoodData Central)
- **Clinical Practice Guidelines** — Burn care, pediatric nutrition, critical care
- **National Guidelines** — Evidence-based recommendations by region

All calculations include citations to source evidence.

---

## 📧 Contact & Support

- **Author:** Edison Taimu — BSc Nutrition and Dietetics (Hons), Malawi
- **Repository:** [github.com/edisontaimu9-ui/Oasis-](https://github.com/edisontaimu9-ui/Oasis-)
- **Website:** [minutriq.me](http://minutriq.me/)
- **GitHub Issues:** [Report bugs or suggest features](https://github.com/edisontaimu9-ui/Oasis-/issues)
- **In-App Feedback:** Use the Feedback button on any page

---

## ⚠️ Disclaimer

**Oasis is for educational and clinical decision-support purposes only.**

- ❌ **Does NOT replace professional clinical judgment**
- ❌ **Does NOT provide medical advice or diagnosis**
- ❌ **Does NOT establish a doctor-patient relationship**
- ✅ **Supports** evidence-based clinician decision-making
- ✅ **Assists** in education, training, and professional development

**Liability:** Users are responsible for validating all outputs against patient-specific factors, current clinical guidelines, and institutional protocols. Always consult with qualified healthcare professionals.

---

## 📄 License

This project is licensed under the **MIT License** — see LICENSE file for details.

---

## 🙏 Acknowledgments

- **Firebase** for scalable backend infrastructure
- **Chart.js** for powerful data visualization
- **Lucide Icons** for beautiful, accessible UI icons
- **Google Fonts** for excellent typography (Syne, Outfit, JetBrains Mono)
- **WHO & ASPEN** for evidence-based clinical guidelines
- **Nutrition & dietetics community** for feedback, validation, and support
- **Healthcare professionals** who contributed clinical expertise

---

## 🌟 Status & Roadmap

### Current Status
- **Version:** 1.3.0
- **Status:** Active Development
- **Last Updated:** 2026-06-10
- **Deployment:** [minutriq.me](http://minutriq.me/)
- **Offline Capable:** ✅ Basic calculations + food database
- **Online Features:** Advanced DNI, AI recommendations, cloud sync

### Planned Features (Roadmap)

**Q3 2026:**
- [ ] Enhanced offline database persistence (IndexedDB improvements)
- [ ] Expanded drug-nutrient interactions database (sync for offline access)
- [ ] Print-to-PDF functionality improvements
- [ ] Module bundling optimization

**Q4 2026:**
- [ ] Multi-language support (Chichewa, Swahili, French)
- [ ] Advanced AI-powered nutrition recommendations
- [ ] Patient data import/export (CSV, Excel) — offline-compatible
- [ ] Offline reference library caching

**2027:**
- [ ] Integration with EHR systems (FHIR standards)
- [ ] Mobile app native versions (iOS/Android) — enhanced offline
- [ ] Collaborative patient assessments (team mode)
- [ ] Advanced analytics & audit logs
- [ ] Telehealth/remote consultation integration

---

**Thank you for using Oasis!** Help us improve clinical nutrition care worldwide. 🌍

For updates, visit the [GitHub repository](https://github.com/edisontaimu9-ui/Oasis-) or follow development on the Issues board.
