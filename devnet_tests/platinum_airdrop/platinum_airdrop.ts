// run with: npx ts-node devnet_tests/devnet_init.ts
const fs = require('fs');
import * as anchor from "@project-serum/anchor";
import * as spl_token from "@solana/spl-token";

const bigint = require('bigint-buffer');

// init
let opts = anchor.Provider.defaultOptions();
// const network = "https://ssc-dao.genesysgo.net/"
const network = anchor.web3.clusterApiUrl('mainnet-beta');
let connection = new anchor.web3.Connection(network, opts.preflightCommitment);
const localKeypair = anchor.web3.Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync("/home/myware/.config/solana/platinum_box_dev_wallet.json", {encoding: "utf-8",}))));
const dev_wallet_pubkey = localKeypair.publicKey;
const test_destination_address = "E8AhYFkrKFuJiaVJ9kuXB1nPTKnvTC8NsE6Nf4DQaTi6";

const cache_path = "./devnet_tests/platinum_airdrop/";
const holders_fname = 'platinum_holders.csv';
const valid_pairs_fname = 'valid_pairs.csv';
const transaction_records_fname = 'transaction_records.txt';

function write_cache(arr, fname) {
    // generate cache string
    let cache_string = arr.join(",")
    fs.writeFileSync(cache_path+fname, cache_string);
}

function read_cache (fname) {
    let raw_str = fs.readFileSync(cache_path + fname, {encoding: "utf-8",});
    return raw_str.split(",");
}

function update_transactions(receiver_address, signature){
    let append_str = receiver_address + " " + signature + "\n";
    fs.appendFileSync(cache_path+transaction_records_fname, append_str);
}

async function load_nft_infos() {

    try {
        let accounts = await connection.getTokenAccountsByOwner(dev_wallet_pubkey, {programId: spl_token.TOKEN_PROGRAM_ID});
        // // collect mints of token accounts with balance == 1
        // console.log("got accounts length: ", accounts.value.length);
        let valid_pairs = [];
        for (const aidx in accounts.value) {
            // deserialize account info and ensure balance is exactly 1
            const act = accounts.value[aidx];
            let acctInfo = act.account;
            let acctInfoDecoded = spl_token.AccountLayout.decode(Buffer.from(acctInfo.data));
            let balance = bigint.toBigIntLE(acctInfoDecoded.amount);
            // @ts-ignore
            if (balance !== 1n) {
                continue;
            }
            let mint = new anchor.web3.PublicKey(acctInfoDecoded.mint);
            let pair_str = mint.toString() + ":" + act.pubkey.toString();
            valid_pairs.push(pair_str);
        }
        // cache
        console.log("got len vailid pairs: ", valid_pairs.length)
        let fname = "valid_pairs.csv";
        write_cache(valid_pairs, fname);
        return "success";
    }
    catch (e) {
        console.log("top level error " + e);
    }
}

async function airdrop_nft (receiver_address, nft_mint_address, nft_token_account) {

    // Load ata's and balance
    const receiver_pubkey = new anchor.web3.PublicKey(receiver_address);
    const mint_pubkey = new anchor.web3.PublicKey(nft_mint_address);
    let tboMint = new spl_token.Token(connection, mint_pubkey, spl_token.TOKEN_PROGRAM_ID, localKeypair);
    console.log("initialized token mint");
    // get starting balances
    let receiverAta;
    try {
        receiverAta = await tboMint.getOrCreateAssociatedAccountInfo(receiver_pubkey);
    }
    catch (e) {
        console.log("got error on ata, retrying... " + e)
        await new Promise(r => setTimeout(r, 3000));
        receiverAta = await tboMint.getOrCreateAssociatedAccountInfo(receiver_pubkey);
    }
    console.log("loaded receiver ata: ", receiverAta.address.toString() + "sleeping for 3...");
    // await new Promise(r => setTimeout(r, 3000));
    let senderAta = new anchor.web3.PublicKey(nft_token_account);
    // tx
    console.log("attempting to transfer...");
    let signature = await tboMint.transfer(senderAta, receiverAta.address, dev_wallet_pubkey, [], 1);
    console.log("transferred with signature: ", signature);
    return signature;
}

async function loop_airdrop_nfts () {

    // load destination addresses and available nfts
    let destination_addresses = read_cache(holders_fname);
    let available_nfts = read_cache(valid_pairs_fname);


    // iterate until no more destination addresses
    while (destination_addresses.length > 0){

        console.log("got num destination addresses: ", destination_addresses.length);
        console.log("got num available nfts: ", available_nfts.length);

        // get next values to send
        let receiver_address = destination_addresses.pop();
        let pair = available_nfts.pop().split(":");
        let mint_address = pair[0];
        let token_account = pair[1];

        console.log("got rx address: ", receiver_address);
        console.log("mint address: ", mint_address);
        console.log("got token account address: ", token_account);

        // try to airdrop
        try {
            let tx_sig = await airdrop_nft(receiver_address, mint_address, token_account);

            write_cache(destination_addresses, holders_fname);
            write_cache(available_nfts, valid_pairs_fname);
            update_transactions(receiver_address, tx_sig);
            console.log("transaction success, updated record with sig: "+ tx_sig + " now sleeping 1 seconds...");
            // await new Promise(r => setTimeout(r, 2000));

        }
        catch (e) {
            console.log("got top level error: " + e);
            break;
        }

        // break here if one off ...
        // break;
    }
    console.log("exiting while loop");
    return "success";
}

loop_airdrop_nfts()
    .then(value => {
        console.log("success with value: {}", value);
    })
    .catch(err => {
        console.error("got err: {}", err);
    });


// TODO
// 5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1