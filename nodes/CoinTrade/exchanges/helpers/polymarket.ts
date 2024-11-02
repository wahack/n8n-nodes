import { parseUnits } from "viem";

type TickSize = "0.1" | '0.01' | '0.001' | '0.0001'
type RoundConfig = {
	price: number,
	size: number,
	amount: number
}
enum Side {
	BUY = "BUY",
	SELL = "SELL"
}
const COLLATERAL_TOKEN_DECIMALS = 6;
const CONDITIONAL_TOKEN_DECIMALS = 6;
export const roundNormal = (num: number, decimals: number): number => {
	if (decimalPlaces(num) <= decimals) {
			return num;
	}
	return Math.round((num + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
};

export const roundDown = (num: number, decimals: number): number => {
	if (decimalPlaces(num) <= decimals) {
			return num;
	}
	return Math.floor(num * 10 ** decimals) / 10 ** decimals;
};

export const roundUp = (num: number, decimals: number): number => {
	if (decimalPlaces(num) <= decimals) {
			return num;
	}
	return Math.ceil(num * 10 ** decimals) / 10 ** decimals;
};

export const decimalPlaces = (num: number): number => {
	if (Number.isInteger(num)) {
			return 0;
	}

	const arr = num.toString().split(".");
	if (arr.length <= 1) {
			return 0;
	}

	return arr[1].length;
};

export const ROUNDING_CONFIG: Record<TickSize, RoundConfig> = {
	"0.1": {
			price: 1,
			size: 2,
			amount: 3,
	},
	"0.01": {
			price: 2,
			size: 2,
			amount: 4,
	},
	"0.001": {
			price: 3,
			size: 2,
			amount: 5,
	},
	"0.0001": {
			price: 4,
			size: 2,
			amount: 6,
	},
};
export const getOrderRawAmounts = (
	side: Side,
	size: number,
	price: number,
	tickSize: TickSize = "0.001"
): {makerAmount: string; takerAmount: string } => {

	const roundConfig = ROUNDING_CONFIG[tickSize || '0.001']
	const rawPrice = roundNormal(price, roundConfig.price);

	if (side === Side.BUY) {
			// force 2 decimals places
			// console.log('=======by');

			const rawTakerAmt = roundDown(size, roundConfig.size);

			let rawMakerAmt = rawTakerAmt * rawPrice;
			if (decimalPlaces(rawMakerAmt) > roundConfig.amount) {
					rawMakerAmt = roundUp(rawMakerAmt, roundConfig.amount + 4);
					if (decimalPlaces(rawMakerAmt) > roundConfig.amount) {
							rawMakerAmt = roundDown(rawMakerAmt, roundConfig.amount);
					}
			}

			return {
				makerAmount: parseUnits(rawMakerAmt.toString(), COLLATERAL_TOKEN_DECIMALS).toString(),
				takerAmount: parseUnits(rawTakerAmt.toString(), CONDITIONAL_TOKEN_DECIMALS).toString()
		};
	} else {
		// console.log('fffff');

			const rawMakerAmt = roundDown(size, roundConfig.size);

			let rawTakerAmt = rawMakerAmt * rawPrice;
			if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
					rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
					if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
							rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
					}
			}



			return {
					makerAmount:  parseUnits(rawMakerAmt.toString(), COLLATERAL_TOKEN_DECIMALS).toString(),
					takerAmount: parseUnits(rawTakerAmt.toString(), CONDITIONAL_TOKEN_DECIMALS).toString()
			};
	}
};

//
// console.log(getOrderRawAmounts(Side.BUY, 1.69, 0.338))
// console.log(getOrderRawAmounts(Side.BUY, 1.69, 0.338, '0.01'))
// console.log(getOrderRawAmounts(Side.BUY, 1.69, 0.338, '0.001'))

