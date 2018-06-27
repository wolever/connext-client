let axios = require('axios')

const channelManagerAbi = require('../artifacts/LedgerChannel.json')
const util = require('ethereumjs-util')
import Web3 from 'web3'
import validate from 'validate.js'
const MerkleTree = require('./helpers/MerkleTree')
const Utils = require('./helpers/utils')
const crypto = require('crypto')

// ***************************************
// ******* PARAMETER VALIDATION **********
// ***************************************
validate.validators.isBN = value => {
  if (Web3.utils.isBN(value)) {
    return null
  } else {
    return `${value} is not BN.`
  }
}

validate.validators.isHex = value => {
  if (Web3.utils.isHex(value)) {
    return null
  } else {
    return `${value} is not hex string.`
  }
}

validate.validators.isHexStrict = value => {
  // for ledgerIDs
  if (Web3.utils.isHexStrict(value)) {
    return null
  } else {
    return `${value} is not hex string prefixed with 0x.`
  }
}

validate.validators.isArray = value => {
  if (Array.isArray(value)) {
    return null
  } else {
    return `${value} is not an array.`
  }
}

validate.validators.isAddress = value => {
  if (Web3.utils.isAddress(value)) {
    return null
  } else {
    return `${value} is not address.`
  }
}

validate.validators.isBool = value => {
  if (typeof value === typeof true) {
    return null
  } else {
    return `${value} is not a boolean.`
  }
}

validate.validators.isPositiveInt = value => {
  if (value >= 0) {
    return null
  } else {
    return `${value} is not a positive integer.`
  }
}

// const logger = (arrayOfValidatorReturns) => arrayOfValidatorReturns.map((()console.log)

/**
 *
 * Class representing an instance of a Connext client.
 */
class Connext {
  /**
   *
   * Create an instance of the Connext client.
   *
   * @constructor
   * @example
   * const Connext = require('connext')
   * const connext = new Connext(web3)
   * @param {Object} params - The constructor object.
   * @param {Web3} params.web3 - the web3 instance.
   * @param {String} params.ingridAddress Eth address of intermediary (defaults to Connext hub).
   * @param {String} params.watcherUrl Url of watcher server (defaults to Connext hub).
   * @param {String} params.ingridUrl Url of intermediary server (defaults to Connext hub).
   * @param {String} params.contractAddress Address of deployed contract (defaults to latest deployed contract).
   * @param {String} params.hubAuth - token authorizing client package to make requests to hub
   */
  constructor (
    {
      web3,
      ingridAddress = '',
      watcherUrl = '',
      ingridUrl = '',
      contractAddress = '',
      hubAuth = 's%3AE_xMockGuJVqvIFRbP0RCXOYH5SRGHOe.zgEpYQg2KnkoFsdeD1CzAMLsu%2BmHET3FINdfZgw9xhs'
    },
    web3Lib = Web3
  ) {
    this.web3 = new web3Lib(web3.currentProvider) // convert legacy web3 0.x to 1.x
    this.ingridAddress = ingridAddress.toLowerCase()
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.channelManagerInstance = new this.web3.eth.Contract(
      channelManagerAbi.abi,
      contractAddress
    )
    this.config = {
      headers: {
        Cookie: `hub.sid=${hubAuth};`,
        Authorization: `Bearer ${hubAuth}`
      },
      withAuth: true
    }
    this.axiosInstance = axios.create({
      baseURL: ingridUrl,
      headers: {
        Cookie: `hub.sid=${hubAuth};`,
        Authorization: `Bearer ${hubAuth}`
      }
    })
  }


  // ***************************************
  // *********** HAPPY CASE FNS ************
  // ***************************************

  /**
   * Opens a ledger channel with ingridAddress and bonds initialDeposit. Ledger channel challenge timer is determined by Ingrid.
   *
   * Uses web3 to call openLC function on the contract, and pings Ingrid with opening signature and initial deposit.
   *
   * Ingrid should verify the signature and call "joinChannel" on the contract.
   *
   * If Ingrid is unresponsive, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds, or the client can call the contract function directly.
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.register(deposit)
   *
   * @param {BigNumber} initialDeposit deposit in wei
   * @returns {String} result of calling openLedgerChannel on the channelManager instance.
   */
  async register (initialDeposit) {
    // validate params
    const methodName = 'register'
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
    )
    // get challenge timer from ingrid
    const accounts = await this.web3.eth.getAccounts()
    const challenge = await this.getLedgerChannelChallengeTimer()
    // generate additional initial lc params
    const nonce = 0
    const openVcs = 0
    const lcId = Connext.getNewChannelId()
    const vcRootHash = Connext.generateVcRootHash({ vc0s: [] })
    let partyA
    if (process.env.DEV) {
      partyA = accounts[1]
    } else {
      partyA = accounts[0]
    }

    // /**
    //  * Descriptive error message back to wallet here
    //  *
    //  * Atomicity -- roll back to a previous state if there are inconsistencies here
    //  *
    //  * Return to a recoverable state based on block history
    //  *
    //  * Fail point so Ingrid can retry if join fails, make sure if ingrid cant join, the funds are recoverable.
    //  */
    const contractResult = await this.createLedgerChannelContractHandler({
      lcId,
      challenge,
      initialDeposit,
      sender: partyA
    })
    if (contractResult.transactionHash) {
      console.log('tx hash:', contractResult.transactionHash)
    } else {
      throw new Error(`[${methodName}] transaction was not successfully mined.`)
    }
    return lcId
  }

  /**
   * Adds a deposit to an existing ledger channel. Calls contract function "deposit".
   *
   * Can be used by either party in a ledger channel.
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.deposit(deposit)
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    // validate params
    const methodName = 'deposit'
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
    )
    // call contract handler
    const result = await this.depositContractHandler({ depositInWei })
    return result
  }

   /**
   * Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
   *
   * If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit. This function is to be called by the "A" party in a unidirectional scheme.
   *
   * Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.
   *
   * This proposed LC update (termed VC0 throughout documentation) serves as the opening certificate for the virtual channel.
   *
   *
   * @example
   * const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
   * await connext.openChannel({ to: myFriendsAddress })
   *
   * @param {Object} params - The method object.
   * @param {String} params.to Wallet address to wallet for partyB in virtual channel
   * @param {BigNumber} params.deposit User deposit for VC, in wei. Optional.
   */
  // /**
  //  * add error handling for calling openChannel twice as a viewer or something
  //  *
  //  * should fail if you try calling openChannel if it doesnt let you
  //  *
  //  * validate the state update against lc is valid
  //  */
  async openChannel ({ to, deposit = null }) {
    // validate params
    const methodName = 'openChannel'
    const isAddress = { presence: true, isAddress: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(to, isAddress),
      methodName,
      'to'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(deposit, isBN),
        methodName,
        'deposit'
      )
    }
    const lcA = await this.getLcByPartyA()
    const lcIdB = await this.getLcId(to)
    // validate the subchannels exist
    if (lcIdB === null || lcA === null) {
      throw new Error(
        `[${methodName}] Missing one or more required subchannels for VC.`
      )
    }
    // generate initial vcstate
    const vcId = Connext.getNewChannelId()
    const vc0 = {
      vcId,
      nonce: 0,
      partyA: lcA.partyA,
      partyB: to.toLowerCase(),
      balanceA: deposit || Web3.utils.toBN(lcA.balanceA),
      balanceB: Web3.utils.toBN(0),
      signer: lcA.partyA
    }
    const sigVC0 = await this.createVCStateUpdate(vc0)

    // ping ingrid
    const result = await this.openVc({
      channelId: vcId,
      partyA: lcA.partyA,
      partyB: to.toLowerCase(),
      partyI: this.ingridAddress,
      balanceA: deposit || Web3.utils.toBN(lcA.balanceA),
      subchanAtoI: lcA.channelId,
      subchanBtoI: lcIdB,
      sig: sigVC0
    })
    return result
  }

  /**
   * Joins channel by channelId with a deposit of 0 (unidirectional channels).
   *
   * This function is to be called by the "B" party in a unidirectional scheme.
   * Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.
   *
   * @example
   * const channelId = 10 // accessed by getChannelId method
   * await connext.joinChannel(channelId)
   * @param {String} channelId - ID of the virtual channel.
   */
  async joinChannel (channelId) {
    // validate params
    const methodName = 'joinChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    // get channel
    const vc = await this.getChannelById(channelId)
    const vc0 = {
      vcId: channelId,
      nonce: 0,
      partyA: vc.partyA, // depending on ingrid for this value
      partyB: vc.partyB,
      partyI: vc.partyI,
      balanceA: Web3.utils.toBN(vc.balanceA), // depending on ingrid for this value
      balanceB: Web3.utils.toBN(0),
      signer: vc.partyA
    }
    const sig = await this.createVCStateUpdate(vc0)
    // add vc0 to initial states
    let vc0s = await this.getVcInitialStates(vc.subchanBtoI)
    vc0s.push(vc0)
    // ping ingrid with vc0 (hub decomposes to lc)
    const result = await this.joinVcHandler({
      sig: sig,
      channelId
    })
    return result
  }

  /**
   * Updates channel balance by provided ID.
   *
   * In the unidirectional scheme, this function is called by the "A" party only.
   * Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.
   *
   * @example
   * await connext.updateBalance({
   *   channelId: 10,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - The method object.
   * @param {HexString} params.channelId ID of channel.
   * @param {BigNumber} params.balanceA Channel balance in Wei (of "A" party).
   * @param {BigNumber} params.balanceB Channel balance in Wei (of "B" party)
   * @returns {String} Returns signature of balance update.
   */
  async updateBalance ({ channelId, balanceA, balanceB }) {
    // validate params
    const methodName = 'updateBalance'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceB'
    )
    // get the vc
    const vc = await this.getChannelById(channelId)
    // generate new state update
    const state = {
      vcId: channelId,
      nonce: vc.nonce + 1,
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: balanceA,
      balanceB: balanceB,
      signer: vc.partyA
    }
    const sig = await this.createVCStateUpdate(state)
    // post signed update to watcher
    const response = await this.vcStateUpdateHandler({
      channelId,
      sig,
      balanceA,
      balanceB,
      nonce: vc.nonce + 1
    })
    return response
  }

  /**
   * Closes specified channel using latest double signed update.
   *
   * Requests Ingrid to decompose into LC update based on latest double signed virtual channel state.
   *
   * @example
   * await connext.fastCloseChannel(10)
   * @param {String} channelId - virtual channel ID
   */
  async fastCloseChannel (channelId) {
    // validate params
    const methodName = 'fastCloseChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const accounts = await this.web3.eth.getAccounts()
    // get latest double signed updates
    const vc = await this.getChannelById(channelId)
    if (vc.partyI !== accounts[0].toLowerCase() && // for dev testing
      vc.partyA !== accounts[0].toLowerCase() &&
      vc.partyB !== accounts[0].toLowerCase()
    ) {
      throw new Error(`[${methodName}] Not your virtual channel.`)
    }

    // have ingrid decompose since this is the happy case closing
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/close`
    )
    return response.data
    // NOTE: client doesnt sign lc update, it is just generated
  }


  // ***************************************
  // ************* DISPUTE FNS *************
  // ***************************************

  /**
   * Withdraws bonded funds from ledger channel with ingrid.
   * All virtual channels must be closed before a ledger channel can be closed.
   *
   * Generates the state update from the latest ingrid signed state with fast-close flag.
   * Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.
   *
   * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
   *
   * @example
   * const success = await connext.withdraw()
   * @returns {boolean} Returns true if successfully withdrawn, false if challenge process commences.
   * @returns {String} Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.
   */
  async withdraw () {
    const lcId = await this.getLcId()
    const lc = await this.getLcById(lcId)
    const lcState = await this.getLatestLedgerStateUpdate(lcId)
    if (Number(lcState.openVcs) !== 0) {
      throw new Error(
        `LC id ${lcId} still has open virtual channels. Number: ${lcState.openVcs}`
      )
    }
    if (lcState.vcRootHash !== Web3.utils.padRight('0x0', 64)) {
      throw new Error(
        `vcRootHash for lcId ${lcId} does not match empty root hash. Value: ${lcState.vcRootHash}`
      )
    }

    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: lcState.sigI,
      isClose: false,
      lcId,
      nonce: lcState.nonce,
      openVcs: lcState.openVcs,
      vcRootHash: lcState.vcRootHash,
      partyA: lc.partyA,
      partyI: this.ingridAddress,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI)
    })
    if (signer !== this.ingridAddress) {
      throw new Error(`[${methodName}] Ingrid did not sign this state update.`)
    }
    // generate same update with fast close flag and post
    const sigParams = {
      isClose: true,
      lcId,
      nonce: lcState.nonce,
      openVcs: lcState.openVcs,
      vcRootHash: lcState.vcRootHash,
      partyA: lc.partyA,
      partyI: this.ingridAddress,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI),
      signer: lcState.partyA
    }
    const sig = await this.createLCStateUpdate(sigParams)
    const sigI = await this.fastCloseLcHandler({ sig, lcId })
    let response
    if (sigI) {
      // call consensus close channel
      response = await this.consensusCloseChannelContractHandler({
        lcId,
        nonce: lcState.nonce,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI),
        sigA: sig,
        sigI: sigI,
        sender: lcA.partyA
      })
    } else {
      // call updateLCState
      response = await this.updateLcStateContractHandler({
        // challenge flag..?
        lcId,
        nonce: lcState.nonce,
        openVcs: lcState.openVcs,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI),
        vcRootHash: lcState.vcRootHash,
        sigA: sig,
        sigI: lcState.sigI,
        sender: lcState.partyA
      })
    }
    return response
  }

  /**
   * Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.
   *
   * Looks up LC by the account address of the client-side user.
   *
   * Calls the "byzantineCloseChannel" function on the contract.
   *
   * @example
   * const success = await connext.withdraw()
   * if (!success) {
   *   // wait out challenge timer
   *   await connext.withdrawFinal()
   * }
   *
   */
  async withdrawFinal () {
    const methodName = 'withdrawFinal'
    const lc = await this.getLcByPartyA()
    if (lc.openVcs > 0) {
      throw new Error(`[${methodName}] Close open VCs before withdraw final.`)
    }
    // to do: dependent on lc status
    if (!lc.isSettling) {
      throw new Error('Ledger channel is not in settlement state.')
    }
    const results = await this.byzantineCloseChannelContractHandler({
      lcId: lc.channelId,
      sender: lc.partyA
    })
    return results
  }

  /**
   * Sync signed state updates with chain.
   *
   * Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.
   *
   * @example
   * await connext.checkpoint()
   */
  async checkpoint () {
    // get latest ingrid signed state update
    const lcId = await this.getLcId()
    const lcState = await this.getLatestLedgerStateUpdate(lcId)
    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: lcState.sigI,
      isClose: false,
      lcId,
      nonce: lcState.nonce,
      openVcs: lcState.openVcs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI)
    })
    if (signer !== this.ingridAddress.toLowerCase()) {
      throw new Error(`[${methodName}] Hub did not sign this state update.`)
    }
    const sig = await this.createLCStateUpdate({
      lcId,
      nonce: lcState.nonce,
      openVcs: lcState.openVcs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI),
      signer: lcState.partyA
    })
    const result = await this.updateLcStateContractHandler({
      lcId,
      nonce: lcState.nonce,
      openVcs: lcState.openVcs,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI),
      vcRootHash: lcState.vcRootHash,
      sigA: sig,
      sigI: lcState.sigI,
      sender: lcState.partyA
    })

    return result
  }

  /**
   * Closes a channel in a dispute.
   *
   * Retrieves decomposed LC updates from Ingrid, and countersigns updates if needed (i.e. if they are recieving funds).
   *
   * Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.
   *
   * @example
   * await connext.closeChannel({
   *   channelId: 0xadsf11..,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - Object containing { vcId, balance }
   * @param {Number} params.channelId Virtual channel ID to close.
   */
  async closeChannel (channelId) {
    // validate params
    const methodName = 'closeChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )

    // get decomposed lc updates from ingrid
    const subchan = await this.getLcId()
    // ping ingrid for decomposed updates
    // if doesnt respond, then settleVC for all VCIDs in LC
    let lcStates = await this.getDecomposedLcStates(channelId)
    // the lc update for this subchan should be signed by ingrid
    // should you just call checkpoint to update the LC on chain with this?
    if (lcStates[subchan]) {
      // const result = await this.checkpoint() // maybe just post update cosig to ingrid?
      // type casting, returns not as BN type so validation fails
      lcStates[subchan].balanceA = Web3.utils.toBN(lcStates[subchan].balanceA)
      lcStates[subchan].balanceI = Web3.utils.toBN(lcStates[subchan].balanceI)
      lcStates[subchan].signer = lcStates[subchan].partyA
      const sig = await this.createLCStateUpdate(lcStates[subchan])
      // post sig to ingrid
      const result = await this.axiosInstance.post(
        `${this.ingridUrl}/ledgerchannel/${subchan}/cosign`,
        {
          sig
        }
      )
      return result.data
    } else {
      // ingrid MIA, call settle vc on chain for each vcID
      // get initial states of VCs
      const result = await this.byzantineCloseVc(channelId)
      return result
    }
  }

  /**
   * Close many virtual channels
   *
   * @example
   * const channels = [
   *   {
   *     channelId: 0xasd310..,
   *     balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   *   },
   *   {
   *     channelId: 0xadsf11..,
   *     balance: web3.utils.toBN(web3.utils.toWei(0.2, 'ether'))
   *   }
   * ]
   * await connext.closeChannels(channels)
   * @param {Object[]} channels - Array of objects with {vcId, balance} to close
   * @param {String} channels.$.channelId Channel ID to close
   * @param {BigNumber} channels.$.balance Channel balance.
   */
  async closeChannels (channels) {
    const methodName = 'closeChannels'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(channels, isArray),
      methodName,
      'channels'
    )
    // should this try to fast close any of the channels?
    // or just immediately force close in dispute many channels
    channels.forEach(async channel => {
      // async ({ channelId, balance }) maybe?
      console.log('Closing channel:', channel.channelId)
      await this.closeChannel(channel.channelId)
      console.log('Channel closed.')
    })
  }

  /**
   * Cosigns the latest ingrid-signed ledger state update.
   * 
   * @param {Object} params
   * @param {String} params.lcId - ledger channel id
   * @param {Number} params.nonce - nonce of update you are cosigning
   */
  async cosignLCUpdate({ lcId, nonce }) {
    const methodName = 'closeChannels'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    let latestState = await this.getLatestLedgerStateUpdate()
    if (latestState.nonce !== nonce) {
      throw new Error('Latest state nonce is not the nonce you wanted to close with.')
    }
    latestState.signer = latestState.partyA
    const sigA = await this.createLCStateUpdate(latestState)
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/ledgerchannel/${lcId}/update/${nonce}/cosign`,
      {
        sig: sigA
      }
    )
  }


  // ***************************************
  // *********** STATIC METHODS ************
  // ***************************************


  /**
   * Returns a new channel id that is a random hex string.
   *
   * @returns {String} a random 32 byte channel ID.
   */
  static getNewChannelId () {
    const buf = crypto.randomBytes(32)
    const channelId = Web3.utils.bytesToHex(buf)
    return channelId
  }

  static createLCStateUpdateFingerprint ({
    isClose,
    lcId,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    // validate params
    const methodName = 'createLCStateUpdateFingerprint'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )

    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bool', value: isClose },
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVcs },
      { type: 'bytes32', value: vcRootHash },
      { type: 'address', value: partyA }, // address will be returned bytepadded
      { type: 'address', value: partyI }, // address is returned bytepadded
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceI }
    )
    return hash
  }

  static recoverSignerFromLCStateUpdate ({
    sig,
    isClose,
    lcId,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    const methodName = 'recoverSignerFromLCStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )

    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )

    // generate fingerprint
    let fingerprint = Connext.createLCStateUpdateFingerprint({
      isClose,
      lcId,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
    })
    fingerprint = util.toBuffer(fingerprint)

    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

  static createVCStateUpdateFingerprint ({
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB
  }) {
    const methodName = 'createVCStateUpdateFingerprint'
    // typecast balances incase chained
    balanceA = Web3.utils.toBN(balanceA)
    balanceB = Web3.utils.toBN(balanceB)
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    const hubBond = balanceA.add(balanceB)

    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: vcId },
      { type: 'uint256', value: nonce },
      { type: 'address', value: partyA },
      { type: 'address', value: partyB },
      { type: 'uint256', value: hubBond },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceB }
    )
    return hash
  }

  static recoverSignerFromVCStateUpdate ({
    sig,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB
  }) {
    const methodName = 'recoverSignerFromVCStateUpdate'
    // validate
    // typecast balances incase chained
    balanceA = Web3.utils.toBN(balanceA)
    balanceB = Web3.utils.toBN(balanceB)
    // validatorOpts'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }

    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )

    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )

    let fingerprint = Connext.createVCStateUpdateFingerprint({
      vcId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB
    })
    fingerprint = util.toBuffer(fingerprint)
    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

  // ***************************************
  // ********** SIGNATURE METHODS **********
  // ***************************************


  async createLCStateUpdate ({
    isClose = false, // default isnt close LC
    lcId,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI = this.ingridAddress, // default to ingrid
    balanceA,
    balanceI,
    unlockedAccountPresent = process.env.DEV ? process.env.DEV : false, // true if hub or ingrid, dev needs unsigned
    signer = null
  }) {
    const methodName = 'createLCStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )

    // TO DO:
    // additional validation to only allow clients to call correct state updates

    // generate sig
    const accounts = await this.web3.eth.getAccounts()
    // personal sign?
    const hash = Connext.createLCStateUpdateFingerprint({
      isClose,
      lcId,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
    })
    let sig
    if (signer && unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, signer)
    } else if (signer) {
      sig = await this.web3.eth.personal.sign(hash, signer)
    } else if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  async createVCStateUpdate ({
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    unlockedAccountPresent = process.env.DEV ? process.env.DEV : false,
    signer = null // if true, use sign over personal.sign. dev needs true
  }) {
    // validate
    const methodName = 'createVCStateUpdate'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }

    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )

    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    // get accounts
    const accounts = await this.web3.eth.getAccounts()
    // generate and sign hash
    const hash = Connext.createVCStateUpdateFingerprint({
      vcId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB
    })
    let sig
    if (signer && unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, signer)
    } else if (signer) {
      sig = await this.web3.eth.personal.sign(hash, signer)
    } else if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  // vc0 is array of all existing vc0 sigs for open vcs
  static generateVcRootHash ({ vc0s }) {
    const methodName = 'generateVcRootHash'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(vc0s, isArray),
      methodName,
      'vc0s'
    )
    const emptyRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
    let vcRootHash
    let elems = []
    if (vc0s.length === 0) {
      // reset to initial value -- no open VCs
      vcRootHash = emptyRootHash
    } else {
      const merkle = Connext.generateMerkleTree(vc0s)
      vcRootHash = Utils.bufferToHex(merkle.getRoot())
    }

    return vcRootHash
  }

  static generateMerkleTree (vc0s) {
    const methodName = 'generateVcRootHash'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(vc0s, isArray),
      methodName,
      'vc0s'
    )
    if (vc0s.length === 0) {
      throw new Error('Cannot create a Merkle tree with 0 leaves.')
    }
    const emptyRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
    let merkle
    let elems = vc0s.map(vc0 => {
      // vc0 is the initial state of each vc
      // hash each initial state and convert hash to buffer
      const hash = Connext.createVCStateUpdateFingerprint(vc0)
      const vcBuf = Utils.hexToBuffer(hash)
      return vcBuf
    })
    if (elems.length % 2 !== 0) {
      // cant have odd number of leaves
      elems.push(Utils.hexToBuffer(emptyRootHash))
    }
    merkle = new MerkleTree.default(elems)

    return merkle
  }

  // HELPER FUNCTIONS

  // ***************************************
  // ******** CONTRACT HANDLERS ************
  // ***************************************


  async createLedgerChannelContractHandler ({
    ingridAddress = this.ingridAddress,
    lcId,
    initialDeposit,
    challenge,
    sender = null
  }) {
    const methodName = 'createLedgerChannelContractHandler'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(ingridAddress, isAddress),
      methodName,
      'ingridAddress'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(challenge, isPositiveInt),
      methodName,
      'challenge'
    )
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    
    const result = await this.channelManagerInstance.methods
      .createChannel(lcId, ingridAddress, challenge)
      .send(
        // in contract yet?
        // challenge,
      {
        from: sender,
        value: initialDeposit,
        gas: 3000000 // NOT GREAT
      }
      )
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] createChannel transaction failed.`)
    }
    return result
  }

  async LCOpenTimeoutContractHandler ({lcId, sender = null}) {
    const methodName = 'LCOpenTimeoutContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    const result = await this.channelManagerInstance.methods
      .LCOpenTimeout(lcId)
      .send({
        from: sender,
        gas: 470000
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] LCOpenTimeout transaction failed.`)
    }
    return result
  }

  async depositContractHandler ({ depositInWei, recipient = null, sender = null }) {
    const methodName = 'depositContractHandler'
    // validate
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
    )
    const accounts = await this.web3.eth.getAccounts()
    if (recipient) {
      Connext.validatorsResponseToError(
        validate.single(recipient, isAddress),
        methodName,
        'recipient'
      )
    } else {
      // unspecified, defaults to active account
      recipient = accounts[0]
    }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      sender = accounts[0]
    }

    // find ledger channel by mine and ingrids address
    const lcId = await this.getLcId()
    // call LC method
    const result = await this.channelManagerInstance.methods
      .deposit(
        lcId, // PARAM NOT IN CONTRACT YET, SHOULD BE
        recipient
      )
      .send({
        from: sender,
        value: depositInWei
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] deposit transaction failed.`)
    }
    return result
  }

  async consensusCloseChannelContractHandler ({
    lcId,
    nonce,
    balanceA,
    balanceI,
    sigA,
    sigI,
    sender = null
  }) {
    const methodName = 'consensusCloseChannelContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigI, isHex),
      methodName,
      'sigI'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    const result = await this.channelManagerInstance.methods
      .consensusCloseChannel(lcId, nonce, balanceA, balanceI, sigA, sigI)
      // .consensusCloseChannel(lcId, nonce, balances, sigA)
      .send({
        from: sender,
        gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(
        `[${methodName}] consensusCloseChannel transaction failed.`
      )
    }
    return result
  }

  // default null means join with 0 deposit
  async joinLedgerChannelContractHandler ({ lcId, deposit = null, sender }) {
    const methodName = 'joinLedgerChannelContractHandler'
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(deposit, isBN),
        methodName,
        'deposit'
      )
    } else {
      deposit = Web3.utils.toBN('0')
    }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    }
    const result = await this.channelManagerInstance.methods
      .joinChannel(lcId)
      .send({
        from: sender ? sender : this.ingridAddress, // can also be accounts[0], easier for testing
        value: deposit,
        gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] joinLedgerChannel transaction failed.`)
    }
    return result
  }

  async updateLcStateContractHandler ({
    lcId,
    nonce,
    openVcs,
    balanceA,
    balanceI,
    vcRootHash,
    sigA,
    sigI,
    sender = null
  }) {
    const methodName = 'updateLcStateContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigI, isHex),
      methodName,
      'sigI'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    const result = await this.channelManagerInstance.methods
      .updateLCstate(
        lcId,
        [ nonce, openVcs, balanceA, balanceI ],
        Web3.utils.padRight(vcRootHash, 64),
        sigA,
        sigI
      )
      .send({
        from: sender,
        gas: 4700000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] updateLCstate transaction failed.`)
    }
    return result
  }

  async initVcStateContractHandler ({
    subchanId,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sender = null
  }) {
    const methodName = 'initVcStateContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    // generate proof from lc
    const stateHash = Connext.createVCStateUpdateFingerprint({
      vcId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB
    })
    const vc0s = await this.getVcInitialStates(subchanId)
    const vcRootHash = Connext.generateVcRootHash({ vc0s })
    let merkle = Connext.generateMerkleTree(vc0s)
    let mproof = merkle.proof(vcRootHash)

    let proof = []
    for(var i=0; i<mproof.length; i++){
      proof.push(Utils.bufferToHex(mproof[i]))
    }

    proof.unshift(stateHash)

    proof = Utils.marshallState(proof)

    const results = await this.channelManagerInstance.methods
      .initVCstate(
        subchanId,
        vcId,
        proof,
        nonce,
        partyA,
        partyB,
        balanceA,
        balanceB,
        sigA
      )
      .send({
        from: sender,
        gas: 4700000
      })
    // if (!results.transactionHash) {
    //   throw new Error(`[${methodName}] initVCState transaction failed.`)
    // }
    return results
  }

  async settleVcContractHandler ({
    subchanId,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sender = null
  }) {
    const methodName = 'settleVcContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    const results = await this.channelManagerInstance.methods
      .settleVC(
        subchanId,
        vcId,
        nonce,
        partyA,
        partyB,
        balanceA,
        balanceB,
        sigA
      )
      .send({
        from: sender,
        gas: 4700000
      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] settleVC transaction failed.`)
    }
    return results
  }

  async closeVirtualChannelContractHandler ({ lcId, vcId, sender = null }) {
    const methodName = 'closeVirtualChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    const results = await this.channelManagerInstance.methods
      .closeVirtualChannel(lcId, vcId)
      .send({
        from: sender
      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] transaction failed.`)
    }
    return results
  }

  async byzantineCloseChannelContractHandler ({lcId, sender = null }) {
    const methodName = 'byzantineCloseChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
        const results = await this.channelManagerInstance.methods
      .byzantineCloseChannel(lcId)
      .send({
        from: sender
      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] transaction failed.`)
    }
    return results
  }

  // ***************************************
  // ********** ERROR HELPERS **************
  // ***************************************

  static validatorsResponseToError (validatorResponse, methodName, varName) {
    if (validatorResponse !== undefined) {
      const errorMessage = `[${methodName}][${varName}] : ${validatorResponse}`
      throw new Error(errorMessage)
    }
  }

  static hubsResponseToError (errorResponse, methodName, parameters = null) {
    if (errorResponse !== undefined) {
      const errorMessage = parameters
        ? `[${methodName}] failed with parameters ${JSON.stringify(parameters)}. Status: ${errorResponse.response.status}. Url: ${errorResponse.config.url}. Response: ${errorResponse.response.data}`
        : `[${methodName}] failed. Status: ${errorResponse.response.status}. Url: ${errorResponse.config.url}. Response: ${errorResponse.response.data}`
      throw new Error(errorMessage)
    }
  }


  // ***************************************
  // *********** INGRID GETTERS ************
  // ***************************************

  /**
   * Returns the latest ingrid-signed ledger state update.
   *
   * @example
   * // returns highest nonce ledger channel state update
   * const lcId = await connext.getLcId()
   * const lcState = await connext.getLatestLedgerStateUpdate(lcId)
   *
   *
   * @param {HexString} ledgerChannelId
   * @returns {Object} containing the latest signed state update for the ledger channel. May or may not be double signed.
   */
  async getLatestLedgerStateUpdate (ledgerChannelId) {
    // lcState == latest ingrid signed state
    const methodName = 'getLatestLedgerStateUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(ledgerChannelId, isHexStrict),
      methodName,
      'ledgerChannelId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/ledgerchannel/${ledgerChannelId}/update/latest/sig[]=sigI`
    )
    return response.data
  }

  /**
   * Returns the ledger channel id between the supplied address and ingrid.
   *
   * If no address is supplied, accounts[0] is used as partyA.
   *
   * @param {String} partyA - address of the partyA in the channel with Ingrid.
   */
  async getLcId (partyA = null) {
    const methodName = 'getLcId'
    const isAddress = { presence: true, isAddress: true }
    if (partyA) {
      Connext.validatorsResponseToError(
        validate.single(partyA, isAddress),
        methodName,
        'partyA'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      if (process.env.DEV) {
        partyA = accounts[1]
      } else {
        partyA = accounts[0]
      }
    }
    // get my LC with ingrid
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/ledgerchannel/a/${partyA.toLowerCase()}` 
    )
    return response.data.channelId
  }

  /**
   * Returns an object representing the virtual channel in the database.
   *
   * @param {String} channelId - the ID of the virtual channel
   */
  async getChannelById (channelId) {
    const methodName = 'getChannelById'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/virtualchannel/${channelId}`
    )
    return response.data
  }

  /**
   * Returns an object representing the virtual channel in the database.
   *
   * @param {String} channelId - the ID of the virtual channel
   */
  async getChannelByParties ({ partyA, partyB }) {
    const methodName = 'getChannelByParties'
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/virtualchannel/a/${partyA}/b/${partyB}`
    )
    return response.data
  }

  /**
   * Returns the ledger channel id for partyB in the virtual channel.
   *
   *
   * @param {String} vcId - the virtual channel id
   */
  async getOtherLcId (vcId) {
    const methodName = 'getOtherLcId'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    // get LC for other VC party and ingrid
    const vc = await this.getChannelById(vcId)
    return vc.subchanBI
  }

  /**
   * Returns an object representing a ledger channel.
   *
   * @param {String} lcId - the ledgerchannel id
   */
  async getLcById (lcId) {
    const methodName = 'getLcById'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/ledgerchannel/${lcId}`)
    return response.data
  }

  /**
   * Returns object representing the ledger channel between partyA and Ingrid
   *
   * @param {String} partyA - partyA in ledger channel. Default is accounts[0]
   * @returns {Object} Ledger channel object
   */
  async getLcByPartyA (partyA = null) {
    const methodName = 'getLcByPartyA'
    const isAddress = { presence: true, isAddress: true }
    if (partyA !== null) {
      Connext.validatorsResponseToError(
        validate.single(partyA, isAddress),
        methodName,
        'partyA'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      if (process.env.DEV) {
        partyA = accounts[1]
      } else {
        partyA = accounts[0]
      }
    }
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/ledgerchannel/a/${partyA.toLowerCase()}`    
    )
    return response.data
  }

  /**
   * Returns the default ledger channel challenge period from ingrid.
   *
   * Challenge timers are used when constructing an LC.
   *
   */
  async getLedgerChannelChallengeTimer () {
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/ledgerchannel/challenge`
    )
    return response.data.challenge
  }

  /**
   * Returns the latest double signed virtual channel state as an object.
   *
   * Signatures from both parties are included as fields in that object.
   *
   * @param {String} channelId - ID of the virtual channel
   * @returns {Object} representing the latest double signed virtual channel state.
   */
  async getLatestVCStateUpdate (channelId) {
    // validate params
    const methodName = 'getLatestVCStateUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/virtualchannel/${channelId}/update/doublesigned`,
    )
    return response.data
  }

  /**
   * Returns a list of initial vc state objects that correspond to the open VCs for this ledger channel.
   *
   * These initial states are used when generating the vcRootHash for ledger channel updates.
   * @param {String} lcId - ledger channel ID
   */
  async getVcInitialStates (lcId) {
    // validate params
    const methodName = 'getVcInitialStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/ledgerchannel/${lcId}/vcinitialstates`
    )
    return response.data
  }

  /**
   * Returns an object representing the initial state of the virtual channel when it was opened.
   *
   * @param {String} vcId the virtual channel id
   */
  async getVcInitialState (vcId) {
    // validate params
    const methodName = 'getVcInitialState'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/virtualchannel/${vcId}/intialstate`
    )
    return response.data
  }

  async getDecomposedLcStates (vcId) {
    // validate params
    const methodName = 'getDecomposedLcStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await this.axiosInstance.get(
      `${this.ingridUrl}/virtualchannel/${vcId}/decompose`
    )
    return response.data
  }

  // ***************************************
  // *********** INGRID HELPERS ************
  // ***************************************

  // posts signature of lc0 to ingrid
  // requests to open a ledger channel with the hub
  // async requestJoinLc ({ lcId, sig, balanceA }) {
  async requestJoinLc(lcId) {
    // validate params
    const methodName = 'requestJoinLc'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    try {
      const response = await this.axiosInstance.post(
        `${this.ingridUrl}/ledgerchannel/${lcId}/request`)
      return response.data.txHash
    } catch (e) {
      return null
    }
  }

  // HELPER FUNCTION TO HAVE INGRID SET UP VC
  async openVc ({ channelId, partyA, partyB, partyI = this.ingridAddress, balanceA, subchanAtoI, subchanBtoI, sig }) {
    // validate params
    const methodName = 'openVc'
    const isAddress = { presence: true, isAddress: true }
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(subchanAtoI, isHexStrict),
      methodName,
      'subchanAtoI'
    )
    Connext.validatorsResponseToError(
      validate.single(subchanBtoI, isHexStrict),
      methodName,
      'subchanBtoI'
    )
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    // ingrid should add vc params to db
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/virtualchannel/`,
      { channelId, partyA, partyB, partyI, balanceA: balanceA.toString(), subchanAtoI, subchanBtoI, sig }
    )
    return response.data.channelId
  }

  // ingrid verifies the vc0s and sets up vc and countersigns lc updates
  async joinVcHandler ({ sig, channelId }) {
    // validate params
    const methodName = 'joinVcHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    // ingrid should verify vcS0A and vcS0b
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/join`,
      {
        sig
      }
    )
    return response.data.channelId
  }

  // posts to ingrid endpoint to decompose ledger channel
  // based on latest double signed update
  // should return ingrids signature on the closing lc update used in
  // consensusCloseChannel

  // as called in withdraw: requests ingrid cosigns final ledger update
  // if she cosigns, call consensus
  async fastCloseLcHandler ({ sig, lcId }) {
    // validate params
    const methodName = 'fastCloseLcHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/ledgerchannel/${lcId}/fastclose`,
      {
        sig
      }
    )
    return response.data
  }
  
  async vcStateUpdateHandler ({ channelId, sig, balanceA, balanceB, nonce }) {
    // validate params
    const methodName = 'vcStateUpdateHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isPositiveInt),
      methodName,
      'balanceB'
    )
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/update`,
      {
        sig,
        balanceA: balanceA.toString(),
        balanceB: balanceB.toString(),
        nonce
      }
    )
    return response.data
  }

  /**
   * Generates the decomposed ledger channel updates needed when closing a virtual channel.
   *
   * @param {Object} params
   * @param {String} params.sigA - signature of partyA on closing virtual channel state
   * @param {String} params.sigB - signature of partyB on closing virtual channel state
   * @param {String} params.vcId - virtual channel id
   * @param {Number} params.nonce - nonce of the virtual channel
   * @param {String} params.partyA - wallet address of partyA
   * @param {String} params.partyB - wallet address of partyB
   * @param {String} params.partyI - wallet address of Ingrid
   * @param {String} params.subchanAI - ledger channel id of the ledger channel between partyA and partyI
   * @param {String} params.subchanBI - ledger channel id of the ledger channel between partyB and partyI
   * @param {BigNumber} params.balanceA - balanceA in the virtual channel
   * @param {BigNumber} params.balanceB - balanceB in the virtual channel
   */
  async createDecomposedLcUpdates ({}) { }

  // settles all vcs on chain in the case of a dispute (used in close channel)
  // first calls init vc
  // then calls settleVc

  /// SHOULD WE JUST POST THIS DIRECTLY TO THE WATCHER URL FROM OUR PACKAGE

  // then posts to watcher (?) -- maybe just post all of this to the watcher url (?)
  /**
   * Settles all virtual channels on chain in the case of a displute (i.e. Ingrid doesn't return decomposed state updates in "closeChannel").
   *
   * First, calls "initVC" on the contract. If that transaction was successful, "settleVC" is called. Otherwise, returns the result of calling "initVC".
   *
   * @param {String} vcId - id of the virtual channel to close in dispute
   */
  async byzantineCloseVc (vcId) {
    // validate params
    const methodName = 'byzantineCloseVc'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const vc0 = await this.getVcInitialState(vcId)
    let subchan
    if (accounts[0] === vc0.partyA) {
      subchan = vc0.subchanAI
    } else if (accounts[0] == vc0.partyB) {
      subchan = vc0.subchanBI
    }
    const initResult = await this.initVcStateContractHandler({
      subchanId: subchan,
      vcId,
      partyA: vc0.partyA,
      partyB: vc0.partyB,
      balanceA: Web3.utils.toBN(vc0.balanceA),
      balanceB: Web3.utils.toBN(vc0.balanceB),
      sigA: vc0.sigA,
      nonce: vc0.nonce,
      sender: vc0.partyA
    })
    if (initResult) {
      const vcState = await this.getLatestVCStateUpdate(vcId)
      const settleResult = await this.settleVcContractHandler({
        subchanId: subchan,
        vcId,
        nonce: vcState.nonce,
        partyA: vcState.partyA,
        partyB: vcState.partyB,
        balanceA: Web3.utils.toBN(vcState.balanceA),
        balanceB: Web3.utils.toBN(vcState.balanceB),
        sigA: vcState.sigA,
        sender: vcState.partyA
      })
      return settleResult
    } else {
      return initResult
    }
  }

  /**
   * Sends a signed ledger channel update to the hub. Only updates balances, use other functions to update VC information.
   * 
   * @param {Object} params - input parameters
   * @param {String} params.sig - signature of partyA
   * @param {String} params.lcId - ledger channel Id you are updating
   * @param {BigNumber} params.balanceA - update balance of partyA
   * @param {BigNumber} params.balanceI - update balance of partyI
   */
  async sendLCStateBalanceUpdate ({ sig, lcId, balanceA, balanceI }) {
    // validate params
    const methodName = 'updateLCstate'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    const response = await this.axiosInstance.post(
      `${this.ingridUrl}/ledgerchannel/${lcId}/updatestate`, 
      {
        sig,
        balanceA,
        balanceI
      }
    )
    return response.data
  }
}

module.exports = Connext
