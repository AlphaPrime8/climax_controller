// import * as anchor from "@project-serum/anchor";
// import { Program } from "@project-serum/anchor";
// import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
// import { TOKEN_PROGRAM_ID, Token, NATIVE_MINT } from "@solana/spl-token";
// import { ClimaxController } from '../target/types/climax_controller';
// import {WRAPPED_SOL_MINT} from "@project-serum/serum/lib/token-instructions";
//
// const TEST_COUNTER_EXAMPLE = false;
// const AUTH_PDA_SEED = "auth_pda_seeds";
// const WSOL_POOL_SEED = "pool_wrapped_sol_seeds";
//
// function to_lamports(num_sol) {
//     return Math.round(num_sol * 1e9);
// }
//
// describe("climax_controller", () => {
//
//     // load connection params
//     const provider = anchor.Provider.env();
//     anchor.setProvider(provider);
//     const program = anchor.workspace.ClimaxController as Program<ClimaxController>;
//
//     // account variables
//     let wrappedSolAta: PublicKey = null;
//     let authPda: PublicKey = null;
//     let metadata_pda: PublicKey = null;
//     const owner1 = Keypair.generate();
//     const owner2 = Keypair.generate();
//     const owner3 = Keypair.generate();
//     const candy_machine = Keypair.generate();
//     let auth_pda = null;
//     let mintA = null;
//     let pool_wrapped_sol = null;
//
//     // console.log("owner1 pk: ", owner1.publicKey.toString());
//     // console.log("candy_machine pk: ", candy_machine.publicKey.toString());
//
//     it("Create test accounts, wrap sol, lookup PDAs.", async () => {
//
//         // Airdropping tokens to a payer.
//         await provider.connection.confirmTransaction(
//             await provider.connection.requestAirdrop(owner1.publicKey, to_lamports(10)),
//             "confirmed"
//         );
//
//     });
//
//     it("Simulate Create Candy Machine", async () => {
//
//
//         await program.rpc.simulateCreateCandyMachine(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     candyMachine: candy_machine.publicKey,
//                     systemProgram: SystemProgram.programId,
//                     rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//                 },
//                 signers: [owner1, candy_machine],
//             }
//         );
//
//     });
//
//     it("Test load candy machine", async () => {
//
//
//         await program.rpc.testLoadCandyMachine(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     candyMachine: candy_machine.publicKey,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//     });
//
//     it("Test create simulated metadata", async () => {
//
//         // create mint and nft
//         mintA = await Token.createMint(
//             provider.connection,
//             owner1,
//             owner1.publicKey,
//             null,
//             0,
//             TOKEN_PROGRAM_ID
//         );
//         let initializerTokenAccountA = await mintA.createAccount(
//             owner1.publicKey
//         );
//         await mintA.mintTo(
//             initializerTokenAccountA,
//             owner1.publicKey,
//             [owner1],
//             1
//         );
//
//         const METADATA_PREFIX = "metadata";
//         [metadata_pda] = await PublicKey.findProgramAddress(
//             [Buffer.from(METADATA_PREFIX), program.programId.toBuffer(), mintA.publicKey.toBuffer()],
//             program.programId
//         );
//
//         await program.rpc.simulateCreateMetadata(
//             candy_machine.publicKey,
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     metadata: metadata_pda,
//                     nftMint: mintA.publicKey,
//                     systemProgram: SystemProgram.programId,
//                     rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//     });
//
//     it("Test load metadata", async () => {
//
//         await program.rpc.testLoadMetadata(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     metadata: metadata_pda,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//     });
//
//     let climax_controller = null;
//
//     it("Test Initialize climax controller", async () => {
//
//         let owners = [owner1.publicKey, owner2.publicKey, owner3.publicKey]; // TODO test all 10 owners
//         let signer_threshold = 1;
//         let tipping_point_threshold = to_lamports(100);
//         // let end_timestamp = Math.floor(Date.now() / 1000) + (60 * 60 * 24); // unix timestamp seconds
//         let end_timestamp = 0;
//         let is_simulation = true;
//
//         climax_controller = Keypair.generate();
//         const AUTH_PDA_SEED = "auth_pda_seed";
//         [auth_pda] = await PublicKey.findProgramAddress(
//             [climax_controller.publicKey.toBuffer(), Buffer.from(AUTH_PDA_SEED)],
//             program.programId
//         );
//         const TOKEN_ACCOUNT_PDA_SEED = "token_account_pda_seed";
//         [pool_wrapped_sol] = await PublicKey.findProgramAddress(
//             [climax_controller.publicKey.toBuffer(), Buffer.from(TOKEN_ACCOUNT_PDA_SEED)],
//             program.programId
//         );
//
//         // console.log("initializing climax controller with pk: ", climax_controller.publicKey.toString());
//
//         await program.rpc.initializeClimaxController(
//             owners,
//             new anchor.BN(signer_threshold),
//             candy_machine.publicKey,
//             new anchor.BN(tipping_point_threshold),
//             new anchor.BN(end_timestamp),
//             is_simulation,
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     authPda: auth_pda,
//                     poolWrappedSol: pool_wrapped_sol,
//                     wsolMint: WRAPPED_SOL_MINT,
//                     systemProgram: SystemProgram.programId,
//                     tokenProgram: TOKEN_PROGRAM_ID,
//                     rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//                 },
//                 signers: [owner1, climax_controller],
//             }
//         );
//
//     });
//
//     it("Test Initialize user metadata pda", async () => {
//
//         const USER_PDA_SEED = "user_pda_seed";
//         const [user_pda] = await PublicKey.findProgramAddress(
//             [climax_controller.publicKey.toBuffer(), owner1.publicKey.toBuffer(), Buffer.from(USER_PDA_SEED)],
//             program.programId
//         );
//
//         // console.log("initializing climax controller with pk: ", climax_controller.publicKey.toString());
//
//         await program.rpc.initUserMetadataPda(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     userMetadataPda: user_pda,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//     });
//
//     it("Test register NFT", async () => {
//
//         const NFT_PDA_SEED = "nft_registration_pda_seed";
//         const [nft_metadata_pda] = await PublicKey.findProgramAddress(
//             [Buffer.from(NFT_PDA_SEED), mintA.publicKey.toBuffer()],
//             program.programId
//         );
//
//         const USER_PDA_SEED = "user_pda_seed";
//         const [user_pda] = await PublicKey.findProgramAddress(
//             [climax_controller.publicKey.toBuffer(), owner1.publicKey.toBuffer(), Buffer.from(USER_PDA_SEED)],
//             program.programId
//         );
//
//         // console.log("initializing climax controller with pk: ", climax_controller.publicKey.toString());
//         // console.log("candymachine pubkey: ", candy_machine.publicKey.toString());
//
//         await program.rpc.registerNft(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     nftMint: mintA.publicKey,
//                     nftMetadataPda: nft_metadata_pda,
//                     metaplexMetadataPda: metadata_pda,
//                     userMetadataPda: user_pda,
//                     candyMachine: candy_machine.publicKey,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//     });
//
//     it("Transfer wrapped sol to PDA for wrapped sol", async () => {
//
//         // check balance
//         let nativeMint = new Token(provider.connection, NATIVE_MINT, TOKEN_PROGRAM_ID, owner1);
//         let acctInfo = await nativeMint.getAccountInfo(pool_wrapped_sol);
//         // console.log("got amount before: ", acctInfo.amount.toNumber());
//
//         wrappedSolAta = await Token.createWrappedNativeAccount(provider.connection, TOKEN_PROGRAM_ID, owner1.publicKey, owner1, to_lamports(5));
//
//         // lookup ATA for PDA
//         const instructions: anchor.web3.TransactionInstruction[] = [];
//
//         // send wrapped sol
//         instructions.push(
//             Token.createTransferInstruction(
//                 TOKEN_PROGRAM_ID,
//                 wrappedSolAta,
//                 pool_wrapped_sol,
//                 owner1.publicKey,
//                 [],
//                 to_lamports(2),
//             )
//         );
//
//         const transaction = new anchor.web3.Transaction().add(...instructions);
//         transaction.feePayer = owner1.publicKey;
//         transaction.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
//
//         await anchor.web3.sendAndConfirmTransaction(
//             provider.connection,
//             transaction,
//             [owner1]
//         );
//
//         acctInfo = await nativeMint.getAccountInfo(pool_wrapped_sol);
//         // console.log("got amount after: ", acctInfo.amount.toNumber());
//
//     });
//
//     it("Test execute withdraw", async () => {
//
//         const NFT_PDA_SEED = "nft_registration_pda_seed";
//         const [nft_metadata_pda] = await PublicKey.findProgramAddress(
//             [Buffer.from(NFT_PDA_SEED), mintA.publicKey.toBuffer()],
//             program.programId
//         );
//
//         const USER_PDA_SEED = "user_pda_seed";
//         const [user_pda] = await PublicKey.findProgramAddress(
//             [climax_controller.publicKey.toBuffer(), owner1.publicKey.toBuffer(), Buffer.from(USER_PDA_SEED)],
//             program.programId
//         );
//
//
//         // console.log("initializing climax controller with pk: ", climax_controller.publicKey.toString());
//         // console.log("candymachine pubkey: ", candy_machine.publicKey.toString());
//
//         await program.rpc.executeUserWithdraw(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     authPda: auth_pda,
//                     poolWrappedSol: pool_wrapped_sol,
//                     userMetadataPda: user_pda,
//                     wsolMint: WRAPPED_SOL_MINT,
//                     proposedReceiver: wrappedSolAta,
//                     candyMachine: candy_machine.publicKey,
//                     systemProgram: SystemProgram.programId,
//                     tokenProgram: TOKEN_PROGRAM_ID,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//     });
//
//     it("Propose withdraw", async () => {
//
//         // lookup amount in pool pda
//         let proposed_amount = 1;
//
//         await program.rpc.proposeMultisigWithdraw(
//             new anchor.BN(to_lamports(proposed_amount)),
//             wrappedSolAta,
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     poolWrappedSol: pool_wrapped_sol,
//                     wsolMint: NATIVE_MINT,
//                     systemProgram: SystemProgram.programId,
//                     tokenProgram: TOKEN_PROGRAM_ID,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//         // load PDA state
//         let climaxControllerInfo = await program.account.climaxController.fetch(climax_controller.publicKey);
//         // console.log("got auth pda info: ", climaxControllerInfo);
//     });
//
//     it("Approve withdraw", async () => {
//
//         // lookup amount in pool pda
//         let proposed_amount = 1;
//
//         await program.rpc.approveMultisigWithdraw(
//             new anchor.BN(to_lamports(proposed_amount)),
//             wrappedSolAta,
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     systemProgram: SystemProgram.programId,
//                 },
//                 signers: [owner1],
//             }
//         );
//
//         // load PDA state
//         let climaxControllerInfo = await program.account.climaxController.fetch(climax_controller.publicKey);
//         // console.log("got auth pda info: ", climaxControllerInfo);
//     });
//
//     it("Test execute multisig withdraw", async () => {
//
//         await program.rpc.executeMultisigWithdraw(
//             {
//                 accounts: {
//                     signer: owner1.publicKey,
//                     climaxController: climax_controller.publicKey,
//                     poolWrappedSol: pool_wrapped_sol,
//                     proposedReceiver: wrappedSolAta,
//                     authPda: auth_pda,
//                     wsolMint: WRAPPED_SOL_MINT,
//                     candyMachine: candy_machine.publicKey,
//                     systemProgram: SystemProgram.programId,
//                     tokenProgram: TOKEN_PROGRAM_ID,
//                 },
//                 signers: [owner1],
//             }
//         );
//     });
//
//     it("Test if anyone other than rohdel reads fine print", async () => {
//
//     });
//
//     // if (TEST_COUNTER_EXAMPLE) {
//     //
//     //     it("Test withdraw without approval", async () => {
//     //
//     //         try {
//     //             await program.rpc.executeWithdraw(
//     //                 {
//     //                     accounts: {
//     //                         signer: owner1.publicKey,
//     //                         authPda: authPda,
//     //                         poolWrappedSol: poolWrappedSol,
//     //                         proposedReceiver: wrappedSolAta,
//     //                         wsolMint: NATIVE_MINT,
//     //                         systemProgram: SystemProgram.programId,
//     //                         tokenProgram: TOKEN_PROGRAM_ID,
//     //                     },
//     //                     signers: [owner1],
//     //                 }
//     //             );
//     //
//     //             throw "withdraw should have failed";
//     //         } catch (err) {
//     //             console.log("Properly failed with error : ", err.msg);
//     //         }
//     //
//     //     });
//     // }
//
// });
