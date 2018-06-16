const axios = require('axios')
const channelManagerAbi = require('../artifacts/ChannelManagerAbi.json')
const util = require('ethereumjs-util')
const Web3 = require('web3')
const validate = require('validate.js')
const Utils = require('../helpers/utils')
const crypto = require('crypto')

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
  // for ledgerIDs
  if (value.constructor === Array) {
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

validate.validators.isBooleanInt = value => {
  if (value == 0 || value == 1) {
    return null
  } else {
    return `${value} is not a boolean integer (0 or 1).`
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
   * @example
   * const Connext = require('connext')
   * const connext = new Connext(web3)
   * @param {Object} params - The constructor object.
   * @param {Web3} params.web3 - the web3 instance.
   * @param {String} params.ingridAddress Eth address of intermediary (defaults to Connext hub).
   * @param {String} params.watcherUrl Url of watcher server (defaults to Connext hub).
   * @param {String} params.ingridUrl Url of intermediary server (defaults to Connext hub).
   * @param {String} params.contractAddress Address of deployed contract (defaults to latest deployed contract).
   */
  constructor (
    {
      web3,
      ingridAddress = '',
      watcherUrl = '',
      ingridUrl = '',
      contractAddress = ''
    },
    web3Lib = Web3
  ) {
    this.web3 = new web3Lib(web3.currentProvider) // convert legacy web3 0.x to 1.x
    this.ingridAddress = ingridAddress
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.channelManagerInstance = new this.web3.eth.Contract(
      channelManagerAbi,
      contractAddress
    )
  }

  // WALLET FUNCTIONS
  /**
   * Opens a ledger channel with ingridAddress and bonds initialDeposit.
   * Requests a challenge timer for the ledger channel from ingrid.
   *
   * Use web3 to call openLC function on ledgerChannel.
   * Ingrid will open with 0 balance, and can call the deposit function to
   * add deposits based on user needs.
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
    validate.single(initialDeposit, { presence: true, isBN: true })
    // get challenge timer from ingrid
    const accounts = await this.web3.eth.getAccounts()
    const challenge = await this.getLedgerChannelChallengeTimer()
    // generate additional initial lc params
    const nonce = 0
    const openVCs = 0
    const lcId = await this.getNewChannelId()
    const vcRootHash = '0x0'
    const partyA = accounts[0]
    const sig = this.createLCStateUpdate({
      lcId,
      nonce,
      openVCs,
      vcRootHash,
      partyA,
      balanceA: initialDeposit,
      balanceI: 0
    })

    // create LC on contract
    // TO DO: better error handling here
    /**
     * Descriptive error message back to wallet here
     *
     * Atomicity -- roll back to a previous state if there are inconsistencies here
     *
     * Return to a recoverable state based on block history
     *
     * Fail point so Ingrid can retry if join fails, make sure if ingrid cant join, the funds are recoverable.
     */
    const contractResult = await this.createLedgerChannelContractHandler({
      lcId,
      challenge,
      initialDeposit
    })
    console.log(contractResult)
    // ping ingrid
    const response = this.requestJoinLc({ sig, balanceA: initialDeposit })
    return response
  }

  /**
   * Add a deposit to an existing ledger channel. Calls contract function "deposit"
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.deposit(deposit)
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    validate.single(depositInWei, { presence: true, isBN: true })
    // call contract handler
    const result = await this.depositContractHandler({ depositInWei })
    return result
  }

  /**
   * Withdraw bonded funds from ledger channel with ingrid.
   * All virtual channels must be closed before a ledger channel can be closed.
   *
   * Generates the state update from the latest ingrid signed state with fast-close flag.
   * Ingrid should countersign if the state update matches what she has signed previously,
   * and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.
   *
   * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
   *
   * @example
   * const success = await connext.withdraw()
   * @returns {boolean} Returns true if successfully withdrawn, false if challenge process commences.
   * @returns {String} Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.
   */
  async withdraw () {
    const lcId = await this.getLcId({})
    const accounts = await this.web3.eth.getAccounts()
    const lcState = await this.getLatestLedgerStateUpdate({
      ledgerChannelId: lcId
    })
    /**
     * lcState = {
     *  sigA,
     *  sigI,
     *  nonce,
     *  openVCs,
     *  vcRootHash,
     *  partyA,
     *  partyI,
     *  balanceA,
     *  balanceI
     * }
     */
    // check ingrid signed
    // TO DO: probably should check with values that don't come from
    // the same
    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: lcState.sigI,
      isCloseFlag: 0,
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: lcState.balanceA,
      balanceI: lcState.balanceI
    })
    if (signer !== this.ingridAddress) {
      throw new Error('Ingrid did not sign this state update.')
    }
    // generate same update with fast close flag and post
    const sigParams = {
      isCloseFlag: 1,
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: lcState.balanceA,
      balanceI: lcState.balanceI
    }
    const sig = await this.createLCStateUpdate(sigParams)

    const fastCloseResponse = await this.fastCloseLcHandler({ sig, lcId })
    let response
    if (fastCloseResponse) {
      // call consensus close channel
      response = await this.consensusCloseChannelContractHandler({
        lcId,
        nonce: lcState.nonce,
        balanceA: lcState.balanceA,
        balanceI: lcState.balanceI,
        sigA: sig,
        sigI: lcState.sigI
      })
    } else {
      // call updateLCState
      /// //////////////////////////////////////////////////////////////////
      // NOTE: HERE YOU PING THE WATCHER SO THEY KEEP TRACK OF TIMEOUTS //
      /// ////////////////////////////////////////////////////////////////

      response = await this.updateLcStateContractHandler({
        // challenge flag..?
        lcId,
        nonce: lcState.nonce,
        openVCs: lcState.openVCs,
        balanceA: lcState.balanceA,
        balanceI: lcState.balanceI,
        vcRootHash: lcState.vcRootHash,
        sigA: sig,
        sigI: lcState.sigI
      })
    }
    return response
  }

  /**
   * Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.
   *
   * Looks up LC by the account address of the client-side user.
   *
   * @example
   * const success = await connext.withdraw()
   * if (!success) {
   *   // wait out challenge timer
   *   await connext.withdrawFinal()
   * }
   */
  async withdrawFinal () {
    const lcId = await this.getLcId({})
    const lc = await this.getLc({ lcId })
    if (lc.openVCs > 0) {
      throw new Error('Close open VCs before withdraw final.')
    }
    if (!lc.isSettling) {
      throw new Error('Ledger channel is not in settlement state.')
    }
    if (lc.updateLcTimeout < new Date().getTime()) {
      throw new Error('Ledger channel is still in challenge phase.')
    }
    const results = await this.byzantineCloseChannelContractHandler(lcId)
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
    const lcId = await this.getLcId({})
    const lcState = await this.getLatestLedgerStateUpdate({
      ledgerChannelId: lcId
    })
    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: lcState.sigI,
      isCloseFlag: 0,
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: lcState.balanceA,
      balanceI: lcState.balanceI
    })
    if (signer !== this.ingridAddress) {
      throw new Error('Hub did not sign this state update.')
    }
    const sig = await this.createLCStateUpdate({
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      balanceA: lcState.balanceA,
      balanceI: lcState.balanceI
    })
    const result = await this.updateLcStateContractHandler({
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      balanceA: lcState.balanceA,
      balanceI: lcState.balanceI,
      vcRootHash: lcState.vcRootHash,
      sigA: sig,
      sigI: lcState.sigI
    })

    return result
  }

  /**
   * Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
   *
   * If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit. This function is to be called by the "A" party in a unidirectional scheme.
   * Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.
   * This proposed LC update (termed VC0 throughout documentation) serves as the opening certificate for the virtual channel.
   *
   * @example
   * const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
   * await connext.openChannel({ to: myFriendsAddress })
   * @param {Object} params - The method object.
   * @param {String} params.to Wallet address to wallet for partyB in virtual channel
   * @param {BigNumber} params.deposit User deposit for VC, in wei. Optional.
   */
  /**
   * add error handling for calling openChannel twice as a viewer or something
   *
   * should fail if you try calling openChannel if it doesnt let you
   *
   * validate the state update against lc is valid
   */
  async openChannel ({ to, deposit = null }) {
    validate.single(to, { presence: true, isAddress: true })
    if (deposit) {
      validate.single(deposit, { presence: true, isBN: true })
    }
    const lcIdA = await this.getLcId({})
    const lcIdB = await this.getLcId({ partyA: to })
    // validate the subchannels exist
    if (lcIdB === null || lcIdA === null) {
      throw new Error('Missing one or more required subchannels for VC.')
    }
    // get ledger channel A
    const lcA = await this.getLc({ lcId: lcIdA })
    // generate initial vcstate
    const vcId = await this.getNewVirtualChannelId()
    const vc0 = await this.createVCStateUpdate({
      vcId,
      nonce: 0,
      partyA: lcA.partyA,
      partyB: to,
      balanceA: deposit || lcA.balanceA,
      balanceB: 0
    })
    let vc0s = await this.getVcInitialStates({ ledgerChannelId: lcIdA }) // array of vc state objs
    vc0s.push(vc0)
    const newVcRootHash = Connext.generateVcRootHash({
      vc0s
    })
    // ping ingrid
    const result = await this.openVc({
      vc0: vc0,
      balanceA: deposit || lcA.balanceA,
      to,
      vcRootHash: newVcRootHash
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
   * @param {Number} channelId - ID of the virtual channel.
   */
  async joinChannel (channelId) {
    // join virtual channel
    validate.single(channelId, { presence: true, isHexStrict: true })
    // get channels and accounts
    const accounts = await this.web3.eth.getAccounts()

    const vc = await this.getChannel({ channelId })

    const lcIdB = await this.getLcId({})

    const vc0 = {
      vcId: channelId,
      nonce: 0,
      partyA: vc.partyA, // depending on ingrid for this value
      partyB: accounts[0],
      balanceA: vc.balanceA, // depending on ingrid for this value
      balanceB: 0
    }

    const sig = await this.createVCStateUpdate(state)
    let vc0s = await this.getVcInitialStates({ ledgerChannelId: lcIdB })
    vc0s.push(vc0)
    const newVcRootHash = Connext.generateVcRootHash({
      vc0s
    })
    // ping ingrid with vc0 (hub decomposes to lc)
    const result = await this.joinVcHandler({
      sig: sig,
      channelId,
      balanceB: 0
    })
    return result.data
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
   * @param {Number} params.channelId ID of channel.
   * @param {BigNumber} params.balance Channel balance in Wei (of "A" party).
   * @returns {String} Returns signature of balance update.
   */
  async updateBalance ({ channelId, balance }) {
    validate.single(channelId, { presence: true, isHexStrict: true }) // better channelID validator
    validate.single(balance, { presence: true, isBN: true })
    // get the vc
    const vc = await this.getChannel({ channelId })

    const sig = await this.createVCStateUpdate({
      vcId: channelId,
      nonce: vc.nonce + 1,
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: balance,
      balanceB: vc.balanceB + (vc.balanceA - balance) // type issues?
    })
    // post signed update to watcher
    const response = await this.vcStateUpdateHandler({
      channelId,
      sig,
      balance
    })
    return response
  }

  /**
   * Verifies signature on balance update and co-signs update.
   *
   * In the unidirectional scheme, this function is called by the "B" party only.
   * Signature is posted to the hub/watcher.
   * @param {Object} params - The method object.
   * @param {Number} params.channelId ID of channel.
   * @param {BigNumber} params.balance Channel balance in Wei (of "A" party).
   * @param {String} params.sig Signature received from "A" party to be verified before co-signing.
   * @returns {String} Returns signature of balance update.
   */
  async cosignBalanceUpdate ({ channelId, balance, sig }) {
    // validate inputs
    validate.single(channelId, { presence: true, isHexStrict: true })
    validate.single(balance, { presence: true, isBN: true })
    validate.single(sig, { presence: true, isHex: true })
    // check sig
    const accounts = await this.web3.eth.getAccounts()
    const vc = await this.getChannel(channelId)
    const subchanAI = await this.getChannelId({ partyA: vc.partyA })
    const subchanBI = await this.getChannelId({ partyA: vc.partyB })
    const signer = Connext.recoverSignerFromVCStateUpdate({
      sig,
      vcId: channelId,
      nonce: vc.nonce, // will this be stored in vc after updateState?
      partyA: vc.partyA,
      partyB: vc.partyB,
      subchanAI,
      subchanBI,
      balanceA: balance,
      balanceB: vc.balanceB // will this be stored in vc after updateState?
    })
    if (accounts[0] === vc.partyB && signer !== vc.partyA) {
      throw new Error('partyA did not sign this state update.')
    } else if (accounts[0] === vc.partyA && signer !== vc.partyB) {
      throw new Error('partyB did not sign this state update.')
    } else if (accounts[0] !== vc.partyA && accounts[0] !== vc.partyB) {
      throw new Error('Not your virtual channel')
    }
    // generate sigB
    const sigB = await this.createVCStateUpdate({
      vcId: channelId,
      nonce: vc.nonce, // will this be stored in vc after updateState?
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: balance,
      balanceB: vc.balanceB // will this be stored in vc after updateState?
    })
    // post sig to hub
    const response = await this.cosignVcStateUpdate({
      channelId,
      sig: sigB,
      balance
    })
    return response
  }

  /**
   * Closes specified channel using latest double signed update.
   *
   * Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
   * double signed VC update.
   *
   * @example
   * await connext.fastCloseChannel(10)
   * @param {Bytes32} channelId - virtual channel ID
   */
  async fastCloseChannel (channelId) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    const accounts = await this.web3.eth.getAccounts()
    // get latest double signed updates
    const latestVcState = await this.getLatestVirtualDoubleSignedStateUpdate({
      channelId
    })
    if (
      latestVcState.partyA !== accounts[0] &&
      latestVcState.partyB !== accounts[0]
    ) {
      throw new Error('Not your virtual channel.')
    }

    // verify signatures
    const signerA = Connext.recoverSignerFromVCStateUpdate({
      sig: sigA,
      vcId: channelId,
      nonce: latestVcState.nonce,
      partyA: latestVcState.partyA,
      partyB: latestVcState.partyB,
      partyI: latestVcState.partyI,
      subchanAI: latestVcState.subchanAI,
      subchanBI: latestVcState.subchanBI,
      balanceA: latestVcState.balanceA,
      balanceB: latestVcState.balanceB
    }) // should be partyA
    const signerB = Connext.recoverSignerFromVCStateUpdate({
      sig: sigB,
      vcId: channelId,
      nonce: latestVcState.nonce,
      partyA: latestVcState.partyA,
      partyB: latestVcState.partyB,
      partyI: latestVcState.partyI,
      subchanAI: latestVcState.subchanAI,
      subchanBI: latestVcState.subchanBI,
      balanceA: latestVcState.balanceA,
      balanceB: latestVcState.balanceB
    }) // should be accounts[0]
    if (signerB !== vc.partyB || signerA !== vc.partyA) {
      throw new Error('Incorrect signer detected on state.')
    }
    // vc update is signed by correct people
    // it is their vc

    // generate LcUpdate
    const lcStateUpdate = await this.createDecomposedLcUpdates(latestVcState)
    // post to ingrid
    const results = await this.fastCloseVcHandler({
      vcId: channelId,
      sigA: lcStateUpdate.sigA
    })
    return results
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
   * @param {BigNumber} params.balance Virtual channel balance.
   */
  async closeChannel ({ channelId, balance }) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    validate.single(balance, { presence: true, isBN: true })
    // get decomposed lc updates from ingrid
    const accounts = await this.web3.eth.getAccounts()
    const vc = await this.getChannel({ channelId })
    // your vc? which agent?
    let subchan
    if (accounts[0] === vc.partyA) {
      subchan = vc.subchanAI
    } else if (accounts[0] === vc.partyB) {
      subchan = vc.subchanBI
    } else {
      throw new Error('Not your channel to close.')
    }
    // ping ingrid for decomposed updates
    // if doesnt respond, then settleVC for all VCIDs in LC
    const lcStates = await this.getDecomposedLcStates({ vcId: channelId })
    // the lc update for this subchan should be signed by ingrid
    // should you just call checkpoint to update the LC on chain with this?
    if (lcStates) {
      // const result = await this.checkpoint() // maybe just post update cosig to ingrid?
      const sig = await this.createLCStateUpdate(lcStates[subchan])
      // post sig to ingrid
      const result = await axios.post(
        `${this.ingridUrl}/ledgerchannel/${subchan}/cosign`,
        {
          sig
        }
      )
      return result
    } else {
      // ingrid MIA, call settle vc on chain for each vcID
      // get initial states of VCs
      const result = await this.byzantineCloseVc(channelId)
      return result
    }
  }

  /**
   * Close many channels
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
   * @param {Number} channels.$.channelId Channel ID to close
   * @param {BigNumber} channels.$.balance Channel balance.
   */
  async closeChannels (channels) {
    validate.single(channels, { presence: true, isArray: true })
    // should this try to fast close any of the channels?
    // or just immediately force close in dispute many channels
    channels.forEach(async channel => {
      // async ({ channelId, balance }) maybe?
      console.log('Closing channel:', channel)
      await this.closeChannel({
        channelId: channel.channelId,
        balance: channel.balance
      })
      console.log('Channel closed.')
    })
  }

  // SIGNATURE FUNCTIONS
  static createLCStateUpdateFingerprint ({
    isCloseFlag,
    lcId,
    nonce,
    openVCs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    // validate params
    validate.single(isCloseFlag, { presence: true, isBoooleanInt: true })
    validate.single(lcId, { presence: true, isHexStrict: true })
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(openVCs, { presence: true, isPositiveInt: true })
    validate.single(vcRootHash, { presence: true, isHex: true })
    validate.single(partyA, { presence: true, isAddress: true })
    validate.single(partyI, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceI, { presence: true, isBN: true })
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'uint256', value: isCloseFlag },
      { type: 'bytes32', value: lcId },
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVCs },
      { type: 'string', value: vcRootHash },
      { type: 'address', value: partyA },
      { type: 'address', value: partyI },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceI }
    )
    return hash
  }

  static recoverSignerFromLCStateUpdate ({
    sig,
    isCloseFlag,
    lcId,
    nonce,
    openVCs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    // validate params
    validate.single(sig, { presence: true, isHex: true })
    validate.single(isCloseFlag, { presence: true, isBoooleanInt: true })
    validate.single(lcId, { presence: true, isHexStrict: true })
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(openVCs, { presence: true, isPositiveInt: true })
    validate.single(vcRootHash, { presence: true, isHex: true })
    validate.single(partyA, { presence: true, isAddress: true })
    validate.single(partyI, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceI, { presence: true, isBN: true })
    // generate fingerprint
    let fingerprint = Connext.createLCStateUpdateFingerprint({
      isCloseFlag,
      lcId,
      nonce,
      openVCs,
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

  async createLCStateUpdate ({
    isCloseFlag = 0, // default isnt close LC
    lcId,
    nonce,
    openVCs,
    vcRootHash,
    partyA,
    partyI = this.ingridAddress, // default to ingrid
    balanceA,
    balanceI,
    unlockedAccountPresent = false // true if hub or ingrid
  }) {
    // validate params
    validate.single(isCloseFlag, { presence: true, isBooleanInt: true })
    validate.single(lcId, { presence: true, isHexStrict: true })
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(openVCs, { presence: true, isPositiveInt: true })
    validate.single(vcRootHash, { presence: true, isHex: true })
    validate.single(partyA, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceI, { presence: true, isBN: true })

    // TO DO:
    // additional validation to only allow clients to call correct state updates

    // generate sig
    const accounts = await this.web3.getAccounts()
    // personal sign?
    const hash = Connext.createLCStateUpdateFingerprint({
      isCloseFlag,
      lcId,
      nonce,
      openVCs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  static createVCStateUpdateFingerprint ({
    vcId,
    nonce,
    partyA,
    partyB,
    partyI,
    subchanAI,
    subchanBI,
    balanceA,
    balanceB
  }) {
    const methodName = 'createVCStateUpdateFingerprint'
    // validate
    // validatorOpts
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
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )

    Connext.validatorsResponseToError(
      validate.single(subchanAI, isHexStrict),
      methodName,
      'subchanAI'
    )

    Connext.validatorsResponseToError(
      validate.single(subchanBI, isHexStrict),
      methodName,
      'subchanBI'
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
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: vcId },
      { type: 'uint256', value: nonce },
      { type: 'address', value: partyA },
      { type: 'address', value: partyB },
      { type: 'address', value: partyI },
      { type: 'bytes32', value: subchanAI },
      { type: 'bytes32', value: subchanAI },
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
    partyI,
    subchanAI,
    subchanBI,
    balanceA,
    balanceB
  }) {
    const methodName = 'recoverSignerFromVCStateUpdate'
    // validate
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
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )

    Connext.validatorsResponseToError(
      validate.single(subchanAI, isHexStrict),
      methodName,
      'subchanAI'
    )

    Connext.validatorsResponseToError(
      validate.single(subchanBI, isHexStrict),
      methodName,
      'subchanBI'
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
      partyI,
      subchanAI,
      subchanBI,
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

  async createVCStateUpdate ({
    vcId,
    nonce,
    partyA,
    partyB,
    partyI = this.ingridAddress,
    balanceA,
    balanceB,
    unlockedAccountPresent = false // if true, use sign over personal.sign
  }) {
    // validate
    const methodName = 'createVCStateUpdate'
    // validate
    // validatorOpts'
    const isHex = { presence: true, isHex: true }
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
    // get subchans
    let subchanAI, subchanBI
    // is this partyA or B?
    if (accounts[0] === partyA) {
      subchanAI = await this.getLcId({})
      subchanBI = await this.getLcId({ partyA: partyB })
    } else if (accounts[0] === partyB) {
      subchanAI = await this.getLcId({ partyA })
      subchanBI = await this.getLcId({})
    } else {
      throw new Error('Not your virtual channel.')
    }

    // keep in here? probably separate out into a validation of state update
    // params fn
    if (subchanAI === null || subchanBI === null) {
      throw new Error('Missing one or more required subchannels.')
    }

    // generate and sign hash
    const hash = Connext.createVCStateUpdateFingerprint({
      vcId,
      nonce,
      partyA,
      partyB,
      partyI,
      subchanAI,
      subchanBI,
      balanceA,
      balanceB
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  // vc0 is array of all existing vc0 sigs for open vcs
  static generateVcRootHash ({ vc0s }) {
    validate.single(vc0s, { presence: true, isArray: true })
    let vcRootHash, elems
    if (vc0s.length === 0) {
      // reset to initial value -- no open VCs
      elems = []
      vcRootHash = '0x0'
      elems.push(vcRootHash)
    } else {
      elems = vc0s.map(vc0 => {
        // vc0 is the initial state of each vc
        // hash each initial state and convert hash to buffer
        const hash = Connext.createVCStateUpdateFingerprint(vc0)
        const vcBuf = Utils.hexToBuffer(hash)
        return vcBuf
      })
      const merkle = new MerkleTree(elems)
      vcRootHash = Utils.bufferToHex(merkle.getRoot())
    }
    return vcRootHash
  }

  // HELPER FUNCTIONS

  // ***************************************
  // ******** CONTRACT HANDLERS ************
  // ***************************************
  async createLedgerChannelContractHandler ({
    ingridAddress = this.ingridAddress,
    lcId,
    challenge,
    initialDeposit
  }) {
    const methodName = 'createLedgerChannelContractHandler'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
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
      validate.single(isPositiveInt, isPositiveInt),
      methodName,
      'challenge'
    )
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
    )
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.createLedgerChannel(
      ingridAddress,
      lcId, // in contract yet?
      challenge,
      {
        from: accounts[0],
        value: initialDeposit
      }
    )
    return result
  }

  async depositContractHandler ({ depositInWei }) {
    const methodName = 'depositContractHandler'
    // validate
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
    )
    // find ledger channel by mine and ingrids address
    const lcId = await this.getLcId({})
    // call LC method
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.deposit(
      lcId, // PARAM NOT IN CONTRACT YET, SHOULD BE
      accounts[0],
      {
        from: accounts[0],
        value: depositInWei
      }
    )
    return result
  }

  async consensusCloseChannelContractHandler ({
    isClose = 1,
    lcId,
    nonce,
    balanceA,
    balanceI,
    sigA,
    sigI
  }) {
    const methodName = 'consensusCloseChannelContractHandler'
    // validate
    const isBooleanInt = { presence: true, isBooleanInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(isClose, isBooleanInt),
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
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.consensusCloseChannel(
      isClose,
      lcId,
      nonce,
      balanceA,
      balanceI,
      sigA,
      sigI,
      {
        from: accounts[0]
      }
    )
    return result
  }

  async updateLcStateContractHandler ({
    isClose = 0,
    lcId,
    nonce,
    openVCs,
    balanceA,
    balanceI,
    vcRootHash,
    sigA,
    sigI
  }) {
    const methodName = 'updateLcStateContractHandler'
    // validate
    const isBooleanInt = { presence: true, isBooleanInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(isClose, isBooleanInt),
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
      validate.single(openVCs, isPositiveInt),
      methodName,
      'openVCs'
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
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.updateLCState(
      isClose,
      lcId,
      nonce,
      openVCs,
      balanceA,
      balanceI,
      vcRootHash,
      sigA,
      sigI,
      {
        from: accounts[0]
      }
    )
    return result
  }

  async byzantineCloseChannelContractHandler (lcId) {
    const methodName = 'byzantineCloseChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const results = await this.channelManagerInstance.byzantineCloseChannel(
      lcId,
      {
        from: accounts[0]
      }
    )
    return results
  }

  async initVcStateContractHandler ({
    subchanId,
    vcId,
    proof,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sigB
  }) {
    const methodName = 'initVcStateContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
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
    Connext.validatorsResponseToError(
      validate.single(proof, isHex),
      methodName,
      'proof'
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
    Connext.validatorsResponseToError(
      validate.single(sigB, isHex),
      methodName,
      'sigB'
    )
    const accounts = await this.web3.eth.getAccounts()
    // generate proof from lc
    const vc0s = await this.getVcInitialStates({ lcId: subchan })
    const vcRootHash = await this.generateVcRootHash({ vc0s })
    let proof = [vcRootHash]
    proof = this.web3.utils.soliditySha3({ type: 'bytes32', value: proof })
    const results = await this.channelManagerInstance.initVCState(
      subchanId,
      vcId,
      proof,
      0,
      partyA,
      partyB,
      balanceA,
      balanceB,
      sigA,
      sigB,
      {
        from: accounts[0]
      }
    )
    return results
  }

  async settleVcContractHandler ({
    subchan,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sigB
  }) {
    const methodName = 'updateLcStateContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(subchan, isHexStrict),
      methodName,
      'subchan'
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
    Connext.validatorsResponseToError(
      validate.single(sigB, isHex),
      methodName,
      'sigB'
    )
    const accounts = await this.web3.eth.getAccounts()
    const results = await this.channelManagerInstance.settleVC(
      subchan,
      vcId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB,
      sigA,
      sigB,
      {
        from: accounts[0]
      }
    )
    return results
  }

  // ***************************************
  // ********** ERROR HELPERS ************
  // ***************************************
  static validatorsResponseToError (validtorResponse, methodName, varName) {
    if (validtorResponse !== undefined) {
      const errorMessage = `[${methodName}][${varName}] : ${validtorResponse}`
      throw new Error(errorMessage)
    }
  }

  // ***************************************
  // *********** INGRID HELPERS ************
  // ***************************************
  async getLatestLedgerStateUpdate (ledgerChannelId) {
    // should return Object lcState where:
    //  * lcState = {
    //  *  sigB,
    //  *  sigA,
    //  *  nonce,
    //  *  openVCs,
    //  *  vcRootHash,
    //  *  partyA,
    //  *  partyI,
    //  *  balanceA,
    //  *  balanceI
    //  * }
    //  */
    // lcState == latest ingrid signed state
    validate.single(ledgerChannelId, { presence: true, isHexStrict: true })
    const response = await axios.get(
      `${this.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
    )
    return response.data
  }

  async getLcId ({ partyA = null }) {
    if (partyA) {
      validate.single(partyA, { presence: true, isAddress: true })
    } else {
      const accounts = await this.web3.eth.getAccounts()
      partyA = accounts[0]
    }
    // get my LC with ingrid

    const response = await axios.get(
      `${this.ingridUrl}/ledgerchannel?a=${partyA}`
    )
    if (response.data.data.ledgerChannel) {
      return response.data.data.ledgerChannel.id
    } else {
      return null
    }
  }

  /**
   * Sets channel IDs to be random.
   */
  async getNewChannelId () {
    const prefix = Buffer.from('0x', 'hex')
    const channelId = await crypto.randomBytes(32, (err, buf) => {
      if (err) throw err
      // append prefix
      const final = Buffer.concat([prefix, buf])
      return final
    })
    return channelId
  }

  async getChannel ({ channelId }) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel/${channelId}`
    )
    return response.data
  }

  async getOtherLcId () {
    // get LC for other VC party and ingrid
  }

  async getLc ({ lcId }) {
    validate.single(lcId, { presence: true, isHexStrict: true })
  }

  async getLedgerChannelChallengeTimer () {
    const response = await axios.get(`${this.ingridUrl}/ledgerchannel/timer`)
    return response.data
  }

  // posts signature of lc0 to ingrid
  // requests to open a ledger channel with the hub
  async requestJoinLc ({ sig, balanceA }) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    validate.single(balanceA, { presence: true, isBN: true })

    const accounts = await this.web3.eth.getAccounts()
    const response = await axios.post(
      `${this.ingridUrl}/ledgerchannel/join?a=${accounts[0]}`,
      {
        sig,
        balanceA
      }
    )
    return response.data
  }

  async openVc ({ sig, balanceA, to, vcRootHash }) {
    validate.single(sig, { presence: true, isHexStrict: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(to, { presence: true, isAddress: true })
    validate.single(vcRootHash, { presence: true, isHex: true })

    const accounts = await this.web3.eth.getAccounts()
    // ingrid should add vc params to db
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/open?a=${accounts[0]}`,
      {
        sig,
        balanceA,
        to,
        vcRootHash
      }
    )
    return response.data
  }

  async joinVcHandler ({ sig, vcRootHash, channelId }) {
    console.log(
      validate.single(sig, { presence: true, isHex: true }),
      validate.single(vcRootHash, { presence: true, isHex: true }),
      validate.single(channelId, { presence: true, isHexStrict: true })
    )
    const accounts = await this.web3.eth.getAccounts()
    // ingrid should verify vcS0A and vcS0b
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/join`,
      {
        sig,
        vcRootHash
      }
    )
    return response.data
  }

  // posts to ingrid endpoint to decompose ledger channel
  // based on latest double signed update
  async fastCloseLcHandler ({ sig, lcId }) {
    validate.single(sig, { presence: true, isHex: true })
    validate.single(vcRootHash, { presence: true, isHex: true })
    validate.single(lcId, { presence: true, isHexStrict: true })
    const response = await axios.post(
      `${this.ingridUrl}/ledgerchannel/${lcId}/fastclose`,
      {
        sig
      }
    )
    return response.data
  }

  async vcStateUpdateHandler ({ channelId, sig, balance }) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    validate.single(sig, { presence: true, isHex: true })
    validate.single(balance, { presence: true, isBN: true })
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/update`,
      {
        sig,
        balance
      }
    )
    return response.data
  }

  async cosignVcStateUpdateHandler ({ channelId, sig, balance }) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    validate.single(sig, { presence: true, isHex: true })
    validate.single(balance, { presence: true, isBN: true })
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/cosign`,
      {
        sig,
        balance
      }
    )
    return response.data
  }

  // Should generate an object like this:
  // const vcState = {
  //   sigA,
  //   sigB,
  //   vcId,
  //   nonce,
  //   partyA,
  //   partyB,
  //   partyI,
  //   subchanAI,
  //   subchanBI,
  //   balanceA,
  //   balanceB
  // }
  async getLatestVirtualDoubleSignedStateUpdate ({ channelId }) {
    validate.single(channelId, { presence: true, isHexStrict: true })
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel/${channelId}/lateststate/doublesigned`
    )
    return response.data
  }

  async createDecomposedLcUpdates ({
    sigA,
    sigB,
    vcId,
    nonce,
    partyA,
    partyB,
    partyI,
    subchanAI,
    subchanBI,
    balanceA,
    balanceB
  }) {
    // validate params
    validate.single(sigA, { presence: true, isHex: true })
    validate.single(sigB, { presence: true, isHex: true })
    validate.single(vcId, { presence: true, isHexStrict: true })
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(partyA, { presence: true, isAddress: true })
    validate.single(partyB, { presence: true, isAddress: true })
    validate.single(partyI, { presence: true, isAddress: true })
    validate.single(subchanAI, { presence: true, isHexStrict: true })
    validate.single(subchanBI, { presence: true, isHexStrict: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })
    // get correct lc info
    const accounts = await this.web3.getAccounts()
    let lc, lcState, vc0s
    if (accounts[0] === partyA) {
      // accounts[0] is vcpartyA, lcAgentA is paying money
      lc = await this.getLc({ subchanAI })
      vc0s = await this.getVcInitialStates({ subchanAI })
      lcState.lcId = subchanAI
      lcState.balanceA = lc.balanceA - balanceB // balanceB in VC is amount A paid
      lcState.balanceI = lc.balanceI + balanceB
    } else if (accounts[0] === partyB) {
      // accounts[0] is partyB, vcAgentA is making money
      lc = await this.getLc({ subchanBI })
      vc0s = await this.getVcInitialStates({ subchanBI })
      lcState.lcId = subchanBI
      lcState.balanceA = lc.balanceA + balanceB // lc balance inc. by amount earned
      lcState.balanceI = lc.balanceI - balanceB
    } else {
      // does this condition make it so watchers cant call this function
      throw new Error('Not your virtual channel to decompose.')
    }
    // create vc root hash
    const vc0 = await this.getVcInitialState({ vcId })
    vc0s = vc0s.pop(vc0)
    lcState.vCRootHash = Connext.generateVcRootHash({ vc0s })
    // add additional state params to create vc update
    lcState.nonce = lc.nonce + 1
    lcState.openVCs = lc.openVCs - 1
    lcState.partyA = accounts[0]
    lcState.sigA = await this.createLCStateUpdate(lcState)

    return lcState
  }

  async fastCloseVcHandler ({ vcId, sigA }) {
    validate.single(vcId, { presence: true, isHexStrict: true })
    validate.single(sigA, { presence: true, isHex: true })
    const results = await axios.post(
      `${this.ingridUrl}/virtualChannel/${vcId}/fastclose`,
      {
        sig: sigA
      }
    )
    return results.data
  }

  // should return a list of initial vc state objects
  // for all open VCs for a given LC
  // list of objects in form detailed below
  async getVcInitialStates ({ lcId }) {}

  // returns initial vc state object for given vc
  // object:
  // partyA: vc0.partyA,
  //     partyB: vc0.partyB,
  //     balanceA: vc0.balanceA,
  //     balanceB: vc0.balanceB,
  //     sigA: vc0.sigA,
  //     sigB: vc0.sigB
  //   }
  async getVcInitialState ({ vcId }) {}

  // requests both decomposed lc state updates from ingrid.
  // returns labeled lc state object (i.e. indexed by lc channel id)
  // lcState obj should match whats submitted to createLcUpdate
  async getDecomposedLcStates ({ vcId }) {
    validate.single(vcId, { presence: true, isHexStrict: true })
  }

  // settles all vcs on chain in the case of a dispute (used in close channel)
  // first calls init vc
  // then calls settleVc

  /// SHOULD WE JUST POST THIS DIRECTLY TO THE WATCHER URL FROM OUR PACKAGE

  // then posts to watcher (?) -- maybe just post all of this to the watcher url (?)
  async byzantineCloseVc (vcId) {
    validate.single(vcId, { presence: true, isHexStrict: true })
    const accounts = await this.getAccounts()
    const vc0 = await this.getVcInitialState({ vcId })
    let subchan
    if (accounts[0] === vc0.agentA) {
      subchan = vc0.subchanAI
    } else if (accounts[0] == vc0.agentB) {
      subchan = vc0.subchanBI
    }
    const initResult = await this.initVcStateContractHandler({
      subchan,
      vcId,
      partyA: vc0.partyA,
      partyB: vc0.partyB,
      balanceA: vc0.balanceA,
      balanceB: vc0.balanceB,
      sigA: vc0.sigA,
      sigB: vc0.sigB
    })
    if (initResult) {
      const vcState = await this.getLatestVirtualDoubleSignedStateUpdate({
        vcId
      })
      const settleResult = await this.settleVcContractHandler({
        subchan,
        vcId,
        nonce: vcState.nonce,
        partyA: vcState.partyA,
        partyB: vcState.partyB,
        balanceA: vcState.balanceA,
        balanceB: vcState.balanceB,
        sigA: vcState.sigA,
        sigB: vcState.sigB
      })
      return settleResult
    } else {
      return initResult
    }
  }
}

module.exports = Connext
