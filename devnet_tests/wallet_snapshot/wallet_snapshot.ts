// run with: npx ts-node devnet_tests/devnet_init.ts
const fs = require('fs');
import {clusterApiUrl, PublicKey} from "@solana/web3.js";
import {Provider, Wallet, web3} from "@project-serum/anchor";
import { toBigIntLE, toBufferLE } from 'bigint-buffer';
let opts = Provider.defaultOptions();
const network = clusterApiUrl('mainnet-beta');
let connection = new web3.Connection(network, opts.preflightCommitment);
const spl_token = require('@solana/spl-token');

// fpaths
const cache_path = "/home/myware/CLionProjects/climax_controller/devnet_tests/wallet_snapshot/cache/";
const snapshot_path = cache_path + "snapshot.csv"

//INPUT
const TARGET_WALLET_ADDRESS = new PublicKey("DWb5SSsbhorqjud6EkdBwHMLSAFfun921sp2xfH9oY4a")

function write_snapshot_to_csv(arr) {
    // generate cache string
    let cache_string = arr.join(",\n")
    fs.writeFileSync(snapshot_path, cache_string);
}

async function take_snapshot(){

    //
    let accounts = await connection.getTokenAccountsByOwner(TARGET_WALLET_ADDRESS, { programId: spl_token.TOKEN_PROGRAM_ID });
    let mints = [];
    for (const aidx in accounts.value) {
        // deserialize account info and ensure balance is exactly 1
        const act = accounts.value[aidx];
        let acctInfo = act.account;
        let acctInfoDecoded = spl_token.AccountLayout.decode(Buffer.from(acctInfo.data));
        let balance = toBigIntLE(acctInfoDecoded.amount);
        if (balance !== 1n) {
            continue;
        }
        let mint = new PublicKey(acctInfoDecoded.mint).toString();
        mints.push(mint);
    }

    write_snapshot_to_csv(mints);

}

take_snapshot()
    .then(value => {
        console.log("success with value: {}", value);
    })
    .catch(err => {
        console.error("got err: {}", err);
    });

