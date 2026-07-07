<h1>Smart Stadium Operations Assistant 🏟️</h1>
A high-performance, real-time operations dashboard designed to manage crowd density and emergency dispatching for large-scale venues.
<br>
🚀 Live Demo
[View the Live Operational Dashboard](http://localhost:3000/)
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

Observe Baseline: Upon loading, the dashboard initializes all zones to a safe 40% occupancy.

Trigger Simulation: Toggle the Live Sim switch. Observe the Live Data Inspector (at the bottom) and see the JSON state "breathing" as values fluctuate.

Test Decision Logic: Manually increase occupancy in a zone to > 95% and observe the Flow Recommendations panel updating with emergency directives.

Log an Incident: Fill out the Field Incident Report and observe the Active Live Operations Log update instantly.

💻 Running Locally
If you wish to run this locally, ensure you have Node.js installed, then:

Bash
# Clone the repository
git clone [YOUR_GITHUB_REPO_URL]

# Install dependencies
npm install

# Start the development server
npm run dev
⚙️ Tech Stack
Framework: Next.js 16 (App Router)

Language: TypeScript

Styling: Tailwind CSS

State Management: React Hooks (Centralized State)

Logic: Pure TypeScript Decision Engine

Built for the PromptWars challenge | [Your Name/Handle]
