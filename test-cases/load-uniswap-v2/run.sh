#!/bin/sh

KEY_1="${KEY_1:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
KEY_2="0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
RPC_URL="${RPC_URL:-http://rollup-boost.default:8551}"
SCENARIO="/script/uniV2.toml"

echo "Setting up UniV2 scenario against $RPC_URL ..."
yes | contender setup -r "$RPC_URL" -p "$KEY_2" --min-balance "33 ether" "$SCENARIO"

sleep 5

for i in $(seq 1 3); do
    echo "Spam run $i/3 at 90 TPS..."
    yes | contender spam -r "$RPC_URL" -p "$KEY_1" --tps 90 -d 600 -a 45 --min-balance "33 ether" "$SCENARIO"
    sleep 5
done

#contender report -p 4
