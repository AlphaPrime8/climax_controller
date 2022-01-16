const EXPECTED_CREATOR = '5aWNmcpfP9rUjEFkXFpFaxu6gnpWvBXeHLcxkseP4r8W';
const VAULT_PDA_SEED = 'vault';
const USER_PDA_SEED = "user";
const PEACH_EARNED_PER_SECOND = 0.5351562553515626;
const SECONDS_PER_DAY = 60*60*24;

const AUTH_PDA_SEED = "auth_pda_seeds";
const WSOL_POOL_SEED = "pool_wrapped_sol_seeds";

const DEFAULT_MULTISIG_STATE = {
    treasury_balance: 0,
    is_officer_arr: [],
    owners_arr: [],
    signers_arr: [],
    officer_threshold: 0,
    total_threshold: 0,
    proposal_is_active: false,
    proposed_amount: 0,
    proposed_receiver: '',
}

export {EXPECTED_CREATOR, VAULT_PDA_SEED, PEACH_EARNED_PER_SECOND, SECONDS_PER_DAY, USER_PDA_SEED, AUTH_PDA_SEED, WSOL_POOL_SEED, DEFAULT_MULTISIG_STATE};

//example ata EqRNTgYSiVNs8Je5GurTzxZBbc78oLFXj1Kdw22wPJAa
// example ata bela: 58vHLXMKajQuMZZXQqDEZUkdXMeL159cJgeGfMZoqQV6

