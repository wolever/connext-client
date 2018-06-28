import { BigNumber } from "bignumber.js";

export = Connext;

declare class Connext {
  constructor(opts: Connext.ConnextOptions);

  register(initialDeposit: BigNumber): Promise<any>;

  deposit(amount: BigNumber): Promise<any>;

  withdraw(): Promise<any>;

  withdrawFinal(): Promise<any>;

  checkpoint(): Promise<any>;

  openChannel(opts: Connext.OpenChannelOptions): Promise<any>;

  joinChannel(channelId: string): Promise<any>;

  updateBalance(opts: Connext.UpdateBalanceOptions): Promise<any>;

  cosignBalanceUpdate(
    opts: Connext.CosignBalanceUpdateOptions
  ): Promise<string>;

  fastCloseChannel(channelId: string): Promise<any>;

  closeChannel(channelId: string): Promise<any>;

  closeChannels(channels: Connext.Channel[]): Promise<any>;

  static createLCStateUpdateFingerprint(
    opts: Connext.LcUpdateFingerprint
  ): string;

  static recoverSignerFromLCStateUpdate(opts: Connext.RecoverLcUpdate): string;

  static createVCStateUpdateFingerprint(
    opts: Connext.VcUpdateFingerprint
  ): string;

  static recoverSignerFromVCStateUpdate(opts: Connext.RecoverVcUpdate): string;
}

declare namespace Connext {
  export interface ConnextOptions {
    web3: any;
    ingridAddress: string;
    watcherUrl: string;
    ingridUrl: string;
    contractAddress: string;
  }

  export interface OpenChannelOptions {
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

  export interface LcUpdateFingerprint {
    isClose: boolean;
    lcId: string;
    nonce: number;
    openVcs: number;
    vcRootHash: string;
    partyA: string;
    partyI: string;
    balanceA: BigNumber;
    balanceI: BigNumber;
  }

  export interface RecoverLcUpdate extends LcUpdateFingerprint {
    sig: string;
  }

  export interface VcUpdateFingerprint {
    channelId: string;
    nonce: number;
    partyA: string;
    partyB: string;
    balanceA: BigNumber;
    balanceB: BigNumber;
  }

  export interface RecoverVcUpdate extends VcUpdateFingerprint {
    sig: string;
  }

  export interface Channel {
    channelId: string;
    balance: BigNumber;
  }
}
