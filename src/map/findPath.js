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

function Dijkstra(dummyTSP) {
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
    const dijkstra = function (S) {
        let P = new Array(N).fill(false)
        D[S][S] = 0;

        for (let i = 0; i < N; i++) {
            let uBest;
            let Max = INF;
            for (let u = 0; u < N; u++) {
                if(D[S][u] < Max && P[u] === false) {
                    uBest = u;
                    Max = D[S][u];
                }
            }

            let u = uBest;
            P[u] = true;
            links = GRAPH.listLinks[u];

            for (let k=0; k<links.length; k++) {
                let v = links[k];
                if(D[S][v] > D[S][u] + W[u][v]) {
                    D[S][v] = D[S][u] + W[u][v];
                    trace[S][v] = u;
                }
            }
        }
    };

    // Dijkstra algorithm
    let scene = [SOURCE, ...MANDATORY, DESTINATION];
    for (let k = 0; k < scene.length; k++)
        dijkstra(scene[k]);


    /* ------dummyTSP------ */
    const { minDistance, bestScene } =  (dummyTSP === 0) ? completeSearch(D, SOURCE, [...MANDATORY], DESTINATION) :
                                        (dummyTSP === 1) ? BnB(D, SOURCE, [...MANDATORY], DESTINATION) : 
                                        (dummyTSP === 2) ? GA(D, SOURCE, [...MANDATORY], DESTINATION) :
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