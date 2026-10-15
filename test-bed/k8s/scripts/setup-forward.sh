#!/bin/bash

# Parameters
SERVICE_NAME="$1"
NAMESPACE="$2"
PORT="$3"

if [[ -z "$SERVICE_NAME" || -z "$NAMESPACE" || -z "$PORT" ]]; then
    echo "Usage: $0 <service-name> <namespace> <port>"
    exit 1
fi

# Start port-forward in background
nohup sudo k3s kubectl port-forward -n "$NAMESPACE" svc/"$SERVICE_NAME" "$PORT":"$PORT" --address 0.0.0.0 > "${SERVICE_NAME}.log" 2>&1 &

echo "Port-forwarding for $SERVICE_NAME started in background. Logs: ${SERVICE_NAME}.log"
