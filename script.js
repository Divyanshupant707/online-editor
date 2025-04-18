document.addEventListener('DOMContentLoaded', () => {
    // Canvas and context
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    let canvasWidth = 800;
    let canvasHeight = 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Image and layers
    let layers = [];
    let activeLayerIndex = 0;

    // History for undo/redo
    let history = [];
    let historyIndex = -1;

    // Current tool and properties
    let currentTool = 'select';
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    // Zoom and transform
    let zoomLevel = 1;
    let rotation = 0;
    let flipH = false;
    let flipV = false;

    // Adjustment values
    const adjustments = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        hue: 0,
        temperature: 0
    };

    // Brush properties
    const brushProps = {
        size: 10,
        hardness: 50,
        opacity: 1,
        color: '#000000'
    };

    // Text properties
    const textProps = {
        content: '',
        font: 'Arial',
        size: 24,
        color: '#000000'
    };

    // Shape properties
    const shapeProps = {
        type: 'rectangle',
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 2
    };

    // DOM elements
    const fileInput = document.getElementById('file-input');
    const openFileBtn = document.getElementById('open-file');
    const saveFileBtn = document.getElementById('save-file');
    const saveFormatSelect = document.getElementById('save-format');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const exposureSlider = document.getElementById('exposure');
    const hueSlider = document.getElementById('hue');
    const temperatureSlider = document.getElementById('temperature');
    const filterThumbnails = document.querySelectorAll('.filter-thumbnail');
    const layersContainer = document.querySelector('.layers-container');
    const addLayerBtn = document.getElementById('add-layer');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const rotateLeftBtn = document.getElementById('rotate-left');
    const rotateRightBtn = document.getElementById('rotate-right');
    const flipHorizontalBtn = document.getElementById('flip-horizontal');
    const flipVerticalBtn = document.getElementById('flip-vertical');
    const cursorPositionSpan = document.getElementById('cursor-position');
    const imageSizeSpan = document.getElementById('image-size');
    const zoomLevelSpan = document.getElementById('zoom-level');

    // Tool properties panels
    const brushProperties = document.querySelector('.brush-properties');
    const textProperties = document.querySelector('.text-properties');
    const shapeProperties = document.querySelector('.shape-properties');

    // Initialize
    function init() {
        createLayer();
        updateToolProperties();
        updateStatusBar();
        attachEventListeners();
    }

    // Create a new layer
    function createLayer(image) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvasWidth;
        layerCanvas.height = canvasHeight;
        const layerCtx = layerCanvas.getContext('2d');
        if (image) {
            layerCtx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
        }
        layers.push({canvas: layerCanvas, ctx: layerCtx, visible: true});
        activeLayerIndex = layers.length - 1;
        renderLayers();
        addLayerToUI();
        saveHistory();
    }

    // Add layer to UI
    function addLayerToUI() {
        layersContainer.innerHTML = '';
        layers.forEach((layer, index) => {
            const layerItem = document.createElement('div');
            layerItem.classList.add('layer-item');
            if (index === activeLayerIndex) {
                layerItem.classList.add('active');
            }
            const span = document.createElement('span');
            span.textContent = index === 0 ? 'Background' : `Layer ${index}`;
            const actions = document.createElement('div');
            actions.classList.add('layer-actions');

            const visibilityBtn = document.createElement('button');
            visibilityBtn.classList.add('layer-btn');
            visibilityBtn.title = 'Visibility';
            visibilityBtn.innerHTML = layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            visibilityBtn.addEventListener('click', () => {
                layer.visible = !layer.visible;
                visibilityBtn.innerHTML = layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
                renderLayers();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('layer-btn');
            deleteBtn.title = 'Delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => {
                if (layers.length > 1) {
                    layers.splice(index, 1);
                    if (activeLayerIndex >= layers.length) {
                        activeLayerIndex = layers.length - 1;
                    }
                    addLayerToUI();
                    renderLayers();
                    saveHistory();
                }
            });

            layerItem.addEventListener('click', () => {
                activeLayerIndex = index;
                addLayerToUI();
            });

            actions.appendChild(visibilityBtn);
            actions.appendChild(deleteBtn);
            layerItem.appendChild(span);
            layerItem.appendChild(actions);
            layersContainer.appendChild(layerItem);
        });
    }

    // Render all visible layers to main canvas
    function renderLayers() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.save();

        // Apply zoom, rotation, flip
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

        layers.forEach(layer => {
            if (layer.visible) {
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });

        ctx.restore();

        applyAdjustments();
    }

    // Apply adjustments using CSS filters on canvas container
    function applyAdjustments() {
        const filterString = `
            brightness(${100 + adjustments.brightness}%)
            contrast(${100 + adjustments.contrast}%)
            saturate(${100 + adjustments.saturation}%)
            hue-rotate(${adjustments.hue}deg)
        `;
        canvas.style.filter = filterString;
        // Note: exposure and temperature adjustments would require more complex processing (not implemented here)
    }

    // Save current canvas state to history
    function saveHistory() {
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        const snapshot = canvas.toDataURL();
        history.push(snapshot);
        historyIndex++;
        updateUndoRedoButtons();
    }

    // Undo action
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            loadHistory(history[historyIndex]);
            updateUndoRedoButtons();
        }
    }

    // Redo action
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            loadHistory(history[historyIndex]);
            updateUndoRedoButtons();
        }
    }

    // Load history snapshot
    function loadHistory(dataUrl) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }

    // Update undo/redo buttons state
    function updateUndoRedoButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // Update status bar
    function updateStatusBar() {
        zoomLevelSpan.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
        if (layers.length > 0) {
            const activeLayer = layers[activeLayerIndex];
            imageSizeSpan.textContent = `Image Size: ${activeLayer.canvas.width} x ${activeLayer.canvas.height}`;
        } else {
            imageSizeSpan.textContent = 'No image loaded';
        }
    }

    // Update cursor position
    function updateCursorPosition(x, y) {
        cursorPositionSpan.textContent = `X: ${x}, Y: ${y}`;
    }

    // Attach event listeners
    function attachEventListeners() {
        // Open file button
        openFileBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const img = new Image();
                const reader = new FileReader();
                reader.onload = (evt) => {
                    img.onload = () => {
                        createLayer(img);
                        updateStatusBar();
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Save file button
        saveFileBtn.addEventListener('click', () => {
            const format = saveFormatSelect.value;
            let mimeType = 'image/png';
            if (format === 'jpeg') mimeType = 'image/jpeg';
            else if (format === 'webp') mimeType = 'image/webp';

            const link = document.createElement('a');
            link.download = `edited-image.${format}`;
            link.href = canvas.toDataURL(mimeType);
            link.click();
        });

        // Undo/Redo buttons
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);

        // Tool buttons
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.getAttribute('data-tool');
                updateToolProperties();
            });
        });

        // Adjustment sliders
        brightnessSlider.addEventListener('input', () => {
            adjustments.brightness = parseInt(brightnessSlider.value);
            document.getElementById('brightness-value').textContent = adjustments.brightness;
            applyAdjustments();
        });
        contrastSlider.addEventListener('input', () => {
            adjustments.contrast = parseInt(contrastSlider.value);
            document.getElementById('contrast-value').textContent = adjustments.contrast;
            applyAdjustments();
        });
        saturationSlider.addEventListener('input', () => {
            adjustments.saturation = parseInt(saturationSlider.value);
            document.getElementById('saturation-value').textContent = adjustments.saturation;
            applyAdjustments();
        });
        exposureSlider.addEventListener('input', () => {
            adjustments.exposure = parseInt(exposureSlider.value);
            document.getElementById('exposure-value').textContent = adjustments.exposure;
            // Not implemented
        });
        hueSlider.addEventListener('input', () => {
            adjustments.hue = parseInt(hueSlider.value);
            document.getElementById('hue-value').textContent = adjustments.hue;
            applyAdjustments();
        });
        temperatureSlider.addEventListener('input', () => {
            adjustments.temperature = parseInt(temperatureSlider.value);
            document.getElementById('temperature-value').textContent = adjustments.temperature;
            // Not implemented
        });

        // Filter presets
        filterThumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                filterThumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                applyFilter(thumb.getAttribute('data-filter'));
            });
        });

        // Add layer button
        addLayerBtn.addEventListener('click', () => {
            createLayer();
        });

        // Canvas mouse events
        canvas.addEventListener('mousedown', onCanvasMouseDown);
        canvas.addEventListener('mousemove', onCanvasMouseMove);
        canvas.addEventListener('mouseup', onCanvasMouseUp);
        canvas.addEventListener('mouseleave', onCanvasMouseUp);

        // Canvas cursor position update
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / zoomLevel);
            const y = Math.floor((e.clientY - rect.top) / zoomLevel);
            updateCursorPosition(x, y);
        });

        // Zoom controls
        zoomInBtn.addEventListener('click', () => {
            zoomLevel = Math.min(zoomLevel + 0.1, 5);
            renderLayers();
            updateStatusBar();
        });
        zoomOutBtn.addEventListener('click', () => {
            zoomLevel = Math.max(zoomLevel - 0.1, 0.1);
            renderLayers();
            updateStatusBar();
        });
        zoomResetBtn.addEventListener('click', () => {
            zoomLevel = 1;
            renderLayers();
            updateStatusBar();
        });

        // Rotate controls
        rotateLeftBtn.addEventListener('click', () => {
            rotation = (rotation - 90) % 360;
            renderLayers();
        });
        rotateRightBtn.addEventListener('click', () => {
            rotation = (rotation + 90) % 360;
            renderLayers();
        });

        // Flip controls
        flipHorizontalBtn.addEventListener('click', () => {
            flipH = !flipH;
            renderLayers();
        });
        flipVerticalBtn.addEventListener('click', () => {
            flipV = !flipV;
            renderLayers();
        });

        // Tool properties inputs
        document.getElementById('brush-size').addEventListener('input', (e) => {
            brushProps.size = parseInt(e.target.value);
            document.getElementById('brush-size-value').textContent = brushProps.size;
        });
        document.getElementById('brush-hardness').addEventListener('input', (e) => {
            brushProps.hardness = parseInt(e.target.value);
            document.getElementById('brush-hardness-value').textContent = brushProps.hardness;
        });
        document.getElementById('brush-opacity').addEventListener('input', (e) => {
            brushProps.opacity = parseInt(e.target.value) / 100;
            document.getElementById('brush-opacity-value').textContent = e.target.value;
        });
        document.getElementById('brush-color').addEventListener('input', (e) => {
            brushProps.color = e.target.value;
        });

        document.getElementById('text-content').addEventListener('input', (e) => {
            textProps.content = e.target.value;
        });
        document.getElementById('text-font').addEventListener('change', (e) => {
            textProps.font = e.target.value;
        });
        document.getElementById('text-size').addEventListener('input', (e) => {
            textProps.size = parseInt(e.target.value);
            document.getElementById('text-size-value').textContent = textProps.size;
        });
        document.getElementById('text-color').addEventListener('input', (e) => {
            textProps.color = e.target.value;
        });

        document.getElementById('shape-type').addEventListener('change', (e) => {
            shapeProps.type = e.target.value;
        });
        document.getElementById('shape-fill').addEventListener('input', (e) => {
            shapeProps.fill = e.target.value;
        });
        document.getElementById('shape-stroke').addEventListener('input', (e) => {
            shapeProps.stroke = e.target.value;
        });
        document.getElementById('shape-stroke-width').addEventListener('input', (e) => {
            shapeProps.strokeWidth = parseInt(e.target.value);
            document.getElementById('shape-stroke-width-value').textContent = shapeProps.strokeWidth;
        });
    }

    // Update tool properties panel visibility
    function updateToolProperties() {
        brushProperties.style.display = currentTool === 'brush' ? 'block' : 'none';
        textProperties.style.display = currentTool === 'text' ? 'block' : 'none';
        shapeProperties.style.display = currentTool === 'shapes' ? 'block' : 'none';
    }

    // Apply filter presets
    function applyFilter(filterName) {
        switch (filterName) {
            case 'none':
                canvas.style.filter = 'none';
                break;
            case 'vintage':
                canvas.style.filter = 'sepia(0.4) contrast(1.2) saturate(0.8)';
                break;
            case 'blackWhite':
                canvas.style.filter = 'grayscale(1)';
                break;
            case 'sepia':
                canvas.style.filter = 'sepia(1)';
                break;
            case 'invert':
                canvas.style.filter = 'invert(1)';
                break;
            case 'blur':
                canvas.style.filter = 'blur(2px)';
                break;
            case 'sharpen':
                // Sharpen is complex; simulate with contrast
                canvas.style.filter = 'contrast(1.5)';
                break;
            case 'emboss':
                // Emboss effect not supported by CSS filters; no-op
                canvas.style.filter = 'none';
                break;
            default:
                canvas.style.filter = 'none';
        }
    }

    // Canvas mouse down handler
    function onCanvasMouseDown(e) {
        if (currentTool === 'brush' || currentTool === 'eraser') {
            isDrawing = true;
            const pos = getMousePos(e);
            startX = pos.x;
            startY = pos.y;
            drawDot(pos.x, pos.y);
        }
        // Other tools can be implemented similarly
    }

    // Canvas mouse move handler
    function onCanvasMouseMove(e) {
        if (!isDrawing) return;
        if (currentTool === 'brush' || currentTool === 'eraser') {
            const pos = getMousePos(e);
            drawLine(startX, startY, pos.x, pos.y);
            startX = pos.x;
            startY = pos.y;
        }
    }

    // Canvas mouse up handler
    function onCanvasMouseUp(e) {
        if (isDrawing) {
            isDrawing = false;
            saveHistory();
        }
    }

    // Get mouse position relative to canvas
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor((e.clientX - rect.left) / zoomLevel),
            y: Math.floor((e.clientY - rect.top) / zoomLevel)
        };
    }

    // Draw a dot for brush/eraser
    function drawDot(x, y) {
        const layer = layers[activeLayerIndex];
        const ctxLayer = layer.ctx;
        ctxLayer.save();
        ctxLayer.globalAlpha = brushProps.opacity;
        ctxLayer.lineCap = 'round';
        ctxLayer.lineJoin = 'round';
        ctxLayer.strokeStyle = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : brushProps.color;
        if (currentTool === 'eraser') {
            ctxLayer.globalCompositeOperation = 'destination-out';
        } else {
            ctxLayer.globalCompositeOperation = 'source-over';
        }
        ctxLayer.lineWidth = brushProps.size;
        ctxLayer.beginPath();
        ctxLayer.moveTo(x, y);
        ctxLayer.lineTo(x + 0.1, y + 0.1);
        ctxLayer.stroke();
        ctxLayer.restore();
        renderLayers();
    }

    // Draw a line for brush/eraser
    function drawLine(x1, y1, x2, y2) {
        const layer = layers[activeLayerIndex];
        const ctxLayer = layer.ctx;
        ctxLayer.save();
        ctxLayer.globalAlpha = brushProps.opacity;
        ctxLayer.lineCap = 'round';
        ctxLayer.lineJoin = 'round';
        ctxLayer.strokeStyle = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : brushProps.color;
        if (currentTool === 'eraser') {
            ctxLayer.globalCompositeOperation = 'destination-out';
        } else {
            ctxLayer.globalCompositeOperation = 'source-over';
        }
        ctxLayer.lineWidth = brushProps.size;
        ctxLayer.beginPath();
        ctxLayer.moveTo(x1, y1);
        ctxLayer.lineTo(x2, y2);
        ctxLayer.stroke();
        ctxLayer.restore();
        renderLayers();
    }

    // Initialize the app
    init();
});
