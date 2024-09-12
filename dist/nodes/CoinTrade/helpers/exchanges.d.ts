import * as ccxt from 'ccxt';
declare class Exchanges {
    exchanges: Map<string, ccxt.Exchange>;
    constructor();
    get(platformId: string): ccxt.Exchange;
    fetch(): {
        ace: typeof ccxt.ace;
        alpaca: typeof ccxt.alpaca;
        ascendex: typeof ccxt.ascendex;
        bequant: typeof ccxt.bequant;
        bigone: typeof ccxt.bigone;
        binance: typeof ccxt.binance;
        binancecoinm: typeof ccxt.binancecoinm;
        binanceus: typeof ccxt.binanceus;
        binanceusdm: typeof ccxt.binanceusdm;
        bingx: typeof ccxt.bingx;
        bit2c: typeof ccxt.bit2c;
        bitbank: typeof ccxt.bitbank;
        bitbns: typeof ccxt.bitbns;
        bitcoincom: typeof ccxt.bitcoincom;
        bitfinex: typeof ccxt.bitfinex;
        bitfinex2: typeof ccxt.bitfinex2;
        bitflyer: typeof ccxt.bitflyer;
        bitget: typeof ccxt.bitget;
        bithumb: typeof ccxt.bithumb;
        bitmart: typeof ccxt.bitmart;
        bitmex: typeof ccxt.bitmex;
        bitopro: typeof ccxt.bitopro;
        bitpanda: typeof ccxt.bitpanda;
        bitrue: typeof ccxt.bitrue;
        bitso: typeof ccxt.bitso;
        bitstamp: typeof ccxt.bitstamp;
        bitteam: typeof ccxt.bitteam;
        bitvavo: typeof ccxt.bitvavo;
        bl3p: typeof ccxt.bl3p;
        blockchaincom: typeof ccxt.blockchaincom;
        blofin: typeof ccxt.blofin;
        btcalpha: typeof ccxt.btcalpha;
        btcbox: typeof ccxt.btcbox;
        btcmarkets: typeof ccxt.btcmarkets;
        btcturk: typeof ccxt.btcturk;
        bybit: typeof ccxt.bybit;
        cex: typeof ccxt.cex;
        coinbase: typeof ccxt.coinbase;
        coinbaseadvanced: typeof ccxt.coinbaseadvanced;
        coinbaseexchange: typeof ccxt.coinbaseexchange;
        coinbaseinternational: typeof ccxt.coinbaseinternational;
        coincheck: typeof ccxt.coincheck;
        coinex: typeof ccxt.coinex;
        coinlist: typeof ccxt.coinlist;
        coinmate: typeof ccxt.coinmate;
        coinmetro: typeof ccxt.coinmetro;
        coinone: typeof ccxt.coinone;
        coinsph: typeof ccxt.coinsph;
        coinspot: typeof ccxt.coinspot;
        cryptocom: typeof ccxt.cryptocom;
        currencycom: typeof ccxt.currencycom;
        delta: typeof ccxt.delta;
        deribit: typeof ccxt.deribit;
        digifinex: typeof ccxt.digifinex;
        exmo: typeof ccxt.exmo;
        fmfwio: typeof ccxt.fmfwio;
        gate: typeof ccxt.gate;
        gateio: typeof ccxt.gateio;
        gemini: typeof ccxt.gemini;
        hashkey: typeof ccxt.hashkey;
        hitbtc: typeof ccxt.hitbtc;
        hollaex: typeof ccxt.hollaex;
        htx: typeof ccxt.htx;
        huobi: typeof ccxt.huobi;
        huobijp: typeof ccxt.huobijp;
        hyperliquid: typeof ccxt.hyperliquid;
        idex: typeof ccxt.idex;
        independentreserve: typeof ccxt.independentreserve;
        indodax: typeof ccxt.indodax;
        kraken: typeof ccxt.kraken;
        krakenfutures: typeof ccxt.krakenfutures;
        kucoin: typeof ccxt.kucoin;
        kucoinfutures: typeof ccxt.kucoinfutures;
        kuna: typeof ccxt.kuna;
        latoken: typeof ccxt.latoken;
        lbank: typeof ccxt.lbank;
        luno: typeof ccxt.luno;
        lykke: typeof ccxt.lykke;
        mercado: typeof ccxt.mercado;
        mexc: typeof ccxt.mexc;
        ndax: typeof ccxt.ndax;
        novadax: typeof ccxt.novadax;
        oceanex: typeof ccxt.oceanex;
        okcoin: typeof ccxt.okcoin;
        okx: typeof ccxt.okx;
        onetrading: typeof ccxt.onetrading;
        oxfun: typeof ccxt.oxfun;
        p2b: typeof ccxt.p2b;
        paradex: typeof ccxt.paradex;
        paymium: typeof ccxt.paymium;
        phemex: typeof ccxt.phemex;
        poloniex: typeof ccxt.poloniex;
        poloniexfutures: typeof ccxt.poloniexfutures;
        probit: typeof ccxt.probit;
        timex: typeof ccxt.timex;
        tokocrypto: typeof ccxt.tokocrypto;
        tradeogre: typeof ccxt.tradeogre;
        upbit: typeof ccxt.upbit;
        vertex: typeof ccxt.vertex;
        wavesexchange: typeof ccxt.wavesexchange;
        wazirx: typeof ccxt.wazirx;
        whitebit: typeof ccxt.whitebit;
        woo: typeof ccxt.woo;
        woofipro: typeof ccxt.woofipro;
        xt: typeof ccxt.xt;
        yobit: typeof ccxt.yobit;
        zaif: typeof ccxt.zaif;
        zonda: typeof ccxt.zonda;
    };
    setProxy(exchange: ccxt.Exchange, proxy: string): void;
    setKeys(exchange: ccxt.Exchange, apiKey: string, secret: string, password?: string, uid?: string): void;
    clearKeys(exchange: ccxt.Exchange): void;
}
declare const exchanges: Exchanges;
export default exchanges;
