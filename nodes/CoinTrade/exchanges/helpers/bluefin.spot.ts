import { OnChainCalls, QueryChain, ISwapParams } from "@firefly-exchange/library-sui/dist/src/spot"
import { toBigNumber, SuiClient, toBigNumberStr } from "@firefly-exchange/library-sui";
import { TickMath, ClmmPoolUtil } from "@firefly-exchange/library-sui/dist/src/spot/clmm";
import { BN } from "bn.js";
import { Decimal} from 'decimal.js'

import { mainnet } from './bluefin.config'
import axios from "axios";
import { getSuiAccount } from "./cetus";
import {
  encodeSuiPrivateKey,
} from "@mysten/sui/cryptography";
import { hexToBytes } from "@noble/ciphers/utils";

const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });

/// Parameters:
/// - privateKey        : The private key of the user making the blockchain call
/// - poolID            : The id of the the pool ex: 0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa
/// - amount            : The amount of coinA you're swapping
/// - aToB              : If true, then the swap is coinA -> coinB
///                       if false then the swap is coinB -> coinA
/// - byAmountIn        : If true, then you're specifying the amount you're putting in
///                       If false, then you're specifying the amount you're getting back
/// - slippage			: The difference between the expected price of a trade and the actual price at which it is executed.
///						  This should be a number between 0 and 1, eg: 0.2

export async function swapAssets(privateKey: string, poolID: string, amount : number, aToB : boolean, byAmountIn: boolean, slippage: number){
		const {keypair: keyPair} = await getSuiAccount(
			encodeSuiPrivateKey(hexToBytes(privateKey), "ED25519")
		)
    let oc = new OnChainCalls(client,mainnet, {signer: keyPair});
    let qc = new QueryChain(client);

    let poolState = await qc.getPool(poolID);

    let iSwapParams : ISwapParams = {
        pool: poolState,
        amountIn : byAmountIn == true ? toBigNumber(amount, (aToB == true ? poolState.coin_a.decimals : poolState.coin_b.decimals))  : 0,
        amountOut: byAmountIn == true ? 0 : toBigNumber(amount, (aToB == true ? poolState.coin_b.decimals : poolState.coin_a.decimals)),
        aToB: aToB,
        byAmountIn: byAmountIn,
        slippage: slippage
    }

    let resp = await oc.swapAssets(iSwapParams);
    return resp
}


export async function getPoolByName(tokenAName: string, tokenBName: string) {
	const ret = await axios.get('https://swap.api.sui-prod.bluefin.io/api/v1/pools/info')
	const poolList = ret.data;

	tokenAName = tokenAName.trim().toUpperCase();
	tokenBName = tokenBName.trim().toUpperCase();

	const aToBSymbol = `${tokenAName}/${tokenBName}`
	const bToASymbol = `${tokenBName}/${tokenAName}`

	const pools = poolList.filter((item: any) => {
		return (item.symbol.toUpperCase() === aToBSymbol || item.symbol.toUpperCase() === bToASymbol) && item.verified
	})
	// if (!pools) return {pools};

	return pools.map((pool: any) => {
			return {
				id: pool.address,
				aToB: pool.symbol.toUpperCase() === aToBSymbol,
				price: pool.price,
				config: pool.config,
				symbol: pool.symbol,
				tokenA: pool.tokenA,
				tokenB: pool.tokenB,
				feeRate: pool.feeRate
			}
		})
}
/// Parameters:
/// - privateKey        : The private key of the user making the blockchain call
/// - poolID          	: The id of the the pool ex: 0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa
/// - coinAmount		: The amount of CoinA willing to provide
///                       This should be a decimal such as 1.7 as the decimal places are handled internally
/// - slippage			: The difference between the expected price of a trade and the actual price at which it is executed.
///						  This should be a number between 0 and 1, eg: 0.2
/// - lowerPrice		: The lower price boundary.
///						  This should be a decimal such as 1.6 as the decimal places are handled internally
/// - upperPrice		: The upper price boundary.
///                       This should be a decimal such as 1.7 as the decimal places are handled internally

export async function openPositionWithFixedAmount(privateKey: string, poolID: string, coinAmount: number, slippage: number, lowerPrice: number, upperPrice: number){
	const {keypair: keyPair} = await getSuiAccount(
		encodeSuiPrivateKey(hexToBytes(privateKey), "ED25519")
	)
	let qc = new QueryChain(client);
	let pool = await qc.getPool(poolID);

	let coinAmountBN = new BN(toBigNumberStr(coinAmount, pool.coin_a.decimals));
	let lowerTick = TickMath.priceToInitializableTickIndex(new Decimal(lowerPrice),pool.coin_a.decimals,pool.coin_b.decimals,pool.ticks_manager.tick_spacing);
	let upperTick = TickMath.priceToInitializableTickIndex(new Decimal(upperPrice),pool.coin_a.decimals,pool.coin_b.decimals,pool.ticks_manager.tick_spacing);

	const curSqrtPrice = new BN(pool.current_sqrt_price);
	const fix_amount_a = true;
	let roundUp = true;

	const liquidityInput = ClmmPoolUtil.estLiquidityAndCoinAmountFromOneAmounts(
			lowerTick,
			upperTick,
			coinAmountBN,
			fix_amount_a,
			roundUp,
			slippage,
			curSqrtPrice
	);

	let oc = new OnChainCalls(client, mainnet, {signer: keyPair});
	let resp = await oc.openPositionWithFixedAmount(pool, lowerTick, upperTick, liquidityInput);
	return resp
}

export async function getUserPositions(userAddress: string){
	let qc = new QueryChain(client);
	let resp = await qc.getUserPositions(mainnet.BasePackage ,userAddress);
	return resp
}

 /// Parameters:
/// - privateKey        : The private key of the user making the blockchain call
/// - posID             : The position ID of the position that is being closed

export async function closePosition(privateKey: string, posID: string){
	const {keypair: keyPair} = await getSuiAccount(
		encodeSuiPrivateKey(hexToBytes(privateKey), "ED25519")
	)
    let oc = new OnChainCalls(client,mainnet, {signer: keyPair});
    let qc = new QueryChain(client);

    let pos = await qc.getPositionDetails(posID);
    let pool = await qc.getPool(pos.pool_id);
    let resp = await oc.closePosition(pool,posID);
    return resp
}
