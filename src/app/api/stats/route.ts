import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  const targetAddress = address.trim().toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(targetAddress)) {
    return NextResponse.json({ error: 'Invalid Base Mainnet address' }, { status: 400 });
  }

  try {
    // 1. ETH Balance from public Base RPC
    const rpcPromise = fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'eth_getBalance',
        params: [targetAddress, 'latest']
      })
    })
      .then(res => res.json())
      .then(json => (json?.result ? BigInt(json.result).toString() : '0'))
      .catch(() => '0');

    // 2. ALL normal transactions via Blockscout (no API key, no limit!)
    const txPromise = fetch(
      `https://base.blockscout.com/api?module=account&action=txlist&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc`,
      { headers: { 'Accept': 'application/json' } }
    )
      .then(res => res.json())
      .then(json => (json.status === '1' && Array.isArray(json.result) ? json.result : []))
      .catch(() => []);

    // 3. ALL ERC-20 token transfers
    const tokenPromise = fetch(
      `https://base.blockscout.com/api?module=account&action=tokentx&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc`,
      { headers: { 'Accept': 'application/json' } }
    )
      .then(res => res.json())
      .then(json => (json.status === '1' && Array.isArray(json.result) ? json.result : []))
      .catch(() => []);

    // 4. ALL NFT transfers
    const nftPromise = fetch(
      `https://base.blockscout.com/api?module=account&action=tokennfttx&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc`,
      { headers: { 'Accept': 'application/json' } }
    )
      .then(res => res.json())
      .then(json => (json.status === '1' && Array.isArray(json.result) ? json.result : []))
      .catch(() => []);

    // Run all in parallel
    const [nativeBalance, rawTxs, rawTokens, rawNfts] = await Promise.all([
      rpcPromise, txPromise, tokenPromise, nftPromise
    ]);

    // Map to frontend format
    const txData = {
      result: rawTxs.map((tx: any) => ({
        hash: tx.hash || '',
        blockNumber: tx.blockNumber || '0',
        timeStamp: tx.timeStamp || '0',
        from: tx.from || '',
        to: tx.to || '',
        value: tx.value || '0',
        gasUsed: tx.gasUsed || '0',
        isError: tx.isError || '0',
        input: tx.input || '0x',
        contractAddress: tx.contractAddress || ''
      }))
    };

    const tokenData = {
      result: rawTokens.map((t: any) => ({
        hash: t.hash || '',
        tokenName: t.tokenName || 'Token',
        tokenSymbol: t.tokenSymbol || 'TKN',
        value: t.value || '0',
        tokenDecimal: t.tokenDecimal || '18',
        from: t.from || '',
        to: t.to || '',
        contractAddress: t.contractAddress || ''
      }))
    };

    const nftData = {
      result: rawNfts.map((t: any) => ({
        hash: t.hash || '',
        tokenName: t.tokenName || 'NFT',
        tokenSymbol: t.tokenSymbol || 'NFT',
        tokenID: t.tokenID || '0',
        from: t.from || '',
        to: t.to || '',
        contractAddress: t.contractAddress || ''
      }))
    };

    const balWei = BigInt(nativeBalance);

    return NextResponse.json({
      txData,
      tokenData,
      balData: { result: balWei.toString() },
      nftData,
    });

  } catch (error: any) {
    console.error('Wallet analytics error:', error);
    return NextResponse.json({ error: error.message || 'API failed' }, { status: 500 });
  }
}
