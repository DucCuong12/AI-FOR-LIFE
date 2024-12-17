let map = map_build(id='map')
let findPath = document.getElementById('find-path').value;
let dummyTSP = document.getElementById('dummy-TSP').value;
let mandatory = parseInt(document.getElementById('mandatory-point').value);
clickMAX = mandatory + 2;

handleMapClick(map)
document.getElementById('show-map').addEventListener("click", () => showMap(map))
document.getElementById('mandatory-point').addEventListener("change", () => reset(map))
document.getElementById('run').addEventListener("click", () => {
    initGraph();
    findPath = document.getElementById('find-path').value;
    dummyTSP = document.getElementById('dummy-TSP').value;

    const start = window.performance.now();

    let { distance, path } = 
        (parseInt(findPath) === 0) ? Floyd_Warshall(parseInt(dummyTSP)) :
        (parseInt(findPath) === 1) ? Dijkstra(parseInt(dummyTSP)) : 
        (parseInt(findPath) === 2) ? A_Star(parseInt(dummyTSP)) :
                                    { distance: null, path: null } ;
    const end = window.performance.now();

    const executionTime = end - start;
    console.log('time: ', executionTime, 'ms');
    console.log('path: ', path);
    console.log('distance: ', distance);

    document.getElementById('console').innerHTML = 
    `<table>
        <tr>
            <th>Distance (km)</th>
            <th>Time (ms)</th>
            <th>Path</th>
        </tr>
        <tr>
            <td>${distance.toFixed(4)}</td>
            <td>${executionTime}</td>
            <td>${JSON.stringify(path)}</td>
        </tr>
     </table>`;

    if(distance < 9)
        showPath(path, true);
})
