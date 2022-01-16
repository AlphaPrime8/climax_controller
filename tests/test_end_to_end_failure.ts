import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token, NATIVE_MINT } from "@solana/spl-token";
import { ClimaxController } from '../target/types/climax_controller';
import {WRAPPED_SOL_MINT} from "@project-serum/serum/lib/token-instructions";

// consts
const AUTH_PDA_SEED = "auth_pda_seed";
const TOKEN_ACCOUNT_PDA_SEED = "token_account_pda_seed";
const USER_PDA_SEED = "user_pda_seed";
const METADATA_PREFIX = "metadata";
const NFT_PDA_SEED = "nft_registration_pda_seed";

// load connection params
const provider = anchor.Provider.env();
anchor.setProvider(provider);
const program = anchor.workspace.ClimaxController as Program<ClimaxController>;

// account variables
let wrapped_sol_ata: PublicKey = null;
let metadata_pda: PublicKey = null;
const owner1 = Keypair.generate();
const owner2 = Keypair.generate();
const owner3 = Keypair.generate();
const candy_machine = Keypair.generate();
let climax_controller = Keypair.generate();
let auth_pda = null;
let user_pda = null;
let mintA = null;
let pool_wrapped_sol = null;

describe("climax_controller", () => {

    it("Setup accounts", async () => {

        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(owner1.publicKey, to_lamports(10)),
            "confirmed"
        );

        // lookup pdas
        [auth_pda] = await PublicKey.findProgramAddress(
            [climax_controller.publicKey.toBuffer(), Buffer.from(AUTH_PDA_SEED)],
            program.programId
        );
        [pool_wrapped_sol] = await PublicKey.findProgramAddress(
            [climax_controller.publicKey.toBuffer(), Buffer.from(TOKEN_ACCOUNT_PDA_SEED)],
            program.programId
        );
        [user_pda] = await PublicKey.findProgramAddress(
            [climax_controller.publicKey.toBuffer(), owner1.publicKey.toBuffer(), Buffer.from(USER_PDA_SEED)],
            program.programId
        );

    });

    it("Simulate Create Candy Machine", async () => {
        await program.rpc.simulateCreateCandyMachine(
            {
                accounts: {
                    signer: owner1.publicKey,
                    candyMachine: candy_machine.publicKey,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                },
                signers: [owner1, candy_machine],
            }
        );
    });

    it("Test Initialize climax controller", async () => {

        let owners = [owner1.publicKey, owner2.publicKey, owner3.publicKey];
        let signer_threshold = 3;
        let tipping_point_threshold = to_lamports(100);
        let yesterday = Math.floor(Date.now() / 1000) - (60 * 60 * 24); // unix timestamp seconds
        let end_timestamp = yesterday;
        let is_simulation = true;

        await program.rpc.initializeClimaxController(
            owners,
            new anchor.BN(signer_threshold),
            candy_machine.publicKey,
            new anchor.BN(tipping_point_threshold),
            new anchor.BN(end_timestamp),
            is_simulation,
            {
                accounts: {
                    signer: owner1.publicKey,
                    climaxController: climax_controller.publicKey,
                    authPda: auth_pda,
                    poolWrappedSol: pool_wrapped_sol,
                    wsolMint: WRAPPED_SOL_MINT,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                },
                signers: [owner1, climax_controller],
            }
        );

    });

    it("Simulate mint and metadata creation", async () => {

        // crete a user metadata account to aggregate all their purchases
        await program.rpc.initUserMetadataPda(
            {
                accounts: {
                    signer: owner1.publicKey,
                    climaxController: climax_controller.publicKey,
                    userMetadataPda: user_pda,
                    systemProgram: SystemProgram.programId,
                },
                signers: [owner1],
            }
        );

        // create nft and metaplex metadata account as would occur in candy_machine mint
        mintA = await Token.createMint(
            provider.connection,
            owner1,
            owner1.publicKey,
            null,
            0,
            TOKEN_PROGRAM_ID
        );
        let initializerTokenAccountA = await mintA.createAccount(
            owner1.publicKey
        );
        await mintA.mintTo(
            initializerTokenAccountA,
            owner1.publicKey,
            [owner1],
            1
        );

        // pda will use this climax_controller id instead of spl_metadata since its simulated
        [metadata_pda] = await PublicKey.findProgramAddress(
            [Buffer.from(METADATA_PREFIX), program.programId.toBuffer(), mintA.publicKey.toBuffer()],
            program.programId
        );

        await program.rpc.simulateCreateMetadata(
            candy_machine.publicKey,
            {
                accounts: {
                    signer: owner1.publicKey,
                    metadata: metadata_pda,
                    nftMint: mintA.publicKey,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                },
                signers: [owner1],
            }
        );
    });

    it("Transfer wrapped sol to PDA as candy_machine would", async () => {

        // check balance
        // let nativeMint = new Token(provider.connection, NATIVE_MINT, TOKEN_PROGRAM_ID, owner1);
        // let acctInfo = await nativeMint.getAccountInfo(pool_wrapped_sol);
        // console.log("got amount before: ", acctInfo.amount.toNumber());

        wrapped_sol_ata = await Token.createWrappedNativeAccount(provider.connection, TOKEN_PROGRAM_ID, owner1.publicKey, owner1, to_lamports(5));

        // lookup ATA for PDA
        const instructions: anchor.web3.TransactionInstruction[] = [];

        // send wrapped sol
        instructions.push(
            Token.createTransferInstruction(
                TOKEN_PROGRAM_ID,
                wrapped_sol_ata,
                pool_wrapped_sol,
                owner1.publicKey,
                [],
                to_lamports(1), // this should be >= default price initialized in simulated candy_machine
            )
        );

        const transaction = new anchor.web3.Transaction().add(...instructions);
        transaction.feePayer = owner1.publicKey;
        transaction.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;

        await anchor.web3.sendAndConfirmTransaction(
            provider.connection,
            transaction,
            [owner1]
        );

        // acctInfo = await nativeMint.getAccountInfo(pool_wrapped_sol);
        // console.log("got amount after: ", acctInfo.amount.toNumber());

    });

    it("Test register NFT", async () => {

        const [nft_metadata_pda] = await PublicKey.findProgramAddress(
            [Buffer.from(NFT_PDA_SEED), mintA.publicKey.toBuffer()],
            program.programId
        );

        await program.rpc.registerNft(
            {
                accounts: {
                    signer: owner1.publicKey,
                    climaxController: climax_controller.publicKey,
                    nftMint: mintA.publicKey,
                    nftMetadataPda: nft_metadata_pda,
                    metaplexMetadataPda: metadata_pda,
                    userMetadataPda: user_pda,
                    candyMachine: candy_machine.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [owner1],
            }
        );
    });


    it("Test execute withdraw", async () => {

        await program.rpc.executeUserWithdraw(
            {
                accounts: {
                    signer: owner1.publicKey,
                    climaxController: climax_controller.publicKey,
                    authPda: auth_pda,
                    poolWrappedSol: pool_wrapped_sol,
                    userMetadataPda: user_pda,
                    wsolMint: WRAPPED_SOL_MINT,
                    proposedReceiver: wrapped_sol_ata,
                    candyMachine: candy_machine.publicKey,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
                signers: [owner1],
            }
        );

    });
});

// utils
function to_lamports(num_sol) {
    return Math.round(num_sol * 1e9);
}