#[cfg(test)]
mod tests {
    use crate::{
        instruction,
        state::{Level0State,UserStats},
        ID as PROGRAM_ID,
    };
    use anchor_lang::{AccountDeserialize, InstructionData};
    use litesvm::LiteSVM;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    fn get_user_stats_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"stats", user.as_ref()], &PROGRAM_ID)
    }

    fn get_level_0_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"level_0", user.as_ref()], &PROGRAM_ID)
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

    #[test]
    fn init_level_0_creates_pda() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (user_stats_pda, _user_stats_bump) = get_user_stats_pda(&user.pubkey());
        let (level_0_pda, level_0_bump) = get_level_0_pda(&user.pubkey());

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let init_level_0_ix =
            create_init_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[init_level_0_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
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

        let (user_stats_pda, _user_stats_bump) = get_user_stats_pda(&user.pubkey());
        let (level_0_pda, _level_0_bump) = get_level_0_pda(&user.pubkey());

        let init_user_stats_ix = create_init_user_stats_ix(&user.pubkey(), &user_stats_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[init_user_stats_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let init_level_0_ix =
            create_init_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[init_level_0_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let verify_ix =
            create_verify_and_close_level_0_ix(&user.pubkey(), &user_stats_pda, &level_0_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let user_stats_account = svm
            .get_account(&user_stats_pda)
            .expect("user stats PDA should exist");

        let mut user_stats_data = user_stats_account.data.as_slice();
        let user_stats = UserStats::try_deserialize(&mut user_stats_data)
            .expect("user stats should deserialize");

        assert!(user_stats.completed_levels[0]);

        let level_0_account = svm.get_account(&level_0_pda);
        assert!(
            level_0_account.is_none(),
            "level 0 PDA should be closed after verification"
        );
    }
}