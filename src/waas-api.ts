import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from "axios";
import * as Debug from "debug";
import {Bitcoin} from "./btc";
import {Wallet} from "./wallet";
import {WaasAxiosInstance} from "./waas-axios-instance";
import {Ethereum} from "./eth";
import {AuthenticationError, NotFoundError, GeneralError, ConflictError} from "./errors";
import * as t from "typeforce";

const debug = Debug("waas-js-sdk:main");

export enum WalletVersion {
    LATEST = "latest",
}

export enum WalletSecurity {
    SOFTWARE = "software",
    HSM = "hsm",
}

export enum EthereumPublicNetwork {
    MAINNET = "mainnet",
    ROPSTEN = "ropsten",
}

export enum EthereumTxSpeed {
    DEFAULT = "default",
    FAST = "fast",
    SLOW = "slow",
    NONE = "none",
}

export enum BitcoinNetwork {
    BITCOIN = "bitcoin",
    TESTNET = "testnet",
}

export enum BitcoinTxConfirmations {
    NONE = "none",
    DEFAULT = "default",
    SECURE = "secure",
}

export enum BitcoinTxSpeed {
    SLOW = "slow",
    DEFAULT = "default",
    FAST = "fast",
}

interface IWaaSOptions {
    clientId: string;
    clientSecret: string;
    subscription: string;
    vaultUrl?: string;
    ethereumNetwork?: EthereumPublicNetwork | string;
    ethereumTxSpeed?: EthereumTxSpeed;
    bitcoinNetwork?: BitcoinNetwork;
    bitcoinTxConfirmations?: BitcoinTxConfirmations;
    bitcoinTxSpeed?: BitcoinTxSpeed;
    bitcoinMaxFeeRate?: number;
}

/**
 * Instantiates a new API interface. Multiple instances with different settings can run in parallel
 * @param options - api options
 * @param options.clientId - Subscription client id
 * @param options.clientSecret - Subscription client secret
 * @param options.subscription - Subscription code
 * @param options.vaultUrl - Tangany vault url
 * @param options.ethereumNetwork - Public Ethereum network name (@see https://tangany.docs.stoplight.io/api/models/ethereum-public-network) or private Ethereum network url (@see https://tangany.docs.stoplight.io/api/models/ethereum-private-network)
 * @param options.ethereumTxSpeed - Amount of additional gas fee that is added to the base gas fee for the given Ethereum network to speed up the mining process of the transaction
 * @param options.bitcoinNetwork - Public Bitcoin network name (@see https://tangany.docs.stoplight.io/api/models/bitcoin-network)
 * @param options.bitcoinTxConfirmations - Amount of block confirmations required for Bitcoin balance outputs to be included in the total wallet balance calculation
 * @param options.bitcoinTxSpeed - Target amount of block confirmations for the transaction to be included to the Bitcoin network
 * @param options.bitcoinMaxFeeRate - Maximum allowed fee rate in satoshi per byte for a Bitcoin transaction
 */
export class WaasApi extends WaasAxiosInstance {

    constructor(options: IWaaSOptions) {

        if (!options.clientId) {
            throw new AuthenticationError("Missing variable 'clientId'");
        }
        if (!options.clientSecret) {
            throw new AuthenticationError("Missing variable 'clientSecret'");
        }
        if (!options.subscription) {
            throw new AuthenticationError("Missing variable 'subscription'");
        }

        t({
            clientId: "String",
            clientSecret: "String",
            subscription: "String",
            vaultUrl: "?String",
            ethereumNetwork: "?String",
            ethereumTxSpeed: "?String",
            bitcoinNetwork: "?String",
            bitcoinTxSpeed: "?String",
            bitcoinTxConfirmations: "?String",
            bitcoinMaxFeeRate: "?Number",
        }, options, true);

        const api: AxiosRequestConfig = {
            baseURL: "http://localhost:7071",
            timeout: 20000,
            headers: {
                "tangany-client-id": options.clientId,
                "tangany-client-secret": options.clientSecret,
                "tangany-subscription": options.subscription,
                "common": {
                    Accept: "application/json",
                },
            },
            responseType: "json",
        };

        if (options.vaultUrl) {
            api.headers["tangany-vault-url"] = options.vaultUrl;
        }
        if (options.ethereumNetwork) {
            api.headers["tangany-ethereum-network"] = options.ethereumNetwork;
        }
        if (options.ethereumTxSpeed) {
            api.headers["tangany-ethereum-tx-speed"] = options.ethereumTxSpeed;
        }
        if (options.bitcoinNetwork) {
            api.headers["tangany-bitcoin-network"] = options.bitcoinNetwork;
        }
        if (options.bitcoinTxSpeed) {
            api.headers["tangany-bitcoin-tx-speed"] = options.bitcoinTxSpeed;
        }
        if (options.bitcoinTxConfirmations) {
            api.headers["tangany-bitcoin-tx-confirmations"] = options.bitcoinTxConfirmations;
        }
        if (options.bitcoinMaxFeeRate) {
            api.headers["tangany-bitcoin-max-fee-rate"] = options.bitcoinMaxFeeRate;
        }

        const instance = axios.create(api);

        instance.interceptors.response.use((response: AxiosResponse) => {
            debug("interceptors.response", response);

            return response;
        }, async (e: AxiosError) => {
            if (e.response) {
                debug("interceptors.response.error", e.response.status, e.response.data);

                switch (e.response.status) {
                    case 401:
                        throw new AuthenticationError(e.response.data.message);
                    case 409:
                        throw new ConflictError(e.response.data.message);
                    case 404:
                        throw new NotFoundError(e.response.data.message);
                    default:
                        throw new GeneralError(e.response.data, e.response.status);
                }

            }

            throw e;
        });

        super(instance);
    }

    /**
     * Exposes the preconfigured AxiosInstance for arbitary api calls
     */
    public get axios() {
        return this.instance;
    }

    /**
     * read wallet based api calls
     * @param [name] - wallet name
     */
    public wallet(name?: string): Wallet {
        return new Wallet(this.axios, name);
    }

    /**
     * read eth based api calls
     * @param [txHash] - Ethereum transaction hash
     */
    public eth(txHash?: string): Ethereum {
        return new Ethereum(this.axios, txHash);
    }

    /**
     * read eth based api calls
     * @param [txHash] - Ethereum transaction hash
     */
    public btc(txHash?: string): Bitcoin {
        return new Bitcoin(this.instance, txHash);
    }
}
