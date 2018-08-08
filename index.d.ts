import { BigNumber } from "bignumber.js";

export = Connext;

declare class Connext {
  constructor(opts: Connext.ConnextOptions);

  openChannel(initialDeposit: BigNumber): Promise<any>;

  deposit(amount: BigNumber): Promise<any>;

  withdraw(): Promise<any>;

  withdrawFinal(): Promise<any>;

  checkpoint(): Promise<any>;

  openThread(opts: Connext.openThreadOptions): Promise<any>;

  joinThread(channelId: string): Promise<any>;

  updateBalance(opts: Connext.UpdateBalanceOptions): Promise<any>;

  cosignBalanceUpdate(
    opts: Connext.CosignBalanceUpdateOptions
  ): Promise<string>;

  fastCloseChannel(channelId: string): Promise<any>;

  closeChannel(channelId: string): Promise<any>;

  closeChannels(channels: Connext.Channel[]): Promise<any>;

  static createLCStateUpdateFingerprint(opts: Connext.LcUpdate): string;

  static recoverSignerFromLCStateUpdate(opts: Connext.RecoverLcUpdate): string;

  static createVCStateUpdateFingerprint(opts: Connext.VcUpdate): string;

  static recoverSignerFromVCStateUpdate(opts: Connext.RecoverVcUpdate): string;

  static generateThreadRootHash(threadInitialStates: any): string;

  static generateMerkleTree(threadInitialStates: Connext.VcUpdate[]): string;
}

declare namespace Connext {
  export interface ConnextOptions {
    web3: any;
    ingridAddress: string;
    watcherUrl: string;
    ingridUrl: string;
    contractAddress: string;
  }

  export interface openThreadOptions {
    to: string;
    deposit: BigNumber;
  }

  export interface UpdateBalanceOptions {
    channelId: string;
    balanceA: BigNumber;
    balanceB: BigNumber;
  }

  export interface CosignBalanceUpdateOptions {
    channelId: string;
    balance: BigNumber;
    sig: string;
  }

  export interface LcUpdate {
    isClose: boolean;
    channelId: string;
    nonce: number;
    openVcs: number;
    vcRootHash: string;
    partyA: string;
    partyI: string;
    balanceA: BigNumber;
    balanceI: BigNumber;
  }

  export interface RecoverLcUpdate extends LcUpdate {
    sig: string;
  }

  export interface VcUpdate {
    channelId: string;
    nonce: number;
    partyA: string;
    partyB: string;
    balanceA: BigNumber;
    balanceB: BigNumber;
  }

  export interface RecoverVcUpdate extends VcUpdate {
    sig: string;
  }

  export interface ThreadInitialStates {
    threadInitialStates: VcUpdate[];
  }

  export interface Channel {
    channelId: string;
    balance: BigNumber;
  }
}
