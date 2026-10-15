OUTPUT_FILE="$1"

if [ -z "$OUTPUT_FILE" ]; then
    echo "Eroare: Te rog specifică calea fișierului de ieșire."
    echo "Utilizare: $0 /cale/catre/fisier.csv"
    exit 1
fi

DIR_PATH=$(dirname "$OUTPUT_FILE")
mkdir -p "$DIR_PATH"

if [ ! -f "$OUTPUT_FILE" ]; then
    echo "Timestamp,Pod,CPU(m),RAM(Mi)" > "$OUTPUT_FILE"
    echo "S-a creat fișierul nou: $OUTPUT_FILE"
else
    echo "Se adaugă date la fișierul existent: $OUTPUT_FILE"
fi

echo "Start monitorizare... (Ctrl+C pentru stop)"

while true; do
    TS=$(date +'%Y-%m-%d %H:%M:%S')

    kubectl top pods -n default --no-headers | \
    grep -E '^(op-geth|op-rbuilder|tx-order-guarantor)' | \
    sed 's/m//g' | sed 's/Mi//g' | \
    awk -v timestamp="$TS" '{print timestamp "," $1 "," $2 "," $3}' >> "$OUTPUT_FILE"

    echo -n "."

    sleep 10
done
