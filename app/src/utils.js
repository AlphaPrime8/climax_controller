function to_lamports(num_sol) {
    return Math.round(num_sol * 1e9);
}
function to_sol(num_lamports) {
    return num_lamports / 1e9;
}

export {to_sol, to_lamports};
