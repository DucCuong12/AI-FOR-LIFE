const INF = 99999;

let GRAPH = {
    source: null, 
    mandatory: null, 
    destination: null,
    listNodes: [],
    listLinks: [],
};
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính trái đất tính bằng km

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Khoảng cách giữa hai điểm theo Công thức Haversine

    return distance;
}

function findSatisfactionPoint(node) {
    // find
    let minDistance = 1000,
        tempNode, tempDistance,
        satisfactionNodeID = null;

    for (let i=0; i<DATA.listExpandListNodes.length; i++) {
        tempNode = DATA.listExpandListNodes[i];
        tempDistance = haversine(tempNode.lat, tempNode.lng, node.lat, node.lng);

        if (tempDistance < minDistance) {
            minDistance = tempDistance;
            satisfactionNodeID = i;
        }
    }

    return {
        isExpand : satisfactionNodeID >= DATA.listNodes.length ? true : satisfactionNodeID,
        location: DATA.listExpandListNodes[satisfactionNodeID],
        from: DATA.listExpandSourceNode[satisfactionNodeID],
        to: DATA.listExpandListLinks[satisfactionNodeID],
        node: null,
    };
}

function initGraph() { 
    showPath(null, false);

    GRAPH.source = null;
    GRAPH.mandatory = [];
    GRAPH.destination = null;
    // deep copy
    GRAPH.listNodes = JSON.parse(JSON.stringify(DATA.listNodes));
    GRAPH.listLinks = JSON.parse(JSON.stringify(DATA.listLinks));

    let n = clickMAX;
    let point, listIDs = [];
    let listNeighborIDs = {};

    // insert nodes (location only)
    for (let id=0; id<n; id++) {
        point = listNearestPoints[id];

        if(point.isExpand !== true) {
            listIDs.push(point.isExpand)
            continue;
        }

        listIDs.push(GRAPH.listNodes.length);
        GRAPH.listNodes.push(point.location)
        GRAPH.listLinks.push([])
    }

    // group nodes in a same way
    for (let i=0; i<n; i++) {
        point = listNearestPoints[i];
        if (point.isExpand !== true) continue;    

        if(!listNeighborIDs[point.to[0]]) listNeighborIDs[point.to[0]] = {}

        let type = point.from.length
        if(type === 1) {
            if(!listNeighborIDs[point.to[0]][point.from[0]])
                listNeighborIDs[point.to[0]][point.from[0]] = {type: 0, list: []};

            listNeighborIDs[point.to[0]][point.from[0]].type = type;
            listNeighborIDs[point.to[0]][point.from[0]].list.push(listIDs[i]);
        }
        else {
            if(!listNeighborIDs[point.to[0]][point.from[1]])
                listNeighborIDs[point.to[0]][point.from[1]] = {type: 0, list: []};

            listNeighborIDs[point.to[0]][point.from[1]].type = type;
            listNeighborIDs[point.to[0]][point.from[1]].list.push(listIDs[i]);
        }
    }

    // handle links
    for (const i in listNeighborIDs) {
        value = listNeighborIDs[i];

        for (const j in value) {
            v = value[j].list;

            // Sử dụng Công thức Haversine để tính khoảng cách trong vòng lặp
            for (let k = 0; k < v.length; k++) {
                for (let l = k + 1; l < v.length; l++) {
                    const ikDistance = haversine(
                        GRAPH.listNodes[i].lat,
                        GRAPH.listNodes[i].lng,
                        GRAPH.listNodes[v[k]].lat,
                        GRAPH.listNodes[v[k]].lng
                    );

                    const ilDistance = haversine(
                        GRAPH.listNodes[i].lat,
                        GRAPH.listNodes[i].lng,
                        GRAPH.listNodes[v[l]].lat,
                        GRAPH.listNodes[v[l]].lng
                    );

                    if (ikDistance > ilDistance) {
                        // Hoán đổi vị trí
                        let b = v[k];
                        v[k] = v[l];
                        v[l] = b;
                    }
                }
            }

            
            arr = [parseInt(i), ...value[j].list, parseInt(j)]

            // insert links
            if(value[j].type === 1) {
                let index = GRAPH.listLinks[parseInt(j)].indexOf(parseInt(i));
                GRAPH.listLinks[parseInt(j)].splice(index, 1); 

                for (let k=1; k<arr.length; k++)
                    GRAPH.listLinks[arr[k]].push(arr[k-1])
            }
            else if (value[j].type === 2) {
                let index = GRAPH.listLinks[parseInt(j)].indexOf(parseInt(i));
                GRAPH.listLinks[parseInt(j)].splice(index, 1); 

                index = GRAPH.listLinks[parseInt(i)].indexOf(parseInt(j));
                GRAPH.listLinks[parseInt(i)].splice(index, 1); 

                for (let k=0; k<arr.length; k++) {
                    if(k>0) GRAPH.listLinks[arr[k]].push(arr[k-1])
                    if(k<arr.length-1) GRAPH.listLinks[arr[k]].push(arr[k+1])
                }
            }

            // sort
            for (let k=0; k<arr.length; k++) 
                GRAPH.listLinks[arr[k]].sort((a, b) => a - b);
        }
    }

    GRAPH.source = listIDs[0];          listIDs.shift();
    GRAPH.destination = listIDs[0];     listIDs.shift();
    GRAPH.mandatory = [...listIDs];
}

/* -----------------------------------Algorithms----------------------------------- */
function Floyd_Warshall(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
        SOURCE = GRAPH.source,
        DESTINATION = GRAPH.destination;

    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));

    // W, D
    for (let u=0; u<N; u++) {
        W[u][u] = 0;
        
        links = GRAPH.listLinks[u]
        for (let k=0; k<links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(GRAPH.listNodes[u].lat, GRAPH.listNodes[u].lng, GRAPH.listNodes[v].lat, GRAPH.listNodes[v].lng);

        }
    }
    let D = JSON.parse(JSON.stringify(W));

    // trace
    for (let u = 0; u < N; u++)
        for (let v = 0; v < N; v++)
            trace[u][v] = u;


    /* -------implement------- */
    // Floyd-Warshall algorithm
    for (let k = 0; k < N; k++) {
        for (let u = 0; u < N; u++) {
            for (let v = 0; v < N; v++) {
                if (D[u][v] > D[u][k] + D[k][v]) {
                    D[u][v] = D[u][k] + D[k][v];
                    trace[u][v] = trace[k][v];
                }
            }
        }
    }


    /* ------dummyTSP------ */
    const { minDistance, bestScene } =  (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION) : 
                                        (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 3) ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        { distance: null, path: null };

    // trace
    path = []
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k-1];
        let v = bestScene[k];

        path.push(v);
        while (v != u) { // trace back from v to u
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();
        
    return {distance: minDistance, path: path};
}
function DFS(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
        SOURCE = GRAPH.source,
        DESTINATION = GRAPH.destination;

    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));

    // W, D
    for (let u = 0; u < N; u++) {
        W[u][u] = 0;

        links = GRAPH.listLinks[u];
        for (let k = 0; k < links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(
                GRAPH.listNodes[u].lat,
                GRAPH.listNodes[u].lng,
                GRAPH.listNodes[v].lat,
                GRAPH.listNodes[v].lng
            );
        }
    }
    let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    // trace
    for (let u = 0; u < N; u++)
        for (let v = 0; v < N; v++)
            trace[u][v] = u;

    /* -------implement------- */
    const dfs = function (S) {
        let visited = new Array(N).fill(false);

        const dfsVisit = (u) => {
            visited[u] = true;
            let links = GRAPH.listLinks[u];

            for (let k = 0; k < links.length; k++) {
                let v = links[k];
                if (!visited[v] || D[S][v] > D[S][u] + W[u][v]) {
                    D[S][v] = D[S][u] + W[u][v];
                    trace[S][v] = u;

                    if (!visited[v]) {
                        dfsVisit(v); // Đệ quy thăm đỉnh kề
                    }
                }
            }
        };

        D[S][S] = 0;
        dfsVisit(S);
    };

    // DFS algorithm
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let k = 0; k < scene.length; k++) dfs(scene[k]);

    /* ------dummyTSP------ */
    const { minDistance, bestScene } = (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION) : 
                                        (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 3) ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        { distance: null, path: null };

    // trace
    path = [];
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k - 1];
        let v = bestScene[k];

        path.push(v);
        while (v != u) { // trace back from v to u
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();
    return { distance: minDistance, path: path };
}

function Dijkstra(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
        SOURCE = GRAPH.source,
        DESTINATION = GRAPH.destination;

    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));

    // W, D
    for (let u = 0; u < N; u++) {
        W[u][u] = 0;

        let links = GRAPH.listLinks[u];
        for (let k = 0; k < links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(
                GRAPH.listNodes[u].lat,
                GRAPH.listNodes[u].lng,
                GRAPH.listNodes[v].lat,
                GRAPH.listNodes[v].lng
            );
        }
    }
    let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    // trace
    for (let u = 0; u < N; u++)
        for (let v = 0; v < N; v++)
            trace[u][v] = u;

    /* -------implement------- */
    const dijkstra = function (S) {
        let P = new Array(N).fill(false);
        D[S][S] = 0;

        for (let i = 0; i < N; i++) {
            let uBest = -1;
            let minDistance = INF;
            for (let u = 0; u < N; u++) {
                if (D[S][u] < minDistance && !P[u]) {
                    uBest = u;
                    minDistance = D[S][u];
                }
            }

            // Kiểm tra nếu không có đỉnh khả thi
            if (uBest === -1) break;

            let u = uBest;
            P[u] = true;
            let links = GRAPH.listLinks[u] || [];

            for (let k = 0; k < links.length; k++) {
                let v = links[k];
                if (D[S][v] > D[S][u] + W[u][v]) {
                    D[S][v] = D[S][u] + W[u][v];
                    trace[S][v] = u;
                }
            }
        }
    };

    // Dijkstra algorithm
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let k = 0; k < scene.length; k++) {
        if (scene[k] >= 0 && scene[k] < N) {
            dijkstra(scene[k]);
        }
    }

    /* ------dummyTSP------ */
    const { minDistance, bestScene } =
        dummyTSP === 0
            ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION)
            : dummyTSP === 1
            ? BnB(D, SOURCE, [...MANDATORY], DESTINATION)
            : dummyTSP === 2
            ? GA(D, SOURCE, [...MANDATORY], DESTINATION)
            : dummyTSP === 3
            ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) 
            : { distance: null, path: null };

    // trace
    let path = [];
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k - 1];
        let v = bestScene[k];

        path.push(v);
        while (v != u) {
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();
    return { distance: minDistance, path: path };
}


function BFS(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
        SOURCE = GRAPH.source,
        DESTINATION = GRAPH.destination;

    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));

    // W, D
    for (let u = 0; u < N; u++) {
        W[u][u] = 0;

        links = GRAPH.listLinks[u];
        for (let k = 0; k < links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(
                GRAPH.listNodes[u].lat,
                GRAPH.listNodes[u].lng,
                GRAPH.listNodes[v].lat,
                GRAPH.listNodes[v].lng
            );
        }
    }
    let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    // trace
    for (let u = 0; u < N; u++)
        for (let v = 0; v < N; v++)
            trace[u][v] = u;

    /* -------implement------- */
    const bfs = function (S) {
        let queue = [];
        let visited = new Array(N).fill(false);
        D[S][S] = 0;
        queue.push(S);
        visited[S] = true;

        while (queue.length > 0) {
            let u = queue.shift();
            let links = GRAPH.listLinks[u];

            for (let k = 0; k < links.length; k++) {
                let v = links[k];
                if (!visited[v] || D[S][v] > D[S][u] + W[u][v]) {
                    D[S][v] = D[S][u] + W[u][v];
                    trace[S][v] = u;

                    if (!visited[v]) {
                        queue.push(v);
                        visited[v] = true;
                    }
                }
            }
        }
    };

    // BFS algorithm
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let k = 0; k < scene.length; k++) bfs(scene[k]);

    /* ------dummyTSP------ */
    const { minDistance, bestScene } = (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION) : 
                                        (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 3) ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        { distance: null, path: null };

    // trace
    path = [];
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k - 1];
        let v = bestScene[k];

        path.push(v);
        while (v != u) { // trace back from v to u
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();
    return { distance: minDistance, path: path };
}



function A_Star(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
        SOURCE = GRAPH.source,
        DESTINATION = GRAPH.destination;

    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));

    // W, D
    for (let u=0; u<N; u++) {
        W[u][u] = 0;
        
        links = GRAPH.listLinks[u]
        for (let k=0; k<links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(
                GRAPH.listNodes[u].lat,
                GRAPH.listNodes[u].lng,
                GRAPH.listNodes[v].lat,
                GRAPH.listNodes[v].lng
            );
        }
    }
    let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    // trace
    for (let u = 0; u < N; u++)
        for (let v = 0; v < N; v++)
            trace[u][v] = u;


    /* -------implement------- */
    // heuristic function
    let h = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    for (let u=0; u<N; u++) {
        h[u][u] = 0;
        
        links = GRAPH.listLinks[u]
        for (let v=0; v<N; v++) {
            h[u][v] =   // Manhattan distance
                Math.abs(GRAPH.listNodes[u].lat - GRAPH.listNodes[v].lat) +
                Math.abs(GRAPH.listNodes[u].lng - GRAPH.listNodes[v].lng)
        }
    }

    const aStar = function (S, E) {
        let P = new Array(N).fill(false)
        let Q = [S];
        D[S][S] = 0;

        while(Q.length !== 0) {
            let iBest;
            let Max = INF;

            for (let i = 0; i < Q.length; i++) {
                let u = Q[i];

                if(D[S][u] + h[u][E] < Max && P[u] === false) {
                    iBest = i;
                    Max = D[S][u] + h[u][E];
                }
            }
    
            let u = Q[iBest];
            for (let i = 0; i < Q.length; i++)
                if(Q[i] === u) Q.splice(i, 1);

            P[u] = true;
            links = GRAPH.listLinks[u];
            
            if(u === E) return;

            for (let k=0; k<links.length; k++) {
                let v = links[k];
                if(P[v] === false) {
                    if(D[S][v] > D[S][u] + W[u][v]) {
                        D[S][v] = D[S][u] + W[u][v];
                        trace[S][v] = u;
                    }
                    Q.push(v);
                }
            }
        }
    };

    // A-Star algorithm
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let i = 0; i < scene.length; i++)
        for (let j = i + 1; j < scene.length; j++) {
            aStar(scene[i], scene[j]);
            aStar(scene[j], scene[i]);
        }

    /* ------dummyTSP------ */
    const { minDistance, bestScene } =  (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION) : 
                                        (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 3) ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        { distance: null, path: null };
    
    // trace
    path = []
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k-1];
        let v = bestScene[k];

        path.push(v);
        while (v != u) { // trace back from v to u
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();

    return {distance: minDistance, path: path};
}







function BellmanFord(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
        SOURCE = GRAPH.source,
        DESTINATION = GRAPH.destination;

    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));

    // W
    for (let u = 0; u < N; u++) {
        W[u][u] = 0;

        let links = GRAPH.listLinks[u];
        for (let k = 0; k < links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(
                GRAPH.listNodes[u].lat,
                GRAPH.listNodes[u].lng,
                GRAPH.listNodes[v].lat,
                GRAPH.listNodes[v].lng
            );
        }
    }

    let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    // trace
    for (let u = 0; u < N; u++)
        for (let v = 0; v < N; v++)
            trace[u][v] = u;

    /* -------implement------- */
    const bellmanFord = function (S) {
        D[S][S] = 0;

        for (let i = 0; i < N - 1; i++) { // Lặp N-1 lần để tối ưu hóa khoảng cách
            for (let u = 0; u < N; u++) {
                let links = GRAPH.listLinks[u];
                for (let k = 0; k < links.length; k++) {
                    let v = links[k];
                    if (D[S][u] + W[u][v] < D[S][v]) {
                        D[S][v] = D[S][u] + W[u][v];
                        trace[S][v] = u;
                    }
                }
            }
        }

        // Kiểm tra chu trình âm
        for (let u = 0; u < N; u++) {
            let links = GRAPH.listLinks[u];
            for (let k = 0; k < links.length; k++) {
                let v = links[k];
                if (D[S][u] + W[u][v] < D[S][v]) {
                    throw new Error("Đồ thị chứa chu trình âm");
                }
            }
        }
    };

    // Bellman-Ford algorithm
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let k = 0; k < scene.length; k++) bellmanFord(scene[k]);

    /* ------dummyTSP------ */
    const { minDistance, bestScene } = (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION) : 
                                        (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 3) ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        { distance: null, path: null };

    // trace
    path = [];
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k - 1];
        let v = bestScene[k];

        path.push(v);
        while (v != u) { // trace back from v to u
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();
    return { distance: minDistance, path: path };
}



function Greedy1(dummyTSP) {
    /* ---------init--------- */
    const N = GRAPH.listNodes.length,
          SOURCE = GRAPH.source,
          DESTINATION = GRAPH.destination;
    let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
    
    // Initialize weight and trace matrices
    let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
        trace = new Array(N).fill(0).map(() => new Array(N).fill(0));
    
    // Set up weights
    for (let u = 0; u < N; u++) {
        W[u][u] = 0;
        let links = GRAPH.listLinks[u];
        for (let k = 0; k < links.length; k++) {
            let v = links[k];
            W[u][v] = haversine(
                GRAPH.listNodes[u].lat, GRAPH.listNodes[u].lng,
                GRAPH.listNodes[v].lat, GRAPH.listNodes[v].lng
            );
        }
    }
    
    let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));
    
    // Initialize trace matrix
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            trace[u][v] = u;
        }
    }

    /* -------implement Greedy------- */
    const greedySearch = function(S) {
        // Initialize distances
        D[S] = [...W[S]];  // Copy initial weights from source
        for (let v = 0; v < N; v++) {
            trace[S][v] = S;  // Initial trace points back to source
        }
        
        let unvisited = new Set(Array.from({length: N}, (_, i) => i));
        unvisited.delete(S);
        
        while (unvisited.size > 0) {
            let minDist = INF;
            let nextNode = -1;
            
            // Find closest unvisited node
            for (let v of unvisited) {
                if (D[S][v] < minDist) {
                    minDist = D[S][v];
                    nextNode = v;
                }
            }
            
            // If no reachable nodes left, try connecting through visited nodes
            if (nextNode === -1) {
                for (let v of unvisited) {
                    for (let u = 0; u < N; u++) {
                        if (!unvisited.has(u)) {  // u is visited
                            let newDist = D[S][u] + W[u][v];
                            if (newDist < D[S][v]) {
                                D[S][v] = newDist;
                                trace[S][v] = u;
                            }
                        }
                    }
                }
                break;  // Exit after one pass of improvements
            }
            
            unvisited.delete(nextNode);
            
            // Update distances through this node
            let links = GRAPH.listLinks[nextNode];
            for (let k = 0; k < links.length; k++) {
                let v = links[k];
                let newDist = D[S][nextNode] + W[nextNode][v];
                if (newDist < D[S][v]) {
                    D[S][v] = newDist;
                    trace[S][v] = nextNode;
                }
            }
        }
    };

    // Run greedy search for each required node
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let k = 0; k < scene.length; k++) {
        greedySearch(scene[k]);
    }

    /* ------dummyTSP------ */
    const { minDistance, bestScene } = (dummyTSP === 0) 
        ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION)
        : (dummyTSP === 1) 
            ? BnB(D, SOURCE, [...MANDATORY], DESTINATION)
            : (dummyTSP === 2) 
                ? GA(D, SOURCE, [...MANDATORY], DESTINATION)
                : { minDistance: null, bestScene: null };

    if (!bestScene) {
        return { distance: null, path: null };
    }

    // Trace path
    let path = [];
    for (let k = bestScene.length - 1; k > 0; k--) {
        let u = bestScene[k-1];
        let v = bestScene[k];
        path.push(v);
        
        while (v != u) {
            v = trace[u][v];
            if (v != u) path.push(v);
        }
    }
    path.push(bestScene[0]);
    path = path.reverse();

    return {
        distance: minDistance,
        path: path
    };
}




function UniformCostSearch(dummyTSP) {
        /* ---------init--------- */
        const N = GRAPH.listNodes.length,
              SOURCE = GRAPH.source,
              DESTINATION = GRAPH.destination;
        let MANDATORY = JSON.parse(JSON.stringify(GRAPH.mandatory));
        
        // Initialize weight and trace matrices
        let W = new Array(N).fill(INF).map(() => new Array(N).fill(INF)),
            trace = new Array(N).fill(0).map(() => new Array(N).fill(0));
        
        // Set up weights
        for (let u = 0; u < N; u++) {
            W[u][u] = 0;
            let links = GRAPH.listLinks[u];
            for (let k = 0; k < links.length; k++) {
                let v = links[k];
                W[u][v] = haversine(
                    GRAPH.listNodes[u].lat, GRAPH.listNodes[u].lng,
                    GRAPH.listNodes[v].lat, GRAPH.listNodes[v].lng
                );
            }
        }
        
        let D = new Array(N).fill(INF).map(() => new Array(N).fill(INF));
        
        // Initialize trace matrix
        for (let u = 0; u < N; u++) {
            for (let v = 0; v < N; v++) {
                trace[u][v] = u;
            }
        }
    
        /* -------implement UCS------- */
        class PriorityQueue {
            constructor() {
                this.values = [];
            }
            
            enqueue(node, priority) {
                this.values.push({node, priority});
                this.sort();
            }
            
            dequeue() {
                return this.values.shift();
            }
            
            sort() {
                this.values.sort((a, b) => a.priority - b.priority);
            }
    
            isEmpty() {
                return this.values.length === 0;
            }
        }
    
        const uniformCostSearch = function(S) {
            // Initialize distances
            D[S][S] = 0;
            
            // Create priority queue
            let pq = new PriorityQueue();
            pq.enqueue(S, 0);
            
            // Keep track of visited nodes
            let visited = new Set();
            
            while (!pq.isEmpty()) {
                let {node: u, priority: currentDist} = pq.dequeue();
                
                // Skip if we've already found a better path
                if (visited.has(u)) continue;
                
                // Mark as visited
                visited.add(u);
                
                // Get neighbors
                let links = GRAPH.listLinks[u];
                
                // Explore neighbors
                for (let k = 0; k < links.length; k++) {
                    let v = links[k];
                    
                    if (!visited.has(v)) {
                        let newDist = D[S][u] + W[u][v];
                        
                        if (newDist < D[S][v]) {
                            D[S][v] = newDist;
                            trace[S][v] = u;
                            pq.enqueue(v, newDist);
                        }
                    }
                }
            }
        };
    
        // Run UCS for each required node
        let scene = [SOURCE, ...MANDATORY, DESTINATION];
        for (let k = 0; k < scene.length; k++) {
            uniformCostSearch(scene[k]);
        }
    
        /* ------dummyTSP------ */
        const { minDistance, bestScene } = 
        (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION):
         (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION): 
         (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION):
         (dummyTSP === 3) ? Greedy(D, SOURCE, [...MANDATORY], DESTINATION) :
          { minDistance: null, bestScene: null };
    
        // Trace path
        let path = [];
        for (let k = bestScene.length - 1; k > 0; k--) {
            let u = bestScene[k-1];
            let v = bestScene[k];
            path.push(v);
            
            while (v != u) {
                v = trace[u][v];
                if (v != u) path.push(v);
            }
        }
        path.push(bestScene[0]);
        path = path.reverse();
    
        return {
            distance: minDistance,
            path: path
        };
    }
    