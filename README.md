# tsunami-test

Write a “Vault” solidity contract

Requirements:

1. There should be a ‘deposit’, and ‘withdraw’ function that any user can use to deposit and withdraw any whitelisted ERC-20 token on the contract

2. There should also be three additional functions that only admins can call.
   i) ‘pause’ and ii) ‘unpause’ that prevent/enable new deposits or withdrawals from occurring.
   iii) whitelistToken that admins call to whitelist tokens

3. The code repository should contain testing for the contract as well.
   i) The repository should also contain instructions in the readme for running tests

4. The vault should be usable by any number of users

The test will be evaluated on

a) code cleanliness and clarity
b) its readme
c) if it runs as expected with tests
d) The ease of a potential user interacting with the contract
e) if it is tested properly
f) if every requirement is met
