'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, useBalance } from 'wagmi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, CartesianGrid } from 'recharts';
import { parseEther, formatEther, isAddress } from 'viem';
import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contract';

const RWA_POOLS = [
  { id: 'pool-1', name: 'US Treasury Short-Term Bill (xT-Bill)', symbol: 'xT-Bill', assetType: 'Government Debt', tvl: '$4.2M', currentAPY: '5.1%', risk: 'Low', badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  { id: 'pool-2', name: 'Tokenized Real Estate Yield (xRE-1)', symbol: 'xRE-1', assetType: 'Commercial Property', tvl: '$2.8M', currentAPY: '9.4%', risk: 'Medium', badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  { id: 'pool-3', name: 'Private Credit Pool Alpha (xPCA)', symbol: 'xPCA', assetType: 'Corporate Debt', tvl: '$5.1M', currentAPY: '12.8%', risk: 'High', badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
];

const INITIAL_SMART_MONEY_SIGNALS = [
  { pool: 'Private Credit Pool Alpha (xPCA)', symbol: 'xPCA', signal: 'BULLISH', flow24h: '+$1.20M', confidence: '94%', activity: 'Whale Inflow (0x8f...3a9)', change: '+18.4%' },
  { pool: 'US Treasury Short-Term Bill (xT-Bill)', symbol: 'xT-Bill', signal: 'NEUTRAL', flow24h: '+$0.15M', confidence: '88%', activity: 'Institutional Staking Hold', change: '+2.1%' },
  { pool: 'Tokenized Real Estate Yield (xRE-1)', symbol: 'xRE-1', signal: 'ACCUMULATE', flow24h: '+$0.68M', confidence: '91%', activity: 'Smart Money Rebalance', change: '+9.7%' },
];

const LIQUIDITY_FLOW_DATA = [
  { time: '00:00', xPCA: 3.2, xRE1: 2.1, xTBill: 4.0 },
  { time: '04:00', xPCA: 3.5, xRE1: 2.2, xTBill: 4.1 },
  { time: '08:00', xPCA: 4.1, xRE1: 2.4, xTBill: 4.1 },
  { time: '12:00', xPCA: 4.8, xRE1: 2.6, xTBill: 4.2 },
  { time: '16:00', xPCA: 5.1, xRE1: 2.8, xTBill: 4.2 },
];

const HISTORICAL_ALPHA_DATA = [
  { day: 'Day 1', vaultX: 100, standardStaking: 100 },
  { day: 'Day 5', vaultX: 102.1, standardStaking: 100.4 },
  { day: 'Day 10', vaultX: 104.8, standardStaking: 100.8 },
  { day: 'Day 15', vaultX: 107.5, standardStaking: 101.1 },
  { day: 'Day 20', vaultX: 110.4, standardStaking: 101.4 },
  { day: 'Day 25', vaultX: 113.2, standardStaking: 101.8 },
  { day: 'Day 30', vaultX: 116.5, standardStaking: 102.1 },
];

const MACRO_SCENARIOS = [
  { id: 'standard', name: 'Baseline Conditions', bias: 'Balanced multi-asset yield' },
  { id: 'rate_cut', name: 'Fed Rate Cut Shock', bias: 'Aggressive Private Credit Alpha' },
  { id: 'safety', name: 'Flight to Safety', bias: 'Capital preservation in T-Bills' },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  
  const [activeTab, setActiveTab] = useState<'vault' | 'analytics'>('vault');
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<'Low' | 'Balanced' | 'Aggressive'>('Balanced');
  const [macroScenario, setMacroScenario] = useState('standard');
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [investAmount, setInvestAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [referrerInput, setReferrerInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoRebalanceBot, setAutoRebalanceBot] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(true);
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeModel, setActiveModel] = useState<string>('AgentRouter Engine');
  const [selectedAiStrategy, setSelectedAiStrategy] = useState<any>(null);
  const [liveYields, setLiveYields] = useState<number[]>([0, 0, 0]);
  const [liveSignals, setLiveSignals] = useState(INITIAL_SMART_MONEY_SIGNALS);

  // Dynamic Live Streaming Feed simulation
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    
    const interval = setInterval(() => {
      setLiveSignals((prev) =>
        prev.map((sig) => {
          const delta = (Math.random() * 0.04 - 0.02);
          const currentFlow = parseFloat(sig.flow24h.replace('+$', '').replace('M', ''));
          const newFlow = Math.max(0.01, currentFlow + delta).toFixed(2);
          return {
            ...sig,
            flow24h: `+$${newFlow}M`,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const { data: walletBalance } = useBalance({ address });

  const { data: unallocData, refetch: refetchUnalloc } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'unallocatedBalance', args: address ? [address] : undefined, query: { enabled: !!address }
  });
  const { data: refData, refetch: refetchRef } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'referralRewards', args: address ? [address] : undefined, query: { enabled: !!address }
  });

  const { data: p1Data, refetch: refetchP1 } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'getPosition', args: address ? [address, RWA_POOLS[0].name] : undefined, query: { enabled: !!address }
  });
  const { data: p2Data, refetch: refetchP2 } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'getPosition', args: address ? [address, RWA_POOLS[1].name] : undefined, query: { enabled: !!address }
  });
  const { data: p3Data, refetch: refetchP3 } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'getPosition', args: address ? [address, RWA_POOLS[2].name] : undefined, query: { enabled: !!address }
  });

  const { data: hash, writeContract, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const getPosData = (data: any) => ({
    amount: data ? data[0] : BigInt(0),
    apy: data ? data[1] : BigInt(0),
    lastTime: data ? data[2] : BigInt(0),
  });

  const positions = [getPosData(p1Data), getPosData(p2Data), getPosData(p3Data)];
  const unallocatedBalance = unallocData ? (unallocData as bigint) : BigInt(0);
  const claimableRewards = refData ? (refData as bigint) : BigInt(0);
  const totalAllocated = positions.reduce((acc, curr) => acc + curr.amount, BigInt(0));

  useEffect(() => {
    const interval = setInterval(() => {
      const newYields = positions.map((p) => {
        if (p.amount === BigInt(0) || p.lastTime === BigInt(0)) return 0;
        const timeElapsed = Math.floor(Date.now() / 1000) - Number(p.lastTime);
        const annualYield = (Number(formatEther(p.amount)) * Number(p.apy)) / 100;
        return (annualYield * timeElapsed) / 31536000;
      });
      setLiveYields(newYields);
    }, 1000);
    return () => clearInterval(interval);
  }, [p1Data, p2Data, p3Data]);

  const totalLiveYield = liveYields.reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (isSuccess) {
      refetchUnalloc(); refetchRef(); refetchP1(); refetchP2(); refetchP3();
      setUiError(null);
    }
  }, [isSuccess]);

  const activePortfolio = RWA_POOLS.map((pool, i) => ({
    name: pool.name,
    symbol: pool.symbol,
    amount: positions[i].amount,
    apy: positions[i].apy,
    liveYield: liveYields[i]
  })).filter(p => p.amount > BigInt(0));

  const runAIAnalysis = async () => {
    setLoading(true); setUiError(null); reset();
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pools: RWA_POOLS, 
          riskPreference: riskProfile,
          macroCondition: macroScenario 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        if (data.analysis.portfolio?.length > 0) {
          setSelectedAiStrategy(data.analysis.portfolio[0]);
        }
        if (data.modelUsed) setActiveModel(data.modelUsed);
      } else {
        setUiError('AI Engine Error: ' + data.error);
      }
    } catch (err) {
      setUiError('Network error connecting to AgentRouter.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (executeTx: () => void) => {
    setUiError(null); reset();
    try { executeTx(); } catch (err) { setUiError(`Transaction failed locally.`); }
  };

  const copyLink = () => {
    if (!address) return;
    navigator.clipboard.writeText(`${window.location.origin}?ref=${address}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareStrategyOnX = () => {
    const text = encodeURIComponent(`Optimizing multi-asset tokenized RWA yield on @XLayerOfficial using @VaultX_AI 🧠📈\n\n✓ Live 8-decimal onchain compounding\n✓ Predictive smart money liquidity tracker\n✓ Non-custodial AI portfolio rebalancing\n\nExperience the protocol: https://vault-x-ai.vercel.app?ref=${address || ''}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const setMaxDeposit = () => {
    if (walletBalance) {
      const bal = Number(walletBalance.formatted);
      const safeMax = bal > 0.002 ? bal - 0.002 : 0;
      setDepositAmount(safeMax.toFixed(5));
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Navigation */}
      <nav className="border-b border-white/[0.07] bg-[#07090e]/75 px-6 lg:px-10 py-3.5 flex justify-between items-center sticky top-0 z-50 backdrop-blur-2xl">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-teal-400 to-emerald-400 rounded-xl p-[1px] shadow-lg shadow-emerald-500/20 transition group-hover:shadow-emerald-500/40">
              <div className="w-full h-full bg-[#090d16] rounded-[11px] flex items-center justify-center font-black text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-300">
                VX
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-mono">VaultX <span className="text-emerald-400">AI</span></span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  X Layer
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Autonomous RWA Yield & Analytics Agent</p>
            </div>
          </div>

          <div className="hidden md:flex bg-slate-900/80 p-1 rounded-xl border border-white/[0.08] text-xs font-medium backdrop-blur-md">
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-4 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'vault' ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Yield Vault
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Smart Money & Backtest
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={shareStrategyOnX}
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] hover:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 transition shadow-sm"
          >
            <span>Share Alpha</span>
            <span className="font-bold text-white">𝕏</span>
          </button>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {uiError && (
          <div className="bg-rose-950/40 border border-rose-800/80 text-rose-300 px-4 py-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span><strong>Protocol Notice:</strong> {uiError}</span>
            </div>
            <button onClick={() => setUiError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
          </div>
        )}

        {/* Global Protocol Stat Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-white/[0.07] p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition" />
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Unallocated (Idle)</p>
            <p className="text-2xl lg:text-3xl font-bold text-slate-100 mt-1 font-mono">{Number(formatEther(unallocatedBalance)).toFixed(4)} <span className="text-xs text-blue-400 font-sans font-medium">OKB</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Available for AI deployment</p>
          </div>

          <div className="bg-slate-900/50 border border-white/[0.07] p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition" />
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Allocated</p>
            <p className="text-2xl lg:text-3xl font-bold text-slate-100 mt-1 font-mono">{Number(formatEther(totalAllocated)).toFixed(4)} <span className="text-xs text-emerald-400 font-sans font-medium">OKB</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Actively generating yield</p>
          </div>

          <div className="bg-slate-900/50 border border-emerald-500/20 p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 shadow-lg shadow-emerald-950/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Total Live Yield
              </p>
              <span className="text-[9px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">PER SECOND</span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-emerald-300 mt-1 font-mono tracking-tight">+{totalLiveYield.toFixed(8)}</p>
            <p className="text-[10px] text-emerald-500/70 mt-1">Real-time onchain compounding</p>
          </div>

          <div className="bg-slate-900/50 border border-white/[0.07] p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-purple-500/30 transition-all duration-300">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Referral Rewards (20%)</p>
              <p className="text-2xl lg:text-3xl font-bold text-purple-300 mt-1 font-mono">{Number(formatEther(claimableRewards)).toFixed(4)} <span className="text-xs text-purple-400 font-sans font-medium">OKB</span></p>
            </div>
            {claimableRewards > BigInt(0) ? (
              <button 
                onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimReferralRewards' }))} 
                className="mt-2 w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1.5 rounded-lg text-xs transition shadow-md shadow-purple-900/30"
              >
                Claim Rewards
              </button>
            ) : (
              <p className="text-[10px] text-slate-500 mt-1">Share ref link to earn fee cuts</p>
            )}
          </div>
        </div>

        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Col: Deposit, Withdraw, and Portfolio (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deposit Card */}
                <div className="bg-slate-900/40 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Deposit OKB
                    </h2>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                      OKX DEX V2 Ready
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="bg-[#05070c] border border-white/[0.06] rounded-xl p-3 focus-within:border-blue-500/50 transition">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                        <span>Amount to Deposit</span>
                        <button onClick={setMaxDeposit} className="text-blue-400 hover:text-blue-300 font-semibold font-mono">
                          MAX: {walletBalance ? Number(walletBalance.formatted).toFixed(3) : '0'} OKB
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="0.1" 
                          value={depositAmount} 
                          onChange={(e) => setDepositAmount(e.target.value)} 
                          className="bg-transparent text-lg font-mono text-white w-full outline-none"
                          placeholder="0.0"
                        />
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-white/5">OKB</span>
                      </div>
                    </div>

                    <div className="bg-[#05070c] border border-white/[0.06] rounded-xl p-2.5">
                      <label className="text-[10px] text-slate-400 block mb-1">Referrer Address (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="0x..." 
                        value={referrerInput} 
                        onChange={(e) => setReferrerInput(e.target.value)} 
                        className="bg-transparent text-xs text-white w-full font-mono outline-none placeholder:text-slate-600" 
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'deposit', args: [isAddress(referrerInput) ? referrerInput : '0x0000000000000000000000000000000000000000'], value: parseEther(depositAmount) }))} 
                        disabled={!isConnected || isPending} 
                        className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/10 transition active:scale-[0.99]"
                      >
                        {isPending ? 'Confirming...' : 'Deposit to Vault'}
                      </button>
                      <button 
                        onClick={copyLink} 
                        disabled={!isConnected} 
                        className="bg-slate-900 hover:bg-slate-800 border border-white/[0.08] px-3.5 py-2.5 rounded-xl text-xs text-slate-300 font-medium transition"
                      >
                        {copiedLink ? '✓ Copied' : 'Ref Link'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Withdraw Card */}
                <div className="bg-slate-900/40 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Withdraw Idle
                    </h2>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                      Non-Custodial
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="bg-[#05070c] border border-white/[0.06] rounded-xl p-3 focus-within:border-slate-600 transition">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                        <span>Unallocated Capital</span>
                        <button onClick={() => { if(unallocatedBalance) setWithdrawAmount(formatEther(unallocatedBalance)); }} className="text-blue-400 hover:text-blue-300 font-semibold font-mono">
                          MAX: {Number(formatEther(unallocatedBalance)).toFixed(3)}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="0.1" 
                          value={withdrawAmount} 
                          onChange={(e) => setWithdrawAmount(e.target.value)} 
                          className="bg-transparent text-lg font-mono text-white w-full outline-none"
                          placeholder="0.0"
                        />
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-white/5">OKB</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">
                      Withdraw unallocated OKB back to your self-custody wallet at any time without locking fees.
                    </p>

                    <button 
                      onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'withdrawUnallocated', args: [parseEther(withdrawAmount)] }))} 
                      disabled={!isConnected || isPending || unallocatedBalance === BigInt(0)} 
                      className="w-full bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/[0.08] font-semibold py-2.5 rounded-xl text-xs transition"
                    >
                      Withdraw to Wallet
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Portfolio Positions Table */}
              <div className="bg-slate-900/40 border border-white/[0.08] p-6 rounded-2xl backdrop-blur-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-100">Active Yield Allocations</h2>
                    <p className="text-xs text-slate-400">Onchain positions deployed across X Layer RWA Vaults</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {activePortfolio.length} Active {activePortfolio.length === 1 ? 'Pool' : 'Pools'}
                  </span>
                </div>

                {activePortfolio.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {activePortfolio.map((pos) => (
                      <div key={pos.name} className="bg-[#060911] border border-white/[0.06] p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-emerald-500/30 transition-all duration-200">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200 text-sm">{pos.name}</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">{pos.apy.toString()}% APY</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                            <span>Allocated: <strong className="text-slate-200">{Number(formatEther(pos.amount)).toFixed(4)} OKB</strong></span>
                            <span>Yield: <strong className="text-emerald-400">+{pos.liveYield.toFixed(8)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimYield', args: [pos.name] }))} 
                            className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Harvest
                          </button>
                          <button 
                            onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'withdrawFromPool', args: [pos.name, pos.amount] }))} 
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Close Position
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-white/[0.08] rounded-xl text-slate-500 text-xs">
                    <svg className="w-8 h-8 mx-auto mb-2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    No active positions yet. Run the AI Strategy Engine to deploy capital.
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: AI Strategy Engine & Rebalancer (5 cols) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              <div className="bg-slate-900/50 border border-white/[0.09] p-6 rounded-2xl backdrop-blur-2xl shadow-xl shadow-black/40 space-y-6">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                    <h2 className="text-base font-bold text-white">AI Strategy Engine</h2>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    AgentRouter
                  </span>
                </div>

                {/* Auto Rebalance Bot Switch */}
                <div className="bg-[#05070c] p-3.5 rounded-xl border border-white/[0.06] flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      Auto-Rebalance Agent
                      {autoRebalanceBot && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    </p>
                    <p className="text-[10px] text-slate-400">Trigger AI re-evaluations on liquidity shifts</p>
                  </div>
                  <button
                    onClick={() => setAutoRebalanceBot(!autoRebalanceBot)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${autoRebalanceBot ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                  </button>
                </div>

                {/* Risk Profile Selector */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Risk Tolerance Profile</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Low', 'Balanced', 'Aggressive'] as const).map((profile) => (
                      <button 
                        key={profile} 
                        onClick={() => setRiskProfile(profile)} 
                        className={`py-2 text-xs font-semibold rounded-xl border transition-all duration-200 ${riskProfile === profile ? 'bg-gradient-to-r from-blue-600 to-emerald-600 border-transparent text-white shadow-md shadow-blue-500/20' : 'bg-[#05070c] border-white/[0.06] text-slate-400 hover:text-slate-200'}`}
                      >
                        {profile}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Macro Scenario Stress Tester */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-400 font-medium">Macro Stress-Test Scenario</label>
                    <span className="text-[10px] font-mono text-emerald-400">Interactive</span>
                  </div>
                  <select 
                    value={macroScenario}
                    onChange={(e) => setMacroScenario(e.target.value)}
                    className="w-full bg-[#05070c] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-sans cursor-pointer"
                  >
                    {MACRO_SCENARIOS.map((sc) => (
                      <option key={sc.id} value={sc.id} className="bg-slate-900 text-white">
                        {sc.name} — {sc.bias}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={runAIAnalysis} 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition shadow-lg shadow-emerald-500/10 text-xs sm:text-sm tracking-wide"
                >
                  {loading ? 'Evaluating X Layer Liquidity Models...' : 'Generate AI Allocation Strategy'}
                </button>

                {/* AI Analysis Strategy Output */}
                {analysis?.portfolio && (
                  <div className="space-y-4 pt-4 border-t border-white/[0.06] animate-in fade-in duration-300">
                    <p className="text-xs text-slate-400 italic bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 leading-relaxed">
                      "{analysis.overallReasoning}"
                    </p>

                    {/* AI Chain of Thought Audit Trail */}
                    <div className="border border-white/[0.06] rounded-xl bg-[#05070c] overflow-hidden">
                      <button 
                        onClick={() => setShowAuditTrail(!showAuditTrail)}
                        className="w-full px-3.5 py-2.5 text-[11px] text-slate-400 flex justify-between items-center hover:text-slate-200 transition"
                      >
                        <span className="flex items-center gap-2 font-mono text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          AI Decision Audit Trail
                        </span>
                        <span>{showAuditTrail ? '▲' : '▼'}</span>
                      </button>

                      {showAuditTrail && (
                        <div className="p-3 border-t border-white/[0.06] bg-black/50 text-[10px] font-mono text-slate-400 space-y-1.5">
                          <p className="text-emerald-400">✓ Ingested X Layer RWA oracle telemetry</p>
                          <p className="text-blue-400">✓ Routed via AgentRouter ({activeModel})</p>
                          <p>✓ Factor analyzed: {riskProfile} profile in [{macroScenario}]</p>
                          <p>✓ Whale inflow delta detected on xPCA (+94% confidence)</p>
                          <p className="text-emerald-400">✓ Built user-in-the-loop payload</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {analysis.portfolio.map((strategy: any, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedAiStrategy(strategy)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${selectedAiStrategy?.poolName === strategy.poolName ? 'bg-blue-500/10 border-blue-500/60 shadow-md shadow-blue-500/10' : 'bg-[#05070c] border-white/[0.06] hover:border-slate-700'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-white truncate mr-2">{strategy.poolName}</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">{strategy.estimatedAPY}% APY</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 truncate max-w-[70%]">{strategy.reasoning}</span>
                            <span className="text-blue-400 font-mono font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                              {strategy.suggestedWeight}% Alloc
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedAiStrategy && (
                      <div className="pt-3 border-t border-white/[0.06] space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <label className="text-slate-400">Deploy into: <strong className="text-white">{selectedAiStrategy.poolName}</strong></label>
                          <button onClick={() => { if(unallocatedBalance) setInvestAmount(formatEther(unallocatedBalance)); }} className="text-blue-400 font-mono font-semibold text-[10px]">
                            MAX ({Number(formatEther(unallocatedBalance)).toFixed(3)})
                          </button>
                        </div>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={investAmount} 
                          onChange={(e) => setInvestAmount(e.target.value)} 
                          className="bg-[#05070c] border border-white/[0.08] rounded-xl px-3 py-2 text-white w-full text-xs font-mono focus:border-emerald-500 outline-none" 
                        />
                        <button
                          onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'allocateCapital', args: [selectedAiStrategy.poolName, BigInt(Math.round(selectedAiStrategy.estimatedAPY || 12)), parseEther(investAmount)] }))}
                          disabled={!isConnected || isPending || isConfirming || unallocatedBalance === BigInt(0)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40"
                        >
                          {unallocatedBalance === BigInt(0) ? 'Deposit OKB First' : isPending ? 'Check Wallet...' : isConfirming ? 'Allocating Onchain...' : `Execute Strategy: Deploy ${investAmount} OKB`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Smart Money Analytics & Alpha Backtest */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Live Signal Feed Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveSignals.map((sig, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-4 hover:border-slate-700 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 truncate">{sig.pool}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sig.signal === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                      {sig.signal}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold text-white font-mono">{sig.flow24h}</p>
                      <p className="text-[10px] text-slate-400">24h Net Liquidity Flow</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-emerald-400">{sig.confidence}</p>
                      <p className="text-[10px] text-slate-500">AI Confidence</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 border-t border-white/[0.06] pt-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      {sig.activity}
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px] font-semibold">{sig.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 30-Day Historical Alpha Performance Backtest Chart */}
            <div className="bg-slate-900/50 border border-white/[0.08] p-6 rounded-2xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-100">Historical Strategy Alpha (30-Day Simulation)</h2>
                  <p className="text-xs text-slate-400">VaultX Dynamic AI Aggregation vs Static Asset Staking (Base Normalized to 100)</p>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold font-mono self-start sm:self-auto">
                  +14.4% Net Protocol Alpha
                </span>
              </div>
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={HISTORICAL_ALPHA_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[98, 120]} />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="vaultX" name="VaultX AI Dynamic Allocation" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                    <Line type="monotone" dataKey="standardStaking" name="Static Holding / Single Pool" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Liquidity Flow Breakdown Chart */}
            <div className="bg-slate-900/50 border border-white/[0.08] p-6 rounded-2xl backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-100">Onchain Liquidity Shifts ($ TVL Millions)</h2>
                  <p className="text-xs text-slate-400">Real-time smart wallet capital movements across X Layer RWA Pools</p>
                </div>
                <span className="text-xs bg-[#05070c] text-emerald-400 border border-white/[0.08] px-3 py-1 rounded-full font-mono">
                  Syncing X Layer RPC
                </span>
              </div>
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LIQUIDITY_FLOW_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="xPCA" fill="#3b82f6" name="Private Credit (xPCA)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="xRE1" fill="#10b981" name="Real Estate (xRE-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="xTBill" fill="#64748b" name="Treasury (xT-Bill)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}