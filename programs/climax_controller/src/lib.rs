use std::io::Write;
use std::ops::Deref;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use spl_token_metadata;

declare_id!("8Jj7CZ7gu87Jd3VKBqZg4ahD6diyK2V7a4LHVBgyAjru");

// config
const TOKEN_ACCOUNT_PDA_SEED: &[u8] = b"token_account_pda_seed";
const NFT_PDA_SEED: &[u8] = b"nft_registration_pda_seed";
const USER_PDA_SEED: &[u8] = b"user_pda_seed";
const AUTH_PDA_SEED: &[u8] = b"auth_pda_seed";
const MAX_OWNERS: usize = 10;

#[program]
pub mod climax_controller {
    use spl_token::solana_program::clock::UnixTimestamp;
    use super::*;

    pub fn initialize_climax_controller(
        ctx: Context<InitializeClimaxController>,
        owners: Vec<Pubkey>,
        signer_threshold: u64,
        candy_machine_id: Pubkey,
        tipping_point_threshold: u64,
        end_timestamp: u64,
        mint_price: u64
    ) -> ProgramResult {
        if owners.len() > MAX_OWNERS {
            return Err(ErrorCode::TooManyOwners.into());
        }
        let climax_controller = &mut ctx.accounts.climax_controller;

        // init multisig params
        climax_controller.owners = owners;
        climax_controller.signer_threshold = signer_threshold;
        let mut signers = Vec::new();
        signers.resize(climax_controller.owners.len(), false);
        climax_controller.signers = signers;

        // init withdraw params
        climax_controller.proposal_is_active = false;

        // init tipping point params
        climax_controller.candy_machine_id = candy_machine_id;
        climax_controller.tipping_point_threshold = tipping_point_threshold;
        climax_controller.end_timestamp = end_timestamp;
        climax_controller.mint_price = mint_price;

        Ok(())
    }

    pub fn init_user_metadata_pda(
        ctx: Context<InitUserMetadataPda>,
    ) -> ProgramResult {
        ctx.accounts.user_metadata_pda.amount_paid = 0;
        ctx.accounts.user_metadata_pda.amount_withdrawn = 0;
        Ok(())
    }

    pub fn register_nft(
        ctx: Context<RegisterNft>,
    ) -> ProgramResult {

        // manually lookup metaplex metadata pda and ensure match with address
        const PREFIX: &str = "metadata";
        let nft_mint = &ctx.accounts.nft_mint.key();
        let metadata_program_id: Pubkey = spl_token_metadata::ID;
        let metadata_seeds = &[
            PREFIX.as_bytes(),
            metadata_program_id.as_ref(),
            nft_mint.as_ref(),
        ];
        let (metaplex_metadata_pda, _bump) = Pubkey::find_program_address(metadata_seeds, &metadata_program_id);
        if metaplex_metadata_pda != ctx.accounts.metaplex_metadata_pda.key() {
            return Err(ErrorCode::InvalidMetaplexMetadataPda.into());
        }

        // verify that our candy_machine_id is a verified creator in metaplex metadata pda
        let creators_vec = ctx.accounts.metaplex_metadata_pda.data.creators.as_ref().unwrap();
        let creator_pubkey = ctx.accounts.climax_controller.candy_machine_id.to_string();
        if !creators_vec.iter().any(|c| (c.address.to_string() == creator_pubkey) && c.verified) {
            return Err(ErrorCode::InvalidCandyMachineId.into());
        }

        // initialize nft pda
        ctx.accounts.nft_metadata_pda.candy_machine_id = ctx.accounts.climax_controller.candy_machine_id.clone();

        // update user pda
        // TODO lookup current price in our candymachine
        ctx.accounts.user_metadata_pda.amount_paid += ctx.accounts.climax_controller.mint_price;

        Ok(())
    }

    pub fn execute_user_withdraw(
        ctx: Context<ExecuteUserWithdraw>,
    ) -> ProgramResult {

        // check if candymachine has reached threshold
        let threshold_reached = ctx.accounts.candy_machine.items_redeemed >= ctx.accounts.climax_controller.tipping_point_threshold;
        let now_ts = Clock::get().unwrap().unix_timestamp;
        let mint_still_active = now_ts < ctx.accounts.climax_controller.end_timestamp as UnixTimestamp;
        if threshold_reached || mint_still_active {
            return Err(ErrorCode::MintSucceededSoNoWithdrawls.into());
        }

        // lookup amount based on user account pda
        let amount_to_withdraw = ctx.accounts.user_metadata_pda.amount_paid - ctx.accounts.user_metadata_pda.amount_withdrawn;
        if amount_to_withdraw <= 0 {
            return Err(ErrorCode::FundsAlreadyWithdrawn.into());
        }

        // get seeds to sign for auth_pda
        let climax_controller_address = ctx.accounts.climax_controller.key();
        let (auth_pda, bump_seed) = Pubkey::find_program_address(&[climax_controller_address.as_ref(), AUTH_PDA_SEED], ctx.program_id);
        let seeds = &[climax_controller_address.as_ref(), &AUTH_PDA_SEED[..], &[bump_seed]];
        let signer = &[&seeds[..]];

        // check pda addy correct
        if auth_pda != ctx.accounts.auth_pda.key() {
            return Err(ErrorCode::InvalidAuthPda.into());
        }

        // transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_wrapped_sol.to_account_info(),
            to: ctx.accounts.proposed_receiver.clone(),
            authority: ctx.accounts.auth_pda.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount_to_withdraw)?;

        // update user pda with num withdrawn
        ctx.accounts.user_metadata_pda.amount_withdrawn += amount_to_withdraw;

        Ok(())
    }

    // pub fn propose_multisig_withdraw(
    //     ctx: Context<ProposeMultisigWithdraw>,
    // ) -> ProgramResult {
    //     Ok(())
    // }
    //
    // pub fn approve_multisig_withdraw(
    //     ctx: Context<ApproveMultisigWithdraw>,
    // ) -> ProgramResult {
    //     Ok(())
    // }
    //
    // pub fn execute_multisig_withdraw(
    //     ctx: Context<ExecuteMultisigWithdraw>,
    // ) -> ProgramResult {
    //     Ok(())
    // }


}

#[derive(Accounts)]
pub struct InitializeClimaxController<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer)]
    pub climax_controller: ProgramAccount<'info, ClimaxController>,
    #[account(
        init,
        seeds = [climax_controller.key().as_ref(), AUTH_PDA_SEED],
        bump,
        payer = signer)]
    pub auth_pda: Account<'info, AuthAccount>,
    #[account(
        init,
        token::mint = wsol_mint,
        token::authority = auth_pda,
        seeds = [climax_controller.key().as_ref(), TOKEN_ACCOUNT_PDA_SEED],
        bump,
        payer = signer)]
    pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
    pub wsol_mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitUserMetadataPda<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: ProgramAccount<'info, ClimaxController>,
    #[account(
        init,
        seeds = [climax_controller.key().as_ref(), signer.key().as_ref(), USER_PDA_SEED],
        bump,
        payer = signer)]
    pub user_metadata_pda: Account<'info, UserMetadata>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: ProgramAccount<'info, ClimaxController>,
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    #[account(
        init,
        seeds = [NFT_PDA_SEED, nft_mint.key().as_ref()],
        bump,
        payer = signer)]
    pub nft_metadata_pda: Account<'info, NftMetadata>,
    pub metaplex_metadata_pda: Account<'info, MetaplexMetadata>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), signer.key().as_ref(), USER_PDA_SEED],
        bump)]
    pub user_metadata_pda: Account<'info, UserMetadata>,
    pub candy_machine: Account<'info, CandyMachine>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExecuteUserWithdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: ProgramAccount<'info, ClimaxController>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), AUTH_PDA_SEED],
        bump,
        )]
    pub auth_pda: Account<'info, AuthAccount>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), TOKEN_ACCOUNT_PDA_SEED],
        bump,
        )]
    pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), signer.key().as_ref(), USER_PDA_SEED],
        bump)]
    pub user_metadata_pda: Account<'info, UserMetadata>,
    pub wsol_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub proposed_receiver: AccountInfo<'info>, //TODO get wsol ATA for signer
    pub candy_machine: Account<'info, CandyMachine>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
//
// #[derive(Accounts)]
// pub struct ProposeMultisigWithdraw<'info> {
//     #[account(mut)]
//     pub signer: Signer<'info>,
//     #[account(
//         mut,
//         seeds = [AUTH_PDA_SEED],
//         bump)]
//     pub auth_pda: Account<'info, ClimaxController>,
//     #[account(
//         mut,
//         constraint = pool_wrapped_sol.owner == auth_pda.key(),
//         seeds = [WSOL_POOL_SEED],
//         bump)]
//     pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
//     #[account(
//         mut,
//         constraint = proposed_receiver.key() == auth_pda.proposed_receiver,
//         )]
//     pub proposed_receiver: AccountInfo<'info>,
//     pub wsol_mint: Box<Account<'info, Mint>>,
//     pub system_program: Program<'info, System>,
//     pub token_program: Program<'info, Token>,
// }
//
// #[derive(Accounts)]
// pub struct ApproveMultisigWithdraw<'info> {
//     #[account(mut)]
//     pub signer: Signer<'info>,
//     #[account(
//     mut,
//     seeds = [AUTH_PDA_SEED],
//     bump)]
//     pub auth_pda: Account<'info, ClimaxController>,
//     #[account(
//     mut,
//     constraint = pool_wrapped_sol.owner == auth_pda.key(),
//     seeds = [WSOL_POOL_SEED],
//     bump)]
//     pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
//     #[account(
//     mut,
//     constraint = proposed_receiver.key() == auth_pda.proposed_receiver,
//     )]
//     pub proposed_receiver: AccountInfo<'info>,
//     pub wsol_mint: Box<Account<'info, Mint>>,
//     pub system_program: Program<'info, System>,
//     pub token_program: Program<'info, Token>,
// }
//
// #[derive(Accounts)]
// pub struct ExecuteMultisigWithdraw<'info> {
//     #[account(mut)]
//     pub signer: Signer<'info>,
//     #[account(
//     mut,
//     seeds = [AUTH_PDA_SEED],
//     bump)]
//     pub auth_pda: Account<'info, ClimaxController>,
//     #[account(
//     mut,
//     constraint = pool_wrapped_sol.owner == auth_pda.key(),
//     seeds = [WSOL_POOL_SEED],
//     bump)]
//     pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
//     #[account(
//     mut,
//     constraint = proposed_receiver.key() == auth_pda.proposed_receiver,
//     )]
//     pub proposed_receiver: AccountInfo<'info>,
//     pub wsol_mint: Box<Account<'info, Mint>>,
//     pub system_program: Program<'info, System>,
//     pub token_program: Program<'info, Token>,
// }

#[account]
#[derive(Default)]
pub struct ClimaxController { //TODO calculate size
    // multisig params
    pub owners: Vec<Pubkey>,
    pub signers: Vec<bool>,
    pub signer_threshold: u64,
    // withdraw params
    pub proposed_receiver: Pubkey,
    pub proposed_amount: u64,
    pub proposal_is_active: bool,
    // tipping point params
    pub candy_machine_id: Pubkey,
    pub tipping_point_threshold: u64,
    pub mint_price: u64,
    pub end_timestamp: u64,
}

#[account]
#[derive(Default)]
pub struct AuthAccount { //TODO calculate size
    pub climax_controller_id: Pubkey,
}

#[account]
#[derive(Default)]
pub struct NftMetadata { //TODO calculate size
    pub candy_machine_id: Pubkey,
}

#[account]
#[derive(Default)]
pub struct UserMetadata { //TODO calculate size
    pub amount_paid: u64,
    pub amount_withdrawn: u64,
}

#[account]
#[derive(Default)]
pub struct CandyMachine {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub items_redeemed: u64,
    // pub data: CandyMachineData,
    // there's a borsh vec u32 denoting how many actual lines of data there are currently (eventually equals items available)
    // There is actually lines and lines of data after this but we explicitly never want them deserialized.
    // here there is a borsh vec u32 indicating number of bytes in bitmask array.
    // here there is a number of bytes equal to ceil(max_number_of_lines/8) and it is a bit mask used to figure out when to increment borsh vec u32
}

#[derive(Clone)]
pub struct MetaplexMetadata(spl_token_metadata::state::Metadata);

impl anchor_lang::AccountDeserialize for MetaplexMetadata {
    fn try_deserialize(buf: &mut &[u8]) -> std::result::Result<Self, ProgramError> {
        MetaplexMetadata::try_deserialize_unchecked(buf)
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> std::result::Result<Self, ProgramError> {
        let md = spl_token_metadata::utils::try_from_slice_checked(
            buf,
            spl_token_metadata::state::Key::MetadataV1,
            spl_token_metadata::state::MAX_METADATA_LEN)?;
        let metadata = MetaplexMetadata(md);
        Ok(metadata)
    }
}

impl AccountSerialize for MetaplexMetadata {
    fn try_serialize<W: Write>(&self, _writer: &mut W) -> std::result::Result<(), ProgramError> {
        // no-op
        Ok(())
    }
}

impl Owner for MetaplexMetadata {
    fn owner() -> Pubkey {
        spl_token_metadata::ID
    }
}

impl Deref for MetaplexMetadata {
    type Target = spl_token_metadata::state::Metadata;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[error]
pub enum ErrorCode {
    #[msg("Num owners exceeds max")]
    TooManyOwners,
    #[msg("CandyMachineId not listed as verified creator")]
    InvalidCandyMachineId,
    #[msg("Invalid metaplex metadata pda")]
    InvalidMetaplexMetadataPda,
    #[msg("User's funds already withdrawn")]
    FundsAlreadyWithdrawn,
    #[msg("Invalid auth pda")]
    InvalidAuthPda,
    #[msg("Mint succeeded so no withdrawls")]
    MintSucceededSoNoWithdrawls,
}

