import datetime
import json
import base64
from github import Github, GithubException

# --- 設定 ---
# ⚠️ 注意点
# GitHubのトークンをコードに直書きしたまま git push しない！
# GitHubのセキュリティスキャンによって，公開された瞬間にトークンが無効化される
ACCESS_TOKEN = "あなたのGitHubトークン"
REPO_NAME = "MOSA-github/data_test_server_page"
CSV_HEADER = "time,id,room,mac_addr,status,power[W],ble_rssi,node_rssi\n"

g = Github(ACCESS_TOKEN)
repo = g.get_repo(REPO_NAME)

def update_energy_data(new_data):
    """
    new_data['id'] を施設名（HOSPITAL_A 等）としてディレクトリ分けに使用
    """
    now = datetime.datetime.now()
    year_str = now.strftime("%Y")
    month_str = now.strftime("%Y-%m")
    
    # --- 修正ポイント：施設IDをパスに組み込む ---
    facility_id = new_data.get('id', 'UNKNOWN_FACILITY')
    csv_path = f"docs/data/archive/{facility_id}/{year_str}/{month_str}.csv"
    # ------------------------------------------

    csv_line = f"{new_data['time']},{new_data['id']},{new_data['room']},{new_data['mac_addr']},{new_data['status']},{new_data['power_w']},{new_data['ble_rssi']},{new_data['node_rssi']}\n"
    
    # 1. CSVアーカイブへの追記（パスが施設別になる）
    try:
        contents = repo.get_contents(csv_path)
        existing_csv = contents.decoded_content.decode("utf-8")
        updated_csv = existing_csv + csv_line
        repo.update_file(csv_path, f"Add log {facility_id} {new_data['time']}", updated_csv, contents.sha)
    except GithubException:
        # フォルダがなくても create_file は自動で中間ディレクトリを作成します
        repo.create_file(csv_path, f"Create new log for {facility_id}", CSV_HEADER + csv_line)

    # 2. latest.json の更新
    json_path = "docs/data/latest.json"
    try:
        contents = repo.get_contents(json_path)
        latest_list = json.loads(contents.decoded_content.decode("utf-8"))
    except GithubException:
        latest_list = []

    # mac_addrが一致するデータを更新、なければ追加
    updated = False
    for i, item in enumerate(latest_list):
        if item.get("mac_addr") == new_data["mac_addr"]:
            latest_list[i] = new_data
            updated = True
            break
    if not updated:
        latest_list.append(new_data)

    # JSONを書き戻し
    new_json_content = json.dumps(latest_list, indent=2, ensure_ascii=False)
    repo.update_file(json_path, f"Update latest.json by {new_data['mac_addr']}", new_json_content, contents.sha if 'contents' in locals() else None)
    print("Updated latest.json")

# --- テスト実行 ---
if __name__ == "__main__":
    test_payload = {
        "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "id": "HOSP-0001",
        "room": "Room_301_Bed_A",
        "mac_addr": "f0:9e:9e:9e:29:16",
        "status": "NORMAL",
        "power_w": 46.7,
        "ble_rssi": -26,
        "node_rssi": -79
    }
    update_energy_data(test_payload)