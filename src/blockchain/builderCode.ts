export const BUILDER_CODE = 'bc_7svp73o3';

export const ENCODED_BUILDER_STRING =
  '0x6263...21';

/**
 * Reusable transaction wrapper that includes the Base Builder Code.
 * When interacting with contracts or sending transactions on Base,
 * we append or set the ENCODED_BUILDER_STRING in the data field.
 */
export async function sendBaseTransaction(walletClient: any, config: any) {
  if (!walletClient) {
    throw new Error('Wallet client is required to send transactions.');
  }
  
  // If data is present, we can append or make sure the builder string is included
  const data = config.data && config.data !== '0x' 
    ? `${config.data}${ENCODED_BUILDER_STRING.slice(2)}` 
    : ENCODED_BUILDER_STRING;

  return await walletClient.sendTransaction({
    ...config,
    data,
  });
}
