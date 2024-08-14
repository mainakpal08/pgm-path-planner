'use strict';
// ROS message class
class Point {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static toRvizPoint(point) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var pixelX = point.x * scaleX;
        var pixelY = (rect.height - point.y) * scaleY;

        var rvizX = origin_offset_x + pixelX * resolution;
        var rvizY = origin_offset_y + pixelY * resolution;

        let rvizPoint = new Point();
        rvizPoint.x = rvizX;
        rvizPoint.y = rvizY;
        return rvizPoint;
    }

    static toLocalPoint(point) {
        let localPoint = new Point();
        localPoint.x = (point.x - origin_offset_x) / resolution;
        localPoint.y = canvas.height - (point.y - origin_offset_y) / resolution;
        return localPoint;
    }
}

class Quatenion {
    x = 0; y = 0; z = 0; w = 0;
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
}

class Pose {
    position = new Point();
    orientation = new Quatenion();
    label = ""; // New property for annotation

    constructor(position = new Point(), orientation = new Quatenion(), label = "") {
        this.position = position;
        this.orientation = orientation;
        this.label = label; // Initialize the label
    }
}

class Waypoints {
    waypoints = [];
    edges = [];
    radius = 5;

    constructor(waypoints = []) {
        this.waypoints = waypoints;
    }

    push(pose) {
        this.waypoints.push(pose);
    }

    pushRvizPose(pose) {
        pose.position = Point.toLocalPoint(pose.position);
        this.waypoints.push(pose);
    }

    setWaypointPosition(index, x, y) {
        this.waypoints[index].position.x = x;
        this.waypoints[index].position.y = y;
    }

    setWaypointOrientation(index, quaternion) {
        this.waypoints[index].orientation = quaternion;
    }

    removeWaypoint(index) {
        this.waypoints.splice(index, 1);
        // Update edges to point to the correct waypoints after deletion
        this.edges = this.edges
            .filter(edge => edge[0] !== index && edge[1] !== index)
            .map(edge => {
                return [
                    edge[0] > index ? edge[0] - 1 : edge[0],
                    edge[1] > index ? edge[1] - 1 : edge[1]
                ];
            });
    }

    exportToRvizWaypoints() {
        let rvizWaypoints = [];
        for (let i = 0; i < this.waypoints.length; i++) {
            let pose = new Pose();
            pose.position = Point.toRvizPoint(this.waypoints[i].position);
            pose.orientation = this.waypoints[i].orientation;
            pose.label = this.waypoints[i].label; // Include label in export
            rvizWaypoints[i] = pose;
        }

        let rvizEdges = [];
        for (let i = 0; i < this.edges.length; i++) {
            let edge = {
                start: this.edges[i][0],
                end: this.edges[i][1]
            };
            rvizEdges.push(edge);
        }

        return {
            waypoints: rvizWaypoints,
            edges: rvizEdges
        };
    }

    hit(mousePos) {
        let hits = [];
        for (let i = 0; i < this.waypoints.length; i++) {
            if (Math.sqrt(Math.pow(mousePos.x - this.waypoints[i].position.x, 2)) < this.radius &&
                Math.sqrt(Math.pow(mousePos.y - this.waypoints[i].position.y, 2)) < this.radius) {
                hits.push(i);
            }
        }
        return hits;
    }

    addEdge(startIndex, endIndex) {
        this.edges.push([startIndex, endIndex]);
        this.edges.push([endIndex, startIndex]); // Add the reverse edge to make it bidirectional
    }

    draw() {
        // Draw edges
        ctx.strokeStyle = "#0000FF"; // Set edge color
        ctx.lineWidth = 2;
        for (let i = 0; i < this.edges.length; i++) {
            let start = this.waypoints[this.edges[i][0]]?.position;
            let end = this.waypoints[this.edges[i][1]]?.position;
            if (start && end) {
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        }

        // Draw points
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        for (let i = 0; i < this.waypoints.length; i++) {
            ctx.moveTo(this.waypoints[i].position.x + this.radius, this.waypoints[i].position.y);
            ctx.arc(this.waypoints[i].position.x, this.waypoints[i].position.y, this.radius, 0, Math.PI * 2, true);
        }
        ctx.fill();

        // Draw indices and labels
        ctx.font = "10px Arial"; // Adjust font size and style
        for (let i = 0; i < this.waypoints.length; i++) {
            ctx.fillStyle = "#FFFFFF"; // Set text color to white for index
            ctx.fillText(i, this.waypoints[i].position.x - 4, this.waypoints[i].position.y + 3);
            if (this.waypoints[i].label) {
                ctx.fillStyle = "#FF0000"; // Set text color to red for annotation
                ctx.fillText(this.waypoints[i].label, this.waypoints[i].position.x + 10, this.waypoints[i].position.y + 10); // Adjust position for label visibility
            }
        }
    }
}
