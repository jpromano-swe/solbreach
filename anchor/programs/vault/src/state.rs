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

#[account]
#[derive(InitSpace)]
pub struct GuildAuthority {
    pub reward_mint: Pubkey,
    pub bounty_vault: Pubkey,
    pub bounty_amount: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Level3State {
    pub player: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CertificationAuthority {
    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LevelCertificate {
    pub player: Pubkey,
    pub merkle_tree: Pubkey,
    pub asset_id: Pubkey,
    pub level: u8,
    pub leaf_index: u32,
    pub leaf_nonce: u64,
    pub minted: bool,
    pub transferable: bool,
    pub claimed_at: i64,
    pub minted_at: i64,
    pub bump: u8,
}
