# SCEAL: Smart Contracts made Efficient, Accessible and Legitimate

This repository provides a comprehensive environment for deploying, orchestrating, and testing Ethereum L2 (Optimism-based) stacks with a focus on exploring different architectural solutions for censorship mitigation, decentralization and wider accessibility.

## Table of Contents
1. [Repository Overview](#1-repository-overview)
2. [Research Aim & Objectives](#2-research-aim--objectives)
3. [Test Beds](#3-test-beds)
   - 3.1 [Builder Playground](#31-builder-playground)
   - 3.2 [SGX](#32-sgx)
   - 3.3 [Kubernetes](#33-kubernetes)
     - 3.3.1 [VM and Cluster Setup](#331-vm-and-cluster-setup-2-node-k3s)
     - 3.3.2 [Kubernetes Resource Deployment](#332-kubernetes-resource-deployment)
     - 3.3.3 [Port Forwarding](#333-port-forwarding)
4. [Demo Voting DApp](#4-demo-voting-dapp)
   - 4.1 [Build the Docker Images](#41-build-the-docker-images)
   - 4.2 [Deploy on the Kubernetes Test Bed](#42-deploy-on-the-kubernetes-test-bed)
5. [Test Cases](#5-test-cases)
6. [Misc: Block Explorer](#6-misc-block-explorer)
7. [Credits](#7-credits)

---

## 1. Repository Overview

The project is structured to support a complete research and development lifecycle for L2 infrastructure:

- **`test-bed/`**: The environments the research runs against — `builder-playground` (L1/L2 devnet CLI), `sgx` (TEE-based auditable block building), and `k8s` (the Optimism stack on Kubernetes).
- **`demo-voting-dapp/`**: A full-stack decentralized application (DApp) used as a real-world use case, exercised against the test beds above.
- **`test-cases/`**: Load and smoke test scenarios, each scoped to the test bed it targets.

### 1.1 Key Components
- **`test-bed/k8s/resources/`**: Kubernetes manifests for the L2 stack, including specialized configurations for `rollup-boost` and `op-rbuilder`, plus monitoring (Grafana/Prometheus), the testing pods (`contender`, `foundry`, `jmeter`) and the `demo-voting-dapp`.
- **`test-bed/k8s/scripts/`**: Automation scripts for deploying the stack (`setup-stack.sh`), managing port-forwards (`setup-forward.sh`), and initializing testing environments.
- **`test-bed/k8s/storage/`**: Contains the initial state (genesis files, jwt secrets) required to bootstrap the L2 network. Shared with the `sgx` test bed's `docker-compose.yml`.
- **`test-bed/builder-playground/`**: Submodule — a fork of [flashbots/builder-playground](https://github.com/flashbots/builder-playground), allows spining an L1 stack connected with either `alto` or `rundler` ERC-4337 bundler and pre-configured contracts.
- **`test-bed/sgx/`**: `op-rbuilder` (submodule) and `tx-order-guarantor` (vendored in-tree) — a TEE-ready component that guarantees transaction ordering and inclusion (mempool ordering runs inside an SGX enclave), plus the builder that consumes it.

---

## 2. Research Aim & Objectives

The primary goal of this project is to identify, implement, and evaluate different architectural tradeoffs for **preventing censorship** and enhancing **censorship resistance** in L2 networks.

### Investigated Solutions & Tradeoffs:
- **TEEs for Censorship Resistance:** Running the entire sequencer or builder within a Trusted Execution Environment (e.g., Intel TDX) to ensure integrity and prevent arbitrary transaction exclusion.
- **PBS for Decentralization:** Using Proposer-Builder Separation to diminish the centralization of power in a single sequencer node.
- **Tx-Order-Guarantor in TEE:** A "Smaller TCB" (Trusted Computing Base) approach where only the ordering logic runs in a TEE (Intel SGX), providing censorship resilience without the overhead of running the full execution engine in a TEE. See [`test-bed/sgx`](test-bed/sgx/README.md).

A **secondary goal** is to test these solutions in a real-world scenario: a decentralized app. The [demo voting dapp](#4-demo-voting-dapp) (commit-reveal voting on-chain) runs on the test beds and is exercised with the [`load-online-voting`](#5-test-cases) test case, so the tradeoffs above are also measured under realistic application traffic and not only synthetic spam.

A **tertiary goal** is to expand into the **ERC-4337 bundler** space. Bundlers are a gateway to blockchains without the need to own cryptocurrency, which makes them more accessible. To study the differences and tradeoffs between bundler implementations, the project provides an easy to spin up test environment for experimenting with different bundlers:
- **Test environment:** the [Builder Playground](#31-builder-playground) test bed starts a full L1 devnet with `--bundler alto` or `--bundler rundler` (or `--bundler external` to run a bundler on another machine), with the ERC-4337 contracts predeployed.
- **Experiments:** the [`load-user-op`](#5-test-cases) test case sends UserOperations through whichever bundler is running.

---

## 3. Test Beds

### 3.1 Builder Playground

[`test-bed/builder-playground`](test-bed/builder-playground) (submodule) bootstraps a full L1 devnet — reth, lighthouse, and an in-memory mev-boost-relay — with a single command, with the option to spin up an ERC-4337 bundler (`alto` or `rundler`) alongside it:

```bash
cd test-bed/builder-playground
builder-playground start l1 --bundler alto     # or --bundler rundler
```

It also supports an `opstack` recipe (a full sequencer with `op-node`/`op-geth`/`op-batcher`, optionally with an external builder via `rollup-boost`), custom recipes, and built-in `contender` traffic generation. See its own [README](test-bed/builder-playground/README.md) for the full flag/recipe reference.

### 3.2 SGX

[`test-bed/sgx`](test-bed/sgx/README.md) contains `op-rbuilder` (submodule) and `tx-order-guarantor` (vendored in-tree): the transaction ordering (mempool) runs inside an Intel SGX enclave as the smallest trusted unit, and `op-rbuilder` reads the enclave's signed ordering directly — no proxy sits in the ingestion path. A `docker-compose.yml` at the directory root starts `tog-enclave`, `op-rbuilder`, and `tog-client` together for local smoke-testing:

```bash
cd test-bed/sgx
docker compose up -d --build tog-enclave op-rbuilder
docker compose run --rm tog-client demo
```

This uses the enclave's dev build (no SGX hardware required). See [`tx-order-guarantor/README.md`](test-bed/sgx/tx-order-guarantor/README.md) for the real SGX build, the RA-TLS/attestation roadmap, and the full architecture.

### 3.3 Kubernetes

[`test-bed/k8s`](test-bed/k8s) is the original L2 Optimism-compatible test bed, originally based on `builder-playground` and adapted for Kubernetes deployment using Kompose. It supports two deployment variants orchestrated via K8s resources:

1.  **Monolithic Sequencer:** A standard Optimism setup where the sequencer handles block production and ordering.
2.  **PBS (Proposer-Builder Separation):** A variant facilitated by Flashbots' `rollup-boost`, allowing the use of an external builder to decouple block proposal from block construction.

#### 3.3.1 VM and Cluster Setup (2-Node K3S)
This guide details the steps to deploy a cluster consisting of an Ubuntu Master and a TDX Worker.

##### 3.3.1.1 Master Node Setup (Ubuntu 24.04 VM)

**Host Preparation & VM Creation**
Perform these steps on your host machine to provision the Master VM.

1.  **Prepare Workspace and Image**
    ```bash
    mkdir ~/guest-master
    cd ~/guest-master
    wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
    qemu-img resize noble-server-cloudimg-amd64.img 50G
    ```

2.  **Generate Cloud-Init Configuration**
    ```bash
    sudo apt update && sudo apt install cloud-image-utils -y
    
    cat <<EOF > user-data
    #cloud-config
    hostname: master
    users:
      - name: ubuntu
        sudo: ALL=(ALL) NOPASSWD:ALL
        lock_passwd: false
        passwd: password 
    ssh_pwauth: true
    chpasswd:
      list: |
        ubuntu:secretpassword
      expire: False
    EOF
    
    cloud-localds my-seed.iso user-data
    ```

3.  **Install the VM**
    ```bash
    sudo chown libvirt-qemu:kvm noble-server-cloudimg-amd64.img my-seed.iso
    sudo chmod 644 noble-server-cloudimg-amd64.img my-seed.iso
    
    sudo virt-install \
      --name master-guest \
      --ram 4096 \
      --vcpus 4 \
      --disk path=$(pwd)/noble-server-cloudimg-amd64.img,device=disk,bus=virtio \
      --disk path=$(pwd)/my-seed.iso,device=cdrom \
      --os-variant ubuntu24.04 \
      --network network=default,model=virtio \
      --graphics none \
      --import \
      --noautoconsole
    ```

**Master Node Configuration (Inside VM)**
1.  **Access the VM**: `ssh ubuntu@<MASTER_IP>` (pass: `secretpassword`).
2.  **Install K3S**:
    ```bash
    # Set alias
    echo "alias k='sudo k3s kubectl'" >> ~/.bashrc
    source ~/.bashrc

    # Install K3S Server
    curl -sfL https://get.k3s.io | sh -s - server \
      --node-ip <MASTER_IP> \
      --advertise-address <MASTER_IP> \
      --flannel-iface=enp1s0  

    # Fix VirtIO Checksum Offloading bug
    sudo apt-get install -y ethtool
    sudo ethtool -K flannel.1 tx-checksum-ip-generic off
    ```
3.  **Get Join Token**: `sudo cat /var/lib/rancher/k3s/server/node-token`

##### 3.3.1.2 TDX Worker Node Setup (TEE VM)

**Host Preparation (TDX)**
Perform these steps on your host machine.

1.  **Clone and Configure TDX Image**
    ```bash
    git clone https://github.com/canonical/tdx
    cd tdx/guest-tools/image
    
    # Open script to change disk size
    vim create-td-image.sh
    # ACTION: Locate the variable `SIZE` and change it to `50` (e.g., SIZE=50)
    
    # Build the image
    ./create-td-image.sh -v 24.04
    ```

2.  **Run the TDX Guest**
    ```bash
    cd ..
    vim trust_domain.xml.template 
    # ACTION: memory and cpu and set 4G and 4 vcpus respectively 
    ./tdvirsh new
    ```

**Worker Node Configuration (Inside VM)**
Once the VM is running, join it to the cluster using the agent install command:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<MASTER_IP>:6443 \
  K3S_TOKEN=<TOKEN> \
  sh -s - agent \
  --with-node-id \
  --node-ip <TDX_IP> \
  --flannel-iface=enp0s2
```

##### 3.3.1.3 Standard Worker Nodes
Standard (non-TEE) worker nodes can be provisioned using the same steps as the **Master Node** (Ubuntu 24.04 VM). Once the VM is running, join it to the cluster using the agent install command:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<MASTER_IP>:6443 \
  K3S_TOKEN=<TOKEN> \
  sh -s - agent --node-ip <WORKER_IP>
```

##### 3.3.1.4 Target Deployment Scenarios
The cluster supports various research configurations by distributing workloads across Normal and TDX nodes. In all scenarios, the **Master Node** handles the K8S Control Plane, metrics and testing pods.

| Scenario | Master Node | Normal Node 1 | Normal Node 2 | TDX Node (TEE) |
| :--- | :--- | :--- | :--- | :--- |
| **No-TEE Monolithic (Baseline)** | CP + Metrics + Testing | Sequencer + Builder | - | - |
| **TEE Monolithic Sequencer** | CP + Metrics + Testing | - | - | Sequencer + Builder |
| **PBS with no-TEE Builder** | CP + Metrics + Testing | Sequencer | External Builder | - |
| **PBS with TEE Builder** | CP + Metrics + Testing | Sequencer | - | External Builder |

##### 3.3.1.5 Node Affinity & Scheduling
To ensure that specific components (like the TEE-based builder or sequencer) run on the correct hardware, the Kubernetes manifests use `nodeAffinity` rules. This pins pods to nodes based on their hostname (e.g., `tdx-guest`).

Example from `test-bed/k8s/resources/02_op-geth_tdx.yaml`:
```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
            - tdx-guest
```

---

### 3.3.2 Kubernetes Resource Deployment
Use the `setup-stack.sh` script to deploy one of the two variants:
```bash
cd test-bed/k8s/scripts
./setup-stack.sh <MODE>
```
- **Mode 1**: Monolithic Sequencer
- **Mode 2**: PBS (External Builder)

#### Testing resources
The load-injection pods (`contender`, `foundry-test` and `jmeter`) live in the `testing` namespace and are deployed separately with `setup-testing.sh`:
```bash
# first time only (idempotent)
sudo k3s kubectl create namespace testing --dry-run=client -o yaml | sudo k3s kubectl apply -f -

cd test-bed/k8s/scripts
./setup-testing.sh
```
The script stages the [test cases](#5-test-cases) on the master node and applies `resources/testing.yaml`:

| Host path (master) | Source | Mounted in the pod as |
| :--- | :--- | :--- |
| `/tmp/sceal/contender` | `test-cases/load-uniswap-v2/` (`run.sh`, `uniV2.toml`) | `contender`: `/script` |
| `/tmp/sceal/jmeter` | `test-cases/load-online-voting/online-voting-tests.jmx` | `jmeter`: `/test` |

The `demo-voting-dapp` is deployed with its own manifest, see [4.2](#42-deploy-on-the-kubernetes-test-bed).

### 3.3.3 Port Forwarding
To access the services locally, use the `setup-forward.sh` script:
- **Grafana**: `./setup-forward.sh grafana metrics 3000`
- **L2 RPC (op-rbuilder)**: `./setup-forward.sh op-geth default 8545`
- **Online Voting FE**: `./setup-forward.sh online-voting-fe default 3030`

The script requires: `<service-name> <namespace> <port>`.

#### SSH Tunneling from Local Machine
If you are accessing the cluster from a remote local machine through a jump host, use the following to forward ports to your local environment:
```bash
ssh -J <user>@<jump-host> \
  -L 3000:localhost:3000 \
  -L 3030:localhost:3030 \
  -L 8545:localhost:8545 \
  ubuntu@<MASTER_IP>
```

---

## 4. Demo Voting DApp

[`demo-voting-dapp/`](demo-voting-dapp/README.md) is a full-stack decentralized application (DApp) used as a real-world use case, deployed against the test beds above:
- **Frontend (FE)**: React/Vite application with Material UI.
- **Backend (BE)**: Express.js server using Hardhat for contract interaction and MongoDB for metadata storage.
- **Features**: Creates the voters (and the CSVs the load test feeds on) at start-up, and uses a "parallel wallet pool" strategy to prefund multiple source accounts, preventing nonce collisions during high-load simulations.

See the [app README](demo-voting-dapp/README.md) for the architecture and how to run it locally.

### 4.1 Build the Docker Images
Build and push the backend and frontend images for `linux/amd64`:

```bash
cd demo-voting-dapp

docker build --platform linux/amd64 -t <your-registry>/online-voting-be:latest be
docker build --platform linux/amd64 -t <your-registry>/online-voting-fe:latest fe

docker push <your-registry>/online-voting-be:latest
docker push <your-registry>/online-voting-fe:latest
```
`test-bed/k8s/resources/demo-voting-dapp.yaml` pulls `docker.io/cbarbieru/online-voting-{be,fe}:latest`; if you use another registry, change the two `image:` lines.

### 4.2 Deploy on the Kubernetes Test Bed
[`demo-voting-dapp.yaml`](test-bed/k8s/resources/demo-voting-dapp.yaml) deploys MongoDB, the backend and the frontend (with their services) in the `default` namespace, pinned to the master node so they stay off the nodes under test. The L2 JSON-RPC endpoint the backend sends its transactions to is set through the `L2_RPC_URL` variable:

```bash
cd test-bed/k8s/resources

# monolithic sequencer
L2_RPC_URL=http://op-geth:8545 envsubst '${L2_RPC_URL}' < demo-voting-dapp.yaml | sudo k3s kubectl apply -f -

# ...or the external builder
L2_RPC_URL=http://op-rbuilder:8545 envsubst '${L2_RPC_URL}' < demo-voting-dapp.yaml | sudo k3s kubectl apply -f -
```
`op-geth` is the sequencer (every mode), `op-rbuilder` the external builder of Mode 2 (Mode 3's external op-geth builder is `op-geth-ext`). Re-running the command with another `L2_RPC_URL` re-points the backend.

On start-up the backend (`be/entrypoint.sh`) does everything the app needs, so there is nothing to run by hand:
1.  **Deploys the `Vote` contract** to `L2_RPC_URL` (retrying until the L2 is up) and records its address.
2.  **Creates the voters** (`be/scripts/CreateUsers.js`): `NUM_USERS` (default 501) users plus the admin account in MongoDB, and writes `playground-users-<NUM_USERS>.csv` (the `userElHash;candidateHash` pairs the load test commits) and `playground-no-hash-users-<NUM_USERS>.csv` (the matching plaintext credentials) to `/tmp/sceal/jmeter` on the master node. It is idempotent, a backend restart does not duplicate users.
3.  **Seeds today's election** (`be/scripts/SeedTodayElection.js`): the candidates and an election dated today, with the ids the voter hashes were generated for, so the frontend has something to vote on. It re-dates the election on every start.
4.  **Starts the server** on port 8080.

No sleep is needed between the steps: the deploy only returns once the contract is mined, and user creation needs MongoDB, not the chain. Follow the progress and wait for the backend with:
```bash
sudo k3s kubectl logs -f deploy/online-voting-be
sudo k3s kubectl wait --for=condition=Ready pod -l app=online-voting-be --timeout=300s
```

The frontend is then reachable through the port-forward of [3.3.3](#333-port-forwarding) (`./setup-forward.sh online-voting-fe default 3030`). The backend settings (`NUM_USERS`, `CREATE_USERS`, `SEED_ELECTION`, `WALLET_POOL_SIZE`, `OUTPUT_DIR`, the signer key, ...) are environment variables of the `online-voting-be` deployment.

---

## 5. Test Cases

[`test-cases/`](test-cases) holds the load and smoke test scenarios, each scoped to the test bed it exercises:

- **`load-uniswap-v2/`** — a Uniswap V2 spam scenario for [`contender`](https://github.com/flashbots/contender) (`uniV2.toml` + `run.sh`). Assumes the **k8s** test bed with the [testing resources](#332-kubernetes-resource-deployment) deployed and the L2 stack running (`setup-stack.sh`). `setup-testing.sh` copies both files to `/tmp/sceal/contender`, which the `contender` pod mounts as `/script`. Run it from the master node (it sets up the scenario, then spams 3 x 10 minutes at 90 TPS):
    ```bash
    sudo k3s kubectl exec -n testing deploy/contender -- /script/run.sh
    ```
    It targets `http://rollup-boost.default:8551` by default (the PBS modes); override it with `RPC_URL` (and the spammer key with `KEY_1`), e.g. for the monolithic sequencer:
    ```bash
    sudo k3s kubectl exec -n testing deploy/contender -- sh -c "RPC_URL=http://op-geth.default:8545 /script/run.sh"
    ```
- **`load-online-voting/`** — the JMeter test plan (`online-voting-tests.jmx`) for the demo voting dapp. Assumes the **k8s** test bed with the [testing resources](#332-kubernetes-resource-deployment) and the [demo-voting-dapp](#42-deploy-on-the-kubernetes-test-bed) deployed. The contract deployment and the user creation are done by the backend on start-up, which also writes the voter CSV to `/tmp/sceal/jmeter`: the host directory that `setup-testing.sh` fills with the `.jmx` and the `jmeter` pod mounts as `/test`, so the plan reads `/test/playground-users-501.csv` and targets the backend service `online-voting-be.default:8080`. Run it from the master node:
    ```bash
    sudo k3s kubectl exec -n testing deploy/jmeter -- jmeter -n -t /test/online-voting-tests.jmx -l /test/results.jtl
    ```
    `results.jtl` ends up in `/tmp/sceal/jmeter`. If you change `NUM_USERS`, update the CSV file name in the plan's *CSV Data Set Config*.
- **`load-user-op/`** — `erc4337-send-userops.sh`, creates accounts and sends ERC-4337 UserOperations through a bundler. Assumes the **builder-playground** test bed running with `--bundler alto|rundler`.
- **`smoke-order-guarantor/`** — `run.sh` starts the `sgx` test bed's `docker-compose.yml` and runs a `tog-client demo` against it end-to-end (send → signed ordering → verify). Assumes the **sgx** test bed.

---

## 6. Misc: Block Explorer

A lightweight block explorer can be used to visualize transactions and blocks on the L2 network. Run it using Docker:
```bash
docker run -p 80:80 -e APP_NODE_URL="http://localhost:8545" alethio/ethereum-lite-explorer
```
Once running, access the explorer at `http://localhost:80`.

---

## 7. Credits

The **demo-voting-dapp** (online voting DApp) was originally developed by [Gabriela Neagu](https://github.com/gabrielaneagu).
