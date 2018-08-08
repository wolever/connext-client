import { BigNumber } from "bignumber.js";

export = Connext;

declare class Connext {
  constructor(opts: Connext.ConnextOptions);

  openChannel(initialDeposit: BigNumber): Promise<any>;

  deposit(amount: BigNumber): Promise<any>;

  withdraw(): Promise<any>;

  withdrawFinal(): Promise<any>;

  checkpoint(): Promise<any>;

  openThread(opts: Connext.OpenThreadOptions): Promise<any>;

  joinThread(channelId: string): Promise<any>;

  updateBalance(opts: Connext.UpdateBalanceOptions): Promise<any>;

  cosignBalanceUpdate(
    opts: Connext.CosignBalanceUpdateOptions
  ): Promise<string>;

  fastCloseChannel(channelId: string): Promise<any>;

  closeChannel(channelId: string): Promise<any>;

  closeChannels(channels: Connext.Channel[]): Promise<any>;

  static createChannelStateUpdateFingerprint(opts: Connext.ChannelUpdate): string;

  static recoverSignerFromChannelStateUpdate(opts: Connext.RecoverChannelUpdate): string;

  static createThreadStateUpdateFingerprint(opts: Connext.ThreadUpdate): string;

  static recoverSignerFromThreadStateUpdate(opts: Connext.RecoverThreadUpdate): string;

  static generateThreadRootHash(threadInitialStates: any): string;

  static generateMerkleTree(threadInitialStates: Connext.ThreadUpdate[]): string;
}

declare namespace Connext {
  export interface ConnextOptions {
    web3: any;
    ingridAddress: string;
    watcherUrl: string;
    ingridUrl: string;
    contractAddress: string;
  }

  export interface OpenThreadOptions {
    to: string;
    deposit: BigNumber;
  }

  export interface BalanceOptions {
    tokenDeposit: BigNumber;
    ethDeposit: BigNumber;
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

  export interface ChannelUpdate {
    isClose: boolean;
    channelId: string;
    nonce: number;
    openVcs: number;
    vcRootHash: string;
    partyA: string;
    partyI: string;
    balanceA: BalanceOptions;
    balanceI: BalanceOptions;
  }

  export interface RecoverChannelUpdate {
    sig: string;
    isClose: boolean;
    channelId: string;
    nonce: number;
    openVcs: number;
    vcRootHash: string;
    partyA: string;
    partyI: string;
    ethBalanceA: BigNumber;
    ethBalanceI: BigNumber;
    tokenBalanceA: BigNumber;
    tokenBalanceI: BigNumber;
  }

  export interface ThreadUpdate {
    channelId: string;
    nonce: number;
    partyA: string;
    partyB: string;
    balanceA: BalanceOptions;
    balanceB: BalanceOptions;

  }

  export interface RecoverThreadUpdate {
    sig: string;
    ethBalanceA: BigNumber;
    ethBalanceI: BigNumber;
    tokenBalanceA: BigNumber;
    tokenBalanceI: BigNumber;
    ethBalanceA: BigNumber;
    ethBalanceB: BigNumber;
    tokenBalanceA: BigNumber;
    tokenBalanceB: BigNumber;
  }

  export interface ThreadInitialStates {
    threadInitialStates: ThreadUpdate[];
  }

  export interface Channel {
    channelId: string;
    balance: BigNumber;
  }
}
