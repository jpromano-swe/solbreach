use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("This level has already been completed")]
    LevelAlreadyCompleted,
    #[msg("he provided level account does not belong to this user")]
    InvalidLevelOwner,
}