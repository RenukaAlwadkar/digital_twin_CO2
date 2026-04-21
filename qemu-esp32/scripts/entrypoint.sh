#!/usr/bin/env bash
set -euo pipefail

if [[ -f "/opt/esp/idf/export.sh" ]]; then
  # shellcheck disable=SC1091
  source /opt/esp/idf/export.sh >/dev/null
fi

if [[ "${ENABLE_QEMU_TAP:-1}" == "1" ]]; then
  TAP_NAME="${QEMU_TAP_NAME:-qemu0}"
  TAP_CIDR="${QEMU_TAP_CIDR:-192.168.76.1/24}"
  NAT_SUBNET="${QEMU_NAT_SUBNET:-192.168.76.0/24}"

  if [[ ! -e /dev/net/tun ]]; then
    echo "[qemu-entrypoint] /dev/net/tun not available. Run container with --privileged and /dev/net/tun mapping." >&2
    exec "$@"
  fi

  ip tuntap add dev "${TAP_NAME}" mode tap || true
  ip link set "${TAP_NAME}" up

  if ! ip -4 addr show dev "${TAP_NAME}" | grep -q "${TAP_CIDR%%/*}"; then
    ip addr add "${TAP_CIDR}" dev "${TAP_NAME}" || true
  fi

  # Allow virtual ESP32 network to egress via container default route.
  iptables -t nat -C POSTROUTING -s "${NAT_SUBNET}" -j MASQUERADE 2>/dev/null || \
    iptables -t nat -A POSTROUTING -s "${NAT_SUBNET}" -j MASQUERADE

  iptables -C FORWARD -i "${TAP_NAME}" -j ACCEPT 2>/dev/null || \
    iptables -A FORWARD -i "${TAP_NAME}" -j ACCEPT

  iptables -C FORWARD -o "${TAP_NAME}" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || \
    iptables -A FORWARD -o "${TAP_NAME}" -m state --state RELATED,ESTABLISHED -j ACCEPT

  echo "[qemu-entrypoint] TAP '${TAP_NAME}' ready on ${TAP_CIDR}."
fi

exec "$@"
