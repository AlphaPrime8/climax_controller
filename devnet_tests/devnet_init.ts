// run with: npx ts-node devnet_tests/devnet_init.ts
const fs = require('fs');
import {Keypair, clusterApiUrl, SystemProgram, PublicKey} from "@solana/web3.js";
import {Provider, Wallet, web3} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import {NATIVE_MINT, TOKEN_PROGRAM_ID, Token, ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {WRAPPED_SOL_MINT} from "@project-serum/serum/lib/token-instructions";
const metaplex = require("@metaplex/js");

// consts
const AUTH_PDA_SEED = "auth_pda_seed";
const TOKEN_ACCOUNT_PDA_SEED = "token_account_pda_seed";

// CONFIG
const localKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(require("fs").readFileSync("/home/myware/.config/solana/mainnet.json", {encoding: "utf-8",}))));
let program_id = '4c5pK4aj8vUnnSgH7bmm1yXBjU9ANNCmGk1wG24uVrYp'; // can also load from file as done with localKeypair below
let climax_controller = Keypair.generate();
let candy_machine = new PublicKey("CwgDnMdqrzcRUngoUnEx73DPXsEVsab8Gw6a1iBHNbfa");
let owners = [localKeypair.publicKey, Keypair.generate().publicKey, Keypair.generate().publicKey];
let signer_threshold = 1;
let tipping_point_threshold = 2;
let tomorrow = Math.floor(Date.now() / 1000) + (60 * 60 * 24); // unix timestamp seconds
let end_timestamp = tomorrow;
let is_simulation = true;

// setup
const programId = new anchor.web3.PublicKey(program_id);
let wallet = new Wallet(localKeypair);
let opts = Provider.defaultOptions();
const network = clusterApiUrl('devnet');
let connection = new web3.Connection(network, opts.preflightCommitment);
let provider = new Provider(connection, wallet, opts);
// let idl = JSON.parse(require('fs').readFileSync('./target/idl/climax_controller.json', 'utf8'));

function to_lamports(num_sol) {
    return Math.round(num_sol * 1e9);
}

async function initialize_climax_controller() {

    // init program
    let idl = await anchor.Program.fetchIdl(programId, provider);
    const program = new anchor.Program(idl, programId, provider);
    console.log('loaded local wallet: %s', localKeypair.publicKey.toString());
    console.log("ProgramID: %s == program.program_id: %s", programId.toString(), program.programId.toString());

    // lookup pdas
    const [auth_pda] = await PublicKey.findProgramAddress(
        [climax_controller.publicKey.toBuffer(), Buffer.from(AUTH_PDA_SEED)],
        program.programId
    );
    const [pool_wrapped_sol] = await PublicKey.findProgramAddress(
        [climax_controller.publicKey.toBuffer(), Buffer.from(TOKEN_ACCOUNT_PDA_SEED)],
        program.programId
    );

    await program.rpc.initializeClimaxController(
        owners,
        new anchor.BN(signer_threshold),
        candy_machine,
        new anchor.BN(tipping_point_threshold),
        new anchor.BN(end_timestamp),
        is_simulation,
        {
            accounts: {
                signer: localKeypair.publicKey,
                climaxController: climax_controller.publicKey,
                authPda: auth_pda,
                poolWrappedSol: pool_wrapped_sol,
                wsolMint: WRAPPED_SOL_MINT,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [localKeypair, climax_controller],
        }
    );

    console.log("initialized climax controller with pd: ", climax_controller.publicKey.toString());
    console.log("token mint: ", WRAPPED_SOL_MINT.toString());
    console.log("token address: ", pool_wrapped_sol.toString());

    //TOOD dump this key data locally!
    let data = "climax controller id: " + climax_controller.publicKey.toString() + ", token mint: " + WRAPPED_SOL_MINT.toString() + ", token address: " + pool_wrapped_sol.toString();
    fs.writeFileSync('./devnet_tests/conf', data);
}

initialize_climax_controller()
    .then(value => {
        console.log("success with value: {}", value);
    })
    .catch(err => {
        console.error("got err: {}", err);
    });