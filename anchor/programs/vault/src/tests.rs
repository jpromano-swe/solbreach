#[cfg(test)]
mod tests {
    use crate::{accounts::InitUserStats, instruction, UserStats, ID as PROGRAM_ID};
    use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
    use litesvm::LiteSVM;
    use solana_sdk::{
        pubkey::Pubkey, signature::Keypair, signer::Signer, system_program,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    fn get_user_stats_pda(user: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"stats", user.as_ref()], &PROGRAM_ID)
    }

    #[test]
    fn init_user_stats_creates_expected_pda() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        let _ = svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), LAMPORTS_PER_SOL).unwrap();

        let (user_stats_pda, bump) = get_user_stats_pda(&user.pubkey());
        let accounts = InitUserStats {
            user: user.pubkey(),
            user_stats: user_stats_pda,
            system_program: system_program::ID,
        };

        let instruction = solana_sdk::instruction::Instruction {
            program_id: PROGRAM_ID,
            accounts: accounts.to_account_metas(None),
            data: instruction::InitUserStats {}.data(),
        };

        let blockhash = svm.latest_blockhash();
        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );

        let result = svm.send_transaction(transaction);
        assert!(result.is_ok(), "init_user_stats should succeed");

        let account = svm
            .get_account(&user_stats_pda)
            .expect("user stats PDA should exist");

        assert_eq!(account.owner, PROGRAM_ID);

        let mut account_data = account.data.as_slice();
        let user_stats = UserStats::try_deserialize(&mut account_data)
            .expect("user stats account should deserialize");

        assert_eq!(user_stats.player, user.pubkey());
        assert_eq!(user_stats.completed_levels, [false; 4]);
        assert_eq!(user_stats.bump, bump);
    }
}
