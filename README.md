# Climax Controller

The ClimaxController solana smart contract is an addon module to Metaplex's CandyMachine minting system. It's purpose is to add "tipping point" functionality to NFT mints. When configuring your ClimaxController, you set a tipping point threshold, e.g. 1k items minted. If the mint reaches this threshold within the specified period of time, then the team multisig wallet gains access to the mint funds. If the tipping point threshold is not reached, then the minters are able to withdraw their mint payments for a full refund. The purpose of this system is to avoid situations where a team does not have enough funding to execute their stated roadmap, and so wastes the communities funds. 

## Smart Contract Setup Instructions

1) Create a CandyMachine and get your CANDY_MACHINE_ID (you can use any value for the treasury wallet of your CM as you will update it later).
2) Create a ClimaxController using the CANDY_MACHINE_ID from step (1). The creation script will output your new CLIMAX_CONTROLLER_ID and TREASURY_WALLET _ADDRESS.
3) Update your CandyMachine to use the TREASURY_WALLET_ADDRESS obtained in step (2).

## User Interface Setup Instructions

1) We have modified the popular exiled apes CandyMachine UI to support the ClimaxController. It simply adds a transaction so that after the user mints the NFT, it also registers the NFT with the ClimaxController contract so that the user can withdraw funds if the mint fails to reach tipping point.
2) This repo includes a crude but functional UI for the ClimaxController. To use it, simply CD into the app/ directory where you'll find a ReactJS application. Update the src/Config.js file to include the values you obtained in steps (1) and (2) of the Smart Contract Setup Instructions, then run `yarn install` and `yarn start`.