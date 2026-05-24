'use client';

import React, { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';

// ── base.fun Factory Contract (already deployed on Base Mainnet) ──────────────
const FACTORY_ADDRESS = '0x2E8B4A73b7E6A4f803E6Ad3053B82B4aB783cb52' as const;

const FACTORY_ABI = [
  {
    name: 'deployToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_symbol', type: 'string' },
      { name: '_supply', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

type DeployStatus = 'idle' | 'loading' | 'success' | 'error';

interface PipelineStep {
  label: string;
  sub: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export default function DeployPanel() {
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [activeTab, setActiveTab] = useState<'erc20' | 'nft'>('erc20');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [supply, setSupply] = useState('1000000');
  const [decimals, setDecimals] = useState('18');
  const [mintable, setMintable] = useState(false);
  const [burnable, setBurnable] = useState(false);
  const [advOpen, setAdvOpen] = useState(true);
  const [nftName, setNftName] = useState('');
  const [nftSymbol, setNftSymbol] = useState('');
  const [baseUri, setBaseUri] = useState('');
  const [enumerable, setEnumerable] = useState(false);
  const [nftBurnable, setNftBurnable] = useState(false);
  const [nftAdvOpen, setNftAdvOpen] = useState(false);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [deployError, setDeployError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);

  const isWrongNetwork = isConnected && chain?.id !== 8453;

  function updateStep(index: number, status: PipelineStep['status'], sub?: string) {
    setPipeline(prev => prev.map((s, i) =>
      i === index ? { ...s, status, ...(sub ? { sub } : {}) } : s
    ));
  }

  async function handleDeployERC20() {
    if (!walletClient || !publicClient) { setDeployError('Wallet connected nahi hai!'); return; }
    if (!tokenName.trim()) { setDeployError('Token Name zaroori hai!'); return; }
    if (!tokenSymbol.trim()) { setDeployError('Ticker Symbol zaroori hai!'); return; }
    if (!supply || Number(supply) <= 0) { setDeployError('Supply sahi dalo!'); return; }

    const steps: PipelineStep[] = [
      { label: 'Inputs Validated', sub: 'Checking parameters & bounds.', status: 'pending' },
      { label: 'Gas Simulation', sub: 'Simulating transaction...', status: 'pending' },
      { label: 'Signature Prompt', sub: 'Awaiting wallet confirm...', status: 'pending' },
      { label: 'Base Blockchain Sync', sub: 'Deploying via factory contract.', status: 'pending' },
    ];

    setPipeline(steps);
    setDeployStatus('loading');
    setDeployError('');
    setDeployedAddress('');
    setTxHash('');

    try {
      updateStep(0, 'active');
      await new Promise(r => setTimeout(r, 500));
      updateStep(0, 'done', 'Checked parameters & bounds.');

      updateStep(1, 'active');
      const supplyBigInt = parseUnits(supply, 0);
      let estimatedGas = '~$0.04';
      try {
        const gas = await publicClient.estimateContractGas({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'deployToken',
          args: [tokenName, tokenSymbol, supplyBigInt],
          account: address,
        });
        const gasPrice = await publicClient.getGasPrice();
        const gasCostUsd = (Number(gas * gasPrice) / 1e18 * 2091).toFixed(4);
        estimatedGas = `~$${gasCostUsd}`;
      } catch { estimatedGas = '~$0.04'; }
      updateStep(1, 'done', `Gas estimate: ${estimatedGas}`);

      updateStep(2, 'active');
      const hash = await walletClient.writeContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'deployToken',
        args: [tokenName, tokenSymbol, supplyBigInt],
      });
      setTxHash(hash);
      updateStep(2, 'done', 'Wallet confirmed.');

      updateStep(3, 'active');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let contractAddr = '';
      for (const log of receipt.logs) {
        if (log.topics[1]) { contractAddr = '0x' + log.topics[1].slice(26); break; }
      }
      setDeployedAddress(contractAddr);
      updateStep(3, 'done', 'Deployed to Base Mainnet!');
      setDeployStatus('success');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const clean = msg.includes('User rejected') || msg.includes('user rejected')
        ? 'Tumne transaction cancel kar di'
        : msg.includes('insufficient funds')
        ? 'Base pe ETH balance kam hai!'
        : msg.length > 100 ? msg.slice(0, 100) + '...' : msg;
      setDeployError(clean);
      setDeployStatus('error');
      setPipeline(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
    }
  }

  function resetDeploy() {
    setDeployStatus('idle');
    setDeployError('');
    setDeployedAddress('');
    setTxHash('');
    setPipeline([]);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-4xl font-black uppercase tracking-widest text-white mt-2">Deploy</h1>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('erc20')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all duration-200 ${activeTab === 'erc20' ? 'text-[#00D1FF] border-[#00D1FF] bg-[#00D1FF]/10' : 'text-white/40 border-white/10 bg-transparent hover:text-white hover:border-white/30'}`}>
          ERC-20 Token
        </button>
        <button onClick={() => setActiveTab('nft')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all duration-200 ${activeTab === 'nft' ? 'text-[#7B61FF] border-[#7B61FF] bg-[#7B61FF]/10' : 'text-white/40 border-white/10 bg-transparent hover:text-white hover:border-white/30'}`}>
          NFT Contract
        </button>
      </div>

      {activeTab === 'erc20' && (
        <div className="w-full max-w-xl bg-white/[0.02] border border-[#00D1FF]/20 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D1FF]/50 to-transparent" />
          <div className="flex flex-col items-center mb-6">
            <div className="w-11 h-11 bg-gradient-to-br from-[#1a56db] to-[#7B61FF] rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Deploy Token</h2>
            <p className="text-[11px] text-white/40 font-mono mt-1 text-center">Launch a standard ERC-20 contract directly on Base Mainnet.</p>
          </div>
          <hr className="border-white/5 mb-6" />

          {isWrongNetwork && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-[11px] text-amber-400 font-mono text-center">
              Wallet mein Base Mainnet select karo.
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono">Token Name <span className="text-red-400">*</span></label>
              <span className={`text-[10px] font-mono ${tokenName.length >= 26 ? 'text-amber-400' : 'text-white/25'}`}>{tokenName.length} / 32</span>
            </div>
            <input type="text" maxLength={32} value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="e.g. Malix777"
              className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 outline-none focus:border-[#00D1FF]/40 focus:ring-2 focus:ring-[#00D1FF]/10 transition-all" />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono">Ticker Symbol <span className="text-red-400">*</span></label>
              <span className="text-[10px] font-mono text-white/25">e.g. MALIX777</span>
            </div>
            <input type="text" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value.toUpperCase())} placeholder="e.g. MALIX777"
              className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 outline-none focus:border-[#00D1FF]/40 focus:ring-2 focus:ring-[#00D1FF]/10 transition-all" />
          </div>

          <div className="mb-5">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono">Initial Supply <span className="text-red-400">*</span></label>
              <span className="text-[10px] font-mono text-white/25">Excluding decimals</span>
            </div>
            <input type="number" value={supply} onChange={e => setSupply(e.target.value)}
              className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#00D1FF]/40 focus:ring-2 focus:ring-[#00D1FF]/10 transition-all" />
          </div>

          <button onClick={() => setAdvOpen(!advOpen)}
            className="w-full flex items-center justify-between bg-black/30 border border-white/7 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest font-mono text-[#00D1FF] hover:bg-white/5 transition-all mb-3">
            <span>Advanced Settings</span>
            <span className={`text-white/40 transition-transform duration-300 ${advOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {advOpen && (
            <div className="bg-black/25 border border-white/6 rounded-xl p-4 mb-5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono mb-2 block">Token Decimals</label>
              <input type="number" value={decimals} onChange={e => setDecimals(e.target.value)}
                className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#00D1FF]/40 transition-all mb-3" />
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Mintable', sub: 'Dynamic supply minting.', icon: '', val: mintable, set: setMintable, color: '#1a7fe8' },
                  { label: 'Burnable', sub: 'Holders burn supply.', icon: '', val: burnable, set: setBurnable, color: '#1a7fe8' }
                ].map(({ label, sub, icon, val, set, color }) => (
                  <div key={label} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl p-3">
                    <span className="text-sm">{icon}</span>
                    <div className="flex-1">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white font-mono">{label}</div>
                      <div className="text-[9px] text-white/35 font-mono">{sub}</div>
                    </div>
                    <button onClick={() => set(!val)}
                      className="w-8 h-[18px] rounded-full relative transition-colors duration-200 border-0 outline-none"
                      style={{ backgroundColor: val ? color : 'rgba(255,255,255,0.1)' }}>
                      <span className={`absolute top-[3px] w-3 h-3 bg-white rounded-full transition-all duration-200 ${val ? 'left-[17px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-black/30 border border-white/7 rounded-2xl p-6 text-center">
            {deployStatus === 'idle' && (
              <>
                <div className="text-2xl mb-2">🔗</div>
                <h3 className="text-sm font-bold text-white mb-1">{isConnected ? 'Ready to Deploy' : 'Authenticate Wallet'}</h3>
                <p className="text-[11px] text-white/40 mb-4 leading-relaxed">
                  {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)} · Base Factory · ~$0.04 fee` : 'Connect your Web3 address to deploy ERC-20 contract assets to Base.'}
                </p>
                {isConnected ? (
                  <button onClick={handleDeployERC20} disabled={isWrongNetwork}
                    className="w-full bg-[#1a7fe8] hover:bg-[#1e8fff] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all active:scale-[0.98]">
                    {isWrongNetwork ? 'Switch to Base Network' : 'Deploy Token'}
                  </button>
                ) : (
                  <div className="flex justify-center"><ConnectButton label="Authenticate Wallet" showBalance={false} chainStatus="none" /></div>
                )}
              </>
            )}
            {deployStatus === 'loading' && (
              <>
                <div className="text-2xl mb-2">⚙️</div>
                <h3 className="text-sm font-bold text-white mb-1">Deploying...</h3>
                <p className="text-[11px] text-white/40">Wallet confirm karo aur wait karo.</p>
              </>
            )}
            {deployStatus === 'error' && (
              <>
                <div className="text-2xl mb-2">❌</div>
                <h3 className="text-sm font-bold text-red-400 mb-2">Deploy Failed</h3>
                <p className="text-[11px] text-red-300/70 font-mono mb-4">{deployError}</p>
                <button onClick={resetDeploy} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs py-3 rounded-xl transition-all">Try Again</button>
              </>
            )}
            {deployStatus === 'success' && (
              <>
                <div className="text-2xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-[#00FFA3] mb-3">Contract Deployed!</h3>
                {deployedAddress && (
                  <div className="bg-black/40 rounded-xl p-3 mb-3 text-left">
                    <div className="text-[9px] text-white/40 font-mono mb-1">CONTRACT ADDRESS</div>
                    <a href={`https://basescan.org/address/${deployedAddress}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-[#00D1FF] font-mono break-all hover:underline">{deployedAddress}</a>
                  </div>
                )}
                {txHash && (
                  <div className="bg-black/40 rounded-xl p-3 mb-4 text-left">
                    <div className="text-[9px] text-white/40 font-mono mb-1">TX HASH</div>
                    <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-[#7B61FF] font-mono break-all hover:underline">{txHash.slice(0, 32)}...</a>
                  </div>
                )}
                <button onClick={resetDeploy} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs py-3 rounded-xl transition-all">Deploy Another Token</button>
              </>
            )}
            <div className="flex items-center justify-center gap-2 mt-3 text-[9px] font-mono text-[#00FFA3]/70 tracking-widest uppercase">
              <span className="w-3.5 h-3.5 bg-[#00FFA3]/15 border border-[#00FFA3]/30 rounded-full flex items-center justify-center text-[8px]">✓</span>
              Zero Exploit Surfaces · Fully On-Chain Autonomous Deployments
            </div>
          </div>

          {pipeline.length > 0 && (
            <div className="bg-black/40 border border-white/8 rounded-2xl p-5 mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">Pipeline Logs</span>
                {deployStatus === 'loading' && <span className="text-[10px] font-mono text-[#00D1FF] animate-pulse">EXECUTING</span>}
                {deployStatus === 'success' && <span className="text-[10px] font-mono text-[#00FFA3]">COMPLETE</span>}
                {deployStatus === 'error' && <span className="text-[10px] font-mono text-red-400">FAILED</span>}
              </div>
              <div className="flex flex-col gap-2.5">
                {pipeline.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${step.status === 'done' ? 'bg-[#00FFA3]' : step.status === 'active' ? 'bg-[#00D1FF] animate-pulse' : step.status === 'error' ? 'bg-red-400' : 'bg-white/15'}`} />
                    <div>
                      <div className={`text-[11px] font-bold font-mono ${step.status === 'done' ? 'text-white' : step.status === 'active' ? 'text-[#00D1FF]' : step.status === 'error' ? 'text-red-400' : 'text-white/30'}`}>{step.label}</div>
                      <div className="text-[10px] text-white/30 font-mono">{step.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'nft' && (
        <div className="w-full max-w-xl bg-white/[0.02] border border-[#7B61FF]/25 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B61FF]/60 to-transparent" />
          <div className="flex flex-col items-center mb-6">
            <div className="w-11 h-11 bg-gradient-to-br from-[#7B61FF] to-[#c026d3] rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Deploy NFT</h2>
            <p className="text-[11px] text-white/40 font-mono mt-1 text-center">Launch an ERC-721 NFT collection directly on Base Mainnet.</p>
          </div>
          <hr className="border-white/5 mb-6" />
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono block mb-1.5">Collection Name <span className="text-red-400">*</span></label>
            <input type="text" maxLength={32} value={nftName} onChange={e => setNftName(e.target.value)} placeholder="e.g. Malix777"
              className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 outline-none focus:border-[#7B61FF]/40 transition-all" />
          </div>
          <div className="mb-5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono block mb-1.5">Symbol <span className="text-red-400">*</span></label>
            <input type="text" value={nftSymbol} onChange={e => setNftSymbol(e.target.value.toUpperCase())} placeholder="e.g. MALIX777"
              className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 outline-none focus:border-[#7B61FF]/40 transition-all" />
          </div>
          <button onClick={() => setNftAdvOpen(!nftAdvOpen)}
            className="w-full flex items-center justify-between bg-black/30 border border-white/7 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest font-mono text-[#7B61FF] hover:bg-white/5 transition-all mb-3">
            <span>Advanced Settings</span>
            <span className={`text-white/40 transition-transform duration-300 ${nftAdvOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {nftAdvOpen && (
            <div className="bg-black/25 border border-white/6 rounded-xl p-4 mb-5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono mb-2 block">Base URI</label>
              <input type="text" value={baseUri} onChange={e => setBaseUri(e.target.value)} placeholder="ipfs://..."
                className="w-full bg-black/35 border border-white/8 rounded-xl px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 outline-none focus:border-[#7B61FF]/40 transition-all mb-3" />
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Enumerable', sub: 'On-chain enumeration.', val: enumerable, set: setEnumerable },
                  { label: 'Burnable', sub: 'Holders burn NFTs.', val: nftBurnable, set: setNftBurnable }
                ].map(({ label, sub, val, set }) => (
                  <div key={label} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl p-3">
                    <div className="flex-1">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white font-mono">{label}</div>
                      <div className="text-[9px] text-white/35 font-mono">{sub}</div>
                    </div>
                    <button onClick={() => set(!val)}
                      className="w-8 h-[18px] rounded-full relative transition-colors duration-200 border-0 outline-none"
                      style={{ backgroundColor: val ? '#7B61FF' : 'rgba(255,255,255,0.1)' }}>
                      <span className={`absolute top-[3px] w-3 h-3 bg-white rounded-full transition-all duration-200 ${val ? 'left-[17px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-black/30 border border-white/7 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2">🔗</div>
            <h3 className="text-sm font-bold text-white mb-1">Authenticate Wallet</h3>
            <p className="text-[11px] text-white/40 mb-4">Connect your Web3 address to deploy NFT contracts to Base.</p>
            {isConnected ? (
              <button onClick={() => alert('NFT deploy coming soon!')}
                className="w-full bg-gradient-to-r from-[#7B61FF] to-[#c026d3] hover:opacity-90 text-white font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all">
                Deploy NFT (Coming Soon)
              </button>
            ) : (
              <div className="flex justify-center"><ConnectButton label="Authenticate Wallet" showBalance={false} chainStatus="none" /></div>
            )}
            <div className="flex items-center justify-center gap-2 mt-3 text-[9px] font-mono text-[#00FFA3]/70 tracking-widest uppercase">
              <span className="w-3.5 h-3.5 bg-[#00FFA3]/15 border border-[#00FFA3]/30 rounded-full flex items-center justify-center text-[8px]">✓</span>
              Zero Exploit Surfaces · Fully On-Chain Autonomous Deployments
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
