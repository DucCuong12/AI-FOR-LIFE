let clickCNT = 0, 
    clickMAX = 2, 
    listClickedNodes = [null, null, null, null, null],  
    listNearestPoints = [null, null, null, null, null], 
    isActivedShowMap = false
; 

function handleMapClick(map) {
	map.on('click', (e) => {
        let nearestPoint = findSatisfactionPoint(e.latlng);

        (listNearestPoints[clickCNT]) ? map.removeLayer(listNearestPoints[clickCNT].node) : null
        listNearestPoints[clickCNT] = nearestPoint;
        listNearestPoints[clickCNT].node = marker_bi(listNearestPoints[clickCNT].location).addTo(map);

        if (clickCNT === 0) {           // source node
            (listClickedNodes[0]) ? map.removeLayer(listClickedNodes[0]) : null;
		    listClickedNodes[0] = marker_pin(e.latlng, 'S').addTo(map);

            showPath(null, false)
        } 
        else if (clickCNT === 1) {    // destination node
            (listClickedNodes[1]) ? map.removeLayer(listClickedNodes[1]) : null;
		    listClickedNodes[1] = marker_pin(e.latlng, ' D').addTo(map);
        }

        clickCNT = (clickCNT >= clickMAX - 1) ? 0 : clickCNT + 1;
	});
};

function reset(map) {
    clickCNT = 0;
    clickMAX = parseInt(document.getElementById('mandatory-point').value) + 2;

    for (let i=0; i<5; i++) {
        (listClickedNodes[i]) ? map.removeLayer(listClickedNodes[i]) : null;
        listClickedNodes[i] = null
    }

    for (let i=0; i<5; i++) {
        (listNearestPoints[i]) ? map.removeLayer(listNearestPoints[i].node) : null;
        listNearestPoints[i] = null
    }

    showPath(null, false);
}

function showMap(map) {
    isActivedShowMap = !isActivedShowMap;
    showPolygon(map, isActivedShowMap);
    showNodes(map, isActivedShowMap);
    showLinks(map, isActivedShowMap);
};