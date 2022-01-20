function to_lamports(num_sol) {
    return Math.round(num_sol * 1e9);
}
function to_sol(num_lamports) {
    return num_lamports / 1e9;
}
function shorten_address(address) {
    return address.slice(0,4) + "..." + address.slice(-4, address.length);
}

export {to_sol, to_lamports, shorten_address};
