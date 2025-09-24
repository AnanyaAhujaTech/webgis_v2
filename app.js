const MAP_START = {
    center: [82.8, 22.0], // India center
    zoom: 4.0,
    minZoom: 3.5,
    maxZoom: 11,
    bearing: 0,
    style: 'https://demotiles.maplibre.org/style.json',
};

const stateInfo = {
    'india': {
        name: 'All India',
        info: `<strong>India:</strong> The Indian Republic, a vast and diverse nation in South Asia, consisting of 28 states and 8 union territories. Click on a state to view more information.`
    },
    'madhya-pradesh': {
        name: 'Madhya Pradesh',
        info: `<strong>Madhya Pradesh:</strong> The "Heart of India", known for its rich history, wildlife parks, and cultural heritage.`
    },
    'odisha': {
        name: 'Odisha',
        info: `<strong>Odisha:</strong> Eastern coastal state famous for the Jagannath Temple, Puri beaches, and classical dance Odissi.`
    },
    'tripura': {
        name: 'Tripura',
        info: `<strong>Tripura:</strong> Northeastern state bordered by Bangladesh, known for its palaces, tribal culture, and lush hills.`
    },
    'telangana': {
        name: 'Telangana',
        info: `<strong>Telangana:</strong> Southern state with growing tech industries, Hyderabad, and remarkable architectural sites.`
    }
};

const stateLayers = [
    {key: 'madhya-pradesh',   file: 'madhya-pradesh.geojson',  color: '#c53b3b'},
    {key: 'odisha',           file: 'odisha.geojson',          color: '#2157a2'},
    {key: 'tripura',          file: 'tripura.geojson',         color: '#1eaa64'},
    {key: 'telangana',        file: 'telangana.geojson',       color: '#a167c9'},
];

const baseLayer = {key: 'india', file: 'india.geojson', color: '#e1e1e1'};

let map;
let loadedLayers = {};

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: MAP_START.style,
        center: MAP_START.center,
        zoom: MAP_START.zoom,
        minZoom: MAP_START.minZoom,
        maxZoom: MAP_START.maxZoom,
        bearing: MAP_START.bearing,
        attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    showLoading(true);
    map.on('load', () => {
        loadLayer(baseLayer, true, true, true, 'india');
        // By default, load all states for All India
        stateLayers.forEach(layer => loadLayer(layer, true, false, false, layer.key));
        showLoading(false);
    });
}

// Helper: Load GeoJSON Layer
function loadLayer(layer, show, fitBounds, hoverHighlight, stateKey) {
    fetch(layer.file)
        .then(response => response.json())
        .then(geojson => {
            if(map.getSource(layer.key)) {
                if(map.getLayer(`${layer.key}-fill`)) map.removeLayer(`${layer.key}-fill`);
                if(map.getLayer(`${layer.key}-outline`)) map.removeLayer(`${layer.key}-outline`);
                map.removeSource(layer.key);
            }
            map.addSource(layer.key, {type: 'geojson', data: geojson});
            map.addLayer({
                id: `${layer.key}-fill`,
                type: 'fill',
                source: layer.key,
                paint: {
                    'fill-color': layer.color,
                    'fill-opacity': 0.22,
                },
                layout: {visibility: show ? 'visible' : 'none'}
            });
            map.addLayer({
                id: `${layer.key}-outline`,
                type: 'line',
                source: layer.key,
                paint: {
                    'line-color': layer.color,
                    'line-width': 2
                },
                layout: {visibility: show ? 'visible' : 'none'}
            });
            map.on('click', `${layer.key}-fill`, (e) => {
                openModal(stateKey, geojson, e);
            });
            map.on('mouseenter', `${layer.key}-fill`, () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', `${layer.key}-fill`, () => {
                map.getCanvas().style.cursor = '';
            });
            if(fitBounds) {
                const bbox = turf.bbox(geojson);
                map.fitBounds(bbox, {padding: 30, duration: 800});
            }
            loadedLayers[layer.key] = true;
        })
        .catch(err => {
            console.error('Error loading', layer.file, err);
        });
}

function updateLayers(selectedKey) {
    if(selectedKey === 'all') {
        loadLayer(baseLayer, true, true, false, 'india');
        stateLayers.forEach(layer => {
            loadLayer(layer, true, false, false, layer.key);
        });
    } else {
        loadLayer(baseLayer, true, false, false, 'india');
        stateLayers.forEach(layer => {
            if(layer.key === selectedKey){
                loadLayer(layer, true, true, false, layer.key);
            } else {
                if(map.getLayer(`${layer.key}-fill`)){
                    map.setLayoutProperty(`${layer.key}-fill`, 'visibility', 'none');
                }
                if(map.getLayer(`${layer.key}-outline`)){
                    map.setLayoutProperty(`${layer.key}-outline`, 'visibility', 'none');
                }
            }
        });
    }
}

function openModal(stateKey, geojson, event) {
    let title = stateInfo[stateKey]?.name || "State Information";
    let body = stateInfo[stateKey]?.info || "No information available.";
    if(event && event.features && event.features.length && event.features[0].properties) {
        let extras = '';
        const props = event.features[0].properties;
        for(let k in props) {
            extras += `<strong>${k}</strong>: ${props[k]}<br>`;
        }
        body += `<br><br><u>GeoJSON Properties:</u><br>` + extras;
    }
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('stateModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('stateModal').style.display = 'none';
}

window.onload = function() {
    initMap();
    document.querySelectorAll('input[type=radio][name=state]').forEach(radio => {
        radio.addEventListener('change', function(e) {
            updateLayers(e.target.value);
        });
    });
    document.getElementsByClassName('close')[0].onclick = closeModal;
    window.onclick = function(event) {
        let modal = document.getElementById('stateModal');
        if (event.target === modal) closeModal();
    };
};

// Turf.js for bbox calculation
var script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@turf/turf/turf.min.js';
document.head.appendChild(script);
