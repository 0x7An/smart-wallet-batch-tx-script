import { config } from "dotenv";
import { SmartContract, ThirdwebSDK } from "@thirdweb-dev/sdk";
import { Sepolia } from "@thirdweb-dev/chains";
import { SmartWallet } from "@thirdweb-dev/wallets";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";
import { BaseContract } from "ethers";

config();

const chain = Sepolia;
const factoryAddress = "0xe0cc4a5de30b4ed5b31a17bdcdf697078bd9e952";
const secretKey = process.env.THIRDWEB_SECRET_KEY as string;
const tokenContractAddress = "0x0d9Cd5946Af387093d26d5aef196d40DD69ED82d";
const editionContractAddress = "0x061e09d2392Cf771882E5a2C2F7fCEdB34885319";

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

const performClaims = async (
  smartWallet: SmartWallet, 
  tokenContract?: SmartContract<BaseContract>, 
  editionContract?: SmartContract<BaseContract>
) => {
  try {
    const userOperations = [
      ...(tokenContract ? [await tokenContract.erc20.claim.prepare(1)] : []),
      ...(editionContract ? [await editionContract.erc1155.claim.prepare(0, 1)] : [])
    ];

    if (userOperations.length === 0) {
      console.log("No operations to perform");
      return;
    }

    console.log("userOperations:", userOperations);

    const batchTx = await smartWallet.executeBatch(userOperations);
    console.log("Transaction hash:", batchTx.receipt.transactionHash);
    return batchTx;
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

    const tokenContract = await sdk.getContract(tokenContractAddress);
    // const editionContract = await sdk.getContract(editionContractAddress);
    await performClaims(smartWallet, tokenContract);
  } catch (error: any) {
    console.error(error.message);
  }
};

main();
