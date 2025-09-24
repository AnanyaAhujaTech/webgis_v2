/* js/app.js
   Production-ready Leaflet WebGIS behavior:
   - Loads geojson files listed in `geoFiles`
   - Creates radio buttons, selects & zooms to state
   - Clicking a state polygon opens modal with info
*/

(() => {
  // CONFIG: list of geojson files and labels (relative paths)
  const geoFiles = [
    {id: 'india', file: 'india.geojson', label: 'All India'},
    {id: 'madhya-pradesh', file: 'madhya-pradesh.geojson', label: 'Madhya Pradesh'},
    {id: 'odisha', file: 'odisha.geojson', label: 'Odisha'},
    {id: 'tripura', file: 'tripura.geojson', label: 'Tripura'},
    {id: 'telangana', file: 'telangana.geojson', label: 'Telangana'}
  ];

  // Text content shown in dialog for each state (customize as needed)
  const stateText = {
    'india': {
      title: 'India (All States)',
      body: 'This view contains all state boundaries from the provided India GeoJSON. Use the radios to zoom to a specific state, or click a state polygon on the map.'
    },
    'madhya-pradesh': {
      title: 'Madhya Pradesh',
      body: 'Madhya Pradesh — central Indian state. (Replace this text with whatever state-specific info you want shown.)'
    },
    'odisha': {
      title: 'Odisha',
      body: 'Odisha — eastern Indian state on the Bay of Bengal. (Replace with custom content.)'
    },
    'tripura': {
      title: 'Tripura',
      body: 'Tripura — a small northeastern state. (Replace with custom content.)'
    },
    'telangana': {
      title: 'Telangana',
      body: 'Telangana — state in southern India with capital Hyderabad. (Replace with custom content.)'
    }
  };

  // color palette for states
  const colors = ['#1f78b4','#33a02c','#e31a1c','#ff7f00','#6a3d9a'];

  // Leaflet map
  const map = L.map('map', {
    center: [22.0, 80.0],
    zoom: 5,
    preferCanvas: true
  });

  // Add OSM base tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // hold loaded layers
  const layers = {};
  const layerGroup = L.layerGroup().addTo(map);

  // helper: open modal
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalCloseBtn = document.getElementById('modal-close');

  function openModal(title, body) {
    modalTitle.textContent = title;
    if (typeof body === 'string') {
      modalBody.textContent = body;
    } else {
      modalBody.innerHTML = '';
      modalBody.appendChild(body);
    }
    modal.setAttribute('aria-hidden', 'false');
    modal.focus && modal.focus();
  }
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
  }
  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeModal();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeModal();
  });

  // Create radio buttons UI
  const controls = document.getElementById('controls');
  const stateGroup = document.createElement('div');
  stateGroup.className = 'state-group';
  controls.appendChild(stateGroup);

  // We'll create radios as we load the files so selection works only when layer is ready
  // Fetch and load all geojsons
  Promise.all(geoFiles.map((g, idx) =>
    fetch(g.file)
      .then(resp => {
        if (!resp.ok) throw new Error(`Failed to load ${g.file} (${resp.status})`);
        return resp.json();
      })
      .then(json => ({...g, geojson: json, idx}))
      .catch(err => ({...g, error: err}))
  )).then(results => {
    // Add radios, add layers that loaded
    results.forEach((res, i) => {
      const id = res.id;
      const label = res.label;

      // Radio element
      const radioId = `radio-${id}`;
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'state';
      radio.id = radioId;
      radio.value = id;
      radio.className = 'state-radio';
      radio.disabled = !!res.error;

      const lab = document.createElement('label');
      lab.setAttribute('for', radioId);
      lab.textContent = label;

      stateGroup.appendChild(radio);
      stateGroup.appendChild(lab);

      if (res.error) {
        lab.title = `Could not load ${res.file}: ${res.error.message}`;
        lab.style.opacity = 0.6;
        return;
      }

      // Create styled geojson layer
      const style = featureStyle(i);
      const gjLayer = L.geoJSON(res.geojson, {
        style,
        onEachFeature: function(feature, layer) {
          layer.on('click', function(e){
            // show custom dialog for this state (id)
            const title = (stateText[id] && stateText[id].title) || label;
            const body = (stateText[id] && stateText[id].body) || 'No description available.';
            openModal(title, body);
            // highlight on click briefly
            highlightLayer(layer);
          });
          // optional tooltip if feature has properties.name
          if (feature.properties && feature.properties.name) {
            layer.bindTooltip(feature.properties.name, {sticky:true});
          }
        }
      });

      layers[id] = gjLayer;
      // by default add the India layer (if id === 'india') otherwise keep but not added
      if (id === 'india') {
        layerGroup.addLayer(gjLayer);
        map.fitBounds(gjLayer.getBounds(), {padding: [20,20]});
        // mark its radio as checked
        const initialRadio = document.getElementById(radioId);
        if (initialRadio) initialRadio.checked = true;
      }

      // radio click behavior
      radio.addEventListener('change', function() {
        if (!this.checked) return;
        // remove previous
        layerGroup.clearLayers();
        if (layers[id]) {
          layerGroup.addLayer(layers[id]);
          const b = layers[id].getBounds();
          if (b && b.isValid()) map.fitBounds(b, {padding: [20,20]});
        }
        // open modal for this selection
        const title = (stateText[id] && stateText[id].title) || label;
        const body = (stateText[id] && stateText[id].body) || '';
        openModal(title, body);
      });
    });

    // Add a small instruction label
    const info = document.createElement('div');
    info.style.fontSize = '0.9rem';
    info.style.marginLeft = '8px';
    info.style.color = '#444';
    info.textContent = 'Choose a state or click one on the map';
    controls.appendChild(info);
  }).catch(err => {
    console.error('Fatal load error', err);
    openModal('Load error', 'Could not load geojson files. Check that the files exist and are served from the same directory as the site.');
  });

  // style factory
  function featureStyle(index){
    const c = colors[index % colors.length] || colors[0];
    return {
      color: c,
      weight: 1.8,
      opacity: 0.95,
      fillOpacity: 0.4
    };
  }

  // highlight briefly
  function highlightLayer(layer) {
    const orig = layer.options && {...layer.options};
    layer.setStyle({
      weight: 3,
      fillOpacity: 0.6
    });
    setTimeout(() => {
      layer.setStyle(orig);
    }, 800);
  }

})();
