import {PublicKey} from "@solana/web3.js";

// defaults
const CANDY_MACHINE_PROGRAM_ID = new PublicKey("cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const CLIMAX_CONTROLLER_PROGRAM_ID = new PublicKey("EV4PDhhYJNQbGHiecjtXy22fEuL9N5b6MfaR68jbBcpk");
const DEFAULT_MULTISIG_STATE = {
    treasury_balance: 0,
    signer_threshold: 0,
    tipping_point_threshold: 0,
    current_mint_state: 0,
    hours_till_close: 0,
    multisig_withdraws_open: false,
    proposal_is_active: false,
    proposed_receiver: '',
    proposed_amount: 0,
    user_withdraws_open: false,
    user_addy: '',
    user_funds_paid: 0,
    user_funds_withdrawn: 0,
    owners_arr: [],
    signers_arr: [],
    sufficient_signers_have_approved: false,
}

export {DEFAULT_MULTISIG_STATE, CANDY_MACHINE_PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID, CLIMAX_CONTROLLER_PROGRAM_ID};