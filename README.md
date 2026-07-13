<h1>Smart Stadium Operations Assistant 🏟️</h1>
A high-performance, real-time operations dashboard designed to manage crowd density and emergency dispatching for large-scale venues.
<br>

🚀 Live Demo
<br>
[View the Live Operational Dashboard](https://stadium-ops-assistant.vercel.app)
(Note: If the demo is currently unreachable, please see the "Running Locally" section below.)
<br>
💡 The Architecture
This project was built with a "Logic-First" philosophy. By decoupling the Decision Engine from the UI, the system ensures that safety recommendations are computed with high precision, independent of UI render cycles.
<br>

<h3></h3>Logic Layer: A pure TypeScript DecisionEngine that processes zone capacities, calculates real-time density, and issues rerouting directives.</h3>

<h3>State Controller: A centralized React state machine that synchronizes simulation ticks, incident reports, and manual gate overrides.</h3>

<h3>Visual Interface: A responsive dashboard built with Tailwind CSS, featuring a "Live Data Inspector" for real-time state verification.</h3>

<h2>🛠️ Key Features</h2>
Real-Time Simulation: Toggle live crowd fluctuations to test how the system responds to "Halftime Rush" or "Egress Evacuation" scenarios.
<br>
Incident Dispatching: A streamlined reporting form for stewards to log and categorize medical or security incidents instantly.
<br>
Dynamic Recommendations: Automatically suggests gate openings and spectator rerouting when sector density crosses safety thresholds (Safe < 60% → Critical > 95%).
<br>
Fail-Safe Mode: Includes an "Offline/Mock" fallback service to ensure the dashboard remains fully functional even in low-connectivity environments.

<h2>🧪 How to Evaluate</h2>
To verify the system's logic, we recommend the following test sequence:
<br>
Observe Baseline: Upon loading, the dashboard initializes all zones to a safe 40% occupancy.
<br>
Trigger Simulation: Toggle the Live Sim switch. Observe the Live Data Inspector (at the bottom) and see the JSON state "breathing" as values fluctuate.
<br>
Test Decision Logic: Manually increase occupancy in a zone to > 95% and observe the Flow Recommendations panel updating with emergency directives.
<br>
Log an Incident: Fill out the Field Incident Report and observe the Active Live Operations Log update instantly.

<h3>💻 Running Locally</h3>
If you wish to run this locally, ensure you have Node.js installed, then:

<h3>Bash</h3>
# Clone the repository
git clone (https://github.com/kaizo-x/stadium-ops-assistant)

# Install dependencies

npm install

# Start the development server

npm run dev
⚙️ Tech Stack
Framework: Next.js 16 (App Router)

Language: TypeScript

<<<<<<< HEAD

## 🧪 Testing Suite (Vitest)

We use **Vitest** for automated unit testing of our decision engine and operations logic.

### Running Tests

To execute the test suite once:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npx vitest
```

The test files reside in the [`__tests__`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/__tests__) directory. They validate:

1. `calculateAverageDensity` boundary values (normal states, empty arrays, division-by-zero stand capacities).
2. `getRecommendations` decision boundary rules (e.g., Gate detour redirects when capacity exceeds 80%).

## 🛡️ Security Implementation

We prioritize application stability and dispatcher input safety:

1. **Security Headers**: Defined custom headers in [`next.config.ts`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/next.config.ts) to enforce:
   - **Content Security Policy (CSP)**: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';`
   - **Clickjacking Protection**: `X-Frame-Options: DENY`
   - **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff`
   - **Referrer Control**: `Referrer-Policy: strict-origin-when-cross-origin`
2. **Input Sanitization**: Operational incident descriptions are sanitized on submission to strip dangerous HTML tags and escape active characters to prevent XSS/Script Injection. The sanitization logic is located in [`lib/security.ts`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/lib/security.ts).
3. **No Hardcoded Keys**: The project contains zero hardcoded API keys or secrets. Check [`env.example`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/.env.example) for recommended variables.

## 📊 Challenge Compliance

A comprehensive mapping of features to the tournament challenge requirements is maintained in [`COMPLIANCE.md`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/COMPLIANCE.md).

=======
Styling: Tailwind CSS

State Management: React Hooks (Centralized State)

Logic: Pure TypeScript Decision Engine

Built for the PromptWars challenge | [Sayali Pagare]

> > > > > > > 4b7942560babaebf1b35846b1f04959222c3b6ba
