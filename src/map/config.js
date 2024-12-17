// declare variable
let polygon, polylineLinks = null, listNodes = null,
    polylinePath = null;

// constant 
const ICON_PIN = L.icon(
    options = {
        iconUrl: './src/img/pin.svg',
        className: 'icon-pin',
        iconSize: [30, 26],
        iconAnchor: [9, 26],
        popupAnchor: [0, 0]
    }
);

const ICON_BI = L.icon(
    options = {
        iconUrl: './src/img/bi.svg',
        className: 'icon-bi',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0]
    }
);

// build
function map_build(id) {
    // declare Leaflet map
    const map = L.map(
        id = id, 
        options = {
            center: DATA.center,
            zoom: 16,
        }
    );

    // Google Map Layer
    L.tileLayer(
        url = 'http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', 
        options = {
            subdomains:['mt0','mt1','mt2','mt3']
        }
    ).addTo(map);

    return map
};



// marker
function marker_pin(latlng, title='') {
    marker = L.marker(
        latlng = latlng,
        options = {
            icon: ICON_PIN,
        }
    )

    marker.bindTooltip( 
        title = title,
        options = {
            permanent: true,
            offset: [0, 4],
            direction: 'top',
        }
    )

    return marker
}

function marker_bi(latlng) {
    marker = L.marker(
        latlng = latlng,
        options = {
            icon: ICON_BI,
        }
    )

    return marker
}

// popup
function popup_label(latlng, content) {
    popup = L.popup(
        latlng = latlng,
        options = {
            content: content,
        }
    )

    return popup
}

function showPolygon(map, isActived) {
    if (!isActived) {
        map.removeLayer(polygon)
        return
    }

    let boundary, latlngs = [];

    for (let i=0; i<DATA.listBoundaries.length; i++) {
        boundary = [DATA.listBoundaries[i].lat, DATA.listBoundaries[i].lng]
        latlngs.push(boundary);
    }

    polygon = L.polygon(
        latlngs = latlngs, 
        option = {
            color: 'red'
        }
    ).addTo(map)
    .setStyle({fillColor: '#00000030'})
}

function showNodes(map, isActived) {
    if(!isActived) {
        for (let i=0; i<listNodes.length; i++)
            map.removeLayer(listNodes[i])
        return
    }
    
    let node;
    listNodes = [];

    // DATA.listExpandListNodes.map((latlug, index) => {
    DATA.listNodes.map((latlug, index) => {
        // node = marker_bi(latlug=latlug);                                // ---> for presentations
        node = marker_pin(latlug=latlug, title = index.toString());     // ---> for extract data only
        listNodes.push(node)
    })

    for (let i=0; i<listNodes.length; i++)
        listNodes[i].addTo(map)
} 

// show links
function showLinks(map, isActived) {
    if (!isActived) {
        for (i=0; i<polylineLinks.length; i++)
            map.removeLayer(polylineLinks[i])
        return
    }

    let polyline;
    polylineLinks = []
    
    for (let i=0; i<DATA.listLinks.length; i++) {
        let source = DATA.listNodes[i];
        for(let k=0; k<DATA.listLinks[i].length; k++) {
            let j = DATA.listLinks[i][k];
            let color = DATA.listLinks[j].includes(i) ? 'red' : 'blue'
            
            // if 2 way and sourceID > destinationID
            if(color === 'red' && j < i) continue;

            let destination = DATA.listNodes[j]
            
            polyline = L.polyline(
                latlngs=[source, destination], 
                options = {
                    color: color,
                    weight: 2,
                    opacity: 0.5,
                }
            ).addTo(map);

            polylineLinks.push(polyline);
        }
    }
}

function showPath(path, isActived) {
    if (!isActived) {
        (polylinePath) ? map.removeLayer(polylinePath) : null;
        return
    }

    latlngs = [listClickedNodes[0].getLatLng()];
    for (let i=0; i<path.length; i++)
        latlngs.push(GRAPH.listNodes[path[i]])
    latlngs.push(listClickedNodes[1].getLatLng())

    polylinePath = new L.Polyline(
        latlngs = latlngs, 
        options = {
            color: 'red',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1
        }
    ).addTo(map);
}