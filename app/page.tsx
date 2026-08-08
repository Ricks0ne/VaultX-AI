'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, useBalance } from 'wagmi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { parseEther, formatEther, isAddress } from 'viem';
import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contract';

const RWA_POOLS = [
  { id: 'pool-1', name: 'US Treasury Short-Term Bill (xT-Bill)', assetType: 'Government Debt', tvl: '$4.2M', currentAPY: '5.1%', risk: 'Low' },
  { id: 'pool-2', name: 'Tokenized Real Estate Yield (xRE-1)', assetType: 'Commercial Property', tvl: '$2.8M', currentAPY: '9.4%', risk: 'Medium' },
  { id: 'pool-3', name: 'Private Credit Pool Alpha (xPCA)', assetType: 'Corporate Debt', tvl: '$5.1M', currentAPY: '12.8%', risk: 'High' },
];

const INITIAL_SMART_MONEY_SIGNALS = [
  { pool: 'Private Credit Pool Alpha (xPCA)', signal: 'BULLISH', flow24h: '+$1.20M', confidence: '94%', activity: 'Whale Inflow (0x8f...3a9)' },
  { pool: 'US Treasury Short-Term Bill (xT-Bill)', signal: 'NEUTRAL', flow24h: '+$0.15M', confidence: '88%', activity: 'Institutional Staking Hold' },
  { pool: 'Tokenized Real Estate Yield (xRE-1)', signal: 'ACCUMULATE', flow24h: '+$0.68M', confidence: '91%', activity: 'Smart Money Rebalance' },
];

const LIQUIDITY_FLOW_DATA = [
  { time: '00:00', xPCA: 3.2, xRE1: 2.1, xTBill: 4.0 },
  { time: '04:00', xPCA: 3.5, xRE1: 2.2, xTBill: 4.1 },
  { time: '08:00', xPCA: 4.1, xRE1: 2.4, xTBill: 4.1 },
  { time: '12:00', xPCA: 4.8, xRE1: 2.6, xTBill: 4.2 },
  { time: '16:00', xPCA: 5.1, xRE1: 2.8, xTBill: 4.2 },
];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  
  const [activeTab, setActiveTab] = useState<'vault' | 'analytics'>('vault');
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<'Low' | 'Balanced' | 'Aggressive'>('Balanced');
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [investAmount, setInvestAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [referrerInput, setReferrerInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoRebalanceBot, setAutoRebalanceBot] = useState(false);
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeModel, setActiveModel] = useState<string>('AgentRouter Engine');
  const [selectedAiStrategy, setSelectedAiStrategy] = useState<any>(null);
  const [liveYields, setLiveYields] = useState<number[]>([0, 0, 0]);

  // Dynamic Live Streaming Smart Money Signals
  const [liveSignals, setLiveSignals] = useState(INITIAL_SMART_MONEY_SIGNALS);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    
    const interval = setInterval(() => {
      setLiveSignals((prev) =>
        prev.map((sig) => {
          const delta = (Math.random() * 0.04 - 0.02);
          const currentFlowStr = sig.flow24h.replace('+$', '').replace('M', '');
          const currentFlow = parseFloat(currentFlowStr);
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
    amount: positions[i].amount,
    apy: positions[i].apy,
    liveYield: liveYields[i]
  })).filter(p => p.amount > BigInt(0));

  const runAIAnalysis = async () => {
    setLoading(true); setUiError(null); reset();
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pools: RWA_POOLS, riskPreference: riskProfile }),
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

  const setMaxDeposit = () => {
    if (walletBalance) {
      const bal = Number(walletBalance.formatted);
      const safeMax = bal > 0.002 ? bal - 0.002 : 0;
      setDepositAmount(safeMax.toFixed(5));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <nav className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-emerald-400 rounded-lg flex items-center justify-center font-black text-xl text-black">VX</div>
            <span className="text-xl font-bold tracking-tight text-white">VaultX AI</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">X Layer</span>
          </div>

          <div className="hidden md:flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Yield Vault
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Smart Money Analytics
            </button>
          </div>
        </div>
        
        <ConnectButton />
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {uiError && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
            <span className="font-bold">Error:</span> {uiError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">UNALLOCATED (IDLE)</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{Number(formatEther(unallocatedBalance)).toFixed(5)} OKB</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">TOTAL ALLOCATED</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{Number(formatEther(totalAllocated)).toFixed(5)} OKB</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse">TOTAL LIVE YIELD</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1 font-mono">+{totalLiveYield.toFixed(8)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">REFERRAL REWARDS</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{Number(formatEther(claimableRewards)).toFixed(5)}</p>
            </div>
            {claimableRewards > BigInt(0) && (
              <button onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimReferralRewards' }))} className="bg-purple-950 text-purple-400 border border-purple-800 px-3 py-1.5 rounded-lg text-xs hover:bg-purple-900">Claim</button>
            )}
          </div>
        </div>

        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h2 className="text-lg font-semibold text-slate-100">Deposit OKB</h2>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400">Deposit Amount (OKB)</label>
                        <button onClick={setMaxDeposit} className="text-[10px] text-blue-400 font-semibold">
                          MAX ({walletBalance ? Number(walletBalance.formatted).toFixed(3) : '0'})
                        </button>
                      </div>
                      <input type="number" step="0.1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-full text-sm focus:border-blue-600" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Referrer Address (Optional)</label>
                      <input type="text" placeholder="0x..." value={referrerInput} onChange={(e) => setReferrerInput(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-full text-sm font-mono focus:border-blue-600" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'deposit', args: [isAddress(referrerInput) ? referrerInput : '0x0000000000000000000000000000000000000000'], value: parseEther(depositAmount) }))} disabled={!isConnected || isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm">Deposit</button>
                      <button onClick={copyLink} disabled={!isConnected} className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm text-slate-300">{copiedLink ? 'Copied!' : 'Copy Ref'}</button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-100">Withdraw Unallocated</h2>
                    <button onClick={() => { if(unallocatedBalance) setWithdrawAmount(formatEther(unallocatedBalance)); }} className="text-[10px] text-blue-400 font-semibold">
                      MAX ({Number(formatEther(unallocatedBalance)).toFixed(3)})
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input type="number" step="0.1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-full text-sm focus:border-blue-600" />
                    <button onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'withdrawUnallocated', args: [parseEther(withdrawAmount)] }))} disabled={!isConnected || isPending} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-lg text-sm">Withdraw to Wallet</button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-semibold text-slate-100">Your Active Portfolio</h2>
                {activePortfolio.length > 0 ? (
                  <div className="space-y-3">
                    {activePortfolio.map((pos) => (
                      <div key={pos.name} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="font-semibold text-blue-400 text-sm">{pos.name}</span>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">{pos.apy.toString()}% APY</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Allocated</p>
                            <p className="font-mono text-white text-sm">{Number(formatEther(pos.amount)).toFixed(5)} OKB</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Earned Yield</p>
                            <p className="font-mono text-emerald-400 text-sm">+{pos.liveYield.toFixed(8)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimYield', args: [pos.name] }))} className="text-[10px] bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 px-3 py-1.5 rounded border border-emerald-800/50">Harvest</button>
                            <button onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'withdrawFromPool', args: [pos.name, pos.amount] }))} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700">Close</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
                    No active allocations. Deploy capital using the AI Engine.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 flex flex-col justify-between h-fit sticky top-24">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-100">AI Strategy Engine</h2>
                  <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full uppercase tracking-wider">AgentRouter</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Auto-Rebalance Bot
                      {autoRebalanceBot && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                    </p>
                    <p className="text-[10px] text-slate-400">Rebalance on liquidity shifts</p>
                  </div>
                  <button
                    onClick={() => {
                      const newState = !autoRebalanceBot;
                      setAutoRebalanceBot(newState);
                      if (newState) {
                        runAIAnalysis();
                      }
                    }}
                    className={`w-11 h-6 rounded-full transition flex items-center px-1 ${autoRebalanceBot ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow"></span>
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Target Risk Profile</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['Low', 'Balanced', 'Aggressive'] as const).map((profile) => (
                      <button key={profile} onClick={() => setRiskProfile(profile)} className={`py-2 text-xs font-semibold rounded-lg border transition ${riskProfile === profile ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                        {profile}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={runAIAnalysis} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg disabled:opacity-50 transition shadow-lg shadow-blue-900/20">
                  {loading ? 'Evaluating Data Models...' : 'Run Strategy Generator'}
                </button>

                {analysis?.portfolio && (
                  <div className="space-y-4 animate-in fade-in duration-300 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-400 leading-relaxed italic">{analysis.overallReasoning}</p>
                    <div className="space-y-2">
                      {analysis.portfolio.map((strategy: any, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedAiStrategy(strategy)}
                          className={`p-3 rounded-lg border cursor-pointer transition ${selectedAiStrategy?.poolName === strategy.poolName ? 'bg-blue-950/50 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-white truncate mr-2">{strategy.poolName}</span>
                            <span className="text-[10px] font-bold text-emerald-400">{strategy.estimatedAPY}% APY</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 truncate max-w-[70%]">{strategy.reasoning}</span>
                            <span className="text-blue-400 font-bold bg-blue-950 px-1.5 rounded">Alloc: {strategy.suggestedWeight}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedAiStrategy && (
                      <div className="pt-4 mt-4 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs text-slate-400">Deploy into: <span className="text-white font-semibold">{selectedAiStrategy.poolName}</span></label>
                          <button onClick={() => { if(unallocatedBalance) setInvestAmount(formatEther(unallocatedBalance)); }} className="text-[10px] text-blue-400 font-semibold">MAX ({Number(formatEther(unallocatedBalance)).toFixed(3)})</button>
                        </div>
                        <input type="number" step="0.1" value={investAmount} onChange={(e) => setInvestAmount(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white w-full text-sm focus:border-emerald-600 mb-3" />
                        
                        <button
                          onClick={() => handleAction(() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'allocateCapital', args: [selectedAiStrategy.poolName, BigInt(Math.round(selectedAiStrategy.estimatedAPY || 12)), parseEther(investAmount)] }))}
                          disabled={!isConnected || isPending || isConfirming || unallocatedBalance === BigInt(0)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-40"
                        >
                          {unallocatedBalance === BigInt(0) ? 'Deposit OKB First' : isPending ? 'Check Wallet...' : isConfirming ? 'Allocating Onchain...' : `Deploy ${investAmount} OKB`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveSignals.map((sig, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 truncate">{sig.pool}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sig.signal === 'BULLISH' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-blue-950 text-blue-400 border-blue-800'}`}>
                      {sig.signal}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold text-white font-mono">{sig.flow24h}</p>
                      <p className="text-[10px] text-slate-400">24h Net Liquidity Flow</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">{sig.confidence}</p>
                      <p className="text-[10px] text-slate-500">AI Confidence</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                    {sig.activity}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Onchain Liquidity Shifts ($ TVL Millions)</h2>
                  <p className="text-xs text-slate-400">Real-time smart wallet capital movements across X Layer RWA Pools</p>
                </div>
                <span className="text-xs bg-slate-950 text-emerald-400 border border-slate-800 px-3 py-1 rounded-full font-mono">
                  Syncing X Layer RPC
                </span>
              </div>
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LIQUIDITY_FLOW_DATA}>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
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
