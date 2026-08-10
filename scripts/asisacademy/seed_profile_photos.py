#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Asigna fotos de personas reales (RandomUser) a estudiantes Asis Academy."""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

URL = "https://ppczarjqcaavwcyxinlo.supabase.co"
ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwY3phcmpxY2FhdndjeXhpbmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjMxNDcsImV4cCI6MjEwMTg5OTE0N30."
    "POVrAyANwe0_rvGw2nplHCTbhfaDmKSlH1G9HIq0ayA"
)
USER = "AdminAcademy"
PASS = "123456"

FEMALE_TOKENS = (
    "CAMILA", "ANA", "MARIA", "FIORELLA", "VALERIA", "PAULA", "ANDREA",
    "DANIELA", "MELANY", "ANGIE", "DAYANA", "CLEIDY", "GIMENA", "SOFIA",
    "LUCIA", "FERNANDA", "NICOLE",
)


def portrait_url(sid: int, name: str) -> str:
    """Fotos reales de personas (set RandomUser / UI Faces)."""
    tokens = set(name.upper().replace(",", " ").split())
    feminine = bool(tokens & set(FEMALE_TOKENS)) or "MARIA" in name.upper()
    gender = "women" if feminine else "men"
    idx = int(sid) % 100
    return f"https://randomuser.me/api/portraits/{gender}/{idx}.jpg"


def req(method: str, path: str, body=None, headers=None, raw=False):
    h = {
        "apikey": ANON,
        "Authorization": f"Bearer {ANON}",
    }
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            data = body
        else:
            data = json.dumps(body).encode("utf-8")
            h.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(URL + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            raw_bytes = resp.read()
            if raw:
                return resp.status, raw_bytes
            if not raw_bytes:
                return resp.status, None
            return resp.status, json.loads(raw_bytes.decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} -> {e.code}: {err}") from e


def download(url: str) -> bytes:
    r = urllib.request.Request(url, headers={"User-Agent": "asisacademy-demo/1.0"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return resp.read()


def main():
    status, login = req(
        "POST",
        "/rest/v1/rpc/sie_iniciar_sesion",
        {"p_username": USER, "p_password": PASS},
    )
    if not login or not login.get("ok"):
        raise SystemExit(f"Login falló: {login}")
    token = login["token"]
    print("login ok")

    status, lista = req(
        "POST",
        "/rest/v1/rpc/sie_lista_estudiantes",
        {"p_token": token, "p_filtros": {"fetchAll": True, "active": True}},
    )
    # Response shape may vary
    students = []
    if isinstance(lista, dict):
        students = lista.get("students") or lista.get("data") or lista.get("estudiantes") or []
        if not students and lista.get("ok") is False:
            raise SystemExit(f"lista error: {lista}")
    elif isinstance(lista, list):
        students = lista

    if not students:
        # fallback: try to inspect
        print("lista raw keys/type:", type(lista), lista if not isinstance(lista, dict) else list(lista.keys())[:20])
        # try REST with no RLS - won't work; use another approach
        raise SystemExit("No se obtuvieron estudiantes")

    print(f"estudiantes: {len(students)}")
    ok = 0
    fail = 0
    for i, st in enumerate(students):
        sid = st.get("id") or st.get("id_estudiante")
        name = st.get("fullName") or st.get("nombre_completo") or f"student-{sid}"
        avatar_url = portrait_url(int(sid), str(name))
        try:
            jpg = download(avatar_url)
            if len(jpg) < 500:
                raise RuntimeError(f"imagen muy pequeña ({len(jpg)} bytes)")
            path = f"profile/demo-real-{sid}.jpg"
            # upload (upsert)
            up_headers = {
                "Content-Type": "image/jpeg",
                "x-upsert": "true",
            }
            req(
                "POST",
                f"/storage/v1/object/fotos-perfil/{path}",
                body=jpg,
                headers=up_headers,
            )
            public = f"{URL}/storage/v1/object/public/fotos-perfil/{path}"
            status, upd = req(
                "POST",
                "/rest/v1/rpc/sie_actualizar_estudiante",
                {
                    "p_token": token,
                    "p_id": int(sid),
                    "p_payload": {"foto_perfil": public},
                },
            )
            if isinstance(upd, dict) and upd.get("ok") is False:
                raise RuntimeError(str(upd))
            ok += 1
            print(f"  OK {sid} {name[:40]} -> {avatar_url}")
            time.sleep(0.15)
        except Exception as e:
            fail += 1
            print(f"  FAIL {sid} {name[:40]}: {e}")

    print(f"done ok={ok} fail={fail}")


if __name__ == "__main__":
    main()
