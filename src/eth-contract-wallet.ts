import * as t from "typeforce";
import {BlockchainWallet} from "./blockchain-wallet";
import {IAsyncEthereumTransactionOutput, IContractMethod, IEthereumTransactionEstimation} from "./interfaces";
import {Request} from "./request";
import {Waas} from "./waas";
import {Wallet} from "./wallet"

/**
 * Instantiates a new interface to interact with universal Ethereum Smart Contracts
 * @param waas - {@link Waas} instance
 * @param id - Asynchronous request id
 */
export class EthContractWallet extends BlockchainWallet {

    constructor(waas: Waas, walletInstance: Wallet, public readonly address: string) {
        super(waas, walletInstance);
        t("String", address);
    }

    /**
     * Executes known methods of arbitrary Ethereum smart contracts
     * @param config - Smart Contract method configuration
     * @see [docs]{@link https://docs.tangany.com/#945c237f-5273-4e85-bf9d-1ba2b132df17}
     */
    public async sendAsync(config: IContractMethod): Promise<Request<IAsyncEthereumTransactionOutput>> {
        const rawResponse = await this.waas.wrap<{ statusUri: string }>(() => this.waas.instance
            .post(`eth/contract/${this.address}/${this.wallet}/send-async`, {
                ...config,
            }),
        );
        const id = this.extractRequestId(rawResponse);
        return new Request<IAsyncEthereumTransactionOutput>(this.waas, id);
    }

    /**
     * Returns the fee estimation for a smart contract execution with the given parameters.
     * The fee estimation is based on the current ethereum network utilization and can fluctuate in random fashion.
     * Thus the estimation cannot guarantee to match the actual transaction fee.
     * @param config - Smart contract method configuration
     */
    public async estimateFee(config: IContractMethod): Promise<IEthereumTransactionEstimation> {
        return this.waas.wrap<IEthereumTransactionEstimation>(() => this.waas.instance
            .post(`eth/contract/${this.address}/${this.wallet}/estimate-fee`, config));
    }

}
