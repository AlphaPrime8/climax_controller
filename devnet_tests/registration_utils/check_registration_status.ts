// run with: npx ts-node devnet_tests/devnet_init.ts
const fs = require('fs');
import {Keypair, clusterApiUrl, SystemProgram, PublicKey} from "@solana/web3.js";
import {Provider, Wallet, web3} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
const localKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(require("fs").readFileSync("/home/myware/.config/solana/mainnet.json", {encoding: "utf-8",}))));
const NFT_PDA_SEED = "nft_registration_pda_seed";
const program_id = 'EV4PDhhYJNQbGHiecjtXy22fEuL9N5b6MfaR68jbBcpk'; // can also load from file as done with localKeypair below
const programId = new anchor.web3.PublicKey(program_id);
let wallet = new Wallet(localKeypair);
let opts = Provider.defaultOptions();
// const network = clusterApiUrl('devnet');
const network = clusterApiUrl('mainnet-beta');
let connection = new web3.Connection(network, opts.preflightCommitment);
let provider = new Provider(connection, wallet, opts);
let idl = JSON.parse(require('fs').readFileSync('./target/idl/climax_controller.json', 'utf8'));

const cache_path = "./devnet_tests/registration_utils/cache/";

const to_process_fpath = cache_path + "to_process.csv"
const processed_registered_fpath = cache_path + "registered.csv"
const processed_unregistered_fpath = cache_path + "unregistered.csv"

function write_to_process(arr) {
    // generate cache string
    let cache_string = arr.join(",")
    fs.writeFileSync(to_process_fpath, cache_string);
}

function read_to_process () {
    let raw_str = fs.readFileSync(to_process_fpath, {encoding: "utf-8",});
    return raw_str.split(",");
}

function update_registered(index, mint){
    let append_str = index + " " + mint + "\n";
    fs.appendFileSync(processed_registered_fpath, append_str);
}

function update_unregistered(index, mint){
    let append_str = index + " " + mint + "\n";
    fs.appendFileSync(processed_unregistered_fpath, append_str);
}

async function loop_mint_addresses(){
    // setup
    // let mintPubkey = new PublicKey("9B7LaYFysJW9hxpNF87TipWFu92vUXsXqkprD5qnwmC3");
    const program = new anchor.Program(idl, programId, provider);

    // load uncheck mint address array
    let to_process = read_to_process();

    while (to_process.length > 0) {
        let raw_mint = to_process.pop();
        let index = 0;
        // let index = pair[0];
        let mint = new PublicKey(raw_mint);
        let is_registered = await check_registration_status(mint, program);
        if (is_registered) {
            update_registered(index, mint.toString());
            console.log("Registered: " + index + " " + mint.toString());
        } else {
            update_unregistered(index, mint.toString());
            console.log("UNREGISTERED: " + index + " " + mint.toString());
        }
        // update to_process
        write_to_process(to_process);
        await new Promise(r => setTimeout(r, 1000));
    }
}


async function check_registration_status(mintPubkey: PublicKey, program: anchor.Program){
    // let mintPubkey = new PublicKey("9B7LaYFysJW9hxpNF87TipWFu92vUXsXqkprD5qnwmC3");
    // const program = new anchor.Program(idl, programId, provider);
    console.log('loaded local wallet: %s', localKeypair.publicKey.toString());
    console.log("ProgramID: %s == program.program_id: %s", programId.toString(), program.programId.toString());
    // lookup registration pda
    const [nft_metadata_pda] = await PublicKey.findProgramAddress(
        [Buffer.from(NFT_PDA_SEED), mintPubkey.toBuffer()],
        program.programId
    );
    console.log("found registration pda " + nft_metadata_pda.toString() + "for mint " + mintPubkey.toString());
    // fetch to see if exists
    try{
        let registrationInfo = await program.account.nftMetadata.fetch(nft_metadata_pda);
        let candyMachineString = registrationInfo.candyMachineId.toString();
        // FOUND REGISTRATION
        console.log("IS registered with CmID: ", candyMachineString);
        return true;
    }
    catch (e) {
        // REGISTRATION NOT FOUND
        console.log(e.message);
        if (e.message.includes("Account does not exist")){
            return false;
        }
        else {
            throw e;
        }
    }
}

loop_mint_addresses()
    .then(value => {
        console.log("success with value: {}", value);
    })
    .catch(err => {
        console.error("got err: {}", err);
    });

