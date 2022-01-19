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
let program_id = 'EV4PDhhYJNQbGHiecjtXy22fEuL9N5b6MfaR68jbBcpk'; // can also load from file as done with localKeypair below
let candy_machine = new PublicKey("4ZjwpMDakNNXQKNwUVahCLNZGkRsUFRkgQE9nT3mMaHW");
let owners = [localKeypair.publicKey, Keypair.generate().publicKey, Keypair.generate().publicKey];
let signer_threshold = 1;
let tipping_point_threshold = 2;
let tomorrow = Math.floor(Date.now() / 1000) + (60 * 60 * 24); // unix timestamp seconds
let end_timestamp = tomorrow;
let is_simulation = false;

// setup
const programId = new anchor.web3.PublicKey(program_id);
let wallet = new Wallet(localKeypair);
let opts = Provider.defaultOptions();
const network = clusterApiUrl('devnet');
let connection = new web3.Connection(network, opts.preflightCommitment);
let provider = new Provider(connection, wallet, opts);
let idl = JSON.parse(require('fs').readFileSync('./target/idl/climax_controller.json', 'utf8'));

function to_lamports(num_sol) {
    return Math.round(num_sol * 1e9);
}

async function test_manual_registration() {
    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
    const MINT_ADDY = new PublicKey("BbyN25jhDLxt8K2FAsZVE1hwJBeoN5QB8yMv8tKHBJGX");
    const USER_PDA_SEED = "user_pda_seed";
    const METADATA_PREFIX = "metadata";
    const NFT_PDA_SEED = "nft_registration_pda_seed";
    const CLIMAX_CONTROLLER_ID = new PublicKey("DKppV4hPioChD4kTyCtg4z68km86rRnDPeMtL7D2C4vj");
    // let idl = await anchor.Program.fetchIdl(programId, provider);
    const program = new anchor.Program(idl, programId, provider);

    const [user_pda] = await PublicKey.findProgramAddress(
        [CLIMAX_CONTROLLER_ID.toBuffer(), localKeypair.publicKey.toBuffer(), Buffer.from(USER_PDA_SEED)],
        program.programId
    );

    try {
      let userPdaInfo = await program.account.userMetadata.fetch(user_pda);
      console.log("got userpdainfo: ", userPdaInfo);
    }
    catch (e) {
      console.log("adding init user metadata pda instruction ");

        await program.rpc.initUserMetadataPda(
            {
                accounts: {
                    signer: localKeypair.publicKey,
                    climaxController: CLIMAX_CONTROLLER_ID,
                    userMetadataPda: user_pda,
                    systemProgram: SystemProgram.programId,
                },
                signers: [localKeypair], //TODO add back climax_controller
            }
        );
        console.log("initialized user metadata pda")
    }

    const [nft_metadata_pda] = await PublicKey.findProgramAddress(
        [Buffer.from(NFT_PDA_SEED), MINT_ADDY.toBuffer()],
        program.programId
    );

    const [metadata_pda] = await PublicKey.findProgramAddress(
        [Buffer.from(METADATA_PREFIX), TOKEN_METADATA_PROGRAM_ID.toBuffer(), MINT_ADDY.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
    );

    await program.rpc.registerNft(
        {
            accounts: {
                signer: localKeypair.publicKey,
                climaxController: CLIMAX_CONTROLLER_ID,
                nftMint: MINT_ADDY,
                nftMetadataPda: nft_metadata_pda,
                metaplexMetadataPda: metadata_pda,
                userMetadataPda: user_pda,
                candyMachine: candy_machine, // our specific candy machine
                systemProgram: SystemProgram.programId,
            },
            signers: [localKeypair], //TODO add back climax_controller
        }
    );

    console.log("registered nft");


}

async function initialize_climax_controller() {

    // init program
    // let idl = await anchor.Program.fetchIdl(programId, provider);
    let climax_controller = Keypair.generate();
    console.log("initializeing cc: ", climax_controller.publicKey.toString());
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
            signers: [localKeypair, climax_controller], //TODO add back climax_controller
        }
    );

    console.log("initialized climax controller with pd: ", climax_controller.publicKey.toString());
    console.log("token mint: ", WRAPPED_SOL_MINT.toString());
    console.log("token address: ", pool_wrapped_sol.toString());

    //TOOD dump this key data locally!
    let data = "climax controller id: " + climax_controller.publicKey.toString() + ", token mint: " + WRAPPED_SOL_MINT.toString() + ", token address: " + pool_wrapped_sol.toString();
    fs.writeFileSync('./devnet_tests/conf', data);
}

test_manual_registration()
    .then(value => {
        console.log("success with value: {}", value);
    })
    .catch(err => {
        console.error("got err: {}", err);
    });