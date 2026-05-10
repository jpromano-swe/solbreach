use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("This level has already been completed")]
    LevelAlreadyCompleted,
    #[msg("The provided level account does not belong to this user")]
    InvalidLevelOwner,
    #[msg("The deposit target has not been reached")]
    DepositGoalNotReached,
    #[msg("The commander registry has not been hijacked by this player")]
    CommanderNotHijacked,
    #[msg("The delegation path has not been hijacked by this player")]
    DelegationNotHijacked,
    #[msg("The guild authority signer was not forwarded into the delegated CPI")]
    MissingGuildAuthoritySigner,
    #[msg("The provided level index is out of bounds")]
    InvalidLevelIndex,
    #[msg("This player has not completed the requested level yet")]
    LevelNotCompleted,
    #[msg("This certificate asset has already been recorded")]
    CertificateAssetAlreadyRecorded,
    #[msg("The signer is not allowed to bind certificate assets")]
    UnauthorizedCertificationAuthority,
}
