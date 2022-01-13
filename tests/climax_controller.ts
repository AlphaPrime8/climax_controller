import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token, NATIVE_MINT } from "@solana/spl-token";
import { ClimaxController } from '../target/types/climax_controller';

const TEST_COUNTER_EXAMPLE = false;
const AUTH_PDA_SEED = "auth_pda_seeds";
const WSOL_POOL_SEED = "pool_wrapped_sol_seeds";

function to_lamports(num_sol) {
    return Math.round(num_sol * 1e9);
}

describe("climax_controller", () => {

    // load connection params
    const provider = anchor.Provider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.ClimaxController as Program<ClimaxController>;

    // account variables
    let wrappedSolAta: PublicKey = null;
    let authPda: PublicKey = null;
    let poolWrappedSol: PublicKey = null; // lookup as pda or ata?
    const owner1 = Keypair.generate();
    const candy_machine = Keypair.generate();

    console.log("owner1 pk: ", owner1.publicKey.toString());
    console.log("candy_machine pk: ", candy_machine.publicKey.toString());

    it("Create test accounts, wrap sol, lookup PDAs.", async () => {

        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(owner1.publicKey, to_lamports(10)),
            "confirmed"
        );

        // // wrap sol
        // wrappedSolAta = await Token.createWrappedNativeAccount(provider.connection, TOKEN_PROGRAM_ID, owner1.publicKey, owner1, to_lamports(9));
        //
        // // lookup pdas
        // [authPda] = await PublicKey.findProgramAddress(
        //     [Buffer.from(anchor.utils.bytes.utf8.encode(AUTH_PDA_SEED))],
        //     program.programId
        // );
        //
        // [poolWrappedSol] = await PublicKey.findProgramAddress(
        //     [Buffer.from(anchor.utils.bytes.utf8.encode(WSOL_POOL_SEED))],
        //     program.programId
        // );

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

    it("Test load candy machine", async () => {


        await program.rpc.testLoadCandyMachine(
            {
                accounts: {
                    signer: owner1.publicKey,
                    candyMachine: candy_machine.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [owner1],
            }
        );

    });

    // it("Init PDAs", async () => {
    //
    //
    //     let owners = [owner1.publicKey, owner2.publicKey, owner3.publicKey];
    //     let is_officer = [true, false, false];
    //     let total_threshold = 3;
    //     let officer_threshold = 1;
    //
    //     await program.rpc.initPdas(
    //         owners,
    //         is_officer,
    //         new anchor.BN(total_threshold),
    //         new anchor.BN(officer_threshold),
    //         {
    //             accounts: {
    //                 signer: owner1.publicKey,
    //                 authPda: authPda,
    //                 poolWrappedSol: poolWrappedSol,
    //                 wsolMint: NATIVE_MINT,
    //                 systemProgram: SystemProgram.programId,
    //                 tokenProgram: TOKEN_PROGRAM_ID,
    //                 rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    //             },
    //             signers: [owner1],
    //         }
    //     );
    //
    // });
    //
    // it("Transfer wrapped sol to PDA for wrapped sol", async () => {
    //
    //     // check balance
    //     let nativeMint = new Token(provider.connection, NATIVE_MINT, TOKEN_PROGRAM_ID, owner1);
    //     let acctInfo = await nativeMint.getAccountInfo(poolWrappedSol);
    //     console.log("got amount before: ", acctInfo.amount.toNumber());
    //
    //
    //     // lookup ATA for PDA
    //     const instructions: anchor.web3.TransactionInstruction[] = [];
    //
    //     // send wrapped sol
    //     instructions.push(
    //         Token.createTransferInstruction(
    //             TOKEN_PROGRAM_ID,
    //             wrappedSolAta,
    //             poolWrappedSol,
    //             owner1.publicKey,
    //             [],
    //             to_lamports(8),
    //         )
    //     );
    //
    //     const transaction = new anchor.web3.Transaction().add(...instructions);
    //     transaction.feePayer = owner1.publicKey;
    //     transaction.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
    //
    //     await anchor.web3.sendAndConfirmTransaction(
    //         provider.connection,
    //         transaction,
    //         [owner1]
    //     );
    //
    //     acctInfo = await nativeMint.getAccountInfo(poolWrappedSol);
    //     console.log("got amount after: ", acctInfo.amount.toNumber());
    //
    // });
    //
    // it("Propose withdraw", async () => {
    //
    //     // lookup amount in pool pda
    //
    //     let proposed_amount = 5;
    //
    //     await program.rpc.proposeWithdraw(
    //         wrappedSolAta,
    //         new anchor.BN(to_lamports(proposed_amount)),
    //         {
    //             accounts: {
    //                 signer: owner2.publicKey,
    //                 authPda: authPda,
    //                 poolWrappedSol: poolWrappedSol,
    //                 systemProgram: SystemProgram.programId,
    //                 tokenProgram: TOKEN_PROGRAM_ID,
    //             },
    //             signers: [owner2],
    //         }
    //     );
    //
    //     // load PDA state
    //     let authPdaInfo = await program.account.multisigAccount.fetch(authPda);
    //     console.log("got auth pda info: ", authPdaInfo);
    // });
    //
    // if (TEST_COUNTER_EXAMPLE) {
    //
    //     it("Test withdraw without approval", async () => {
    //
    //         try {
    //             await program.rpc.executeWithdraw(
    //                 {
    //                     accounts: {
    //                         signer: owner1.publicKey,
    //                         authPda: authPda,
    //                         poolWrappedSol: poolWrappedSol,
    //                         proposedReceiver: wrappedSolAta,
    //                         wsolMint: NATIVE_MINT,
    //                         systemProgram: SystemProgram.programId,
    //                         tokenProgram: TOKEN_PROGRAM_ID,
    //                     },
    //                     signers: [owner1],
    //                 }
    //             );
    //
    //             throw "withdraw should have failed";
    //         } catch (err) {
    //             console.log("Properly failed with error : ", err.msg);
    //         }
    //
    //     });
    // }
    //
    // it("Approve withdraw", async () => {
    //
    //     // lookup amount in pool pda
    //
    //     let proposed_amount = 5;
    //
    //     await program.rpc.approveWithdraw(
    //         wrappedSolAta,
    //         new anchor.BN(to_lamports(proposed_amount)),
    //         {
    //             accounts: {
    //                 signer: owner1.publicKey,
    //                 authPda: authPda,
    //                 systemProgram: SystemProgram.programId,
    //             },
    //             signers: [owner1],
    //         }
    //     );
    //
    //     await program.rpc.approveWithdraw(
    //         wrappedSolAta,
    //         new anchor.BN(to_lamports(proposed_amount)),
    //         {
    //             accounts: {
    //                 signer: owner2.publicKey,
    //                 authPda: authPda,
    //                 systemProgram: SystemProgram.programId,
    //             },
    //             signers: [owner2],
    //         }
    //     );
    //
    //     await program.rpc.approveWithdraw(
    //         wrappedSolAta,
    //         new anchor.BN(to_lamports(proposed_amount)),
    //         {
    //             accounts: {
    //                 signer: owner3.publicKey,
    //                 authPda: authPda,
    //                 systemProgram: SystemProgram.programId,
    //             },
    //             signers: [owner3],
    //         }
    //     );
    //
    // });
    //
    // it("Execute Withdraw", async () => {
    //
    //     // check balance
    //     let nativeMint = new Token(provider.connection, NATIVE_MINT, TOKEN_PROGRAM_ID, owner1);
    //     let acctInfo = await nativeMint.getAccountInfo(wrappedSolAta);
    //     console.log("got amount before: ", acctInfo.amount.toNumber());
    //
    //     await program.rpc.executeWithdraw(
    //         {
    //             accounts: {
    //                 signer: owner1.publicKey,
    //                 authPda: authPda,
    //                 poolWrappedSol: poolWrappedSol,
    //                 proposedReceiver: wrappedSolAta,
    //                 wsolMint: NATIVE_MINT,
    //                 systemProgram: SystemProgram.programId,
    //                 tokenProgram: TOKEN_PROGRAM_ID,
    //             },
    //             signers: [owner1],
    //         }
    //     );
    //
    //     acctInfo = await nativeMint.getAccountInfo(wrappedSolAta);
    //     console.log("got amount after: ", acctInfo.amount.toNumber());
    //
    // });

});
