#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/../resources"
STORAGE_DIR="$SCRIPT_DIR/../storage"
TMP_DIR="/tmp/sceal-deploy"

# k8s node hostnames (must match kubernetes.io/hostname labels in the cluster)
NODE_STD1="ubuntu-std1"
NODE_STD2="ubuntu-std2"
NODE_TDX="tdx-guest"

# SSH targets for the 3 worker nodes (key-based auth via ~/.ssh/sceal_rsa)
SSH_STD1="ubuntu@192.168.122.170"
SSH_STD2="ubuntu@192.168.122.43"
SSH_TDX="tdx@192.168.122.24"
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o BatchMode=yes"

# All modes to iterate over (or pass a single mode as $1)
ALL_MODES=("2-1" "2-2" "3-1" "3-2")

kctl() { sudo k3s kubectl "$@"; }

# ---------------------------------------------------------------------------
# Storage refresh
# ---------------------------------------------------------------------------

_refresh_remote() {
    local label="$1" ssh_target="$2"
    echo "[storage] $label ($ssh_target)..."
    tar czf - -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")" \
        | ssh $SSH_OPTS "$ssh_target" \
            "sudo rm -rf /tmp/sceal/storage && sudo mkdir -p /tmp/sceal && sudo tar xzf - -C /tmp/sceal/"
}

refresh_all_storage() {
    _refresh_remote "$NODE_STD1" "$SSH_STD1"
    _refresh_remote "$NODE_STD2" "$SSH_STD2"
    _refresh_remote "$NODE_TDX"  "$SSH_TDX"
}

# ---------------------------------------------------------------------------
# Resource lifecycle
# ---------------------------------------------------------------------------

delete_all_resources() {
    echo "[cleanup] Deleting existing resources..."
    kctl delete --ignore-not-found=true \
        -f "$RESOURCES_DIR/01_opstack.yaml" \
        -f "$RESOURCES_DIR/rollup-boost.yaml" \
        -f "$RESOURCES_DIR/02_op-rbuilder_tdx.yaml" \
        -f "$RESOURCES_DIR/03_op-geth_tdx.yaml"
    sleep 3
}

# Generate parametrised temp YAMLs and apply them for the given mode.
# The source YAMLs use MAIN_NODE, EXT_NODE, L2_URL, BUILDER_URL as placeholders.
apply_mode() {
    local mode="$1"
    local major="${mode%-*}"   # "1", "2", or "3"

    mkdir -p "$TMP_DIR"

    # Node placement
    local main_node ext_node
    case "$mode" in
        1-1) main_node="$NODE_STD1" ; ext_node="" ;;
        1-2) main_node="$NODE_TDX"  ; ext_node="" ;;
        2-1) main_node="$NODE_STD1" ; ext_node="$NODE_STD2" ;;
        2-2) main_node="$NODE_STD1" ; ext_node="$NODE_TDX" ;;
        3-1) main_node="$NODE_STD1" ; ext_node="$NODE_STD2" ;;
        3-2) main_node="$NODE_STD1" ; ext_node="$NODE_TDX" ;;
    esac

    # op-node --l2 target
    local l2_url
    if [[ "$major" == "1" ]]; then
        l2_url="http://op-geth:8551"
    else
        l2_url="http://rollup-boost:8551"
    fi

    # 01_opstack.yaml – node affinity + L2 URL
    sed \
        -e "s/MAIN_NODE/${main_node}/g" \
        -e "s|L2_URL|${l2_url}|g" \
        "$RESOURCES_DIR/01_opstack.yaml" > "$TMP_DIR/01_opstack.yaml"

    local apply_files="-f $TMP_DIR/01_opstack.yaml"

    if [[ "$major" != "1" ]]; then
        # rollup-boost builder URL
        local builder_url
        if [[ "$major" == "3" ]]; then
            builder_url="http://op-geth-ext:8551"
        else
            builder_url="http://op-rbuilder:8551"
        fi

        sed \
            -e "s/MAIN_NODE/${main_node}/g" \
            -e "s|BUILDER_URL|${builder_url}|g" \
            "$RESOURCES_DIR/rollup-boost.yaml" > "$TMP_DIR/rollup-boost.yaml"
        apply_files="$apply_files -f $TMP_DIR/rollup-boost.yaml"

        if [[ "$major" == "2" ]]; then
            sed -e "s/EXT_NODE/${ext_node}/g" \
                "$RESOURCES_DIR/02_op-rbuilder_tdx.yaml" > "$TMP_DIR/ext.yaml"
        elif [[ "$major" == "3" ]]; then
            sed -e "s/EXT_NODE/${ext_node}/g" \
                "$RESOURCES_DIR/03_op-geth_tdx.yaml" > "$TMP_DIR/ext.yaml"
        fi
        apply_files="$apply_files -f $TMP_DIR/ext.yaml"
    fi

    echo "[apply] Mode $mode: main=$main_node ext=${ext_node:-none} l2=$l2_url"
    # shellcheck disable=SC2086
    kctl apply $apply_files
    sleep 3
}

# ---------------------------------------------------------------------------
# Stack readiness
# ---------------------------------------------------------------------------

wait_for_stack() {
    local major="${1%-*}"
    echo "[wait] Waiting for op-node pod (up to 5 min)..."
    kctl wait pod -l l2.service=op-node --for=condition=Ready --timeout=300s

    if [[ "$major" != "1" ]]; then
        echo "[wait] Waiting for rollup-boost pod..."
        kctl wait pod -l l2.service=rollup-boost --for=condition=Ready --timeout=120s
    fi
    echo "[wait] Giving stack 120s to stabilise..."
    sleep 120
}

# ---------------------------------------------------------------------------
# Contender
# ---------------------------------------------------------------------------

run_contender() {
    local mode="$1" rpc_url="$2" key="$3"
    echo "[contender] Waiting for contender pod (up to 2 min)..."
    kctl wait -n testing pod -l app=contender --for=condition=Ready --timeout=120s

    local pod
    pod=$(kctl get pod -n testing -l app=contender -o jsonpath='{.items[0].metadata.name}')

    echo "[contender] mode=$mode rpc=$rpc_url key=${key:0:10}..."
    kctl exec -n testing "$pod" -- \
        sh -c "KEY_1='${key}' RPC_URL='${rpc_url}' /script/run.sh"
}

# ---------------------------------------------------------------------------
# Report collection
# ---------------------------------------------------------------------------

collect_reports() {
    local mode="$1"
    local reports_dir="/tmp/sceal/contender/reports"
    local archive="/tmp/sceal/contender/${mode}.zip"

    echo "[reports] Zipping CSVs into ${archive}..."
    zip -j "$archive" "$reports_dir"/*.csv

    echo "[reports] Clearing $reports_dir..."
    sudo rm -f /tmp/sceal/contender/reports/*.csv /tmp/sceal/contender/reports/*.html

    echo "[reports] Resetting contender DB..."
    local pod
    pod=$(kctl get pod -n testing -l app=contender -o jsonpath='{.items[0].metadata.name}')
    kctl exec -n testing "$pod" -- contender db reset
}

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

main() {
    if [[ ! -f "$SSH_KEY" ]]; then
        echo "ERROR: $SSH_KEY not found. Run scripts/setup-ssh-keys.sh once first."
        exit 1
    fi

    mkdir -p "$TMP_DIR"

    # First 6 keys from accounts.txt — one per mode in ALL_MODES order
    local -a keys
    mapfile -t keys < <(cut -d'-' -f1 "$SCRIPT_DIR/../misc/accounts.txt" | grep -v '^$' | head -"${#ALL_MODES[@]}")

    # If a specific mode is given as the first argument, run only that mode
    local modes_to_run=("${ALL_MODES[@]}")
    if [[ "${1:-}" != "" ]]; then
        modes_to_run=("$1")
    fi

    for mode in "${modes_to_run[@]}"; do
        local major="${mode%-*}"

        # Look up this mode's index in ALL_MODES to select its key
        local key_index=0
        for i in "${!ALL_MODES[@]}"; do
            [[ "${ALL_MODES[$i]}" == "$mode" ]] && key_index=$i && break
        done
        local key="${keys[$key_index]}"

        echo ""
        echo "============================================"
        echo "  MODE $mode  (key ${key:0:10}...)"
        echo "============================================"

        delete_all_resources
        refresh_all_storage
        apply_mode "$mode"
        wait_for_stack "$mode"

        local rpc_url
        if [[ "$major" == "1" ]]; then
            rpc_url="http://op-geth.default:8545"
        else
            rpc_url="http://rollup-boost.default:8551"
        fi

        run_contender "$mode" "$rpc_url" "$key"
        # collect_reports "$mode"

        echo "[done] Mode $mode complete."
    done

    echo ""
    echo "All modes done. Contender reports: /tmp/sceal/contender/reports/"
}

main "${1:-}"
