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
const cache_path = "/home/myware/CLionProjects/climax_controller/devnet_tests/load_dao_sample_url_utils_multiple/cache/";
const to_process_fpath = cache_path + "to_process.csv"
const processed_registered_fpath = cache_path + "sample_images.csv"


function write_to_process(arr) {
    // generate cache string
    let cache_string = arr.join(",")
    fs.writeFileSync(to_process_fpath, cache_string);
}

function read_to_process () {
    let raw_str = fs.readFileSync(to_process_fpath, {encoding: "utf-8",});
    return raw_str.split(",");
}

function update_registered(line_str){
    fs.appendFileSync(processed_registered_fpath, line_str);
}

async function loop_get_images(){

    // load uncheck mint address array
    let to_process = read_to_process();

    while (to_process.length > 0) {
        console.log("to process len: ", to_process.length);
        let mint = to_process.pop();

        let image_url_name_line = await get_image_url(mint);
        await new Promise(r => setTimeout(r, 1000));

        if (image_url_name_line) {
            update_registered(image_url_name_line);
        } else {
            throw Error("Failed to get  metadata, this should not occur.");
        }
        // update to_process
        write_to_process(to_process);
    }
}

async function get_image_url(mint_address: string){
    // let mintPubkey = new PublicKey("9B7LaYFysJW9hxpNF87TipWFu92vUXsXqkprD5qnwmC3");
    try {
        console.log(`loading nft: ${mint_address}`);
        let mintPubkey = new PublicKey(mint_address);
        console.log("getting pda");
        const pda = await metaplex.programs.metadata.Metadata.getPDA(mintPubkey.toString());
        const metadata = await metaplex.programs.metadata.Metadata.load(connection, pda);
        let uri = metadata.data.data.uri;
        let nft_name = metadata.data.data.name;
        console.log(`getting arweave data for uri: ${uri}`);
        let arweaveData = await (await fetch(uri)).json();
        const image_url = arweaveData.image;
        // const nft_name = arweaveData
        const rstr = mint_address + " " +  image_url + " " + nft_name + "\n";
        console.log("got rstr: ", rstr);
        return rstr
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

