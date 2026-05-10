use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::state::{CertificationAuthority, LevelCertificate, UserStats, LEVEL_COUNT};

#[derive(Accounts)]
pub struct InitCertificationAuthority<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + CertificationAuthority::INIT_SPACE,
        seeds = [b"certification_authority"],
        bump,
    )]
    pub certification_authority: Account<'info, CertificationAuthority>,

    pub system_program: Program<'info, System>,
}

pub fn init_certification_authority(
    ctx: Context<InitCertificationAuthority>,
    authority: Pubkey,
) -> Result<()> {
    let certification_authority = &mut ctx.accounts.certification_authority;
    certification_authority.authority = authority;
    certification_authority.bump = ctx.bumps.certification_authority;
    Ok(())
}

#[derive(Accounts)]
#[instruction(level: u8)]
pub struct ClaimLevelCertificate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"stats", user.key().as_ref()],
        bump = user_stats.bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(
        init,
        payer = user,
        space = 8 + LevelCertificate::INIT_SPACE,
        seeds = [b"certificate", user.key().as_ref(), &[level]],
        bump,
    )]
    pub certificate: Account<'info, LevelCertificate>,

    pub system_program: Program<'info, System>,
}

pub fn claim_level_certificate(ctx: Context<ClaimLevelCertificate>, level: u8) -> Result<()> {
    require!((level as usize) < LEVEL_COUNT, VaultError::InvalidLevelIndex);
    require!(
        ctx.accounts.user_stats.completed_levels[level as usize],
        VaultError::LevelNotCompleted
    );

    let certificate = &mut ctx.accounts.certificate;
    certificate.player = ctx.accounts.user.key();
    certificate.merkle_tree = Pubkey::default();
    certificate.asset_id = Pubkey::default();
    certificate.level = level;
    certificate.leaf_index = 0;
    certificate.leaf_nonce = 0;
    certificate.minted = false;
    certificate.transferable = false;
    certificate.claimed_at = Clock::get()?.unix_timestamp;
    certificate.minted_at = 0;
    certificate.bump = ctx.bumps.certificate;

    Ok(())
}

#[derive(Accounts)]
pub struct RecordCertificateAsset<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"certification_authority"],
        bump = certification_authority.bump,
    )]
    pub certification_authority: Account<'info, CertificationAuthority>,

    #[account(
        mut,
        seeds = [b"certificate", certificate.player.as_ref(), &[certificate.level]],
        bump = certificate.bump,
    )]
    pub certificate: Account<'info, LevelCertificate>,
}

pub fn record_certificate_asset(
    ctx: Context<RecordCertificateAsset>,
    merkle_tree: Pubkey,
    asset_id: Pubkey,
    leaf_index: u32,
    leaf_nonce: u64,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.certification_authority.authority,
        VaultError::UnauthorizedCertificationAuthority
    );

    let certificate = &mut ctx.accounts.certificate;
    require!(!certificate.minted, VaultError::CertificateAssetAlreadyRecorded);

    certificate.merkle_tree = merkle_tree;
    certificate.asset_id = asset_id;
    certificate.leaf_index = leaf_index;
    certificate.leaf_nonce = leaf_nonce;
    certificate.minted = true;
    certificate.minted_at = Clock::get()?.unix_timestamp;

    Ok(())
}
