// run with: npx ts-node devnet_tests/devnet_init.ts
const fs = require('fs');
import {clusterApiUrl, PublicKey} from "@solana/web3.js";
import {Provider, Wallet, web3} from "@project-serum/anchor";
import fetch from 'node-fetch';
let opts = Provider.defaultOptions();
const network = clusterApiUrl('mainnet-beta');
let connection = new web3.Connection(network, opts.preflightCommitment);
const metaplex = require('@metaplex/js');

// fpaths
const cache_path = "/home/myware/CLionProjects/climax_controller/devnet_tests/load_dao_sample_url_utils/cache/";
const to_process_fpath = cache_path + "to_process.csv"
const processed_registered_fpath = cache_path + "daos.csv"


function write_to_process(arr) {
    // generate cache string
    let cache_string = arr.join(",")
    fs.writeFileSync(to_process_fpath, cache_string);
}

function read_to_process () {
    let raw_str = fs.readFileSync(to_process_fpath, {encoding: "utf-8",});
    return raw_str.split(",");
}

function update_registered(dao_id, image_url){
    let append_str = dao_id + " " + image_url + "\n";
    fs.appendFileSync(processed_registered_fpath, append_str);
}

async function loop_get_images(){

    // load uncheck mint address array
    let to_process = read_to_process();

    while (to_process.length > 0) {
        console.log("to process len: ", to_process.length);
        let pair = to_process.pop().split(":");
        let dao_id = pair[0];
        let mint = pair[1];

        let image_url = await get_image_url(mint);

        if (image_url) {
            update_registered(dao_id, image_url);
            console.log("got image url: " + image_url + " for dao: " + dao_id);
        }
        // update to_process
        write_to_process(to_process);
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function get_image_url(mint_address: string){
    // let mintPubkey = new PublicKey("9B7LaYFysJW9hxpNF87TipWFu92vUXsXqkprD5qnwmC3");
    try {
        let mintPubkey = new PublicKey(mint_address);
        const pda = await metaplex.programs.metadata.Metadata.getPDA(mintPubkey.toString());
        const metadata = await metaplex.programs.metadata.Metadata.load(connection, pda);
        let uri = metadata.data.data.uri;
        let arweaveData = await (await fetch(uri)).json();
        const image_url = arweaveData.image;
        return image_url;
    }
    catch (e) {
        console.log("get image failed with err: ", e);
        return false;
    }
}

loop_get_images()
    .then(value => {
        console.log("success with value: {}", value);
    })
    .catch(err => {
        console.error("got err: {}", err);
    });

