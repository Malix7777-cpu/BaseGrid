export const BUILDER_CODE = 'bc_7svp73o3';

export const ENCODED_BUILDER_STRING =
  '0x62635f3773767037336f330b0080218021802180218021802180218021';

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
