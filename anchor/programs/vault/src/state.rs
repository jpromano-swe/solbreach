use anchor_lang::prelude::*;

pub const LEVEL_COUNT: usize = 4;

#[account]
#[derive(InitSpace)]
pub struct UserStats {
    pub player: Pubkey,
    pub completed_levels: [bool; LEVEL_COUNT],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Level0State {
    pub player: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Level1State {
    pub player: Pubkey,
    pub deposited_amount: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BankConfig {
    pub expected_mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Level2State {
    pub player: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub commander: Pubkey,
    pub bump: u8,
}
