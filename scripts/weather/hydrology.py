#!/usr/bin/env python3
"""Fetch DHM hydrology realtime feeds (hydrology.gov.np) via Socket.IO v2 long-polling.
Stdlib only. Events: river_test (water level), rainfall_watch (1/3/6/12/24h rain), river_discharge.
Tested 2026-09-25 from a US egress IP: works without any key. Returns dict event->list."""
import json, re, time, urllib.request, urllib.parse, sys

BASE = "https://hydrology.gov.np/gss/socket.io/"
UA = {"User-Agent": "rasuwa-flood-bulletin-weather/1.0 (+https://nirajbhusal.github.io/rasuwa-flood-bulletin/)"}

def _req(params, data=None, timeout=12):
    url = BASE + "?" + urllib.parse.urlencode(params)
    headers = dict(UA)
    if data is not None:
        headers["Content-Type"] = "text/plain;charset=UTF-8"
        data = data.encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=timeout) as r:
        return r.read().decode("utf-8")

def _packets(payload):
    # EIO3 polling framing: "<len>:<packet>" repeated; len counts characters
    i, out = 0, []
    while i < len(payload):
        j = payload.index(":", i); n = int(payload[i:j])
        out.append(payload[j + 1:j + 1 + n]); i = j + 1 + n
    return out

def fetch(events=("river_test", "rainfall_watch", "river_discharge"), deadline_s=40, request_timeout=12):
    """Return event->payload. A blocked host or a short deadline yields a partial dict, never raises."""
    got = {}
    t_end = time.time() + deadline_s

    def left():
        remain = t_end - time.time()
        if remain <= 0:
            return 0
        return max(1.0, min(float(request_timeout), remain))

    try:
        timeout = left()
        if timeout <= 0:
            return {}
        hs = _req({"EIO": "3", "transport": "polling"}, timeout=timeout)
        match = re.search(r'"sid":"([^"]+)"', hs)
        if not match:
            print("hydrology handshake missing sid", file=sys.stderr)
            return {}
        sid = match.group(1)
    except Exception as exc:
        print(f"hydrology handshake failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return {}
    q = {"EIO": "3", "transport": "polling", "sid": sid}
    for ev in events:
        timeout = left()
        if timeout <= 0:
            return got
        msg = "42" + json.dumps(["client_request", ev])
        try:
            _req(q, data=f"{len(msg)}:{msg}", timeout=timeout)
        except Exception as exc:
            print(f"hydrology subscribe {ev} failed: {type(exc).__name__}: {exc}", file=sys.stderr)
            return got
    while time.time() < t_end and len(got) < len(events):
        timeout = left()
        if timeout <= 0:
            break
        try:
            payload = _req(q, timeout=timeout)
        except Exception as exc:
            print(f"hydrology poll failed: {type(exc).__name__}: {exc}", file=sys.stderr)
            break
        try:
            packets = _packets(payload)
        except Exception as exc:
            print(f"hydrology framing failed: {type(exc).__name__}: {exc}", file=sys.stderr)
            break
        for pkt in packets:
            if not pkt.startswith("42"):
                continue
            try:
                name, body = json.loads(pkt[2:])[:2]
            except (ValueError, TypeError):
                continue
            if name in events:
                got[name] = body
    return got

if __name__ == "__main__":
    d = fetch()
    for k, v in d.items():
        print(k, len(v) if hasattr(v, "__len__") else v)
    if len(sys.argv) > 1:
        json.dump(d, open(sys.argv[1], "w"), ensure_ascii=False)
