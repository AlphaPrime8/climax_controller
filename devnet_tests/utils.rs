use anchor_lang::prelude::*;
// use std::str::FromStr;
// use serde::{Serialize, Deserialize};

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]

// #[account]
// #[derive(Default)]

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct CandyMachine {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub items_redeemed: u64,
    pub data: CandyMachineData,
    // there's a borsh vec u32 denoting how many actual lines of data there are currently (eventually equals items available)
    // There is actually lines and lines of data after this but we explicitly never want them deserialized.
    // here there is a borsh vec u32 indicating number of bytes in bitmask array.
    // here there is a number of bytes equal to ceil(max_number_of_lines/8) and it is a bit mask used to figure out when to increment borsh vec u32
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WhitelistMintSettings {
    pub mode: WhitelistMintMode,
    pub mint: Pubkey,
    pub presale: bool,
    pub discount_price: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum WhitelistMintMode {
    // Only captcha uses the bytes, the others just need to have same length
    // for front end borsh to not crap itself
    // Holds the validation window
    BurnEveryTime,
    NeverBurn,
}

/// Candy machine settings data.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct CandyMachineData {
    pub uuid: String,
    pub price: u64,
    /// The symbol for the asset
    pub symbol: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    pub max_supply: u64,
    pub is_mutable: bool,
    pub retain_authority: bool,
    pub go_live_date: Option<i64>,
    pub end_settings: Option<EndSettings>,
    pub creators: Vec<Creator>,
    pub hidden_settings: Option<HiddenSettings>,
    pub whitelist_mint_settings: Option<WhitelistMintSettings>,
    pub items_available: u64,
    /// If [`Some`] requires gateway tokens on mint
    pub gatekeeper: Option<GatekeeperConfig>,
}

/// Configurations options for the gatekeeper.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GatekeeperConfig {
    /// The network for the gateway token required
    pub gatekeeper_network: Pubkey,
    /// Whether or not the token should expire after minting.
    /// The gatekeeper network must support this if true.
    pub expire_on_use: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum EndSettingType {
    Date,
    Amount,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndSettings {
    pub end_setting_type: EndSettingType,
    pub number: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct HiddenSettings {
    pub name: String,
    pub uri: String,
    pub hash: [u8; 32],
}