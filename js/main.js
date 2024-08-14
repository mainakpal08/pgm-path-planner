'use strict';

let log = console.log.bind(console);

// DOM references
const canvas = document.getElementById('canvas');
const output = document.getElementById('output');
const ctx = canvas.getContext('2d');

// Rviz yaml params (to retrieve from file)
let origin_offset_x = 0; //-9.399999999999991;
let origin_offset_y = 0; //-5.6;
let resolution = 0; //0.05;

// Runtime variables and output
let mousePos;
let savedWaypoints = new Waypoints();
const selectedWaypointIndex = {
    set current(index) {
        this._index = index;
        updateSelectedWaypointUi();
    },
    get current() {
        return this._index;
    },
    _index: null
};

// Variables for cropping
let croppingMode = false;
let cropping = false;
let cropStartX, cropStartY, cropEndX, cropEndY;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to parse the uploaded YAML file
function loadYamlFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const yamlText = event.target.result;
            try {
                const yamlData = jsyaml.load(yamlText);

                // Extracting values from the YAML
                origin_offset_x = yamlData.origin[0];
                origin_offset_y = yamlData.origin[1];
                resolution = yamlData.resolution;

                console.log(`Loaded YAML: origin_offset_x = ${origin_offset_x}, origin_offset_y = ${origin_offset_y}, resolution = ${resolution}`);
            } catch (e) {
                console.error("Error parsing YAML file:", e);
            }
        };
        reader.readAsText(file);
    }
}

// Attach event listener for the YAML file input
document.getElementById("yamlInput").addEventListener("change", loadYamlFile, false);


function exportSavedWaypoints() {
    let exportedData = savedWaypoints.exportToRvizWaypoints();

    // Create the YAML content
    let yamlContent = jsyaml.dump(exportedData);
    log(yamlContent)

    // Create a blob of the YAML content
    let blob = new Blob([yamlContent], { type: 'text/yaml' });
    let url = URL.createObjectURL(blob);

    // Create a link element and trigger the download
    let a = document.createElement('a');
    a.href = url;
    a.download = 'wp.yaml';
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function deleteSelectedWaypoint() {
    if (selectedWaypointIndex.current != null) {
        savedWaypoints.removeWaypoint(selectedWaypointIndex.current);

        // Update the selected waypoint index
        if (selectedWaypointIndex.current >= savedWaypoints.waypoints.length) {
            selectedWaypointIndex.current = savedWaypoints.waypoints.length - 1;
        }

        // If there are no waypoints left, set the selected index to null
        if (savedWaypoints.waypoints.length === 0) {
            selectedWaypointIndex.current = null;
        }

        updateScene();
    }
}

function updateSavedWaypointListUi() {
    let waypoints = savedWaypoints.waypoints;
    const point_list = document.getElementById("point_list");
    point_list.innerHTML = ''; // Clear the list before updating
    for (let i = 0; i < waypoints.length; i++) {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(i));
        li.setAttribute("onclick", `selectWaypoint(${i})`);
        point_list.appendChild(li);
    }
}

function selectWaypoint(index) {
    selectedWaypointIndex.current = index;
    updateSelectedWaypointUi();
}

function updateSelectedWaypointUi() {
    document.getElementById("property_id").innerHTML = selectedWaypointIndex.current;
}

function updateScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redrawing
    updateSavedWaypointListUi();
    updateSelectedWaypointUi();
    if (imageData) {
        ctx.putImageData(imageData, 0, 0);
    }
    savedWaypoints.draw();

    // Draw cropping rectangle if cropping mode is active
    if (cropping) {
        ctx.strokeStyle = "#FF0000"; // Red border for the crop rectangle
        ctx.lineWidth = 2;
        ctx.strokeRect(cropStartX, cropStartY, cropEndX - cropStartX, cropEndY - cropStartY);
    }
}

//-- pgm file data--//
let fileType = "";
let hv = "";
let maxWhiteVal = "";
let imageData;
let croppedData;
//------------------//
let fr = new FileReader();
fr.onload = async function(e) {
    let bytes = new Uint8Array(fr.result);
    let line = 0;
    let dataI = 0;

    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] == 10) { // newline check
            line++;
            if (line == 1) {
                fileType = fileType.trim();
                log("Filetype: " + fileType);
                if (fileType != "P5") {
                    log("Unhandled file type: " + fileType);
                    return;
                }
            } else if (line == 3) {
                hv = hv.trim().split(" ");
                let width = parseInt(hv[0]);
                let height = parseInt(hv[1]);
                canvas.width = width;
                canvas.height = height;
                imageData = ctx.createImageData(width, height);
                log("Dimensions: " + width + "x" + height);
            } else if (line == 4) {
                maxWhiteVal = maxWhiteVal.trim();
                log("Max White Value: " + maxWhiteVal);
            }
            continue;
        }
        if (line == 0) {
            fileType += String.fromCharCode(bytes[i]);
        } else if (line == 2) {
            hv += String.fromCharCode(bytes[i]);
        } else if (line == 3) {
            maxWhiteVal += String.fromCharCode(bytes[i]);
        } else {
            if (imageData && dataI < imageData.data.length) {
                let val = 255 * bytes[i] / parseInt(maxWhiteVal);
                imageData.data[dataI + 0] = val; // R value
                imageData.data[dataI + 1] = val; // G value
                imageData.data[dataI + 2] = val; // B value
                imageData.data[dataI + 3] = 255; // A value
                dataI += 4;
            }
        }
    }
    if (imageData) {
        ctx.putImageData(imageData, 0, 0);
        updateScene();
    }
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Define the transformation matrix and translation vector
// const A = [
//     [0.9964, -0.0003],
//     [0.0007, 0.9986]
// ];
// const t = [3.0478, 6.9709];

// // Function to calculate the inverse of a 2x2 matrix
// function inverseMatrix(matrix) {
//     const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
//     return [
//         [matrix[1][1] / determinant, -matrix[0][1] / determinant],
//         [-matrix[1][0] / determinant, matrix[0][0] / determinant]
//     ];
// }

// // Calculate the inverse of A
// const A_inv = inverseMatrix(A);

// // Function to perform matrix-vector multiplication
// function multiplyMatrixVector(matrix, vector) {
//     return [
//         matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
//         matrix[1][0] * vector[0] + matrix[1][1] * vector[1]
//     ];
// }

// // Function to transform back to the original coordinates
// function transformedToOriginal(x, y) {
//     const p_transformed = [x, y];
//     const p_diff = [p_transformed[0] - t[0], p_transformed[1] - t[1]];
//     const p_original = multiplyMatrixVector(A_inv, p_diff);
//     return p_original;
// }

// Adapted getRvizPoint function to return original coordinates
// function getRvizPoint(mousePos) {
//     const x_transformed = mousePos.x * resolution + origin_offset_x;
//     const y_transformed = (canvas.height - mousePos.y) * resolution + origin_offset_y;
//     const [x_original, y_original] = transformedToOriginal(x_transformed, y_transformed);
//     return new Point(x_original, y_original);
// }

canvas.addEventListener('mousedown', function(evt) {
    mousePos = getMousePos(canvas, evt);

    if (croppingMode) {
        // Start cropping
        cropStartX = mousePos.x;
        cropStartY = mousePos.y;
        cropping = true;
    } else {
        // Existing waypoint and edge interactions
        isMouseDown = true;
        //let rvizPoint = getRvizPoint(mousePos);

        let hits = savedWaypoints.hit(mousePos);
        if (hits.length > 0) {
            if (selectedWaypointIndexForEdge === null) {
                selectedWaypointIndexForEdge = hits[0];
            } else {
                savedWaypoints.addEdge(selectedWaypointIndexForEdge, hits[0]);
                selectedWaypointIndexForEdge = null;
                updateScene();
            }
            selectedWaypointIndex.current = hits[0];
            checkMouseHold();
        } else {
            if (selectedWaypointIndex.current != null) {
                selectedWaypointIndex.current = null;
            } else {
                addWaypointFlag = true;
            }
        }
    }
}, false);

canvas.addEventListener('mousemove', function(evt) {
    if (croppingMode && cropping) {
        mousePos = getMousePos(canvas, evt);
        cropEndX = mousePos.x;
        cropEndY = mousePos.y;
        updateScene();
    } else {
        // Existing waypoint movement logic
        mousePos = getMousePos(canvas, evt);
        //let rvizPos = getRvizPoint(mousePos);

        if (translateWaypointFlag) {
            savedWaypoints.setWaypointPosition(selectedWaypointIndex.current, mousePos.x, mousePos.y);
            updateScene();
        }
    }
}, false);

canvas.addEventListener('mouseup', function(evt) {
    if (croppingMode) {
        if (cropping) {
            cropping = false;
        }
    } else {
        // Existing logic for adding waypoints and stopping translation
        if (isMouseDown && imageData != null) {
            if (addWaypointFlag) {
                savedWaypoints.push(new Pose(mousePos));
                updateScene();
                addWaypointFlag = false;
            } else if (translateWaypointFlag) {
                translateWaypointFlag = false;
            }
        }
        isMouseDown = false;
    }
}, false);

let isMouseDown = false;
let addWaypointFlag = false;
let translateWaypointFlag = false;

let selectedWaypointIndexForEdge = null;

let holdTime = 0;
const editTriggerTime = 500; //hold mouse down for --ms to trigger
async function checkMouseHold() {
    translateWaypointFlag = false;
    log("timer started");
    holdTime = 0;
    while (holdTime < editTriggerTime) {
        if (!isMouseDown) {
            log("timer ended prematurely");
            return;
        }
        await sleep(5);
        holdTime += 5;
    }

    log("flag activated");
    translateWaypointFlag = true;
}

function updateCanvas() {
    fr.readAsArrayBuffer(this.files[0]);
}
document.getElementById("input").addEventListener("change", updateCanvas, false);

let importedPoints = [];

function start() {
    for (let i = 0; i < importedPoints.length; i++) {
        let p = new Pose(new Point(importedPoints[i][0], importedPoints[i][1]));
        log(p);
        savedWaypoints.pushRvizPose(p);
    }
    updateScene();
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function editSelectedWaypoint() {
    if (selectedWaypointIndex.current != null) {
        let label = prompt("Enter annotation text:", savedWaypoints.waypoints[selectedWaypointIndex.current].label);
        if (label !== null) {
            savedWaypoints.waypoints[selectedWaypointIndex.current].label = label;
            updateScene();
        }
    }
}

function toggleCroppingMode() {
    croppingMode = !croppingMode;
    if (croppingMode) {
        console.log("Cropping mode enabled");
    } else {
        console.log("Cropping mode disabled");
    }
}

function applyCrop() {
    // Ensure we have a valid cropping area
    const actualCropStartX = Math.min(cropStartX, cropEndX);
    const actualCropStartY = Math.min(cropStartY, cropEndY);
    const cropWidth = Math.abs(cropEndX - cropStartX);
    const cropHeight = Math.abs(cropEndY - cropStartY);

    if (cropWidth > 0 && cropHeight > 0) {
        console.log(`Cropping area: Start (${actualCropStartX}, ${actualCropStartY}) - Width: ${cropWidth}, Height: ${cropHeight}`);

        // Get cropped image data using the correct coordinates
        const croppedImageData = ctx.getImageData(actualCropStartX, actualCropStartY, cropWidth, cropHeight);

        // Rescale waypoints according to the cropped area
        savedWaypoints.waypoints.forEach(waypoint => {
            waypoint.position.x -= actualCropStartX;
            waypoint.position.y -= actualCropStartY;
        });

        // Resize canvas and place cropped image
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(croppedImageData, 0, 0);  // Draw the cropped image at the origin (0, 0) of the canvas

        console.log("Canvas resized and cropped area applied.");

        // Reset cropping coordinates
        cropStartX = cropStartY = cropEndX = cropEndY = 0;
        imageData = croppedImageData;
        updateScene();
    } else {
        console.warn("Invalid crop dimensions. Ensure the cropping area is selected properly.");
    }
}

function resetCanvas() {
    // Reapply the full image to the canvas
    if (imageData) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        updateScene();
    }
}
