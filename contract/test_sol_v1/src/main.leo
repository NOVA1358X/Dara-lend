program test_sol_v1.aleo {

    // Private SOL token record
    record Token {
        owner: address,
        amount: u64,
    }

    // Public balance mapping
    mapping balances: address => u64;
    // Admin address
    mapping admin: u8 => address;
    // Total supply tracker
    mapping total_supply: u8 => u64;

    // CONSTRUCTOR
    @custom
    constructor() {
        Mapping::set(admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(total_supply, 0u8, 0u64);
    }

    // 1. MINT PUBLIC (admin only)
    fn mint_public(to: address, amount: u64) -> Final {
        assert(amount > 0u64);
        let caller: address = self.caller;
        return final {
            let admin_addr: address = Mapping::get(admin, 0u8);
            assert_eq(caller, admin_addr);
            let current: u64 = Mapping::get_or_use(balances, to, 0u64);
            Mapping::set(balances, to, current + amount);
            let supply: u64 = Mapping::get_or_use(total_supply, 0u8, 0u64);
            Mapping::set(total_supply, 0u8, supply + amount);
        };
    }

    // 2. MINT PRIVATE (admin only)
    fn mint_private(to: address, amount: u64) -> (Token, Final) {
        assert(amount > 0u64);
        let token: Token = Token { owner: to, amount: amount };
        let caller: address = self.caller;
        return (token, final {
            let admin_addr: address = Mapping::get(admin, 0u8);
            assert_eq(caller, admin_addr);
            let supply: u64 = Mapping::get_or_use(total_supply, 0u8, 0u64);
            Mapping::set(total_supply, 0u8, supply + amount);
        });
    }

    // 3. TRANSFER PRIVATE → PRIVATE
    fn transfer_private(input: Token, to: address, amount: u64) -> (Token, Token) {
        assert(input.amount >= amount);
        let change: Token = Token { owner: self.signer, amount: input.amount - amount };
        let output_token: Token = Token { owner: to, amount: amount };
        return (change, output_token);
    }

    // 4. TRANSFER PUBLIC → PUBLIC
    fn transfer_public(to: address, amount: u64) -> Final {
        assert(amount > 0u64);
        let caller: address = self.caller;
        return final {
            let sender_bal: u64 = Mapping::get_or_use(balances, caller, 0u64);
            assert(sender_bal >= amount);
            Mapping::set(balances, caller, sender_bal - amount);
            let receiver_bal: u64 = Mapping::get_or_use(balances, to, 0u64);
            Mapping::set(balances, to, receiver_bal + amount);
        };
    }

    // 5. TRANSFER PRIVATE → PUBLIC (dark pool escrow lock)
    fn transfer_private_to_public(input: Token, to: address, amount: u64) -> (Token, Final) {
        assert(input.amount >= amount);
        let change: Token = Token { owner: self.signer, amount: input.amount - amount };
        return (change, final {
            let current: u64 = Mapping::get_or_use(balances, to, 0u64);
            Mapping::set(balances, to, current + amount);
        });
    }

    // 6. TRANSFER PUBLIC → PRIVATE (dark pool refund/fill)
    fn transfer_public_to_private(to: address, amount: u64) -> (Token, Final) {
        let token: Token = Token { owner: to, amount: amount };
        let caller: address = self.caller;
        return (token, final {
            let current: u64 = Mapping::get_or_use(balances, caller, 0u64);
            assert(current >= amount);
            Mapping::set(balances, caller, current - amount);
        });
    }

}
