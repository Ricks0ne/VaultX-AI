# VaultX AI 🧠💼

> **Autonomous Multi-Asset RWA Yield Aggregator & Smart Money Analytics Agent on X Layer.**  
> Built for the BuildX AI Season Hackathon.

VaultX AI is a non-custodial, user-in-the-loop AI advisory and yield management protocol deployed on X Layer Testnet. It combines an autonomous robo-advisor with real-time onchain analytics to construct diversified portfolios across tokenized Real-World Assets (RWAs), track institutional wallet shifts, and execute compound yield strategies.

---

## ✨ Key Features

* **Multi-Yield Portfolio Allocation:** Automatically splits capital across T-Bills, Commercial Real Estate, and Private Credit based on dynamic AI weights matching your selected risk profile.
* **Smart Money & Predictive Analytics:** Real-time tracking of institutional liquidity shifts, whale wallet inflows, and 24-hour net flow confidence signals across X Layer RWA pools.
* **Auto-Rebalance Bot Engine:** Toggle between manual user execution (user-in-the-loop) or autonomous auto-rebalancing when yield drift or liquidity shifts occur.
* **Live Ticking Yield Engine:** Precision math calculating real-time compound yield accrual with 8-decimal live visualization on the dashboard.
* **Onchain Viral Referrals:** Embedded referral links distributing 20% of protocol fees back to referrers directly onchain.
* **Hardened Security Architecture:** Built with OpenZeppelin `ReentrancyGuard` and modern `.call` execution logic to eliminate reentrancy and gas-limit risks.

---

## 🏗️ Technical Architecture

1. **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts.
2. **Web3 Integration:** Wagmi v2, Viem, RainbowKit (Targeting X Layer Testnet, Chain ID: 1952).
3. **AI Pipeline:** AgentRouter (LLM routing across Claude 3.5 Sonnet & DeepSeek v3) with a local inference engine fallback.
4. **Smart Contracts:** Solidity `^0.8.20` featuring multi-position tracking, time-weighted yield math, and referral fee distribution.

---

## ⚙️ Local Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/Ricks0ne/VaultX-AI.git](https://github.com/Ricks0ne/VaultX-AI.git)
   cd VaultX-AI

1. Install Dependencies:

Bash
npm install
2. Configure Environment Variables:
Create a .env.local file in the root directory:

 Code snippet
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
AGENTROUTER_API_KEY=your_agentrouter_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
3. Run the Development Server:

Bash
npm run dev
Open http://localhost:3000 in your browser.

🔗 Deployment & Verification
Network: X Layer Testnet (Chain ID: 1952)

VaultX Contract Address: 0xf1A7651070f914876253Cb7b24588Be29878F583

Live Web App: https://... (Replace with your Vercel URL)

Developer: Ricks | Data Analyst, Statistician & Web3 Developer
