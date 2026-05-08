#[account]
#[derive(InitSpace)]
pub struct UserStats {
    pub player: Pubkey,
    pub completed_levels: [bool; LEVEL_COUNT],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserStats {
    pub tree_authority: Pubkey,
    pub tree_capacity: u64,
    pub bump: u8,
}