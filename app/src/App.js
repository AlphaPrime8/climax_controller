import React from 'react';
import {CANDY_MACHINE_ID, CLIMAX_CONTROLLER_ID, POOL_WRAPPED_SOL} from "./Config";
import {DEFAULT_MULTISIG_STATE, CANDY_MACHINE_PROGRAM_ID, CLIMAX_CONTROLLER_PROGRAM_ID } from "./Defaults";
import './App.css';

// react components
import Header from './Header';
import ConnectWalletButton from './components/ConnectWallet';
import UserWithdrawCard from "./components/UserWithdrawCard";
import ExecuteMultisigWithdrawCard from "./components/ExecuteMultisigWithdrawCard";
import MultisigStateCard from "./components/MultisigStateCard";
import ProposeMultisigWithdrawCard from "./components/ProposeMultisigWithdrawCard";

// web3 dependencies
import * as anchor from '@project-serum/anchor';
import { useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Provider, web3 } from '@project-serum/anchor';
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import {WalletProvider, ConnectionProvider} from '@solana/wallet-adapter-react';
import {WalletModalProvider} from '@solana/wallet-adapter-react-ui';
import {NATIVE_MINT, Token} from "@solana/spl-token";
import {TOKEN_PROGRAM_ID} from "@project-serum/serum/lib/token-instructions";
import {to_lamports, to_sol} from "./utils";
require('@solana/wallet-adapter-react-ui/styles.css');
const metaplex = require('@metaplex/js');
const spl_token = require('@solana/spl-token');

// consts
const USER_PDA_SEED = "user_pda_seed";

// setup
const wallets = [getPhantomWallet()];
// const network = clusterApiUrl('mainnet-beta');
// const network = "http://127.0.0.1:8899";
const network = clusterApiUrl('devnet');
const { SystemProgram } = web3;
const opts = {preflightCommitment: 'processed'};

// declare globals
let cmProgram = null;
let ccProgram = null;
let nativeMint = null;
let provider = null;
let user_pda = null;


function App() {

   const [isInitialized, setIsInitialized] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [climaxControllerState, setClimaxControllerState] = useState(DEFAULT_MULTISIG_STATE);

   async function initialize() {
      // get idl and pdas and stuff
      const connection = new Connection(network, opts.preflightCommitment);
      const wallet = wallets[0].adapter();
      await wallet.connect();
      console.log("getting provider with local wallet PK: %s", wallet.publicKey.toString());
      provider = new Provider(
          connection,
          wallet,
          opts.preflightCommitment
      );

      const cmIdl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM_ID, provider);
      cmProgram = new anchor.Program(cmIdl, CANDY_MACHINE_PROGRAM_ID, provider);

      const ccIdl = await anchor.Program.fetchIdl(CLIMAX_CONTROLLER_PROGRAM_ID, provider);
      ccProgram = new anchor.Program(ccIdl, CLIMAX_CONTROLLER_PROGRAM_ID, provider);

      nativeMint = new Token(provider.connection, NATIVE_MINT, TOKEN_PROGRAM_ID, provider.wallet);


      // load user pda

      [user_pda] = await PublicKey.findProgramAddress(
          [CLIMAX_CONTROLLER_ID.toBuffer(), provider.wallet.publicKey.toBuffer(), Buffer.from(USER_PDA_SEED)],
          ccProgram.programId
      );


      console.log("done initializing")

   }
   async function loadClimaxControllerState() {
      setIsLoading(true);
      if (!isInitialized) {
         await initialize();
         setIsInitialized(true);
      }

      let newClimaxControllerState = {...climaxControllerState};

      // load candy machine state
      const cmState = await cmProgram.account.candyMachine.fetch(CANDY_MACHINE_ID);
      const itemsRedeemed = cmState.itemsRedeemed.toNumber();
      // const itemsAvailable = state.data.itemsAvailable.toNumber();
      // const price = state.data.price.toNumber();
      // console.log("got items available: ", itemsAvailable);
      // console.log("got price: ", price);
      // console.log("got items redeemed: ", itemsRedeemed);
      newClimaxControllerState.current_mint_state = itemsRedeemed;

      // TODO load climax controller state
      const ccState = await ccProgram.account.climaxController.fetch(CLIMAX_CONTROLLER_ID);
      const signerThreshold = ccState.signerThreshold.toNumber();
      const tippingPointThreshold = ccState.tippingPointThreshold.toNumber();
      const endTsUnixSeconds = ccState.endTimestamp.toNumber();
      const now = Math.floor(Date.now() / 1000)
      const remainingSeconds = endTsUnixSeconds - now;
      const hoursTillClose = remainingSeconds / (60 * 60);
      const multisigWithdrawsOpen = itemsRedeemed >= tippingPointThreshold;
      const proposalIsActive = ccState.proposalIsActive;
      const proposedReceiver = ccState.proposedReceiver;
      const proposedAmount = ccState.proposedAmount.toNumber();
      // const ownersArr = ccState.owners;
      const ownersArr = ccState.owners.map((x) => x.toString());
      const signersArr = ccState.signers;
      // const signersArr = ccState.signers.map((x) => x.toString());
      const reducer = (previousValue, currentValue) => previousValue + currentValue;
      const num_signed = signersArr.reduce(reducer);
      const sufficientSignersHaveApproved = num_signed >= signerThreshold;
      // const numRegistered = ccState.numRegistered.toNumber();
      // const candyMachineId = ccState.candyMachineId;

      newClimaxControllerState.signer_threshold = signerThreshold;
      newClimaxControllerState.tipping_point_threshold = tippingPointThreshold;
      newClimaxControllerState.hours_till_close = hoursTillClose;
      newClimaxControllerState.multisig_withdraws_open = multisigWithdrawsOpen;
      newClimaxControllerState.proposal_is_active = proposalIsActive;
      newClimaxControllerState.proposed_receiver = proposedReceiver;
      newClimaxControllerState.proposed_amount = proposedAmount;
      newClimaxControllerState.owners_arr = ownersArr;
      newClimaxControllerState.signers_arr = signersArr;
      newClimaxControllerState.sufficient_signers_have_approved = sufficientSignersHaveApproved;

      // load treasury
      let acctInfo = await nativeMint.getAccountInfo(POOL_WRAPPED_SOL);
      const treasuryBalance = acctInfo.amount.toNumber();
      newClimaxControllerState.treasury_balance = treasuryBalance;

      // load user pda state
      newClimaxControllerState.user_addy = provider.wallet.publicKey.toString();

      try {
         let userPdaInfo = await ccProgram.account.userMetadata.fetch(user_pda);
         console.log("got userpdainfo: ", userPdaInfo);
         userPdaInfo.amountPaid.toNumber();

         newClimaxControllerState.user_withdraws_open = !multisigWithdrawsOpen && (hoursTillClose < 0);
         newClimaxControllerState.user_funds_paid = userPdaInfo.amountPaid.toNumber();
         newClimaxControllerState.user_funds_withdrawn = userPdaInfo.amountWithdrawn.toNumber();

      }
      catch (e) {
         newClimaxControllerState.user_withdraws_open = false;
         newClimaxControllerState.user_funds_paid = 0;
         newClimaxControllerState.user_funds_withdrawn = 0;
         console.log("User PDA not found.");
      }

      setClimaxControllerState(newClimaxControllerState);
      setIsLoading(false);
   }
   async function approveMultisigWithdraw() {}
   async function executeUserWithdraw() {}
   async function proposeMultisigWithdraw() {}
   async function executeMultisigWithdraw() {}


   return (
      <ConnectionProvider endpoint={network}>
         <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
               <div className='App'>
                  <div className='main'>
                     <Header />
                     <ConnectWalletButton loadClimaxControllerState={loadClimaxControllerState} isLoading={isLoading} />
                     <div className='container flex-container'>
                        <MultisigStateCard approveMultisigWithdraw={approveMultisigWithdraw} climaxControllerState={climaxControllerState} />
                        <UserWithdrawCard executeUserWithdraw={executeUserWithdraw} climaxControllerState={climaxControllerState} />
                     </div>
                     <div className='container flex-container'>
                        <ProposeMultisigWithdrawCard proposeMultisigWithdraw={proposeMultisigWithdraw} />
                        <ExecuteMultisigWithdrawCard climaxControllerState={climaxControllerState} executeMultisigWithdraw={executeMultisigWithdraw} />
                     </div>
                  </div>
               </div>
            </WalletModalProvider>
         </WalletProvider>
      </ConnectionProvider>
   );
}

export default App;
