import {  PreSwapWithMultiPoolParams, TransactionUtil } from "@cetusprotocol/cetus-sui-clmm-sdk";
import BN from 'bn.js'

import {
  AggregatorResult,
  PathProvider,
} from "@cetusprotocol/cetus-sui-clmm-sdk";
import { CoinProvider } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  decodeSuiPrivateKey,
  encodeSuiPrivateKey,
} from "@mysten/sui/cryptography";
import { cetusClmmSDK } from "./cetus.config";
import { hexToBytes } from "@noble/ciphers/utils";
import BigNumber from "bignumber.js";

// const SUI = "0x2::sui::SUI";
// const USDC =
//   "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
// const WUSDC =
//   "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";
// const PYTH =
//   "0x9c6d76eb273e6b5ba2ec8d708b7fa336a5531f6be59f326b5be8d4d8b12348a4::coin::COIN";

	export async function getSuiAccount(
  secretKey: string
): Promise<{ address: string; keypair: Ed25519Keypair }> {
  const keypair = Ed25519Keypair.fromSecretKey(
    decodeSuiPrivateKey(secretKey).secretKey
  );
  return {
    keypair,
    address: keypair.toSuiAddress(),
  };
}

let isInited = false;

async function initPool() {
	if (isInited) return;
  const coinMap = new Map();
  const poolMap = new Map();

  const resp: any = await fetch(
    "https://api-sui.cetus.zone/v2/sui/pools_info",
    { method: "GET" }
  );
  const poolsInfo = await resp.json();

  if (poolsInfo.code === 200) {
    for (const pool of poolsInfo.data.lp_list) {
      if (pool.is_closed) {
        continue;
      }

      let coin_a = pool.coin_a.address;
      let coin_b = pool.coin_b.address;

      coinMap.set(coin_a, {
        address: pool.coin_a.address,
        decimals: pool.coin_a.decimals,
      });
      coinMap.set(coin_b, {
        address: pool.coin_b.address,
        decimals: pool.coin_b.decimals,
      });

      const pair = `${coin_a}-${coin_b}`;
      const pathProvider = poolMap.get(pair);
      if (pathProvider) {
        pathProvider.addressMap.set(Number(pool.fee) * 100, pool.address);
      } else {
        poolMap.set(pair, {
          base: coin_a,
          quote: coin_b,
          addressMap: new Map([[Number(pool.fee) * 100, pool.address]]),
        });
      }
    }
  }

  const coins: CoinProvider = {
    coins: Array.from(coinMap.values()),
  };
  const paths: PathProvider = {
    paths: Array.from(poolMap.values()),
  };

  cetusClmmSDK.Router.loadGraph(coins, paths);
	isInited = true;
}


export async function getWalletBalance (userAddress: string, coinAddress: string) {

  const allCoinAsset = await cetusClmmSDK.getOwnerCoinAssets(userAddress);
  const amount = allCoinAsset.reduce((acc, coin) => {
    if (coin.coinAddress.toLowerCase() === coinAddress.toLowerCase()) {
      acc = acc.plus(coin.balance.toString())
    }
    return acc
		//@ts-ignore
  }, new BigNumber(0));
  return amount.toString();
}

export async function swap(
  priKey: string,
  token0: string,
  token1: string,
  amountIn: string,
  recipient: string
) {
  await initPool();
  const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
  // encodeSuiPrivateKey(hex to bytes)
  const { keypair: userKeyPair, address: userAddress } = await getSuiAccount(
    encodeSuiPrivateKey(hexToBytes(priKey), "ED25519")
  );

  // return;
  // The first two addresses requiring coin types.

	const poolByCoins = await cetusClmmSDK.Pool.getPoolByCoins([token0, token1])
	const swapWithMultiPoolParams: PreSwapWithMultiPoolParams = {
		poolAddresses: poolByCoins.map(i => i.poolAddress),
		a2b: true,
		byAmountIn: true,
		amount: amountIn,
		coinTypeA: poolByCoins[0].coinTypeA,
		coinTypeB: poolByCoins[0].coinTypeB
	}
  const res = (
    await cetusClmmSDK.RouterV2.getBestRouter(
      token0,
      token1,
			// @ts-ignore
      new BN(amountIn),
      true,
      0.5,
      "",
      userAddress,
      swapWithMultiPoolParams,
      false
    )
  ).result as AggregatorResult;

  // If find the best swap router, then send transaction.
  if (!res?.isExceed) {
    const allCoinAsset = await cetusClmmSDK.getOwnerCoinAssets(userAddress);
    // console.log(allCoinAsset)
    // If recipient not set, transfer objects move call will use ctx sender.
    const payload = await TransactionUtil.buildAggregatorSwapTransaction(
      cetusClmmSDK,
      res,
      allCoinAsset,
      "",
      0.5,
      recipient
    );
    payload.setSender(userAddress);
    const signedTx = await payload.sign({
      client: suiClient,
      signer: userKeyPair,
    });

    const executionRes = await suiClient.executeTransactionBlock({
      transactionBlock: signedTx.bytes,
      signature: signedTx.signature,
      options: { showEffects: true },
    });
    const txInfo = await suiClient.waitForTransaction({
      digest: executionRes.digest,
      options: { showEffects: true },
    });
    return txInfo.digest;
  }
	return ''
}
