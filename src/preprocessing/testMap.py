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
  way[highway]["highway"!~"footway|path|cycleway|pedestrian|steps"](area.searchArea);
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
    # Xây dựng listBoundaries với thứ tự đúng của các điểm trên boundary
    listBoundaries = []
    visited_nodes = set()  # Để tránh thêm node trùng lặp
    boundary_order = []  # Danh sách các node theo đúng thứ tự

    # Tạo dictionary để lưu trữ các node liên kết với nhau
    node_connections = defaultdict(set)

    # Duyệt qua từng 'way' để tìm các điểm boundary
    for rel in relations:
        if "tags" in rel and rel["tags"].get("boundary") == "administrative":
            for member in rel.get("members", []):
                if member["type"] == "way":
                    way_id = member["ref"]
                    for way in ways:
                        if way["id"] == way_id and "nodes" in way:
                            # Xử lý các node trong way
                            for i in range(len(way["nodes"]) - 1):
                                from_node = way["nodes"][i]
                                to_node = way["nodes"][i + 1]
                                node_connections[from_node].add(to_node)
                                node_connections[to_node].add(from_node)

    # Tìm các node bắt đầu (có một liên kết duy nhất)
    start_node = None
    for node, connections in node_connections.items():
        if len(connections) == 2:  # Node này chỉ kết nối với 2 một node khác, có thể là điểm bắt đầu của biên
            start_node = node
            break

    # Duyệt qua các node để xây dựng thứ tự đúng của các điểm boundary
    current_node = start_node
    while current_node is not None:
        boundary_order.append(current_node)
        visited_nodes.add(current_node)

        # Lấy node tiếp theo từ danh sách kết nối
        next_nodes = node_connections[current_node] - visited_nodes
        if next_nodes:
            current_node = next(iter(next_nodes))  # Lấy node tiếp theo trong danh sách
        else:
            current_node = None  # Kết thúc nếu không còn node nào

    # Xây dựng listBoundaries từ các node đã được sắp xếp
    listBoundaries = [{"lat": nodes[node_id]["lat"], "lng": nodes[node_id]["lng"]}
                      for node_id in boundary_order if node_id in nodes]

    # 3. Xây dựng listNodes và map ID -> index (chỉ lấy node giao cắt)
    node_ways_map = defaultdict(set)
    for way in ways:
        if "nodes" in way:
            for node_id in way["nodes"]:
                node_ways_map[node_id].add(way["id"])

    # Chỉ lấy các node giao cắt (node xuất hiện trong nhiều way)
    intersection_nodes = {node_id: {"lat": nodes[node_id]["lat"], "lng": nodes[node_id]["lng"]}
                          for node_id, ways in node_ways_map.items() if len(ways) > 1}

    listNodes = list(intersection_nodes.values())
    node_index = {node_id: i for i, node_id in enumerate(intersection_nodes.keys())}

    # 4. Xây dựng list1Ways và listLinks
    list1Ways = []
    adjacency_list = defaultdict(list)

    for way in ways:
        if "nodes" in way:
            is_oneway = way.get("tags", {}).get("oneway", "no") == "yes"
            previous_node = None
    
            for node_id in way["nodes"]:
                if node_id in intersection_nodes:
                    if previous_node is not None:
                        # Tạo liên kết giữa node trước và node hiện tại nếu là giao điểm
                        from_index = node_index[previous_node]
                        to_index = node_index[node_id]
                        if is_oneway:
                            list1Ways.append([from_index, to_index])
                            adjacency_list[from_index].append(to_index)
                        else:
                            adjacency_list[from_index].append(to_index)
                            adjacency_list[to_index].append(from_index)
                    previous_node = node_id

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
