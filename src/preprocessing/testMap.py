import os
import requests
import json
from collections import defaultdict

def save_result_to_file(result, file_path):
    # Tùy chỉnh định dạng cho `list1Ways` và `listLinks` trước khi ghi
    list1Ways_formatted = [f"[{', '.join(map(str, way))}]" for way in result["list1Ways"]]
    listLinks_formatted = [f"[{', '.join(map(str, link))}]" for link in result["listLinks"]]
    
    # Ghi ra file với định dạng tùy chỉnh
    with open(file_path, "w", encoding="utf-8") as f:
        # Ghi các phần khác của JSON trước
        f.write('{\n')
        f.write(f'    "center": {json.dumps(result["center"], ensure_ascii=False)},\n')
        f.write(f'    "listBoundaries": [\n')
        f.write(',\n'.join([f'        {json.dumps(boundary, ensure_ascii=False)}' for boundary in result["listBoundaries"]]))
        f.write('\n    ],\n')
        f.write(f'    "listNodes": [\n')
        f.write(',\n'.join([f'        {json.dumps(node, ensure_ascii=False)}' for node in result["listNodes"]]))
        f.write('\n    ],\n')
        f.write(f'    "list1Ways": [\n        ')
        f.write(',\n        '.join(list1Ways_formatted))
        f.write('\n    ],\n')
        f.write(f'    "listLinks": [\n        ')
        f.write(',\n        '.join(listLinks_formatted))
        f.write('\n    ]\n')
        f.write('}\n')


# URL của Overpass API
url = "https://overpass-api.de/api/interpreter"

# Truy vấn Overpass để lấy dữ liệu
query = """
[out:json];
area["name"="Phường Cống Vị"]["boundary"="administrative"]->.searchArea;
(
  way[highway](area.searchArea);
  rel[boundary=administrative](area.searchArea);
);
(._;>;);
out body;
"""

# Gửi yêu cầu đến Overpass API
response = requests.post(url, data={"data": query})

if response.status_code == 200:
    data = response.json()
    
    # Lưu các node, way và relation
    nodes = {}
    ways = []
    relations = []

    # Duyệt qua các phần tử
    for element in data["elements"]:
        if element["type"] == "node":
            nodes[element["id"]] = {"lat": element["lat"], "lng": element["lon"]}
        elif element["type"] == "way":
            ways.append(element)
        elif element["type"] == "relation":
            relations.append(element)

    # 1. Lấy tọa độ của node label làm center
    center = None
    for node_id, node_data in nodes.items():
        for rel in relations:
            if "tags" in rel and rel["tags"].get("name") == "Phường Cống Vị":
                for member in rel.get("members", []):
                    if member["type"] == "node" and member["ref"] == node_id:
                        center = {"lat": node_data["lat"], "lng": node_data["lng"]}
                        break

    # 2. Tìm boundary của phường (các node biên)
    boundary_nodes = []
    for rel in relations:
        if "tags" in rel and rel["tags"].get("boundary") == "administrative":
            for member in rel.get("members", []):
                if member["type"] == "way":
                    way_id = member["ref"]
                    for way in ways:
                        if way["id"] == way_id:
                            boundary_nodes.extend(way["nodes"])
    boundaries = list(dict.fromkeys(boundary_nodes))  # Loại bỏ trùng lặp

    # Xây dựng listBoundaries
    listBoundaries = [{"lat": nodes[node_id]["lat"], "lng": nodes[node_id]["lng"]}
                      for node_id in boundaries if node_id in nodes]

    # 3. Xây dựng listNodes và map ID -> index
    listNodes = [{"lat": v["lat"], "lng": v["lng"]} for k, v in nodes.items()]
    node_index = {node_id: i for i, node_id in enumerate(nodes.keys())}

    # 4. Xây dựng list1Ways và listLinks
    list1Ways = []
    adjacency_list = defaultdict(list)

    for way in ways:
        # Kiểm tra nếu đường có danh sách node
        if "nodes" in way:
            is_oneway = way.get("tags", {}).get("oneway", "no") == "yes"
            for i in range(len(way["nodes"]) - 1):
                from_node = way["nodes"][i]
                to_node = way["nodes"][i + 1]
                if from_node in node_index and to_node in node_index:
                    if is_oneway:
                        # Thêm vào danh sách đường 1 chiều
                        list1Ways.append([node_index[from_node], node_index[to_node]])
                    else:
                        # Nếu không phải 1 chiều, thêm vào danh sách liên kết
                        adjacency_list[node_index[from_node]].append(node_index[to_node])
                        adjacency_list[node_index[to_node]].append(node_index[from_node])

    # Xây dựng listLinks
    listLinks = []
    for key in range(len(listNodes)):  # Đảm bảo đúng thứ tự index
        links = list(dict.fromkeys(adjacency_list[key]))  # Loại bỏ trùng lặp
        listLinks.append(links)


    # 5. Kết quả cuối cùng
    result = {
        "center": center,
        "listBoundaries": listBoundaries,
        "listNodes": listNodes,
        "list1Ways": list1Ways,
        "listLinks": listLinks,
    }

    # Đường dẫn thư mục hiện tại
    current_dir = os.getcwd()
    file_path = os.path.join(current_dir, "phuong_cong_vi_data.json")

    # Lưu vào file JSON
    save_result_to_file(result, file_path)

    print(f"Dữ liệu đã được lưu vào: {file_path}")
else:
    print("Lỗi khi gửi yêu cầu:", response.status_code)


def save_result_to_file(result, file_path):
    # Tùy chỉnh định dạng cho `list1Ways` và `listLinks` trước khi ghi
    list1Ways_formatted = [f"[{', '.join(map(str, way))}]" for way in result["list1Ways"]]
    listLinks_formatted = [f"[{', '.join(map(str, link))}]" for link in result["listLinks"]]
    
    # Ghi ra file với định dạng tùy chỉnh
    with open(file_path, "w", encoding="utf-8") as f:
        # Ghi các phần khác của JSON trước
        f.write('{\n')
        f.write(f'    "center": {json.dumps(result["center"], ensure_ascii=False)},\n')
        f.write(f'    "listBoundaries": [\n')
        f.write(',\n'.join([f'        {json.dumps(boundary, ensure_ascii=False)}' for boundary in result["listBoundaries"]]))
        f.write('\n    ],\n')
        f.write(f'    "listNodes": [\n')
        f.write(',\n'.join([f'        {json.dumps(node, ensure_ascii=False)}' for node in result["listNodes"]]))
        f.write('\n    ],\n')
        f.write(f'    "list1Ways": [\n        ')
        f.write(',\n        '.join(list1Ways_formatted))
        f.write('\n    ],\n')
        f.write(f'    "listLinks": [\n        ')
        f.write(',\n        '.join(listLinks_formatted))
        f.write('\n    ]\n')
        f.write('}\n')
