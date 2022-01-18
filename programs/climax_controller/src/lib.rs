use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use spl_token_metadata;
use nft_candy_machine::{CandyMachine, CandyMachineData};
use solana_program::program::{invoke, invoke_signed};
use solana_program::system_instruction::create_account;
use spl_token::solana_program::clock::UnixTimestamp;

declare_id!("4c5pK4aj8vUnnSgH7bmm1yXBjU9ANNCmGk1wG24uVrYp");

// config
const TOKEN_ACCOUNT_PDA_SEED: &[u8] = b"token_account_pda_seed";
const NFT_PDA_SEED: &[u8] = b"nft_registration_pda_seed";
const USER_PDA_SEED: &[u8] = b"user_pda_seed";
const AUTH_PDA_SEED: &[u8] = b"auth_pda_seed";
const METADATA_PREFIX: &[u8] = b"metadata";
const MAX_OWNERS: usize = 10;

#[program]
pub mod climax_controller {

    use super::*;

    pub fn initialize_climax_controller(
        ctx: Context<InitializeClimaxController>,
        owners: Vec<Pubkey>,
        signer_threshold: u64,
        candy_machine_id: Pubkey,
        tipping_point_threshold: u64,
        end_timestamp: u64,
        is_simulation: bool,
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
        climax_controller.num_registered = 0;

        // testing
        climax_controller.is_simulation = is_simulation;

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

        // check that (num_registered + 1) is <= num_minted in candy_machine
        let candy_machine = deser_candy_machine(&ctx.accounts.candy_machine, ctx.accounts.climax_controller.is_simulation)?;
        if (ctx.accounts.climax_controller.num_registered + 1) > candy_machine.items_redeemed {
            return Err(ErrorCode::TooManyRegistrations.into());
        }

        // manually lookup metaplex metadata pda and ensure match with address
        let metadata_program_id: Pubkey = if ctx.accounts.climax_controller.is_simulation {
            ID
        } else {
            spl_token_metadata::ID
        };
        let nft_mint = &ctx.accounts.nft_mint.key();
        let metadata_seeds = &[
            METADATA_PREFIX,
            metadata_program_id.as_ref(),
            nft_mint.as_ref(),
        ];
        let (metaplex_metadata_pda, _bump) = Pubkey::find_program_address(metadata_seeds, &metadata_program_id);
        if metaplex_metadata_pda != ctx.accounts.metaplex_metadata_pda.key() {
            return Err(ErrorCode::InvalidMetaplexMetadataPda.into());
        }

        // verify that our candy_machine_id is a verified creator in metaplex metadata pda
        let metadata = deser_metadata(&ctx.accounts.metaplex_metadata_pda, ctx.accounts.climax_controller.is_simulation)?;
        let creators_vec = metadata.data.creators.as_ref().unwrap();
        let creator_pubkey = ctx.accounts.climax_controller.candy_machine_id.to_string();
        if !creators_vec.iter().any(|c| (c.address.to_string() == creator_pubkey) && c.verified) {
            return Err(ErrorCode::InvalidCandyMachineId.into());
        }

        // initialize nft pda
        ctx.accounts.nft_metadata_pda.candy_machine_id = ctx.accounts.climax_controller.candy_machine_id;

        // update user pda
        let current_mint_price = candy_machine.data.price;
        ctx.accounts.user_metadata_pda.amount_paid += current_mint_price;
        ctx.accounts.climax_controller.num_registered += 1;

        Ok(())
    }

    pub fn execute_user_withdraw(
        ctx: Context<ExecuteUserWithdraw>,
    ) -> ProgramResult {

        // deserialize candy machine account
        let candy_machine = deser_candy_machine(&ctx.accounts.candy_machine, ctx.accounts.climax_controller.is_simulation)?;

        // check if candymachine has reached threshold
        let threshold_reached = candy_machine.items_redeemed >= ctx.accounts.climax_controller.tipping_point_threshold;
        let now_ts = Clock::get().unwrap().unix_timestamp;
        let mint_still_active = now_ts < ctx.accounts.climax_controller.end_timestamp as UnixTimestamp;
        if threshold_reached || mint_still_active {
            return Err(ErrorCode::MintStillActiveOrSucceeded.into());
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

    pub fn propose_multisig_withdraw(
        ctx: Context<ProposeMultisigWithdraw>,
        proposed_amount: u64,
        proposed_receiver: Pubkey,
    ) -> ProgramResult {

        // check if signer is owner
        let climax_controller = &ctx.accounts.climax_controller;
        let owner_index = climax_controller
            .owners
            .iter()
            .position(|a| a == ctx.accounts.signer.key)
            .ok_or(ErrorCode::InvalidOwner)?;

        // check if amount of proposed amount is available in treasury
        if proposed_amount > ctx.accounts.pool_wrapped_sol.amount {
            return Err(ErrorCode::InsufficientBalance.into());
        }

        // reset state
        let climax_controller = &mut ctx.accounts.climax_controller;
        for i in 0..climax_controller.owners.len(){
            if i == owner_index {
                climax_controller.signers[i] = true;
            } else {
                climax_controller.signers[i] = false;
            }
        }

        // set params
        climax_controller.proposal_is_active = true;
        climax_controller.proposed_receiver = proposed_receiver;
        climax_controller.proposed_amount = proposed_amount;

        Ok(())
    }

    pub fn approve_multisig_withdraw(
        ctx: Context<ApproveMultisigWithdraw>,
        proposed_amount: u64,
        proposed_receiver: Pubkey,
    ) -> ProgramResult {

        // check if proposal is active
        let climax_controller = &ctx.accounts.climax_controller;
        if !climax_controller.proposal_is_active {
            return Err(ErrorCode::ProposalNotActive.into());
        }

        // check if signer is owner
        let owner_index = climax_controller
            .owners
            .iter()
            .position(|a| a == ctx.accounts.signer.key)
            .ok_or(ErrorCode::InvalidOwner)?;

        // check if proposal params match expected
        if (proposed_amount != climax_controller.proposed_amount) || (proposed_receiver != climax_controller.proposed_receiver) {
            return Err(ErrorCode::ProposalMismatch.into());
        }

        // set signer vec to true
        ctx.accounts.climax_controller.signers[owner_index] = true;

        Ok(())
    }

    pub fn execute_multisig_withdraw(
        ctx: Context<ExecuteMultisigWithdraw>,
    ) -> ProgramResult {

        // check that tipping point has succeeded
        let candy_machine = deser_candy_machine(&ctx.accounts.candy_machine, ctx.accounts.climax_controller.is_simulation)?;
        let threshold_reached = candy_machine.items_redeemed >= ctx.accounts.climax_controller.tipping_point_threshold;
        if !threshold_reached {
            return Err(ErrorCode::MintThresholdNotReached.into());
        }

        // check proposal is active
        let climax_controller = &ctx.accounts.climax_controller;
        if !climax_controller.proposal_is_active {
            return Err(ErrorCode::ProposalNotActive.into());
        }

        // calculate total signers and ensure meets threshold
        let mut num_signers = 0;
        for i in 0..climax_controller.owners.len() {
            if climax_controller.signers[i] {
                num_signers += 1;
            }
        }
        if num_signers < climax_controller.signer_threshold {
            return Err(ErrorCode::NotEnoughSignersApproved.into());
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
        token::transfer(cpi_ctx, climax_controller.proposed_amount)?;

        // set inactive
        ctx.accounts.climax_controller.proposal_is_active = false;

        Ok(())
    }

    // The following instructions are for local testing purposes only
    // Set climax_controller.is_simulation = true to use them in tests
    pub fn simulate_create_candy_machine(
        ctx: Context<SimulateCreateCandyMachine>
    ) -> ProgramResult {

        // init candy machine struct
        let data = CandyMachineData {
            price: 1000000000,
            ..Default::default()
        };
        let candy_machine = CandyMachine {
            data,
            authority: Pubkey::default(),
            wallet: Pubkey::default(),
            token_mint: None,
            items_redeemed: 666,
        };
        let mut new_data: Vec<u8> = vec![51, 173, 177, 113, 25, 241, 109, 189]; // manually got discriminator, can also just hash("account:CandyMachine")[..8]
        new_data.append(&mut candy_machine.try_to_vec().unwrap());
        let space = new_data.len();

        // create account
        invoke(
            &create_account(
                ctx.accounts.signer.key,
                ctx.accounts.candy_machine.key,
                1.max(Rent::get()?.minimum_balance(space)),
                space as u64,
                &ID,
            ),
            &[
                ctx.accounts.signer.to_account_info().clone(),
                ctx.accounts.candy_machine.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone(),
            ],
        )?;

        // get account ref to fill in
        let candy_machine_account = &mut ctx.accounts.candy_machine;
        let mut data = candy_machine_account.data.borrow_mut();
        for i in 0..new_data.len() {
            data[i] = new_data[i];
        }

        Ok(())
    }

    pub fn simulate_create_metadata(
        ctx: Context<SimulateCreateMetadata>,
        candy_machine_id: Pubkey,
    ) -> ProgramResult {

        let space = spl_token_metadata::state::MAX_METADATA_LEN;

        // lookup and verify pda info
        let nft_mint = &ctx.accounts.nft_mint.key();
        let metadata_program_id: Pubkey = ID;
        let metadata_seeds = &[METADATA_PREFIX, metadata_program_id.as_ref(),nft_mint.as_ref()];
        let (pda, bump_seed) = Pubkey::find_program_address(metadata_seeds, &metadata_program_id);
        if pda != ctx.accounts.metadata.key() {
            panic!("wrong pda addy");
        }
        let metadata_seeds = &[METADATA_PREFIX, metadata_program_id.as_ref(),nft_mint.as_ref(), &[bump_seed]];
        let signer = &[&metadata_seeds[..]];

        // create pda
        invoke_signed(
            &create_account(
                ctx.accounts.signer.key,
                &pda,
                1.max(Rent::get()?.minimum_balance(space)),
                space as u64,
                &ID
            ),
            &[
                ctx.accounts.signer.to_account_info().clone(),
                ctx.accounts.metadata.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone(),
            ],
            signer
        )?;

        let creator = spl_token_metadata::state::Creator {
            address: candy_machine_id,
            verified: true,
            share: 1,
        };
        let creators = vec![creator];
        let mut metadata = spl_token_metadata::state::Metadata::from_account_info(&ctx.accounts.metadata)?;
        let data = spl_token_metadata::state::Data {
            name: "".to_string(),
            symbol: "".to_string(),
            uri: "wutup gangsta mein".to_string(),
            seller_fee_basis_points: 666,
            creators: Some(creators),
        };
        metadata.mint = ctx.accounts.nft_mint.key();
        metadata.key = spl_token_metadata::state::Key::MetadataV1;
        metadata.data = data;
        metadata.is_mutable = true;
        metadata.update_authority = ctx.accounts.signer.key();

        spl_token_metadata::utils::puff_out_data_fields(&mut metadata);
        metadata.serialize(&mut *ctx.accounts.metadata.try_borrow_mut_data().unwrap())?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeClimaxController<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = MAX_CLIMAX_CONTROLLER_LEN)]
    pub climax_controller: Account<'info, ClimaxController>,
    #[account(
        init,
        seeds = [climax_controller.key().as_ref(), AUTH_PDA_SEED],
        bump,
        payer = signer,
        space = 9)]
    pub auth_pda: Box<Account<'info, AuthAccount>>,
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
    pub climax_controller: Account<'info, ClimaxController>,
    #[account(
        init,
        seeds = [climax_controller.key().as_ref(), signer.key().as_ref(), USER_PDA_SEED],
        bump,
        payer = signer)]
    pub user_metadata_pda: Account<'info, UserMetadata>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: Account<'info, ClimaxController>,
    #[account(mut)] // TODO add Token::authrity = signer constraint, should be redundant to mut but double check
    pub nft_mint: Account<'info, Mint>,
    #[account(
        init,
        seeds = [NFT_PDA_SEED, nft_mint.key().as_ref()],
        bump,
        payer = signer)]
    pub nft_metadata_pda: Account<'info, NftMetadata>,
    pub metaplex_metadata_pda: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), signer.key().as_ref(), USER_PDA_SEED],
        bump)]
    pub user_metadata_pda: Account<'info, UserMetadata>,
    pub candy_machine: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteUserWithdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: Account<'info, ClimaxController>,
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
    pub proposed_receiver: AccountInfo<'info>,
    pub candy_machine: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ProposeMultisigWithdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: Account<'info, ClimaxController>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), TOKEN_ACCOUNT_PDA_SEED],
        bump)]
    pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
    pub wsol_mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApproveMultisigWithdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: Account<'info, ClimaxController>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteMultisigWithdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub climax_controller: Account<'info, ClimaxController>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), TOKEN_ACCOUNT_PDA_SEED],
        bump)]
    pub pool_wrapped_sol: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = proposed_receiver.key() == climax_controller.proposed_receiver)]
    pub proposed_receiver: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [climax_controller.key().as_ref(), AUTH_PDA_SEED],
        bump)]
    pub auth_pda: Account<'info, AuthAccount>,
    pub wsol_mint: Box<Account<'info, Mint>>,
    pub candy_machine: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SimulateCreateCandyMachine<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub candy_machine: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SimulateCreateMetadata<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub const MAX_CLIMAX_CONTROLLER_LEN: usize = 9 // discriminator + 1?
    + (32 * MAX_OWNERS) // owners
    + (1 * MAX_OWNERS) // signers
    + 8 // signer threshold
    + 32 // proposed_receiver
    + 8 // proposed_amount
    + 1 // proposal_is_active
    + 32 // candy_machine_id
    + 8 // tipping_point_threshold
    + 8 // end_timestamp
    + 8 // num_registered
    + 1; // is_simulation

#[account]
#[derive(Default)]
pub struct ClimaxController {
    // multisig params
    pub owners: Vec<Pubkey>, // max is 10
    pub signers: Vec<bool>,
    pub signer_threshold: u64,
    // withdraw params
    pub proposed_receiver: Pubkey,
    pub proposed_amount: u64,
    pub proposal_is_active: bool,
    // tipping point params
    pub candy_machine_id: Pubkey,
    pub tipping_point_threshold: u64, // num items redeemed
    pub end_timestamp: u64, // unix timestamp seconds
    pub num_registered: u64,
    // testing
    pub is_simulation: bool,
}

#[account]
#[derive(Default)]
pub struct AuthAccount {}

#[account]
#[derive(Default)]
pub struct NftMetadata {
    pub candy_machine_id: Pubkey,
}

#[account]
#[derive(Default)]
pub struct UserMetadata {
    pub amount_paid: u64, // lamports
    pub amount_withdrawn: u64, // lamports
}

// utils
pub fn deser_metadata(info: &AccountInfo, is_simulation: bool) -> core::result::Result<spl_token_metadata::state::Metadata, ProgramError> {
    check_owner(info, is_simulation)?;
    let data: &[u8] = &info.try_borrow_data()?;
    let md = spl_token_metadata::utils::try_from_slice_checked(
        data,
        spl_token_metadata::state::Key::MetadataV1,
        spl_token_metadata::state::MAX_METADATA_LEN)?;
    Ok(md)
}

pub fn deser_candy_machine(info: &AccountInfo, is_simulation: bool) -> core::result::Result<CandyMachine, ProgramError> {
    check_owner(info, is_simulation)?;
    let mut data: &[u8] = &info.try_borrow_data()?;
    let cm = CandyMachine::try_deserialize(&mut data)?;
    Ok(cm)
}

pub fn check_owner(info: &AccountInfo, is_simulation: bool) -> ProgramResult {
    let actual_owner = *info.owner;
    let expected_owner = if is_simulation {
        ID
    } else {
        spl_token_metadata::ID
    };
    if actual_owner != expected_owner {
        return Err(ErrorCode::TooManyOwners.into());
    }
    Ok(())
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
    #[msg("Mint succeeded or still active so no withdrawls")]
    MintStillActiveOrSucceeded,
    #[msg("The given owner is not part of this multisig")]
    InvalidOwner,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Proposal parameters do not match expected")]
    ProposalMismatch,
    #[msg("Not enough signers have approved")]
    NotEnoughSignersApproved,
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    #[msg("Too many registrations")]
    TooManyRegistrations,
    #[msg("Mint threshold not reached")]
    MintThresholdNotReached,
}