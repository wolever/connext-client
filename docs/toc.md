# Table of contents

#### connext-client
* [Getting Started](start.md)


* [Connext](api.md)
    * [constructor](api.md#new_Connext_new)
    
* [Instance Methods](api.md#connextregisterinitialdeposit-sender-challenge-⇒-string)
    * [register](api.md#connextregisterinitialdeposit-sender-challenge-⇒-string)
    * [deposit](api.md#connextdepositdepositinwei-sender-recipient-⇒-string)
    * [openChannel](api.md#connextopenchannelparams-⇒-string)
    * [joinChannel](api.md#connextjoinchannelchannelid-sender)
    * [updateBalance](api.md#connextupdatebalanceparams-⇒-string)
    * [closeChannel](api.md#connextclosechannelchannelid)
    * [closeChannels](api.md#connextclosechannelschannelids)
    * [withdraw](api.md#connextwithdrawsender-⇒-object--string--boolean)
    * [withdrawFinal](api.md#connextwithdrawfinal)
    * [checkpoint](api.md#connextcheckpoint)
    * [cosignBalanceUpdate](api.md#connextcosignlcupdateparams)
    * [LCOpenTimeoutContractHandler](api.md#connextlcopentimeoutcontracthandlerparams)
    * [getChannelById](api.md#connextgetchannelbyidchannelid-⇒-object)
    * [getChannelByParties](api.md#connextgetchannelbypartiesparams-⇒-object)
    * [getLcById](api.md#connextgetlcbyidlcid-⇒-object)
    * [getLcByPartyA](api.md#connextgetlcbypartyapartya-⇒-object)



* Static Functions
    * [getNewChannelId](api.md#connextgetnewchannelid-⇒-string)
    * [createLCStateUpdateFingerprint](api.md#connextcreatelcstateupdatefingerprintparams-⇒-string)
    * [recoverSignerFromLCStateUpdate](api.md#connextrecoversignerfromlcstateupdateparams-⇒-string)
    * [createVCStateUpdateFingerprint](api.md#connextcreatevcstateupdatefingerprintparams-⇒-string)
    * [recoverSignerFromVCStateUpdate](api.md#connextrecoversignerfromvcstateupdateparams-⇒-string)
