import { config } from "dotenv";
import { SmartContract, ThirdwebSDK } from "@thirdweb-dev/sdk";
import { Goerli } from "@thirdweb-dev/chains";
import { SmartWallet } from "@thirdweb-dev/wallets";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";
import { BaseContract } from "ethers";

config();

const chain = Goerli;
const factoryAddress = "0x0EDfbA441f630E0D38F8d92C486EF0e9119E100a";
const secretKey = process.env.THIRDWEB_SECRET_KEY as string;

if (!secretKey) {
  throw new Error("No API Key found. Get one from https://thirdweb.com/dashboard");
}

const initializePersonalWallet = async () => {
  try {
    const personalWallet = new LocalWalletNode();
    await personalWallet.loadOrCreate({ strategy: "encryptedJson", password: "password" });
    return personalWallet;
  } catch (error: any) {
    throw new Error("Failed to initialize personal wallet: " + error.message);
  }
};

const setupSmartWallet = async (personalWallet: LocalWalletNode) => {
  try {
    const smartWallet = new SmartWallet({ chain, factoryAddress, secretKey, gasless: true });
    await smartWallet.connect({ personalWallet });
    return smartWallet;
  } catch (error: any) {
    throw new Error("Failed to setup smart wallet: " + error.message);
  }
};

const initializeSDK = async (smartWallet: SmartWallet) => {
  try {
    return await ThirdwebSDK.fromWallet(smartWallet, chain, { secretKey });
  } catch (error: any) {
    throw new Error("Failed to initialize SDK: " + error.message);
  }
};

const performClaims = async (smartWallet: SmartWallet, tokenContract: SmartContract<BaseContract>, editionContract: SmartContract<BaseContract>) => {
  try {
    const tx1 = await tokenContract.erc20.claim.prepare(1);
    const tx2 = await editionContract.erc1155.claim.prepare(0, 1);
    const batchTx = await smartWallet.executeBatch([tx1, tx2]);
    console.log("Claimed 1 ERC20 token & 1 Edition NFT, tx hash:", batchTx.receipt.transactionHash);
  } catch (error: any) {
    throw new Error("Failed to claim tokens: " + error.message);
  }
};

const main = async () => {
  try {
    console.log("Running on", chain.slug, "with factory", factoryAddress);

    const personalWallet = await initializePersonalWallet();
    console.log("Personal wallet address:", await personalWallet.getAddress());

    const smartWallet = await setupSmartWallet(personalWallet);
    const sdk = await initializeSDK(smartWallet);

    console.log("Smart Account addr:", await sdk.wallet.getAddress());
    console.log("balance:", (await sdk.wallet.balance()).displayValue);

    const tokenContract = await sdk.getContract("0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823");
    const editionContract = await sdk.getContract("0x8096C71f400984C3C1B7F3a79Ab0C0EaC417b91c");
    await performClaims(smartWallet, tokenContract, editionContract);
  } catch (error: any) {
    console.error(error.message);
  }
};

main();
