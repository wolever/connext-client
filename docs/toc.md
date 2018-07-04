# Table of contents

#### connext-client
* [Getting Started](start.md)


* [Connext](api.md)
    * [constructor](api.md#new_Connext_new)
    
* [Instance Methods](api.md#connextregisterinitialdeposit-sender-challenge-⇒-promise)
    * [register](api.md#connextregisterinitialdeposit-sender-challenge-⇒-promise)
    * [deposit](api.md#connextdepositdepositinwei-sender-recipient-⇒-promise)
    * [openChannel](api.md#connextopenchannelparams-⇒-promise)
    * [joinChannel](api.md#connextjoinchannelchannelid-sender-⇒-promise)
    * [updateBalance](api.md#connextupdatebalanceparams-⇒-promise)
    * [closeChannel](api.md#connextclosechannelchannelid-⇒-promise)
    * [closeChannels](api.md#connextclosechannelschannelids)
    * [withdraw](api.md#connextwithdrawsender-⇒-promise)
    * [withdrawFinal](api.md#connextwithdrawfinalsender-⇒-promise)
    * [cosignLCUpdate](api.md#connextcosignlcupdateparams-⇒-promise)
    * [LCOpenTimeoutContractHandler](api.md#connextlcopentimeoutcontracthandlerlcid-sender-⇒-promise)
    * [getChannelStatesByLcId](api.md#connextgetchannelstatesbylcidledgerchannelid-⇒-promise)
    * [getChannelById](api.md#connextgetchannelbyidchannelid-⇒-promise)
    * [getChannelByParties](api.md#connextgetchannelbypartiesparams-⇒-promise)
    * [getChannelsByLcId](api.md#connextgetchannelsbylcidledgerchannelid-⇒-promise)
    * [getLcById](api.md#connextgetlcbyidlcid-⇒-promise)
    * [getLcByPartyA](api.md#connextgetlcbypartyapartya-status-⇒-promise)
    * [requestIngridDeposit](api.md#connextrequestingriddepositparams-⇒-promise)
    * [requestJoinLc](api.md#connextrequestjoinlclcid-⇒-promise)



* Static Functions
    * [getNewChannelId](api.md#connextgetnewchannelid-⇒-string)
    * [createLCStateUpdateFingerprint](api.md#connextcreatelcstateupdatefingerprintparams-⇒-string)
    * [recoverSignerFromLCStateUpdate](api.md#connextrecoversignerfromlcstateupdateparams-⇒-string)
    * [createVCStateUpdateFingerprint](api.md#connextcreatevcstateupdatefingerprintparams-⇒-string)
    * [recoverSignerFromVCStateUpdate](api.md#connextrecoversignerfromvcstateupdateparams-⇒-string)
