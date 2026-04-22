import serial
import time
import threading
from datetime import datetime
import json
from github import Github, GithubException

# --- 🎨 ターミナルカラー設定 ---
class LogColor:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    INFO = '\033[96m'
    SUCCESS = '\033[92m'
    ALERT = '\033[91m'

# --- 通信・リポジトリ設定 ---
SERIAL_PORT = '/dev/ttyUSB0'  
BAUD_RATE = 115200

GITHUB_TOKEN = "あなたのGITHUBトークン"  # 要差し替え
REPO_NAME = "MOSA-github/data_test_server_page"
HOSPITAL_ID = "HOSP-0001"
UPDATE_INTERVAL_MINS = 3  

DEVICE_MAP = {
    "f0:9e:9e:9e:29:16": "Room_301_Bed_A",
    "f0:9e:9e:9c:e0:3a": "Room_301_Bed_B",
    "f0:9e:9e:9e:07:7e": "Room_302_Bed_A"
}

CSV_HEADER = "time,id,room,mac_addr,status,power[W],ble_rssi,node_rssi\n"

# 状態管理メモリ
device_states = {mac: {
    "power": 0.0, "state": 0, "last_seen": 0, "status": "UNKNOWN",
    "best_ble_rssi": -100, "best_ble_time": 0,
    "best_node_rssi": -100, "best_node_time": 0
} for mac in DEVICE_MAP}

# GitHub インスタンス
g = Github(GITHUB_TOKEN)
repo = g.get_repo(REPO_NAME)

# --- [シリアル受信 / 状態監視スレッドは既存のままなので省略] ---
# (serial_reader, alert_monitor 関数をここに配置してください)

def upload_to_github(payload_list):
    """
    GitHubへの一括アップロード（最新JSON更新 + 月別CSV追記）
    """
    now = datetime.now()
    year_str = now.strftime("%Y")
    month_str = now.strftime("%Y-%m")
    ts_log = now.strftime('%H:%M')

    # 1. 履歴CSVへの追記 (docs/data/archive/HOSP-0001/2026/2026-04.csv)
    csv_path = f"docs/data/archive/{HOSPITAL_ID}/{year_str}/{month_str}.csv"
    new_rows = "".join([
        f"{d['time']},{d['id']},{d['room']},{d['mac_addr']},{d['status']},{d['power_w']},{d['ble_rssi']},{d['node_rssi']}\n"
        for d in payload_list
    ])
    
    try:
        contents = repo.get_contents(csv_path)
        updated_csv = contents.decoded_content.decode("utf-8") + new_rows
        repo.update_file(csv_path, f"Log Update {ts_log}", updated_csv, contents.sha)
    except GithubException:
        repo.create_file(csv_path, f"Initial Log {month_str}", CSV_HEADER + new_rows)

    # 2. latest.json の上書き (docs/data/latest.json)
    json_path = "docs/data/latest.json"
    json_data = json.dumps(payload_list, indent=2, ensure_ascii=False)
    try:
        contents = repo.get_contents(json_path)
        repo.update_file(json_path, f"Status Update {ts_log}", json_data, contents.sha)
    except GithubException:
        repo.create_file(json_path, "Create latest.json", json_data)

def github_logger():
    print(f"{LogColor.INFO}{LogColor.BOLD}--- GitHub Logging System Started ---{LogColor.RESET}")
    last_min = -1
    while True:
        now = datetime.now()
        if now.minute % UPDATE_INTERVAL_MINS == 0 and now.second == 0 and now.minute != last_min:
            ts = now.strftime('%Y-%m-%d %H:%M:%S')
            
            payload_for_gh = [{
                "time": ts, "id": HOSPITAL_ID, "room": DEVICE_MAP[mac], "mac_addr": mac,
                "status": info['status'], "power_w": info['power'], 
                "ble_rssi": info['best_ble_rssi'], "node_rssi": info['best_node_rssi']
            } for mac, info in device_states.items()]

            try:
                upload_to_github(payload_for_gh)
                print(f"{LogColor.SUCCESS}[{ts}] GitHub Sync OK{LogColor.RESET}")
                last_min = now.minute
            except Exception as e:
                print(f"{LogColor.ALERT}[{ts}] GitHub Sync Failed: {e}{LogColor.RESET}")

        time.sleep(0.5)

if __name__ == "__main__":
    t1 = threading.Thread(target=serial_reader, daemon=True)
    t2 = threading.Thread(target=alert_monitor, daemon=True)
    t3 = threading.Thread(target=github_logger, daemon=True)
    t1.start(); t2.start(); t3.start()
    
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{LogColor.INFO}Shutting down...{LogColor.RESET}")