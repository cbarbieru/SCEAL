# apply -n testing below needs the namespace; create it only if missing
sudo k3s kubectl create namespace testing --dry-run=client -o yaml | sudo k3s kubectl apply -f -
sudo k3s kubectl delete --ignore-not-found=true -f ../resources/testing.yaml -n testing
sudo cp -a ../../../test-cases/load-uniswap-v2/. /tmp/sceal/contender/
sudo chmod +x /tmp/sceal/contender/run.sh
# Mounted at /test by the jmeter pod; the online-voting-be pod writes the voter CSVs here too.
sudo mkdir -p /tmp/sceal/jmeter
sudo cp ../../../test-cases/load-online-voting/online-voting-tests.jmx /tmp/sceal/jmeter/
sleep 3
sudo k3s kubectl apply -f ../resources/testing.yaml -n testing
sleep 3
echo "testing setup finished"
